# AI-assisted: OpenAI Codex
"""Sample a movie or image sequence, resize it, and write WebP frames.

Usage:
    python pipeline/extract_frames.py raw/5147 clima-temperatura
    python pipeline/extract_frames.py raw/5147/movie.mp4 clima-temperatura --fps 4
    python pipeline/extract_frames.py raw/5147/frames clima-temperatura --source-fps 12

Output: public/data/<track>/frames/frame_000001.webp, etc.
Movies are processed with ffmpeg; image sequences use Pillow.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, UnidentifiedImageError

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".exr", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mpg", ".mpeg", ".dv"}


def _natural_key(path: Path) -> list[object]:
    """Sort numbered frame names numerically (1, 2, ... 10)."""
    return [int(part) if part.isdigit() else part.lower()
            for part in re.split(r"(\d+)", path.name)]


def _image_files(source: Path) -> list[Path]:
    if source.is_file():
        return [source] if source.suffix.lower() in IMAGE_EXTENSIONS else []
    return sorted((path for path in source.rglob("*")
                   if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS),
                  key=_natural_key)


def _sampled_images(files: list[Path], source_fps: float, fps: float) -> list[Path]:
    if source_fps <= 0 or fps <= 0:
        raise ValueError("fps e source-fps precisam ser maiores que zero.")
    if fps >= source_fps:
        return files
    step = source_fps / fps
    indexes: list[int] = []
    position = 0.0
    while int(position) < len(files):
        indexes.append(int(position))
        position += step
    return [files[index] for index in indexes]


def _save_image(source: Path, destination: Path, max_width: int, quality: int) -> tuple[int, int]:
    with Image.open(source) as image:
        image.seek(0)
        image.load()
        image.thumbnail((max_width, max_width), Image.Resampling.LANCZOS)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGB")
        image.save(destination, "WEBP", quality=quality, method=6)
        return image.size


def extract_images(source: Path, output: Path, fps: float, source_fps: float,
                   max_width: int, quality: int, max_frames: int) -> int:
    files = _image_files(source)
    if not files:
        raise ValueError(f"Não encontrei imagens compatíveis em {source}")
    selected = _sampled_images(files, source_fps, fps)
    if max_frames and len(selected) > max_frames:
        # Spread the cap across the full sequence so its beginning and end remain represented.
        selected = [selected[round(index * (len(selected) - 1) / (max_frames - 1))]
                    for index in range(max_frames)] if max_frames > 1 else [selected[0]]
    output.mkdir(parents=True, exist_ok=True)
    print(f"Imagens: {len(files)} encontradas; {len(selected)} selecionadas ({fps:g} fps alvo).")
    for index, path in enumerate(selected, start=1):
        target = output / f"frame_{index:06d}.webp"
        try:
            size = _save_image(path, target, max_width, quality)
        except (OSError, UnidentifiedImageError) as error:
            raise RuntimeError(f"Não foi possível converter {path}: {error}") from error
        if index % 25 == 0 or index == len(selected):
            print(f"  {index}/{len(selected)} — {size[0]}×{size[1]} px")
    return len(selected)


def extract_video(source: Path, output: Path, fps: float, max_width: int,
                  quality: int, max_frames: int) -> int:
    # imageio-ffmpeg bundles a compatible executable with its Python package, so
    # MP4 processing works after installing requirements even without system ffmpeg.
    try:
        import imageio_ffmpeg
    except ImportError:
        imageio_ffmpeg = None
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg and imageio_ffmpeg is not None:
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    if not ffmpeg:
        raise RuntimeError("ffmpeg não disponível. Instale as dependências com: pip install -r pipeline/requirements.txt")
    effective_fps = fps
    if max_frames:
        if imageio_ffmpeg is not None:
            try:
                metadata_reader = imageio_ffmpeg.read_frames(str(source), pix_fmt="rgb24")
                try:
                    duration = float(next(metadata_reader)["duration"])
                finally:
                    metadata_reader.close()
            except (OSError, RuntimeError, ValueError) as error:
                raise RuntimeError(f"Não foi possível determinar a duração de {source}: {error}") from error
        else:
            ffprobe = shutil.which("ffprobe")
            if not ffprobe:
                raise RuntimeError("Para limitar a sequência sem imageio-ffmpeg, instale ffprobe junto do ffmpeg.")
            try:
                probe = subprocess.run(
                    [ffprobe, "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", str(source)],
                    check=True, capture_output=True, text=True,
                )
            except subprocess.CalledProcessError as error:
                details = error.stderr.strip() or f"código {error.returncode}"
                raise RuntimeError(f"ffprobe falhou ao ler {source}: {details}") from error
            duration = float(probe.stdout.strip())
        if duration <= 0:
            raise RuntimeError(f"Não foi possível determinar a duração de {source}")
        effective_fps = min(fps, max_frames / duration)
    output.mkdir(parents=True, exist_ok=True)
    pattern = output / "frame_%06d.webp"
    # Preserve aspect ratio, cap the width at max_width, and keep even dimensions for codecs.
    scale = f"scale='min({max_width},iw)':-2:flags=lanczos"
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(source),
               "-vf", f"fps={effective_fps:.8g},{scale}", "-an", "-c:v", "libwebp",
               "-quality", str(quality), "-compression_level", "6", "-y", str(pattern)]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as error:
        raise RuntimeError(f"ffmpeg falhou ao processar {source} (código {error.returncode}).") from error
    count = sum(1 for _ in output.glob("frame_*.webp"))
    if count == 0:
        raise RuntimeError(f"ffmpeg não gerou frames para {source}")
    print(f"Vídeo: {count} frames em até {fps:g} fps, largura máxima {max_width} px.")
    return count


def _choose_source(path: Path) -> Path:
    if not path.is_dir():
        if not path.is_file():
            raise ValueError(f"Origem não encontrada: {path}")
        return path
    videos = sorted((item for item in path.rglob("*")
                     if item.is_file() and item.suffix.lower() in VIDEO_EXTENSIONS),
                    key=_natural_key)
    if videos:
        if len(videos) > 1:
            print(f"Há {len(videos)} vídeos; usando {videos[0].name}.")
        return videos[0]
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Reduz e converte vídeos ou frames para WebP.")
    parser.add_argument("source", type=Path, help="arquivo de vídeo/imagem ou pasta raw/<ID>")
    parser.add_argument("track", help="ID da faixa, por exemplo clima-temperatura")
    parser.add_argument("--output", type=Path, help="pasta de saída (padrão: public/data/<track>/frames)")
    parser.add_argument("--fps", type=float, default=4,
                        help="taxa de amostragem alvo para vídeo (padrão: 4)")
    parser.add_argument("--source-fps", type=float, default=12,
                        help="taxa da sequência de imagens para amostragem (padrão: 12)")
    parser.add_argument("--width", type=int, default=1024,
                        help="largura máxima em pixels, sem ampliar imagens menores (padrão: 1024)")
    parser.add_argument("--quality", type=int, default=85,
                        help="qualidade WebP de 0 a 100 (padrão: 85)")
    parser.add_argument("--max-frames", type=int, default=150,
                        help="limite de frames distribuídos pela duração inteira; 0 remove o limite (padrão: 150)")
    args = parser.parse_args(argv)
    if args.fps <= 0 or args.source_fps <= 0:
        parser.error("--fps e --source-fps precisam ser maiores que zero")
    if args.width <= 0:
        parser.error("--width precisa ser maior que zero")
    if not 0 <= args.quality <= 100:
        parser.error("--quality deve estar entre 0 e 100")
    if args.max_frames < 0:
        parser.error("--max-frames não pode ser negativo")

    try:
        source = _choose_source(args.source)
        output = args.output or Path("public") / "data" / args.track / "frames"
        if source.suffix.lower() in VIDEO_EXTENSIONS:
            extract_video(source, output, args.fps, args.width, args.quality, args.max_frames)
        else:
            extract_images(source, output, args.fps, args.source_fps, args.width,
                           args.quality, args.max_frames)
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        return 1
    print(f"Concluído: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
