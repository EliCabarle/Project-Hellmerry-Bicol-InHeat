"""Self-checks for the POWER -> trend -> static-JSON pipeline. No network.

python -m unittest test_pipeline -v
"""

import json
import unittest

import pandas as pd

from calculate_trends import annual_means, trend_for
from calculate_drivers import build as build_drivers
from fetch_power_data import heat_index_c, rh_from_dewpoint
from generate_static_json import _danger_summary, build, danger_band, render_narration
from push_to_supabase import build_record
from validate_pagasa import compare, metrics


def _daily(rows: list[tuple[str, str, str, float]]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "name": name,
                "province": province,
                "lat": 13.1391,
                "lon": 123.7438,
                "date": date,
                "heat_index_max_c": hi,
            }
            for name, province, date, hi in rows
        ]
    )


class HeatIndexTest(unittest.TestCase):
    def test_matches_nws_chart(self):
        # (T in F, RH %, NWS heat index in F) - tolerance covers the chart's rounding
        for t_f, rh, expected_f in [
            (90, 70, 106),
            (100, 40, 109),
            (80, 40, 80),
            (85, 90, 102),
            (95, 55, 109),
        ]:
            with self.subTest(t=t_f, rh=rh):
                celsius = heat_index_c((t_f - 32) * 5 / 9, rh)
                self.assertAlmostEqual(celsius * 9 / 5 + 32, expected_f, delta=1.0)

    def test_heat_index_is_hotter_than_air_when_humid(self):
        self.assertGreater(heat_index_c(33.0, 75), 33.0)

    def test_missing_inputs_return_none(self):
        self.assertIsNone(heat_index_c(float("nan"), 70))
        self.assertIsNone(heat_index_c(30.0, None))

    def test_peak_index_exceeds_mean_index(self):
        # T2M_MAX is the afternoon peak, T2M the daily mean: same RH, hotter felt
        self.assertGreater(heat_index_c(33.5, 75), heat_index_c(29.4, 75))

    def test_rh_from_dewpoint(self):
        # 30 C air with a 25 C dew point is about 74 % RH
        self.assertAlmostEqual(rh_from_dewpoint(30.0, 25.0), 74.5, delta=1.0)
        self.assertAlmostEqual(rh_from_dewpoint(30.0, 30.0), 100.0, delta=0.1)
        self.assertIsNone(rh_from_dewpoint(30.0, None))

    def test_peak_rh_is_below_daily_mean_rh(self):
        # vapour is fixed by dew point: RH is lower at the warmest hour
        rh_at_peak = rh_from_dewpoint(33.0, 24.0)
        self.assertLess(rh_at_peak, rh_from_dewpoint(27.0, 24.0))


