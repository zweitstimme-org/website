/**
 * Figures for the Berlin + Mecklenburg-Vorpommern 2026 evaluation
 * and the three-state (ST/BE/MV) coverage / district-accuracy check.
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
      fill: '#2e7d32',
      bg: '#eaf5ea',
      border: '#b7d7b8'
    },
    surprise: {
      badge: 'knapp eingetreten',
      fill: '#c47b17',
      bg: '#fbf3e4',
      border: '#e4c48a'
    },
    'false-alarm': {
      badge: 'nicht eingetreten',
      fill: '#c62828',
      bg: '#fbeaea',
      border: '#e3b6b6'
    },
    'true-negative': {
      badge: 'nicht eingetreten',
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

  const CHECK = {
    coverageExpected: 83.3,
    coverage: [
      { lab: 'Sachsen-Anhalt', hit: 4, n: 8 },
      { lab: 'Berlin', hit: 7, n: 8 },
      { lab: 'Mecklenburg-Vorp.', hit: 5, n: 8 },
      { lab: 'Zusammen', hit: 16, n: 24, total: true }
    ],
    accuracy: [
      { lab: 'Sachsen-Anhalt', hit: 38, n: 41, exp: 91.8 },
      { lab: 'Berlin', hit: 64, n: 78, exp: 78.6 },
      { lab: 'Mecklenburg-Vorp.', hit: 29, n: 36, exp: 79.1 },
      { lab: 'Zusammen', hit: 131, n: 155, exp: 82.2, total: true }
    ]
  };

  const LANDS = {
    BE: {
      prefix: 'beval',
      nDistricts: 78,
      seats: '158',
      seatsNote: 'Sitze im AGH (Median war 173)',
      votes: [
        { party: 'LINKE', fit: 21, low: 16, high: 25, actual: 25.7 },
        { party: 'CDU', fit: 20, low: 16, high: 24, actual: 18.8 },
        { party: 'AfD', fit: 18, low: 14, high: 22, actual: 16.3 },
        { party: 'GRÜNE', fit: 16, low: 12, high: 20, actual: 14.3 },
        { party: 'SPD', fit: 12, low: 9, high: 16, actual: 12.1 },
        { party: 'Sonstige', fit: 7, low: 5, high: 9, actual: 5.7 },
        { party: 'BSW', fit: 4, low: 3, high: 6, actual: 4.7 },
        { party: 'FDP', fit: 2, low: 2, high: 4, actual: 2.5 }
      ],
      scenarios: [
        { label: 'Parlamentsmehrheit SPD, Grüne und Linke', p: 89, hit: true },
        { label: 'Parlamentsmehrheit CDU, SPD und Grüne', p: 86, hit: true },
        { label: 'R2G unter Führung der Linken', p: 73, hit: true },
        { label: 'Linke stärkste Kraft', p: 44, hit: true },
        { label: 'CDU stärkste Kraft', p: 34, hit: false },
        { label: 'BSW über 5%-Hürde', p: 27, hit: false },
        { label: 'AfD stärkste Kraft', p: 16, hit: false },
        { label: 'Parlamentsmehrheit CDU und Grüne', p: 2, hit: false }
      ],
      size: [
        { label: '130', sub: 'gesetzl. Minimum', value: 130 },
        { label: '173', sub: 'Median Prognose', value: 173 },
        { label: '158', sub: 'Ergebnis', value: 158, actual: true },
        { label: '159', sub: 'AGH 2023', value: 159 }
      ],
      gridClass: 'steval-wk-grid--be',
      districts: [{"wk": 1, "name": "Mitte 1", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 2, "name": "Mitte 2", "pred": "LINKE", "act": "LINKE"}, {"wk": 3, "name": "Mitte 3", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 4, "name": "Mitte 4", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 5, "name": "Mitte 5", "pred": "LINKE", "act": "LINKE"}, {"wk": 6, "name": "Mitte 6", "pred": "LINKE", "act": "LINKE"}, {"wk": 7, "name": "Mitte 7", "pred": "LINKE", "act": "LINKE"}, {"wk": 8, "name": "Friedrichshain-Kreuzberg 1", "pred": "LINKE", "act": "LINKE"}, {"wk": 9, "name": "Friedrichshain-Kreuzberg 2", "pred": "GRÜNE", "act": "LINKE"}, {"wk": 10, "name": "Friedrichshain-Kreuzberg 3", "pred": "LINKE", "act": "LINKE"}, {"wk": 11, "name": "Friedrichshain-Kreuzberg 4", "pred": "LINKE", "act": "LINKE"}, {"wk": 12, "name": "Friedrichshain-Kreuzberg 5", "pred": "LINKE", "act": "LINKE"}, {"wk": 13, "name": "Pankow 1", "pred": "AfD", "act": "CDU"}, {"wk": 14, "name": "Pankow 2", "pred": "AfD", "act": "CDU"}, {"wk": 15, "name": "Pankow 3", "pred": "LINKE", "act": "LINKE"}, {"wk": 16, "name": "Pankow 4", "pred": "AfD", "act": "AfD"}, {"wk": 17, "name": "Pankow 5", "pred": "LINKE", "act": "LINKE"}, {"wk": 18, "name": "Pankow 6", "pred": "GRÜNE", "act": "LINKE"}, {"wk": 19, "name": "Pankow 7", "pred": "LINKE", "act": "LINKE"}, {"wk": 20, "name": "Pankow 8", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 21, "name": "Pankow 9", "pred": "LINKE", "act": "LINKE"}, {"wk": 22, "name": "Charlottenburg-Wilmersdorf 1", "pred": "CDU", "act": "LINKE"}, {"wk": 23, "name": "Charlottenburg-Wilmersdorf 2", "pred": "CDU", "act": "CDU"}, {"wk": 24, "name": "Charlottenburg-Wilmersdorf 3", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 25, "name": "Charlottenburg-Wilmersdorf 4", "pred": "GRÜNE", "act": "CDU"}, {"wk": 26, "name": "Charlottenburg-Wilmersdorf 5", "pred": "CDU", "act": "CDU"}, {"wk": 27, "name": "Charlottenburg-Wilmersdorf 6", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 28, "name": "Charlottenburg-Wilmersdorf 7", "pred": "CDU", "act": "CDU"}, {"wk": 29, "name": "Spandau 1", "pred": "CDU", "act": "CDU"}, {"wk": 30, "name": "Spandau 2", "pred": "CDU", "act": "AfD"}, {"wk": 31, "name": "Spandau 3", "pred": "CDU", "act": "LINKE"}, {"wk": 32, "name": "Spandau 4", "pred": "CDU", "act": "CDU"}, {"wk": 33, "name": "Spandau 5", "pred": "CDU", "act": "CDU"}, {"wk": 34, "name": "Steglitz-Zehlendorf 1", "pred": "CDU", "act": "GRÜNE"}, {"wk": 35, "name": "Steglitz-Zehlendorf 2", "pred": "CDU", "act": "CDU"}, {"wk": 36, "name": "Steglitz-Zehlendorf 3", "pred": "CDU", "act": "CDU"}, {"wk": 37, "name": "Steglitz-Zehlendorf 4", "pred": "CDU", "act": "CDU"}, {"wk": 38, "name": "Steglitz-Zehlendorf 5", "pred": "CDU", "act": "CDU"}, {"wk": 39, "name": "Steglitz-Zehlendorf 6", "pred": "CDU", "act": "CDU"}, {"wk": 40, "name": "Steglitz-Zehlendorf 7", "pred": "CDU", "act": "CDU"}, {"wk": 41, "name": "Tempelhof-Schöneberg 1", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 42, "name": "Tempelhof-Schöneberg 2", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 43, "name": "Tempelhof-Schöneberg 3", "pred": "GRÜNE", "act": "GRÜNE"}, {"wk": 44, "name": "Tempelhof-Schöneberg 4", "pred": "GRÜNE", "act": "LINKE"}, {"wk": 45, "name": "Tempelhof-Schöneberg 5", "pred": "CDU", "act": "CDU"}, {"wk": 46, "name": "Tempelhof-Schöneberg 6", "pred": "CDU", "act": "CDU"}, {"wk": 47, "name": "Tempelhof-Schöneberg 7", "pred": "CDU", "act": "CDU"}, {"wk": 48, "name": "Neukölln 1", "pred": "LINKE", "act": "LINKE"}, {"wk": 49, "name": "Neukölln 2", "pred": "LINKE", "act": "LINKE"}, {"wk": 50, "name": "Neukölln 3", "pred": "LINKE", "act": "LINKE"}, {"wk": 51, "name": "Neukölln 4", "pred": "CDU", "act": "CDU"}, {"wk": 52, "name": "Neukölln 5", "pred": "CDU", "act": "CDU"}, {"wk": 53, "name": "Neukölln 6", "pred": "CDU", "act": "CDU"}, {"wk": 54, "name": "Treptow-Köpenick 1", "pred": "LINKE", "act": "LINKE"}, {"wk": 55, "name": "Treptow-Köpenick 2", "pred": "LINKE", "act": "LINKE"}, {"wk": 56, "name": "Treptow-Köpenick 3", "pred": "AfD", "act": "SPD"}, {"wk": 57, "name": "Treptow-Köpenick 4", "pred": "AfD", "act": "AfD"}, {"wk": 58, "name": "Treptow-Köpenick 5", "pred": "AfD", "act": "AfD"}, {"wk": 59, "name": "Treptow-Köpenick 6", "pred": "AfD", "act": "AfD"}, {"wk": 60, "name": "Treptow-Köpenick 7", "pred": "LINKE", "act": "LINKE"}, {"wk": 61, "name": "Marzahn-Hellersdorf 1", "pred": "AfD", "act": "AfD"}, {"wk": 62, "name": "Marzahn-Hellersdorf 2", "pred": "AfD", "act": "AfD"}, {"wk": 63, "name": "Marzahn-Hellersdorf 3", "pred": "AfD", "act": "AfD"}, {"wk": 64, "name": "Marzahn-Hellersdorf 4", "pred": "CDU", "act": "AfD"}, {"wk": 65, "name": "Marzahn-Hellersdorf 5", "pred": "CDU", "act": "CDU"}, {"wk": 66, "name": "Marzahn-Hellersdorf 6", "pred": "AfD", "act": "AfD"}, {"wk": 67, "name": "Lichtenberg 1", "pred": "AfD", "act": "AfD"}, {"wk": 68, "name": "Lichtenberg 2", "pred": "CDU", "act": "CDU"}, {"wk": 69, "name": "Lichtenberg 3", "pred": "LINKE", "act": "LINKE"}, {"wk": 70, "name": "Lichtenberg 4", "pred": "LINKE", "act": "LINKE"}, {"wk": 71, "name": "Lichtenberg 5", "pred": "LINKE", "act": "LINKE"}, {"wk": 72, "name": "Lichtenberg 6", "pred": "LINKE", "act": "LINKE"}, {"wk": 73, "name": "Reinickendorf 1", "pred": "CDU", "act": "LINKE"}, {"wk": 74, "name": "Reinickendorf 2", "pred": "CDU", "act": "CDU"}, {"wk": 75, "name": "Reinickendorf 3", "pred": "CDU", "act": "CDU"}, {"wk": 76, "name": "Reinickendorf 4", "pred": "CDU", "act": "CDU"}, {"wk": 77, "name": "Reinickendorf 5", "pred": "CDU", "act": "AfD"}, {"wk": 78, "name": "Reinickendorf 6", "pred": "CDU", "act": "CDU"}]
    },
    MV: {
      prefix: 'mveval',
      nDistricts: 36,
      seats: '71',
      seatsNote: 'Sitze im Landtag (Median war 71)',
      votes: [
        { party: 'AfD', fit: 37, low: 31, high: 42, actual: 38.2 },
        { party: 'SPD', fit: 33, low: 28, high: 39, actual: 35.5 },
        { party: 'LINKE', fit: 10, low: 8, high: 13, actual: 6.5 },
        { party: 'GRÜNE', fit: 5, low: 4, high: 7, actual: 5.7 },
        { party: 'CDU', fit: 7, low: 5, high: 9, actual: 4.9 },
        { party: 'BSW', fit: 4, low: 3, high: 5, actual: 4.8 },
        { party: 'Sonstige', fit: 2, low: 1, high: 3, actual: 3.4 },
        { party: 'FDP', fit: 2, low: 1, high: 3, actual: 1.0 }
      ],
      scenarios: [
        { label: 'Parlamentsmehrheit ohne AfD', p: 98, hit: true },
        { label: 'Parlamentsmehrheit ohne AfD und BSW', p: 97, hit: true },
        { label: 'AfD stärkste Kraft', p: 65, hit: true },
        { label: 'Grüne über 5%-Hürde', p: 52, hit: true },
        { label: 'Parlamentsmehrheit SPD, Grüne und Linke', p: 40, hit: true },
        { label: 'Parlamentsmehrheit SPD und Linke', p: 36, hit: false },
        { label: 'SPD stärkste Kraft', p: 35, hit: false },
        { label: 'BSW über 5%-Hürde', p: 8, hit: false },
        { label: 'Absolute Mehrheit AfD', p: 2, hit: false }
      ],
      size: [
        { label: '71', sub: 'gesetzl. Minimum', value: 71 },
        { label: '71', sub: 'Median Prognose', value: 71 },
        { label: '71', sub: 'Ergebnis', value: 71, actual: true },
        { label: '79', sub: 'Landtag 2021', value: 79 }
      ],
      gridClass: 'steval-wk-grid--mv',
      districts: [{"wk": 1, "name": "Greifswald", "pred": "SPD", "act": "SPD"}, {"wk": 2, "name": "Neubrandenburg I", "pred": "SPD", "act": "AfD"}, {"wk": 3, "name": "Neubrandenburg II", "pred": "SPD", "act": "SPD"}, {"wk": 4, "name": "Hansestadt Rostock I", "pred": "SPD", "act": "SPD"}, {"wk": 5, "name": "Hansestadt Rostock II", "pred": "SPD", "act": "SPD"}, {"wk": 6, "name": "Hansestadt Rostock III", "pred": "SPD", "act": "SPD"}, {"wk": 7, "name": "Hansestadt Rostock IV", "pred": "SPD", "act": "SPD"}, {"wk": 8, "name": "Schwerin I", "pred": "SPD", "act": "SPD"}, {"wk": 9, "name": "Schwerin II", "pred": "SPD", "act": "SPD"}, {"wk": 10, "name": "Wismar", "pred": "SPD", "act": "SPD"}, {"wk": 11, "name": "Landkreis Rostock I", "pred": "SPD", "act": "SPD"}, {"wk": 12, "name": "Landkreis Rostock II", "pred": "SPD", "act": "SPD"}, {"wk": 13, "name": "Mecklenburgische Seenplatte I - Vorpommern-Greifswald I", "pred": "AfD", "act": "AfD"}, {"wk": 14, "name": "Mecklenburgische Seenplatte II", "pred": "AfD", "act": "AfD"}, {"wk": 15, "name": "Landkreis Rostock III", "pred": "AfD", "act": "AfD"}, {"wk": 16, "name": "Landkreis Rostock IV", "pred": "SPD", "act": "AfD"}, {"wk": 17, "name": "Ludwigslust-Parchim I", "pred": "SPD", "act": "SPD"}, {"wk": 18, "name": "Ludwigslust-Parchim II", "pred": "SPD", "act": "AfD"}, {"wk": 19, "name": "Ludwigslust-Parchim III", "pred": "AfD", "act": "AfD"}, {"wk": 20, "name": "Mecklenburgische Seenplatte III", "pred": "AfD", "act": "AfD"}, {"wk": 21, "name": "Mecklenburgische Seenplatte IV", "pred": "SPD", "act": "AfD"}, {"wk": 22, "name": "Mecklenburgische Seenplatte V", "pred": "AfD", "act": "AfD"}, {"wk": 23, "name": "Vorpommern-Rügen I", "pred": "AfD", "act": "AfD"}, {"wk": 24, "name": "Vorpommern-Rügen II - Stralsund III", "pred": "AfD", "act": "AfD"}, {"wk": 25, "name": "Vorpommern-Rügen III - Stralsund I", "pred": "AfD", "act": "AfD"}, {"wk": 26, "name": "Stralsund II", "pred": "AfD", "act": "SPD"}, {"wk": 27, "name": "Nordwestmecklenburg I", "pred": "SPD", "act": "SPD"}, {"wk": 28, "name": "Nordwestmecklenburg II", "pred": "SPD", "act": "AfD"}, {"wk": 29, "name": "Vorpommern-Greifswald II", "pred": "AfD", "act": "AfD"}, {"wk": 30, "name": "Vorpommern-Greifswald III", "pred": "AfD", "act": "AfD"}, {"wk": 31, "name": "Ludwigslust-Parchim IV", "pred": "AfD", "act": "AfD"}, {"wk": 32, "name": "Ludwigslust-Parchim V", "pred": "SPD", "act": "AfD"}, {"wk": 33, "name": "Vorpommern-Rügen IV", "pred": "AfD", "act": "AfD"}, {"wk": 34, "name": "Vorpommern-Rügen V", "pred": "AfD", "act": "AfD"}, {"wk": 35, "name": "Vorpommern-Greifswald IV", "pred": "AfD", "act": "AfD"}, {"wk": 36, "name": "Vorpommern-Greifswald V", "pred": "AfD", "act": "AfD"}]
    }
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

  function renderCheck(root, rows, opts) {
    const expected = opts.expected;
    const html = rows
      .map((r) => {
        const pct = (r.hit / r.n) * 100;
        const exp = r.exp != null ? r.exp : expected;
        const over = pct + 0.05 >= exp;
        const cls = r.total ? ' is-total' : '';
        return `
          <div class="steval-check-row${cls}">
            <div class="steval-check-lab">${r.lab}</div>
            <div class="steval-check-track">
              <span class="steval-check-bar" style="width:${pct}%;background:${over ? '#2e7d32' : '#c62828'}"></span>
              <span class="steval-check-exp" style="left:${exp}%" title="erwartet: ${fmtPct(exp, 1)} %"></span>
            </div>
            <div class="steval-check-val">${r.hit}/${r.n}</div>
          </div>`;
      })
      .join('');
    const note = opts.note
      ? `<p class="steval-check-note">${opts.note}</p>`
      : '';
    root.innerHTML = html + note;
  }

  function renderScore(root, land) {
    const mae =
      land.votes.reduce((s, r) => s + Math.abs(r.actual - r.fit), 0) / land.votes.length;
    const inside = land.votes.filter(inBand).length;
    const correct = land.districts.filter((d) => d.pred === d.act).length;
    const items = [
      { v: `${fmtPct(mae, 1)} Pp.`, l: 'mittlerer Fehler (Zweitstimme)' },
      { v: `${inside} von ${land.votes.length}`, l: 'Parteien im 5/6-Intervall' },
      { v: `${correct} von ${land.nDistricts}`, l: 'Direktmandaten richtig' },
      { v: land.seats, l: land.seatsNote }
    ];
    root.innerHTML = `<div class="steval-score">${items
      .map(
        (it) =>
          `<div class="steval-score-item"><div class="steval-score-v">${it.v}</div><div class="steval-score-l">${it.l}</div></div>`
      )
      .join('')}</div>`;
  }

  function renderVoteChart(canvas, rows) {
    if (typeof Chart === 'undefined' || !canvas) return;
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
                const r = rows[ctx.dataIndex];
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
            max: Math.ceil(maxHi * 1.12),
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

  function renderError(root, votes) {
    const rows = votes.slice().sort((a, b) => (a.actual - a.fit) - (b.actual - b.fit));
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

  function renderScenarios(root, scenarios) {
    const items = scenarios.map((s) => ({ ...s, kind: kindOf(s.p, s.hit) }));
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
          <div class="steval-scen-item" style="background:${c.bg};border-color:${c.border}">
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

  function renderSize(root, buckets) {
    const max = Math.max(...buckets.map((b) => b.value));
    root.innerHTML = `<div class="steval-size">${buckets
      .map((b, i) => {
        const h = Math.max(8, (b.value / max) * 100);
        return `
          <div class="steval-size-col${b.actual ? ' is-actual' : ''}">
            <div class="steval-size-val">${b.label}</div>
            <div class="steval-size-bar-wrap">
              <div class="steval-size-bar" style="height:${h}%; animation-delay:${i * 70}ms"></div>
            </div>
            <div class="steval-size-lab">${b.sub}${b.actual ? '<span>Ergebnis</span>' : ''}</div>
          </div>`;
      })
      .join('')}</div>`;
  }

  function renderDistricts(root, land) {
    const cells = land.districts
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
    root.innerHTML = `<div class="steval-wk-grid ${land.gridClass}">${cells}</div>`;
  }

  function mountLand(land) {
    const p = land.prefix;
    const score = document.getElementById(`${p}-score`);
    const votes = document.getElementById(`${p}-votes`);
    const err = document.getElementById(`${p}-error`);
    const scen = document.getElementById(`${p}-scenarios`);
    const size = document.getElementById(`${p}-size`);
    const dist = document.getElementById(`${p}-districts`);
    if (score) renderScore(score, land);
    if (votes) renderVoteChart(votes, land.votes);
    if (err) renderError(err, land.votes);
    if (scen) renderScenarios(scen, land.scenarios);
    if (size) renderSize(size, land.size);
    if (dist) renderDistricts(dist, land);
  }

  function init() {
    const cov = document.getElementById('ltw26-coverage');
    const acc = document.getElementById('ltw26-accuracy');
    if (cov) {
      renderCheck(cov, CHECK.coverage, {
        expected: CHECK.coverageExpected,
        note: 'Schwarzer Strich = nominal 5/6 (83&nbsp;%).'
      });
    }
    if (acc) {
      renderCheck(acc, CHECK.accuracy, {
        expected: 82.2,
        note: 'Schwarzer Strich = erwartete Trefferquote (Mittel der Favoriten-Wahrscheinlichkeiten).'
      });
    }
    mountLand(LANDS.BE);
    mountLand(LANDS.MV);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
