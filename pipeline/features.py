# AI-assisted: Copilot
"""Extract physical-value features from NASA SVS weather frames."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

TRACK_ID = "clima-temperatura"
SVS_ID = 5147
FRAMES_DIR = Path("public/data/clima-temperatura/frames")
COLORBAR_PATH = Path("public/data/clima-temperatura/colorbar.json")
OUTPUT_PATH = Path("public/data/clima-temperatura/features.json")
REFERENCE_WIDTH = 1024
REFERENCE_HEIGHT = 512
EXCLUDED_RECTANGLES = (
    (0, 0, 176, 42),      # GMAO logo
    (0, 462, 336, 512),   # Date and time
)
FRAME_START_UTC = datetime(2026, 10, 30, 10, tzinfo=timezone.utc)
FRAME_INTERVAL = timedelta(hours=3)
# The 5147/5148 animations cross the 2026 Eastern daylight-saving transition.
DST_END_UTC = datetime(2026, 11, 1, 6, tzinfo=timezone.utc)
COLOR_MATCH_BATCH_SIZE = 4096


def analysis_pixels(image: Image.Image) -> np.ndarray:
    """Return RGB pixels outside the logo and timestamp rectangles."""
    pixels = np.asarray(image.convert("RGB"))
    height, width = pixels.shape[:2]
    included = np.ones((height, width), dtype=bool)

    for left, top, right, bottom in EXCLUDED_RECTANGLES:
        x0 = round(left * width / REFERENCE_WIDTH)
        y0 = round(top * height / REFERENCE_HEIGHT)
        x1 = round(right * width / REFERENCE_WIDTH)
        y1 = round(bottom * height / REFERENCE_HEIGHT)
        included[y0:y1, x0:x1] = False

    return pixels[included]


def frame_date(
    index: int,
    frame_start_utc: datetime = FRAME_START_UTC,
    frame_interval: timedelta = FRAME_INTERVAL,
) -> str:
    """Return the SVS frame's local Eastern timestamp in the contract format."""
    if index < 0:
        raise ValueError("Frame index cannot be negative.")
    timestamp_utc = frame_start_utc + index * frame_interval
    offset = timedelta(hours=-4 if timestamp_utc < DST_END_UTC else -5)
    return (timestamp_utc + offset).strftime("%Y-%m-%dT%H:%M")


def _values_for_unique_colors(
    unique_colors: np.ndarray,
    palette_colors: np.ndarray,
    palette_values: np.ndarray,
    cache: dict[tuple[int, int, int], tuple[float, float]],
) -> tuple[np.ndarray, np.ndarray]:
    keys = [tuple(int(channel) for channel in color) for color in unique_colors]
    missing = [key for key in keys if key not in cache]

    for start in range(0, len(missing), COLOR_MATCH_BATCH_SIZE):
        batch_keys = missing[start:start + COLOR_MATCH_BATCH_SIZE]
        batch = np.asarray(batch_keys, dtype=np.int32)
        differences = batch[:, None, :] - palette_colors[None, :, :]
        distances = np.einsum("ijk,ijk->ij", differences, differences)
        nearest = np.argmin(distances, axis=1)
        nearest_distances = np.sqrt(distances[np.arange(len(batch_keys)), nearest])
        for key, palette_index, distance in zip(
            batch_keys, nearest, nearest_distances
        ):
            cache[key] = (float(palette_values[palette_index]), float(distance))

    values = np.fromiter(
        (cache[key][0] for key in keys), dtype=np.float64, count=len(keys)
    )
    nearest_distances = np.fromiter(
        (cache[key][1] for key in keys), dtype=np.float64, count=len(keys)
    )
    return values, nearest_distances


def _valid_palette_colors(
    colors: np.ndarray,
    values: np.ndarray,
    distances: np.ndarray,
    pixel_filter: dict,
) -> np.ndarray:
    maximum = colors.max(axis=1).astype(np.float64)
    saturation = np.divide(
        (maximum - colors.min(axis=1)) * 255.0,
        maximum,
        out=np.zeros(len(colors), dtype=np.float64),
        where=maximum > 0,
    )
    valid = (
        (saturation >= float(pixel_filter["minSaturation"]))
        & (distances <= float(pixel_filter["maxColorDistance"]))
    )
    if "maxValue" in pixel_filter:
        valid &= values <= float(pixel_filter["maxValue"])
    return valid


