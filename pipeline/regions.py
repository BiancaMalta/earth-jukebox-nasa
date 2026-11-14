# AI-assisted: OpenAI Codex
"""Precompute static regional features with the full-frame scientific method."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.draw import polygon as raster_polygon

from features import analysis_mask, decode_pixels, summarize_values

COLUMNS = ["mean", "p90", "norm", "coverage"]


def region_mask(features: list[dict], width: int, height: int) -> np.ndarray:
    """Union split lon/lat GeoJSON polygons at pixel centers, preserving holes.

    This source is equirectangular and split at the antimeridian. Masks use the
    native frame size; there is no image resizing or antialiasing of boundaries.
    """
    result = np.zeros((height, width), dtype=bool)
    for feature in features:
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            polygons = [geometry["coordinates"]]
        elif geometry["type"] == "MultiPolygon":
            polygons = geometry["coordinates"]
        else:
            raise ValueError(f"Unsupported geometry: {geometry['type']}")
        for rings in polygons:
            part = np.zeros_like(result)
            for index, ring in enumerate(rings):
                coordinates = np.asarray(ring, dtype=np.float64)
                x = (coordinates[:, 0] + 180) / 360 * width - 0.5
                y = (90 - coordinates[:, 1]) / 180 * height - 0.5
                rows, cols = raster_polygon(y, x, shape=result.shape)
                part[rows, cols] = index == 0
            result |= part
    return result & analysis_mask(width, height)


def regional_groups(geojson: dict) -> dict:
    groups = {}
    for feature in geojson["features"]:
        props = feature["properties"]
        name = props.get("NAME_EN") or props.get("ADMIN") or props.get("NAME")
        if not isinstance(name, str) or not name:
            raise ValueError("Every country needs a unique name.")
        key = f"country:{name}"
        if key in groups:
            raise ValueError(f"Duplicate country name: {name}")
        groups[key] = {"kind": "country", "name": name, "features": [feature]}
        continent = props.get("CONTINENT")
        if continent:
            group = groups.setdefault(f"continent:{continent}", {
                "kind": "continent", "name": continent, "features": [],
            })
            group["features"].append(feature)
    return groups


def generate_regions(track_id: str, data_dir: Path, geojson_path: Path) -> dict:
    directory = data_dir / track_id
    source = json.loads((directory / "features.json").read_text(encoding="utf-8"))
    colorbar = json.loads((directory / "colorbar.json").read_text(encoding="utf-8"))
    if source.get("mock") is not False:
        raise ValueError("Pixel-derived regional data requires a non-mock source.")
    if source["track"] != track_id or source["unit"] != colorbar["unit"]:
        raise ValueError("Track and colorbar do not match.")
    vmin, vmax = source["vmin"], source["vmax"]
    if not vmin < vmax or (vmin, vmax) != (colorbar["vmin"], colorbar["vmax"]):
        raise ValueError("The global and regional normalization scales must match.")
    frames = source["frames"]
    if not frames:
        raise ValueError("No source frames.")
    groups = regional_groups(json.loads(geojson_path.read_text(encoding="utf-8")))
    with Image.open(directory / "frames" / frames[0]["file"]) as image:
        width, height = image.size
    included = analysis_mask(width, height)
    # Indices refer to the same excluded-overlay pixel vector used by features.py.
    indices = {key: np.flatnonzero(region_mask(group["features"], width, height)[included])
               for key, group in groups.items()}
    regions = {key: {"kind": group["kind"], "name": group["name"], "values": []}
               for key, group in groups.items()}
    cache = {}
    for index, frame in enumerate(frames):
        with Image.open(directory / "frames" / frame["file"]) as image:
            if image.size != (width, height):
                raise ValueError("Frame dimensions changed within a track.")
            pixels = np.asarray(image.convert("RGB"))[included]
        values = decode_pixels(pixels, colorbar, cache)
        # Detect stale source features, including mismatched filtering/calibration.
        summary = summarize_values(values, vmin, vmax)
        for field in COLUMNS:
            if field in frame and frame[field] != summary[field]:
                raise ValueError(f"Source {frame['file']} has stale {field}; regenerate features first.")
        for key, offsets in indices.items():
            stats = summarize_values(values[offsets], vmin, vmax)
            regions[key]["values"].append([stats[column] for column in COLUMNS])
        if index % 10 == 9 or index == len(frames) - 1:
            print(f"{track_id}: {index + 1}/{len(frames)} frames, {len(regions)} regions", flush=True)
    return {
        "schemaVersion": 1, "track": track_id, "svsId": source["svsId"],
        "mock": False, "unit": source["unit"], "vmin": vmin, "vmax": vmax,
        "method": "image-derived; equal pixel weights; pixel-center boundaries; shared pipeline filters",
        "frames": frames, "columns": COLUMNS, "regions": regions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--track", action="append", help="Repeat to select tracks; default: all published tracks.")
    parser.add_argument("--data-dir", type=Path, default=Path("public/data"))
    parser.add_argument("--geojson", type=Path, default=Path("public/data/world-countries.geojson"))
    args = parser.parse_args()
    tracks = args.track or json.loads(Path("public/tracks/index.json").read_text())["tracks"]
    for track in tracks:
        result = generate_regions(track, args.data_dir, args.geojson)
        target = args.data_dir / track / "regions.json"
        temporary = target.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
        temporary.replace(target)
        print(f"Written {target} ({target.stat().st_size:,} bytes)", flush=True)


if __name__ == "__main__":
    main()
