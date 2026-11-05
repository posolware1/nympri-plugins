#!/usr/bin/env python3
"""Install NymPri NP_* plugins into a game www folder.

Usage:
  python install.py "C:\\Games\\NymPri\\www"
  python install.py /path/to/game/www

Copies every plugins/NP_*/NP_*.js into www/js/plugins/,
copies plugins/*/assets/* into www/ (img/, movies/, …),
and patches www/js/plugins.js:
  - NP_Language immediately after MEO_Util_Node
  - remaining NP_* from install/plugins_order.json appended (OptionsCategories last)

Idempotent. Creates plugins.js.bak once.
"""
from __future__ import annotations
import argparse, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORDER_PATH = ROOT / "install" / "plugins_order.json"
PLUGINS_DIR = ROOT / "plugins"

ENTRY = re.compile(
    r'\{\s*"name"\s*:\s*"(?P<name>[^"]+)"\s*,\s*"status"\s*:\s*(?:true|false)\s*,\s*'
    r'"description"\s*:\s*"(?:\\.|[^"\\])*"\s*,\s*"parameters"\s*:\s*\{.*?\}\s*\}',
    re.S,
)

def entries(text: str):
    return list(ENTRY.finditer(text))

def fmt_entry(name: str, meta: dict) -> str:
    return json.dumps(
        {"name": name, "status": True, "description": meta["description"], "parameters": meta.get("parameters") or {}},
        ensure_ascii=False, separators=(",", ":"),
    )

def copy_js(www: Path) -> list[str]:
    dest = www / "js" / "plugins"
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    for folder in sorted(PLUGINS_DIR.glob("NP_*")):
        js = folder / f"{folder.name}.js"
        if not js.is_file():
            print("WARN: missing", js)
            continue
        shutil.copy2(js, dest / js.name)
        copied.append(js.name)
    return copied

def copy_assets(www: Path) -> int:
    n = 0
    for assets in PLUGINS_DIR.glob("*/assets"):
        for src in assets.rglob("*"):
            if not src.is_file():
                continue
            rel = src.relative_to(assets)
            dst = www / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            n += 1
    return n

def patch_plugins_js(plugins_js: Path, meta: dict) -> None:
    order = meta["load_order"]
    infos = meta["entries"]
    t = plugins_js.read_text(encoding="utf-8")
    ms = entries(t)
    names = [m.group("name") for m in ms]
    if "MEO_Util_Node" not in names:
        sys.exit("ERROR: MEO_Util_Node not found in plugins.js — is this NymPri 0.80j www?")

    changed = False

    # 1) NP_Language after MEO_Util_Node
    if "NP_Language" not in names:
        m = next(x for x in ms if x.group("name") == "MEO_Util_Node")
        i = m.end()
        while i < len(t) and t[i] in " \t\r\n":
            i += 1
        if i < len(t) and t[i] == ",":
            i += 1
        line = fmt_entry("NP_Language", infos["NP_Language"])
        t = t[:i] + "\n" + line + "," + t[i:]
        print("Inserted NP_Language after MEO_Util_Node")
        changed = True
        ms = entries(t)
        names = [m.group("name") for m in ms]
    else:
        print("NP_Language already present — skip")

    # 2) append the rest in order (skip Language; keep OptionsCategories last via order file)
    for name in order:
        if name == "NP_Language":
            continue
        if name in names:
            print(f"{name} already present — skip")
            continue
        if name not in infos:
            print("WARN: no metadata for", name)
            continue
        ms = entries(t)
        last = ms[-1]
        after = t[last.end():]
        after2 = re.sub(r"^\s*,", "", after, count=1)
        m2 = re.match(r"\s*\]", after2)
        if not m2:
            sys.exit("ERROR: cannot find ] after last plugin")
        line = fmt_entry(name, infos[name])
        t = t[: last.end()] + ",\n" + line + after2[m2.start() :]
        print("Appended", name)
        changed = True
        names.append(name)

    if not changed:
        print("plugins.js: nothing to do")
        return
    bak = plugins_js.with_suffix(plugins_js.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(plugins_js, bak)
        print("Backup:", bak)
    plugins_js.write_text(t, encoding="utf-8")
    print("Wrote", plugins_js)

def main():
    ap = argparse.ArgumentParser(description="Install NymPri NP_* plugins into a game www folder")
    ap.add_argument("www", help="Path to the game www folder")
    ap.add_argument("--skip-assets", action="store_true", help="Do not copy plugins/*/assets")
    args = ap.parse_args()
    www = Path(args.www).expanduser().resolve()
    if not www.is_dir():
        sys.exit(f"ERROR: not a folder: {www}")
    if not (www / "js" / "plugins.js").is_file():
        sys.exit(f"ERROR: missing {www / 'js' / 'plugins.js'}")
    if not ORDER_PATH.is_file():
        sys.exit(f"ERROR: missing {ORDER_PATH}")
    meta = json.loads(ORDER_PATH.read_text(encoding="utf-8"))

    copied = copy_js(www)
    print(f"Copied {len(copied)} plugin .js files → {www / 'js' / 'plugins'}")
    if not args.skip_assets:
        n = copy_assets(www)
        print(f"Copied {n} asset files into {www}")
    patch_plugins_js(www / "js" / "plugins.js", meta)
    print("Done. Launch the game.")

if __name__ == "__main__":
    main()
