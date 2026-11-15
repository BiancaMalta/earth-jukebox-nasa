# AI-assisted: OpenAI Codex
"""Precompute static regional features with the full-frame scientific method."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.draw import polygon as raster_polygon

from features import WIND_SONIFICATION, PM25_SONIFICATION, visible_wind_signal, visible_pm25_signal, AREA_STATISTICS, area_weights, analysis_mask, decode_pixels, summarize_values
from fetch_native_rain import verify_label

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


def generate_regions(track_id: str, data_dir: Path, geojson_path: Path, update_features: bool = False,
                     analysis_frames_dir: Path | None = None, analysis_manifest: Path | None = None) -> dict:
    directory = data_dir / track_id
    source = json.loads((directory / "features.json").read_text(encoding="utf-8"))
    colorbar = json.loads((directory / "colorbar.json").read_text(encoding="utf-8"))
    native_entries = None
    analysis_source = None
    if bool(analysis_frames_dir) != bool(analysis_manifest):
        raise ValueError("Native analysis requires both the frame directory and verified manifest.")
    if source.get("analysisSource") and not analysis_manifest:
        raise ValueError("This dataset uses native analysis frames; provide --analysis-frames-dir and --analysis-manifest.")
    if analysis_manifest:
        manifest_bytes = analysis_manifest.read_bytes()
        manifest = json.loads(manifest_bytes)
        if (manifest.get("track"), manifest.get("svsId"), manifest.get("width"), manifest.get("height"), manifest.get("format")) != (track_id, source["svsId"], 2048, 1024, "PNG") or manifest.get("pixelFilter") != colorbar.get("pixelFilter"):
            raise ValueError("Native source identity, dimensions or filters changed.")
        native_entries = manifest["frames"]
        if len(native_entries) != len(source["frames"]):
            raise ValueError("Native source frame count differs from the display timeline.")
        for expected, entry in zip(source["frames"], native_entries):
            if (entry["file"], entry["date"]) != (expected["file"], expected["date"]) or not entry.get("verifiedLabel"):
                raise ValueError("Native source timestamps are not verified against the display timeline.")
            verify_label(entry["verifiedLabel"], expected["date"])
            if Path(entry["nativeFile"]).name != entry["nativeFile"] or not entry["nativeFile"].endswith(".png"):
                raise ValueError("Unsafe native image basename.")
            if hashlib.sha256((analysis_frames_dir / entry["nativeFile"]).read_bytes()).hexdigest() != entry["sha256"]:
                raise ValueError("Native image hash differs from the verified source manifest.")
        analysis_source = {"width": 2048, "height": 1024, "format": "PNG", "manifestSha256": hashlib.sha256(manifest_bytes).hexdigest(), "dateLabelsVerified": True}
    def image_path(index):
        return analysis_frames_dir / native_entries[index]["nativeFile"] if native_entries is not None else directory / "frames" / source["frames"][index]["file"]
    if source.get("mock") is not False:
        raise ValueError("Pixel-derived regional data requires a non-mock source.")
    if source["track"] != track_id or source["unit"] != colorbar["unit"]:
        raise ValueError("Track and colorbar do not match.")
    vmin, vmax = source["vmin"], source["vmax"]
    if not vmin < vmax or (vmin, vmax) != (colorbar["vmin"], colorbar["vmax"]):
        raise ValueError("The global and regional normalization scales must match.")
    if colorbar.get("scale", "linear") == "log" and vmin <= 0:
        raise ValueError("A log colorbar requires a positive minimum.")
    scale = colorbar.get("scale", "linear")
    if not update_features and source.get("statistics") != AREA_STATISTICS:
        raise ValueError("Source mean method is not area-weighted; run with --update-features.")
    wind_signal = track_id == "clima-vento"
    signal_function = visible_wind_signal if wind_signal else visible_pm25_signal if track_id == "ar-pm25" else None
    sonification = WIND_SONIFICATION if wind_signal else PM25_SONIFICATION if signal_function else None
    if signal_function and not update_features and source.get("sonification") != sonification:
        raise ValueError("Visual-signal metadata is stale; run with --update-features.")
    columns = COLUMNS + (["visualSignal"] if signal_function else [])
    frames = source["frames"]
    if not frames:
        raise ValueError("No source frames.")
    groups = regional_groups(json.loads(geojson_path.read_text(encoding="utf-8")))
    with Image.open(image_path(0)) as image:
        width, height = image.size
    if analysis_source and (width, height) != (analysis_source["width"], analysis_source["height"]):
        raise ValueError("Native image dimensions differ from manifest.")
    included = analysis_mask(width, height)
    weights = area_weights(width, height)[included]
    updated_frames = []
    # Indices refer to the same excluded-overlay pixel vector used by features.py.
    indices = {key: np.flatnonzero(region_mask(group["features"], width, height)[included])
               for key, group in groups.items()}
    regions = {key: {"kind": group["kind"], "name": group["name"], "values": []}
               for key, group in groups.items()}
    cache = {}
    for index, frame in enumerate(frames):
        with Image.open(image_path(index)) as image:
            if image.size != (width, height):
                raise ValueError("Frame dimensions changed within a track.")
            pixels = np.asarray(image.convert("RGB"))[included]
        values = decode_pixels(pixels, colorbar, cache)
        # Detect stale source features, including weighting, scale and filtering.
        summary = summarize_values(values, vmin, vmax, weights, scale)
        if signal_function:
            summary["visualSignal"] = signal_function(values, weights, vmin, vmax)
        if update_features:
            updated_frames.append({**frame, **summary})
        else:
            for field in columns:
                if field in frame and frame[field] != summary[field]:
                    raise ValueError(f"Source {frame['file']} has stale {field}; regenerate features first.")
        for key, offsets in indices.items():
            stats = summarize_values(values[offsets], vmin, vmax, weights[offsets], scale)
            if signal_function:
                stats["visualSignal"] = signal_function(values[offsets], weights[offsets], vmin, vmax)
            regions[key]["values"].append([stats[column] for column in columns])
        if index % 10 == 9 or index == len(frames) - 1:
            print(f"{track_id}: {index + 1}/{len(frames)} frames, {len(regions)} regions", flush=True)
    if update_features:
        source = {**source, "statistics": dict(AREA_STATISTICS), "frames": updated_frames, **({"sonification": dict(sonification)} if sonification else {})}
        if analysis_source:
            source["analysisSource"] = analysis_source
        temporary = directory / "features.json.tmp"
        temporary.write_text(json.dumps(source, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        temporary.replace(directory / "features.json")
        frames = updated_frames
    return {
        "schemaVersion": 3 if signal_function else 2, "track": track_id, "svsId": source["svsId"],
        "mock": False, "unit": source["unit"], "vmin": vmin, "vmax": vmax,
        "method": "image-derived; cosine-latitude area-weighted mean; pixel-center boundaries; shared pipeline filters",
        "statistics": dict(AREA_STATISTICS),
        **({"analysisSource": analysis_source} if analysis_source else {}),
        **({"sonification": dict(sonification)} if sonification else {}),
        "frames": frames, "columns": columns, "regions": regions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--track", action="append", help="Repeat to select tracks; default: all published tracks.")
    parser.add_argument("--data-dir", type=Path, default=Path("public/data"))
    parser.add_argument("--geojson", type=Path, default=Path("public/data/world-countries.geojson"))
    parser.add_argument("--update-features", action="store_true", help="Recompute full-frame and regional statistics together, preserving frame dates.")
    parser.add_argument("--analysis-frames-dir", type=Path, help="Original analysis PNGs, separate from display previews.")
    parser.add_argument("--analysis-manifest", type=Path, help="Verified source dates, hashes and unchanged filters.")
    args = parser.parse_args()
    tracks = args.track or json.loads(Path("public/tracks/index.json").read_text())["tracks"]
    for track in tracks:
        result = generate_regions(track, args.data_dir, args.geojson, args.update_features, args.analysis_frames_dir, args.analysis_manifest)
        target = args.data_dir / track / "regions.json"
        temporary = target.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
        temporary.replace(target)
        print(f"Written {target} ({target.stat().st_size:,} bytes)", flush=True)


if __name__ == "__main__":
    main()
