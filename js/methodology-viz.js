/**
 * Interactive figures for the state-forecast methodology blog post.
 * Data is a fixed snapshot used for explanation (not the live homepage feed).
 */
(function () {
  'use strict';

  const COLORS = {
    'CDU/CSU': '#000000',
    CDU: '#000000',
    SPD: '#E3000F',
    AfD: '#009EE0',
    GRÜNE: '#46962b',
    GRU: '#46962b',
    LINKE: '#BE3075',
    LIN: '#BE3075',
    FDP: '#FFED00',
    BSW: '#FF6B35',
    Sonstige: '#666666'
  };

  const DATA = {
    // MAE from Stoetzer et al. (2025), Electoral Studies: combined
    // polls+fundamentals log-ratio model at 2-day / 2-week / 2-month leads.
    modelMae: [
      { lead: '≈2 Tage', short: 'Tage', mae: 1.46 },
      { lead: '≈2 Wochen', short: 'Wochen', mae: 2.16 },
      { lead: '≈2 Monate', short: 'Monate', mae: 3.09 }
    ],
    example: {
      title: 'Sachsen-Anhalt',
      stand: '11.08.2026',
      lastPoll: '10.08.2026',
      election: '6. September 2026',
      parties: [
        { party: 'AfD', fit: 39, low: 31, high: 47 },
        { party: 'CDU/CSU', fit: 23, low: 16, high: 30 },
        { party: 'LINKE', fit: 13, low: 8, high: 18 },
        { party: 'SPD', fit: 7, low: 4, high: 10 },
        { party: 'BSW', fit: 5, low: 3, high: 7 },
        { party: 'FDP', fit: 4, low: 3, high: 6 },
        { party: 'GRÜNE', fit: 4, low: 3, high: 6 },
        { party: 'Sonstige', fit: 5, low: 3, high: 6 }
      ],
      scenarios: [
        { label: 'AfD stärkste Kraft', probability: 94 },
        { label: 'SPD über 5%-Hürde', probability: 87 },
        { label: 'BSW über 5%-Hürde', probability: 50 },
        { label: 'Grüne über 5%-Hürde', probability: 32 },
        { label: 'FDP über 5%-Hürde', probability: 30 },
        { label: 'Absolute Mehrheit AfD', probability: 19 }
      ]
    }
  };

  function hexToRgba(hex, alpha) {
    const h = String(hex || '#999').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function partyColor(party) {
    return COLORS[party] || '#888888';
  }

  function fmtPct(v, digits) {
    const d = typeof digits === 'number' ? digits : 0;
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('de-DE', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  function renderMaeChart(root) {
    const max = Math.max(...DATA.modelMae.map((d) => d.mae));
    const cards = DATA.modelMae
      .map((d, i) => {
        const h = Math.max(12, (d.mae / max) * 100);
        return `
          <div class="meth-mae-col">
            <div class="meth-mae-val">${fmtPct(d.mae, 2)}</div>
            <div class="meth-mae-bar-wrap">
              <div class="meth-mae-bar" style="height:${h}%; animation-delay:${i * 90}ms"></div>
            </div>
            <div class="meth-mae-lead">${d.lead}</div>
            <div class="meth-mae-unit">Pp. MAE</div>
          </div>`;
      })
      .join('');

    root.innerHTML = `<div class="meth-mae">${cards}</div>`;
  }

  function renderForecastChart(canvas) {
    if (typeof Chart === 'undefined' || !canvas) return;

    const parties = DATA.example.parties;
    const labels = parties.map((p) => p.party);
    const intervals = parties.map((p) => ({ lo: p.low, hi: p.high }));
    const points = parties.map((p) => p.fit);
    const maxHi = Math.max(...intervals.map((v) => v.hi));

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '5/6-Intervall',
            data: labels.map((party, i) => ({
              x: party,
              y: [intervals[i].lo, intervals[i].hi]
            })),
            backgroundColor: labels.map((p) => hexToRgba(partyColor(p), 0.28)),
            borderColor: labels.map((p) => hexToRgba(partyColor(p), 0.55)),
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.45,
            categoryPercentage: 0.88,
            order: 2
          },
          {
            type: 'scatter',
            label: 'Punktschätzung',
            data: labels.map((party, i) => ({ x: party, y: points[i] })),
            pointRadius: 4.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: labels.map((p) => partyColor(p)),
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            showLine: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        layout: { padding: { top: 22, right: 4, left: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                if (ctx.dataset.type === 'scatter') {
                  const y = ctx.parsed && ctx.parsed.y;
                  return Number.isFinite(y) ? `Punktschätzung: ${Math.round(y)} %` : '';
                }
                const y = ctx.raw && ctx.raw.y;
                if (Array.isArray(y)) {
                  return `5/6-Intervall: ${Math.round(y[0])}–${Math.round(y[1])} %`;
                }
                return '';
              }
            }
          },
          datalabels: {
            display(ctx) {
              return ctx.dataset && ctx.dataset.type === 'scatter';
            },
            color: '#111',
            anchor: 'end',
            align: 'top',
            offset: 4,
            clip: false,
            font: { size: 11, weight: '600' },
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
            max: Math.ceil(maxHi * 1.18),
            ticks: {
              callback: (v) => `${v}%`,
              color: '#777',
              font: { size: 11 }
            },
            grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
            border: { display: false }
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: '#333',
              font: { size: 11, weight: '600' },
              maxRotation: 0,
              autoSkip: false
            },
            border: { display: false }
          }
        }
      }
    });
  }

  function renderAnatomy(root) {
    // Single-party explainer: AfD from the ST snapshot
    const p = DATA.example.parties[0];
    const min = 25;
    const max = 52;
    const scale = (v) => ((v - min) / (max - min)) * 100;
    const left = scale(p.low);
    const width = scale(p.high) - left;
    const point = scale(p.fit);
    const color = partyColor(p.party);

    root.innerHTML = `
      <div class="meth-anatomy">
        <div class="meth-anatomy-meta">
          <span class="meth-anatomy-party" style="color:${color}">${p.party}</span>
          <span class="meth-anatomy-sub">${DATA.example.title} · Stand ${DATA.example.stand} · Letzte Umfrage ${DATA.example.lastPoll}</span>
        </div>
        <div class="meth-anatomy-track">
          <div class="meth-anatomy-band" style="left:${left}%; width:${width}%; background:${hexToRgba(color, 0.28)}; border-color:${hexToRgba(color, 0.5)};"></div>
          <div class="meth-anatomy-point" style="left:${point}%; background:${color};"></div>
          <div class="meth-anatomy-callout meth-anatomy-callout--low" style="left:${left}%">
            <strong>${p.low}%</strong><span>unteres Ende</span>
          </div>
          <div class="meth-anatomy-callout meth-anatomy-callout--fit" style="left:${point}%">
            <strong>${p.fit}%</strong><span>Punktschätzung</span>
          </div>
          <div class="meth-anatomy-callout meth-anatomy-callout--high" style="left:${left + width}%">
            <strong>${p.high}%</strong><span>oberes Ende</span>
          </div>
        </div>
        <div class="meth-anatomy-legend">
          <div><span class="meth-swatch meth-swatch--band" style="background:${hexToRgba(color, 0.35)}"></span> <strong>5/6-Intervall</strong> — in fünf von sechs Fällen liegt das Ergebnis hier</div>
          <div><span class="meth-swatch meth-swatch--dot" style="background:${color}"></span> <strong>Punktschätzung</strong> — Mittelwert aus 4.000 Simulationen</div>
        </div>
      </div>`;
  }

  function renderScenarios(root) {
    const items = DATA.example.scenarios
      .map((s) => {
        const filled = Math.round(Math.max(0, Math.min(100, s.probability)) / 5);
        const dots = Array.from({ length: 20 }, (_, i) =>
          `<span class="meth-dot${i < filled ? ' is-filled' : ''}"></span>`
        ).join('');
        return `
          <div class="meth-scenario-item">
            <div class="meth-scenario-dots" aria-hidden="true">${dots}</div>
            <div class="meth-scenario-text">
              <div class="meth-scenario-pct">${fmtPct(s.probability, 0)}&nbsp;%</div>
              <div class="meth-scenario-label">${s.label}</div>
            </div>
          </div>`;
      })
      .join('');

    root.innerHTML = `
      <div class="meth-scenarios">
        <div class="meth-scenarios-head">
          <strong>${DATA.example.title}</strong>
          <span>Beispiel aus 4.000 Simulationen · Stand ${DATA.example.stand} · Letzte Umfrage ${DATA.example.lastPoll}</span>
        </div>
        <div class="meth-scenarios-grid">${items}</div>
      </div>`;
  }

  function renderPipeline(root) {
    const steps = [
      { n: '1', title: 'Daten', text: 'Landesumfragen bis zur letzten Umfrage' },
      { n: '2', title: 'Prädiktoren', text: 'Umfragewert + Vorlauf bis zur Wahl' },
      { n: '3', title: 'Simulation', text: '4.000 plausible Wahlergebnisse' },
      { n: '4', title: 'Ausgabe', text: 'Punkt, Intervall, Szenarien' }
    ];
    root.innerHTML = `
      <ol class="meth-pipeline">
        ${steps
          .map(
            (s) => `
          <li class="meth-pipeline-step">
            <div class="meth-pipeline-n">${s.n}</div>
            <div class="meth-pipeline-title">${s.title}</div>
            <div class="meth-pipeline-text">${s.text}</div>
          </li>`
          )
          .join('')}
      </ol>`;
  }

  function init() {
    const mae = document.getElementById('meth-viz-mae');
    const anatomy = document.getElementById('meth-viz-anatomy');
    const forecast = document.getElementById('meth-viz-forecast');
    const scenarios = document.getElementById('meth-viz-scenarios');
    const pipeline = document.getElementById('meth-viz-pipeline');

    if (mae) renderMaeChart(mae);
    if (anatomy) renderAnatomy(anatomy);
    if (scenarios) renderScenarios(scenarios);
    if (pipeline) renderPipeline(pipeline);
    if (forecast) renderForecastChart(forecast);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
