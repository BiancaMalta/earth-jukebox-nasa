# AI-assisted: OpenAI Codex
"""Compare published rain pixels with native NASA PNGs, keeping filters fixed.

No production writes. The original PNGs must be matched to the same dates;
the five initial source-label crops are archived in the accompanying study.
"""
import argparse
import hashlib
import gzip
import json
from pathlib import Path
import numpy as np
from PIL import Image
from features import area_weights, decode_pixels, summarize_values
from regions import region_mask, regional_groups

ROOT = Path(__file__).resolve().parents[1]


def compare(native_dir, output_dir, numbers, baseline_dir=None, manifest_path=None):
    directory = ROOT / "public/data/clima-chuva"
    def read_source(name):
        return json.loads(gzip.decompress((baseline_dir / (name + ".gz")).read_bytes())) if baseline_dir else json.loads((directory / name).read_text())
    source = read_source("features.json")
    previous = read_source("regions.json")
    manifest_path = manifest_path or native_dir.parent / "analysis-source.json"
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    entries = {entry["file"]: entry for entry in manifest["frames"]}
    bar_bytes = (directory / "colorbar.json").read_bytes()
    bar = json.loads(bar_bytes)
    if baseline_dir and bar != read_source("colorbar.json"):
        raise ValueError("The comparison requires exactly the same colorbar and filters.")
    groups = regional_groups(json.loads((ROOT / "public/data/world-countries.geojson").read_text()))
    masks = {}
    rows, inputs = [], []
    cache = {}
    for number in numbers:
        frame = source["frames"][number - 1]
        original = native_dir / f"frame_{number:06d}.png"
        entry = entries[frame["file"]]
        from fetch_native_rain import verify_label
        verify_label(entry["verifiedLabel"], frame["date"])
        if entry["date"] != frame["date"] or hashlib.sha256(original.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError("Native source hash or timestamp does not match the verified manifest.")
        with Image.open(original) as image:
            native = image.convert("RGB")
        if native.size != (2048, 1024):
            raise ValueError("Expected the original 2048×1024 PNG, without upscaling.")
        with Image.open(directory / "frames" / frame["file"]) as image:
            published = image.convert("RGB")
        variants = {"published_webp_1024": published,
                    "original_resized_1024": native.resize((1024, 512), Image.Resampling.LANCZOS),
                    "original_png_2048": native}
        stats = {}
        for name, image in variants.items():
            size = image.size
            if size not in masks:
                masks[size] = {key: region_mask(g["features"], *size) for key, g in groups.items()}
            decoded = decode_pixels(np.asarray(image).reshape(-1, 3), bar, cache).reshape(size[1], size[0])
            weights = area_weights(*size)
            stats[name] = {}
            for key in groups:
                mask = masks[size][key]
                summary = summarize_values(decoded[mask], bar["vmin"], bar["vmax"], weights[mask])
                if name == "published_webp_1024":
                    old = previous["regions"][key]["values"][number - 1]
                    if summary["mean"] != old[0]:
                        raise ValueError("Published rain mean is not reproducible.")
                stats[name][key] = {**summary, "analyzable_pixels": int(mask.sum()), "accepted_pixels": int(np.isfinite(decoded[mask]).sum())}
        for key, group in groups.items():
            rows.append({"frame": number, "date": frame["date"], "region": key, "kind": group["kind"], "variants": {name: data[key] for name, data in stats.items()}})
        inputs.append({"frame": number, "date": frame["date"], "source_index": 2 + 3 * (number - 1),
                       "native_sha256": hashlib.sha256(original.read_bytes()).hexdigest(),
                       "published_sha256": hashlib.sha256((directory / "frames" / frame["file"]).read_bytes()).hexdigest()})
        print(f"Compared rain frame {number}", flush=True)
    totals = {}
    for name in variants:
        countries = [r for r in rows if r["kind"] == "country"]
        totals[name] = {"region_frames": len(countries), "unavailable": sum(r["variants"][name]["mean"] is None for r in countries),
                        "recovered_vs_published": sum(r["variants"]["published_webp_1024"]["mean"] is None and r["variants"][name]["mean"] is not None for r in countries),
                        "lost_vs_published": sum(r["variants"]["published_webp_1024"]["mean"] is not None and r["variants"][name]["mean"] is None for r in countries)}
    output_dir.mkdir(parents=True, exist_ok=True)
    result = {"scope": "Fixed-filter availability comparison, not proof of physical accuracy or a zero-rain detector", "pixelFilter": bar["pixelFilter"],
              "colorbar_sha256": hashlib.sha256(bar_bytes).hexdigest(), "manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(), "inputs": inputs, "totals": totals, "rows": rows}
    (output_dir / "comparacao-resolucao.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    print(json.dumps(totals, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frames", type=int, nargs="+", default=[1, 32, 63, 100, 120])
    parser.add_argument("--baseline-dir", type=Path, help="Archived features/regions/colorbar .json.gz from before native analysis.")
    parser.add_argument("--manifest", type=Path, help="Defaults to analysis-source.json beside the native folder.")
    args = parser.parse_args()
    compare(args.native_dir, args.output_dir, args.frames, args.baseline_dir, args.manifest)