class TrendTest(unittest.TestCase):
    def test_annual_means_keeps_sample_counts(self):
        frame = _daily(
            [
                ("Legazpi", "Albay", "2000-03-01", 30.0),
                ("Legazpi", "Albay", "2000-03-02", 34.0),
                ("Legazpi", "Albay", "2001-03-01", 36.0),
            ]
        )
        annual = annual_means(frame)
        self.assertEqual(len(annual), 2)
        first = annual[annual["year"] == 2000].iloc[0]
        self.assertAlmostEqual(first["mean_heat_index_c"], 32.0)
        self.assertEqual(first["n_days"], 2)

    def test_annual_means_drops_missing_heat_index(self):
        frame = _daily(
            [
                ("Legazpi", "Albay", "2000-03-01", 30.0),
                ("Legazpi", "Albay", "2000-03-02", float("nan")),
            ]
        )
        self.assertEqual(annual_means(frame)["n_days"].sum(), 1)

    def test_danger_days_count_the_42c_threshold_inclusively(self):
        frame = _daily(
            [
                ("Legazpi", "Albay", "2000-05-01", 41.99),
                ("Legazpi", "Albay", "2000-05-02", 42.0),
                ("Legazpi", "Albay", "2000-05-03", 45.0),
                ("Legazpi", "Albay", "2001-05-01", 30.0),
            ]
        )
        annual = annual_means(frame)
        self.assertEqual(annual[annual["year"] == 2000].iloc[0]["danger_days"], 2)
        self.assertEqual(annual[annual["year"] == 2001].iloc[0]["danger_days"], 0)

    def test_warming_series_is_significant_and_positive(self):
        frame = _daily(
            [
                ("Legazpi", "Albay", f"{y}-03-01", 30.0 + (y - 1981) * 0.05)
                for y in range(1981, 2026)
            ]
        )
        row = trend_for(annual_means(frame))
        self.assertAlmostEqual(row["slope_c_per_year"], 0.05, places=3)
        self.assertTrue(row["is_significant"])
        self.assertEqual(row["trend_direction"], "increasing")
        self.assertEqual(row["sample"]["n_years"], 45)

    def test_non_significant_trend_is_still_reported(self):
        flat = [30.0, 29.5, 30.4, 29.9, 30.2, 29.7, 30.3, 30.0]
        frame = _daily(
            [
                ("Naga", "Camarines Sur", f"{1981 + i}-03-01", hi)
                for i, hi in enumerate(flat)
            ]
        )
        row = trend_for(annual_means(frame))
        self.assertFalse(row["is_significant"])  # flag, not a filter
        self.assertIsNotNone(row["p_value"])
        self.assertIsNotNone(row["slope_c_per_year"])

    def test_too_few_years_still_emits_a_row(self):
        frame = _daily(
            [
                ("Virac", "Catanduanes", "2000-03-01", 30.0),
                ("Virac", "Catanduanes", "2001-03-01", 31.0),
            ]
        )
        row = trend_for(annual_means(frame))
        self.assertIsNone(row["slope_c_per_year"])
        self.assertFalse(row["is_significant"])
        self.assertIn("note", row)


