const editView = document.getElementById('edit-view');
const editStatus = document.getElementById('edit-status');
const editForm = document.getElementById('edit-form');
const editContent = document.getElementById('edit-content');
const editSecret = document.getElementById('edit-secret');
const editSaveBtn = document.getElementById('edit-save-btn');
const editDeleteBtn = document.getElementById('edit-delete-btn');
const editCancel = document.getElementById('edit-cancel');

let editSlug = '';

function setBusy(busy) {
  editSaveBtn.disabled = busy;
  editDeleteBtn.disabled = busy;
}

async function showEdit(slug) {
  slug = slug.toLowerCase();
  editSlug = slug;
  editView.hidden = false;
  editCancel.href = `?p=${slug}`;

  if (!SLUG_RE.test(slug)) {
    editStatus.textContent = 'page not found.';
    return;
  }

  editStatus.textContent = 'loading...';
  let page;
  try {
    page = await loadPage(slug);
  } catch (err) {
    console.error(err);
    editStatus.textContent = 'could not load the page. try again in a bit.';
    return;
  }

  if (!page) { editStatus.textContent = 'page not found.'; return; }
  if (page.deleted) { editStatus.textContent = 'this page was deleted.'; return; }
  if (!page.pub) {
    editStatus.textContent = 'this page was made before edit codes existed, so it cant be edited.';
    return;
  }

  editContent.value = page.content;
  editSecret.value = getSecret(slug) || '';
  editStatus.textContent = '';
  editForm.hidden = false;
}

async function change(action) {
  const secret = editSecret.value.trim();
  const content = action === 'edit' ? editContent.value.trim() : 'deleted';
  if (!secret || !content) {
    editStatus.textContent = 'content and edit code are both needed.';
    return;
  }

  setBusy(true);
  editStatus.textContent = 'checking...';
  try {
    const page = await loadPage(editSlug);
    if (!page || page.deleted) throw new Error('page is gone');

    const version = page.version + 1;
    const proof = await signedProof(secret, page.pub, editSlug, version, action, content);

    editStatus.textContent = 'saving...';
    await postRow(editSlug, content, proof);
    rememberSecret(editSlug, secret);

    const done = await loadPage(editSlug, 8, p => p.version >= version);
    if (!done || done.version < version) {
      editStatus.textContent = 'sent, but it hasnt shown up yet. check the page in a minute.';
      setBusy(false);
      return;
    }

    if (action === 'delete') {
      editForm.hidden = true;
      editStatus.textContent = 'page deleted.';
    } else {
      location.href = `?p=${editSlug}`;
    }
  } catch (err) {
    console.error(err);
    editStatus.textContent = err.message === 'wrong edit code'
      ? 'wrong edit code.'
      : 'couldnt do that: ' + err.message;
    setBusy(false);
  }
}

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  change('edit');
});

editDeleteBtn.addEventListener('click', () => {
  if (confirm('delete this page for good?')) change('delete');
});