# AI-assisted: OpenAI Codex
"""Summarize gains AND losses after native precipitation extraction."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
from regions import regional_groups, region_mask

ROOT = Path(__file__).resolve().parents[1]


def summarize(baseline, output):
    directory = ROOT / "public/data/clima-chuva"
    old_bytes = gzip.decompress((baseline / "regions.json.gz").read_bytes())
    old = json.loads(old_bytes)
    new_bytes = (directory / "regions.json").read_bytes()
    new = json.loads(new_bytes)
    if gzip.decompress((baseline / "colorbar.json.gz").read_bytes()) != (directory / "colorbar.json").read_bytes():
        raise ValueError("Colorbar/filters were changed; this is not a fixed-filter recovery.")
    if old["frames"] and [(f["file"], f["date"]) for f in old["frames"]] != [(f["file"], f["date"]) for f in new["frames"]]:
        raise ValueError("Display timeline changed.")
    if old["regions"].keys() != new["regions"].keys() or old["unit"] != new["unit"]:
        raise ValueError("Region definitions or units changed.")
    manifest_bytes = (directory / "analysis-source.json").read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != new["analysisSource"]["manifestSha256"]:
        raise ValueError("Analysis manifest differs from production provenance.")
    groups = regional_groups(json.loads((ROOT / "public/data/world-countries.geojson").read_text()))
    result = {"scope": "Availability of accepted color pixels, not physical accuracy", "filtersUnchanged": True,
              "baseline_sha256": hashlib.sha256(old_bytes).hexdigest(), "native_sha256": hashlib.sha256(new_bytes).hexdigest(),
              "analysisSource": new["analysisSource"], "totals": {}, "regions": []}
    for kind in ["country", "continent"]:
        totals = dict(total=0, beforeUnavailable=0, afterUnavailable=0, recovered=0, lost=0)
        for key, group in new["regions"].items():
            if group["kind"] != kind:
                continue
            row = {"region": key, "kind": kind, "beforeUnavailable": 0, "afterUnavailable": 0, "recoveredFrames": [], "lostFrames": []}
            for i, (a, b) in enumerate(zip(old["regions"][key]["values"], group["values"])):
                totals["total"] += 1
                totals["beforeUnavailable"] += a[0] is None
                totals["afterUnavailable"] += b[0] is None
                row["beforeUnavailable"] += a[0] is None
                row["afterUnavailable"] += b[0] is None
                if a[0] is None and b[0] is not None:
                    totals["recovered"] += 1; row["recoveredFrames"].append(i + 1)
                if a[0] is not None and b[0] is None:
                    support = int(region_mask(groups[key]["features"], 1024, 512).sum())
                    totals["lost"] += 1
                    row["lostFrames"].append({"frame": i + 1, "oldMean": a[0], "oldCoverage": a[3], "oldAcceptedPixels": round(a[3] * support)})
            result["regions"].append(row)
        result["totals"][kind] = totals
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result["totals"], indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    summarize(args.baseline_dir, args.output)
