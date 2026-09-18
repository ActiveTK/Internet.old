const url = chrome.runtime.getURL('retro.css');

document.documentElement.setAttribute('data-internet-old-css', url);

fetch(url)
  .then((res) => res.text())
  .then((css) => {
    const style = document.createElement('style');
    style.id = 'internet-old-style';
    style.textContent = css;
    (document.head || document.documentElement).prepend(style);
  })
  .catch(() => {});
