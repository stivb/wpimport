---
title: "How the Days Out in Herts site works"
subtitle: "A beginner-friendly tour of site.html"
---

# The site's job

**Days Out in Herts** brings posts from several WordPress sites into one
browsable page.

- Visitors can filter posts by source site or category.
- Each matching post appears as a card with a title, date, short description,
  and (when available) a photo.
- The page uses the visitor profile in `persona.md`: a Hertfordshire parent
  looking for family-friendly outdoor activities and some local fitness options.

The page is not a WordPress theme. It reads an exported dataset and builds a
small, separate browsing experience in the web browser.

# What happens when the page opens?

1. **HTML** creates the page areas: heading, status message, filters, and cards.
2. **CSS** sets the colours, spacing, responsive grid, and card appearance.
3. **JavaScript** asks the `Loader` helper to prepare the data.
4. The helper loads data into an in-browser SQLite database; `curation.sql`
   applies editorial changes.
5. JavaScript runs SQL queries and turns the results into filter buttons and
   post cards.

In short:

```text
HTML structure + CSS styling
            ↓
JavaScript loads data → SQL selects posts → JavaScript draws the page
```

# The HTML page skeleton

In `<head>`, the page sets its title and mobile viewport, then loads:

- `sql.js`, which lets JavaScript run a SQLite database in the browser.
- The hosted `Loader` helper, which prepares the database and provides small
  display helpers.
- `starter.css`, which contains the main visual styles.

The `<body>` contains a few named placeholders:

```html
<div class="status-line" id="status-line">Loading...</div>
<div class="pill-row" id="filters"></div>
<div id="content" class="grid"></div>
```

JavaScript finds these elements by their `id` and fills them in. The extra
`<style>` block in the page adds image-specific rules on top of `starter.css`.

# Preparing the data

The first JavaScript state is:

```js
const state = { db: null, siteFilter: null, categoryFilter: null };
```

- `db` will hold the ready-to-query database.
- `siteFilter` and `categoryFilter` remember the visitor's choices.
- `null` means “show all” for that filter.

`startApp()` calls `Loader.initializeDatabase()`. The expected helper creates
the database tables, loads the shared `site-cache.json` data, and tries to run
the nearby `curation.sql`. The page then reads the sites and categories from
the database before drawing the controls and posts.

# The data model and SQL

The page expects four related tables:

- **`sites`** — source website names and IDs.
- **`posts`** — titles, dates, descriptions, content, and visibility.
- **`terms`** — category and tag names.
- **`post_terms`** — connections between posts and terms.

The main query joins each post to its source site and excludes posts whose
`isPublic` value is not `1`:

```sql
SELECT p.title, p.date, p.excerpt, p.content, s.title AS site_title
FROM posts p
JOIN sites s ON s.site_id = p.site_id
WHERE p.isPublic = 1
ORDER BY p.date DESC
```

The real query also selects IDs and links, and adds optional filters. `ORDER BY`
puts newer dates first, assuming the stored date values sort consistently.

# How the filters work

`renderFilters()` creates buttons for **All sites**, each site, **All
categories**, and each category. When a visitor clicks a button:

1. The handler reads its `data-kind` and `data-value`.
2. It updates the matching filter in `state`.
3. It redraws the filter buttons and runs the post query again.

`buildQuery()` adds a condition only when a filter has a value. The site and
category conditions can both apply, so a visitor can narrow results by both.
The category condition follows the post-to-term links and checks the site and
term kind as well as the term ID. This matters because IDs can repeat between
different WordPress sites.

Values supplied to the SQL query use `?` placeholders and a separate parameter
list, rather than being pasted into the SQL text.

# Turning rows into cards

`renderPosts()` runs the SQL and converts its result into ordinary JavaScript
objects. For each post it:

- Looks for the first image in the post's HTML content.
- Uses the excerpt if it is non-empty; otherwise it removes HTML tags, tidies
  whitespace, and takes the first 160 characters.
