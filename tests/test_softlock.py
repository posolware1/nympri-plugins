"""Softlock repairs. No game data is loaded."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SoftlockTests(unittest.TestCase):
    def test_repairs(self):
        script = ROOT / "tests" / "softlock_check.js"
        result = subprocess.run(
            ["node", str(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("softlock checks ok", result.stdout)
