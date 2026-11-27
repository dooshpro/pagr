const createView = document.getElementById('create-view');
const form = document.getElementById('create-form');
const contentEl = document.getElementById('content');
const customEl = document.getElementById('custom-slug');
const slugHint = document.getElementById('slug-hint');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');
const resultBox = document.getElementById('result');
const resultLink = document.getElementById('result-link');
const secretEl = document.getElementById('result-secret');
const copyBtn = document.getElementById('copy-btn');

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no l/o/0/1, they look alike (ik skill issue :P)

function makeSlug(len = 6) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

async function pickSlug(wanted) {
  if (wanted) return (await loadPage(wanted)) ? null : wanted;
  for (let i = 0; i < 3; i++) {
    const slug = makeSlug();
    if (!(await loadPage(slug))) return slug;
  }
  return null;
}

customEl.addEventListener('change', async () => {
  const wanted = customEl.value.trim().toLowerCase();
  slugHint.textContent = '';
  if (!wanted) return;

  const problem = slugProblem(wanted);
  if (problem) { slugHint.textContent = problem; return; }

  slugHint.textContent = 'checking...';
  try {
    const taken = await loadPage(wanted);
    if (customEl.value.trim().toLowerCase() !== wanted) return;
    slugHint.textContent = taken ? 'taken.' : 'available.';
  } catch (err) {
    slugHint.textContent = 'couldnt check.';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = contentEl.value.trim();
  if (!content) return;

  if (!crypto.subtle) {
    statusEl.textContent = 'open over https or localhost';
    return;
  }
  
  const wanted = customEl.value.trim().toLowerCase();
  const problem = wanted && slugProblem(wanted);
  if (problem) {
    statusEl.textContent = problem;
    return;
  }

  saveBtn.disabled = true;
  statusEl.textContent = 'checking...';

  let slug, keys;
  try {
    slug = await pickSlug(wanted);
    if (!slug) {
      statusEl.textContent = wanted ? 'that address is taken.' : 'couldnt find a free address, try again.';
      saveBtn.disabled = false;
      return;
    }

    keys = await makeKeys();
    await postRow(slug, content, `p1:${keys.pub}`);

    if (wanted) {
      statusEl.textContent = 'making sure its yours...';
      const page = await loadPage(slug, 5);
      if (page && page.pub !== keys.pub) {
        statusEl.textContent = 'someone grabbed that address a moment before you. try another.';
        saveBtn.disabled = false;
        return;
      }
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'couldnt save: ' + err.message;
    saveBtn.disabled = false;
    return;
  }

  statusEl.textContent = '';
  rememberSecret(slug, keys.secret);
  sessionStorage.setItem('just-saved', slug);
  const address = `${location.origin}/${slug}`;
  form.hidden = true;
  resultBox.hidden = false;
  resultLink.href = address;
  resultLink.textContent = address;
  secretEl.value = keys.secret;
});

secretEl.addEventListener('focus', () => secretEl.select());

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(secretEl.value);
    copyBtn.textContent = 'copied';
  } catch (err) {
    secretEl.select();
  }
});

document.getElementById('again-btn').addEventListener('click', () => {
  contentEl.value = '';
  customEl.value = '';
  slugHint.textContent = '';
  secretEl.value = '';
  copyBtn.textContent = 'copy';
  saveBtn.disabled = false;
  form.hidden = false;
  resultBox.hidden = true;
});

const params = new URLSearchParams(location.search);
const parts = location.pathname.split('/').filter(Boolean);

if (parts[0] && parts[0] !== 'index.html') {
  createView.hidden = true;
  if (parts[1] === 'edit') showEdit(parts[0]);
  else showPage(parts[0]);
} else if (params.get('p')) {
  createView.hidden = true;
  showPage(params.get('p'));
} else if (params.get('edit')) {
  createView.hidden = true;
  showEdit(params.get('edit'));
} else if (params.get('new')) {
  customEl.value = params.get('new').toLowerCase().slice(0, 32);
  customEl.dispatchEvent(new Event('change'));
}