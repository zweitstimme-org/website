/**
 * Figures for the Sachsen-Anhalt 2026 forecast evaluation blog post.
 * Snapshot: last published forecast (asof 2026-09-03 / posted 2026-09-04)
 * vs StaLA vorläufiges Ergebnis (Ergebnisart V, 7 Sep 2026).
 */
(function () {
  'use strict';

  const COLORS = {
    AfD: '#009EE0',
    CDU: '#000000',
    SPD: '#E3000F',
    GRÜNE: '#46962b',
    LINKE: '#BE3075',
    BSW: '#FF6B35',
    FDP: '#FFED00',
    Sonstige: '#666666'
  };

  const KIND = {
    'expected-hit': {
      badge: 'eingetreten',
      hint: 'erwartet und eingetreten',
      fill: '#2e7d32',
      bg: '#eaf5ea',
      border: '#b7d7b8'
    },
    surprise: {
      badge: 'knapp eingetreten',
      hint: 'unwahrscheinlich, aber knapp wahr',
      fill: '#c47b17',
      bg: '#fbf3e4',
      border: '#e4c48a'
    },
    'false-alarm': {
      badge: 'nicht eingetreten',
      hint: 'erwartet, aber nicht eingetreten',
      fill: '#c62828',
      bg: '#fbeaea',
      border: '#e3b6b6'
    },
    'true-negative': {
      badge: 'nicht eingetreten',
      hint: 'unwahrscheinlich und nicht eingetreten',
      fill: '#5a6570',
      bg: '#f4f5f6',
      border: '#d5d8dc'
    }
  };

  function kindOf(p, hit) {
    if (hit && p >= 50) return 'expected-hit';
    if (hit && p < 50) return 'surprise';
    if (!hit && p >= 50) return 'false-alarm';
    return 'true-negative';
  }

  const DATA = {
    votes: [
      { party: 'AfD', fit: 41, low: 36, high: 47, actual: 43.79, stim: 41.6, l1: 20.8 },
      { party: 'CDU', fit: 23, low: 18, high: 27, actual: 17.23, stim: 22.6, l1: 37.1 },
      { party: 'SPD', fit: 8, low: 6, high: 10, actual: 9.3, stim: 8.2, l1: 8.4 },
      { party: 'GRÜNE', fit: 5, low: 4, high: 7, actual: 8.93, stim: 5.7, l1: 5.9 },
      { party: 'LINKE', fit: 12, low: 9, high: 15, actual: 8.56, stim: 11.9, l1: 11.0 },
      { party: 'BSW', fit: 4, low: 3, high: 5, actual: 5.27, stim: 3.9, l1: null },
      { party: 'FDP', fit: 3, low: 2, high: 4, actual: 2.58, stim: 2.8, l1: 6.4 },
      { party: 'Sonstige', fit: 4, low: 3, high: 5, actual: 4.34, stim: 3.3, l1: 10.4 }
    ],
    scenarios: [
      { label: 'AfD stärkste Kraft', p: 100, hit: true },
      { label: 'SPD über 5%-Hürde', p: 98, hit: true },
      { label: 'Parlamentsmehrheit ohne AfD', p: 78, hit: true },
      { label: 'Mehrheit ohne AfD und BSW', p: 70, hit: false },
      { label: 'Grüne über 5%-Hürde', p: 67, hit: true },
      { label: 'Absolute Mehrheit AfD (Stimmen)', p: 22, hit: false },
      { label: 'Absolute Mehrheit AfD (Sitze)', p: 24.2, hit: false },
      { label: 'BSW über 5%-Hürde', p: 19, hit: true },
      { label: 'Parlamentsmehrheit AfD und BSW', p: 9, hit: true },
      { label: 'FDP über 5%-Hürde', p: 2, hit: false },
      { label: 'Mehrheit CDU, SPD und Grüne', p: 1, hit: false }
    ],
    seats: [
      { party: 'AfD', median: 39, p10: 35, p90: 44, actual: 39, directs: 38, list: 1 },
      { party: 'CDU', median: 22, p10: 17, p90: 26, actual: 15, directs: 0, list: 15 },
      { party: 'LINKE', median: 11, p10: 9, p90: 15, actual: 8, directs: 3, list: 5 },
      { party: 'SPD', median: 7, p10: 6, p90: 10, actual: 8, directs: 0, list: 8 },
      { party: 'GRÜNE', median: 5, p10: 0, p90: 7, actual: 8, directs: 0, list: 8 },
      { party: 'BSW', median: 0, p10: 0, p90: 5, actual: 5, directs: 0, list: 5 },
      { party: 'FDP', median: 0, p10: 0, p90: 0, actual: 0, directs: 0, list: 0 }
    ],
    sizeBuckets: [
      { label: '83', pct: 73.8 },
      { label: '85–91', pct: 23.2 },
      { label: '93–99', pct: 2.9 },
      { label: '101–107', pct: 0.2 }
    ],
    districts: [
      { wk: 1, name: 'Salzwedel', pred: 'AfD', act: 'AfD' },
      { wk: 2, name: 'Gardelegen-Klötze', pred: 'AfD', act: 'AfD' },
      { wk: 3, name: 'Havelberg-Osterburg', pred: 'AfD', act: 'AfD' },
      { wk: 4, name: 'Stendal', pred: 'AfD', act: 'AfD' },
      { wk: 5, name: 'Genthin', pred: 'AfD', act: 'AfD' },
      { wk: 6, name: 'Burg', pred: 'AfD', act: 'AfD' },
      { wk: 7, name: 'Haldensleben', pred: 'AfD', act: 'AfD' },
      { wk: 8, name: 'Wolmirstedt', pred: 'AfD', act: 'AfD' },
      { wk: 9, name: 'Oschersleben-Wanzleben', pred: 'AfD', act: 'AfD' },
      { wk: 10, name: 'Magdeburg I', pred: 'AfD', act: 'AfD' },
      { wk: 11, name: 'Magdeburg II', pred: 'CDU', act: 'LINKE' },
      { wk: 12, name: 'Magdeburg III', pred: 'AfD', act: 'AfD' },
      { wk: 13, name: 'Magdeburg IV', pred: 'AfD', act: 'AfD' },
      { wk: 14, name: 'Halberstadt', pred: 'AfD', act: 'AfD' },
      { wk: 15, name: 'Blankenburg', pred: 'AfD', act: 'AfD' },
      { wk: 16, name: 'Wernigerode', pred: 'AfD', act: 'AfD' },
      { wk: 17, name: 'Quedlinburg', pred: 'AfD', act: 'AfD' },
      { wk: 18, name: 'Aschersleben', pred: 'AfD', act: 'AfD' },
      { wk: 19, name: 'Staßfurt', pred: 'AfD', act: 'AfD' },
      { wk: 20, name: 'Schönebeck', pred: 'AfD', act: 'AfD' },
      { wk: 21, name: 'Bernburg', pred: 'AfD', act: 'AfD' },
      { wk: 22, name: 'Köthen', pred: 'AfD', act: 'AfD' },
      { wk: 23, name: 'Zerbst', pred: 'AfD', act: 'AfD' },
      { wk: 24, name: 'Wittenberg', pred: 'AfD', act: 'AfD' },
      { wk: 25, name: 'Jessen', pred: 'AfD', act: 'AfD' },
      { wk: 26, name: 'Dessau-Roßlau', pred: 'AfD', act: 'AfD' },
      { wk: 27, name: 'Dessau-Roßlau-Wittenberg', pred: 'AfD', act: 'AfD' },
      { wk: 28, name: 'Bitterfeld-Wolfen', pred: 'AfD', act: 'AfD' },
      { wk: 29, name: 'Saalekreis', pred: 'AfD', act: 'AfD' },
      { wk: 30, name: 'Eisleben', pred: 'AfD', act: 'AfD' },
      { wk: 31, name: 'Sangerhausen', pred: 'AfD', act: 'AfD' },
      { wk: 32, name: 'Querfurt', pred: 'AfD', act: 'AfD' },
      { wk: 33, name: 'Merseburg', pred: 'AfD', act: 'AfD' },
      { wk: 34, name: 'Bad Dürrenberg-Saalekreis', pred: 'AfD', act: 'AfD' },
      { wk: 35, name: 'Halle I', pred: 'AfD', act: 'AfD' },
      { wk: 36, name: 'Halle II', pred: 'AfD', act: 'LINKE' },
      { wk: 37, name: 'Halle III', pred: 'GRÜNE', act: 'LINKE' },
      { wk: 38, name: 'Halle IV', pred: 'AfD', act: 'AfD' },
      { wk: 39, name: 'Weißenfels', pred: 'AfD', act: 'AfD' },
      { wk: 40, name: 'Naumburg', pred: 'AfD', act: 'AfD' },
      { wk: 41, name: 'Zeitz', pred: 'AfD', act: 'AfD' }
    ]
  };

  function hexToRgba(hex, alpha) {
    const h = String(hex || '#999').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function partyColor(party) {
    return COLORS[party] || '#888888';
  }

  function fmtPct(v, digits) {
    const d = typeof digits === 'number' ? digits : 1;
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('de-DE', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  function inBand(row) {
    return row.actual >= row.low && row.actual <= row.high;
  }

  function renderScore(root) {
    const mae =
      DATA.votes.reduce((s, r) => s + Math.abs(r.actual - r.fit), 0) / DATA.votes.length;
    const inside = DATA.votes.filter(inBand).length;
    const correct = DATA.districts.filter((d) => d.pred === d.act).length;
    const items = [
      { v: `${fmtPct(mae, 1)} Pp.`, l: 'mittlerer Fehler (Zweitstimme)' },
      { v: `${inside} von ${DATA.votes.length}`, l: 'Parteien im 5/6-Intervall' },
      { v: `${correct} von 41`, l: 'Direktmandaten richtig' },
      { v: '83', l: 'Sitze im Landtag (Median war 83)' }
    ];
    root.innerHTML = `<div class="steval-score">${items
      .map(
        (it) =>
          `<div class="steval-score-item"><div class="steval-score-v">${it.v}</div><div class="steval-score-l">${it.l}</div></div>`
      )
      .join('')}</div>`;
  }

  function renderVoteChart(canvas) {
    if (typeof Chart === 'undefined' || !canvas) return;
    const rows = DATA.votes;
    const labels = rows.map((r) => r.party);
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    const maxHi = Math.max(...rows.map((r) => Math.max(r.high, r.actual, r.fit)));

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '5/6-Intervall',
            data: labels.map((party, i) => ({
              x: party,
              y: [rows[i].low, rows[i].high]
            })),
            backgroundColor: labels.map((p, i) =>
              hexToRgba(partyColor(p), inBand(rows[i]) ? 0.32 : 0.16)
            ),
            borderColor: labels.map((p, i) =>
              hexToRgba(partyColor(p), inBand(rows[i]) ? 0.7 : 0.4)
            ),
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.48,
            categoryPercentage: 0.86,
            order: 3
          },
          {
            type: 'scatter',
            label: 'Punktschätzung',
            data: labels.map((party, i) => ({ x: party, y: rows[i].fit })),
            pointRadius: 4.5,
            pointHoverRadius: 6,
            pointBackgroundColor: labels.map((p) => partyColor(p)),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointStyle: 'circle',
            showLine: false,
            order: 2
          },
          {
            type: 'scatter',
            label: 'Ergebnis',
            data: labels.map((party, i) => ({ x: party, y: rows[i].actual })),
            pointRadius: 6,
            pointHoverRadius: 7.5,
            pointBackgroundColor: rows.map((r) => (inBand(r) ? '#2e7d32' : '#c62828')),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointStyle: 'rectRot',
            showLine: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        layout: { padding: { top: 18, right: 6, left: 4 } },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
              color: '#444',
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const i = ctx.dataIndex;
                const r = rows[i];
                if (ctx.dataset.label === 'Punktschätzung') {
                  return `Punktschätzung: ${fmtPct(r.fit, 0)} %`;
                }
                if (ctx.dataset.label === 'Ergebnis') {
                  return `Ergebnis: ${fmtPct(r.actual, 1)} % (${inBand(r) ? 'im Intervall' : 'außerhalb'})`;
                }
                return `5/6-Intervall: ${r.low}–${r.high} %`;
              }
            }
          },
          datalabels: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: Math.ceil(maxHi * 1.15),
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

  function renderError(root) {
    const rows = DATA.votes.slice().sort((a, b) => (a.actual - a.fit) - (b.actual - b.fit));
    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.actual - r.fit)), 6);
    const html = rows
      .map((r) => {
        const e = r.actual - r.fit;
        const pct = (Math.abs(e) / maxAbs) * 50;
        const over = e >= 0;
        const ok = inBand(r);
        return `
          <div class="steval-err-row">
            <div class="steval-err-party" style="color:${partyColor(r.party)}">${r.party}</div>
            <div class="steval-err-track">
              <span class="steval-err-zero"></span>
              <span class="steval-err-bar ${over ? 'is-over' : 'is-under'} ${ok ? 'is-in' : 'is-out'}"
                    style="width:${pct}%"></span>
            </div>
            <div class="steval-err-val ${over ? 'is-over' : 'is-under'}">${over ? '+' : ''}${fmtPct(e, 1)}</div>
          </div>`;
      })
      .join('');
    root.innerHTML = `
      <div class="steval-err-axis">
        <span>Prognose zu hoch</span>
        <span>0</span>
        <span>Prognose zu niedrig</span>
      </div>
      ${html}`;
  }

  function renderScenarios(root) {
    const items = DATA.scenarios.map((s) => ({ ...s, kind: kindOf(s.p, s.hit) }));
    const counts = { 'expected-hit': 0, surprise: 0, 'false-alarm': 0, 'true-negative': 0 };
    items.forEach((s) => {
      counts[s.kind] += 1;
    });

    const legend = [
      ['expected-hit', 'erwartet und eingetreten'],
      ['surprise', 'knapp eingetreten (< 50 %)'],
      ['false-alarm', 'erwartet, aber falsch'],
      ['true-negative', 'unwahrscheinlich und falsch']
    ]
      .map(([k, lab]) => {
        const c = KIND[k];
        return `<span class="steval-scen-leg"><span class="steval-scen-swatch" style="background:${c.fill}"></span>${lab} (${counts[k]})</span>`;
      })
      .join('');

    const cards = items
      .map((s) => {
        const c = KIND[s.kind];
        const filled = Math.round(Math.max(0, Math.min(100, s.p)) / 5);
        const dots = Array.from({ length: 20 }, (_, i) => {
          const on = i < filled;
          return `<span class="steval-dot${on ? ' is-filled' : ''}" style="${on ? `background:${c.fill}` : ''}"></span>`;
        }).join('');
        return `
          <div class="steval-scen-item steval-scen-item--${s.kind}" style="background:${c.bg};border-color:${c.border}">
            <div class="steval-scen-dots" aria-hidden="true">${dots}</div>
            <div class="steval-scen-text">
              <div class="steval-scen-top">
                <span class="steval-scen-pct" style="color:${c.fill}">${fmtPct(s.p, s.p % 1 === 0 ? 0 : 1)}&nbsp;%</span>
                <span class="steval-scen-badge" style="color:${c.fill};border-color:${c.border};background:#fff">${c.badge}</span>
              </div>
              <div class="steval-scen-label">${s.label}</div>
            </div>
          </div>`;
      })
      .join('');

    root.innerHTML = `
      <div class="steval-scen-legend">${legend}</div>
      <div class="steval-scen-grid">${cards}</div>`;
  }

  function renderSeats(canvas) {
    if (typeof Chart === 'undefined' || !canvas) return;
    const rows = DATA.seats;
    const labels = rows.map((r) => r.party);
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'p10–p90 der Sitzsimulation',
            data: labels.map((party, i) => ({
              x: party,
              y: [rows[i].p10, rows[i].p90]
            })),
            backgroundColor: labels.map((p) => hexToRgba(partyColor(p), 0.22)),
            borderColor: labels.map((p) => hexToRgba(partyColor(p), 0.5)),
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.5,
            categoryPercentage: 0.86,
            order: 3
          },
          {
            type: 'scatter',
            label: 'Median',
            data: labels.map((party, i) => ({ x: party, y: rows[i].median })),
            pointRadius: 4.5,
            pointBackgroundColor: labels.map((p) => partyColor(p)),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointStyle: 'circle',
            showLine: false,
            order: 2
          },
          {
            type: 'scatter',
            label: 'Ergebnis',
            data: labels.map((party, i) => ({ x: party, y: rows[i].actual })),
            pointRadius: 6,
            pointBackgroundColor: rows.map((r) =>
              r.actual >= r.p10 && r.actual <= r.p90 ? '#2e7d32' : '#c62828'
            ),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointStyle: 'rectRot',
            showLine: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        layout: { padding: { top: 12, right: 6, left: 4 } },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: '#444', usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const r = rows[ctx.dataIndex];
                if (ctx.dataset.label === 'Median') return `Median: ${r.median} Sitze`;
                if (ctx.dataset.label === 'Ergebnis') {
                  const inside = r.actual >= r.p10 && r.actual <= r.p90;
                  return `Ergebnis: ${r.actual} Sitze (${inside ? 'im Band' : 'außerhalb'}) · ${r.directs} Direkt + ${r.list} Liste`;
                }
                return `p10–p90: ${r.p10}–${r.p90}`;
              }
            }
          },
          datalabels: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 50,
            ticks: { color: '#777', font: { size: 11 } },
            title: { display: true, text: 'Sitze', color: '#777', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
            border: { display: false }
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#333', font: { size: 11, weight: '600' }, maxRotation: 0 },
            border: { display: false }
          }
        }
      }
    });
  }

  function renderSize(root) {
    const max = Math.max(...DATA.sizeBuckets.map((b) => b.pct));
    root.innerHTML = `<div class="steval-size">${DATA.sizeBuckets
      .map((b, i) => {
        const h = Math.max(8, (b.pct / max) * 100);
        const actual = b.label === '83';
        return `
          <div class="steval-size-col${actual ? ' is-actual' : ''}">
            <div class="steval-size-val">${fmtPct(b.pct, 1)}</div>
            <div class="steval-size-bar-wrap">
              <div class="steval-size-bar" style="height:${h}%; animation-delay:${i * 70}ms"></div>
            </div>
            <div class="steval-size-lab">${b.label}${actual ? '<span>Ergebnis</span>' : ''}</div>
          </div>`;
      })
      .join('')}</div>`;
  }

  function renderFlow(root) {
    const from = [
      { party: 'CDU', err: -5.77 },
      { party: 'LINKE', err: -3.44 }
    ];
    const to = [
      { party: 'GRÜNE', err: 3.93 },
      { party: 'SPD', err: 1.3 },
      { party: 'BSW', err: 1.27 }
    ];
    const rest = [
      { party: 'AfD', err: 2.79 },
      { party: 'FDP', err: -0.42 },
      { party: 'Sonstige', err: 0.34 }
    ];
    const max = 5.77;
    const row = (r, cls) => {
      const w = (Math.abs(r.err) / max) * 100;
      const sign = r.err >= 0 ? '+' : '';
      return `<div class="steval-flow-row">
        <span class="steval-flow-name" style="color:${partyColor(r.party)}">${r.party}</span>
        <span class="steval-flow-track"><span class="steval-flow-bar ${cls}" style="width:${w}%;background:${partyColor(r.party)}"></span></span>
        <span class="steval-flow-n">${sign}${fmtPct(r.err, 1)}</span>
      </div>`;
    };
    const sum = (arr) => arr.reduce((s, r) => s + r.err, 0);
    root.innerHTML = `
      <div class="steval-flow">
        <div class="steval-flow-col">
          <div class="steval-flow-h">Unter der Prognose</div>
          ${from.map((r) => row(r, 'is-from')).join('')}
          <div class="steval-flow-sum">Summe ${fmtPct(sum(from), 1)} Pp.</div>
        </div>
        <div class="steval-flow-mid" aria-hidden="true">
          <span></span>
        </div>
        <div class="steval-flow-col">
          <div class="steval-flow-h">Über der Prognose</div>
          ${to.map((r) => row(r, 'is-to')).join('')}
          <div class="steval-flow-sum">Summe +${fmtPct(sum(to), 1)} Pp.</div>
        </div>
      </div>
      <div class="steval-flow-rest">
        Übrige Abweichung: ${rest
          .map((r) => `${r.party} ${r.err >= 0 ? '+' : ''}${fmtPct(r.err, 1)}`)
          .join(' · ')}
      </div>`;
  }

  function renderDistricts(root) {
    const cells = DATA.districts
      .map((d) => {
        const miss = d.pred !== d.act;
        const col = partyColor(d.act);
        return `<button type="button" class="steval-wk${miss ? ' is-miss' : ''}"
          style="background:${hexToRgba(col, miss ? 0.18 : 0.85)};color:${miss ? col : '#fff'};border-color:${miss ? col : 'transparent'}"
          title="WK ${d.wk} ${d.name}: Prognose ${d.pred}, Ergebnis ${d.act}">
          <span class="steval-wk-n">${d.wk}</span>
          ${miss ? `<span class="steval-wk-tag">${d.act}</span>` : ''}
        </button>`;
      })
      .join('');
    root.innerHTML = `
      <div class="steval-wk-legend">
        <span><i style="background:#009EE0"></i> AfD gewonnen</span>
        <span class="steval-wk-leg-miss"><i></i> Prognose falsch (alle drei: Linke)</span>
      </div>
      <div class="steval-wk-grid">${cells}</div>`;
  }

  function init() {
    const score = document.getElementById('steval-score');
    const votes = document.getElementById('steval-votes');
    const err = document.getElementById('steval-error');
    const scen = document.getElementById('steval-scenarios');
    const seats = document.getElementById('steval-seats');
    const size = document.getElementById('steval-size');
    const dist = document.getElementById('steval-districts');
    const flow = document.getElementById('steval-flow');
    if (score) renderScore(score);
    if (votes) renderVoteChart(votes);
    if (err) renderError(err);
    if (flow) renderFlow(flow);
    if (scen) renderScenarios(scen);
    if (seats) renderSeats(seats);
    if (size) renderSize(size);
    if (dist) renderDistricts(dist);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
