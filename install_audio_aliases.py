#!/usr/bin/env python3
"""Create missing historical audio names from the player's own game files.

This is optional. The normal installer does not run it and does not need ffmpeg.

50 names referenced by original events were absent in Windows 0.80j. Eight are
byte copies of an existing game file. Forty-two are loudness-adjusted Vorbis
re-encodes. Re-encoding is not guaranteed to match historical output bytes.
A plain copy of those forty-two is a different sound and is used only with
--degraded-copy. This tool never labels a plain copy as normalized, never
overwrites an existing target, and never modifies the source file.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAPPING_PATH = ROOT / "install" / "audio_aliases.json"


class UnsafePath(ValueError):
    pass


def load_mapping(path: Path = MAPPING_PATH) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    aliases = data.get("aliases") or []
    if len(aliases) != 50:
        raise SystemExit(f"ERROR: expected 50 audio aliases, found {len(aliases)} in {path}")
    return data


def safe_audio_path(www: Path, rel: str) -> Path:
    """Resolve rel under www/audio. Reject traversal, absolute paths, and symlinks."""
    text = str(rel).replace("\\", "/").strip()
    if not text or text.startswith("/") or text.startswith("audio/../") or "://" in text:
        raise UnsafePath(rel)
    parts = [p for p in text.split("/") if p != ""]
    if not parts or any(p in (".", "..") for p in parts):
        raise UnsafePath(rel)
    if parts[0] != "audio":
        raise UnsafePath(rel)
    cur = www
    if cur.is_symlink():
        raise UnsafePath(str(www))
    for part in parts:
        cur = cur / part
        if cur.is_symlink():
            raise UnsafePath(rel)
    return cur


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _place_new_file(tmp: Path, target: Path) -> str:
    """Move tmp onto target only when target is still absent."""
    if target.exists():
        tmp.unlink(missing_ok=True)
        return "skipped_exists"
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        tmp.unlink(missing_ok=True)
        return "skipped_exists"
    os.replace(tmp, target)
    return "created"


def copy_bytes(source: Path, target: Path) -> str:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        return "skipped_exists"
    fd, name = tempfile.mkstemp(prefix=".np-alias-", suffix=".ogg", dir=str(target.parent))
    os.close(fd)
    tmp = Path(name)
    try:
        shutil.copyfile(source, tmp)
        if sha256_file(tmp) != sha256_file(source):
            tmp.unlink(missing_ok=True)
            return "copy_mismatch"
        return _place_new_file(tmp, target)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def ffmpeg_reencode(ffmpeg: str, source: Path, target: Path, audio_filter: str) -> str:
    if not isinstance(audio_filter, str) or not audio_filter.strip():
        return "bad_filter"
    if "\n" in audio_filter or "\r" in audio_filter or "\x00" in audio_filter:
        return "bad_filter"
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".np-alias-", suffix=".ogg", dir=str(target.parent))
    os.close(fd)
    tmp = Path(name)
    cmd = [
        ffmpeg, "-y", "-v", "error",
        "-i", str(source),
        "-map_metadata", "0",
        "-map_metadata:s:a", "0:s:a",
        "-af", audio_filter,
        "-c:a", "libvorbis",
        "-q:a", "5",
        str(tmp),
    ]
    try:
        proc = subprocess.run(cmd, check=False, capture_output=True)
    except OSError as exc:
        tmp.unlink(missing_ok=True)
        return f"ffmpeg_error:{exc}"
    if proc.returncode != 0 or not tmp.is_file() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        err = (proc.stderr or b"").decode("utf-8", "replace").strip().splitlines()
        tail = err[-1] if err else f"exit {proc.returncode}"
        return f"ffmpeg_error:{tail}"
    return _place_new_file(tmp, target)


def repair(www: Path, mapping: dict | None = None, *, degraded_copy: bool = False, ffmpeg: str | None = None) -> dict:
    data = mapping if mapping is not None else load_mapping()
    ffmpeg_bin = ffmpeg if ffmpeg is not None else shutil.which("ffmpeg")
    report = {
        "created_copy": [],
        "created_reencode": [],
        "created_degraded": [],
        "skipped_exists": [],
        "missing_source": [],
        "sha_mismatch": [],
        "skipped_no_ffmpeg": [],
        "unsafe": [],
        "errors": [],
        "ffmpeg": ffmpeg_bin or "",
        "degraded_copy": bool(degraded_copy),
    }
    for row in data.get("aliases") or []:
        target_rel = row.get("target_path") or ""
        source_rel = row.get("source_path") or ""
        try:
            target = safe_audio_path(www, target_rel)
            source = safe_audio_path(www, source_rel)
        except UnsafePath:
            report["unsafe"].append({"target": target_rel, "source": source_rel})
            continue
        if target.exists():
            report["skipped_exists"].append(target_rel)
            continue
        if not source.is_file():
            report["missing_source"].append({"target": target_rel, "source": source_rel})
            continue
        expected = (row.get("source_sha256") or "").lower()
        actual = sha256_file(source)
        if not expected or actual != expected:
            report["sha_mismatch"].append({
                "source": source_rel,
                "expected": expected,
                "actual": actual,
            })
            continue
        operation = row.get("operation")
        try:
            if operation == "copy_bytes":
                status = copy_bytes(source, target)
                bucket = "created_copy"
            elif operation == "ffmpeg_volume_reencode_vorbis":
                if ffmpeg_bin:
                    status = ffmpeg_reencode(ffmpeg_bin, source, target, row.get("filter") or "")
                    bucket = "created_reencode"
                elif degraded_copy:
                    status = copy_bytes(source, target)
                    bucket = "created_degraded"
                else:
                    report["skipped_no_ffmpeg"].append(target_rel)
                    continue
            else:
                report["errors"].append(f"unknown operation for {target_rel}: {operation}")
                continue
        except OSError as exc:
            report["errors"].append(f"{target_rel}: {exc}")
            continue
        if status == "created":
            report[bucket].append(target_rel)
        elif status == "skipped_exists":
            report["skipped_exists"].append(target_rel)
        else:
            report["errors"].append(f"{target_rel}: {status}")
    return report


def incomplete(report: dict) -> bool:
    return any(report[key] for key in (
        "missing_source", "sha_mismatch", "skipped_no_ffmpeg", "unsafe", "errors",
    ))


def format_report(report: dict) -> str:
    lines = [
        "Optional audio-name repair (original event filenames, not NP script requirements):",
        f"  byte copies created: {len(report['created_copy'])}",
        f"  loudness re-encodes created: {len(report['created_reencode'])}",
        f"  degraded plain copies created: {len(report['created_degraded'])}",
        f"  already present, left untouched: {len(report['skipped_exists'])}",
        f"  source file missing: {len(report['missing_source'])}",
        f"  source hash mismatch, skipped: {len(report['sha_mismatch'])}",
        f"  needs ffmpeg, skipped: {len(report['skipped_no_ffmpeg'])}",
        f"  unsafe path, skipped: {len(report['unsafe'])}",
        f"  errors: {len(report['errors'])}",
    ]
    if report["created_degraded"]:
        lines.append("WARNING: degraded copies are NOT loudness-matched and are not the historical mix.")
    if report["skipped_no_ffmpeg"]:
        lines.append("ffmpeg was not used. Re-run with ffmpeg on PATH, or pass --degraded-copy to plain-copy those names.")
    if report["created_reencode"]:
        lines.append("Re-encoded files are not promised to match any historical checksum.")
    for item in report["errors"]:
        lines.append(f"ERROR: {item}")
    for item in report["unsafe"]:
        lines.append(f"UNSAFE: {item}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Optionally recreate missing historical audio names from your own game files")
    ap.add_argument("www", help="Path to the game www folder")
    ap.add_argument("--degraded-copy", action="store_true",
                    help="If ffmpeg is missing, plain-copy the 42 names that normally need a loudness re-encode. Not the historical mix.")
    ap.add_argument("--mapping", type=Path, default=MAPPING_PATH)
    args = ap.parse_args(argv)
    www = Path(args.www).expanduser().resolve()
    if not www.is_dir():
        print(f"ERROR: not a folder: {www}", file=sys.stderr)
        return 1
    report = repair(www, load_mapping(args.mapping), degraded_copy=args.degraded_copy)
    print(format_report(report))
    return 2 if incomplete(report) else 0


if __name__ == "__main__":
    sys.exit(main())