class NarrationTest(unittest.TestCase):
    def _row(
        self, slope: float, p: float, significant: bool, danger_days: int = 9
    ) -> dict:
        return {
            "name": "Legazpi",
            "slope_c_per_year": slope,
            "p_value": p,
            "is_significant": significant,
            "sample": {"n_years": 45, "n_days": 16436},
            "series": [
                {
                    "year": 2025,
                    "mean_heat_index_c": 40.2,
                    "danger_days": danger_days,
                    "n_days": 365,
                }
            ],
        }

    def test_numbers_are_carried_into_both_languages(self):
        text = render_narration(self._row(0.0312, 0.0004, True))
        self.assertIn("Legazpi", text["en"])
        self.assertIn("0.031", text["en"])
        self.assertIn("Legazpi", text["fil"])
        self.assertIn("0.031", text["fil"])
        self.assertIn("Extreme Caution", text["en"])  # 40.2 C sits in 33-41.9
        self.assertIn("Labis na Pag-iingat", text["fil"])

    def test_flat_series_never_prints_zero_zero_zero_as_a_trend(self):
        text = render_narration(self._row(0.0001, 0.9, False))
        self.assertIn("essentially unchanged", text["en"])
        self.assertIn("hindi nagbabago", text["fil"])

    def test_danger_days_sentence_names_total_and_peak_year(self):
        text = render_narration(self._row(0.0312, 0.0004, True, danger_days=9))
        self.assertIn("9 days above the 42 °C Danger threshold", text["en"])
        self.assertIn("9 of them in 2025", text["en"])
        self.assertIn("9 araw na lumampas sa 42 °C", text["fil"])
        self.assertIn("noong 2025", text["fil"])

    def test_danger_sentences_name_the_municipality(self):
        text = render_narration(self._row(0.0312, 0.0004, True, danger_days=9))
        self.assertIn("Historically, Legazpi has experienced", text["en"])
        self.assertIn("Sa kasaysayan, ang Legazpi ay nakaranas", text["fil"])
        for sentence in text.values():
            self.assertNotIn("this municipality", sentence)
            self.assertNotIn("munisipalidad na ito", sentence)

    def test_danger_days_sentence_uses_singular_for_one_day(self):
        text = render_narration(self._row(0.0312, 0.0004, True, danger_days=1))
        self.assertIn("1 day above the 42 °C Danger threshold in 2025", text["en"])
        self.assertNotIn("1 days", text["en"])
        self.assertNotIn("thresholdin", text["en"])

    def test_never_exceeded_sentence_replaces_the_null_peak_year(self):
        text = render_narration(self._row(0.0312, 0.0004, True, danger_days=0))
        self.assertIn(
            "Legazpi has never exceeded the 42 °C Danger threshold", text["en"]
        )
        self.assertIn("lumampas ang Legazpi sa", text["fil"])
        self.assertNotIn("None", text["en"])
        self.assertNotIn("None", text["fil"])

    def test_danger_bands_follow_pagasa_thresholds(self):
        self.assertEqual(danger_band(52.0)[0], "Extreme Danger")
        self.assertEqual(danger_band(42.0)[0], "Danger")
        self.assertEqual(danger_band(33.0)[0], "Extreme Caution")
        self.assertEqual(danger_band(27.0)[0], "Caution")
        self.assertIsNone(danger_band(None))

    def test_danger_summary_totals_the_whole_series(self):
        series = [
            {"year": 2014, "danger_days": 1},
            {"year": 2024, "danger_days": 9},
            {"year": 2025, "danger_days": 0},
        ]
        summary = _danger_summary(series)
        self.assertEqual(summary["total_danger_days_45y"], 10)
        self.assertEqual(summary["peak_danger_days"], {"year": 2024, "days": 9})

    def test_danger_summary_breaks_ties_to_the_most_recent_year(self):
        series = [
            {"year": 2019, "danger_days": 3},
            {"year": 2024, "danger_days": 3},
        ]
        self.assertEqual(
            _danger_summary(series)["peak_danger_days"], {"year": 2024, "days": 3}
        )

    def test_danger_summary_never_invents_a_peak_year(self):
        series = [{"year": 2024, "danger_days": 0}, {"year": 2025, "danger_days": 0}]
        summary = _danger_summary(series)
        self.assertEqual(summary["total_danger_days_45y"], 0)
        self.assertEqual(summary["peak_danger_days"], {"year": None, "days": 0})

    def test_static_json_shape(self):
        trends = {
            "variable": "annual mean daily heat index",
            "units": "degrees Celsius",
            "method": "Theil-Sen slope + Mann-Kendall original_test",
            "alpha": 0.05,
            "danger_threshold_c": 42.0,
            "period": {"start": "1981-01-01", "end": "2025-12-31"},
            "municipalities": [
                {
                    "name": "Legazpi",
                    "province": "Albay",
                    "lat": 13.1391,
                    "lon": 123.7438,
                    "slope_c_per_year": 0.0312,
                    "slope_ci95": [0.02, 0.04],
                    "p_value": 0.0004,
                    "is_significant": True,
                    "alpha": 0.05,
                    "trend_direction": "increasing",
                    "sample": {"n_years": 45, "n_days": 16436},
                    "series": [
                        {
                            "year": 2025,
                            "mean_heat_index_c": 40.2,
                            "danger_days": 9,
                            "n_days": 365,
                        }
                    ],
                }
            ],
        }
        result = build(trends)
        municipality = result["municipalities"][0]
        self.assertEqual(municipality["id"], "legazpi-albay")
        self.assertEqual(set(municipality["narration"]), {"en", "fil"})
        self.assertEqual(municipality["latest"]["year"], 2025)
        self.assertEqual(municipality["latest"]["danger_days"], 9)
        self.assertEqual(municipality["total_danger_days_45y"], 9)
        self.assertEqual(municipality["peak_danger_days"], {"year": 2025, "days": 9})
        self.assertEqual(result["meta"]["danger_threshold_c"], 42.0)
        self.assertIn("sources", result["meta"])

    def test_static_json_ids_survive_homonyms_and_unicode(self):
        # Two 'Bato's and a mojibake-prone 'Sagñay': ids must stay distinct and
        # ASCII-safe while every user-facing name keeps its diacritic.
        trends = {
            "variable": "annual mean daily heat index",
            "units": "degrees Celsius",
            "method": "Theil-Sen slope + Mann-Kendall original_test",
            "alpha": 0.05,
            "danger_threshold_c": 42.0,
            "period": {"start": "1981-01-01", "end": "2025-12-31"},
            "municipalities": [
                self._trends_row("Bato", "Camarines Sur"),
                self._trends_row("Bato", "Catanduanes"),
                self._trends_row("San Fernando", "Camarines Sur"),
                self._trends_row("San Fernando", "Masbate"),
                self._trends_row("Sagñay", "Camarines Sur"),
            ],
        }
        result = build(trends)
        entries = result["municipalities"]
        ids = [m["id"] for m in entries]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertIn("bato-camarines-sur", ids)
        self.assertIn("bato-catanduanes", ids)
        self.assertIn("san-fernando-masbate", ids)
        self.assertIn("sagnay-camarines-sur", ids)
        sagnay = next(m for m in entries if m["name"] == "Sagñay")
        self.assertEqual(sagnay["id"], "sagnay-camarines-sur")
        narration_text = json.dumps(result["municipalities"], ensure_ascii=False)
        self.assertIn("Sagñay", narration_text)
        self.assertNotIn("SagÃ±ay", narration_text)

    @staticmethod
    def _trends_row(name: str, province: str) -> dict:
        return {
            "name": name,
            "province": province,
            "lat": 13.1391,
            "lon": 123.7438,
            "slope_c_per_year": 0.0312,
            "slope_ci95": [0.02, 0.04],
            "p_value": 0.0004,
            "is_significant": True,
            "alpha": 0.05,
            "trend_direction": "increasing",
            "sample": {"n_years": 45, "n_days": 16436},
            "series": [
                {
                    "year": 2025,
                    "mean_heat_index_c": 40.2,
                    "danger_days": 9,
                    "n_days": 365,
                }
            ],
        }

    def test_read_csv_requires_utf8(self):
        import inspect

        from calculate_trends import main as trends_main

        source = inspect.getsource(trends_main)
        read_call = next(line for line in source.splitlines() if "read_csv" in line)
        self.assertIn("encoding=", read_call)


