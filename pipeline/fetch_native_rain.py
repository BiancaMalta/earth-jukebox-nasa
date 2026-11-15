# AI-assisted: OpenAI Codex
"""Fetch lossless NASA PNGs and verify every date label with Tesseract OCR."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from zoneinfo import ZoneInfo
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005149/frames/2048x1024_2x1_12p/MC03_stage3_GMAO_precipitation_2048x1024_en-hwtool/"


def verify_label(text, expected_date):
    match = re.search(r"(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s*(EDT|EST)", text)
    if not match:
        raise ValueError(f"Unrecognized timestamp: {text!r}; no promotion permitted.")
    expected = datetime.fromisoformat(expected_date).replace(tzinfo=ZoneInfo("America/New_York"))
    parsed = datetime.strptime(" ".join(match.groups()[:3]) + " " + ":".join(match.groups()[3:6]), "%d %b %Y %H:%M:%S")
    if parsed != expected.replace(tzinfo=None) or match[7] != expected.tzname():
        raise ValueError(f"Timestamp mismatch: {text!r} vs {expected_date}")
    return match[0]


def fetch(output, manifest, tessdata):
    frames = json.loads((ROOT / "public/data/clima-chuva/features.json").read_text())["frames"]
    output.mkdir(parents=True, exist_ok=True)
    def download(pair):
        index, frame = pair
        source_index = 2 + 3 * index
        url = BASE + f"{source_index:08d}.png"
        filename = Path(frame["file"]).stem + ".png"
        path = output / filename
        http = requests.Session()
        http.mount("https://", HTTPAdapter(max_retries=Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])))
        if not path.exists():
            r = http.get(url, timeout=(15, 90)); r.raise_for_status()
            temporary = path.with_suffix(".part"); temporary.write_bytes(r.content); temporary.replace(path)
        with Image.open(path) as image:
            if image.size != (2048, 1024):
                raise ValueError(f"Native dimensions changed: {filename}")
            crop = ImageOps.grayscale(image.crop((10, 950, 660, 1005))).point(lambda p: 0 if p > 210 else 255)
            with tempfile.NamedTemporaryFile(suffix=".png") as label:
                crop.save(label.name)
                result = subprocess.run(["tesseract", label.name, "stdout", "--tessdata-dir", str(tessdata), "--psm", "7"], check=True, capture_output=True, text=True)
        text = " ".join(result.stdout.split())
        verified_label = verify_label(text, frame["date"])
        print(f"Verified native rain {index + 1}/{len(frames)}", flush=True)
        return {"file": frame["file"], "date": frame["date"], "nativeFile": filename,
                "sourceIndex": source_index, "sourceUrl": url, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "verifiedLabel": verified_label}
    with ThreadPoolExecutor(max_workers=3) as pool:
        entries = list(pool.map(download, enumerate(frames)))
    result = {"track": "clima-chuva", "svsId": 5149, "width": 2048, "height": 1024, "format": "PNG",
              "pixelFilter": json.loads((ROOT / "public/data/clima-chuva/colorbar.json").read_text())["pixelFilter"],
              "accumulationInterval": None, "missingPixels": "unknown, never inferred zero", "frames": entries}
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--tessdata-dir", type=Path, required=True)
    args = parser.parse_args()
    fetch(args.output, args.manifest, args.tessdata_dir)
