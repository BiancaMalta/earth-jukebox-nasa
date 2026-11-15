# AI-assisted: OpenAI Codex
"""Checks that an archive cannot silently pair values with the wrong grid."""
import unittest

import numpy as np

from fetch_pollutant_reference import VARIABLES, parse_ascii


class PollutantReferenceTests(unittest.TestCase):
    def response(self):
        parts = []
        for variable in VARIABLES:
            parts.append(f"{variable}, [1][1][145][288]")
            for row in range(145):
                parts.append(f"[0][0][{row}], " + ", ".join(str(row * 288 + x) for x in range(288)))
        for name, start, count in [("lat", -90, 145), ("lon", -180, 288)]:
            parts.append(f"{name}, [{count}]\n" + ", ".join(str(start + x * 1.25) for x in range(count)))
        return "\n".join(parts)

    def test_preserves_row_order_and_coordinates(self):
        result = parse_ascii(self.response())
        self.assertEqual(result["co"][144, 287], 145 * 288 - 1)
        np.testing.assert_array_equal(result["lat"], np.arange(145) * 1.25 - 90)

    def test_rejects_missing_variable(self):
        with self.assertRaises(ValueError):
            parse_ascii(self.response().replace("o3, [1]", "unknown, [1]"))

    def test_rejects_changed_coordinates(self):
        with self.assertRaises(ValueError):
            parse_ascii(self.response().replace("lon, [288]\n-180.0", "lon, [288]\n-179.0"))

    def test_accepts_explicit_pm25_only_subset(self):
        response = self.response()
        subset = response[response.index("pm25_rh35,"):]
        arrays = parse_ascii(subset, {"pm25_rh35": "µg/m³"})
        self.assertEqual(set(arrays), {"pm25_rh35", "lat", "lon"})
        self.assertEqual(arrays["pm25_rh35"].shape, (145, 288))


if __name__ == "__main__":
    unittest.main()
