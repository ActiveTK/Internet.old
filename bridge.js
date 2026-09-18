/* manifest の css 注入はカスケードレイヤーの並び順が保証されないので、
   ページ自身のスタイルシートとして head の先頭にも入れ直す。
   こうすると @layer internet-old が最初のレイヤーとして登録され、
   サイト側の !important より確実に強くなる。 */

const url = chrome.runtime.getURL('retro.css');

/* MAIN world の shadow.js に場所を渡す */
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
