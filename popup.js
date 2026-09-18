const all = document.getElementById('all');
const site = document.getElementById('site');
const siteRow = document.getElementById('siteRow');

document.getElementById('allText').textContent = chrome.i18n.getMessage('popupAll');
document.getElementById('siteText').textContent = chrome.i18n.getMessage('popupSite');

let host = null;

function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return /^[\w.-]+$/.test(u.hostname) ? u.hostname : null;
  } catch (e) {
    return null;
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function render() {
  const tab = await activeTab();
  host = tab ? hostOf(tab.url) : null;
  const { enabled, disabled } = await chrome.storage.local.get({ enabled: true, disabled: [] });

  all.checked = enabled;
  site.checked = enabled && host !== null && !disabled.includes(host);
  site.disabled = !enabled || host === null;
  siteRow.classList.toggle('off', site.disabled);
  document.getElementById('host').textContent =
    host === null ? chrome.i18n.getMessage('popupNoSite') : host;
}

async function reload() {
  const tab = await activeTab();
  if (tab) chrome.tabs.reload(tab.id);
}

all.addEventListener('change', async () => {
  await chrome.storage.local.set({ enabled: all.checked });
  await render();
  reload();
});

site.addEventListener('change', async () => {
  if (host === null) return;
  const { disabled } = await chrome.storage.local.get({ disabled: [] });
  const next = site.checked
    ? disabled.filter((h) => h !== host)
    : disabled.concat(host);
  await chrome.storage.local.set({ disabled: next });
  await render();
  reload();
});

render();
