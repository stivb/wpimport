const XML_URL = './outdoorsinherts.WordPress.2026-09-03.xml';

const importState = {
  db: null,
  selectedFilter: { kind: 'category', name: 'ALL' }
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

function buildDatabase(SQL) {
  importState.db = new SQL.Database();

  importState.db.run(`
    CREATE TABLE terms (
      term_id INTEGER,
      kind TEXT,
      name TEXT,
      slug TEXT,
      description TEXT,
      parent TEXT
    );

    CREATE TABLE posts (
      id INTEGER,
      title TEXT,
      link TEXT,
      date TEXT,
      content TEXT,
      excerpt TEXT,
      status TEXT,
      post_name TEXT,
      row_order INTEGER
    );

    CREATE TABLE post_terms (
      post_id INTEGER,
      term_id INTEGER,
      kind TEXT
    );
  `);

  return importState.db;
}

function parseCategoriesAndTags(xmlDoc) {
  const categoryMap = new Map();
  const tagMap = new Map();

  Array.from(xmlDoc.getElementsByTagName('wp:category')).forEach((node) => {
    const termId = Number((node.getElementsByTagName('wp:term_id')[0]?.textContent || '').trim());
    const slug = (node.getElementsByTagName('wp:category_nicename')[0]?.textContent || '').trim();
    const name = (node.getElementsByTagName('wp:cat_name')[0]?.textContent || '').trim();
    const parent = (node.getElementsByTagName('wp:category_parent')[0]?.textContent || '').trim();

    if (!termId || !name) return;

    importState.db.run(
      'INSERT INTO terms (term_id, kind, name, slug, description, parent) VALUES (?, ?, ?, ?, ?, ?)',
      [termId, 'category', name, slug, '', parent]
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

    importState.db.run(
      'INSERT INTO terms (term_id, kind, name, slug, description, parent) VALUES (?, ?, ?, ?, ?, ?)',
      [termId, 'tag', name, slug, description, '']
    );

    [slug, name, normalizeKey(slug), normalizeKey(name)].forEach((key) => {
      if (key) tagMap.set(key, termId);
    });
  });

  return { categoryMap, tagMap };
}

function insertPosts(xmlDoc, maps) {
  const { categoryMap, tagMap } = maps;
  let rowOrder = 0;

  Array.from(xmlDoc.getElementsByTagName('item')).forEach((item) => {
    const type = getText(item, 'wp:post_type');
    if (type !== 'post') return;

    const postId = Number((getText(item, 'wp:post_id') || '0'));
    const title = getText(item, 'title');
    const link = getText(item, 'link');
    const date = getText(item, 'wp:post_date') || getText(item, 'pubDate');
    const content = getText(item, 'content:encoded');
    const excerpt = getText(item, 'excerpt:encoded');
    const status = getText(item, 'wp:status');
    const postName = getText(item, 'wp:post_name');

    if (!postId) return;

    importState.db.run(
      'INSERT INTO posts (id, title, link, date, content, excerpt, status, post_name, row_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [postId, title, link, date, content, excerpt, status, postName, rowOrder]
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
          importState.db.run('INSERT INTO post_terms (post_id, term_id, kind) VALUES (?, ?, ?)', [postId, termId, 'category']);
        }
      }

      if (domain === 'post_tag') {
        const termId = tagMap.get(normalizeKey(nicename)) || tagMap.get(normalizeKey(name));
        if (termId) {
          importState.db.run('INSERT INTO post_terms (post_id, term_id, kind) VALUES (?, ?, ?)', [postId, termId, 'tag']);
        }
      }
    });
  });
}

async function initializeDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`
  });

  buildDatabase(SQL);

  const xmlText = await fetch(XML_URL).then((response) => {
    if (!response.ok) throw new Error('Unable to load the WordPress export file.');
    return response.text();
  });

  const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const maps = parseCategoriesAndTags(xmlDoc);
  insertPosts(xmlDoc, maps);

  const termsResult = importState.db.exec('SELECT term_id, kind, name FROM terms ORDER BY kind, name');
  const rows = termsResult && termsResult[0] ? termsResult[0].values : [];
  const terms = rows.map((row) => ({ term_id: row[0], kind: row[1], name: row[2], count: 0 }));

  const countsResult = importState.db.exec(`
    SELECT pt.kind, pt.term_id, COUNT(pt.post_id) AS count
    FROM post_terms pt
    GROUP BY pt.kind, pt.term_id
    ORDER BY pt.kind, pt.term_id
  `);

  const countRows = countsResult && countsResult[0] ? countsResult[0].values : [];
  countRows.forEach((row) => {
    const kind = row[0];
    const termId = row[1];
    const count = Number(row[2]) || 0;
    const match = terms.find((term) => term.kind === kind && term.term_id === termId);
    if (match) match.count = count;
  });

  return { dbInstance: importState.db, terms, selectedFilter: importState.selectedFilter };
}

window.wordpressImport = {
  initializeDatabase,
  getDb: () => importState.db,
  getSelectedFilter: () => importState.selectedFilter,
  setSelectedFilter: (nextFilter) => { importState.selectedFilter = nextFilter; },
  getAllTerms: () => {
    if (!importState.db) return [];
    const result = importState.db.exec('SELECT term_id, kind, name FROM terms ORDER BY kind, name');
    const rows = result && result[0] ? result[0].values : [];
    return rows.map((row) => ({ term_id: row[0], kind: row[1], name: row[2] }));
  }
};
