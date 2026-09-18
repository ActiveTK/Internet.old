(function () {
  if (!Element.prototype.attachShadow) return;

  var sheet = null;
  var ready = false;
  var failed = false;
  var pending = [];
  var waiting = [];
  var timer = 0;

  function cssUrl() {
    return document.documentElement.getAttribute('data-internet-old-css');
  }

  function adopt(root) {
    try {
      root.adoptedStyleSheets = root.adoptedStyleSheets.concat(sheet);
    } catch (e) {}
  }

  function load(url) {
    if (sheet || failed || typeof CSSStyleSheet !== 'function') return;
    try {
      sheet = new CSSStyleSheet();
    } catch (e) {
      failed = true;
      return;
    }
    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (css) {
        sheet.replaceSync(css);
        ready = true;
        while (pending.length) adopt(pending.shift());
      })
      .catch(function () {
        failed = true;
        pending.length = 0;
      });
  }

  function poll() {
    if (timer) return;
    var tries = 0;
    timer = setInterval(function () {
      if (cssUrl()) {
        clearInterval(timer);
        timer = 0;
        var queue = waiting;
        waiting = [];
        for (var i = 0; i < queue.length; i++) inject(queue[i]);
      } else if (++tries > 200) {
        clearInterval(timer);
        timer = 0;
        waiting.length = 0;
      }
    }, 10);
  }

  function inject(root) {
    var url = cssUrl();
    if (!url) {
      waiting.push(root);
      poll();
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    root.appendChild(link);

    load(url);
    if (ready) adopt(root);
    else if (!failed) pending.push(root);
  }

  var original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    var root = original.call(this, init);
    try {
      inject(root);
    } catch (e) {}
    return root;
  };
})();
