"""Runtime rules for the Yarizo port meeting. No game data is loaded."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class YarizoPortTests(unittest.TestCase):
    def test_port_page_rules(self):
        script = ROOT / "tests" / "yarizo_port_check.js"
        result = subprocess.run(
            ["node", str(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("yarizo port checks ok", result.stdout)
