// Multi-site WordPress XML importer -> shared in-browser SQLite database.
// Used by mashup.html only; the single-site jsimport.js is untouched.

const importState = {
  db: null,
  loadedFromCache: false,
  sites: [],
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getText(node, tagName) {
  if (!node) return '';
  const found = node.getElementsByTagName(tagName)[0];
  return found ? (found.textContent || '').trim() : '';
}

async function fetchDirectoryListing(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Directory listing not available for ${path}`);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('a[href]')).map((a) => decodeURIComponent(a.getAttribute('href') || ''));
}

async function discoverSiteFolders() {
  let hrefs;
  try {
    hrefs = await fetchDirectoryListing('./');
  } catch (error) {
    console.warn('Could not read the root directory listing; no sites discovered.', error);
    return [];
  }

  const folders = hrefs
    .map((href) => href.match(/^site(\d+)\/?$/i))
    .filter(Boolean)
    .map((match) => ({ folder: `site${match[1]}`, order: Number(match[1]) }));

  folders.sort((a, b) => a.order - b.order);
  return folders;
}

async function discoverSiteAssets(folder) {
  const hrefs = await fetchDirectoryListing(`./${folder}/`);
  const xmlFile = hrefs.find((href) => /\.xml$/i.test(href));
  const hasManifest = hrefs.some((href) => href.toLowerCase() === 'media-manifest.json');
  return { xmlFile, hasManifest };
}

async function loadManifest(folder, hasManifest) {
  if (!hasManifest) return null;
  try {
    const response = await fetch(`./${folder}/media-manifest.json`, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`Could not read media-manifest.json for ${folder}`, error);
    return null;
  }
}

function resolveImageUrl(url, folder, manifestFiles) {
  if (!manifestFiles) return url;

  const withoutQuery = url.split('?')[0];
  const marker = '/wp-content/uploads/';
  const markerIndex = withoutQuery.indexOf(marker);
  if (markerIndex === -1) return url;

  const relPath = withoutQuery.slice(markerIndex + marker.length);
  if (manifestFiles[relPath]) {
    return `${folder}/${manifestFiles[relPath]}`;
  }

  // Fall back to a basename-only match, but only if it is unambiguous.
  const basename = relPath.split('/').pop();
  const matches = Object.keys(manifestFiles).filter((key) => key.split('/').pop() === basename);
  if (matches.length === 1) {
    return `${folder}/${manifestFiles[matches[0]]}`;
  }

  return url;
}

function rewriteContentImages(html, folder, manifestFiles) {
  if (!html || !manifestFiles) return html;
  return html.replace(/(<img\b[^>]*\bsrc=")([^"]*)(")/gi, (match, pre, src, post) => {
    return pre + resolveImageUrl(src, folder, manifestFiles) + post;
  });
}

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

function parseCategoriesAndTags(xmlDoc, siteId, db) {
  const categoryMap = new Map();
  const tagMap = new Map();

  Array.from(xmlDoc.getElementsByTagName('wp:category')).forEach((node) => {
    const termId = Number((node.getElementsByTagName('wp:term_id')[0]?.textContent || '').trim());
    const slug = (node.getElementsByTagName('wp:category_nicename')[0]?.textContent || '').trim();
    const name = (node.getElementsByTagName('wp:cat_name')[0]?.textContent || '').trim();
    const parent = (node.getElementsByTagName('wp:category_parent')[0]?.textContent || '').trim();

    if (!termId || !name) return;

    db.run(
      'INSERT INTO terms (site_id, term_id, kind, name, slug, description, parent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [siteId, termId, 'category', name, slug, '', parent]
    );

    [slug, name, normalizeKey(slug), normalizeKey(name)].forEach((key) => {
      if (key) categoryMap.set(key, termId);
    });
  });

  Array.from(xmlDoc.getElementsByTagName('wp:tag')).forEach((node) => {
    const termId = Number((node.getElementsByTagName('wp:term_id')[0]?.textContent || '').trim());
    const slug = (node.getElementsByTagName('wp:tag_slug')[0]?.textContent || '').trim();
    const name = (node.getElementsByTagName('wp:tag_name')[0]?.textContent || '').trim();
    const description = (node.getElementsByTagName('wp:tag_description')[0]?.textContent || '').trim();

    if (!termId || !name) return;

    db.run(
      'INSERT INTO terms (site_id, term_id, kind, name, slug, description, parent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [siteId, termId, 'tag', name, slug, description, '']
    );

    [slug, name, normalizeKey(slug), normalizeKey(name)].forEach((key) => {
      if (key) tagMap.set(key, termId);
    });
  });

  return { categoryMap, tagMap };
}

function insertItems(xmlDoc, maps, siteId, folder, manifestFiles, db) {
  const { categoryMap, tagMap } = maps;
  let rowOrder = 0;

  Array.from(xmlDoc.getElementsByTagName('item')).forEach((item) => {
    const type = getText(item, 'wp:post_type');
    if (type !== 'post' && type !== 'page') return;

    const status = getText(item, 'wp:status');
    if (status !== 'publish') return;

    const postId = Number((getText(item, 'wp:post_id') || '0'));
    if (!postId) return;

    const title = getText(item, 'title');
    const link = getText(item, 'link');
    const date = getText(item, 'wp:post_date') || getText(item, 'pubDate');
    const rawContent = getText(item, 'content:encoded');
    const content = rewriteContentImages(rawContent, folder, manifestFiles);
    const excerpt = getText(item, 'excerpt:encoded');
    const postName = getText(item, 'wp:post_name');

    db.run(
      'INSERT INTO posts (site_id, id, post_type, title, link, date, content, excerpt, status, post_name, row_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [siteId, postId, type, title, link, date, content, excerpt, status, postName, rowOrder]
    );
    rowOrder += 1;

    Array.from(item.getElementsByTagName('category')).forEach((catNode) => {
      const domain = catNode.getAttribute('domain');
      const nicename = (catNode.getAttribute('nicename') || '').trim();
      const name = (catNode.textContent || '').trim();

      if (!domain || !name) return;

      if (domain === 'category') {
        const termId = categoryMap.get(normalizeKey(nicename)) || categoryMap.get(normalizeKey(name));
        if (termId) {
          db.run('INSERT INTO post_terms (site_id, post_id, term_id, kind) VALUES (?, ?, ?, ?)', [siteId, postId, termId, 'category']);
        }
      }

      if (domain === 'post_tag') {
        const termId = tagMap.get(normalizeKey(nicename)) || tagMap.get(normalizeKey(name));
        if (termId) {
          db.run('INSERT INTO post_terms (site_id, post_id, term_id, kind) VALUES (?, ?, ?, ?)', [siteId, postId, termId, 'tag']);
        }
      }
    });
  });
}

async function importSite(db, folder, orderIndex) {
  const { xmlFile, hasManifest } = await discoverSiteAssets(folder);
  if (!xmlFile) throw new Error('no .xml export file found in this folder');

  const xmlText = await fetch(`./${folder}/${xmlFile}`, { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(`could not fetch ${xmlFile}`);
    return response.text();
  });

  const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const title = getText(xmlDoc, 'title') || folder;
  const baseUrl = getText(xmlDoc, 'wp:base_blog_url') || getText(xmlDoc, 'link');

  db.run(
    'INSERT INTO sites (site_id, title, base_url, xml_file, site_order) VALUES (?, ?, ?, ?, ?)',
    [folder, title, baseUrl, xmlFile, orderIndex]
  );

  const manifest = await loadManifest(folder, hasManifest);
  const manifestFiles = manifest && manifest.files ? manifest.files : null;

  const maps = parseCategoriesAndTags(xmlDoc, folder, db);
  insertItems(xmlDoc, maps, folder, folder, manifestFiles, db);

  const countResult = db.exec('SELECT COUNT(*) FROM posts WHERE site_id = ?', [folder]);
  const postCount = countResult && countResult[0] ? countResult[0].values[0][0] : 0;

  return { title, postCount };
}

function rowsToObjects(result) {
  if (!result || !result[0]) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
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

function exportCacheObject() {
  const db = importState.db;
  return {
    generatedAt: new Date().toISOString(),
    sites: rowsToObjects(db.exec('SELECT site_id, title, base_url, xml_file, site_order FROM sites ORDER BY site_order')),
    terms: rowsToObjects(db.exec('SELECT site_id, term_id, kind, name, slug, description, parent FROM terms')),
    posts: rowsToObjects(db.exec('SELECT site_id, id, post_type, title, link, date, content, excerpt, status, post_name, row_order, isPublic FROM posts')),
    post_terms: rowsToObjects(db.exec('SELECT site_id, post_id, term_id, kind FROM post_terms')),
  };
}

function downloadCache() {
  if (!importState.db) return;
  const json = JSON.stringify(exportCacheObject(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'site-cache.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function initializeDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`,
  });

  const db = new SQL.Database();
  buildDatabaseSchema(db);
  importState.db = db;

  let cache = null;
  try {
    const response = await fetch('./site-cache.json', { cache: 'no-store' });
    if (response.ok) cache = await response.json();
  } catch (error) {
    cache = null;
  }

  const siteResults = [];

  if (cache && Array.isArray(cache.sites) && cache.sites.length) {
    loadFromCacheJson(db, cache);
    importState.loadedFromCache = true;
    cache.sites.forEach((site) => siteResults.push({ folder: site.site_id, title: site.title, ok: true }));
  } else {
    importState.loadedFromCache = false;
    const folders = await discoverSiteFolders();
    let orderIndex = 0;
    for (const { folder } of folders) {
      try {
        const result = await importSite(db, folder, orderIndex++);
        siteResults.push({ folder, title: result.title, postCount: result.postCount, ok: true });
      } catch (error) {
        console.warn(`Skipping ${folder}: ${error && error.message}`);
        siteResults.push({ folder, ok: false, error: String((error && error.message) || error) });
      }
    }
  }

  importState.sites = siteResults;

  return {
    dbInstance: db,
    sites: siteResults,
    loadedFromCache: importState.loadedFromCache,
  };
}

window.mashupImport = {
  initializeDatabase,
  getDb: () => importState.db,
  isLoadedFromCache: () => importState.loadedFromCache,
  getAllSites: () => {
    if (!importState.db) return [];
    return rowsToObjects(importState.db.exec('SELECT site_id, title, site_order FROM sites ORDER BY site_order'));
  },
  getTermSummaries: () => {
    if (!importState.db) return [];
    return rowsToObjects(importState.db.exec(`
      SELECT t.kind AS kind, t.name AS name, COUNT(DISTINCT pt.site_id || ':' || pt.post_id) AS count
      FROM terms t
      JOIN post_terms pt ON pt.term_id = t.term_id AND pt.site_id = t.site_id AND pt.kind = t.kind
      GROUP BY t.kind, t.name
      ORDER BY t.kind, t.name
    `));
  },
  downloadCache,
};
