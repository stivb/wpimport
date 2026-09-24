# Pedagogy: designing the student starter kit

## 0. The learning goals, restated as three verbs

| Verb | What it means here | Artifact where it should show up |
|---|---|---|
| **Editorialize** | Decide what to keep, hide, or highlight; justify it | a small, human-readable "curation" file |
| **Architect** | Decide who the site is for, and what information architecture serves them | a short design document + navigation/routing choices |
| **Render** | Write SQL to select content, then JS/HTML/CSS to display it | `site.html` |

Everything below is about making sure the *files students are given* map
cleanly onto these three verbs, and that the plumbing needed to make
`site-cache.json` queryable doesn't leak into territory that should belong
to "architect" or "render".

---

## 1. The core problem with today's code, for this audience

Right now `mashup-import.js` mixes together several concerns that a 2nd-year
student doesn't need and shouldn't have to debug:

- discovering `siteN` folders and their XML/tar filenames,
- parsing raw WordPress XML,
- rewriting image URLs against a media manifest,
- **and** building the SQLite schema/tables that the student's queries
  actually run against.

Only the last part (schema + loading rows into `sql.js`) is something
students need to understand at all, and even that is closer to "given
infrastructure" than something they should be editing. Everything upstream
of `site-cache.json` is an **instructor-side concern**: it should produce
`site-cache.json` once, and students should never need to open
`mashup-import.js`, the XML files, or the `siteN/` folders at all.

So the first decision is really: **how much of the remaining loader code
(schema + `site-cache.json` → SQLite) do students see, and how much is a
black box?**

---

## 2. Options for the loader (data plumbing)

### Option A — Shared `loader.js`, provided, lightly documented, not edited
A trimmed-down version of `mashup-import.js` containing only:
- `buildDatabaseSchema(db)`
- `loadFromCacheJson(db, cache)`
- a tiny `initializeDatabase()` that fetches `site-cache.json` and returns a
  ready `db` object
- a couple of small utilities every page needs anyway: `escapeHtml()`,
  `formatDate()`

This is ~50–70 lines, short enough to read top-to-bottom once in class, but
students generally treat it like a library (`<script src="loader.js">`),
the same way they'd treat sql.js itself.