- Adds the source site's name as a badge, formats the date, and creates an
  `<article>` card.
- Shows a friendly message if no posts match the filters.

Text and image URLs are passed through `Loader.escapeHtml()` before being
inserted into HTML. Images use `loading="lazy"`, so the browser can wait to load
them until they are near the visible part of the page.

# What curation changes

`curation.sql` changes the database view before the page queries it. For
example, it marks WordPress's default “About” posts and empty navigation pages
as not public. The page's `p.isPublic = 1` condition then leaves those items out
of both the cards and category counts.

This keeps content selection separate from presentation:

- **SQL curation** decides which records should be shown.
- **JavaScript** decides how selected records are displayed.
- **CSS** decides how that display looks.

The status line reports whether curation ran. If the SQL file has an error, the
page displays a warning but continues using the data it has. A more serious
loading error is caught and shown as a failure message.

# Assumptions and limitations

- The hosted `Loader` script and `sql.js` library are reachable, and the browser
  has JavaScript and internet access.
- The cache has the four expected tables and fields, with post/term links that
  include the source `site_id`.
- The page is served from a web server or hosting service so it can fetch the
  cache and `curation.sql`. Opening it directly as a `file://` URL may prevent
  those requests from working.
- Post content contains WordPress-style HTML. The image finder expects a
  double-quoted `src` on an `<img>` tag and uses only the first matching image.
- Cards show a summary, not the full post. Although the SQL selects a post
  link, the current card markup does not make the card clickable.
- All matching posts are displayed; there is no pagination or search box.

# Takeaway

`site.html` is a small data-driven web page: it loads a prepared dataset,
applies simple SQL rules, remembers filter choices in JavaScript, and renders
the matching content as HTML cards.

The main idea is to keep each job in its familiar place: **HTML for structure,
CSS for appearance, JavaScript for interaction, and SQL for selecting and
curating data.**

# Challenge 1: Open a full post in a modal

**Goal:** Clicking a card opens that post or page in a dialog over the current
view, rather than navigating away.

**Start here:**

- `renderPosts()` already has each result row while building a card. How could
  the card keep track of which post was clicked?
- The query selects `site_id`, `id`, and `content`. Consider whether you need
  both IDs to identify a post, since several source sites are combined.
- Think about how a visitor closes the dialog: a visible close button, the
  Escape key, and perhaps clicking outside it.

**Before calling it finished:** Can keyboard users reach and close the dialog?
Can assistive technology identify it as a dialog? WordPress content is HTML:
how will you display its formatting without inserting unsafe markup?

# Challenge 2: Build a site-based menu

**Goal:** Add a top menu with one heading per originating site and submenus for
that site's categories and tags.

**Start here:**

- The existing site buttons are built in `renderFilters()`. The `sites`,
  `terms`, and `post_terms` tables provide starting points for the menu data.
- A term's `kind` distinguishes a category from a tag. How could the menu make
  those two groups clear to visitors?
- The current category filter uses a term name. What extra information should a
  menu item retain so a term with the same name on another site is not confused
  with it?

**Before calling it finished:** Decide how submenus open and close on both
mouse and keyboard, and how the menu should fit on a narrow screen. Try to reuse
the current filtering behavior rather than creating a second, inconsistent
filtering system.

# Challenge 3: Add a taxonomy sidebar and full-post feed

**Goal:** Put categories and tags in a left column. Selecting one shows a
date-ordered sequence of full post contents in the main area.

**Start here:**

- Use the `terms` and `post_terms` relationship to work out which posts belong
  to a selected term.
- The current `buildQuery()` and `renderPosts()` already separate choosing
  posts from displaying them. Which parts could be extended for this view?
- Decide how selection should work when a term name appears on more than one
  site, and how the sidebar should show a term with no matching public posts.

**Before calling it finished:** Keep the sidebar usable on small screens, show
which term is selected, and consider what visitors see before selecting a term
or when no posts match. Full post bodies contain HTML too, so treat that content
carefully when displaying it.
