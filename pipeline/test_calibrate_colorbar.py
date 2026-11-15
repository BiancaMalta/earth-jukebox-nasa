import unittest

from PIL import Image

from calibrate_colorbar import PROFILES, _calibrate, _value_at_x


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

    def test_ozone_profile_calibrates_its_ppbv_colorbar_range(self):
        profile = PROFILES[5152]
        plain = Image.new("RGB", (528, 125))
        for x in range(profile["bar_x_min"], profile["bar_x_max"] + 1):
            position = (x - profile["bar_x_min"]) / (
                profile["bar_x_max"] - profile["bar_x_min"]
            )
            plain.putpixel((x, profile["bar_y"]), (round(position * 255), 20, 200))

        colorbar = _calibrate(plain, plain.copy(), profile)

        self.assertEqual((colorbar["vmin"], colorbar["vmax"]), (5.0, 60.0))
        self.assertEqual(colorbar["unit"], "ppbv")
        self.assertEqual(len(colorbar["samples"]), 256)
        self.assertEqual(colorbar["pixelFilter"], profile["pixel_filter"])

    def test_pm25_profile_calibrates_logarithmic_microgram_scale(self):
        profile = PROFILES[5151]
        plain = Image.new("RGB", (528, 125))
        for x in range(profile["bar_x_min"], profile["bar_x_max"] + 1):
            plain.putpixel((x, profile["bar_y"]), (x % 256, (x * 3) % 256, (x * 7) % 256))

        colorbar = _calibrate(plain, plain.copy(), profile)

        self.assertEqual((colorbar["vmin"], colorbar["vmax"]), (0.4, 409.6))
        self.assertEqual(colorbar["unit"], "µg/m³")
        self.assertEqual(colorbar["scale"], "log")
        self.assertAlmostEqual(_value_at_x(73, profile), 0.4)
        self.assertAlmostEqual(_value_at_x(463, profile), 409.6)

    def test_carbon_monoxide_profile_uses_published_colorbar_ticks(self):
        profile = PROFILES[5153]
        plain = Image.new("RGB", (528, 125))
        for x in range(profile["bar_x_min"], profile["bar_x_max"] + 1):
            plain.putpixel((x, profile["bar_y"]), (x % 256, (x * 3) % 256, (x * 7) % 256))

        colorbar = _calibrate(plain, plain.copy(), profile)

        self.assertEqual((colorbar["vmin"], colorbar["vmax"]), (40.0, 500.0))
        self.assertEqual(colorbar["unit"], "ppbv")
        self.assertEqual(colorbar["scale"], "linear")
        self.assertEqual(colorbar["pixelFilter"], profile["pixel_filter"])
        for x, value in profile["value_anchors"]:
            self.assertAlmostEqual(_value_at_x(x, profile), value)


if __name__ == "__main__":
    unittest.main()
