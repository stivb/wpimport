import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

import extract_media


XML = '''<rss xmlns:wp="http://wordpress.org/export/1.2/"
 xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
 <link>https://example.wordpress.com</link>
 <item><wp:post_type>attachment</wp:post_type>
 <wp:attachment_url>https://example.wordpress.com/wp-content/uploads/2026/01/a.jpg</wp:attachment_url></item>
 <item><wp:post_type>post</wp:post_type><wp:status>publish</wp:status>
 <content:encoded><![CDATA[<img src='https://example.wordpress.com/wp-content/uploads/2026/01/b.png?w=10'>
 <img src="https://other.example/wp-content/uploads/2026/01/other.png">]]></content:encoded></item>
 </channel></rss>'''


class MediaTests(unittest.TestCase):
    def test_compressed_backup_paths_and_non_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            with tarfile.open(site / 'backup.tar.gz', 'w:gz') as archive:
                for name in ('wp-content/uploads/2026/01/a.jpg',
                             'wp-content/uploads/2026/02/a.jpg',
                             'wp-content/uploads/index.php',
                             'wp-content/plugins/plugin.png'):
                    data = b'image'
                    member = tarfile.TarInfo(name)
                    member.size = len(data)
                    archive.addfile(member, io.BytesIO(data))
            self.assertTrue(extract_media.extract_site(site))
            files = json.loads((site / 'media-manifest.json').read_text(encoding='utf-8'))['files']
            self.assertEqual(files, {'2026/01/a.jpg': 'images/a.jpg',
                                     '2026/02/a.jpg': 'images/a-2.jpg'})
            self.assertEqual((site / 'images' / 'a-2.jpg').read_bytes(), b'image')

    def test_extracted_folder_and_long_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            source = site / 'media_library_export-example'
            source.mkdir()
            name = 'x' * 180 + '.png'
            (source / name).write_bytes(b'image')
            self.assertTrue(extract_media.extract_site(site))
            files = json.loads((site / 'media-manifest.json').read_text(encoding='utf-8'))['files']
            self.assertEqual((site / files[name]).read_bytes(), b'image')
            self.assertLessEqual(len(Path(files[name]).name), 120)

    def test_downloads_only_site_images_and_reports_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / 'export.xml').write_text(XML, encoding='utf-8')
            self.assertEqual([p for p, _ in extract_media.remote_media(site / 'export.xml')],
                             ['2026/01/a.jpg', '2026/01/b.png'])
            with patch('extract_media.urlopen', side_effect=URLError('offline')):
                self.assertFalse(extract_media.extract_site(site))
            files = json.loads((site / 'media-manifest.json').read_text(encoding='utf-8'))['files']
            self.assertEqual(files, {})

    def test_ambiguous_sources_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / 'a.tar').touch()
            (site / 'b.tar.gz').touch()
            with self.assertRaisesRegex(ValueError, 'multiple media sources'):
                extract_media.extract_site(site)


if __name__ == '__main__':
    unittest.main()
