# AI-assisted: OpenAI Codex
"""Reproduce the archived one-frame comparison without network or production writes."""
from __future__ import annotations
import argparse
import csv
import json
from pathlib import Path
import numpy as np
from skimage.measure import points_in_poly

ROOT = Path(__file__).resolve().parents[1]
STUDY = ROOT / "docs/estudo-cientifico"
TRACKS = {"temperature": "clima-temperatura", "humidity": "clima-umidade", "wind": "clima-vento", "precipitation": "clima-chuva"}
GROUPS = ["Africa", "South America", "North America", "Europe", "Asia", "Oceania", "Antarctica"]


def geometry_mask(features: list[dict], lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    xx, yy = np.meshgrid(lon, lat)
    points = np.column_stack([xx.ravel(), yy.ravel()])
    selected = np.zeros(len(points), dtype=bool)
    for feature in features:
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            polygons = [geometry["coordinates"]]
        elif geometry["type"] == "MultiPolygon":
            polygons = geometry["coordinates"]
        else:
            raise ValueError("Only split Polygon/MultiPolygon boundaries are supported.")
        for rings in polygons:
            mask = points_in_poly(points, np.asarray(rings[0]))
            for hole in rings[1:]:
                mask &= ~points_in_poly(points, np.asarray(hole))
            selected |= mask
    return selected.reshape(xx.shape)


def weighted_mean(values: np.ndarray, mask: np.ndarray, weights: np.ndarray) -> float | None:
    valid = mask & np.isfinite(values) & (np.abs(values) < 1e10)
    if not np.any(valid):
        return None
    return float(np.average(values[valid], weights=weights[valid]))


def reference_fields(snapshot: dict) -> dict:
    # Units are confirmed by the adjacent metadata and GMAO file specification.
    # A velocity-of-mean-vector is not an instantaneous wind-speed measurement.
    fields = {key: np.asarray(snapshot[key], dtype=float).copy() for key in ["t2m", "qv2m", "u10m", "v10m", "prectot"]}
    for values in fields.values():
        values[np.abs(values) >= 1e10] = np.nan
    return {"temperature": fields["t2m"] - 273.15,
            "humidity": fields["qv2m"] * 1000,
            "wind": np.hypot(fields["u10m"], fields["v10m"]),
            "precipitation": fields["prectot"] * 3600}


def compare(repo: Path = ROOT, study: Path = STUDY) -> list[dict]:
    metadata = json.loads((study / "dados/geos-amostra-metadata.json").read_text())
    expected_units = {"t2m": "K", "qv2m": "kg/kg", "u10m": "m/s", "v10m": "m/s", "prectot": "kg/m2/s"}
    if metadata["units"] != expected_units:
        raise ValueError("Reference units changed; conversions require explicit review.")
    with np.load(study / "dados/geos-amostra-20261030T1030Z.npz", allow_pickle=False) as snapshot:
        fields = reference_fields(snapshot)
        lat, lon = snapshot["lat"], snapshot["lon"]
    expected_shape = (len(lat), len(lon))
    if any(values.shape != expected_shape for values in fields.values()):
        raise ValueError("Reference coordinates do not match its grids.")
    weights = np.broadcast_to(np.cos(np.deg2rad(lat))[:, None], expected_shape)
    boundaries = json.loads((repo / "public/data/world-countries.geojson").read_text())
    datasets = {kind: json.loads((repo / f"public/data/{tid}/regions.json").read_text()) for kind, tid in TRACKS.items()}
    before = {r["continent"]: r for r in json.loads((study / "dados/comparacao-inicial.json").read_text())}
    prefixes = {"temperature": "T", "humidity": "Q", "wind": "V", "precipitation": "P"}
    rows = []
    for group in GROUPS:
        selected = geometry_mask([f for f in boundaries["features"] if f["properties"]["CONTINENT"] == group], lat, lon)
        for kind, source in datasets.items():
            index = next((i for i, f in enumerate(source["frames"]) if f["date"] == metadata["image_label"]), None)
            if index is None:
                raise ValueError(f"Image timestamp is absent from {TRACKS[kind]}; no index pairing allowed.")
            mean, _, _, inclusion = source["regions"]["continent:" + group]["values"][index]
            reference = weighted_mean(fields[kind], selected, weights)
            comparable = kind != "precipitation"
            prefix = prefixes[kind]
            rows.append({"group": group, "variable": kind,
                         "image_time_label": metadata["image_label"], "reference_utc_center": metadata["utc_center"],
                         "before_image_mean_equal_pixels": before[group][prefix + ("_image_mm" if kind == "precipitation" else "_image")],
                         "current_image_mean": mean, "reference_area_mean": reference,
                         "image_unit": source["unit"], "reference_unit": {"temperature": "°C", "humidity": "g/kg", "wind": "m/s", "precipitation": "mm/h"}[kind],
                         "pixel_inclusion": inclusion,
                         "current_minus_reference": mean - reference if comparable and mean is not None and reference is not None else None,
                         "comparison_scope": "approximate one-frame comparison, not measurement accuracy" if comparable else "different temporal quantity: no error metric permitted",
                         "current_method": source.get("statistics", {}).get("mean", "equal_pixels")})
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="Destination CSV; production JSONs are never written.")
    args = parser.parse_args()
    rows = compare()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
        writer.writeheader(); writer.writerows(rows)
    print(f"Compared {len(rows)} region/variable pairs; wrote {args.output}")


if __name__ == "__main__":
    main()
