# AI-assisted: OpenAI Codex
"""Download original movies and/or frame sequences from NASA SVS.

Usage:
    python pipeline/download.py 5147 5148
    python pipeline/download.py --kind frames 5147

Files are saved under ``raw/<SVS ID>/`` (git-ignored). The NASA SVS page API
provides media URLs; frame URLs point to public directory listings.
"""

from __future__ import annotations

import argparse
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests

API_URL = "https://svs.gsfc.nasa.gov/api/{}/"
USER_AGENT = "EarthJukebox/1.0 (NASA SVS public media downloader)"
TIMEOUT = (15, 120)
CHUNK_SIZE = 1024 * 1024


class _Links(HTMLParser):
    """Collect links from the plain HTML directory listing served by SVS."""

    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.hrefs.append(href)


def _media_items(page: dict) -> list[dict]:
    """Flatten SVS media groups and return media metadata dictionaries."""
    found: list[dict] = []

    def visit(items: list[dict]) -> None:
        for item in items:
            instance = item.get("instance")
            if isinstance(instance, dict) and instance.get("url"):
                found.append(instance)
            nested = item.get("items")
            if isinstance(nested, list):
                visit(nested)

    for group in page.get("media_groups", []):
        visit(group.get("items", []))
    for key in ("main_video", "main_image"):
        instance = page.get(key)
        if isinstance(instance, dict) and instance.get("url"):
            found.append(instance)
    # Preserve API order while avoiding duplicate URLs.
    return list({item["url"]: item for item in reversed(found)}.values())


def _safe_filename(name: str) -> str:
    name = Path(unquote(name)).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", name) or "download"


def _download_file(session: requests.Session, url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size > 0:
        print(f"  já existe: {destination.name}")
        return
    temporary = destination.with_name(destination.name + ".part")
    try:
        with session.get(url, stream=True, timeout=TIMEOUT) as response:
            response.raise_for_status()
            with temporary.open("wb") as output:
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        output.write(chunk)
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _frames_url(session: requests.Session, url: str, destination: Path) -> int:
    """Download image files from an SVS Frames media directory."""
    listing_url = url if url.endswith("/") else url + "/"
    with session.get(listing_url, timeout=TIMEOUT) as response:
        response.raise_for_status()
        parser = _Links()
        parser.feed(response.text)

    base = urlparse(listing_url)
    files: list[str] = []
    for href in parser.hrefs:
        absolute = urljoin(listing_url, href)
        parsed = urlparse(absolute)
        name = unquote(Path(parsed.path).name)
        if (parsed.scheme in {"http", "https"} and parsed.netloc == base.netloc
                and parsed.path.startswith(base.path)
                and re.fullmatch(r"\d+\.(?:png|jpe?g|tiff?|exr)", name, re.I)):
            files.append(absolute)
    files = sorted(set(files), key=lambda item: Path(urlparse(item).path).name)
    if not files:
        raise RuntimeError(f"Nenhum frame foi encontrado na listagem: {listing_url}")

    destination.mkdir(parents=True, exist_ok=True)
    print(f"  frames: {len(files)} arquivo(s)")
    for index, frame_url in enumerate(files, start=1):
        filename = _safe_filename(Path(urlparse(frame_url).path).name)
        _download_file(session, frame_url, destination / filename)
        if index % 25 == 0 or index == len(files):
            print(f"    {index}/{len(files)}")
    return len(files)


def download_visualization(svs_id: str, output_root: Path, kind: str = "both") -> None:
    """Download available MP4 and/or original image sequence for one SVS ID."""
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    response = session.get(API_URL.format(svs_id), timeout=TIMEOUT)
    response.raise_for_status()
    page = response.json()
    if str(page.get("id")) != str(svs_id):
        raise RuntimeError(f"A API retornou um ID inesperado para {svs_id}")

    media = _media_items(page)
    movies = [item for item in media if item.get("media_type") == "Movie"
              and urlparse(item["url"]).path.lower().endswith(".mp4")]
    frames = [item for item in media if item.get("media_type") == "Frames"]
    folder = output_root / str(svs_id)
    downloaded = 0

    if kind in {"both", "mp4"} and movies:
        # Select the largest MP4 when multiple encodes are published.
        movie = max(movies, key=lambda item: item.get("pixels", 0))
        name = _safe_filename(movie.get("filename") or Path(urlparse(movie["url"]).path).name)
        print(f"  MP4: {name}")
        _download_file(session, movie["url"], folder / name)
        downloaded += 1
    elif kind == "mp4":
        print("  API não lista um MP4 para este ID.")

    if kind in {"both", "frames"} and frames:
        # Prefer the largest frame set published by SVS.
        frame_set = max(frames, key=lambda item: item.get("pixels", 0))
        name = _safe_filename(frame_set.get("filename") or "frames")
        print(f"  conjunto de frames: {name}")
        downloaded += _frames_url(session, frame_set["url"], folder / "frames" / name)
    elif kind == "frames":
        print("  API não lista frames para este ID.")

    if not downloaded:
        raise RuntimeError(f"Nenhum arquivo compatível foi encontrado para SVS {svs_id}")
    print(f"SVS {svs_id}: concluído em {folder}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Baixa filmes e frames públicos do NASA SVS.")
    parser.add_argument("--kind", choices=("both", "mp4", "frames"), default="both",
                        help="tipo de mídia (padrão: ambos)")
    parser.add_argument("--output", type=Path, default=Path("raw"),
                        help="pasta de saída (padrão: ./raw)")
    parser.add_argument("ids", nargs="+", help="IDs de visualizações SVS, por exemplo 5147")
    args = parser.parse_args(argv)

    failed = False
    for svs_id in args.ids:
        if not svs_id.isdecimal():
            print(f"ID inválido: {svs_id!r}; informe apenas números.", file=sys.stderr)
            failed = True
            continue
        print(f"SVS {svs_id} — consultando API...")
        try:
            download_visualization(svs_id, args.output, args.kind)
        except (requests.RequestException, ValueError, RuntimeError) as error:
            print(f"Erro em SVS {svs_id}: {error}", file=sys.stderr)
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
