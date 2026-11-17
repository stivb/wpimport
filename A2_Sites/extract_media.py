#!/usr/bin/env python3
"""Prepare local images and manifests for the WordPress site exports."""

import hashlib
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
SITE_FOLDER_RE = re.compile(r'^site(\d+)$', re.IGNORECASE)
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico'}
UPLOADS = 'wp-content/uploads/'
WP = '{http://wordpress.org/export/1.2/}'
CONTENT = '{http://purl.org/rss/1.0/modules/content/}'


def find_site_folders():
    folders = [entry for entry in ROOT.iterdir()
               if entry.is_dir() and SITE_FOLDER_RE.fullmatch(entry.name)]
    return sorted(folders, key=lambda p: int(SITE_FOLDER_RE.fullmatch(p.name).group(1)))


def media_path(path):
    """Normalize WordPress backup paths to paths relative to uploads."""
    path = path.replace('\\', '/').lstrip('/')
    marker = path.find(UPLOADS)
    if marker >= 0 and (marker == 0 or path[marker - 1] == '/'):
        path = path[marker + len(UPLOADS):]
    return path


def unique_local_name(basename, used):
    # Keep paths comfortably below Windows' traditional path limit.
    stem, ext = PurePosixPath(basename).stem, PurePosixPath(basename).suffix
    if len(basename) > 120:
        digest = hashlib.sha256(basename.encode('utf-8')).hexdigest()[:12]
        basename = f'{stem[:100]}-{digest}{ext}'
        stem = PurePosixPath(basename).stem
    candidate = basename
    n = 2
    while candidate.casefold() in used:
        candidate = f'{stem}-{n}{ext}'
        n += 1
    used.add(candidate.casefold())
    return candidate


class ImageSources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'img':
            self.urls.extend(value for key, value in attrs if key.lower() == 'src' and value)


def remote_media(xml_path):
    root = ET.parse(xml_path).getroot()
    channel = root.find('channel')
    if channel is None:
        raise ValueError(f'{xml_path.name}: no RSS channel')
    base = channel.findtext(f'{WP}base_blog_url') or channel.findtext('link') or ''
    host = urlsplit(base).hostname
    if not host:
        raise ValueError(f'{xml_path.name}: no valid site URL')

    urls = []
    for item in channel.findall('item'):
        post_type = item.findtext(f'{WP}post_type')
        if post_type == 'attachment':
            urls.append(item.findtext(f'{WP}attachment_url') or '')
        elif post_type in ('post', 'page') and item.findtext(f'{WP}status') == 'publish':
            parser = ImageSources()
            parser.feed(item.findtext(f'{CONTENT}encoded') or '')
            urls.extend(parser.urls)

    result = {}
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme not in ('http', 'https') or parsed.hostname != host:
            continue
        marker = '/' + UPLOADS
        if marker not in parsed.path:
            continue
        path = unquote(parsed.path.split(marker, 1)[1])
        if PurePosixPath(path).suffix.lower() in IMAGE_EXTENSIONS:
            # Request the original, not a WordPress resizing query.
            result.setdefault(path, parsed._replace(query='', fragment='').geturl())
    return sorted(result.items())


def extract_site(site_dir):
    archives = sorted(p for p in site_dir.iterdir()
                      if p.is_file() and p.name.lower().endswith(('.tar', '.tar.gz', '.tgz')))
    directories = sorted(p for p in site_dir.iterdir()
                         if p.is_dir() and p.name.lower().startswith('media_library_export'))
    sources = archives + directories
    if len(sources) > 1:
        raise ValueError('multiple media sources found: ' + ', '.join(p.name for p in sources))

    images_dir = site_dir / 'images'
    images_dir.mkdir(exist_ok=True)
    by_path = {}
    used_names = set()
    errors = []

    def save(path, source):
        path = media_path(path)
        name = PurePosixPath(path).name
        if not name or PurePosixPath(name).suffix.lower() not in IMAGE_EXTENSIONS:
            return
        if path in by_path:
            raise ValueError(f'duplicate media path: {path}')
        local_name = unique_local_name(name, used_names)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=images_dir, delete=False) as target:
                temporary = Path(target.name)
                shutil.copyfileobj(source, target)
            os.replace(temporary, images_dir / local_name)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
        by_path[path] = f'images/{local_name}'

    if archives:
        source_name = archives[0].name
        with tarfile.open(archives[0], 'r:*') as archive:
            for member in archive:
                if member.isfile():
                    # Full backups may contain application code outside uploads.
                    path = member.name.replace('\\', '/').lstrip('/')
                    if path.startswith('wp-content/') and not path.startswith(UPLOADS):
                        continue
                    if PurePosixPath(path).suffix.lower() not in IMAGE_EXTENSIONS:
                        continue
                    with archive.extractfile(member) as source:
                        save(path, source)
    elif directories:
        source_name = directories[0].name
        for path in sorted(directories[0].rglob('*')):
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in IMAGE_EXTENSIONS:
                with path.open('rb') as source:
                    save(path.relative_to(directories[0]).as_posix(), source)
    else:
        xml_files = sorted(site_dir.glob('*.xml'))
        if len(xml_files) != 1:
            raise ValueError(f'expected one XML export for media download, found {len(xml_files)}')
        source_name = xml_files[0].name
        media = remote_media(xml_files[0])
        if not media:
            raise ValueError('no same-site image URLs found in the XML export')
        print(f'  [info] {site_dir.name}: downloading {len(media)} images from the original site', flush=True)
        for path, url in media:
            try:
                request = Request(url, headers={'User-Agent': 'WordPress-media-import/1.0'})
                with urlopen(request, timeout=30) as response:
                    if not response.headers.get_content_type().startswith('image/'):
                        raise ValueError(f"unexpected content type {response.headers.get_content_type()}")
                    save(path, response)
            except (OSError, ValueError) as error:
                errors.append(f'{url}: {error}')

    if not by_path and not errors:
        raise ValueError(f'no images found in {source_name}')
    manifest = {
        'site_id': site_dir.name,
        'source': source_name,
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'files': by_path,
    }
    (site_dir / 'media-manifest.json').write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    for error in errors:
        print(f'  [error] {site_dir.name}: {error}', file=sys.stderr)
    print(f"  [{'partial' if errors else 'ok'}] {site_dir.name}: prepared {len(by_path)} image(s) from {source_name}")
    return not errors


def main():
    site_dirs = find_site_folders()
    if not site_dirs:
        print('No site folders (site1, site2, ...) found next to this script.')
        return 1
    print(f"Found {len(site_dirs)} site folder(s): {', '.join(d.name for d in site_dirs)}", flush=True)
    ok = True
    for site_dir in site_dirs:
        try:
            if not extract_site(site_dir):
                ok = False
        except (OSError, ValueError, tarfile.TarError, ET.ParseError) as error:
            print(f'  [error] {site_dir.name}: {error}', file=sys.stderr)
            ok = False
    if not ok:
        print('Media preparation incomplete; see errors above.', file=sys.stderr)
        return 1
    print('Done. Each site folder now has images/ and media-manifest.json.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
