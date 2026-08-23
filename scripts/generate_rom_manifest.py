#!/usr/bin/env python3
"""Regenerate the emulator ROM manifest by walking a roms/<system>/ tree.

Usage: generate_rom_manifest.py <roms_dir> <output_file>

Existing entries in <output_file> are matched by "file" path and keep
their hand-set "title"/"license" fields; only newly-seen ROMs get a
title derived from their filename.
"""
import json
import re
import sys
from pathlib import Path

SKIP_NAMES = {"manifest.json"}
TAG_RE = re.compile(r"\s*[\(\[][^\)\]]*[\)\]]\s*")


def derive_title(filename):
    stem = Path(filename).stem
    cleaned = TAG_RE.sub(" ", stem)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -")
    return cleaned or stem


def load_existing(output_file):
    if not output_file.exists():
        return {}
    try:
        existing = json.loads(output_file.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    return {entry["file"]: entry for entry in existing if "file" in entry}


def main():
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <roms_dir> <output_file>", file=sys.stderr)
        sys.exit(1)

    roms_dir = Path(sys.argv[1]).resolve()
    output_file = Path(sys.argv[2]).resolve()

    if not roms_dir.is_dir():
        print(f"error: {roms_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    existing_by_file = load_existing(output_file)

    entries = []
    for system_dir in sorted(p for p in roms_dir.iterdir() if p.is_dir()):
        system = system_dir.name
        for rom_path in sorted(system_dir.iterdir()):
            if not rom_path.is_file() or rom_path.name.startswith("."):
                continue
            if rom_path.name in SKIP_NAMES:
                continue

            rel_file = f"{system}/{rom_path.name}"
            prior = existing_by_file.get(rel_file)

            entry = {
                "system": system,
                "file": rel_file,
                "title": prior["title"] if prior and prior.get("title") else derive_title(rom_path.name),
            }
            if prior and prior.get("license"):
                entry["license"] = prior["license"]

            entries.append(entry)

    output_file.write_text(json.dumps(entries, indent=2) + "\n")
    print(f"wrote {len(entries)} entries to {output_file}")


if __name__ == "__main__":
    main()
