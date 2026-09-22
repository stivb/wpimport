#!/usr/bin/env python3
"""Extract each site's WordPress media .tar into a flat images/ folder plus a lookup manifest.

Run this once after adding/updating a siteN/*.tar file, then re-run whenever
a site's tar changes. Safe to re-run: it overwrites images/ and the manifest.
"""
import json
import os
import re
import tarfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE_FOLDER_RE = re.compile(r'^site(\d+)$', re.IGNORECASE)


def find_site_folders():
    folders = [
        entry for entry in ROOT.iterdir()
        if entry.is_dir() and SITE_FOLDER_RE.match(entry.name)
    ]
    folders.sort(key=lambda p: int(SITE_FOLDER_RE.match(p.name).group(1)))
    return folders


def find_tar_file(site_dir: Path):
    tars = sorted(site_dir.glob('*.tar'))
    return tars[0] if tars else None


def unique_local_name(basename: str, used: set) -> str:
    if basename not in used:
        used.add(basename)
        return basename
    stem, ext = os.path.splitext(basename)
    n = 2
    while True:
        candidate = f"{stem}-{n}{ext}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        n += 1


def extract_site(site_dir: Path):
    tar_path = find_tar_file(site_dir)
    if tar_path is None:
        print(f"  [skip] {site_dir.name}: no .tar file found")
        return

    images_dir = site_dir / 'images'
    images_dir.mkdir(exist_ok=True)

    by_path = {}
    used_names = set()
    extracted = 0
    collisions = 0

    with tarfile.open(tar_path) as tar:
        for member in tar.getmembers():
            if not member.isfile():
                continue

            # Tar entries are stored as YYYY/MM/filename.ext (WordPress's own
            # media-library convention) - flatten to just the filename locally.
            original_path = member.name.replace('\\', '/').lstrip('/')
            basename = os.path.basename(original_path)
            if not basename:
                continue

            local_name = unique_local_name(basename, used_names)
            if local_name != basename:
                collisions += 1

            source = tar.extractfile(member)
            if source is None:
                continue

            target = images_dir / local_name
            with open(target, 'wb') as out_file:
                out_file.write(source.read())

            by_path[original_path] = f"images/{local_name}"
            extracted += 1

    manifest = {
        "site_id": site_dir.name,
        "source_tar": tar_path.name,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        # Keyed by the original "YYYY/MM/filename" path from the tar/XML, so
        # the browser importer can match exactly before falling back to a
        # basename-only lookup.
        "files": by_path,
    }
    manifest_path = site_dir / 'media-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')

    note = f", {collisions} filename collision(s) disambiguated" if collisions else ""
    print(f"  [ok] {site_dir.name}: extracted {extracted} file(s) from {tar_path.name}{note}")


def main():
    site_dirs = find_site_folders()
    if not site_dirs:
        print("No site folders (site1, site2, ...) found next to this script.")
        return 1

    print(f"Found {len(site_dirs)} site folder(s): {', '.join(d.name for d in site_dirs)}")
    for site_dir in site_dirs:
        extract_site(site_dir)

    print("Done. Each site folder now has images/ and media-manifest.json.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
