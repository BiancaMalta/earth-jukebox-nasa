# AI-assisted: OpenAI Codex
"""Compare published pollutant image estimates with archived GEOS-CF samples.

Outputs are study artifacts only. No production JSON is regenerated.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import gzip
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.stats import spearmanr

from compare_reference import geometry_mask, weighted_mean
from features import area_weights, decode_pixels
from regions import regional_groups, region_mask
from fetch_pollutant_reference import SAMPLES, VARIABLES

ROOT = Path(__file__).resolve().parents[1]
TRACKS = {"pm25_rh35": "ar-pm25", "co": "ar-co", "o3": "clima-ozonio"}
FACTORS = {"pm25_rh35": 1, "co": 1e9, "o3": 1e9}
TREND_FLOORS = {"pm25_rh35": 1, "co": 5, "o3": 2}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def correlation(rows: list[dict], column: str) -> float | None:
    pairs = [(r[column], r["reference_area_mean"]) for r in rows
             if r[column] is not None and r["reference_area_mean"] is not None]
    if len(pairs) < 3:
        return None
    x, y = np.array(pairs).T
    if np.ptp(x) == 0 or np.ptp(y) == 0:
        return None
    return float(spearmanr(x, y).statistic)


def evaluate(reference_dir: Path, output_dir: Path, baseline_dir: Path | None = None) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    groups = regional_groups(json.loads((ROOT / "public/data/world-countries.geojson").read_text()))
    with np.load(reference_dir / "frame-001.npz", allow_pickle=False) as snapshot:
        lat, lon = snapshot["lat"], snapshot["lon"]
    shape = (len(lat), len(lon))
    reference_weights = np.broadcast_to(np.cos(np.deg2rad(lat))[:, None], shape)
    ref_masks = {key: geometry_mask(group["features"], lat, lon) for key, group in groups.items()}
    with Image.open(ROOT / "public/data/ar-co/frames/frame_000001.webp") as image:
        width, height = image.size
    masks = {key: region_mask(group["features"], width, height) for key, group in groups.items()}
    weights = area_weights(width, height)
    rows, provenance = [], {}
    for variable, track in TRACKS.items():
        directory = ROOT / "public/data" / track
        def source_bytes(name):
            archived = baseline_dir / track / (name + ".gz") if baseline_dir else None
            return gzip.decompress(archived.read_bytes()) if archived and archived.exists() else (directory / name).read_bytes()
        published = json.loads(source_bytes("regions.json"))
        colorbar = json.loads(source_bytes("colorbar.json"))
        provenance[track] = {name: hashlib.sha256(source_bytes(name)).hexdigest() for name in ["regions.json", "colorbar.json", "features.json"]}
        provenance[track]["frames"] = {}
        cache = {}
        for number in SAMPLES:
            metadata = json.loads((reference_dir / f"frame-{number:03d}.json").read_text())
            path = reference_dir / f"frame-{number:03d}.npz"
            if sha(path) != metadata["snapshot_sha256"] or metadata["units"] != VARIABLES:
                raise ValueError("Reference snapshot integrity or units changed.")
            with np.load(path, allow_pickle=False) as snapshot:
                if not np.array_equal(lat, snapshot["lat"]) or not np.array_equal(lon, snapshot["lon"]):
                    raise ValueError("Reference grid changed between samples.")
                field = snapshot[variable].copy()
            field[np.abs(field) >= 1e10] = np.nan
            field *= FACTORS[variable]
            frame = published["frames"][number - 1]
            if frame["date"] != metadata["image_label"]:
                raise ValueError("Image/reference timestamp mismatch.")
            frame_path = directory / "frames" / frame["file"]
            provenance[track]["frames"][frame["file"]] = sha(frame_path)
            with Image.open(frame_path) as image:
                if image.size != (width, height):
                    raise ValueError("Image grid changed between samples.")
                decoded = decode_pixels(np.asarray(image.convert("RGB")).reshape(-1, 3), colorbar, cache).reshape(height, width)
            for key, group in groups.items():
                mask, ref_mask = masks[key], ref_masks[key]
                count, ref_count = int(mask.sum()), int((ref_mask & np.isfinite(field)).sum())
                accepted = mask & np.isfinite(decoded)
                accepted_count = int(accepted.sum())
                raw = published["regions"][key]["values"][number - 1]
                equal_mean = float(np.mean(decoded[accepted])) if accepted_count else None
                weighted = float(np.average(decoded[accepted], weights=weights[accepted])) if accepted_count else None
                expected_mean = weighted if published.get("statistics", {}).get("mean") == "area_weighted" else equal_mean
                # Ensure the audited image decoder really reproduces published means.
                if (raw[0] is None) != (expected_mean is None) or (expected_mean is not None and abs(raw[0] - expected_mean) > 0.002):
                    raise ValueError(f"Published mean not reproduced: {track}, {number}, {key}.")
                reference = weighted_mean(field, ref_mask, reference_weights)
                rows.append({"variable": variable, "unit": published["unit"], "frame": number,
                             "image_label": frame["date"], "reference_utc_center": metadata["utc_center"],
                             "region": key, "kind": group["kind"], "reference_points": ref_count,
                             "image_analyzable_pixels": count, "image_accepted_pixels": accepted_count,
                             "eligible_country": group["kind"] == "country" and ref_count >= 8 and count >= 100,
                             "published_mean": raw[0], "image_area_mean": weighted,
                             "reference_area_mean": reference,
                             "published_minus_reference": raw[0] - reference if raw[0] is not None and reference is not None else None,
                             "weighted_minus_reference": weighted - reference if weighted is not None and reference is not None else None,
                             "pixel_inclusion": accepted_count / count if count else 0,
                             "accepted_area_fraction": float(weights[accepted].sum() / weights[mask].sum()) if count else 0})
            print(f"Evaluated {track} frame {number}", flush=True)
    with (output_dir / "comparacao-poluentes.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    summary = {"scope": "Exploratory GEOS-CF comparison, not independent observations or full-series accuracy.",
               "generated_utc": datetime.now(timezone.utc).isoformat(),
               "samples": list(SAMPLES), "country_selection": {"min_reference_points": 8, "min_image_pixels": 100},
               "input_sha256": provenance, "variables": {}}
    for variable in TRACKS:
        selected = [r for r in rows if r["variable"] == variable and r["eligible_country"]]
        per_frame = []
        for number in SAMPLES:
            sample = [r for r in selected if r["frame"] == number]
            present = [r for r in sample if r["published_mean"] is not None and r["reference_area_mean"] is not None]
            metrics = {"frame": number, "countries": len(present),
                       "missing_regions": [r["region"] for r in sample if r["published_mean"] is None or r["reference_area_mean"] is None],
                       "spearman_published": correlation(present, "published_mean"),
                       "spearman_area_weighted": correlation(present, "image_area_mean")}
            for column, prefix in [("published_minus_reference", "published"), ("weighted_minus_reference", "weighted")]:
                errors = [r[column] for r in present]
                metrics[prefix + "_mae"] = float(np.mean(np.abs(errors))) if errors else None
                metrics[prefix + "_bias"] = float(np.mean(errors)) if errors else None
            per_frame.append(metrics)
        trends = []
        # Adjacent sampled instants only; these are dependent country comparisons.
        for floor in [0, TREND_FLOORS[variable]]:
            total = published_correct = weighted_correct = missing = 0
            for first, second in zip(SAMPLES, SAMPLES[1:]):
                a = {r["region"]: r for r in selected if r["frame"] == first}
                b = {r["region"]: r for r in selected if r["frame"] == second}
                for key in a.keys() & b.keys():
                    left, right = a[key], b[key]
                    if any(r[c] is None for r in [left, right] for c in ["published_mean", "reference_area_mean"]):
                        missing += 1
                        continue
                    delta = right["reference_area_mean"] - left["reference_area_mean"]
                    if abs(delta) <= floor:
                        continue
                    total += 1
                    published_correct += int(np.sign(delta) == np.sign(right["published_mean"] - left["published_mean"]))
                    weighted_correct += int(np.sign(delta) == np.sign(right["image_area_mean"] - left["image_area_mean"]))
            trends.append({"reference_change_strictly_above": floor, "pairs": total,
                           "published_direction_correct": published_correct, "weighted_direction_correct": weighted_correct,
                           "missing_pairs": missing})
        summary["variables"][variable] = {"unit": next(r["unit"] for r in selected), "per_frame": per_frame, "trends": trends}
    (output_dir / "validacao-poluentes.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference-dir", type=Path, default=ROOT / "docs/estudo-cientifico/dados/poluentes")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--baseline-dir", type=Path, help="Optional archived .json.gz inputs for historical reproduction.")
    args = parser.parse_args()
    evaluate(args.reference_dir, args.output_dir, args.baseline_dir)
