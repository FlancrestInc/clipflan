const state = {
  items: [],
  selectedId: null,
  filter: ''
};

const elements = {
  historyList: document.querySelector('#historyList'),
  historyFilter: document.querySelector('#historyFilter'),
  itemCount: document.querySelector('#itemCount'),
  refreshButton: document.querySelector('#refreshButton'),
  textInput: document.querySelector('#textInput'),
  imageInput: document.querySelector('#imageInput'),
  saveTextButton: document.querySelector('#saveTextButton'),
  clearTextButton: document.querySelector('#clearTextButton'),
  statusMessage: document.querySelector('#statusMessage'),
  previewTitle: document.querySelector('#previewTitle'),
  previewBody: document.querySelector('#previewBody'),
  copyButton: document.querySelector('#copyButton'),
  deleteButton: document.querySelector('#deleteButton'),
  pasteZone: document.querySelector('#pasteZone')
};

elements.saveTextButton.addEventListener('click', saveText);
elements.clearTextButton.addEventListener('click', () => {
  elements.textInput.value = '';
  setStatus('Text cleared.');
});
elements.refreshButton.addEventListener('click', () => loadItems({ quiet: false }));
elements.historyFilter.addEventListener('input', () => {
  state.filter = elements.historyFilter.value;
  renderHistory();
});
elements.imageInput.addEventListener('change', async () => {
  const [file] = elements.imageInput.files;
  if (file) await saveImage(file);
  elements.imageInput.value = '';
});
elements.copyButton.addEventListener('click', copySelected);
elements.deleteButton.addEventListener('click', deleteSelected);

document.addEventListener('paste', async (event) => {
  const image = [...event.clipboardData.files].find((file) => file.type.startsWith('image/'));
  if (!image) return;
  event.preventDefault();
  await saveImage(image);
});

document.addEventListener('dragover', (event) => {
  event.preventDefault();
  elements.pasteZone.classList.add('is-hot');
});

document.addEventListener('dragleave', () => {
  elements.pasteZone.classList.remove('is-hot');
});

document.addEventListener('drop', async (event) => {
  event.preventDefault();
  elements.pasteZone.classList.remove('is-hot');
  const image = [...event.dataTransfer.files].find((file) => file.type.startsWith('image/'));
  if (image) await saveImage(image);
});

await loadItems({ quiet: true });
setInterval(() => loadItems({ quiet: true }), 5000);

async function loadItems({ quiet } = { quiet: true }) {
  try {
    const response = await fetch('/api/items');
    const data = await parseResponse(response);
    state.items = data.items;
    if (!state.selectedId && state.items.length > 0) {
      state.selectedId = state.items[0].id;
    }
    if (state.selectedId && !state.items.some((item) => item.id === state.selectedId)) {
      state.selectedId = state.items[0]?.id || null;
    }
    render();
    if (!quiet) setStatus('History refreshed.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function saveText() {
  const text = elements.textInput.value;
  if (text.trim().length === 0) {
    setStatus('Add text before saving.', true);
    return;
  }

  try {
    const response = await fetch('/api/items/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await parseResponse(response);
    elements.textInput.value = '';
    state.selectedId = data.item.id;
    await loadItems({ quiet: true });
    setStatus('Text saved.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function saveImage(file) {
  const form = new FormData();
  form.append('image', file);

  try {
    const response = await fetch('/api/items/image', {
      method: 'POST',
      body: form
    });
    const data = await parseResponse(response);
    state.selectedId = data.item.id;
    await loadItems({ quiet: true });
    setStatus('Image saved.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function copySelected() {
  const item = selectedItem();
  if (!item) return;

  try {
    if (item.kind === 'text') {
      await navigator.clipboard.writeText(item.textContent);
    } else {
      const response = await fetch(item.fileUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    }
    setStatus('Copied to clipboard.');
  } catch (_error) {
    setStatus('Browser blocked clipboard access. Use HTTPS or localhost and try again.', true);
  }
}

async function deleteSelected() {
  const item = selectedItem();
  if (!item) return;

  try {
    const response = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) await parseResponse(response);
    state.selectedId = null;
    await loadItems({ quiet: true });
    setStatus('Item deleted.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

function render() {
  elements.itemCount.textContent = String(state.items.length);
  renderHistory();
  renderPreview();
}

function renderHistory() {
  const filter = state.filter.trim().toLowerCase();
  const visibleItems = state.items.filter((item) => {
    if (!filter) return true;
    return item.kind === 'text'
      ? item.textContent.toLowerCase().includes(filter)
      : item.mimeType.toLowerCase().includes(filter);
  });

  elements.historyList.replaceChildren(
    ...visibleItems.map((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `history-item${item.id === state.selectedId ? ' is-selected' : ''}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', item.id === state.selectedId ? 'true' : 'false');
      button.addEventListener('click', () => {
        state.selectedId = item.id;
        render();
      });

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      if (item.kind === 'image') {
        const img = document.createElement('img');
        img.src = item.fileUrl;
        img.alt = '';
        thumb.append(img);
      } else {
        thumb.textContent = 'T';
      }

      const main = document.createElement('div');
      main.className = 'item-main';
      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = item.kind === 'text' ? previewText(item.textContent) : 'Image paste';
      const meta = document.createElement('div');
      meta.className = 'item-meta';
      meta.textContent = `${item.kind} · ${formatBytes(item.byteSize)} · ${formatDate(item.createdAt)}`;
      main.append(title, meta);
      button.append(thumb, main);
      return button;
    })
  );

  if (visibleItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = state.items.length === 0 ? 'No pasted items yet.' : 'No matching items.';
    elements.historyList.append(empty);
  }
}

function renderPreview() {
  const item = selectedItem();
  elements.copyButton.disabled = !item;
  elements.deleteButton.disabled = !item;

  if (!item) {
    elements.previewTitle.textContent = 'Nothing selected';
    elements.previewBody.className = 'preview-body empty-state';
    elements.previewBody.textContent = 'Select an item from history or create a new paste.';
    return;
  }

  elements.previewTitle.textContent = item.kind === 'text' ? 'Text paste' : 'Image paste';
  elements.previewBody.className = 'preview-body';
  elements.previewBody.replaceChildren();

  if (item.kind === 'text') {
    const pre = document.createElement('pre');
    pre.className = 'text-preview';
    pre.textContent = item.textContent;
    elements.previewBody.append(pre);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'image-preview';
  const image = document.createElement('img');
  image.src = item.fileUrl;
  image.alt = 'Selected pasted item';
  const meta = document.createElement('p');
  meta.className = 'image-meta';
  meta.textContent = `${item.mimeType} · ${formatBytes(item.byteSize)} · ${formatDate(item.createdAt)}`;
  wrap.append(image, meta);
  elements.previewBody.append(wrap);
}

function selectedItem() {
  return state.items.find((item) => item.id === state.selectedId) || null;
}

async function parseResponse(response) {
  if (response.ok) {
    if (response.status === 204) return {};
    return response.json();
  }

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  throw new Error(payload?.error?.message || `Request failed with status ${response.status}.`);
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? 'var(--red)' : 'var(--muted)';
}

function previewText(text) {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length > 80 ? `${singleLine.slice(0, 77)}...` : singleLine;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}
