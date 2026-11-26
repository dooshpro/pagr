const pageView = document.getElementById('page-view');
const pageStatus = document.getElementById('page-status');
const pageContent = document.getElementById('page-content');

const wait = ms => new Promise(r => setTimeout(r, ms));

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row);
      row = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchPage(slug) {
  const sql = `select * where B = '${slug}' order by A asc limit 1`;
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq`
    + `?tqx=out:csv&sheet=${CONFIG.sheetTab}&headers=1&tq=${encodeURIComponent(sql)}`;

  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('ts aint public');

  // columns: A time, B slug, C content, D proof
  return parseCSV(text).find(r => r[1] === slug) || null;
}

const BAD_TAGS = ['form', 'input', 'button', 'textarea', 'select', 'style'];

if (typeof DOMPurify !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') node.setAttribute('rel', 'noopener noreferrer nofollow');
  });
}

function renderInto(el, md) {
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    const pre = document.createElement('pre');
    pre.textContent = md;
    el.replaceChildren(pre);
    return;
  }
  const html = marked.parse(md, { breaks: true });
  el.innerHTML = DOMPurify.sanitize(html, {
    FORBID_TAGS: BAD_TAGS,
    FORBID_ATTR: ['style'],
  });
}

function getTitle(md, slug) {
  const first = md.split('\n').find(l => l.trim()) || '';
  const title = first
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') //[text](url) -> text
    .replace(/^#+\s*/, '')
    .replace(/[*_`>]/g, '')
    .trim();
  return title.slice(0, 60) || slug;
}

async function showPage(slug) {
  slug = slug.toLowerCase();
  pageView.hidden = false;

  // slug goes straight into query so only allow safe characters
  if (!/^[a-z0-9-]{1,32}$/.test(slug)) {
    pageStatus.textContent = 'page not found.';
    return;
  }

  pageStatus.textContent = 'loading...';
  const justSaved = sessionStorage.getItem('just-saved') === slug;
  const tries = justSaved ? 5 : 1;

  try {
    let row = null;
    for (let i = 0; i < tries && !row; i++) {
      if (i > 0) await wait(2000);
      row = await fetchPage(slug);
    }
    if (!row) {
      pageStatus.textContent = 'page not found.';
      return;
    }
    sessionStorage.removeItem('just-saved');
    pageStatus.textContent = '';
    renderInto(pageContent, row[2]);
    document.title = getTitle(row[2], slug);
  } catch (err) {
    console.error(err);
    pageStatus.textContent = 'could not load the page. try again in a bit.';
  }
}