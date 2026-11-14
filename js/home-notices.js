/**
 * Inject homepage banners from /data/home_notices.json.
 * Survives home_info_de.html being overwritten by a pipeline or live-site sync.
 * Notices are also baked in so a 404 on the JSON cannot drop the evaluation link.
 */
(function () {
  'use strict';

  const FALLBACK_NOTICES = [
    {
      id: 'be-mv-2026-evaluation',
      href: 'blog/posts/be-mv-2026-evaluation/',
      text: 'Berlin und Mecklenburg-Vorpommern 2026: Evaluation der Vorhersagen',
      until: '2026-10-12'
    }
  ];

  function siteBase() {
    try {
      if (window.pipelineData && window.pipelineData.SITE_BASE) {
        return String(window.pipelineData.SITE_BASE).replace(/\/?$/, '/');
      }
    } catch (_) { /* ignore */ }
    if (/\.github\.io$/i.test(location.hostname)) {
      const parts = location.pathname.split('/').filter(Boolean);
      if (parts.length) return `/${parts[0]}/`;
    }
    return '/';
  }

  function parseDay(raw) {
    const m = String(raw || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function todayUTC() {
    const n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function isActive(notice) {
    if (!notice || !notice.href || !notice.text) return false;
    if (!notice.until) return true;
    const until = parseDay(notice.until);
    if (until === null) return true;
    return todayUTC() < until;
  }

  function joinUrl(base, href) {
    const path = String(href || '').replace(/^\//, '');
    return `${base}${path}`;
  }

  function findMount() {
    const vorhersage = document.querySelector('#vorhersage-section .content-wrapper');
    if (vorhersage) return { parent: vorhersage, before: vorhersage.firstElementChild };
    const intro = document.querySelector('#home-intro-section .entry-content');
    if (intro) {
      const nav = intro.querySelector('.home-jump-nav');
      return { parent: intro, before: nav ? nav.nextSibling : intro.firstChild };
    }
    const home = document.querySelector('.first-entry.home-info');
    if (home) return { parent: home, before: home.firstChild };
    return null;
  }

  function ensureStyles() {
    if (document.querySelector('style[data-home-notices-css]')) return;
    const s = document.createElement('style');
    s.setAttribute('data-home-notices-css', '1');
    s.textContent =
      '.home-eval-banners{max-width:700px;margin:0 auto 1.15rem}' +
      '.home-eval-banner{margin:0 0 .55rem;padding:.7rem 1rem;border:1px solid #e6e6e6;border-left:3px solid var(--primary,#3a4654);border-radius:0 8px 8px 0;background:#f6f7f8;text-align:center;font-size:.95rem;line-height:1.4}' +
      '.home-eval-banner:last-child{margin-bottom:0}' +
      '.home-eval-banner a{color:var(--primary);font-weight:600;text-decoration:none!important}' +
      '.home-eval-banner a:hover,.home-eval-banner a:focus-visible{text-decoration:underline!important}';
    document.head.appendChild(s);
  }

  function render(notices, base) {
    const wrap = document.createElement('div');
    wrap.className = 'home-eval-banners';
    wrap.setAttribute('data-home-notices', '1');
    notices.forEach((notice) => {
      const p = document.createElement('p');
      p.className = 'home-eval-banner';
      if (notice.style) p.classList.add(`home-eval-banner--${notice.style}`);
      p.setAttribute('data-notice-id', String(notice.id || ''));
      const a = document.createElement('a');
      a.href = joinUrl(base, notice.href);
      a.textContent = notice.text;
      p.appendChild(a);
      wrap.appendChild(p);
    });
    return wrap;
  }

  async function init() {
    if (!document.querySelector('.first-entry.home-info')) return;
    if (document.querySelector('[data-home-notices]')) return;
    const base = siteBase();
    let payload;
    try {
      const resp = await fetch(`${base}data/home_notices.json`, { cache: 'no-cache' });
      if (resp.ok) payload = await resp.json();
    } catch (_) {
      payload = null;
    }
    const fromJson = Array.isArray(payload && payload.notices) ? payload.notices : null;
    const notices = (fromJson && fromJson.length ? fromJson : FALLBACK_NOTICES).filter(isActive);
    if (!notices.length) return;
    ensureStyles();
    const mount = findMount();
    if (!mount || !mount.parent) return;
    const node = render(notices, base);
    if (mount.before) mount.parent.insertBefore(node, mount.before);
    else mount.parent.appendChild(node);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
