const pageView = document.getElementById('page-view');
const pageStatus = document.getElementById('page-status');
const pageContent = document.getElementById('page-content');
const editLink = document.getElementById('edit-link');
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

function showNotFound(slug) {
  document.title = 'not found';
  pageStatus.textContent = 'page not found.';
  if (!slugProblem(slug)) {
    const a = document.createElement('a');
    a.href = `/?new=${slug}`;
    a.textContent = 'create it?';
    pageStatus.append(' ', a);
  }
}

function draw(slug, page) {
  if (page.deleted) {
    pageContent.replaceChildren();
    editLink.hidden = true;
    pageStatus.textContent = 'this page was deleted by its owner.';
    document.title = 'deleted';
    return;
  }
  pageStatus.textContent = '';
  renderInto(pageContent, page.content);
  document.title = getTitle(page.content, slug);
  if (page.pub) {
    editLink.href = `/${slug}/edit`;
    editLink.hidden = false;
  }
}

async function showPage(slug) {
  slug = slug.toLowerCase();
  pageView.hidden = false;

  // slug goes straight into query so only allow safe characters
  if (!SLUG_RE.test(slug)) {
    showNotFound(slug);
    return;
  }

  const cached = cacheGet(slug);
  const cachedOk = cached && !cached.deleted;
  if (cachedOk) draw(slug, cached);
  else pageStatus.textContent = 'loading...';

  const justSaved = sessionStorage.getItem('just-saved') === slug;

  try {
    const page = await loadPage(slug, justSaved ? 5 : 1);
    if (!page) {
      cacheDrop(slug);
      pageContent.replaceChildren();
      editLink.hidden = true;
      showNotFound(slug);
      return;
    }
    sessionStorage.removeItem('just-saved');
    cacheSet(slug, page);

    if (cachedOk && !page.deleted && cached.version === page.version && cached.content === page.content) return;
    draw(slug, page);
  } catch (err) {
    console.error(err);
    if (!cachedOk) pageStatus.textContent = 'could not load the page. try again in a bit.';
  }
}