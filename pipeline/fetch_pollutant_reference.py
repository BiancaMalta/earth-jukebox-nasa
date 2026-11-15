# AI-assisted: OpenAI Codex
"""Archive small GEOS-CF v2 reference subsets; never alter production data."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
from zoneinfo import ZoneInfo

import numpy as np
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv"
VARIABLES = {"co": "mol/mol", "o3": "mol/mol", "pm25_rh35": "µg/m³"}
SAMPLES = (1, 32, 63, 100, 120)


def parse_ascii(body: str, variables: dict = VARIABLES) -> dict:
    arrays = {}
    name = None
    for line in body.splitlines():
        match = re.fullmatch(r"(co|o3|pm25_rh35), \[1\]\[1\]\[145\]\[288\]", line)
        if match:
            name = match[1]
            arrays[name] = []
        elif name and re.match(r"^\[0\]\[0\]\[\d+\],", line):
            arrays[name].append(np.fromstring(line.split(",", 1)[1], sep=","))
    if set(arrays) != set(variables):
        raise ValueError("Missing reference variables in ASCII response.")
    arrays = {key: np.asarray(value) for key, value in arrays.items()}
    if any(value.shape != (145, 288) for value in arrays.values()):
        raise ValueError("Unexpected reference grid dimensions.")
    # Verify returned coordinates, rather than silently assuming grid alignment.
    for coord, expected in {"lat": np.arange(145) * 1.25 - 90,
                            "lon": np.arange(288) * 1.25 - 180}.items():
        match = re.search(rf"^{coord}, \[\d+\]\n([^\n]+)", body, re.M)
        if not match or not np.allclose(np.fromstring(match[1], sep=","), expected):
            raise ValueError(f"Unexpected {coord} coordinates.")
        arrays[coord] = expected
    return arrays


def fetch(destination: Path, samples=SAMPLES, variables: dict = VARIABLES) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    http = requests.Session()
    http.mount("https://", HTTPAdapter(max_retries=Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])))
    das = http.get(BASE + ".das", timeout=(15, 60))
    das.raise_for_status()
    for variable, unit_label in {"co": "mol mol-1", "o3": "mol mol-1", "pm25_rh35": "ug m-3"}.items():
        block = re.search(rf"    {variable} \{{(.*?)\n    }}", das.text, re.S)
        if not block or unit_label not in block[1]:
            raise ValueError(f"Reference unit definition changed for {variable}.")
    dds = http.get(BASE + ".dds", timeout=(15, 60))
    dds.raise_for_status()
    (destination / "geos-cf.das").write_text(das.text)
    (destination / "geos-cf.dds").write_text(dds.text)
    start_label = re.search(r'String grads_min "([^"]+)"', das.text)[1]
    end_label = re.search(r'String maximum "([^\"]+)"', das.text[das.text.index("    time {"):])[1]
    start = datetime.strptime(start_label, "%H:%Mz%d%b%Y").replace(tzinfo=timezone.utc)
    end = datetime.strptime(end_label, "%H:%Mz%d%b%Y").replace(tzinfo=timezone.utc)
    origin = http.get(BASE + ".ascii", params="time[0]", timeout=(15, 60))
    origin.raise_for_status()
    (destination / "time-origin.ascii").write_text(origin.text)
    origin_match = re.search(r"time, \[1\]\n([^\n]+)", origin.text)
    if not origin_match:
        raise ValueError("Missing time coordinate origin.")
    origin_day = float(origin_match[1])
    frames = json.loads((ROOT / "public/data/ar-co/features.json").read_text())["frames"]
    for frame_number in samples:
        frame = frames[frame_number - 1]
        center = datetime.fromisoformat(frame["date"]).replace(tzinfo=ZoneInfo("America/New_York")).astimezone(timezone.utc) + timedelta(minutes=30)
        if not start <= center <= end:
            raise ValueError(f"Frame {frame_number} is outside reference archive range.")
        hours = (center - start).total_seconds() / 3600
        if hours != int(hours):
            raise ValueError("Reference time does not align with hourly grid.")
        index = int(hours)
        query = ",".join(f"{variable}[{index}][0][0:5:720][0:5:1439]" for variable in variables)
        response = http.get(BASE + ".ascii", params=query, timeout=(15, 90))
        response.raise_for_status()
        arrays = parse_ascii(response.text, variables)
        level = re.search(r"^lev, \[1\]\n([^\n]+)", response.text, re.M)
        if not level or float(level[1]) != 72:
            raise ValueError("Reference is not the bottom model layer 72.")
        if any(not np.any(np.isfinite(arrays[key]) & (np.abs(arrays[key]) < 1e10)) for key in variables):
            raise ValueError("Reference response contains no finite data.")
        returned_time = re.search(r"^time, \[1\]\n([^\n]+)", response.text, re.M)
        # GrADS mixed Julian/Gregorian origin differs from Python's proleptic
        # Gregorian ordinal. Verify relative to the server's own first coordinate.
        expected_day = origin_day + index / 24
        if not returned_time or abs(float(returned_time[1]) - expected_day) > 1e-7:
            raise ValueError("Returned reference timestamp differs from requested UTC center.")
        snapshot = destination / f"frame-{frame_number:03d}.npz"
        np.savez_compressed(snapshot, **arrays)
        metadata = {
            "frame": frame_number, "image_label": frame["date"], "utc_center": center.isoformat(),
            "retrieved_utc": datetime.now(timezone.utc).isoformat(), "source_url": response.url,
            "time_index": index, "units": variables, "level": "72 (bottom model layer)",
            "returned_time_coordinate_days": float(returned_time[1]), "time_origin_label": start_label,
            "ascii_sha256": hashlib.sha256(response.content).hexdigest(),
            "snapshot_sha256": hashlib.sha256(snapshot.read_bytes()).hexdigest(),
            "caveat": "GEOS-CF v2 analysis, hourly mean 30 min after image label interpreted as Eastern. Exact SVS collection/run and PM recipe not established; not independent observations.",
        }
        snapshot.with_suffix(".json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
        print(f"Archived frame {frame_number}: {center.isoformat()}, {len(response.content)} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frames", type=int, nargs="+", default=SAMPLES)
    parser.add_argument("--variables", nargs="+", choices=list(VARIABLES), default=list(VARIABLES))
    args = parser.parse_args()
    if not args.frames or min(args.frames) < 1 or max(args.frames) > 124:
        parser.error("Frames must be between 1 and 124.")
    fetch(args.output_dir, args.frames, {key: VARIABLES[key] for key in args.variables})
