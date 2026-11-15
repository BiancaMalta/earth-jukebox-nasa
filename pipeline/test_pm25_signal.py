# AI-assisted: OpenAI Codex
import unittest
import numpy as np
from features import visible_pm25_signal


class Pm25SignalTests(unittest.TestCase):
    def test_extreme_pixel_does_not_reverse_widespread_signal(self):
        # One falsely dark map pixel can overturn a concentration mean.
        low = np.array([.8] * 99 + [409.6])
        high = np.full(100, 3.)
        self.assertGreater(np.mean(low), np.mean(high))
        self.assertLess(visible_pm25_signal(low, np.ones(100), .4, 409.6),
                        visible_pm25_signal(high, np.ones(100), .4, 409.6))

    def test_uses_log_positions_before_aggregation_and_area_extent(self):
        values = np.array([.4, 409.6, np.nan])
        # Positions are 0, 1, unknown; all analyzed weights stay in denominator.
        self.assertEqual(visible_pm25_signal(values, np.array([1., 2., 5.]), .4, 409.6), .25)
        self.assertEqual(visible_pm25_signal(np.array([12.8]), np.ones(1), .4, 409.6), .5)
        self.assertEqual(visible_pm25_signal(np.array([.4]), np.ones(1), .4, 409.6), 0)

    def test_missing_stays_unavailable_and_invalid_scales_fail(self):
        self.assertIsNone(visible_pm25_signal(np.array([np.nan]), np.ones(1), .4, 409.6))
        for values, weights, lo, hi in [(np.array([0.]), np.ones(1), .4, 409.6),
                                         (np.ones(1), np.zeros(1), .4, 409.6),
                                         (np.ones(1), np.ones(1), 0, 409.6)]:
            with self.assertRaises(ValueError):
                visible_pm25_signal(values, weights, lo, hi)


if __name__ == "__main__":
    unittest.main()
