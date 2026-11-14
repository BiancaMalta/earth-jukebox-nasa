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
WIND_SONIFICATION = {"input": "visualSignal", "quantity": "visible wind color signal", "unit": "1"}
AREA_STATISTICS = {
    "mean": "area_weighted", "weighting": "cos_latitude",
    "p90": "unweighted_pixel_percentile", "coverage": "accepted_pixel_fraction",
}


def area_weights(width: int, height: int) -> np.ndarray:
    """Relative spherical cell area for uniform equirectangular pixel centers."""
    latitude = 90.0 - (np.arange(height) + 0.5) * 180.0 / height
    return np.broadcast_to(np.cos(np.deg2rad(latitude))[:, None], (height, width))



def analysis_mask(width: int, height: int) -> np.ndarray:
    """Shared exclusion mask for full-frame and regional statistics."""
    included = np.ones((height, width), dtype=bool)
    for left, top, right, bottom in EXCLUDED_RECTANGLES:
        x0 = round(left * width / REFERENCE_WIDTH)
        y0 = round(top * height / REFERENCE_HEIGHT)
        x1 = round(right * width / REFERENCE_WIDTH)
        y1 = round(bottom * height / REFERENCE_HEIGHT)
        included[y0:y1, x0:x1] = False
    return included


def analysis_pixels(image: Image.Image) -> np.ndarray:
    """Return RGB pixels outside the logo and timestamp rectangles."""
    pixels = np.asarray(image.convert("RGB"))
    return pixels[analysis_mask(image.width, image.height)]


def decode_pixels(pixels: np.ndarray, colorbar: dict, cache: dict) -> np.ndarray:
    """Decode pixels once; NaN denotes rejected colors, never a measured zero."""
    unique, inverse = np.unique(pixels, axis=0, return_inverse=True)
    palette = np.asarray([sample["rgb"] for sample in colorbar["samples"]], dtype=np.int32)
    palette_values = np.asarray([sample["value"] for sample in colorbar["samples"]], dtype=np.float64)
    values, distances = _values_for_unique_colors(unique, palette, palette_values, cache)
    if colorbar.get("pixelFilter") is not None:
        valid = _valid_palette_colors(unique, values, distances, colorbar["pixelFilter"])
        values = np.where(valid, values, np.nan)
    return values[inverse]


def summarize_values(values: np.ndarray, vmin: float, vmax: float, weights: np.ndarray | None = None) -> dict:
    """Shared area-weighted mean, pixel P90, count coverage and fixed scale."""
    finite = np.isfinite(values)
    if weights is not None:
        weights = np.asarray(weights)
        if weights.shape != values.shape or np.any(~np.isfinite(weights)) or np.any(weights <= 0):
            raise ValueError("Area weights must be finite, positive and match the pixel array.")
    valid = values[finite]
    coverage = round(float(valid.size / values.size), 6) if values.size else 0.0
    if not valid.size:
        return {"mean": None, "p90": None, "norm": None, "coverage": coverage}
    mean = round(float(np.average(valid, weights=weights[finite] if weights is not None else None)), 3)
    return {
        "mean": mean,
        "p90": round(float(np.percentile(valid, 90)), 3),
        "norm": round(float(np.clip((mean - vmin) / (vmax - vmin), 0.0, 1.0)), 3),
        "coverage": coverage,
    }


def visible_wind_signal(values: np.ndarray, weights: np.ndarray, vmin: float, vmax: float) -> float | None:
    """Intensity × visible extent, NOT an inferred mean wind speed.

    Unmatched pixels contribute no detected color signal, not measured calm.
    An entirely unmatched region stays unavailable rather than zero wind.
    """
    if vmax <= vmin or values.shape != weights.shape or np.any(~np.isfinite(weights)) or np.any(weights <= 0):
        raise ValueError("Invalid visual signal scale or weights.")
    valid = np.isfinite(values)
    if not np.any(valid):
        return None
    normalized = np.clip((values[valid] - vmin) / (vmax - vmin), 0, 1)
    return round(float(np.sum(weights[valid] * normalized) / np.sum(weights)), 6)


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
            weights = area_weights(image.width, image.height)[analysis_mask(image.width, image.height)]
        values = decode_pixels(pixels, colorbar, value_cache)
        summary = summarize_values(values, vmin, vmax, weights)
        if summary["mean"] is None:
            raise ValueError(f"No pixels accepted by the color filters in {frame_path.name}.")
        frame_feature = {
            "file": frame_path.name,
            "date": frame_date(index, frame_start_utc, frame_interval),
            **summary,
        }
        if track_id == "clima-vento":
            frame_feature["visualSignal"] = visible_wind_signal(values, weights, vmin, vmax)
        if pixel_filter is None:
            del frame_feature["coverage"]
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
        "statistics": dict(AREA_STATISTICS),
        **({"sonification": dict(WIND_SONIFICATION)} if track_id == "clima-vento" else {}),
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