def _parse_utc(value: str) -> datetime:
    timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def generate_features(
    frames_dir: Path = FRAMES_DIR,
    colorbar_path: Path = COLORBAR_PATH,
    track_id: str = TRACK_ID,
    svs_id: int = SVS_ID,
    frame_start_utc: datetime = FRAME_START_UTC,
    frame_interval: timedelta = FRAME_INTERVAL,
) -> dict:
    frame_files = sorted(frames_dir.glob("frame_*.webp"))
    if not frame_files:
        raise ValueError(f"No WebP frames found in {frames_dir}.")
    expected_names = [
        f"frame_{index:06d}.webp" for index in range(1, len(frame_files) + 1)
    ]
    if [path.name for path in frame_files] != expected_names:
        raise ValueError(
            f"Frames in {frames_dir} must be consecutive, starting at frame_000001.webp."
        )

    colorbar = json.loads(colorbar_path.read_text(encoding="utf-8"))
    samples = colorbar.get("samples")
    vmin = float(colorbar["vmin"])
    vmax = float(colorbar["vmax"])
    if not isinstance(samples, list) or not samples or vmax <= vmin:
        raise ValueError(f"Invalid colorbar calibration in {colorbar_path}.")

    palette_colors = np.asarray([sample["rgb"] for sample in samples], dtype=np.int32)
    palette_values = np.asarray([sample["value"] for sample in samples], dtype=np.float64)
    if palette_colors.ndim != 2 or palette_colors.shape[1] != 3:
        raise ValueError(f"Colorbar samples in {colorbar_path} must contain RGB triples.")
    if len(palette_colors) != len(palette_values):
        raise ValueError(f"Colorbar samples in {colorbar_path} are inconsistent.")

    value_cache: dict[tuple[int, int, int], tuple[float, float]] = {}
    pixel_filter = colorbar.get("pixelFilter")
    frame_features = []
    for index, frame_path in enumerate(frame_files):
        with Image.open(frame_path) as image:
            pixels = analysis_pixels(image)
        unique_colors, inverse = np.unique(pixels, axis=0, return_inverse=True)
        unique_values, unique_distances = _values_for_unique_colors(
            unique_colors, palette_colors, palette_values, value_cache
        )
        values = unique_values[inverse]
        coverage = None
        if pixel_filter is not None:
            valid_colors = _valid_palette_colors(
                unique_colors, unique_values, unique_distances, pixel_filter
            )
            valid_pixels = valid_colors[inverse]
            coverage = float(np.mean(valid_pixels))
            if not np.any(valid_pixels):
                raise ValueError(
                    f"No confidently color-matched pixels in {frame_path.name}."
                )
            values = values[valid_pixels]

        mean = round(float(np.mean(values)), 3)
        p90 = round(float(np.percentile(values, 90)), 3)
        norm = round(float(np.clip((mean - vmin) / (vmax - vmin), 0.0, 1.0)), 3)

        frame_feature = {
            "file": frame_path.name,
            "date": frame_date(index, frame_start_utc, frame_interval),
            "mean": mean,
            "p90": p90,
            "norm": norm,
        }
        if coverage is not None:
            frame_feature["coverage"] = round(coverage, 3)
        frame_features.append(frame_feature)
        if (index + 1) % 25 == 0 or index + 1 == len(frame_files):
            print(f"  {index + 1}/{len(frame_files)} frames")

    return {
        "mock": False,
        "track": track_id,
        "svsId": svs_id,
        "unit": colorbar["unit"],
        "vmin": vmin,
        "vmax": vmax,
        "frames": frame_features,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Gera mean, p90, norm e date por frame."
    )
    parser.add_argument("--frames-dir", type=Path, default=FRAMES_DIR)
    parser.add_argument("--colorbar", type=Path, default=COLORBAR_PATH)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--track", default=TRACK_ID)
    parser.add_argument("--svs-id", type=int, default=SVS_ID)
    parser.add_argument(
        "--start-utc",
        type=_parse_utc,
        default=FRAME_START_UTC,
        help="início em UTC no formato YYYY-MM-DDTHH:MM:SSZ.",
    )
    parser.add_argument("--interval-hours", type=float, default=3.0)
    args = parser.parse_args(argv)

    try:
        features = generate_features(
            args.frames_dir,
            args.colorbar,
            args.track,
            args.svs_id,
            args.start_utc,
            timedelta(hours=args.interval_hours),
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(features, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        return 1

    print(f"Concluído: {args.output} ({len(features['frames'])} frames)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
