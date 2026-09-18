/* CSSでは要素の位置や大きさを条件にできないので、ここだけJSで見る。
   - 画面いっぱいの背景画像: 上に乗る文字が読めなくなるので消す
   - 浮いている小さな要素: 背景が透明だと下の文字と重なるので不透明にする
   印を付けるだけで、実際の指定は retro.css 側で行う。

   読み取りと書き込みは分ける。属性を付けた直後に getComputedStyle を呼ぶと
   要素ごとにスタイル再計算が走るので、印は最後にまとめて付ける。 */

const MAX_SCAN = 8000;
const MAX_RETRY = 3;
const SVG_NS = 'http://www.w3.org/2000/svg';
const done = new WeakSet();
const retries = new WeakMap();

const idle = window.requestIdleCallback
  ? (fn) => window.requestIdleCallback(fn, { timeout: 1000 })
  : (fn) => fn();

function targets() {
  const nodes = document.body.querySelectorAll('*');
  const n = nodes.length;
  if (n <= MAX_SCAN) return nodes;
  /* 要素が多すぎるときは先頭と末尾だけ見る。
     後から差し込まれるバナーは末尾にいることが多い。 */
  const half = MAX_SCAN / 2;
  const picked = [];
  for (let i = 0; i < half; i++) picked.push(nodes[i]);
  for (let i = n - half; i < n; i++) picked.push(nodes[i]);
  return picked;
}

/* 私用領域の文字だけを持つ要素はアイコンフォント。書体を変えると豆腐になる */
function isIcon(el) {
  if (el.childElementCount !== 0) return false;
  const text = el.textContent;
  if (!text || text.length > 3) return false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0xe000 || code > 0xf8ff) return false;
  }
  return true;
}

/* 大きさが決まるまで何度か見送るが、いつまでも0のままの要素を
   毎回数え直すと重いので、回数で打ち切る。 */
function again(el) {
  const n = (retries.get(el) || 0) + 1;
  if (n >= MAX_RETRY) {
    done.add(el);
    retries.delete(el);
  } else {
    retries.set(el, n);
  }
}

function scan() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!document.body || !vw || !vh) return;

  const marks = [];

  for (const el of targets()) {
    if (done.has(el)) continue;

    if (isIcon(el)) marks.push([el, 'data-internet-old-icon']);

    const style = getComputedStyle(el);

    /* 暗い背景に置く前提で白く塗られたSVG。背景を灰色にすると見えなくなる。
       属性ではなくCSSで塗っているものはここでしか拾えない。 */
    if (el.namespaceURI === SVG_NS && style.fill === 'rgb(255, 255, 255)') {
      marks.push([el, 'data-internet-old-white']);
    }

    /* mask を使って描かれたアイコン。背景色が絵柄になる */
    if ((style.maskImage && style.maskImage !== 'none') ||
        (style.webkitMaskImage && style.webkitMaskImage !== 'none')) {
      marks.push([el, 'data-internet-old-mask']);
    }
    /* absolute は飾りにも使われるので、z-index が指定されていて
       文字を持つものだけ、重なりを隠す箱とみなす。 */
    const stacked = style.position === 'absolute' && style.zIndex !== 'auto' &&
      el.textContent.trim().length > 0;
    const floating = style.position === 'fixed' || style.position === 'sticky' || stacked;
    const textured = style.backgroundImage !== 'none';
    if (!floating && !textured) {
      done.add(el);
      continue;
    }

    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) {
      again(el); /* まだ描かれていない。次の回で見る */
      continue;
    }
    done.add(el);

    if (textured && box.width >= vw * 0.8 && box.height >= vh * 0.6) {
      marks.push([el, 'data-internet-old-flat']);
    }
    /* 画面全体を覆うものは、背景を敷くと下が見えなくなるので除く。
       クリックを透過する飾りも除く。 */
    const coversAll = box.width >= vw * 0.95 && box.height >= vh * 0.95;
    if (floating && !coversAll && style.pointerEvents !== 'none') {
      marks.push([el, 'data-internet-old-panel']);
    }
  }

  for (const [el, name] of marks) el.setAttribute(name, '');
}

/* 後から差し込まれるバナーや、入れ替わるスライドにも追従する。
   一度見た要素は WeakSet に入れて二度目は数えないので、繰り返しても軽い。 */
let queued = 0;
function schedule() {
  if (queued) return;
  queued = setTimeout(() => {
    queued = 0;
    idle(scan);
  }, 400);
}

scan();
window.addEventListener('load', scan);
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class']
});
