/* --- infrastructure: you shouldn't need to edit this file ---
 *
 * Loader for the "wpimport" mashup dataset used in this assignment.
 *
 * What it does:
 *   1. Boots an in-browser SQLite database (sql.js) with the shared schema
 *      (sites / terms / posts / post_terms).
 *   2. Loads the canonical, read-only dataset from a hosted site-cache.json
 *      URL, so every student starts from identical data.
 *   3. Fetches and runs a local, student-authored curation.sql file (if
 *      present) against the freshly loaded database, so a marker who opens
 *      your submission cold sees the same curated view you intended.
 *   4. Exposes a couple of small display helpers every page needs anyway:
 *      escapeHtml() and formatDate().
 *
 * Usage (in site.html / sandbox.html):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js"></script>
 *   <script src="https://stivb.github.io/wpimport/loader.js"></script>
 *   <script>
 *     Loader.initializeDatabase().then(({ db, cache, curation }) => {
 *       // db is a ready sql.js Database, curation.js already applied.
 *     });
 *   </script>
 */

(function (global) {
  'use strict';

  const DEFAULT_CACHE_URL = 'https://stivb.github.io/wpimport/site-cache.json';
  const DEFAULT_CURATION_URL = './curation.sql';
  const SQL_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/';

  function buildDatabaseSchema(db) {
    db.run(`
      CREATE TABLE sites (
        site_id TEXT,
        title TEXT,
        base_url TEXT,
        xml_file TEXT,
        site_order INTEGER
      );

      CREATE TABLE terms (
        site_id TEXT,
        term_id INTEGER,
        kind TEXT,
        name TEXT,
        slug TEXT,
        description TEXT,
        parent TEXT
      );

      CREATE TABLE posts (
        site_id TEXT,
        id INTEGER,
        post_type TEXT,
        title TEXT,
        link TEXT,
        date TEXT,
        content TEXT,
        excerpt TEXT,
        status TEXT,
        post_name TEXT,
        row_order INTEGER,
        isPublic BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE post_terms (
        site_id TEXT,
        post_id INTEGER,
        term_id INTEGER,
        kind TEXT
      );
    `);
  }

  function loadFromCacheJson(db, cache) {
    const insertRows = (table, columns, rows, defaults = {}) => {
      if (!Array.isArray(rows)) return;
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      rows.forEach((row) => {
        db.run(sql, columns.map((col) => {
          const value = row[col];
          if (value === undefined) return defaults[col] !== undefined ? defaults[col] : null;
          return typeof value === 'boolean' ? (value ? 1 : 0) : value;
        }));
      });
    };

    insertRows('sites', ['site_id', 'title', 'base_url', 'xml_file', 'site_order'], cache.sites);
    insertRows('terms', ['site_id', 'term_id', 'kind', 'name', 'slug', 'description', 'parent'], cache.terms);
    insertRows('posts', ['site_id', 'id', 'post_type', 'title', 'link', 'date', 'content', 'excerpt', 'status', 'post_name', 'row_order', 'isPublic'], cache.posts, { isPublic: 1 });
    insertRows('post_terms', ['site_id', 'post_id', 'term_id', 'kind'], cache.post_terms);
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Runs the student's curation.sql (if reachable) after the cache is loaded.
  // Fails loudly: a broken curation.sql is reported back, never swallowed.
  async function runCuration(db, curationUrl) {
    if (!curationUrl) return { attempted: false, applied: false, error: null };

    let text;
    try {
      const response = await fetch(curationUrl, { cache: 'no-store' });
      if (!response.ok) return { attempted: false, applied: false, error: null };
      text = await response.text();
    } catch (error) {
      // No curation.sql reachable (e.g. missing file, or opened via file://).
      return { attempted: false, applied: false, error: null };
    }

    if (!text || !text.trim()) return { attempted: true, applied: false, error: null };

    try {
      db.exec(text);
      return { attempted: true, applied: true, error: null };
    } catch (error) {
      return { attempted: true, applied: false, error: String((error && error.message) || error) };
    }
  }

  async function initializeDatabase(options = {}) {
    const cacheUrl = options.cacheUrl || DEFAULT_CACHE_URL;
    const curationUrl = options.curationUrl === undefined ? DEFAULT_CURATION_URL : options.curationUrl;

    const SQL = await global.initSqlJs({ locateFile: (file) => SQL_JS_CDN + file });
    const db = new SQL.Database();
    buildDatabaseSchema(db);

    const response = await fetch(cacheUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not fetch ${cacheUrl} (HTTP ${response.status})`);
    const cache = await response.json();
    loadFromCacheJson(db, cache);

    const curation = await runCuration(db, curationUrl);

    return { db, cache, curation };
  }

  global.Loader = {
    initializeDatabase,
    buildDatabaseSchema,
    loadFromCacheJson,
    escapeHtml,
    formatDate,
  };
})(window);
