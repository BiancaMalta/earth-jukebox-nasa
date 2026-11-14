import unittest

from PIL import Image

from calibrate_colorbar import _calibrate


class CalibrateColorbarTests(unittest.TestCase):
    def test_pixel_filter_is_preserved_without_visible_value_limits(self):
        profile = {
            "bar_x_min": 0,
            "bar_x_max": 10,
            "sample_x_min": 0,
            "bar_y": 0,
            "value_min": 0.0,
            "value_max": 10.0,
            "unit": "mm",
            "source": "test colorbar",
            "reference_pixels": ((2, 2.0), (5, 5.0), (8, 8.0)),
            "pixel_filter": {
                "minSaturation": 40,
                "maxColorDistance": 30,
            },
        }
        plain = Image.new("RGB", (11, 1))
        for x in range(11):
            plain.putpixel((x, 0), (x * 10, 0, 0))

        colorbar = _calibrate(plain, plain.copy(), profile)

        self.assertEqual(colorbar["pixelFilter"], profile["pixel_filter"])
        self.assertNotIn("visibleMin", colorbar)


if __name__ == "__main__":
    unittest.main()
