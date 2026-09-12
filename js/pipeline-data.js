/**
 * Load precomputed pipeline JSON (Stimmung, forecasts, display mode).
 * Served from /data/*.json committed by website-pipeline GitHub Actions.
 */
(function () {
  function detectSiteBase() {
    try {
      if (document.currentScript && document.currentScript.src) {
        return document.currentScript.src.replace(/js\/pipeline-data\.js(\?.*)?$/, '');
      }
    } catch (_) { /* ignore */ }
    const el = document.querySelector('script[src*="pipeline-data.js"]');
    if (el && el.src) {
      return el.src.replace(/js\/pipeline-data\.js(\?.*)?$/, '');
    }
    // Project GitHub Pages: /<repo>/
    if (/\.github\.io$/i.test(location.hostname)) {
      const parts = location.pathname.split('/').filter(Boolean);
      if (parts.length) return `/${parts[0]}/`;
    }
    return '/';
  }

  const SITE_BASE = detectSiteBase().replace(/\/?$/, '/');
  const DATA_BASE = `${SITE_BASE}data`;

  async function fetchJson(path, opts) {
    const timeoutMs = (opts && opts.timeoutMs) || 30000;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl
      ? setTimeout(() => ctrl.abort(), timeoutMs)
      : null;
    try {
      const resp = await fetch(path, {
        cache: 'no-cache',
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
      return await resp.json();
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error(`Timeout after ${timeoutMs}ms: ${path}`);
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function loadDisplayMode() {
    return fetchJson(`${DATA_BASE}/display_mode.json`);
  }

  async function loadStimmungFederal() {
    return fetchJson(`${DATA_BASE}/stimmung_federal.json`);
  }

  async function loadStimmungStates() {
    return fetchJson(`${DATA_BASE}/stimmung_states.json`);
  }

  async function loadStimmungState(stateCode) {
    const all = await loadStimmungStates();
    const code = String(stateCode || '').toUpperCase();
    return all && all.states ? all.states[code] : null;
  }

  async function loadCurrentStimmung() {
    return fetchJson(`${DATA_BASE}/current_stimmung.json`);
  }

  async function loadForecastFederal() {
    const primary = `${DATA_BASE}/forecast_federal.json`;
    try {
      return await fetchJson(primary);
    } catch (_) {
      return fetchJson('/forecast.json');
    }
  }

  async function loadForecastState(stateCode) {
    const code = String(stateCode || '').toLowerCase();
    return fetchJson(`${DATA_BASE}/forecast_state_${code}.json`);
  }

  async function loadForecastDistricts(stateCode) {
    const code = String(stateCode || '').toLowerCase();
    return fetchJson(`${DATA_BASE}/forecast_districts_${code}.json`);
  }

  async function loadParliamentSize() {
    return fetchJson(`${DATA_BASE}/forecast_parliament_size.json`);
  }

  async function loadCandidateEntry() {
    // ~0.8–1 MB; allow a bit longer than default on slow networks
    return fetchJson(`${DATA_BASE}/forecast_candidate_entry.json`, { timeoutMs: 60000 });
  }

  async function loadWahlkreiseGeo(stateCode) {
    const code = String(stateCode || '').toLowerCase();
    return fetchJson(`${DATA_BASE}/ltw_wahlkreise_${code}.geojson`);
  }

  async function loadArchivedForecast(relativePath) {
    const path = String(relativePath || '').replace(/^\//, '');
    return fetchJson(`${DATA_BASE}/${path}`);
  }

  async function loadElectionCalendar() {
    return fetchJson(`${DATA_BASE}/election_calendar.json`);
  }

  async function loadPartyOrder() {
    return fetchJson(`${DATA_BASE}/party_order.json`);
  }

  const FALLBACK_PARTY_ORDER = [
    'CDU/CSU', 'AfD', 'SPD', 'GRÜNE', 'LINKE', 'BSW', 'FDP',
    'FW', 'SSW', 'PIRATEN', 'REP'
  ];

  /** Canonical key for last-election ranking (state forecasts use CDU, order file uses CDU/CSU). */
  function partyOrderKey(party) {
    const p = String(party || '');
    if (p === 'CDU' || p === 'CSU' || p === 'CDU/CSU') return 'CDU/CSU';
    return p;
  }

  function indexInPartyOrder(rankOrder, party) {
    const exact = rankOrder.indexOf(party);
    if (exact !== -1) return exact;
    const key = partyOrderKey(party);
    if (key !== party) {
      const viaKey = rankOrder.indexOf(key);
      if (viaKey !== -1) return viaKey;
    }
    // Order file might list CDU while chart has CDU/CSU (or the reverse).
    if (key === 'CDU/CSU') {
      for (const alt of ['CDU/CSU', 'CDU', 'CSU']) {
        const i = rankOrder.indexOf(alt);
        if (i !== -1) return i;
      }
    }
    return -1;
  }

  /**
   * Order parties by last-election vote share. Sonstige is always last when
   * present in `parties` (and omitted entirely when not — e.g. no forecast).
   * @param {string[]} parties
   * @param {{scope?: string, stateCode?: string, partyOrder?: object}} opts
   */
  function orderPartiesByLastElection(parties, opts = {}) {
    const list = Array.isArray(parties) ? parties.slice() : [];
    if (!list.length) return list;
    const hasSonstige = list.includes('Sonstige');
    const main = list.filter(p => p !== 'Sonstige');
    const payload = opts.partyOrder || null;
    let rankOrder = FALLBACK_PARTY_ORDER;
    const scope = opts.scope || null;
    const stateCode = opts.stateCode ? String(opts.stateCode).toUpperCase() : null;
    if (payload) {
      if (stateCode && payload.states && payload.states[stateCode] && Array.isArray(payload.states[stateCode].order)) {
        rankOrder = payload.states[stateCode].order;
      } else if ((scope === 'federal' || scope === 'bund' || (!stateCode && !scope))
                 && payload.federal && Array.isArray(payload.federal.order)) {
        rankOrder = payload.federal.order;
      } else if (Array.isArray(payload.fallback_order)) {
        rankOrder = payload.fallback_order;
      }
    }
    main.sort((a, b) => {
      const ai = indexInPartyOrder(rankOrder, a);
      const bi = indexInPartyOrder(rankOrder, b);
      if (ai === -1 && bi === -1) return String(a).localeCompare(String(b));
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return hasSonstige ? [...main, 'Sonstige'] : main;
  }

  function daysAgoISO(days) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function sliceStimmungSeries(stimmung, timePeriod) {
    if (!stimmung || !Array.isArray(stimmung.dates)) return stimmung;
    const daysMap = { '3m': 90, '6m': 180, '1y': 365, '2y': 730, '5y': 1825, '10y': 3650 };
    const daysBack = daysMap[timePeriod] || 90;
    const startISO = daysAgoISO(daysBack);
    const endISO = stimmung.dates[stimmung.dates.length - 1];

    const startIdx = stimmung.dates.findIndex(d => d >= startISO);
    const sliceFrom = startIdx >= 0 ? startIdx : 0;
    const dates = stimmung.dates.slice(sliceFrom);
    const series = {};
    const raw = stimmung.series || {};
    for (const party of Object.keys(raw)) {
      series[party] = (raw[party] || []).slice(sliceFrom);
    }
    const slicePartyObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const out = {};
      for (const party of Object.keys(obj)) {
        out[party] = (obj[party] || []).slice(sliceFrom);
      }
      return out;
    };
    return {
      ...stimmung,
      dates,
      series,
      uncertainty: slicePartyObject(stimmung.uncertainty),
      uncertainty_low: slicePartyObject(stimmung.uncertainty_low),
      uncertainty_high: slicePartyObject(stimmung.uncertainty_high),
      metadata: {
        ...(stimmung.metadata || {}),
        start_date: dates[0] || startISO,
        end_date: endISO,
      },
    };
  }

  function stimmungToChartData(stimmung) {
    const parties = Object.keys(stimmung.series || {});
    const dates = stimmung.dates || [];
    const current = stimmung.current || {};
    const trends = stimmung.trends || {};
    const forecastData = parties.map(p => stimmung.series[p]);
    return { parties, dates, current, trends, forecastData };
  }

  /** Peel versioned API envelope `{ api_version, election, data }` when present. */
  function unwrapApiData(payload) {
    if (
      payload
      && typeof payload === 'object'
      && !Array.isArray(payload)
      && payload.api_version
      && Object.prototype.hasOwnProperty.call(payload, 'data')
    ) {
      return payload.data;
    }
    return payload;
  }

  function forecastToBarData(forecastPayload) {
    const unwrapped = unwrapApiData(forecastPayload);
    let rows = [];
    if (Array.isArray(unwrapped)) {
      rows = unwrapped.map(row => ({
        party: row.name || row.party,
        fit: row.value ?? row.y,
        low: row.low,
        high: row.high,
        low95: row.low95,
        high95: row.high95,
      }));
    } else if (unwrapped && Array.isArray(unwrapped.parties)) {
      rows = unwrapped.parties.map(row => ({
        party: row.party,
        fit: row.fit,
        low: row.low,
        high: row.high,
        low95: row.low95,
        high95: row.high95,
      }));
    }
    // Whole percentages only — tenths imply false precision.
    rows = rows.map(r => ({
      ...r,
      fit: Number.isFinite(r.fit) ? Math.round(r.fit) : r.fit,
      low: Number.isFinite(r.low) ? Math.round(r.low) : r.low,
      high: Number.isFinite(r.high) ? Math.round(r.high) : r.high,
      low95: Number.isFinite(r.low95) ? Math.round(r.low95) : r.low95,
      high95: Number.isFinite(r.high95) ? Math.round(r.high95) : r.high95,
    }));
    // Pipeline forecasts include modeled Sonstige and already sum to ~100%.
    // Only scale down if a legacy payload somehow exceeds 100%.
    return normalizeForecastShares(rows);
  }

  function normalizeForecastShares(rows) {
    if (!Array.isArray(rows) || !rows.length) return [];
    const out = rows.map(r => ({ ...r }));
    const sumFit = out.reduce((a, r) => a + ((typeof r.fit === 'number' && Number.isFinite(r.fit)) ? r.fit : 0), 0);
    if (!(sumFit > 100.05)) return out;
    const scale = 100 / sumFit;
    return out.map(r => {
      const fit0 = (typeof r.fit === 'number' && Number.isFinite(r.fit)) ? r.fit : 0;
      const low0 = (typeof r.low === 'number' && Number.isFinite(r.low)) ? r.low : null;
      const high0 = (typeof r.high === 'number' && Number.isFinite(r.high)) ? r.high : null;
      const low95 = (typeof r.low95 === 'number' && Number.isFinite(r.low95)) ? r.low95 : null;
      const high95 = (typeof r.high95 === 'number' && Number.isFinite(r.high95)) ? r.high95 : null;
      return {
        ...r,
        fit: Math.round(fit0 * scale),
        low: low0 === null ? low0 : Math.round(Math.max(0, low0 * scale)),
        high: high0 === null ? high0 : Math.round(Math.min(100, high0 * scale)),
        low95: low95 === null ? low95 : Math.round(Math.max(0, low95 * scale)),
        high95: high95 === null ? high95 : Math.round(Math.min(100, high95 * scale)),
      };
    });
  }

  window.pipelineData = {
    SITE_BASE,
    DATA_BASE,
    loadDisplayMode,
    loadStimmungFederal,
    loadStimmungStates,
    loadStimmungState,
    loadCurrentStimmung,
    loadForecastFederal,
    loadForecastState,
    loadForecastDistricts,
    loadParliamentSize,
    loadCandidateEntry,
    loadWahlkreiseGeo,
    loadArchivedForecast,
    loadElectionCalendar,
    loadPartyOrder,
    orderPartiesByLastElection,
    FALLBACK_PARTY_ORDER,
    sliceStimmungSeries,
    stimmungToChartData,
    unwrapApiData,
    forecastToBarData,
    normalizeForecastShares,
  };
})();
