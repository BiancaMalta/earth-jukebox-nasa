# AI-assisted: OpenAI Codex
import unittest
import numpy as np
from features import visible_wind_signal
from evaluate_wind_signal import ranks, spearman, direction_agreement


class WindSignalTests(unittest.TestCase):
    def test_visible_extent_changes_the_index_even_when_conditional_mean_is_constant(self):
        sparse = visible_wind_signal(np.array([8., np.nan, np.nan, np.nan]), np.ones(4), 0, 40)
        broad = visible_wind_signal(np.array([8., 8., 8., 8.]), np.ones(4), 0, 40)
        self.assertAlmostEqual(sparse, .05)
        self.assertAlmostEqual(broad, .2)
        # A few strong patches must not automatically outrank widespread wind.
        stronger_patch = visible_wind_signal(np.array([20., np.nan, np.nan, np.nan]), np.ones(4), 0, 40)
        self.assertLess(stronger_patch, visible_wind_signal(np.full(4, 6.), np.ones(4), 0, 40))

    def test_unknown_is_not_zero_wind_and_weights_are_shared(self):
        self.assertIsNone(visible_wind_signal(np.array([np.nan]), np.array([1.]), 0, 40))
        self.assertEqual(visible_wind_signal(np.array([0.]), np.array([1.]), 0, 40), 0)
        self.assertAlmostEqual(visible_wind_signal(np.array([20., np.nan]), np.array([1., 3.]), 0, 40), .125)
        with self.assertRaises(ValueError):
            visible_wind_signal(np.array([1.]), np.array([0.]), 0, 40)

    def test_rank_evaluation_handles_ties_and_constant_series(self):
        np.testing.assert_array_equal(ranks([20, 10, 10]), [2, .5, .5])
        self.assertAlmostEqual(spearman([1, 2, 3], [30, 20, 10]), -1)
        self.assertIsNone(spearman([1, 1], [2, 3]))

    def test_direction_evaluation_excludes_small_reference_changes(self):
        samples = [{'rows': [{'country': 'A', 'reference': 1., 'conditional_mean': 2., 'visual_signal': .1}]},
                   {'rows': [{'country': 'A', 'reference': 2., 'conditional_mean': 1., 'visual_signal': .2}]}]
        result = direction_agreement(samples, .5)
        self.assertEqual(result['visual_signal'], {'same_direction': 1, 'pairs': 1})
        self.assertEqual(result['conditional_mean'], {'same_direction': 0, 'pairs': 1})
        self.assertEqual(direction_agreement(samples, 1)['visual_signal']['pairs'], 0)
