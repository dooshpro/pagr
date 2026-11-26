const createView = document.getElementById('create-view');
const form = document.getElementById('create-form');
const contentEl = document.getElementById('content');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');
const resultBox = document.getElementById('result');
const resultLink = document.getElementById('result-link');

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no l/o/0/1, they look alike (ik skill issue :P)

function makeSlug(len = 6) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

async function savePage(slug, content) {
  const body = new URLSearchParams();
  body.append(CONFIG.entry.slug, slug);
  body.append(CONFIG.entry.content, content);
  body.append(CONFIG.entry.proof, '');

  const url = `https://docs.google.com/forms/d/e/${CONFIG.formId}/formResponse`;
  await fetch(url, { method: 'POST', mode: 'no-cors', body });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = contentEl.value.trim();
  if (!content) return;

  saveBtn.disabled = true;
  statusEl.textContent = '';

  const slug = makeSlug();
  try {
    await savePage(slug, content);
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'couldnt save. check ur connection and try again.';
    saveBtn.disabled = false;
    return;
  }

  sessionStorage.setItem('just-saved', slug);
  const address = `${location.origin}${location.pathname}?p=${slug}`;
  form.hidden = true;
  resultBox.hidden = false;
  resultLink.href = address;
  resultLink.textContent = address;
});

document.getElementById('again-btn').addEventListener('click', () => {
  contentEl.value = '';
  saveBtn.disabled = false;
  form.hidden = false;
  resultBox.hidden = true;
});

const slugParam = new URLSearchParams(location.search).get('p');
if (slugParam) {
  createView.hidden = true;
  showPage(slugParam);
}