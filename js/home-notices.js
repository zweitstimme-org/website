/**
 * Inject homepage banners from /data/home_notices.json.
 * Survives home_info_de.html being overwritten by a pipeline or live-site sync.
 * Notices are also baked in so a 404 on the JSON cannot drop the evaluation link.
 */
(function () {
  'use strict';

  const FALLBACK_NOTICES = [
    {
      id: 'st-2026-evaluation',
      href: 'blog/posts/st-2026-evaluation/',
      text: 'Sachsen-Anhalt 2026: Evaluation der Vorhersagen',
      until: '2026-09-21'
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
