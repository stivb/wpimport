# Instructions: setting up and running this site importer

This project imports one or more WordPress.com XML exports into an
in-browser SQLite database and renders them as a simple web page. This
guide walks through setting it up from scratch.

## 1. Folder structure you need to create

At the root of this project, create one folder per WordPress site you want
to import, named `site1`, `site2`, `site3`, and so on (sequentially, no
gaps).

Each `siteN` folder must contain:

- **one WordPress export `.xml` file** — the file you get from WordPress.com
  under *Tools → Export*. The filename itself doesn't matter (it's detected
  automatically), but there must be exactly one `.xml` file in the folder.
- **At most one media source**: a `.tar`, `.tar.gz` or `.tgz` export, or
  an already-extracted folder named `media_library_export...`. If there is
  no media source, the preparation script tries to download the site's own
  images referenced by the XML. This needs an internet connection and a
  publicly accessible original site.

Example:

```
experiments/
  A2_Sites/
   site1/
    export.xml
    media-backup.tar.gz
   site2/
    export.xml
   site3/
    export.xml
    media-export.tar
   site4/
    export.xml
    media_library_export-example/
   site5/
    export.xml
    media-backup.tar.gz
```

You don't need to create the `images/` folder or any manifest file
yourself — the next step generates those for you.

## 2. Prepare each site's media

Run this once after adding a new `siteN` folder, and again any time you
replace the XML or media source with a newer export:

```powershell
python extract_media.py
```

This scans every `siteN` folder, and for each one:

- copies images from its archive or extracted media folder into a flat
  `siteN/images/` folder. Full WordPress backups are supported; application
  files and other non-image files are not copied,
- if no media source is present, downloads the site's own image attachments
  and images used in published posts and pages from URLs in its XML,
- writes a `siteN/media-manifest.json` file that records where each
  original image ended up locally (this is what lets the imported HTML
  content link to your local copies instead of the original WordPress.com
  URLs).

For the supplied inputs, sites 1 and 5 use compressed backups, site 3 uses a
tar export, site 4 uses its extracted folder, and site 2 downloads media
from its original WordPress site. Images hosted on unrelated sites remain
external links. The script reports individual failed downloads and exits
with a nonzero status if preparation is incomplete; fix the problem and
rerun it. Successful downloads are still recorded in the manifest.

The script overwrites generated image files and manifests when rerun, but
does not delete old files from `images/`. Only the current manifest is used.
Long names and duplicate basenames are renamed locally as needed.

You should see output like:

```
Found 5 site folder(s): site1, site2, site3, site4, site5
  [ok] site1: prepared ... image(s) from ...
  [info] site2: downloading ... images from the original site
  [ok] site2: prepared ... image(s) from ...
  ...
Done. Each site folder now has images/ and media-manifest.json.
```

## 3. Start a local web server

Everything here runs as static files served over HTTP — you can't just
double-click the `.html` files, because the browser needs to fetch the
`.xml`, image, and JSON files, which requires a real server (and directory
listings are how the importer discovers your `siteN` folders and their
filenames).

From this project's folder, run:

```powershell
python -m http.server 8000
```

Leave this running, then open your browser to:

```
http://localhost:8000/mashup.html
```

## 4. What you'll see

- A **Sites** filter row (one button per detected `siteN` folder, showing
  its post/page count),
- **Categories** and **Tags** filter rows (merged across all sites by
  name),
- A combined, chronologically-ordered list of every published post and
  page from every site, each labelled with which site it came from.

Click any filter button to narrow the list; click "All sites" / "All
categories" / "All tags" to clear that filter again.

If a `siteN` folder is missing its `.xml` file, or has more than one, that
site is skipped (with a warning in the browser console) rather than
breaking the whole page.

## 5. Speeding up future loads with a cache file

Parsing every site's XML file and rewriting image links on every page load
is a bit of work. Once you're happy with the imported result, click
**"Download cache (site-cache.json)"** at the top of the page. This
downloads a `site-cache.json` file — move it into the project's root folder
(next to `mashup.html`).

From then on, reloading `mashup.html` will detect `site-cache.json` and
load instantly from it, skipping all XML/tar parsing entirely. The status
line at the top of the page tells you which happened:

- `"N site(s) freshly imported from XML exports."` — no cache found (or it
  didn't load), everything was parsed from scratch.
- `"N site(s) loaded from site-cache.json."` — the cache was used.

**If you add a new site, or change an existing site's export/media,
delete `site-cache.json` (or re-download and overwrite it)** so the page
picks up the changes on the next load — otherwise it will keep showing the
old cached content.

## 6. Other pages in this project

These are single-site pages kept from earlier work and are unaffected by
anything above:

- `outdoorsinherts.html` — shows only the site1 export, unfiltered by the
  multi-site logic.
- `outdoors_starter.html` — a simple SQL playground against the site1
  export, useful for experimenting with queries by hand.

`mashup.html` is the one to use for viewing multiple sites together.
