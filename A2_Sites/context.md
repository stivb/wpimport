# Context: WordPress XML import and page rendering

This project works in two stages:

1. Import the WordPress export XML into a browser-based SQLite database.
2. Render the imported data in HTML pages using SQL queries and lightweight UI logic.

The code is split so the data layer and the display layer are kept separate where possible.

## 1. Import logic: jsimport.js

The core import process is implemented in [jsimport.js](jsimport.js).

### Purpose
The script loads a WordPress export file called:

- outdoorsinherts.WordPress.2026-09-03.xml

It parses the XML and stores the important posts, categories, tags, and their relationships in an in-browser SQLite database using sql.js.

### Fundamental flow

#### a) Database setup
The script creates a SQLite database and defines tables:

- terms
- posts
- post_terms

The schema is intentionally simple:

- `terms` stores each category/tag record with:
  - term_id
  - kind (`category` or `tag`)
  - name
  - slug
  - description
  - parent

- `posts` stores each WordPress post with:
  - id
  - title
  - link
  - date
  - content
  - excerpt
  - status
  - post_name
  - row_order

- `post_terms` links each post to one or more category/tag terms.

This gives a normalised structure that is easy to query later.

#### b) XML parsing
The file is fetched with `fetch(XML_URL)`, then parsed with `DOMParser`:

- `new DOMParser().parseFromString(xmlText, 'application/xml')`

This gives a browser-accessible XML document tree that can be traversed with DOM methods like:

- `getElementsByTagName()`
- `getElementsByTagName('item')`
- `getAttribute('domain')`
- `textContent`

The parser is used to collect:

- categories from `wp:category`
- tags from `wp:tag`
- posts from `<item>` nodes where `wp:post_type` is `post`

#### c) Category and tag ingestion
The function `parseCategoriesAndTags(xmlDoc)` loops through all WordPress category and tag nodes and inserts them into the `terms` table.

Each term is stored with a unique WordPress `term_id` and a `kind` so the database can distinguish categories from tags.

Normalization utilities are also used to make terms easier to match later:

- `normalizeKey(value)`

This lowercases the value, strips punctuation, substitutes `&` with `and`, and normalises spacing to support matching across slightly different WordPress naming styles.

#### d) Post ingestion
The function `insertPosts(xmlDoc, maps)` iterates through each `<item>` element and keeps only entries where the item is a WordPress post.

For each post it reads:

- `wp:post_id`
- `title`
- `link`
- `wp:post_date`
- `content:encoded`
- `excerpt:encoded`
- `wp:status`
- `wp:post_name`

Then it inserts the record into the `posts` table.

After inserting the post, it looks at each `<category>` child node and tries to map it to the correct term using the category/tag maps built earlier.

This creates the `post_terms` relationship table so later queries can ask:

- which posts belong to a given category?
- which posts include a given tag?
- how many posts are associated with each term?

#### e) Database initialization
The function `initializeDatabase()` does the main orchestration:

1. calls `initSqlJs(...)` to load the sql.js engine
2. builds the SQLite database schema
3. fetches and parses the XML file
4. imports categories/tags and posts
5. queries the database for the term list and counts
6. returns an object such as:
   - `dbInstance`
   - `terms`
   - `selectedFilter`

The result is passed to the rendering pages. In other words, the import step prepares the data the UI needs.

### Important idea
The import script does not render HTML. It prepares a queryable data object that the page can use to populate the DOM.

---

## 2. Rendering logic: outdoorsinherts.html

The main display page is [outdoorsinherts.html](outdoorsinherts.html).

### Purpose
This page shows the WordPress posts in a readable blog-like format, and includes category/tag filters so the user can narrow the list.

### Fundamental flow

#### a) Initial page structure
The page contains:

- a title
- a subtitle
- a filter panel
- a container for the posts list

The key DOM elements are:

- `#filter-controls`
- `#posts`

These are the target areas the script updates when data is loaded.

#### b) Database retrieval and app startup
Once the imported database is available, the page runs a startup function like `startApp()`.

This function:

1. reads the imported database from `window.wordpressImport`
2. loads the term list
3. calculates term counts
4. renders filter buttons
5. renders the posts list

The app state is kept in a small object or variables such as:

- `db`
- `selectedFilter`

This state is important because the UI must know which category/tag is currently selected.

#### c) Render filters
The function `renderFilters(terms)` does the following:

- splits the term list into `category` and `tag` buckets
- builds a filter button for “All categories” or “All tags”
- creates one button per actual term
- attaches click listeners to each button

When a user clicks a filter, the selected filter is updated and the post list is re-rendered.

This is the main UI interaction pattern:

- user click => update state => re-render content

#### d) Post rendering
The function `renderPosts()` builds a SQL query from the current filter state.

If there is no filter selected, the query is effectively:

- select all posts ordered by `row_order`

If a category or tag is selected, the query joins `posts` with `post_terms` and `terms` to only return posts attached to that term.

Then the results are mapped to JavaScript objects and rendered into HTML using template strings.

Each article contains:

- title
- published date
- post content

The rendering logic also inserts the raw HTML returned from WordPress content into the page, so the original post content can appear as styled HTML.

### Key idea
The rendering page is a thin UI shell that reads from the SQLite database and writes HTML based on SQL results.

---

## 3. Rendering logic: outdoors_starter.html

The starter page is a simpler demonstration page: [outdoors_starter.html](outdoors_starter.html).

### Purpose
This page is designed as a lightweight SQL playground for exploring the imported WordPress data.

It keeps the same import logic but replaces the full blog rendering with:

- a basic category list
- a basic tag list
- a SQL textarea
- a results panel showing plain text output

### Fundamental flow

#### a) Same import step
The starter page loads the same sql.js library and the same `jsimport.js` script, so it receives the same prepared database.

Therefore it has access to:

- all posts
- all categories and tags
- all category/tag relationships

#### b) Simple listing of terms
The page builds a button for each category and tag. Clicking one automatically creates a SQL query based on that term and runs it.

This gives a quick way to inspect posts associated with a category or tag without writing SQL manually.

#### c) SQL query execution
The user types or edits a SQL query in the textarea and hits the “Run query” button.

The script does:

- reads the query text
- executes it against `state.db`
- checks for errors
- formats the results into plain text

The result formatting is intentionally simple:

- header row = column names
- separator line
- then each row is concatenated with `|` separators

This makes the output easy to read and easy to use as a teaching tool.

#### d) Text-only output
Unlike the main page, the starter page does not render blog cards or complex HTML. Instead, it prints a text representation of rows like:

- title | date | link | category_name
- Stanborough Lakes | 2023-12-06 ... | https://... | Parks

This is the core requirement: output is text-only, with essential item information shown plainly rather than styled article blocks.

### Why this is useful
The starter page demonstrates the most important principle behind the project:

- the database holds the structured data
- SQL queries decide what data to show
- the page simply formats the result in a readable way

---

## 4. The broad architectural principle

The application follows a simple pattern:

1. Parse WordPress export XML into a database.
2. Store categories, tags, and posts in relational tables.
3. Query the database using SQL.
4. Render the result into a page.

This separation is useful because it lets the codebase stay readable and flexible:

- import logic is responsible for data acquisition and normalization
- rendering logic is responsible for HTML and user interaction
- SQL is the bridge between the two

That is the fundamental structure behind both the main page and the starter page.

---

## 5. In one sentence
The project converts WordPress data from XML into a usable SQLite dataset, then uses SQL queries to decide what to show, and the page simply renders those results in either a blog-like UI or a plain-text query playground.