class DriverRankingTest(unittest.TestCase):
    def test_ranks_top_three_for_every_municipality(self):
        rows = []
        for i, (name, province) in enumerate(
            [("Alpha", "P1"), ("Beta", "P1"), ("Gamma", "P2")]
        ):
            for day in range(120):
                rows.append(
                    {
                        "name": name,
                        "province": province,
                        "lat": 12.0 + i,
                        "lon": 123.0 + i,
                        "u10m_ms": 1.0 + (day % 7),
                        "v10m_ms": -2.0 + (day % 5),
                        "heat_index_max_c": 30.0 + i + (day % 11) * 0.1,
                    }
                )

        payload = build_drivers(pd.DataFrame(rows))

        self.assertEqual(len(payload["municipalities"]), 3)
        # 360 rows -> 288 train / 72 test; SHAP runs on the whole training split here
        self.assertEqual(payload["model"]["train_rows"], 288)
        self.assertEqual(payload["model"]["test_rows"], 72)
        self.assertEqual(payload["model"]["shap_rows"], 288)
        self.assertIn("r2_test", payload["model"])
        for municipality in payload["municipalities"]:
            self.assertEqual(set(municipality), {"name", "province", "top_drivers"})
            drivers = municipality["top_drivers"]
            self.assertEqual(len(drivers), 3)
            shares = [driver["share"] for driver in drivers]
            self.assertEqual(shares, sorted(shares, reverse=True))
            self.assertTrue(all(driver["label"] for driver in drivers))


