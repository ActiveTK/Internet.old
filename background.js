const MATCHES = ['<all_urls>'];

const EXCLUDE = [
  'https://www.google.com/recaptcha/*',
  'https://recaptcha.google.com/*',
  'https://www.gstatic.com/recaptcha/*',
  'https://challenges.cloudflare.com/*',
  'https://newassets.hcaptcha.com/*',
  'https://*.hcaptcha.com/*',
  'https://accounts.google.com/*',
  'https://pay.google.com/*',
  'https://login.microsoftonline.com/*',
  'https://appleid.apple.com/*',
  'https://*.stripe.com/*',
  'https://*.paypal.com/*'
];

const SCRIPTS = [
  { id: 'internet-old-css', css: ['retro.css'], runAt: 'document_start' },
  { id: 'internet-old-bridge', js: ['bridge.js'], runAt: 'document_start' },
  { id: 'internet-old-shadow', js: ['shadow.js'], runAt: 'document_start', world: 'MAIN' },
  { id: 'internet-old-overlay', js: ['overlay.js'], runAt: 'document_end' }
];

const DEFAULTS = { enabled: true, disabled: [] };

function state() {
  return chrome.storage.local.get(DEFAULTS);
}

function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return /^[\w.-]+$/.test(u.hostname) ? u.hostname : null;
  } catch (e) {
    return null;
  }
}

async function sync() {
  const { enabled, disabled } = await state();

  try {
    await chrome.scripting.unregisterContentScripts();
  } catch (e) {}
  if (!enabled) return;

  const excludeMatches = EXCLUDE.concat(disabled.map((host) => '*://' + host + '/*'));
  const scripts = SCRIPTS.map((s) => Object.assign({
    matches: MATCHES,
    excludeMatches,
    allFrames: true,
    matchOriginAsFallback: true,
    persistAcrossSessions: true
  }, s));

  try {
    await chrome.scripting.registerContentScripts(scripts);
  } catch (e) {

    try {
      await chrome.scripting.registerContentScripts(scripts.map((s) => {
        const copy = Object.assign({}, s);
        delete copy.matchOriginAsFallback;
        return copy;
      }));
    } catch (e2) {}
  }
}

async function badge(tabId, url) {
  const { enabled, disabled } = await state();
  const host = hostOf(url);
  const off = !enabled || (host !== null && disabled.includes(host));
  try {
    await chrome.action.setBadgeText({ tabId, text: off ? 'OFF' : '' });
  } catch (e) {}
}

function refreshBadge() {
  chrome.tabs.query({ active: true }, (tabs) => {
    for (const tab of tabs) badge(tab.id, tab.url);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#808080' });
  sync();
});
chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener(() => {
  sync();
  refreshBadge();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!chrome.runtime.lastError && tab) badge(tab.id, tab.url);
  });
});
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'loading' || info.url) badge(tabId, tab.url);
});
