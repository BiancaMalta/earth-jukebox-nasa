# AI-assisted: OpenAI Codex
"""Evaluate PM2.5 more/less, 3-hour directions and the actual fixed pitch mapping.

Candidate selection: frames 1, 32, 63. Later checks: original 100/120 plus
24 newly queried frames in three contiguous windows. No production writes.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime
import hashlib
from itertools import combinations
import json
from pathlib import Path

import numpy as np
from PIL import Image

from compare_reference import geometry_mask, weighted_mean
from evaluate_wind_signal import spearman
from features import area_weights, decode_pixels, summarize_values, visible_pm25_signal
from regions import region_mask, regional_groups

ROOT = Path(__file__).resolve().parents[1]
STUDY = ROOT / "docs/estudo-cientifico/dados"
DEVELOPMENT = (1, 32, 63)
ORIGINAL = (1, 32, 63, 100, 120)
NEW = (*range(2, 10), *range(64, 72), *range(112, 120))
SAMPLES = sorted(set(ORIGINAL) | set(NEW))
CANDIDATES = ("legacy_norm", "weighted_norm", "log_conditional", "visual_signal", "median_position", "trimmed_position")


def pitch_cents(position):
    # Historical C4–C6 curve used when this visual-index study was conducted.
    # The later C3–C7 musical update doubles these pitch differences; keep this
    # baseline frozen so the archived scientific study remains reproducible.
    return 2400 * (position + .3 * np.sin(np.pi * position))


def direction_totals():
    return {"correct": 0, "reversed": 0, "tied": 0, "total": 0}


def count_direction(totals, reference_delta, image_delta):
    totals["total"] += 1
    totals["tied" if image_delta == 0 else "correct" if reference_delta * image_delta > 0 else "reversed"] += 1


def spatial(rows):
    result = {key: {**direction_totals(), "pitch_gap_at_least_100_cents": 0} for key in ["legacy_norm", "visual_signal"]}
    for a, b in combinations(rows, 2):
        low, high = sorted([a["reference"], b["reference"]])
        if low <= 0 or high < 2 * low or high - low < 5:
            continue
        for key, totals in result.items():
            delta = b[key] - a[key]
            change = b["reference"] - a["reference"]
            count_direction(totals, change, delta)
            totals["pitch_gap_at_least_100_cents"] += int(change * delta > 0 and abs(pitch_cents(b[key]) - pitch_cents(a[key])) >= 100)
    return result


def temporal(rows, kind):
    lookup = {(r["frame"], r["region"]): r for r in rows if r["kind"] == kind and r["eligible"]}
    output = {}
    for floor in [0, 1, 2, 5]:
        totals = {key: direction_totals() for key in ["legacy_norm", "visual_signal"]}
        opposed = {key: direction_totals() for key in ["legacy_norm", "visual_signal"]}
        intervals = []
        for first, second in zip(SAMPLES, SAMPLES[1:]):
            if second - first != 1:
                continue
            changes = []
            for region in {key for number, key in lookup if number == first}:
                a, b = lookup.get((first, region)), lookup.get((second, region))
                if a is None or b is None or any(r[c] is None for r in [a, b] for c in ["reference", "legacy_norm", "visual_signal"]):
                    continue
                hours = (datetime.fromisoformat(b["utc_center"]) - datetime.fromisoformat(a["utc_center"])).total_seconds() / 3600
                if hours != 3:
                    raise ValueError("Consecutive frames are not 3 hours apart in reference UTC.")
                change = b["reference"] - a["reference"]
                if abs(change) <= floor:
                    continue
                changes.append((change, a, b))
                for key in totals:
                    count_direction(totals[key], change, b[key] - a[key])
            for left, right in combinations(changes, 2):
                if left[0] * right[0] >= 0:
                    continue
                for key in opposed:
                    opposed[key]["total"] += 1
                    dl, dr = left[2][key] - left[1][key], right[2][key] - right[1][key]
                    if dl == 0 or dr == 0:
                        opposed[key]["tied"] += 1
                    elif dl * left[0] > 0 and dr * right[0] > 0:
                        opposed[key]["correct"] += 1
                    else:
                        opposed[key]["reversed"] += 1  # At least one of the two directions failed.
            intervals.append([first, second])
        output[str(floor)] = {"directions": totals, "opposite_region_changes_both_correct": opposed, "intervals": intervals}
    return output


def evaluate(output: Path):
    output.mkdir(parents=True, exist_ok=True)
    directory = ROOT / "public/data/ar-pm25"
    source = json.loads((directory / "features.json").read_text())
    published = json.loads((directory / "regions.json").read_text())
    bar = json.loads((directory / "colorbar.json").read_text())
    if (bar["unit"], bar["scale"], bar["vmin"], bar["vmax"]) != ("µg/m³", "log", .4, 409.6):
        raise ValueError("PM2.5 legend changed; review required.")
    groups = regional_groups(json.loads((ROOT / "public/data/world-countries.geojson").read_text()))
    with np.load(STUDY / "poluentes/frame-001.npz", allow_pickle=False) as snapshot:
        lat, lon = snapshot["lat"], snapshot["lon"]
    reference_weights = np.broadcast_to(np.cos(np.deg2rad(lat))[:, None], (len(lat), len(lon)))
    reference_masks = {key: geometry_mask(group["features"], lat, lon) for key, group in groups.items()}
    masks = {key: region_mask(group["features"], 1024, 512) for key, group in groups.items()}
    weights = area_weights(1024, 512)
    cache, rows, provenance, missing = {}, [], {}, []
    for number in SAMPLES:
        path = STUDY / ("poluentes" if number in ORIGINAL else "pm25-qualitativo") / f"frame-{number:03d}.npz"
        metadata = json.loads(path.with_suffix(".json").read_text())
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != metadata["snapshot_sha256"] or metadata["units"].get("pm25_rh35") != "µg/m³":
            raise ValueError("Reference integrity or units changed.")
        frame = source["frames"][number - 1]
        if frame["date"] != metadata["image_label"]:
            raise ValueError("Image/reference timestamps changed.")
        with np.load(path, allow_pickle=False) as data:
            if not np.array_equal(lat, data["lat"]) or not np.array_equal(lon, data["lon"]):
                raise ValueError("Reference grid changed.")
            field = data["pm25_rh35"].copy()
        field[np.abs(field) >= 1e10] = np.nan
        image_path = directory / "frames" / frame["file"]
        with Image.open(image_path) as image:
            if image.size != (1024, 512):
                raise ValueError("Image grid changed.")
            decoded = decode_pixels(np.asarray(image.convert("RGB")).reshape(-1, 3), bar, cache).reshape(512, 1024)
        provenance[str(number)] = {"reference_sha256": digest, "image_sha256": hashlib.sha256(image_path.read_bytes()).hexdigest()}
        for key, group in groups.items():
            mask, ref_mask = masks[key], reference_masks[key]
            count = int(mask.sum())
            support = int((ref_mask & np.isfinite(field)).sum())
            reference = weighted_mean(field, ref_mask, reference_weights)
            eligible = count >= 100 and support >= 8
            values, w = decoded[mask], weights[mask]
            valid = np.isfinite(values)
            if not eligible or reference is None or not np.any(valid):
                missing.append({"frame": number, "region": key, "eligible": eligible, "reference": reference, "accepted_pixels": int(valid.sum())})
                continue
            v, ww = values[valid], w[valid]
            position = np.clip(np.log(v / .4) / np.log(1024), 0, 1)
            legacy = summarize_values(values, .4, 409.6, scale="log")["norm"]
            weighted = summarize_values(values, .4, 409.6, w, "log")["norm"]
            signal = visible_pm25_signal(values, w, .4, 409.6)
            if source.get("sonification", {}).get("input") == "visualSignal":
                if published["regions"][key]["values"][number - 1][4] != signal:
                    raise ValueError("Production visual signal differs from evaluated signal.")
            trim = v <= np.percentile(v, 95)
            row = {"frame": number, "region": key, "kind": group["kind"], "eligible": eligible,
                   "utc_center": metadata["utc_center"], "reference": reference,
                   "legacy_norm": legacy, "weighted_norm": weighted,
                   "log_conditional": float(np.average(position, weights=ww)), "visual_signal": signal,
                   "median_position": float(np.log(np.median(v) / .4) / np.log(1024)),
                   "trimmed_position": float(np.log(np.average(v[trim], weights=ww[trim]) / .4) / np.log(1024)),
                   "accepted_area_fraction": float(ww.sum() / w.sum())}
            rows.append(row)
        print(f"PM2.5 qualitative frame {number}", flush=True)
    with (output / "pm25-qualitativo.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader(); writer.writerows(rows)
    result = {"scope": "Qualitative same-family model comparison; no independent observations or perceptual user study.",
              "development_frames": list(DEVELOPMENT), "previously_audited_check_frames": [100, 120],
              "new_check_frames": list(NEW), "spatial_strong_contrast": {"minimum_ratio": 2, "minimum_difference_ug_m3": 5},
              "eligibility": {"minimum_reference_points": 8, "minimum_image_pixels": 100},
              "candidate_selection": "log extent selected using country Spearman on frames 1/32/63; other frames are checks after selection",
              "input_sha256": provenance, "colorbar_sha256": hashlib.sha256((directory / "colorbar.json").read_bytes()).hexdigest(),
              "boundaries_sha256": hashlib.sha256((ROOT / "public/data/world-countries.geojson").read_bytes()).hexdigest(),
              "missing_or_insufficient_support": missing, "per_frame": [], "temporal": {}}
    for number in SAMPLES:
        for kind in ["country", "continent"]:
            sample = [r for r in rows if r["frame"] == number and r["kind"] == kind]
            result["per_frame"].append({"frame": number, "kind": kind, "regions": len(sample),
                                        "spearman": {key: spearman([r[key] for r in sample], [r["reference"] for r in sample]) for key in CANDIDATES},
                                        "strong_contrasts": spatial(sample)})
    result["temporal"] = {kind: temporal(rows, kind) for kind in ["country", "continent"]}
    (output / "pm25-qualitativo.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    evaluate(parser.parse_args().output_dir)
