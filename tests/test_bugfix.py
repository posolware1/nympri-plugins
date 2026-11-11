"""Original bug patches. No game data is loaded."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class OriginalBugFixTests(unittest.TestCase):
    def test_patches(self):
        script = ROOT / "tests" / "bugfix_check.js"
        result = subprocess.run(
            ["node", str(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("bugfix checks ok", result.stdout)
