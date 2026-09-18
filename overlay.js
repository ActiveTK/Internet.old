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

  const half = MAX_SCAN / 2;
  const picked = [];
  for (let i = 0; i < half; i++) picked.push(nodes[i]);
  for (let i = n - half; i < n; i++) picked.push(nodes[i]);
  return picked;
}

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

    if (el.namespaceURI === SVG_NS && style.fill === 'rgb(255, 255, 255)') {
      marks.push([el, 'data-internet-old-white']);
    }

    if ((style.maskImage && style.maskImage !== 'none') ||
        (style.webkitMaskImage && style.webkitMaskImage !== 'none')) {
      marks.push([el, 'data-internet-old-mask']);
    }

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
      again(el);
      continue;
    }
    done.add(el);

    if (textured && box.width >= vw * 0.8 && box.height >= vh * 0.6) {
      marks.push([el, 'data-internet-old-flat']);
    }

    const coversAll = box.width >= vw * 0.95 && box.height >= vh * 0.95;
    if (floating && !coversAll && style.pointerEvents !== 'none') {
      marks.push([el, 'data-internet-old-panel']);
    }
  }

  for (const [el, name] of marks) el.setAttribute(name, '');
}

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