**Pros:** one canonical place, no duplication between `site.html` and
`sandbox.html`, easy for you to patch/reissue if a bug is found (e.g. the
`isPublic` addition), matches how the existing two files already work.
**Cons:** still an extra file for students to know exists ("don't touch
this one").

### Option B — Inline loader, duplicated in both files
Exactly what `sandbox.html` does today: the schema/load code is pasted into
a `<script>` block in every HTML file.

**Pros:** a student can read one file top-to-bottom with nothing hidden;
nothing to "trust". **Cons:** duplication (already visible as a maintenance
smell between the current `mashup-import.js` and `sandbox.html`); if you
fix a bug in one copy you must remember to fix it in the other; more
boilerplate to scroll past before reaching the interesting code.

### Option C — Fully opaque `db.js`, single black-box function
Expose only `await getDb()` → a ready `sql.js` Database, with schema/table
names documented separately (see §5, "schema cheat sheet") rather than
visible in student-facing code at all.

**Pros:** maximum focus on SQL + rendering, nothing to accidentally break.
**Cons:** removes a legitimate learning opportunity (reading real schema
DDL is useful), and makes the cheat-sheet document a single point of
failure if it goes out of date.

**Recommendation: Option A.** It's the smallest change from what already
exists, keeps a single source of truth, and is short enough to be
inspectable without being a distraction. Ship it clearly marked, e.g. a
comment banner `/* --- infrastructure: you shouldn't need to edit this file --- */`.

---

## 3. Options for splitting `sandbox.html` vs `site.html`

Both already share the same underlying data; the question is how much
rendering capability the sandbox should have.

### Option 1 — Sandbox is text/table output only (as now)
Students prototype SQL in `sandbox.html`, see a plain `|`-separated table,
then hand-copy the working query into `site.html` and write real
HTML/CSS rendering there from scratch.

**Pros:** cleanest separation of the two skills (getting the query right
vs. displaying it nicely); mirrors a realistic workflow (a DB console vs.
an app). **Cons:** no visual feedback in the sandbox; students must
context-switch to see how a query "looks".

### Option 2 — Sandbox can preview using the *same* render function as the site
Factor a `renderPostCard(row)` (or similar) function into `loader.js` (or a
shared `render-helpers.js`) so both `sandbox.html` and `site.html` can call
it. Add a "Preview as cards" button next to "Execute" in the sandbox.

**Pros:** faster iteration — students see the actual visual result before
committing a query to `site.html`; encourages writing rendering code as
small reusable functions (good habit) rather than one giant inline
template. **Cons:** slightly more moving parts; you need to decide how much
of the render helper is "given" vs. student-authored (if it's fully given,
it undercuts the "render" learning goal for `site.html`; if only a
generic *shell* is given — e.g. a function that takes a template-string
callback — students still do the real work).

### Option 3 — Merge into one page with tabs
A single file with a "Query" tab and a "Site" tab.

**Pros:** one less file. **Cons:** blurs the two-file conceptual model you
already want ("experiment" vs. "deliverable"), and makes it harder to mark
"the finished site" in isolation from scratch work.

**Recommendation: Option 1 to start, with Option 2 as a stretch/enhancement**
students can add themselves once their basic site works — i.e. ship the
starter kit with Option 1's simplicity, but mention Option 2 in the
assignment brief as a way to earn "technical sophistication" marks.

---

## 4. Options for "editorializing" so a third party sees the same result

This is the trickiest requirement: **a marker opening the submitted files
cold (not on the student's machine, not relying on their browser's
`localStorage`) must see the same curated view the student intended.**
That rules out `localStorage`/`IndexedDB` as the *only* mechanism — those
are per-browser-profile and invisible to anyone else opening the files.

### Option A — `editorial.js`: a plain JS overrides object, checked in
```js
// editorial.js — edit this file to control what appears on the site
window.EDITORIAL_OVERRIDES = {
  hidden:   ["site1:42", "site2:7"],       // "siteId:postId" pairs to suppress
  featured: ["site1:10"],                  // pairs to promote/highlight
  edits: {
    "site1:42": { title: "Working title (draft)" }
  }
};
```
`loader.js` applies this after loading the cache (e.g. `UPDATE posts SET
isPublic = 0 WHERE site_id = ? AND id = ?` for each hidden pair).

**Pros:** trivial JS object literal, no SQL needed, diffs cleanly in git.
**Cons:** doesn't reinforce the SQL skill; a second syntax/convention to
learn alongside SQL.

### Option B — `curation.sql`: plain SQL statements, checked in
```sql
-- curation.sql — run once at startup, after site-cache.json is loaded
UPDATE posts SET isPublic = 0 WHERE post_name = 'about-draft';
UPDATE posts SET isPublic = 0 WHERE site_id = 'site2' AND title LIKE '%old%';
```
`loader.js` fetches this file as text and runs it with `db.exec(sqlText)`
right after loading the cache, before any student queries run.

**Pros:** editorializing *is* a SQL exercise — directly reinforces the
target skill instead of introducing a second mechanism; UPDATE/DELETE are a
natural extension of the SELECT skills already being taught; a plain-text
file that is trivially diffable and marker-readable on its own (you can
grade "their editorial judgement" just by reading this file, without
running anything). **Cons:** slightly more setup in `loader.js` (fetch +
`db.exec`); a syntax error in a student's `curation.sql` needs a clear
error message so it doesn't silently break the whole site.

### Option C — Interactive hide/feature toggles for convenience, "baked" on submit
While working, offer inline buttons in `site.html` ("Hide this",
"Feature this") that write straight to the in-memory DB for instant visual
feedback — but these are a *workbench* convenience only. Before submitting,
students must transcribe their final decisions into the Option B (or A)
file, which is what actually ships and is what the marker's cold load
uses.

**Pros:** best editing experience while iterating. **Cons:** two-step
("try it live, then remember to persist it") — a student could forget the
second step. Mitigation: have the toggle buttons *generate* the
corresponding `UPDATE ... ;` line (e.g. print it to the browser console or
a `<textarea>` for copy-paste) so "persisting" is copy-paste, not
hand-authoring from memory.

**Recommendation: Option B (`curation.sql`) as the graded artifact**, since
it turns editorializing into another visible demonstration of SQL
competence and is trivially inspectable by a marker without running the
page. Optionally layer **Option C's generate-the-SQL-for-me buttons** on
top as a UX nicety — but the checked-in `.sql` file is what's authoritative
and what `loader.js` actually executes.

> Advanced/optional aside: Chromium-based browsers support the File System
> Access API (`showSaveFilePicker`), which would let "click hide" write
> directly to `curation.sql` on disk with no copy-paste step. Worth
> mentioning to strong students as an extension, but not a baseline
> requirement — it's Chrome/Edge-only and adds a permissions prompt that
> complicates the "just open the file" simplicity you want for markers.

---

## 5. Options/tools to support "architect" (information architecture, audience)

Because this is the part that's hardest to scaffold with code, a short
written artifact works better than more JavaScript:

- **`persona.md` template** — a one-page fill-in-the-blank: who is the
  ideal user, what are their top 3 goals visiting this site, which
  categories/tags/sites matter most to them, what should be de-prioritised.
  Require this to be written *before* `site.html` is touched; it gives you
  something concrete to mark for the "architect" strand independent of
  code quality.
- **A lightweight hash router** as an optional technique (`#/tag/free`,
  `#/site/site1`), listening for `hashchange` and re-rendering — this
  makes the student's information architecture literally visible in the
  URL bar, and is a small, well-scoped vanilla-JS pattern appropriate for
  2nd years (no framework/router library needed).
- **A content-model sketch** — encourage a simple Mermaid diagram or
  bullet outline of proposed pages/sections in their README, e.g. "Home →
  featured; By activity (tag); By site (about each source)". This is cheap
  to produce and easy to compare against the eventual `site.html` for
  consistency marking.

---

## 6. Options/tools to support "render"

- **A tagged-template escaping helper**, e.g.
  ``` js
  function html(strings, ...values) {
    return strings.reduce((out, s, i) => out + s + (values[i - 1] !== undefined ? '' : ''), '');
  }
  ```
  or more usefully, package the existing `escapeHtml()` pattern behind a
  small `safe\`...\`` tagged template so interpolated values are
  auto-escaped by default. This heads off a very common student bug
  (forgetting to escape a title/excerpt and breaking the page on an
  apostrophe or stray `<`), while still requiring them to write the actual
  markup structure by hand.
- **A `starter.css`** with CSS variables and a couple of basic layout
  primitives (card, grid, pill/badge) already established in
  `mashup2.html` — ship it as a starting point students are encouraged to
  override, so they spend their design time on layout/IA decisions rather
  than re-deriving basic box models from zero.
- **A schema cheat-sheet** (either a short section in the README, or a
  `SELECT name, sql FROM sqlite_master WHERE type='table'` saved query
  already present in `sandbox.html`'s default queries) — students must
  know column names to write SQL, so this should be one click away, not
  something they have to reverse-engineer from `loader.js`.
- **Encourage parameterised queries** (`db.exec(sql, params)`, already used
  throughout) rather than string-concatenated SQL — a good habit to teach
  even though there's no real "injection" attacker in a static client-side
  page; it also avoids a class of quoting bugs when a title contains an
  apostrophe.

---

## 7. Proposed concrete starter kit (bringing the recommendations together)

```
site-cache.json     given, read-only input data (identical for every student)
loader.js           given, ~60 lines: schema + load cache + run curation.sql + escapeHtml/formatDate
curation.sql         student-edited: UPDATE/DELETE statements controlling isPublic + minor edits
persona.md          student-edited: ideal user + goals + priorities (written first)
starter.css         given, small set of variables + card/grid/pill primitives (overridable)
sandbox.html         given shell + student queries: textarea, "Execute", plain-table results,
                     saved-queries list (as today) — students iterate here first
site.html            mostly blank canvas + given shell: <div id="app">, includes loader.js/starter.css,
                     TODO markers where students write their SQL + render function(s)
README.md           assignment brief: explains the three verbs, which file maps to which,
                     and that `loader.js`/`site-cache.json` are infrastructure, not to be edited
```

Marking maps directly onto files: `persona.md` → architect,
`curation.sql` → editorialize, `site.html` (+ `starter.css` overrides) →
render, `sandbox.html` → working evidence of SQL exploration.

---

## 8. Hosting instructor-supplied files online instead of locally

**Short answer: yes, this is possible and worth doing for the two true
"data contract" files.** GitHub Pages (and similar static hosts) serve
plain files over HTTPS with permissive CORS headers on `GET` requests, so
`fetch()`/`<script src>` from a student's own page — even one opened
locally via `file://`, not just one served from a local dev server — can
successfully load a file hosted on `https://youraccount.github.io/...`.
This is the same trick people use to host free static assets/CDNs off
GitHub Pages or `raw.githubusercontent.com`.

### Which files are good candidates to host online (read-only, instructor-owned)

- **`site-cache.json`** — the strongest candidate. Hosting the canonical
  dataset centrally, rather than handing every student a local copy, is
  the most robust way to guarantee "everyone starts from identical data" —
  there's no local copy for anyone to accidentally (or deliberately) edit.
- **`loader.js`** — also a good candidate. Centralising it means a bug fix
  (like today's `isPublic` column addition) reaches every student's site
  automatically on next load, with no re-issuing of files. It also removes
  any temptation/possibility of a student quietly editing the loader to
  bypass a requirement (e.g. disabling the `isPublic` filter). It's still
  fully inspectable via the browser's Network tab or "view source" on the
  URL — hosting it remotely makes it *uneditable*, not *hidden*.

### Which files should stay local and student-editable

- **`site.html`**, **`sandbox.html`** — the actual deliverables.
- **`curation.sql`**, **`persona.md`** — the graded artifacts a student
  authors themselves (see §4, §5); these must never be centrally hosted,
  since each student's version needs to differ and be theirs to submit.
- **`starter.css`** — deliberately *not* a candidate for remote hosting,
  even though it's instructor-authored, because the intent is for students
  to copy and override it locally, not treat it as an untouchable
  contract.

### Practical notes if you do this

- **Pin to a version, not a moving branch.** Use a tagged release or
  commit-SHA'd URL (e.g. `https://youraccount.github.io/repo@v1/loader.js`
  via jsDelivr's GitHub mode, or a dated folder on GitHub Pages) rather
  than always serving the tip of `main`. Otherwise, a later fix you push
  for one cohort could silently change behaviour underneath students
  who've already built and tested against the earlier shape — and a
  marker revisiting a submission weeks later could see different results
  than the student saw. Once the Sept/Oct cohort's files are locked in, it
  is worth "freezing" that URL (a tag such as `2026-assignment-1`) so
  reproducibility is guaranteed even if you improve `loader.js` for a
  future term.
- **jsDelivr's GitHub CDN mode** (`cdn.jsdelivr.net/gh/user/repo@tag/path`)
  is a good alternative/companion to raw GitHub Pages — it's purpose-built
  for serving versioned files straight out of a git repo, sets correct
  `Content-Type`/CORS headers, and makes the "pin to a tag" step explicit
  and easy, without needing to enable Pages at all.
- **`curation.sql` is the one wrinkle.** A separate local `.sql` file
  still needs to be *fetched*, and fetching local same-origin files via
  `fetch('./curation.sql')` from a bare `file://` page is blocked in some
  browsers (Chrome in particular). If you want students to be able to
  double-click `site.html` with no local server at all, either: (a) keep
  requiring the one-line `python -m http.server` step already documented
  in `instructions.md` (simplest, low extra cost since it's already part
  of the workflow), or (b) have students embed their curation SQL directly
  in a `<script type="text/plain" id="curation">…</script>` block inside
  `site.html`/`sandbox.html` instead of a separate fetched file, which
  works with no server at all, at the cost of the SQL no longer living in
  its own clean, independently-diffable file.
- **Net effect on setup friction:** if `site-cache.json` and `loader.js`
  both move to a hosted URL, and `curation.sql` is embedded inline (option
  b above), the entire "you must run a local web server" requirement in
  `instructions.md` could be dropped — students could just double-click
  `site.html`. That's a meaningful reduction in early setup friction for
  this audience, at the cost of requiring internet access to load/mark the
  site (see risks below).
- **Risks to weigh:** (1) no offline testing/marking without a cached
  copy; (2) a GitHub Pages/jsDelivr outage on a submission deadline day
  would affect every student's site simultaneously; (3) project-page URLs
  (`username.github.io/reponame/...`) vs. user-page URLs
  (`username.github.io/...`) have different base paths, which is an easy
  copy-paste mistake if students ever need to reference the URL directly —
  mitigated by having `loader.js` hold the canonical URL internally so
  students never type or edit a URL themselves.

---

## 9. Open questions for you to decide

1. Loader visibility: Option A (shared, given, lightly read) vs. C (fully
   opaque)? (Recommended: A.)
2. Sandbox rendering power: keep it text-only (Option 1) or add a shared
   "preview as card" helper (Option 2)? (Recommended: start with 1, offer
   2 as a stretch goal.)
3. Editorializing mechanism: `curation.sql` (Option B, SQL-native) vs.
   `editorial.js` (Option A, plain object)? (Recommended: B.) Do you also
   want the interactive "generate the UPDATE for me" buttons (Option C) as
   a UX aid, or keep it strictly hand-written to force students to
   practice writing UPDATE statements themselves?
3a. Should `curation.sql` errors (bad SQL) fail loudly (a visible banner
    telling the student their curation script didn't run) or fail
    silently and fall back to "everything visible"? Recommended: loud —
    silent failure would let a broken curation file go unnoticed until
    marking.
4. How much of `starter.css` should be mandatory scaffolding vs. optional
   — do you want a bare unstyled `site.html` (harder, more "render" marks
   available) or a nicely-styled shell (easier entry point, more time
   spent on content/IA decisions)?
5. Do you want `persona.md` and `curation.sql` submitted/marked as
   standalone documents in their own right, or purely as inputs that are
   only indirectly assessed through the resulting `site.html`?
6. Do you want to host `site-cache.json`/`loader.js` online at all, or
   keep everything local for simplicity/offline-safety? (This is
   independent of the other decisions above — hosting is an optional
   layer on top of whichever loader/editorializing options you pick.)
7. If hosting: GitHub Pages, jsDelivr's GitHub mode, or another static
   host you already use for this module? And should the hosted URL be
   pinned per-assignment (e.g. a git tag per coursework release) so a
   later fix never silently changes what an already-submitted site shows?
