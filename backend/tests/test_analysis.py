import unittest

from app.analysis import analyze_content


class AnalysisTests(unittest.TestCase):
    def setUp(self):
        self.rules = [
            {"id": 1, "type": "banned", "term": "cheap", "description": "Do not say cheap.", "replacement": "affordable", "severity": "High"},
            {"id": 2, "type": "preferred", "term": "client", "description": 'Prefer "customer".', "replacement": "customer", "severity": "Low"},
            {"id": 3, "type": "claim", "term": "number one", "description": "Claims must be supported.", "replacement": "Substantiate.", "severity": "High"},
            {"id": 4, "type": "required", "term": "NovaTech", "description": "Include brand name.", "replacement": "Add it.", "severity": "Medium"},
        ]

    def test_findings_are_rule_driven_and_have_positions(self):
        result = analyze_content("A cheap client says we are number one.", self.rules)
        self.assertEqual([issue["category"] for issue in result["issues"]], [
            "Banned language", "Preferred terminology", "Promotional claim",
        ])
        for issue in result["issues"]:
            self.assertEqual(
                "A cheap client says we are number one."[issue["start"]:issue["end"]],
                issue["matched_text"],
            )
        self.assertEqual(result["score"], 66)

    def test_missing_required_phrase_has_no_character_range(self):
        result = analyze_content("A clear product description.", self.rules)
        required = next(issue for issue in result["issues"] if issue["category"] == "Required phrase")
        self.assertIsNone(required["start"])
        self.assertEqual(required["matched_text"], None)

    def test_clean_text_scores_one_hundred(self):
        result = analyze_content("NovaTech helps every customer.", self.rules)
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["issues"], [])


if __name__ == "__main__":
    unittest.main()
