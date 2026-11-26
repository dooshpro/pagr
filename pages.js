const SLUG_RE = /^[a-z0-9-]{1,32}$/;

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

async function fetchRows(slug) {
  const sql = `select * where B = '${slug}' order by A asc`;
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq`
    + `?tqx=out:csv&sheet=${CONFIG.sheetTab}&headers=1&tq=${encodeURIComponent(sql)}`;

  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('ts aint public');

  // columns: A time, B slug, C content, D proof
  return parseCSV(text).filter(r => r[1] === slug);
}

const clean = s => s.replace(/\r/g, '').trim();
const messageFor = (slug, version, action, content) =>
  JSON.stringify([slug, version, action, clean(content)]);

async function buildPage(slug, rows) {
  const base = rows.findIndex(r => !r[3] || r[3].startsWith('p1:'));
  if (base === -1) return null;

  const first = rows[base];
  const pub = first[3] ? first[3].slice(3) : null;
  const page = { slug, content: first[2], version: 0, pub, deleted: false };
  if (!pub) return page;

  for (const r of rows.slice(base + 1)) {
    const [kind, v, sig] = (r[3] || '').split(':');
    if (kind !== 's1' && kind !== 'd1') continue;

    const version = Number(v);
    if (version !== page.version + 1 || !sig) continue;

    const action = kind === 's1' ? 'edit' : 'delete';
    let ok = false;
    try {
      ok = await verify(pub, messageFor(slug, version, action, r[2]), sig);
    } catch (err) {
      // garbage in proof column. ignore the row
    }
    if (!ok) continue;

    page.version = version;
    if (action === 'delete') {
      page.deleted = true;
      page.content = '';
      break;
    }
    page.content = clean(r[2]);
  }
  return page;
}

async function loadPage(slug, tries = 1, ready = () => true) {
  let page = null;
  for (let i = 0; i < tries; i++) {
    if (i > 0) await wait(2000);
    page = await buildPage(slug, await fetchRows(slug));
    if (page && ready(page)) return page;
  }
  return page;
}

async function postRow(slug, content, proof) {
  const body = new URLSearchParams();
  body.append(CONFIG.entry.slug, slug);
  body.append(CONFIG.entry.content, content);
  body.append(CONFIG.entry.proof, proof);

  const url = `https://docs.google.com/forms/d/e/${CONFIG.formId}/formResponse`;
  await fetch(url, { method: 'POST', mode: 'no-cors', body });
}

async function signedProof(secret, pub, slug, version, action, content) {
  const msg = messageFor(slug, version, action, content);
  let sig;
  try {
    sig = await sign(secret, pub, msg);
  } catch (err) {
    throw new Error('wrong edit code');
  }
  if (!(await verify(pub, msg, sig))) throw new Error('wrong edit code');
  return `${action === 'edit' ? 's1' : 'd1'}:${version}:${sig}`;
}