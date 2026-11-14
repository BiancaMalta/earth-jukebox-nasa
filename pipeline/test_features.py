# AI-assisted: Copilot
import unittest

import numpy as np
from PIL import Image, ImageDraw

from features import (
    EXCLUDED_RECTANGLES,
    _valid_palette_colors,
    _values_for_unique_colors,
    analysis_pixels,
    frame_date,
)


class FeaturesTests(unittest.TestCase):
    def test_overlay_contents_do_not_change_analysis_pixels(self):
        image = Image.new("RGB", (1024, 512), (20, 80, 140))
        changed_overlays = image.copy()
        draw = ImageDraw.Draw(changed_overlays)
        for left, top, right, bottom in EXCLUDED_RECTANGLES:
            draw.rectangle((left, top, right - 1, bottom - 1), fill=(255, 0, 255))

        np.testing.assert_array_equal(
            analysis_pixels(image),
            analysis_pixels(changed_overlays),
        )

    def test_color_matching_handles_full_rgb_distance(self):
        mapped, distances = _values_for_unique_colors(
            np.asarray([[255, 255, 255], [0, 0, 0]], dtype=np.uint8),
            np.asarray([[0, 0, 0], [255, 255, 255]], dtype=np.int32),
            np.asarray([-40.0, 40.0]),
            {},
        )

        np.testing.assert_array_equal(mapped, [40.0, -40.0])
        np.testing.assert_array_equal(distances, [0.0, 0.0])

    def test_wind_filter_ignores_background_and_unrecoverable_values(self):
        colors = np.asarray([
            [100, 100, 100],
            [20, 80, 200],
            [228, 209, 227],
        ])
        values = np.asarray([38.0, 10.0, 3.5])
        distances = np.asarray([0.0, 5.0, 5.0])

        valid = _valid_palette_colors(
            colors,
            values,
            distances,
            {
                "minSaturation": 40,
                "maxColorDistance": 30,
                "maxValue": 34.5,
            },
        )

        np.testing.assert_array_equal(valid, [False, True, False])

    def test_dates_follow_source_timeline_across_daylight_saving(self):
        self.assertEqual(frame_date(0), "2026-10-30T06:00")
        self.assertEqual(frame_date(15), "2026-11-01T02:00")
        self.assertEqual(frame_date(123), "2026-11-14T14:00")


if __name__ == "__main__":
    unittest.main()
