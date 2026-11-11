"""Story-hint selection. No game data is loaded."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class StoryHintTests(unittest.TestCase):
    def test_hint_selection(self):
        script = ROOT / "tests" / "story_hint_check.js"
        result = subprocess.run(
            ["node", str(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("story hint checks ok", result.stdout)
