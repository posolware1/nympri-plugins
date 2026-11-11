"""Every plugins/NP_* folder is registered in the places a new plugin must touch."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAME = re.compile(r"(?<![A-Za-z0-9_])(NP_[A-Za-z0-9]+)(?![A-Za-z0-9_])")


def plugin_folders():
    return sorted(
        path.name
        for path in (ROOT / "plugins").iterdir()
        if path.is_dir() and path.name.startswith("NP_") and (path / f"{path.name}.js").is_file()
    )


def words(text):
    return set(NAME.findall(text))


class PluginIndexTests(unittest.TestCase):
    def test_every_plugin_is_registered(self):
        names = plugin_folders()
        self.assertGreater(len(names), 0)
        for name in names:
            folder = ROOT / "plugins" / name
            self.assertTrue((folder / "README.md").is_file(), name)
            self.assertTrue((folder / "README.ru.md").is_file(), name)
            self.assertGreater((folder / "README.md").stat().st_size, 0, name)
            self.assertGreater((folder / "README.ru.md").stat().st_size, 0, name)

        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        readme_ru = (ROOT / "README.ru.md").read_text(encoding="utf-8")
        order = json.loads((ROOT / "install" / "plugins_order.json").read_text(encoding="utf-8"))
        order_txt = (ROOT / "install" / "plugins_order.txt").read_text(encoding="utf-8")
        paste = (ROOT / "manual" / "paste-at-end.txt").read_text(encoding="utf-8-sig")
        paste += (ROOT / "manual" / "paste-after-MEO_Util_Node.txt").read_text(encoding="utf-8-sig")
        inventory = (ROOT / "INVENTORY.md").read_text(encoding="utf-8")
        options = (ROOT / "plugins" / "NP_OptionsCategories" / "NP_OptionsCategories.js").read_text(encoding="utf-8")

        listed = set(order["load_order"])
        entered = set(order["entries"])
        categorized = {name for cat in order["categories"] for name in cat["plugins"]}
        index_body = re.search(r"C\.PLUGIN_INDEX\s*=\s*\{([^}]+)\}", options, re.S)
        self.assertIsNotNone(index_body, "NP_OptionsCategories.PLUGIN_INDEX is missing")
        index = dict(re.findall(r"(NP_[A-Za-z0-9]+)\s*:\s*(?:'([^']*)'|null)", index_body.group(1)))
        map_body = re.search(r"C\.MAP\s*=\s*\{([^}]+)\}", options, re.S)
        self.assertIsNotNone(map_body)
        mapped = set(re.findall(r"\b([A-Za-z][A-Za-z0-9_]*)\s*:", map_body.group(1)))

        missing = []
        for name in names:
            if name not in words(readme):
                missing.append(f"{name} missing from README.md")
            if name not in words(readme_ru):
                missing.append(f"{name} missing from README.ru.md")
            if name not in listed:
                missing.append(f"{name} missing from install/plugins_order.json load_order")
            if name not in entered:
                missing.append(f"{name} missing from install/plugins_order.json entries")
            if name not in categorized:
                missing.append(f"{name} missing from install/plugins_order.json categories")
            if name not in words(order_txt):
                missing.append(f"{name} missing from install/plugins_order.txt")
            if name not in paste:
                missing.append(f"{name} missing from the manual paste files")
            if name not in words(inventory):
                missing.append(f"{name} missing from INVENTORY.md")
            if name not in index:
                missing.append(f"{name} missing from NP_OptionsCategories PLUGIN_INDEX")
            elif index[name] and index[name] not in mapped:
                missing.append(f"{name} options symbol {index[name]} is not in NP_OptionsCategories MAP")
        self.assertEqual(missing, [])
        extra = sorted(set(index) - set(names))
        self.assertEqual(extra, [], "PLUGIN_INDEX names a folder that does not exist")
