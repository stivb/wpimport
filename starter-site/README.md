# Assignment: curate and render a mashup site

You are given a dataset made from two WordPress blogs, already merged into
one queryable shape. Your job is to **editorialize**, **architect**, and
**render** a small site that presents a curated slice of this data to a
specific kind of visitor.

## The three things you're marked on

| Verb | What it means | Where it lives |
|---|---|---|
| **Editorialize** | Decide what to keep, hide, or highlight — and be able to justify it | [curation.sql](curation.sql) |
| **Architect** | Decide who the site is for, and what information architecture serves them | [persona.md](persona.md) |
| **Render** | Write SQL to select content, then HTML/CSS/JS to display it well | [site.html](site.html) |

`sandbox.html` is where you experiment with SQL before committing a query
to `site.html` — it's evidence of your working process, not a deliverable
on its own.

## Files you should edit

- `persona.md` — write this **first**.
- `curation.sql` — SQL `UPDATE`/`DELETE` statements that hide or edit posts.
- `site.html` — your actual site. Look for `TODO` comments.
- `sandbox.html` — use freely to try out queries.
- `starter.css` — a starting point; override or extend it as you like.

## Files that are infrastructure — you shouldn't need to edit these

- `loader.js` — hosted centrally at
  `https://stivb.github.io/wpimport/loader.js` and included via `<script
  src="...">`, not a local file. It loads the shared dataset, applies your
  `curation.sql`, and gives you `Loader.escapeHtml()` /
  `Loader.formatDate()` helpers.
- `site-cache.json` — the canonical dataset, hosted at
  `https://stivb.github.io/wpimport/site-cache.json`. Every student starts
  from the exact same data; there's no local copy to accidentally edit.
- `site1/images/`, `site2/images/`, `*/media-manifest.json` — the images
  referenced by post content, kept local for speed. You shouldn't need to
  touch these directly; `<img>` tags inside the post content already point
  at the right local paths.

## Database schema

Once loaded, you have four tables to query with SQL:

```sql
sites (site_id, title, base_url, xml_file, site_order)
terms (site_id, term_id, kind, name, slug, description, parent)  -- kind: 'category' or 'tag'
posts (site_id, id, post_type, title, link, date, content, excerpt, status, post_name, row_order, isPublic)
post_terms (site_id, post_id, term_id, kind)
```

A post's categories/tags are found by joining `posts` → `post_terms` →
`terms` on **both** `site_id` and the relevant id column (ids are only
unique per site, not globally).

Remember to filter out hidden posts in queries you write for `site.html`:

```sql
SELECT * FROM posts WHERE isPublic = 1 ORDER BY date DESC;
```

## Running this locally

Because `curation.sql` is fetched with `fetch()`, some browsers (Chrome in
particular) block that request from a bare `file://` page. Run a tiny
local server from this folder instead:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/site.html` (or `/sandbox.html`).

## What "curation didn't run" looks like

If `curation.sql` has a syntax error, the page will show a visible warning
banner rather than silently showing the uncurated data — check the status
line at the top of the page if something looks off.
