# Simulated student submission: `/improved-site`

This file documents the changes made in `/improved-site` relative to the
untouched `/starter-site` kit, to illustrate what a student submission
following the brief in [starter-site/README.md](starter-site/README.md)
might look like.

The scenario: a student decided their persona is **"a Hertfordshire parent
looking for free, family-friendly things to do outdoors, plus the odd
fitness class"** (see [improved-site/persona.md](improved-site/persona.md))
and then curated + rendered the shared dataset around that persona.

## 1. `persona.md` — architect

Filled in the template with a concrete persona, three visitor goals, which
categories/tags matter most (`free`, `Parks`, `Walking`, `Wildlife`,
`outdoors`/`gym`), and a one-line content model (single filterable feed,
no separate pages).

## 2. `curation.sql` — editorialize

Replaced the example comments with four real `UPDATE` statements, each
justified by an SQL comment:

- **Hide WordPress's default "About" boilerplate** (`post_name = 'about'`)
  on both sites — identical instructional text on every new WordPress
  site, not written for this audience.
- **Hide four leftover WordPress demo posts on site2** ("The Art of
  Connection", "Beyond the Obstacle", "Growth Unlocked", "Collaboration
  Magic") — generic sample content, not about fitness or Hertfordshire.
- **Hide nine navigation-only pages** (`social-groups`, `by-region`,
  `walking`, `welwyn-and-hatfield`, `st-albans`, `tring`, `parks`, `gyms`,
  `outdoors`, `free`) that only contained WordPress `page-list` /
  `latest-posts` blocks — these only render inside WordPress itself, so
  outside of it they were just blank cards. The real posts they used to
  list are left visible.
- **Fixed one blank title** — the site1 homepage slideshow post had no
  title at all; it's renamed to "Home page highlights" so it reads
  sensibly as a card.

Net effect: 30 posts/pages in the dataset → 14 visible after curation.

## 3. `sandbox.html` — working evidence

Kept all the given saved queries, and added three more (prefixed
`[exploration]`) that show the process used to arrive at the
`curation.sql` decisions above:

- listing every page's raw content to spot the empty/navigation-only ones,
- finding `post_name` values that repeat across posts vs. pages,
- finding posts with a blank title.

## 4. `site.html` — render

Replaced the blank-canvas starter with a working, filterable feed:

- **Site + category filter pills**, built from live `SELECT ... GROUP BY`
  queries against the curated data (not hardcoded), clickable to narrow
  the feed by clicking a pill — mirrors the pattern already used in
  `starter.css`'s `.pill` / `.pill-row` primitives.
- **Thumbnail images**: a small `firstImageSrc()` helper pulls the first
  `<img src="...">` out of a post's raw `content` with a regex, so cards
  get a photo without needing to parse/render full WordPress block markup.
- **Fallback description**: uses the post's `excerpt` if present,
  otherwise strips HTML tags from `content` and trims it to ~160
  characters, so posts with no excerpt (most of them, in this dataset)
  still show some text instead of a blank paragraph.
- **Site badges**: each card shows a pill naming its originating site
  ("Outdoors In Herts" / "Get Fit In Herts"), useful once posts from both
  sites are mixed together in one feed.
- Title and subtitle rewritten to match the persona ("Family Days Out in
  Herts").

## 5. Files intentionally left untouched

- `starter.css` — used as-is via `.card`/`.grid`/`.pill` primitives; no
  overrides were needed.
- `README.md` — the assignment brief; not something a student would edit.
- `site1/images/`, `site2/images/`, `*/media-manifest.json` — given, local
  media assets, unchanged.
- The hosted `loader.js` / `site-cache.json` — untouched by design; both
  files are fetched from `https://stivb.github.io/wpimport/`, not local
  copies.

## Verification performed

Both `/starter-site` and `/improved-site` were served locally
(`python -m http.server`) and opened in a browser to confirm:

- `Loader.initializeDatabase()` successfully fetches the hosted
  `site-cache.json` and `loader.js`, and applies the local `curation.sql`
  (status line reports "Loaded site-cache.json and applied curation.sql.").
- `starter-site/site.html` renders the full, uncurated post list.
- `improved-site/site.html` renders only the 14 curated posts, with
  images, site badges, and working site/category filter pills.
- `sandbox.html` in both folders executes saved queries correctly against
  the loaded database.
