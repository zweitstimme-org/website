/**
 * Frozen last-pre-election forecasts for /archive/posts/vergangene-vorhersagen/.
 */
(function () {
  'use strict';

  const STATE_NAMES = {
    ST: 'Sachsen-Anhalt', BE: 'Berlin', MV: 'Mecklenburg-Vorpommern',
    SL: 'Saarland', SH: 'Schleswig-Holstein', NW: 'Nordrhein-Westfalen',
    HB: 'Bremen', NI: 'Niedersachsen', BY: 'Bayern', HE: 'Hessen',
    BB: 'Brandenburg', SN: 'Sachsen', TH: 'Thüringen', HH: 'Hamburg',
    BW: 'Baden-Württemberg', RP: 'Rheinland-Pfalz'
  };
  const COATS = {
    ST: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Wappen_Sachsen-Anhalt.svg/60px-Wappen_Sachsen-Anhalt.svg.png',
    BE: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/DEU_Berlin_COA.svg/60px-DEU_Berlin_COA.svg.png',
    MV: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Coat_of_arms_of_Mecklenburg-Western_Pomerania_%28small%29.svg/60px-Coat_of_arms_of_Mecklenburg-Western_Pomerania_%28small%29.svg.png',
    SL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Wappen_des_Saarlands.svg/60px-Wappen_des_Saarlands.svg.png',
    SH: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/DEU_Schleswig-Holstein_COA.svg/60px-DEU_Schleswig-Holstein_COA.svg.png',
    NW: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Coat_of_arms_of_North_Rhine-Westphalia.svg/60px-Coat_of_arms_of_North_Rhine-Westphalia.svg.png',
    HB: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bremen_Wappen%28Mittel%29.svg/60px-Bremen_Wappen%28Mittel%29.svg.png',
    NI: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Wappen_von_Niedersachsen.svg/60px-Wappen_von_Niedersachsen.svg.png',
    BY: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Bayern_Wappen.svg/60px-Bayern_Wappen.svg.png',
    HE: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Coat_of_arms_of_Hesse.svg/60px-Coat_of_arms_of_Hesse.svg.png',
    BB: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/DEU_Brandenburg_COA.svg/60px-DEU_Brandenburg_COA.svg.png',
    SN: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Coat_of_arms_of_Saxony.svg/60px-Coat_of_arms_of_Saxony.svg.png',
    TH: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Coat_of_arms_of_Thuringia.svg/60px-Coat_of_arms_of_Thuringia.svg.png',
    HH: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/DEU_Hamburg_COA.svg/60px-DEU_Hamburg_COA.svg.png',
    BW: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Lesser_coat_of_arms_of_Baden-Württemberg.svg/60px-Lesser_coat_of_arms_of_Baden-Württemberg.svg.png',
    RP: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Coat_of_arms_of_Rhineland-Palatinate.svg/60px-Coat_of_arms_of_Rhineland-Palatinate.svg.png'
  };
  const BUND_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Deutscher_Bundestag_logo.svg/250px-Deutscher_Bundestag_logo.svg.png';
  const FALLBACK_COLORS = {
    'CDU/CSU': '#000', CDU: '#000', CSU: '#000', AfD: '#009EE0', SPD: '#E3000F',
    'GRÜNE': '#46962b', LINKE: '#BE3075', FDP: '#FFED00', Sonstige: '#666',
    BSW: '#FF6B35'
  };

  const root = document.getElementById('past-forecasts');
  if (!root) return;

  function partyColors() {
    return (window.enhancedPartyMapper && window.enhancedPartyMapper.partyColors) || FALLBACK_COLORS;
  }

  function hexToRgba(hexColor, alpha) {
    if (typeof hexColor !== 'string' || !hexColor.startsWith('#')) return hexColor || '#999';
    const clean = hexColor.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return hexColor;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function formatDE(raw) {
    const m = String(raw || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return '';
  }

  function abbreviate(party, stateCode) {
    if (party === 'CDU/CSU' || party === 'CDU' || party === 'CSU') {
      if (stateCode === 'BY') return 'CSU';
      if (stateCode && stateCode !== 'BUND') return 'CDU';
      return 'CDU/CSU';
    }
    if (party === 'Sonstige') return 'Sonst.';
    return party;
  }

  function localizeScenario(label, stateCode) {
    if (!label) return label;
    if (stateCode === 'BY') return String(label).split('CDU/CSU').join('CSU');
    if (stateCode && stateCode !== 'BUND') return String(label).split('CDU/CSU').join('CDU');
    return label;
  }

  function targetLabel(entry) {
    if (entry.scope === 'federal') return 'Bundestag';
    return STATE_NAMES[entry.state_code] || String(entry.election_name || '').replace(/^Landtagswahl\s+/, '') || entry.state_code;
  }

  async function loadCatalog() {
    const pipeline = window.pipelineData;
    if (!pipeline) throw new Error('pipeline-data.js missing');
    const fromIndex = async () => {
      const idx = await pipeline.loadArchivedForecast('archive/index.json');
      return Array.isArray(idx && idx.forecasts) ? idx.forecasts : [];
    };
    try {
      const dm = await pipeline.loadDisplayMode();
      const rows = dm && dm.archive && Array.isArray(dm.archive.forecasts) ? dm.archive.forecasts : [];
      if (rows.length) return rows;
    } catch (_) { /* fall through */ }
    return fromIndex();
  }

  function renderTiles(entries, selectedKey) {
    const box = document.getElementById('past-forecasts-targets');
    if (!box) return;
    box.innerHTML = entries.map((entry) => {
      const selected = entry.key === selectedKey ? ' selected' : '';
      const img = entry.scope === 'federal' ? BUND_LOGO : (COATS[entry.state_code] || '');
      const dateText = formatDE(entry.election_date);
      return `<div class="state-arm visible${selected}" data-forecast-key="${entry.key}">
        <img src="${img}" alt="${targetLabel(entry)}">
        <div class="state-arm-text">
          <span>${targetLabel(entry)}</span>
          <div class="election-date">${dateText}</div>
        </div>
      </div>`;
    }).join('');
    box.querySelectorAll('.state-arm').forEach((tile) => {
      tile.addEventListener('click', () => select(tile.getAttribute('data-forecast-key')));
    });
  }

  function setStand(forecast) {
    const el = document.getElementById('past-forecasts-stand');
    if (!el) return;
    const meta = forecast && forecast.metadata ? forecast.metadata : {};
    const bits = [];
    if (meta.last_update) bits.push(`Stand: ${formatDE(meta.last_update)}`);
    if (meta.last_poll_date) bits.push(`Letzte Umfrage: ${formatDE(meta.last_poll_date)}`);
    el.textContent = bits.length ? ` · ${bits.join(' · ')}` : '';
  }

  function renderScenarios(forecast) {
    const section = document.getElementById('past-forecasts-scenarios');
    const list = document.getElementById('past-forecasts-scenarios-list');
    const toggle = document.getElementById('past-forecasts-scenarios-toggle');
    if (!section || !list) return;
    const items = forecast && forecast.scenarios && Array.isArray(forecast.scenarios.items)
      ? forecast.scenarios.items : [];
    if (!items.length) {
      section.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    const stateCode = forecast.metadata && forecast.metadata.state_code;
    list.innerHTML = items.map((item) => {
      const pctRaw = Number(item.probability);
      const pct = Number.isFinite(pctRaw) ? pctRaw : 0;
      const filled = Math.max(0, Math.min(100, Math.round(pct)));
      const approximate = item.approximate === true;
      const pctText = filled >= 100 ? '~100' : filled <= 0 ? '~0' : approximate ? `~${filled}` : String(filled);
      const dots = Array.from({ length: 100 }, (_, i) =>
        `<span class="scenario-prob-dot${i < filled ? ' is-filled' : ''}"></span>`).join('');
      const label = localizeScenario(item.label_de || item.id || '', stateCode);
      return `<div class="scenario-prob-item">
        <div class="scenario-prob-dots" aria-hidden="true">${dots}</div>
        <div class="scenario-prob-text">
          <div class="scenario-prob-pct">${pctText}%</div>
          <div class="scenario-prob-label">${label}</div>
        </div>
      </div>`;
    }).join('');
    const needsToggle = items.length > 4;
    if (toggle) {
      toggle.style.display = needsToggle ? 'block' : 'none';
      if (needsToggle) {
        list.classList.add('is-collapsed');
        toggle.textContent = 'Mehr anzeigen';
        toggle.setAttribute('aria-expanded', 'false');
        if (toggle.dataset.bound !== '1') {
          toggle.dataset.bound = '1';
          toggle.addEventListener('click', () => {
            const collapsed = list.classList.toggle('is-collapsed');
            toggle.textContent = collapsed ? 'Mehr anzeigen' : 'Weniger anzeigen';
            toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
          });
        }
      } else {
        list.classList.remove('is-collapsed');
      }
    }
    section.style.display = 'block';
  }

  async function drawChart(forecast) {
    const canvas = document.getElementById('past-forecasts-chart');
    if (!canvas || typeof Chart === 'undefined' || !window.pipelineData) return;
    let rows = window.pipelineData.forecastToBarData(forecast);
    if (!rows.length) return;
    const meta = forecast.metadata || {};
    const stateCode = meta.state_code || null;
    let partyOrder = null;
    try { partyOrder = await window.pipelineData.loadPartyOrder(); } catch (_) { /* optional */ }
    const ordered = window.pipelineData.orderPartiesByLastElection(rows.map((r) => r.party), {
      scope: stateCode ? null : 'federal',
      stateCode,
      partyOrder
    });
    const byParty = Object.fromEntries(rows.map((r) => [r.party, r]));
    rows = ordered.map((p) => byParty[p]).filter(Boolean);
    const colors = partyColors();
    const labels = rows.map((r) => abbreviate(r.party, stateCode));
    const points = rows.map((r) => r.fit);
    const intervals = rows.map((r) => ({ lo: r.low, hi: r.high }));
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
    const maxHi = Math.max(...intervals.map((v) => v.hi).filter((n) => Number.isFinite(n)));
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '5/6-Intervall',
            data: labels.map((label, i) => ({ x: label, y: [intervals[i].lo, intervals[i].hi] })),
            backgroundColor: rows.map((r) => hexToRgba(colors[r.party] || '#999', 0.28)),
            borderColor: rows.map((r) => hexToRgba(colors[r.party] || '#999', 0.55)),
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 3,
            barPercentage: 0.42,
            categoryPercentage: 0.9,
            order: 2
          },
          {
            type: 'scatter',
            label: 'Punktschätzung',
            data: labels.map((label, i) => ({ x: label, y: points[i] })),
            pointRadius: 4.2,
            pointBackgroundColor: rows.map((r) => colors[r.party] || '#999'),
            pointBorderColor: '#fff',
            pointBorderWidth: 0.8,
            showLine: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                if (context.dataset && context.dataset.type === 'scatter') {
                  const y = context.parsed && context.parsed.y;
                  return Number.isFinite(y) ? `Punktschätzung: ${Math.round(y)}%` : '';
                }
                const y = context.raw && context.raw.y;
                if (Array.isArray(y) && y.length === 2) {
                  return `5/6-Intervall: ${Math.round(y[0])}% bis ${Math.round(y[1])}%`;
                }
                return '';
              }
            }
          },
          datalabels: {
            display(context) { return context.dataset && context.dataset.type === 'scatter'; },
            color: '#000',
            anchor: 'end',
            align: 'top',
            offset: 6,
            clip: false,
            formatter(value) {
              const y = value && typeof value === 'object' ? value.y : value;
              return Number.isFinite(y) ? `${Math.round(y)}%` : '';
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: Math.ceil((Number.isFinite(maxHi) ? maxHi : 50) * 1.2),
            display: false,
            grid: { display: false, drawBorder: false }
          },
          x: {
            type: 'category',
            grid: { display: false, drawBorder: false },
            ticks: { autoSkip: false }
          }
        }
      }
    });
  }

  const DISTRICT_STATES = new Set(['ST', 'BE', 'MV']);

  let catalog = [];
  let currentKey = null;

  function siteBase() {
    try {
      if (window.pipelineData && window.pipelineData.SITE_BASE) {
        return String(window.pipelineData.SITE_BASE).replace(/\/?$/, '/');
      }
    } catch (_) { /* ignore */ }
    return '/';
  }

  function updateDistricts(entry) {
    const panel = document.getElementById('past-forecasts-districts');
    const linkWkr = document.getElementById('past-forecasts-link-wahlkreise');
    const linkEinzug = document.getElementById('past-forecasts-link-einzug');
    const code = String((entry && entry.state_code) || '').toUpperCase();
    const show = Boolean(entry && entry.scope === 'state' && DISTRICT_STATES.has(code));
    if (!panel) return;
    if (!show) {
      panel.style.display = 'none';
      if (window.DistrictForecastMap && typeof window.DistrictForecastMap.hide === 'function') {
        window.DistrictForecastMap.hide();
      }
      return;
    }
    panel.style.display = 'block';
    const base = siteBase();
    const st = encodeURIComponent(code);
    if (linkWkr) linkWkr.href = `${base}direktmandate/?state=${st}`;
    if (linkEinzug) linkEinzug.href = `${base}einzug/?state=${st}`;
    if (window.DistrictForecastMap && typeof window.DistrictForecastMap.mount === 'function') {
      window.DistrictForecastMap.mount({
        code,
        navigateToWkr: true,
        extraZoom: 0.7
      }).catch((err) => console.warn('Archived district map unavailable', err));
    }
  }

  async function select(key) {
    const entry = catalog.find((e) => e.key === key);
    if (!entry || !window.pipelineData) return;
    currentKey = key;
    renderTiles(catalog, currentKey);
    try {
      const forecast = await window.pipelineData.loadArchivedForecast(entry.forecast_file);
      await drawChart(forecast);
      renderScenarios(forecast);
      setStand(forecast);
      updateDistricts(entry);
    } catch (err) {
      console.warn('Archived forecast unavailable', err);
      updateDistricts(null);
    }
  }

  async function init() {
    try {
      catalog = (await loadCatalog()).filter((e) => e && e.forecast_file);
      catalog.sort((a, b) => String(b.election_date || '').localeCompare(String(a.election_date || '')));
    } catch (err) {
      console.warn('Past-forecast catalog unavailable', err);
      catalog = [];
    }
    const empty = document.getElementById('past-forecasts-empty');
    if (!catalog.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    await select(catalog[0].key);
  }

  if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    try { Chart.register(ChartDataLabels); } catch (_) { /* already registered */ }
  }
  init();
})();
