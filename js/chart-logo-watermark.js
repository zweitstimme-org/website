/**
 * Draw the zweitstimme.org wordmark onto Chart.js canvases (and any 2d context)
 * so screenshots and copied images keep the source.
 */
(function (global) {
  'use strict';

  function isPreviewPage() {
    try {
      return /\/preview(?:\/|$)/.test(String((global.location && global.location.pathname) || ''));
    } catch (_) {
      return false;
    }
  }

  function logosEnabled() {
    if (global.ZWEITSTIMME_DISABLE_LOGO) return false;
    if (isPreviewPage()) return false;
    return true;
  }

  if (!logosEnabled()) {
    global.drawZweitstimmeWatermark = function () {};
    global.attachZweitstimmeWatermark = function () {};
    return;
  }

  var STATUS_IDLE = 'idle';
  var STATUS_LOADING = 'loading';
  var STATUS_READY = 'ready';
  var STATUS_ERROR = 'error';

  var status = STATUS_IDLE;
  var image = null;
  var waiters = [];

  function assetBase() {
    try {
      if (document.currentScript && document.currentScript.src) {
        return document.currentScript.src.replace(/js\/chart-logo-watermark\.js(\?.*)?$/i, '');
      }
    } catch (_) { /* ignore */ }
    var el = document.querySelector('script[src*="chart-logo-watermark.js"]');
    if (el && el.src) {
      return el.src.replace(/js\/chart-logo-watermark\.js(\?.*)?$/i, '');
    }
    if (global.pipelineData && typeof global.pipelineData.siteBase === 'function') {
      return global.pipelineData.siteBase();
    }
    return '/';
  }

  function logoSrcList() {
    if (typeof global.ZWEITSTIMME_LOGO_URL === 'string' && global.ZWEITSTIMME_LOGO_URL) {
      return [global.ZWEITSTIMME_LOGO_URL];
    }
    var base = String(assetBase() || '/').replace(/\/?$/, '/');
    return [
      base + 'images/logo_watermark.png',
      base + 'images/logo_orange.png'
    ];
  }

  function notify(img) {
    var pending = waiters.splice(0);
    pending.forEach(function (fn) {
      try { fn(img); } catch (_) { /* ignore */ }
    });
  }

  function loadFromList(urls, index) {
    if (index >= urls.length) {
      status = STATUS_ERROR;
      notify(null);
      injectOverlayStyle();
      return;
    }
    var img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      image = img;
      status = STATUS_READY;
      notify(img);
      injectOverlayStyle();
      refreshCharts();
      try {
        global.dispatchEvent(new Event('zweitstimme-logo-ready'));
      } catch (_) { /* ignore */ }
    };
    img.onerror = function () {
      loadFromList(urls, index + 1);
    };
    img.src = urls[index];
  }

  function ensureLogo(cb) {
    if (typeof cb === 'function') {
      if (status === STATUS_READY && image) {
        cb(image);
        return;
      }
      if (status === STATUS_ERROR) {
        cb(null);
        return;
      }
      waiters.push(cb);
    }
    if (status === STATUS_LOADING || status === STATUS_READY || status === STATUS_ERROR) return;
    status = STATUS_LOADING;
    loadFromList(logoSrcList(), 0);
  }

  function refreshCharts() {
    if (typeof Chart === 'undefined') return;
    var list = [];
    if (typeof Chart.getChart === 'function' && typeof document !== 'undefined') {
      var canvases = document.querySelectorAll('canvas');
      for (var i = 0; i < canvases.length; i++) {
        var found = Chart.getChart(canvases[i]);
        if (found) list.push(found);
      }
    }
    if (!list.length) {
      var instances = Chart.instances;
      list = instances instanceof Map
        ? Array.from(instances.values())
        : Object.values(instances || {});
    }
    list.forEach(function (chart) {
      if (chart && typeof chart.update === 'function') chart.update('none');
      else if (chart && typeof chart.draw === 'function') chart.draw();
    });
  }

  function logoCssUrl() {
    if (status === STATUS_READY && image && image.src) {
      return 'url("' + String(image.src).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
    }
    return 'none';
  }

  function injectOverlayStyle() {
    if (typeof document === 'undefined') return;
    var id = 'zs-wm-overlay-style';
    var style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      (document.head || document.documentElement).appendChild(style);
    }
    var imageUrl = logoCssUrl();
    var fallbackText = (status === STATUS_ERROR || imageUrl === 'none')
      ? '"zweitstimme.org"'
      : '""';
    var mark = [
      '  content: ' + fallbackText + ';',
      '  display: block;',
      '  width: 176px;',
      '  height: 32px;',
      '  padding: 4px 8px;',
      '  box-sizing: content-box;',
      '  pointer-events: none;',
      '  user-select: none;',
      '  border-radius: 5px;',
      '  opacity: 0.55;',
      '  background-color: rgba(255,255,255,0.35);',
      '  background-image: ' + imageUrl + ';',
      '  background-repeat: no-repeat;',
      '  background-size: contain;',
      '  background-position: center;',
      '  background-origin: content-box;',
      '  font: 600 11px system-ui, sans-serif;',
      '  color: rgba(0, 70, 100, 0.55);',
      '  line-height: 32px;',
      '  text-align: right;',
    ].join('\n');
    style.textContent = [
      '.zs-wm-host { position: relative; }',
      '.zs-wm-host:not(.zs-wm-host--map)::after { content: none !important; display: none !important; }',
      '.zs-wm-strip {',
      '  display: flex;',
      '  justify-content: flex-end;',
      '  align-items: center;',
      '  min-height: 36px;',
      '  margin-top: 8px;',
      '  pointer-events: none;',
      '  user-select: none;',
      '}',
      '.zs-wm-strip::after {',
      mark,
      '}',
      '.zs-wm-strip--compact { min-height: 30px; margin-top: 6px; }',
      '.zs-wm-strip--compact::after { width: 140px; height: 26px; padding: 3px 6px; line-height: 26px; }',
      '.zs-wm-host--map::after {',
      '  position: absolute;',
      '  right: 8px;',
      '  bottom: 26px;',
      '  z-index: 650;',
      mark,
      '}'
    ].join('\n');
  }

  function ensureStrip(el, compact) {
    if (!el || el.classList.contains('zs-wm-host--map')) return;
    if (el.querySelector(':scope > .zs-wm-strip, .zs-wm-strip')) return;
    var strip = document.createElement('div');
    strip.className = 'zs-wm-strip' + (compact ? ' zs-wm-strip--compact' : '');
    strip.setAttribute('aria-hidden', 'true');
    el.appendChild(strip);
  }

  function attachZweitstimmeWatermark(el, opts) {
    opts = opts || {};
    if (typeof el === 'string') {
      el = typeof document !== 'undefined' ? document.querySelector(el) : null;
    }
    if (!el || el.nodeType !== 1) return;
    injectOverlayStyle();
    el.classList.add('zs-wm-host');
    if (opts.map) el.classList.add('zs-wm-host--map');
    if (opts.compact) el.classList.add('zs-wm-host--compact');
    if (!opts.map) ensureStrip(el, !!opts.compact || el.classList.contains('zs-wm-host--compact'));
  }

  function scanOverlayHosts() {
    if (typeof document === 'undefined') return;
    var nodes = document.querySelectorAll('[data-zweitstimme-watermark], .zs-wm-host');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var kind = el.getAttribute('data-zweitstimme-watermark') || '';
      attachZweitstimmeWatermark(el, {
        map: kind === 'map' || el.classList.contains('zs-wm-host--map'),
        compact: kind === 'compact' || el.classList.contains('zs-wm-host--compact')
      });
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawTextFallback(ctx, area, opts) {
    opts = opts || {};
    var pad = opts.pad != null ? opts.pad : 8;
    var atBottom = (opts.anchor === 'bottom-right' || opts.anchor === 'bottom');
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 70, 100, 0.32)';
    ctx.textAlign = 'right';
    ctx.textBaseline = atBottom ? 'bottom' : 'top';
    ctx.fillText(
      'zweitstimme.org',
      area.right - pad,
      atBottom ? area.bottom - pad : area.top + pad
    );
    ctx.restore();
  }

  function drawZweitstimmeWatermark(ctx, area, opts) {
    opts = opts || {};
    if (!ctx || !area) return;
    var width = area.right - area.left;
    var height = area.bottom - area.top;
    if (!(width > 48 && height > 40)) return;

    ensureLogo();
    if (status !== STATUS_READY || !image || !image.width) {
      if (status === STATUS_ERROR) drawTextFallback(ctx, area, opts);
      return;
    }

    var maxW = Math.min(opts.maxWidth || 180, width * 0.48);
    var maxH = Math.min(opts.maxHeight || 34, height * 0.28);
    var scale = Math.min(maxW / image.width, maxH / image.height);
    var w = image.width * scale;
    var h = image.height * scale;
    var pad = opts.pad != null ? opts.pad : 8;
    var x = area.right - w - pad;
    var y = (opts.anchor === 'bottom-right' || opts.anchor === 'bottom')
      ? area.bottom - h - pad
      : area.top + pad;
    var boxPadX = 6;
    var boxPadY = 4;

    ctx.save();
    roundRect(ctx, x - boxPadX, y - boxPadY, w + boxPadX * 2, h + boxPadY * 2, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fill();
    ctx.globalAlpha = opts.opacity != null ? opts.opacity : 0.55;
    ctx.drawImage(image, x, y, w, h);
    ctx.restore();
  }

  var EXTRA_TOP = 0;

  function applyChartPadding(chart) {
    if (!chart || !chart.options) return;
    var padding;
    try {
      padding = chart.options.layout && chart.options.layout.padding;
    } catch (_) {
      return;
    }
    if (!padding || typeof padding !== 'object') return;
    var base = chart.$zsWmBaseTop;
    if (base == null) {
      try {
        base = Number(padding.top) || 0;
      } catch (_) {
        base = 0;
      }
      chart.$zsWmBaseTop = base;
    }
    try {
      padding.top = base + EXTRA_TOP;
    } catch (_) { /* Chart.js proxy may reject unknown keys; ignore */ }
  }

  var plugin = {
    id: 'zweitstimmeWatermark',
    beforeUpdate: function (chart, _args, pluginOpts) {
      if (pluginOpts && pluginOpts.display === false) return;
      try { applyChartPadding(chart); } catch (_) { /* ignore */ }
    },
    // afterDraw always runs (beforeTooltipDraw is skipped when tooltips are disabled).
    afterDraw: function (chart, _args, pluginOpts) {
      if (pluginOpts && pluginOpts.display === false) return;
      try {
        if (!chart || !chart.ctx) return;
        var ca = chart.chartArea;
        var area = (ca && ca.right > ca.left && ca.bottom > ca.top)
          ? { left: ca.left, top: ca.top, right: ca.right, bottom: ca.bottom }
          : { left: 0, top: 0, right: chart.width, bottom: chart.height };
        chart.ctx.save();
        chart.ctx.beginPath();
        chart.ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        chart.ctx.clip();
        drawZweitstimmeWatermark(chart.ctx, area, Object.assign({
          maxWidth: 168,
          maxHeight: 32,
          pad: 18,
          opacity: 0.55,
          anchor: 'top-right'
        }, pluginOpts || {}));
        chart.ctx.restore();
      } catch (e) {
        console.warn('zweitstimmeWatermark plugin error:', e);
      }
    }
  };

  function alreadyRegistered() {
    try {
      return !!(Chart.registry && Chart.registry.plugins && Chart.registry.plugins.get(plugin.id));
    } catch (_) {
      return false;
    }
  }

  function registerPlugin() {
    if (typeof Chart === 'undefined' || typeof Chart.register !== 'function') return false;
    if (alreadyRegistered()) return true;
    try {
      Chart.register(plugin);
      Chart.defaults.plugins = Chart.defaults.plugins || {};
      if (!Chart.defaults.plugins.zweitstimmeWatermark) {
        Chart.defaults.plugins.zweitstimmeWatermark = { display: true };
      }
      return true;
    } catch (e) {
      console.warn('zweitstimmeWatermark register failed:', e);
      return false;
    }
  }

  if (!registerPlugin() && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', registerPlugin);
  }
  ensureLogo();
  injectOverlayStyle();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanOverlayHosts);
    } else {
      scanOverlayHosts();
    }
  }

  global.drawZweitstimmeWatermark = drawZweitstimmeWatermark;
  global.attachZweitstimmeWatermark = attachZweitstimmeWatermark;
})(typeof window !== 'undefined' ? window : this);
