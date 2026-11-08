#!/usr/bin/env python3
"""Install NymPri NP_* plugins into a Windows 0.80j www folder.

Usage:
  python install.py "C:\\Games\\NymPri\\www"
  python install.py /path/to/game/www
  python install.py "C:\\Games\\NymPri\\www" --repair-audio

Copies every plugins/NP_*/NP_*.js into www/js/plugins/,
copies plugins/*/assets/** into www/ (pictures, movies, and the three CC0 sounds),
and patches www/js/plugins.js:
  - NP_Language immediately after MEO_Util_Node
  - remaining NP_* from install/plugins_order.json at the end
  - NP_OptionsCategories last
  - no duplicate names for plugins in that order

Idempotent. Creates plugins.js.bak once, before the first change.
Does not require ffmpeg. --repair-audio is optional and separate.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORDER_PATH = ROOT / "install" / "plugins_order.json"
CC0_PATH = ROOT / "install" / "cc0_audio.json"
ALIAS_PATH = ROOT / "install" / "audio_aliases.json"
PLUGINS_DIR = ROOT / "plugins"
NYMPRI_RU = "https://github.com/posolware1/nympri-ru"
EN_FILES = ("lang/en/build_info.json", "lang/en/data_overlay.json")
LOG_NAME = "install-log.txt"
SUCCESS_RU = "Готово. Плагины установлены."
SUCCESS_EN = "Done. Plugins are installed."
FAIL_RU = "Не получилось."
FAIL_EN = "Failed. Open install-log.txt next to install.bat and send that file."

ENTRY = re.compile(
    r'\{\s*"name"\s*:\s*"(?P<name>[^"]+)"\s*,\s*"status"\s*:\s*(?:true|false)\s*,\s*'
    r'"description"\s*:\s*"(?:\\.|[^"\\])*"\s*,\s*"parameters"\s*:\s*\{.*?\}\s*\}',
    re.S,
)


def load_order() -> dict:
    if not ORDER_PATH.is_file():
        raise SystemExit(f"ERROR: missing {ORDER_PATH}")
    return json.loads(ORDER_PATH.read_text(encoding="utf-8"))


def load_cc0() -> dict:
    return json.loads(CC0_PATH.read_text(encoding="utf-8"))


def plugin_js_files() -> list[Path]:
    found = []
    for folder in sorted(PLUGINS_DIR.glob("NP_*")):
        js = folder / f"{folder.name}.js"
        if js.is_file():
            found.append(js)
        else:
            print("WARN: missing", js)
    return found


def asset_files() -> list[tuple[Path, Path]]:
    """Return (source, path relative to that plugin's assets/)."""
    rows = []
    for assets in sorted(PLUGINS_DIR.glob("*/assets")):
        for src in sorted(assets.rglob("*")):
            if src.is_file():
                rows.append((src, src.relative_to(assets)))
    return rows


def copy_js(www: Path) -> list[str]:
    dest = www / "js" / "plugins"
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    for js in plugin_js_files():
        shutil.copy2(js, dest / js.name)
        copied.append(js.name)
    return copied


def copy_assets(www: Path) -> int:
    n = 0
    for src, rel in asset_files():
        dst = www / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        n += 1
    return n


def missing_assets(www: Path) -> list[str]:
    missing = []
    for _src, rel in asset_files():
        if not (www / rel).is_file():
            missing.append(rel.as_posix())
    return missing


def parse_plugins(text: str) -> list[dict]:
    parsed = []
    for match in ENTRY.finditer(text):
        try:
            obj = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise SystemExit(f"ERROR: could not read plugin entry {match.group('name')}: {exc}")
        if "name" not in obj:
            raise SystemExit("ERROR: plugin entry without a name")
        parsed.append(obj)
    return parsed


def plugin_entry(name: str, existing: dict | None, infos: dict) -> dict:
    meta = infos.get(name) or {}
    if existing:
        entry = {
            "name": name,
            "status": bool(existing.get("status", True)),
            "description": existing.get("description") if existing.get("description") not in (None, "") else meta.get("description", ""),
            "parameters": existing.get("parameters") if isinstance(existing.get("parameters"), dict) else {},
        }
        return entry
    return {
        "name": name,
        "status": True,
        "description": meta.get("description", ""),
        "parameters": meta.get("parameters") or {},
    }


def arrange_plugins(parsed: list[dict], order: list[str], infos: dict, managed: set[str]) -> tuple[list[dict], list[str]]:
    """Place managed plugins in load order. Keep every other plugin where it was."""
    managed_order = [name for name in order if name in managed]
    managed_set = set(managed_order)
    base: list[dict] = []
    found: dict[str, dict] = {}
    duplicates: list[str] = []
    for obj in parsed:
        name = obj.get("name")
        if name in managed_set:
            if name in found:
                duplicates.append(name)
                continue
            found[name] = obj
        else:
            base.append(obj)
    out: list[dict] = []
    placed_language = False
    for obj in base:
        out.append(obj)
        if obj.get("name") == "MEO_Util_Node" and "NP_Language" in managed_set:
            out.append(plugin_entry("NP_Language", found.get("NP_Language"), infos))
            placed_language = True
    if "NP_Language" in managed_set and not placed_language:
        raise SystemExit("ERROR: MEO_Util_Node not found in plugins.js — is this NymPri 0.80j www?")
    for name in managed_order:
        if name == "NP_Language":
            continue
        out.append(plugin_entry(name, found.get(name), infos))
    return out, duplicates


def names_of(entries: list[dict]) -> list[str]:
    return [obj.get("name", "") for obj in entries]


def order_errors(names: list[str], order: list[str], managed: set[str]) -> list[str]:
    errors = []
    if names.count("NP_Language") != 1:
        errors.append(f"NP_Language count is {names.count('NP_Language')}, expected 1")
    if "MEO_Util_Node" not in names:
        errors.append("MEO_Util_Node missing")
    elif "NP_Language" in names and names[names.index("MEO_Util_Node") + 1] != "NP_Language":
        errors.append("NP_Language is not immediately after MEO_Util_Node")
    managed_order = [name for name in order if name in managed]
    tail = [name for name in managed_order if name != "NP_Language"]
    if names[-len(tail):] != tail:
        errors.append("NP plugins are not in load order at the end of plugins.js")
    if names and names[-1] != "NP_OptionsCategories":
        errors.append("NP_OptionsCategories is not last")
    for name in managed_order:
        if names.count(name) != 1:
            errors.append(f"duplicate or missing plugin entry: {name}")
    return errors


def replace_plugin_array(text: str, entries: list[dict]) -> str:
    match = re.search(r"var\s+\$plugins\s*=\s*\[", text)
    if not match:
        raise SystemExit("ERROR: plugins.js has no var $plugins = [")
    start = match.end()
    i = start
    depth = 1
    in_str = False
    esc = False
    while i < len(text):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    break
        i += 1
    else:
        raise SystemExit("ERROR: plugins.js array is not closed")
    nl = "\r\n" if "\r\n" in text else "\n"
    body = ("," + nl).join(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")) for obj in entries
    )
    return text[:start] + nl + body + nl + text[i:]


def read_plugins_text(path: Path) -> tuple[str, bool]:
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    return raw.decode("utf-8-sig"), bom


def write_plugins_text(path: Path, text: str, bom: bool) -> None:
    data = text.encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    path.write_bytes(data)


def patch_plugins_js(plugins_js: Path, meta: dict, managed: set[str]) -> list[str]:
    order = meta["load_order"]
    infos = meta["entries"]
    text, bom = read_plugins_text(plugins_js)
    parsed = parse_plugins(text)
    if not any(obj.get("name") == "MEO_Util_Node" for obj in parsed):
        raise SystemExit("ERROR: MEO_Util_Node not found in plugins.js — is this NymPri 0.80j www?")
    arranged, duplicates = arrange_plugins(parsed, order, infos, managed)
    if duplicates:
        print("Removed duplicate plugin entries:", ", ".join(duplicates))
    if names_of(arranged) == names_of(parsed) and not duplicates:
        print("plugins.js: order already correct")
        return names_of(parsed)
    new_text = replace_plugin_array(text, arranged)
    bak = plugins_js.with_suffix(plugins_js.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(plugins_js, bak)
        print("Backup:", bak)
    write_plugins_text(plugins_js, new_text, bom)
    print("Wrote", plugins_js)
    written, _bom = read_plugins_text(plugins_js)
    return names_of(parse_plugins(written))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cc0_errors(www: Path, manifest: dict | None = None) -> list[str]:
    data = manifest if manifest is not None else load_cc0()
    errors = []
    for row in data["files"]:
        path = www / row["www_path"]
        if not path.is_file():
            errors.append(f"missing CC0 file {row['www_path']}")
            continue
        digest = sha256_file(path)
        if digest != row["sha256"] or path.stat().st_size != row["bytes"]:
            errors.append(f"CC0 file changed or incomplete: {row['www_path']}")
    return errors


def companion_warnings(www: Path) -> list[str]:
    warnings = []
    missing = [rel for rel in EN_FILES if not (www / rel).is_file()]
    if missing:
        warnings.append(
            "English text files are not installed (" + ", ".join(missing) + "). "
            "NP_Language keeps Russian until the separate pack is added: " + NYMPRI_RU
        )
    quest = www / "csv" / "QuestList.csv"
    if quest.is_file():
        try:
            text = quest.read_text(encoding="utf-8", errors="replace")
        except OSError:
            text = ""
        if "201090" not in text:
            warnings.append(
                "csv/QuestList.csv has no quest 201090. NP_YarizoQuest adds that one journal row in memory "
                "and does not replace the file. The nympri-ru row is used instead when it is already there."
            )
    else:
        warnings.append("csv/QuestList.csv was not found. NP_YarizoQuest can add its journal row only after the game loads quest data.")
    return warnings


def alias_counts(www: Path) -> tuple[int, int]:
    if not ALIAS_PATH.is_file():
        return 0, 0
    data = json.loads(ALIAS_PATH.read_text(encoding="utf-8"))
    present = missing = 0
    for row in data.get("aliases") or []:
        rel = row.get("target_path") or ""
        if (www / rel).is_file():
            present += 1
        else:
            missing += 1
    return present, missing


def platform_note() -> str | None:
    if os.name == "nt":
        return None
    return (
        "NOTE: This pack is for the Windows 0.80j ZIP install. "
        "The original game refers to some of its own files with mixed case "
        "(TB_NPCstate versus TB_NPCState.js, img/pictures/ui versus UI). "
        "On a case-sensitive disk that stops startup. Those are base-game paths, not missing NP files. "
        "This installer does not add case aliases or original UI assets, and it does not claim Linux support."
    )


def load_alias_tool():
    path = ROOT / "install_audio_aliases.py"
    spec = importlib.util.spec_from_file_location("np_audio_aliases", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"ERROR: cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def log_path() -> Path:
    override = os.environ.get("NP_INSTALL_LOG")
    return Path(override) if override else (ROOT / LOG_NAME)


class _Tee:
    def __init__(self, stream, handle):
        self.stream = stream
        self.handle = handle

    def write(self, data):
        try:
            self.stream.write(data)
        except Exception:
            pass
        try:
            self.handle.write(data)
            self.handle.flush()
        except Exception:
            pass

    def flush(self):
        try:
            self.stream.flush()
        except Exception:
            pass
        try:
            self.handle.flush()
        except Exception:
            pass


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def open_log():
    path = log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    new = (not path.exists()) or path.stat().st_size == 0
    handle = path.open("a", encoding="utf-8", newline="\n")
    if new:
        handle.write("\ufeff")
    handle.write("\n==== " + datetime.now().isoformat(timespec="seconds") + " ====\n")
    handle.write(f"python {sys.version}\n")
    handle.flush()
    return path, handle


def pack_problem() -> str | None:
    if ORDER_PATH.is_file() and PLUGINS_DIR.is_dir() and any(PLUGINS_DIR.glob("NP_*/*.js")):
        return None
    return (
        "Похоже, архив распакован не целиком, или install.bat запущен прямо из окна ZIP.\n"
        "Распакуйте весь ZIP в обычную папку и запустите install.bat уже оттуда.\n"
        "The ZIP was not fully extracted, or install.bat was started from inside the ZIP window.\n"
        "Extract the whole ZIP into a normal folder, then start install.bat there.\n"
        + FAIL_RU + "\n" + FAIL_EN
    )


def resolve_www(raw: str) -> Path:
    """Accept the game folder (with Game.exe), the www folder, or www/js/plugins.js."""
    text = str(raw).strip().strip('"').strip()
    if not text:
        raise ValueError("empty")
    path = Path(text).expanduser()
    if path.is_file():
        if path.name.lower() == "plugins.js" and path.parent.name.lower() == "js":
            www = path.parent.parent
            if www.name.lower() == "www" and path.is_file():
                return www.resolve()
        path = path.parent
    candidates = [path, path / "www"]
    if path.name.lower() == "js":
        candidates.append(path.parent)
    seen = set()
    for cand in candidates:
        key = str(cand)
        if key in seen:
            continue
        seen.add(key)
        if (cand / "js" / "plugins.js").is_file():
            return cand.resolve()
    raise FileNotFoundError(text)


def try_folder_dialog() -> str | None:
    """Windows folder picker. Returns None when it is unavailable or cancelled."""
    if os.name != "nt":
        return None
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception:
        return None
    root = tk.Tk()
    try:
        root.withdraw()
        try:
            root.attributes("-topmost", True)
        except Exception:
            pass
        chosen = filedialog.askdirectory(title="Папка игры / Game folder")
    except Exception:
        return None
    finally:
        try:
            root.destroy()
        except Exception:
            pass
    if not chosen:
        return None
    return str(chosen)


def ask_for_folder() -> str:
    print("Сейчас откроется выбор папки. Если окна нет, введите путь ниже.")
    print("A folder window should open. If it does not, type the path below.")
    picked = try_folder_dialog()
    if picked:
        print(picked)
        return picked
    print("Введите путь к папке игры и нажмите Enter.")
    print("Type the game folder path and press Enter.")
    try:
        return input("> ")
    except EOFError:
        return ""


def stdin_is_console() -> bool:
    try:
        return sys.stdin is not None and sys.stdin.isatty()
    except Exception:
        return False


def wait_if_interactive(prompted: bool) -> None:
    if not prompted or not stdin_is_console():
        return
    try:
        input("Нажмите Enter, чтобы закрыть окно. / Press Enter to close this window.")
    except EOFError:
        pass


def main(argv: list[str] | None = None) -> int:
    prompted = {"v": False}
    try:
        return _main(argv, prompted)
    except SystemExit as exc:
        if isinstance(exc.code, int):
            code = exc.code
        else:
            if exc.code:
                print(exc.code, file=sys.stderr)
            code = 1
        return code
    finally:
        wait_if_interactive(prompted["v"])


def _main(argv: list[str] | None, prompted: dict) -> int:
    configure_stdio()
    log_file, handle = open_log()
    stdout, stderr = sys.stdout, sys.stderr
    sys.stdout = _Tee(stdout, handle)
    sys.stderr = _Tee(stderr, handle)
    code = 1
    try:
        code = _run(argv, prompted)
        return code
    except SystemExit as exc:
        # argparse uses SystemExit(0) for --help and SystemExit(2) for bad arguments.
        code = exc.code
        if code is None or code == 0:
            return 0
        if not isinstance(code, int):
            print(code)
            print(FAIL_RU)
            print(FAIL_EN)
            return 1
        print(FAIL_RU)
        print(FAIL_EN)
        return code
    finally:
        try:
            print(f"Log file: {LOG_NAME}")
            handle.flush()
        except Exception:
            pass
        sys.stdout = stdout
        sys.stderr = stderr
        try:
            handle.close()
        except Exception:
            pass


def _run(argv: list[str] | None, prompted: dict) -> int:
    ap = argparse.ArgumentParser(description="Install NymPri NP_* plugins into a game folder")
    ap.add_argument("www", nargs="?", help="Game folder (with Game.exe) or the www folder")
    ap.add_argument("--skip-assets", action="store_true", help="Do not copy plugins/*/assets")
    ap.add_argument("--repair-audio", action="store_true",
                    help="Optionally create missing historical audio names from this game's own files. Not required for the NP scripts.")
    ap.add_argument("--degraded-copy", action="store_true",
                    help="With --repair-audio, if ffmpeg is missing, plain-copy names that normally need a loudness re-encode.")
    args = ap.parse_args(argv)
    if args.degraded_copy and not args.repair_audio:
        print("ERROR: --degraded-copy is only valid with --repair-audio", file=sys.stderr)
        print(FAIL_RU)
        print(FAIL_EN)
        return 1
    problem = pack_problem()
    if problem:
        print(problem)
        return 1
    raw = args.www
    if not raw:
        if not stdin_is_console():
            print("Укажите папку игры: install.bat")
            print("Choose the game folder: install.bat")
            print(FAIL_RU)
            print(FAIL_EN)
            return 2
        prompted["v"] = True
        raw = ask_for_folder()
    try:
        www = resolve_www(raw or "")
    except (ValueError, FileNotFoundError):
        print("В этой папке нет игры.")
        print("Нужна папка, где лежит Game.exe, или папка www внутри неё.")
        print("This folder is not the game.")
        print("Choose the folder that contains Game.exe, or the www folder inside it.")
        print(FAIL_RU)
        print(FAIL_EN)
        return 1
    print(f"Game folder: {www}")
    plugins_js = www / "js" / "plugins.js"
    note = platform_note()
    if note:
        print(note)
    meta = load_order()
    managed = {path.stem for path in plugin_js_files()}
    copied = copy_js(www)
    print(f"Copied {len(copied)} plugin .js files → {www / 'js' / 'plugins'}")
    if not args.skip_assets:
        n = copy_assets(www)
        print(f"Copied {n} asset files into {www}")
    else:
        print("Skipped asset copy")
    names = patch_plugins_js(plugins_js, meta, managed)
    errors = order_errors(names, meta["load_order"], managed)
    if not args.skip_assets:
        errors.extend(f"missing asset {rel}" for rel in missing_assets(www))
        errors.extend(cc0_errors(www))
    for warning in companion_warnings(www):
        print("WARNING:", warning)
    present, missing_alias = alias_counts(www)
    if missing_alias:
        print(
            f"Optional: {missing_alias} of {present + missing_alias} historical audio names are not in this game. "
            "They are original-event filenames, not files the NP scripts ship. "
            'Create them from your own files with: python install.py "<www>" --repair-audio'
        )
    elif present:
        print(f"Optional historical audio names already present: {present}")
    if errors:
        for err in errors:
            print("ERROR:", err)
        print(FAIL_RU)
        print(FAIL_EN)
        return 1
    repair_code = 0
    if args.repair_audio:
        tool = load_alias_tool()
        report = tool.repair(www, degraded_copy=args.degraded_copy)
        print(tool.format_report(report))
        if tool.incomplete(report):
            print(FAIL_RU)
            print(FAIL_EN)
            return 2
    print(SUCCESS_RU)
    print(SUCCESS_EN)
    return repair_code


if __name__ == "__main__":
    sys.exit(main())
