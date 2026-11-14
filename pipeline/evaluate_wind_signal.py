# AI-assisted: OpenAI Codex
"""Evaluate qualitative wind ordering/trends against three archived GEOS samples."""
from __future__ import annotations
import argparse
from itertools import combinations
import json
from pathlib import Path
import numpy as np
from PIL import Image
from features import analysis_mask, area_weights, decode_pixels, visible_wind_signal
from regions import region_mask
from compare_reference import geometry_mask, weighted_mean, ROOT, STUDY


def ranks(values):
    _, inverse, counts = np.unique(values, return_inverse=True, return_counts=True)
    end = np.cumsum(counts)
    return ((2 * end - counts - 1) / 2)[inverse]


def spearman(x, y):
    if len(x) < 2 or len(np.unique(x)) < 2 or len(np.unique(y)) < 2:
        return None
    return float(np.corrcoef(ranks(x), ranks(y))[0, 1])


def direction_agreement(samples, threshold):
    result = {key: {"same_direction": 0, "pairs": 0} for key in ["conditional_mean", "visual_signal"]}
    for first, second in combinations(samples, 2):
        a = {r["country"]: r for r in first["rows"]}
        b = {r["country"]: r for r in second["rows"]}
        for country in a.keys() & b.keys():
            change = b[country]["reference"] - a[country]["reference"]
            if abs(change) <= threshold:
                continue
            for key, totals in result.items():
                delta = b[country][key] - a[country][key]
                totals["same_direction"] += int(delta * change > 0)
                totals["pairs"] += 1
    return result


def evaluate(repo=ROOT, study=STUDY):
    source = json.loads((repo / "public/data/clima-vento/features.json").read_text())
    colorbar = json.loads((repo / "public/data/clima-vento/colorbar.json").read_text())
    geography = json.loads((repo / "public/data/world-countries.geojson").read_text())
    samples = []
    for frame_index in [0, 62, 99]:
        path = study / "dados" / ("geos-amostra-20261030T1030Z.npz" if frame_index == 0 else f"vento-frame-{frame_index + 1}.npz")
        metadata_path = study / "dados" / ("geos-amostra-metadata.json" if frame_index == 0 else f"vento-frame-{frame_index + 1}-metadata.json")
        metadata = json.loads(metadata_path.read_text())
        label = metadata.get("image_label")
        if source["frames"][frame_index]["date"] != label:
            raise ValueError("Archived reference and image labels changed; temporal review required.")
        with np.load(path, allow_pickle=False) as data:
            u, v = data["u10m"].copy(), data["v10m"].copy()
            u[np.abs(u) >= 1e10] = np.nan; v[np.abs(v) >= 1e10] = np.nan
            speed = np.hypot(u, v)
            lat, lon = data["lat"], data["lon"]
        reference_weights = np.broadcast_to(np.cos(np.deg2rad(lat))[:, None], speed.shape)
        frame = source["frames"][frame_index]
        with Image.open(repo / "public/data/clima-vento/frames" / frame["file"]) as image:
            width, height = image.size
            included = analysis_mask(width, height)
            decoded = decode_pixels(np.asarray(image.convert("RGB"))[included], colorbar, {})
            weights = area_weights(width, height)[included]
        rows, missing = [], []
        for feature in geography["features"]:
            mask = geometry_mask([feature], lat, lon)
            image_mask = region_mask([feature], width, height)[included]
            # Same predeclared support screen for every candidate and instant.
            if mask.sum() < 8 or image_mask.sum() < 100:
                continue
            reference = weighted_mean(speed, mask, reference_weights)
            if reference is None:
                continue
            values, w = decoded[image_mask], weights[image_mask]
            valid = np.isfinite(values)
            country = feature["properties"]["NAME_EN"]
            signal = visible_wind_signal(values, w, colorbar["vmin"], colorbar["vmax"])
            if signal is None:
                missing.append({"country": country, "reference": reference})
                continue
            rows.append({"country": country, "reference": reference,
                         "conditional_mean": float(np.average(values[valid], weights=w[valid])),
                         "visual_signal": signal,
                         "visible_area": float(w[valid].sum() / w.sum())})
        correlations = {key: spearman([r["reference"] for r in rows], [r[key] for r in rows]) for key in ["conditional_mean", "visible_area", "visual_signal"]}
        samples.append({"frame": frame_index + 1, "label": label, "reference_utc_center": metadata["utc_center"],
                        "rows": rows, "missing": missing, "spearman": correlations,
                        "missing_reference_ge_3_m_s": [r for r in missing if r["reference"] >= 3]})
    return {"scope": "Exploratory comparison, not independent validation or an accuracy probability. Same GEOS family, coarse 1.25 degree sample and half-hour center assumption.",
            "eligibility": {"minimum_reference_grid_points": 8, "minimum_analyzed_image_pixels": 100},
            "samples": samples,
            "temporal_direction": {str(threshold): direction_agreement(samples, threshold) for threshold in [0, .25, .5, 1]}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = evaluate()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    for sample in result["samples"]:
        print(sample["frame"], sample["spearman"], "countries", len(sample["rows"]), "missing", len(sample["missing"]))
    print("Direction >0.5 m/s:", result["temporal_direction"]["0.5"])


if __name__ == "__main__":
    main()
