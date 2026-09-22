let db = null;
let selectedFilter = { kind: 'category', name: 'ALL' };

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function renderFilters(terms) {
  const container = document.getElementById('filter-controls');
  const groups = { category: [], tag: [] };

  terms.forEach((term) => {
    if (term.kind === 'category') groups.category.push(term);
    if (term.kind === 'tag') groups.tag.push(term);
  });

  const buildFilterButtons = (kind, list) => {
    const buttons = [
      `<a class="filter-link ${kind === 'category' ? '' : 'tag'} ${selectedFilter && selectedFilter.kind === kind && selectedFilter.name === 'ALL' ? 'active' : ''}" href="#" data-kind="${kind}" data-name="ALL">All ${kind === 'category' ? 'categories' : 'tags'}</a>`
    ];

    list.forEach((term) => {
      const isActive = selectedFilter && selectedFilter.kind === kind && selectedFilter.name === term.name;
      buttons.push(
        `<a class="filter-link ${kind === 'category' ? '' : 'tag'} ${isActive ? 'active' : ''}" href="#" data-kind="${kind}" data-name="${escapeHtml(term.name)}">${escapeHtml(term.name)} (${term.count})</a>`
      );
    });

    return buttons.join('');
  };

  container.innerHTML = `
    <div class="filter-group">
      <span class="filter-label">Categories</span>
      <div class="filter-list">${buildFilterButtons('category', groups.category)}</div>
    </div>
    <div class="filter-group">
      <span class="filter-label">Tags</span>
      <div class="filter-list">${buildFilterButtons('tag', groups.tag)}</div>
    </div>
  `;

  container.querySelectorAll('.filter-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const kind = link.getAttribute('data-kind');
      const name = link.getAttribute('data-name');
      selectedFilter = { kind, name };
      renderFilters(window.wordpressImport.getAllTerms().map((term) => ({
        ...term,
        count: getTermCount(term.kind, term.term_id)
      })));
      renderPosts();
    });
  });
}

function getTermCount(kind, termId) {
  const result = db.exec(`
    SELECT COUNT(*) as count
    FROM post_terms
    WHERE kind = ? AND term_id = ?
  `, [kind, termId]);
  return Number(result[0].values[0][0] || 0);
}

function renderPosts() {
  const container = document.getElementById('posts');

  let sql = `
    SELECT p.id, p.title, p.link, p.date, p.content, p.excerpt, p.status, p.post_name
    FROM posts p
  `;
  let params = [];

  if (selectedFilter && selectedFilter.name !== 'ALL') {
    sql += `
      INNER JOIN post_terms pt ON pt.post_id = p.id
      INNER JOIN terms t ON t.term_id = pt.term_id AND t.kind = pt.kind
      WHERE t.kind = ? AND t.name = ?
    `;
    params = [selectedFilter.kind, selectedFilter.name];
  }

  sql += ` ORDER BY p.row_order ASC`;

  const result = db.exec(sql, params);
  const rows = result && result[0] ? result[0].values : [];

  if (!rows.length) {
    container.innerHTML = '<div class="empty">No posts match this filter.</div>';
    return;
  }

  const columns = result[0].columns;
  const posts = rows.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });

  container.innerHTML = posts.map((post) => {
    const title = post.title || 'Untitled post';
    const content = post.content && post.content.trim() ? post.content : (post.excerpt || '<p>No content available.</p>');
    return `
      <article class="post">
        <h2>${escapeHtml(title)}</h2>
        <div class="post-meta">Published: ${escapeHtml(formatDate(post.date))}</div>
        <div class="post-content">${content}</div>
      </article>
    `;
  }).join('');
}

async function startApp() {
  const postsContainer = document.getElementById('posts');
  const filterContainer = document.getElementById('filter-controls');

  if (postsContainer) {
    postsContainer.innerHTML = '<div class="empty">Loading posts...</div>';
  }

  try {
    if (!window.wordpressImport || typeof window.wordpressImport.initializeDatabase !== 'function') {
      throw new Error('The WordPress import module is not available yet.');
    }

    const importState = await window.wordpressImport.initializeDatabase();
    db = importState.dbInstance;
    selectedFilter = { kind: 'category', name: 'ALL' };

    const terms = importState.terms.map((term) => ({
      ...term,
      count: getTermCount(term.kind, term.term_id)
    }));

    renderFilters(terms);
    renderPosts();
  } catch (error) {
    console.error(error);
    if (postsContainer) {
      postsContainer.innerHTML = `
        <div class="error">
          The WordPress export could not be loaded. Please confirm the file is present and served from the same folder as this page.
        </div>
      `;
    }
    if (filterContainer) {
      filterContainer.innerHTML = '';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startApp();
  }, { once: true });
} else {
  startApp();
}
