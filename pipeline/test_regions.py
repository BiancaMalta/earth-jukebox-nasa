# AI-assisted: OpenAI Codex
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

from features import AREA_STATISTICS, area_weights, analysis_mask, generate_features, summarize_values
from regions import generate_regions, region_mask


def feature(name, rings, continent="Test"):
    return {"type": "Feature", "properties": {"NAME_EN": name, "CONTINENT": continent},
            "geometry": {"type": "Polygon", "coordinates": rings}}


WORLD = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]


class RegionTests(unittest.TestCase):
    def test_area_weights_are_positive_symmetric_and_smaller_near_poles(self):
        weights = area_weights(4, 6)
        self.assertEqual(weights.shape, (6, 4))
        self.assertTrue(np.all(weights > 0))
        np.testing.assert_allclose(weights, weights[::-1])
        self.assertGreater(weights[2, 0], weights[0, 0])

    def test_weighted_mean_uses_accepted_area_but_coverage_and_p90_remain_pixel_statistics(self):
        stats = summarize_values(np.array([0., 10., np.nan]), 0, 10, np.array([1., 3., 100.]))
        self.assertEqual(stats, {"mean": 7.5, "norm": .75, "p90": 9., "coverage": .666667})
        for weights in [np.array([0., 1.]), np.array([-1., 1.]), np.array([np.nan, 1.]), np.array([1.])]:
            with self.assertRaises(ValueError):
                summarize_values(np.array([0., 10.]), 0, 10, weights)

    def test_missing_pixels_are_not_measured_zero(self):
        self.assertEqual(summarize_values(np.array([np.nan]), 0, 20),
                         {"mean": None, "p90": None, "norm": None, "coverage": 0.0})
        self.assertEqual(summarize_values(np.array([0., np.nan]), 0, 20),
                         {"mean": 0., "p90": 0., "norm": 0., "coverage": .5})

    def test_small_positive_inclusion_is_not_rounded_to_absence(self):
        values = np.full(10000, np.nan)
        values[0] = 4.73
        stats = summarize_values(values, 0, 40)
        self.assertEqual(stats["coverage"], .0001)
        self.assertEqual(stats["mean"], 4.73)
        self.assertIsNotNone(stats["norm"])

    def test_logarithmic_normalization_uses_the_supplied_physical_scale(self):
        result = summarize_values(np.array([6.4]), 0.4, 409.6, scale="log")
        self.assertEqual(result["norm"], 0.4)

    def test_world_mask_matches_full_frame_and_retains_antimeridian_edges(self):
        np.testing.assert_array_equal(region_mask([feature("World", [WORLD])], 360, 180), analysis_mask(360, 180))
        mask = region_mask([feature("World", [WORLD])], 360, 180)
        self.assertTrue(mask[90, 0] and mask[90, -1])

    def test_polygon_holes_and_union_do_not_erase_other_regions(self):
        hole = [[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]]
        mask = region_mask([feature("Hole", [WORLD, hole])], 360, 180)
        self.assertFalse(mask[90, 180])
        filled = region_mask([feature("Hole", [WORLD, hole]), feature("Island", [hole])], 360, 180)
        np.testing.assert_array_equal(filled, analysis_mask(360, 180))

    def test_global_regional_parity_dates_and_stale_source_detection(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); directory = root / "test"; frames = directory / "frames"; frames.mkdir(parents=True)
            colors = np.zeros((180, 360, 3), dtype=np.uint8)
            colors[:, :180] = (20, 80, 200); colors[:, 180:] = (255, 50, 20)
            for i in [1, 2]:
                Image.fromarray(colors).save(frames / f"frame_{i:06d}.webp", lossless=True)
            colorbar = {"unit": "m/s", "vmin": 0, "vmax": 20, "samples": [
                {"rgb": [20, 80, 200], "value": 0}, {"rgb": [255, 50, 20], "value": 20}]}
            calibration = directory / "colorbar.json"; calibration.write_text(json.dumps(colorbar))
            source = generate_features(frames, calibration, "test", 5148)
            # Preserve the producer's date string, including explicit timezone.
            source["frames"][0]["date"] = "2026-10-30T06:00-04:00"
            target = directory / "features.json"; target.write_text(json.dumps(source))
            tiny = [[0.01, 0.01], [0.02, 0.01], [0.02, 0.02], [0.01, 0.02], [0.01, 0.01]]
            geo = root / "world.json"; geo.write_text(json.dumps({"features": [feature("World", [WORLD]), feature("Tiny", [tiny])]}))
            result = generate_regions("test", root, geo)
            self.assertEqual(result["frames"], source["frames"])
            self.assertEqual(result["statistics"], AREA_STATISTICS)
            self.assertEqual(result["schemaVersion"], 2)
            for i, row in enumerate(result["regions"]["country:World"]["values"]):
                self.assertEqual(row[:3], [source["frames"][i][key] for key in ["mean", "p90", "norm"]])
                self.assertEqual(row[3], 1)
            self.assertEqual(result["regions"]["country:Tiny"]["values"][0], [None, None, None, 0])
            source["frames"][0]["mean"] += 1; target.write_text(json.dumps(source))
            with self.assertRaisesRegex(ValueError, "stale mean"):
                generate_regions("test", root, geo)


if __name__ == "__main__":
    unittest.main()