class PagasaValidationTest(unittest.TestCase):
    def test_bias_and_rmse_are_power_minus_pagasa(self):
        stats = metrics(pd.Series([2.0, -1.0]))
        self.assertAlmostEqual(stats["bias"], 0.5)
        self.assertAlmostEqual(stats["rmse"], 2.5**0.5)
        self.assertEqual(stats["n"], 2)

    def test_compare_matches_name_and_date_and_flags_missing_days(self):
        readings = pd.DataFrame(
            [
                {"name": "Naga", "date": "2024-05-23", "heat_index_c": 45.0},
                {"name": "Naga", "date": "2024-05-24", "heat_index_c": 40.0},
            ]
        )
        power = pd.DataFrame(
            [
                {
                    "name": "Naga",
                    "province": "Camarines Sur",
                    "date": "2024-05-23",
                    "heat_index_max_c": 43.5,
                }
            ]
        )

        matched, unmatched = compare(readings, power)

        self.assertEqual(len(matched), 1)
        self.assertAlmostEqual(matched["error"].iloc[0], -1.5)
        self.assertEqual(unmatched, ["Naga 2024-05-24"])

    def test_repeated_daily_rows_are_not_mistaken_for_a_name_clash(self):
        readings = pd.DataFrame(
            [{"name": "Daet", "date": "2024-05-23", "heat_index_c": 45.0}]
        )
        power = pd.DataFrame(
            [
                {
                    "name": "Daet",
                    "province": "Camarines Norte",
                    "date": date,
                    "heat_index_max_c": 41.0,
                }
                for date in ("2024-05-22", "2024-05-23", "2024-05-24")
            ]
        )

        matched, unmatched = compare(readings, power)

        self.assertEqual(len(matched), 1)
        self.assertAlmostEqual(matched["error"].iloc[0], -4.0)
        self.assertEqual(unmatched, [])

    def test_city_prefix_matches_a_plain_station_name(self):
        readings = pd.DataFrame(
            [{"name": "Naga", "date": "2024-05-23", "heat_index_c": 45.0}]
        )
        power = pd.DataFrame(
            [
                {
                    "name": "City of Naga",
                    "province": "Camarines Sur",
                    "date": "2024-05-23",
                    "heat_index_max_c": 43.5,
                }
            ]
        )

        matched, unmatched = compare(readings, power)

        self.assertEqual(len(matched), 1)
        self.assertAlmostEqual(matched["error"].iloc[0], -1.5)
        self.assertEqual(unmatched, [])

    def test_ambiguous_municipality_name_is_refused(self):
        readings = pd.DataFrame(
            [{"name": "Bato", "date": "2024-05-23", "heat_index_c": 45.0}]
        )
        power = pd.DataFrame(
            [
                {
                    "name": "Bato",
                    "province": "Camarines Sur",
                    "date": "2024-05-23",
                    "heat_index_max_c": 43.0,
                },
                {
                    "name": "Bato",
                    "province": "Catanduanes",
                    "date": "2024-05-23",
                    "heat_index_max_c": 42.0,
                },
            ]
        )

        with self.assertRaises(SystemExit):
            compare(readings, power)


class SupabaseRecordTest(unittest.TestCase):
    def test_maps_the_real_slope_key_and_attaches_drivers(self):
        city = {
            "name": "Naga",
            "province": "Camarines Sur",
            "lat": 13.6,
            "lon": 123.2,
            "trend": {
                "slope_c_per_year": 0.0313,
                "p_value": 0.0001,
                "is_significant": True,
            },
            "total_danger_days_45y": 10,
            "peak_danger_days": {"year": 2024, "days": 9},
            "narration": {"en": "en text", "fil": "fil text"},
            "series": [],
        }
        drivers = {("Naga", "Camarines Sur"): [{"feature": "lat"}]}

        record = build_record(city, drivers)

        self.assertEqual(record["slope"], 0.0313)
        self.assertEqual(record["top_drivers"], [{"feature": "lat"}])
        self.assertEqual(record["peak_danger_year"], 2024)
        self.assertIsNone(build_record(city, {})["top_drivers"])


if __name__ == "__main__":
    unittest.main()
