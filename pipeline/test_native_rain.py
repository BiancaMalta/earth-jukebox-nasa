# AI-assisted: OpenAI Codex
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from fetch_native_rain import verify_label
from regions import generate_regions
from test_regions import feature, WORLD


class NativeRainTests(unittest.TestCase):
    def test_labels_must_match_dates_and_daylight_saving(self):
        verify_label("30 Oct 2026 06:00:00 EDT", "2026-10-30T06:00")
        verify_label("03 Nov 2026 02:00:00 EST", "2026-11-03T02:00")
        for text in ["30 Oct 2026 05:00:00 EDT", "30 Oct 2026 06:00:00 EST", "unreadable"]:
            with self.assertRaises(ValueError):
                verify_label(text, "2026-10-30T06:00")

    def test_native_analysis_uses_original_pixels_and_rejects_changed_hashes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); track = root / "clima-chuva"; (track / "frames").mkdir(parents=True)
            # The preview has no accepted colors, while the original has a valid rain color.
            Image.new("RGB", (1024, 512), "gray").save(track / "frames/frame_000001.webp")
            native = root / "native"; native.mkdir()
            image = native / "frame_000001.png"; Image.new("RGB", (2048, 1024), (0, 200, 0)).save(image)
            colorbar = {"unit": "mm", "vmin": 0, "vmax": 20, "samples": [{"rgb": [0, 200, 0], "value": 1}], "pixelFilter": {"minSaturation": 40, "maxColorDistance": 30}}
            (track / "colorbar.json").write_text(json.dumps(colorbar))
            source = {"track": "clima-chuva", "svsId": 5149, "mock": False, "unit": "mm", "vmin": 0, "vmax": 20, "frames": [{"file": "frame_000001.webp", "date": "2026-10-30T06:00", "mean": None, "p90": None, "norm": None, "coverage": 0}]}
            (track / "features.json").write_text(json.dumps(source))
            manifest = {"track": "clima-chuva", "svsId": 5149, "width": 2048, "height": 1024, "format": "PNG", "pixelFilter": colorbar["pixelFilter"], "frames": [{"file": "frame_000001.webp", "date": source["frames"][0]["date"], "nativeFile": image.name, "sha256": hashlib.sha256(image.read_bytes()).hexdigest(), "verifiedLabel": "30 Oct 2026 06:00:00 EDT"}]}
            manifest_file = root / "manifest.json"; manifest_file.write_text(json.dumps(manifest))
            geo = root / "geo.json"; geo.write_text(json.dumps({"features": [feature("World", [WORLD])]}))
            result = generate_regions("clima-chuva", root, geo, True, native, manifest_file)
            self.assertEqual(result["regions"]["country:World"]["values"][0], [1, 1, .05, 1])
            self.assertEqual(result["analysisSource"]["width"], 2048)
            with self.assertRaisesRegex(ValueError, "native analysis"):
                generate_regions("clima-chuva", root, geo)
            Image.new("RGB", (2048, 1024), (0, 190, 0)).save(image)
            with self.assertRaisesRegex(ValueError, "hash"):
                generate_regions("clima-chuva", root, geo, True, native, manifest_file)
