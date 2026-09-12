/**
 * District (Direktmandat) forecast map — Leaflet choropleth + detail panel.
 * Public page: /direktmandate/
 * Method: blog/posts/district-forecast-methodology/
 */
(function (global) {
  'use strict';

  const DISTRICT_PARTY_COLORS = {
    'CDU/CSU': '#000000',
    CDU: '#000000',
    CSU: '#000000',
    AfD: '#009EE0',
    SPD: '#E3000F',
    'GRÜNE': '#46962b',
    LINKE: '#BE3075',
    FDP: '#FFED00',
    BSW: '#FF6B35',
    Sonstige: '#888888'
  };

  const DISTRICT_GEO_ATTRIBUTION = {
    MV: 'Wahlkreise: LAiV MV',
    ST: 'Wahlkreise: StaLA Sachsen-Anhalt',
    BE: 'Wahlkreise: Geoportal Berlin / AfS BBB'
  };

  /** Official last-election size / turnout (amtliches Endergebnis) for 2026 forecasts. */
  const LAST_ELECTION_REF = {
    MV: { year: 2021, label: 'LTW 2021', size: 79, turnout: 70.8 },
    ST: { year: 2021, label: 'LTW 2021', size: 97, turnout: 60.3 },
    BE: { year: 2023, label: 'AGH 2023', size: 159, turnout: 62.9 }
  };

  function lastElectionForState(code, st) {
    const fromJson = st && st.last_election;
    if (fromJson && (fromJson.size != null || fromJson.turnout != null)) {
      return {
        year: fromJson.year,
        label: fromJson.label || String(fromJson.year || 'letzte Wahl'),
        size: fromJson.size,
        turnout: fromJson.turnout
      };
    }
    return LAST_ELECTION_REF[code] || null;
  }

  function bucketContainsSize(label, size) {
    if (label == null || size == null || !Number.isFinite(Number(size))) return false;
    const n = Number(size);
    const s = String(label).replace(/\s/g, '');
    if (s.endsWith('+')) {
      const lo = parseInt(s, 10);
      return Number.isFinite(lo) && n >= lo;
    }
    const m = s.match(/^(\d+)[–\-−](\d+)$/);
    if (m) {
      const lo = Number(m[1]);
      const hi = Number(m[2]);
      return n >= lo && n <= hi;
    }
    return Number(s) === n;
  }

  /** Berlin AWK (Bezirk+lokaler WK) → statewide 1–78 (from berlin/awk_wkr_map.json). */
  const BE_AWK_TO_WKR = {
    '0101': 1, '0102': 2, '0103': 3, '0104': 4, '0105': 5, '0106': 6, '0107': 7,
    '0201': 8, '0202': 9, '0203': 10, '0204': 11, '0205': 12,
    '0301': 13, '0302': 14, '0303': 15, '0304': 16, '0305': 17, '0306': 18, '0307': 19, '0308': 20, '0309': 21,
    '0401': 22, '0402': 23, '0403': 24, '0404': 25, '0405': 26, '0406': 27, '0407': 28,
    '0501': 29, '0502': 30, '0503': 31, '0504': 32, '0505': 33,
    '0601': 34, '0602': 35, '0603': 36, '0604': 37, '0605': 38, '0606': 39, '0607': 40,
    '0701': 41, '0702': 42, '0703': 43, '0704': 44, '0705': 45, '0706': 46, '0707': 47,
    '0801': 48, '0802': 49, '0803': 50, '0804': 51, '0805': 52, '0806': 53,
    '0901': 54, '0902': 55, '0903': 56, '0904': 57, '0905': 58, '0906': 59, '0907': 60,
    '1001': 61, '1002': 62, '1003': 63, '1004': 64, '1005': 65, '1006': 66,
    '1101': 67, '1102': 68, '1103': 69, '1104': 70, '1105': 71, '1106': 72,
    '1201': 73, '1202': 74, '1203': 75, '1204': 76, '1205': 77, '1206': 78
  };

  const BE_ADDRESS_WFS =
    'https://gdi.berlin.de/services/wfs/adressen_rbs';
  const PHOTON_API = 'https://photon.komoot.io/api/';

  let mapInstance = null;
  let mapLayer = null;
  let addressMarker = null;
  let leafletLoaderPromise = null;
  let searchSession = null;
  let genderFoldOpen = false;
  let sizeFoldOpen = false;

  function bindDistrictFold(el, setOpen) {
    const fold = el && el.querySelector('details.district-fold');
    if (!fold) return;
    fold.addEventListener('toggle', () => setOpen(fold.open));
  }

  function formatStandDate(raw) {
    if (!raw || typeof raw !== 'string') return '';
    // Prefer calendar date from the string — avoid TZ shifting last_update timestamps.
    const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}.${mm}.${yyyy}`;
  }

  function setDistrictStand(metadata) {
    const el = document.getElementById('vorhersage-districts-stand');
    if (!el) return;
    if (!metadata) {
      el.textContent = '';
      return;
    }
    // Stand = model run; Letzte Umfrage = poll that entered the statewide forecast.
    const stand = formatStandDate(metadata.last_update || '');
    const poll = formatStandDate(
      metadata.statewide_last_poll_date || metadata.last_poll_date || ''
    );
    const bits = [];
    if (stand) bits.push(`Stand: ${stand}`);
    if (poll) bits.push(`Letzte Umfrage: ${poll}`);
    el.textContent = bits.length ? ` · ${bits.join(' · ')}` : '';
  }

  const UNOFFICIAL_DIRECT_NOTE =
    'Die hier angezeigten Direktkandidat:innen-Namen stammen überwiegend aus Angaben der Parteien; je Person finden Sie die genutzte Quelle auf der Profilseite. Nichtamtliche Namensstände können sich bis zum amtlichen Bewerberverzeichnis ändern.';

  const BE_CALC_UPDATE_NOTE =
    'Aktualisierung 29.8.2026: Parlamentsgröße und Listen-Einzugschancen berücksichtigen jetzt Überhang je Bezirksliste (CDU, SPD, Linke) — nicht landesweit verrechnet. Das Abgeordnetenhaus fällt in den Simulationen deutlich größer aus als 130 Sitze. Die Direktmandat-Wahrscheinlichkeiten sind unverändert.';

  function setDistrictSourceNote(code) {
    const el = document.getElementById('vorhersage-districts-source-note');
    if (!el) return;
    const unofficial = code === 'MV';
    el.hidden = !unofficial;
    el.textContent = unofficial ? UNOFFICIAL_DIRECT_NOTE : '';
  }

  function setDistrictCalcNote(code) {
    const el = document.getElementById('vorhersage-districts-calc-note');
    if (!el) return;
    const show = String(code || '').toUpperCase() === 'BE';
    el.hidden = !show;
    el.textContent = show ? BE_CALC_UPDATE_NOTE : '';
  }

  function ensureLeaflet() {
    if (global.L) return Promise.resolve(global.L);
    if (leafletLoaderPromise) return leafletLoaderPromise;
    leafletLoaderPromise = new Promise((resolve, reject) => {
      const cssId = 'leaflet-css-cdn';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // Always refresh: an older cached run may have created this without the margin reset.
      let style = document.getElementById('leaflet-zoom-fix');
      if (!style) {
        style = document.createElement('style');
        style.id = 'leaflet-zoom-fix';
        document.head.appendChild(style);
      }
      // PaperMod `.post-content img { margin:1rem 0 }` shifts every tile ~16px south →
      // polygons look too far north (much worse when zoomed out).
      style.textContent = `
        .post-content #vorhersage-districts-map .leaflet-container img,
        .post-content #vorhersage-districts-map img.leaflet-tile,
        #vorhersage-districts-map .leaflet-container img,
        #vorhersage-districts-map img.leaflet-tile {
          max-width: none !important;
          max-height: none !important;
          width: 256px !important;
          height: 256px !important;
          margin: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          display: block !important;
        }
        #vorhersage-districts-map .leaflet-control-zoom a,
        #vorhersage-districts-map .leaflet-bar a {
          text-decoration: none !important;
          color: #333 !important;
          background-color: #fff !important;
        }
        #vorhersage-districts-map .leaflet-control-zoom a:hover,
        #vorhersage-districts-map .leaflet-bar a:hover {
          text-decoration: none !important;
          background-color: #f4f4f4 !important;
        }
      `;
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(global.L);
      script.onerror = () => reject(new Error('Leaflet failed to load'));
      document.head.appendChild(script);
    });
    return leafletLoaderPromise;
  }

  function districtWinnerIndex(items) {
    const byWkr = {};
    (items || []).forEach(row => {
      if (!row || row.wkr == null) return;
      if (!byWkr[row.wkr]) byWkr[row.wkr] = [];
      byWkr[row.wkr].push(row);
    });
    const winners = {};
    Object.keys(byWkr).forEach(wkr => {
      const rows = byWkr[wkr];
      const win = rows.find(r => r.winner) || rows.slice().sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
      if (win) winners[String(wkr)] = win;
    });
    return winners;
  }

  function districtRowsByWkr(items) {
    const byWkr = {};
    (items || []).forEach((row) => {
      if (!row || row.wkr == null) return;
      const key = String(row.wkr);
      if (!byWkr[key]) byWkr[key] = [];
      byWkr[key].push(row);
    });
    return byWkr;
  }

  function districtStripeCandidates(rows) {
    return (rows || [])
      .filter((r) => !districtIsOthers(r) && districtWinProbability(r) > 10)
      .sort((a, b) => (districtWinProbability(b) || 0) - (districtWinProbability(a) || 0));
  }

  function districtNeedsStripes(label) {
    return label === 'Offen' || label === 'Völlig offen' || label === 'Tendenziell';
  }

  /**
   * Patterns must live in the same SVG as the Leaflet paths. A separate
   * document-level <svg width=0> often fails to paint url(#…) fills.
   * Recreate defs after Leaflet rebuilds its overlay SVG (fit/zoom).
   */
  function districtStripeDefs(map) {
    if (!map || !map.getPanes) return null;
    const overlay = map.getPanes().overlayPane && map.getPanes().overlayPane.querySelector('svg');
    if (!overlay) return null;
    let defs = overlay.querySelector('defs.district-stripe-defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.classList.add('district-stripe-defs');
      overlay.insertBefore(defs, overlay.firstChild);
    }
    return defs;
  }

  /**
   * Diagonal multi-party hatch. Stripe widths follow each party's share of
   * win probabilities among parties above 10% (quantized for reuse).
   */
  function ensureDistrictStripePattern(map, segments) {
    const defs = districtStripeDefs(map);
    if (!defs || !segments || segments.length < 2) return null;
    const safe = (c) => String(c || 'x').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'x';
    const total = segments.reduce((s, seg) => s + Math.max(0, Number(seg.share) || 0), 0);
    if (total <= 0) return null;

    // Quantize shares to 20ths so identical races share one pattern.
    const parts = segments.map((seg) => {
      const raw = Math.max(0, Number(seg.share) || 0) / total;
      return {
        color: seg.color || '#999',
        q: Math.max(1, Math.round(raw * 20))
      };
    });
    let qSum = parts.reduce((s, p) => s + p.q, 0);
    while (qSum > 20) {
      const i = parts.reduce((best, p, idx, arr) => (p.q > arr[best].q ? idx : best), 0);
      if (parts[i].q <= 1) break;
      parts[i].q -= 1;
      qSum -= 1;
    }
    while (qSum < 20) {
      const i = parts.reduce((best, p, idx, arr) => (p.q >= arr[best].q ? idx : best), 0);
      parts[i].q += 1;
      qSum += 1;
    }

    const id = `dstripe-${parts.map((p) => `${safe(p.color)}${p.q}`).join('-')}`;
    if (!defs.querySelector(`[id="${id}"]`)) {
      const period = Math.max(16, parts.length * 6);
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', id);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('width', String(period));
      pattern.setAttribute('height', String(period));
      pattern.setAttribute('patternTransform', 'rotate(35)');

      let x = 0;
      parts.forEach((p, idx) => {
        const w = idx === parts.length - 1
          ? period - x
          : Math.max(2, Math.round((period * p.q) / 20));
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', '0');
        rect.setAttribute('width', String(Math.max(1, w)));
        rect.setAttribute('height', String(period));
        rect.setAttribute('fill', p.color);
        pattern.appendChild(rect);
        x += w;
      });
      defs.appendChild(pattern);
    }
    return id;
  }

  /**
   * Same-document fragment only. Absolute `location.href#id` breaks when the
   * page URL has a query (?state=ST) — SVG paint servers often fail to match.
   */
  function districtPatternFill(patternId) {
    if (!patternId) return null;
    return `url(#${patternId})`;
  }

  function districtFillStyle(win, opts) {
    const map = opts && opts.map;
    const partyRows = (opts && opts.partyRows) || null;
    const color = win ? (DISTRICT_PARTY_COLORS[win.partei] || '#999') : '#ccc';
    const p = Math.max(0, Math.min(100, Number(win && win.probability) || 0)) / 100;
    // Moderate fill: basemap labels stay readable, colors still readable at a glance.
    const fillOpacity = 0.18 + 0.38 * p;
    const base = {
      color: '#3a3a3a',
      weight: 1.1,
      opacity: 0.65,
      fillColor: color,
      fillOpacity,
      patternId: null
    };

    if (!partyRows || !map) return base;
    const runnerUp = districtRunnerUpWinProbability(partyRows);
    const label = districtWinLikelihoodLabel(districtWinProbability(win), runnerUp);
    if (!districtNeedsStripes(label)) return base;

    const contenders = districtStripeCandidates(partyRows);
    if (contenders.length < 2) return base;
    const segments = contenders.map((row) => ({
      color: DISTRICT_PARTY_COLORS[row.partei] || '#999',
      share: districtWinProbability(row) || 0
    }));
    const patternId = ensureDistrictStripePattern(map, segments);
    const fill = districtPatternFill(patternId);
    if (!fill) return base;
    // Same opacity scale as solid fills: stronger when the leader is clearer.
    return {
      color: '#3a3a3a',
      weight: 1.1,
      opacity: 0.65,
      fillColor: fill,
      fillOpacity,
      patternId
    };
  }

  function districtHasCandidateName(r) {
    if (!r) return false;
    if (r.name && String(r.name).trim()) return true;
    return !!(r.Vornamen && r.Nachname);
  }

  function districtIsOthers(r) {
    const p = String((r && r.party) || '').toLowerCase();
    const label = String((r && r.partei) || '');
    return p === 'others' || p === 'oth' || label === 'Sonstige' || label === 'And.' || label === 'Andere';
  }

  function districtRowsForDisplay(rows, _stateItems, opts) {
    const complete = !!(opts && opts.candidatesComplete);
    const all = (rows || []).slice();
    const keep = [];
    all.forEach(r => {
      if (districtIsOthers(r)) return;
      // Never fold CDU/SPD/… into Sonstige. A missing Direkt name is not
      // "others" — only official complete lists may hide a party that does
      // not field a candidate (ST). Berlin lists are incomplete.
      if (!districtHasCandidateName(r) && complete) return;
      keep.push(r);
    });
    const othersSrc = all.find(districtIsOthers);
    const out = keep.map(r => ({ ...r }));
    if (othersSrc) {
      const o = { ...othersSrc };
      o.partei = (o.partei === 'And.') ? 'Andere' : (o.partei || 'Sonstige');
      delete o.name;
      delete o.Vornamen;
      delete o.Nachname;
      out.push(o);
    }
    return out.sort((a, b) => {
      const aOth = districtIsOthers(a) ? 1 : 0;
      const bOth = districtIsOthers(b) ? 1 : 0;
      if (aOth !== bOth) return aOth - bOth;
      return (b.probability || 0) - (a.probability || 0) || (b.value || 0) - (a.value || 0);
    });
  }

  function formatWinProbabilityPct(prob) {
    const n = Number(prob);
    if (!Number.isFinite(n)) return '—';
    const rounded = Math.round(n);
    if (rounded >= 100) return '~100%';
    if (rounded <= 0) return '~0%';
    return `${rounded}%`;
  }

  /**
   * IPCC-style likelihood for the district favorite (0–100).
   * If a second party is still above 33%, the race is "Offen" even when
   * the leader is just over 50% (e.g. 51–47).
   */
  function districtRunnerUpWinProbability(partyRows) {
    const probs = (partyRows || [])
      .filter((r) => !districtIsOthers(r))
      .map((r) => districtWinProbability(r))
      .filter((p) => Number.isFinite(p))
      .sort((a, b) => b - a);
    return probs.length >= 2 ? probs[1] : 0;
  }

  function districtWinLikelihoodLabel(prob, runnerUpProb) {
    const p = Number(prob);
    if (!Number.isFinite(p)) return '';
    const second = Number(runnerUpProb);
    if (Number.isFinite(second) && second > 33) return 'Offen';
    if (p >= 99) return 'Nahezu sicher';
    if (p >= 90) return 'Sehr wahrscheinlich';
    if (p >= 66) return 'Wahrscheinlich';
    if (p > 50) return 'Tendenziell';
    if (p >= 33) return 'Offen';
    return 'Völlig offen';
  }

  function districtWinLikelihoodIsOpen(label) {
    return label === 'Offen' || label === 'Völlig offen';
  }

  /** Headline HTML for the WK detail header (party names escaped). */
  function districtWinLikelihoodHeadline(label, favorite, partyRows) {
    const favProb = districtWinProbability(favorite);
    const favName = escapeHtml((favorite && favorite.partei) || '');
    if (!label) {
      return `<strong>${favName}</strong> (P(Sieg): ${formatWinProbabilityPct(favProb)})`;
    }
    if (districtWinLikelihoodIsOpen(label)) {
      const listed = (partyRows || [])
        .filter((r) => !districtIsOthers(r) && districtWinProbability(r) > 5)
        .sort((a, b) => (districtWinProbability(b) || 0) - (districtWinProbability(a) || 0));
      if (listed.length) {
        const bits = listed.map((r) =>
          `${escapeHtml(r.partei)} (${formatWinProbabilityPct(districtWinProbability(r))})`
        );
        return `${escapeHtml(label)}: ${bits.join(', ')}`;
      }
    }
    return `${escapeHtml(label)}: <strong>${favName}</strong> (${formatWinProbabilityPct(favProb)})`;
  }

  /** District win chance from the Wahlkreis forecast (0–100). */
  function districtWinProbability(row) {
    const n = Number(row && row.probability);
    return Number.isFinite(n) ? n : null;
  }

  function districtBandBarHtml(row, maxHigh) {
    const lo = Number(row.low);
    const hi = Number(row.high);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return '';
    const scaleMax = Math.max(5, maxHigh || 50);
    const left = Math.max(0, (lo / scaleMax) * 100);
    const width = Math.max(1.5, Math.min(100 - left, ((hi - lo) / scaleMax) * 100));
    const barWidth = Math.min(width, Math.max(0, 78 - left));
    const color = DISTRICT_PARTY_COLORS[row.partei] || '#999';
    const label = `${Math.round(lo)}–${Math.round(hi)}%`;
    return `
      <div style="position:relative;height:20px;background:#f0f0f0;border-radius:4px;width:100%;margin-top:0.35rem;" title="95%-Unsicherheitsintervall der Erststimme">
        <div style="position:absolute;left:${left}%;width:${barWidth}%;height:4px;top:50%;transform:translateY(-50%);background:${color};border-radius:2px;"></div>
        <div style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:0.78rem;color:#333;background:#f0f0f0;padding-left:4px;z-index:1;">${label} <span style="color:#888;font-weight:400;">(95 %)</span></div>
      </div>`;
  }

  function normalizePartyCode(party, partei) {
    const p = String(party || '').toLowerCase().trim();
    if (p) return p;
    const label = String(partei || '').toUpperCase();
    if (label.includes('SPD')) return 'spd';
    if (label.includes('AFD')) return 'afd';
    if (label.includes('CDU') || label.includes('CSU')) return 'cdu';
    if (label.includes('LINKE')) return 'linke';
    if (label.includes('GRÜNE') || label.includes('GRUENE')) return 'gruene';
    if (label.includes('FDP')) return 'fdp';
    if (label.includes('BSW')) return 'bsw';
    return '';
  }

  function siteBase() {
    return ((global.pipelineData && global.pipelineData.SITE_BASE) || '/').replace(/\/?$/, '/');
  }

  function einzugListHref(stateCode, rec) {
    const params = new URLSearchParams();
    params.set('state', String(stateCode || '').toUpperCase());
    if (rec && rec.party) params.set('party', rec.party);
    if (rec && rec.list_type === 'bezirk' && rec.bezirk) params.set('bezirk', rec.bezirk);
    else if (rec && rec.list_type === 'bezirk' && rec.bezirk_name) params.set('bezirk', rec.bezirk_name);
    if (rec && rec.name) params.set('q', rec.name);
    if (rec && rec.list_pos != null) params.set('platz', String(rec.list_pos));
    return `${siteBase()}einzug/?${params.toString()}`;
  }

  /** Index Direktkandidat → Listenplatz / P(Liste) from forecast_candidate_entry.json */
  function buildListLookup(entryPayload, stateCode) {
    const byWkr = Object.create(null);
    const byName = Object.create(null);
    const st = entryPayload && entryPayload.states && entryPayload.states[stateCode];
    if (!st || !Array.isArray(st.parties)) return { byWkr, byName, stateCode };
    st.parties.forEach((party) => {
      const code = String(party.party || '').toLowerCase();
      (party.candidates || []).forEach((c) => {
        if (!c || c.is_placeholder) return;
        if (c.list_pos == null && c.wkr_direct == null) return;
        const rec = {
          party: code,
          name: c.name,
          person_id: c.person_id || '',
          source: c.source || '',
          list_pos: c.list_pos,
          list_type: c.list_type || party.list_type,
          bezirk: c.bezirk || '',
          bezirk_name: c.bezirk_name || '',
          wkr_direct: c.wkr_direct,
          p_list: c.p_list,
          p_entry: c.p_entry,
          p_direct: c.p_direct,
          birth_year: c.birth_year,
          birth_place: c.birth_place,
          residence: c.residence,
          profession: c.profession,
          is_incumbent: !!c.is_incumbent,
          incumbent_chamber: c.incumbent_chamber || '',
          incumbent_url: c.incumbent_url || '',
          aw_url: c.aw_url || ''
        };
        if (c.wkr_direct != null) {
          byWkr[`${code}|${Number(c.wkr_direct)}`] = rec;
        }
        if (c.name) {
          const key = `${code}|${String(c.name).toLowerCase().replace(/\s+/g, ' ').trim()}`;
          // Prefer record that has both list + direct when colliding
          const prev = byName[key];
          if (!prev || (rec.list_pos != null && prev.list_pos == null)) byName[key] = rec;
        }
      });
    });
    return { byWkr, byName, stateCode };
  }

  function lookupListInfo(listLookup, row) {
    if (!listLookup) return null;
    const code = normalizePartyCode(row.party, row.partei);
    if (!code) return null;
    const wkr = Number(row.wkr);
    let rec = listLookup.byWkr[`${code}|${wkr}`];
    if (!rec && row.name) {
      const key = `${code}|${String(row.name).toLowerCase().replace(/\s+/g, ' ').trim()}`;
      rec = listLookup.byName[key];
    }
    return rec || null;
  }

  /** Returns safe HTML (text escaped; link attributes escaped).
   *  When ``districtWinPct`` is given (Wahlkreis P(Sieg)), align P(Einzug) so
   *  Liste 0 ⇒ Einzug = Sieg (avoids 47 vs 46 from out-of-sync entry sims).
   */
  function formatListEntryLine(rec, stateCode, districtWinPct) {
    if (!rec) return '';
    const href = einzugListHref(stateCode || (rec && rec._state) || '', rec);
    const pList = Number(rec.p_list);
    const pEntry = Number(rec.p_entry);
    const pDirect = Number(rec.p_direct);
    const distWin = Number(districtWinPct);
    let entryPct = Number.isFinite(pEntry) ? pEntry : null;
    if (
      entryPct != null &&
      Number.isFinite(distWin) &&
      Number.isFinite(pDirect)
    ) {
      // pe = pd + pl within entry sim → swap in district P(Sieg) as pd.
      entryPct = Math.max(0, Math.min(100, Math.round(pEntry - pDirect + distWin)));
    } else if (entryPct == null && Number.isFinite(distWin)) {
      entryPct = Math.round(distWin);
    }
    if (rec.list_pos == null) {
      const bits = [
        `<a class="district-list-link" href="${escapeHtml(href)}" title="Zur Einzugsansicht">kein Listenplatz</a>`,
        'P(über Liste) —'
      ];
      if (Number.isFinite(entryPct)) {
        bits.push(`P(Einzug) ${Math.round(entryPct)}% (= Direkt)`);
      }
      return bits.join(' · ');
    }
    const where =
      rec.list_type === 'bezirk' && rec.bezirk_name
        ? `Bezirksliste ${rec.bezirk_name}`
        : 'Landesliste';
    const label = `${where} Platz ${rec.list_pos}`;
    const bits = [
      `<a class="district-list-link" href="${escapeHtml(href)}" title="Zur Listenansicht">${escapeHtml(label)}</a>`
    ];
    if (Number.isFinite(pList)) bits.push(`P(über Liste) ${Math.round(pList)}%`);
    if (Number.isFinite(entryPct)) bits.push(`P(Einzug) ${Math.round(entryPct)}%`);
    return bits.join(' · ');
  }

  function renderDistrictDetail(wkr, items, wkrName, l1Label, listLookup, districtMeta) {
    const el = document.getElementById('vorhersage-districts-detail');
    if (!el) return;
    const candidatesComplete = !!(districtMeta && districtMeta.candidates_complete);
    const allRowsRaw = (items || []).filter(r => Number(r.wkr) === Number(wkr));
    // Enrich from Einzug/Listen data when district JSON has no Direkt name yet.
    const allRows = allRowsRaw.map((r) => {
      if (districtIsOthers(r) || districtHasCandidateName(r)) return r;
      const listRec = lookupListInfo(listLookup, r);
      if (!listRec || !listRec.name) return r;
      const enriched = { ...r, name: listRec.name };
      if (listRec.source && /^https?:\/\//i.test(String(listRec.source))) {
        enriched.name_source = listRec.source;
      }
      return enriched;
    });
    const rows = districtRowsForDisplay(allRows, items, { candidatesComplete });
    if (!rows.length) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    const stateCode = (listLookup && listLookup.stateCode) || '';
    const name = wkrName || allRows[0]?.wkr_name || `Wahlkreis ${wkr}`;
    const winner = allRows.find(r => r.winner) || allRows.slice().sort((a, b) => (b.probability || 0) - (a.probability || 0))[0] || rows[0];
    el.style.display = 'block';
    const resolveCandidateName = (row, listRec) => {
      if (!row || districtIsOthers(row)) return '';
      const fromRow = row.name || [row.Vornamen, row.Nachname].filter(Boolean).join(' ') || '';
      if (fromRow && String(fromRow).trim()) return String(fromRow).trim();
      const fromList = listRec && listRec.name ? String(listRec.name).trim() : '';
      return fromList || '';
    };
    const yearLabel = l1Label || 'l1';
    const maxHigh = Math.ceil(Math.max(...rows.map(r => Number(r.high) || 0), 1) / 5) * 5 + 5;
    const needsToggle = rows.length > 3;
    const unnamedParties = candidatesComplete
      ? []
      : rows
        .filter((r) => !districtIsOthers(r) && !districtHasCandidateName(r))
        .map((r) => r.partei || r.party)
        .filter(Boolean);
    const unnamedCount = unnamedParties.length;
    const candidateBioHtml = (meta) => {
      if (!meta) return '';
      const year = meta.birth_year;
      const place = meta.birth_place;
      const residence = meta.residence;
      const profession = meta.profession;
      if (!year && !place && !residence && !profession) return '';
      const lines = [];
      if (year) {
        lines.push(`Geboren ${year}${place ? ` in ${place}` : ''}`);
      } else if (place) {
        lines.push(`Geburtsort: ${place}`);
      }
      if (residence) lines.push(`Wohnort: ${residence}`);
      if (profession) lines.push(profession);
      return `<details class="district-cand-info">
        <summary class="district-cand-info-btn" aria-label="Angaben laut Landeswahlleiterin">i</summary>
        <div class="district-cand-info-body">
          ${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
          <div class="district-cand-info-src">Angaben laut Landeswahlleiterin / StaLa</div>
        </div>
      </details>`;
    };
    const candidateProfileHref = (displayName, listRec, row) => {
      const params = new URLSearchParams();
      params.set('from', 'direktmandate');
      const pid = (listRec && listRec.person_id) || (row && row.person_id) || '';
      if (stateCode) params.set('state', String(stateCode).toUpperCase());
      const wkrForLink = (row && row.wkr != null) ? row.wkr : (listRec && listRec.wkr_direct);
      if (wkrForLink != null && wkrForLink !== '') params.set('wkr', String(wkrForLink));
      if (pid) {
        params.set('id', String(pid));
        return `${siteBase()}kandidat/?${params.toString()}`;
      }
      const party = (listRec && listRec.party) || normalizePartyCode(row && row.party, row && row.partei);
      if (party) params.set('party', String(party).toLowerCase());
      if (displayName) params.set('name', String(displayName));
      return `${siteBase()}kandidat/?${params.toString()}`;
    };
    const candidateNameHtml = (displayName, listRec, bioMeta, incumbentMeta, row) => {
      const safe = escapeHtml(displayName);
      const info = candidateBioHtml(bioMeta);
      const href = candidateProfileHref(displayName, listRec, row);
      const name = `<a class="district-candidate-link" href="${escapeHtml(href)}" title="Profil öffnen">${safe}</a>`;
      let badge = '';
      if (incumbentMeta && incumbentMeta.is_incumbent) {
        const chamber = incumbentMeta.incumbent_chamber || (stateCode === 'BE' ? 'MdA' : 'MdL');
        const title = chamber === 'MdA'
          ? 'Amtsinhaber:in im Abgeordnetenhaus'
          : 'Amtsinhaber:in im Landtag';
        const aw = (incumbentMeta.incumbent_url && /^https?:\/\//i.test(String(incumbentMeta.incumbent_url)))
          ? String(incumbentMeta.incumbent_url)
          : ((incumbentMeta.aw_url && /^https?:\/\//i.test(String(incumbentMeta.aw_url)))
            ? String(incumbentMeta.aw_url)
            : '');
        badge = aw
          ? `<a class="district-incumbent" href="${escapeHtml(aw)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)} (abgeordnetenwatch)">${escapeHtml(chamber)}</a>`
          : `<span class="district-incumbent" title="${escapeHtml(title)}">${escapeHtml(chamber)}</span>`;
      } else {
        const aw = (incumbentMeta && incumbentMeta.aw_url && /^https?:\/\//i.test(String(incumbentMeta.aw_url)))
          ? String(incumbentMeta.aw_url)
          : '';
        if (aw) {
          badge = `<a class="district-aw" href="${escapeHtml(aw)}" target="_blank" rel="noopener noreferrer" title="Profil bei abgeordnetenwatch">AW</a>`;
        }
      }
      return `<span class="district-name-wrap">${name}${badge}${info}</span>`;
    };
    const winnerWinProb = districtWinProbability(winner);
    const winnerLikelihood = districtWinLikelihoodLabel(
      winnerWinProb,
      districtRunnerUpWinProbability(allRows)
    );
    const winnerHeadline = districtWinLikelihoodHeadline(winnerLikelihood, winner, allRows);
    // Keep deep-link shareable when user clicks a district
    try {
      if (stateCode && Number.isFinite(Number(wkr))) {
        const u = new URL(window.location.href);
        u.searchParams.set('state', stateCode);
        u.searchParams.set('wkr', String(wkr));
        window.history.replaceState({}, '', u.pathname + u.search + u.hash);
      }
    } catch (_) { /* ignore */ }
    el.innerHTML = `
      <div style="font-weight:700; margin-bottom:0.55rem; text-align:center;">
        WK ${wkr}: ${escapeHtml(name)}
        <div style="font-weight:600; font-size:0.95rem; color:#333; margin-top:0.25rem;">
          ${winnerHeadline}
        </div>
      </div>
      <div class="district-party-list${needsToggle ? ' is-collapsed' : ''}" style="display:flex; flex-direction:column; gap:0.55rem;">
        ${rows.map((r, index) => {
          const isOthers = districtIsOthers(r);
          const listRec = isOthers ? null : lookupListInfo(listLookup, r);
          const cand = resolveCandidateName(r, listRec);
          const nameUnknown = !isOthers && !cand;
          const color = DISTRICT_PARTY_COLORS[r.partei] || '#999';
          const weight = r.winner ? '600' : '500';
          const bioMeta = isOthers ? null : {
            birth_year: r.birth_year || (listRec && listRec.birth_year),
            birth_place: r.birth_place || (listRec && listRec.birth_place),
            residence: r.residence || (listRec && listRec.residence),
            profession: r.profession || (listRec && listRec.profession)
          };
          const incMeta = isOthers ? null : {
            is_incumbent: !!(r.is_incumbent || (listRec && listRec.is_incumbent)),
            incumbent_chamber: r.incumbent_chamber || (listRec && listRec.incumbent_chamber) || '',
            incumbent_url: r.incumbent_url || (listRec && listRec.incumbent_url) || '',
            aw_url: r.aw_url || (listRec && listRec.aw_url) || ''
          };
          const who = nameUnknown
            ? `<span style="font-style:italic;color:#888;font-weight:400;">Name noch nicht bekannt</span> · ${escapeHtml(r.partei)}`
            : `${cand ? `${candidateNameHtml(cand, listRec, bioMeta, incMeta, r)} · ` : ''}${escapeHtml(r.partei)}`;
          // Main metric on Wahlkreis pages: district win chance (not P(Einzug)).
          const winProb = districtWinProbability(r);
          const listTxt = formatListEntryLine(listRec, stateCode, winProb);
          const siegHtml = isOthers
            ? ''
            : `<span style="font-weight:600; color:#333; font-size:0.88rem;">P(Sieg): ${formatWinProbabilityPct(winProb)}</span>`;
          return `
            <div class="district-party-item" style="border-left:4px solid ${color}; padding:0.35rem 0 0.45rem 0.65rem; border-top:${index ? '1px solid #eee' : 'none'};">
              <div style="display:flex; flex-wrap:wrap; gap:0.25rem 0.75rem; align-items:baseline; font-size:0.88rem; font-weight:${weight};">
                <span>${who}</span>
                ${siegHtml}
                <span style="font-weight:500; color:#666; font-size:0.8rem;">${escapeHtml(yearLabel)}: ${Math.round(Number(r.value_l1))}%</span>
              </div>
              ${listTxt ? `<div class="district-list-line" style="font-size:0.78rem;color:#666;margin:0.15rem 0 0.1rem;">${listTxt}</div>` : ''}
              ${districtBandBarHtml(r, maxHigh)}
            </div>`;
        }).join('')}
      </div>
      ${needsToggle ? '<button type="button" class="scenario-prob-toggle district-party-toggle" aria-expanded="false">Mehr anzeigen</button>' : ''}
      ${unnamedCount ? `<div style="margin-top:0.65rem;text-align:center;font-size:0.78rem;color:#888;">Bei ${unnamedCount === 1 ? escapeHtml(unnamedParties[0]) : escapeHtml(unnamedParties.slice(0, -1).join(', ') + ' und ' + unnamedParties[unnamedParties.length - 1])} ist uns der Direktkandidat:innen-Name noch nicht bekannt — die Partei wird trotzdem ausgewiesen.</div>` : ''}
    `;
    const list = el.querySelector('.district-party-list');
    const toggle = el.querySelector('.district-party-toggle');
    if (list && toggle) {
      toggle.addEventListener('click', () => {
        const collapsed = list.classList.toggle('is-collapsed');
        toggle.textContent = collapsed ? 'Mehr anzeigen' : 'Weniger anzeigen';
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    }
    if (el.dataset.candInfoBound !== '1') {
      el.dataset.candInfoBound = '1';
      el.addEventListener('toggle', (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLDetailsElement) || !t.classList.contains('district-cand-info')) return;
        if (!t.open) return;
        el.querySelectorAll('details.district-cand-info[open]').forEach((d) => {
          if (d !== t) d.open = false;
        });
      }, true);
    }
  }

  function clearAddressMarker() {
    if (addressMarker && mapInstance) {
      try { mapInstance.removeLayer(addressMarker); } catch (_) { /* ignore */ }
    }
    addressMarker = null;
  }

  function normalizeSearchText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function expandStreetQuery(street) {
    let s = String(street || '').trim();
    s = s.replace(/\bstr\.\s*$/i, 'straße');
    s = s.replace(/\bstrasse\b/gi, 'straße');
    s = s.replace(/\bStrasse\b/g, 'Straße');
    return s;
  }

  function escapeCqlLiteral(s) {
    return String(s || '').replace(/'/g, "''");
  }

  function parseAddressQuery(raw) {
    const q = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!q) return null;
    let plz = '';
    let rest = q;
    const plzLead = q.match(/^(\d{5})\s+(.+)$/);
    if (plzLead) {
      plz = plzLead[1];
      rest = plzLead[2];
    } else {
      const plzTrail = q.match(/^(.+?),\s*(\d{5})\s*$/);
      if (plzTrail) {
        rest = plzTrail[1];
        plz = plzTrail[2];
      }
    }
    // Drop trailing city tokens that confuse house-number parse
    rest = rest
      .replace(/,?\s*(berlin|mecklenburg[- ]vorpommern|sachsen[- ]anhalt)\s*$/i, '')
      .trim();
    const withNr = rest.match(/^(.+?)\s+(\d+)\s*([a-zA-Z])?$/);
    if (withNr) {
      return {
        street: expandStreetQuery(withNr[1]),
        hausnr: withNr[2],
        hausnrz: (withNr[3] || '').toLowerCase(),
        plz
      };
    }
    if (rest.length >= 3) {
      return { street: expandStreetQuery(rest), hausnr: '', hausnrz: '', plz };
    }
    return null;
  }

  function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat))
        && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-15) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInPolygonCoords(lon, lat, coords) {
    if (!coords || !coords.length) return false;
    if (!pointInRing(lon, lat, coords[0])) return false;
    for (let h = 1; h < coords.length; h += 1) {
      if (pointInRing(lon, lat, coords[h])) return false;
    }
    return true;
  }

  function findWkrAtLonLat(geo, lon, lat) {
    const feats = (geo && geo.features) || [];
    for (let i = 0; i < feats.length; i += 1) {
      const f = feats[i];
      const g = f && f.geometry;
      if (!g) continue;
      let hit = false;
      if (g.type === 'Polygon') hit = pointInPolygonCoords(lon, lat, g.coordinates);
      else if (g.type === 'MultiPolygon') {
        hit = (g.coordinates || []).some((poly) => pointInPolygonCoords(lon, lat, poly));
      }
      if (hit && f.properties && f.properties.wkr != null) {
        return {
          wkr: Number(f.properties.wkr),
          wkr_name: f.properties.wkr_name || ''
        };
      }
    }
    return null;
  }

  function geoBounds(geo) {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    const visit = (coords) => {
      if (!coords) return;
      if (typeof coords[0] === 'number') {
        const lon = coords[0];
        const lat = coords[1];
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
        return;
      }
      coords.forEach(visit);
    };
    ((geo && geo.features) || []).forEach((f) => {
      if (f && f.geometry) visit(f.geometry.coordinates);
    });
    if (!Number.isFinite(minLon)) return null;
    return { minLon, minLat, maxLon, maxLat };
  }

  function berlinWkrFromProps(props) {
    if (!props) return null;
    const bez = String(props.bez != null ? props.bez : '').padStart(2, '0');
    const wk = String(props.wk_agh != null ? props.wk_agh : '').padStart(2, '0');
    if (bez.length !== 2 || wk.length !== 2) return null;
    const wkr = BE_AWK_TO_WKR[bez + wk];
    return wkr != null ? Number(wkr) : null;
  }

  function formatBerlinAddress(props) {
    const street = props.strnam || '';
    const nr = `${props.hausnr || ''}${props.hausnrz || ''}`;
    const plz = props.postleit || '';
    const bez = props.bez_name || '';
    return [street, nr].filter(Boolean).join(' ')
      + (plz || bez ? ` · ${[plz, bez].filter(Boolean).join(' ')}` : '');
  }

  async function fetchBerlinAddresses(filter, count) {
    const params = new URLSearchParams({
      SERVICE: 'WFS',
      VERSION: '2.0.0',
      REQUEST: 'GetFeature',
      typeNames: 'adressen_rbs:adressen_rbs',
      count: String(count || 12),
      outputFormat: 'application/json',
      SRSNAME: 'EPSG:4326',
      CQL_FILTER: filter
    });
    const res = await fetch(`${BE_ADDRESS_WFS}?${params.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`Berlin-Adressen HTTP ${res.status}`);
    const text = await res.text();
    const trimmed = (text || '').trim();
    // gdi.berlin.de sometimes returns HTTP 200 HTML maintenance pages.
    if (!trimmed || trimmed.charAt(0) === '<') {
      throw new Error('Berlin-Adressen: keine JSON-Antwort (Wartung?)');
    }
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch (_) {
      throw new Error('Berlin-Adressen: ungültiges JSON');
    }
    return Array.isArray(data.features) ? data.features : [];
  }

  async function searchBerlinAddresses(query) {
    const parsed = parseAddressQuery(query);
    if (!parsed || !parsed.street) return [];
    const street = escapeCqlLiteral(parsed.street);
    const filters = [];
    if (parsed.hausnr) {
      let f = `strnam ILIKE '${street}' AND hausnr='${escapeCqlLiteral(parsed.hausnr)}'`;
      if (parsed.hausnrz) {
        f += ` AND hausnrz ILIKE '${escapeCqlLiteral(parsed.hausnrz)}'`;
      }
      if (parsed.plz) f += ` AND postleit='${escapeCqlLiteral(parsed.plz)}'`;
      filters.push(f);
      // ß/ss fallback
      if (/straße/i.test(parsed.street)) {
        const alt = escapeCqlLiteral(parsed.street.replace(/straße/gi, 'strasse'));
        let f2 = `strnam ILIKE '${alt}' AND hausnr='${escapeCqlLiteral(parsed.hausnr)}'`;
        if (parsed.plz) f2 += ` AND postleit='${escapeCqlLiteral(parsed.plz)}'`;
        filters.push(f2);
      }
    } else {
      filters.push(`strnam ILIKE '${street}%'`);
      if (/straße/i.test(parsed.street)) {
        const alt = escapeCqlLiteral(parsed.street.replace(/straße/gi, 'strasse'));
        filters.push(`strnam ILIKE '${alt}%'`);
      }
    }

    let features = [];
    for (let i = 0; i < filters.length; i += 1) {
      features = await fetchBerlinAddresses(filters[i], parsed.hausnr ? 8 : 16);
      if (features.length) break;
    }

    const seen = new Set();
    const out = [];
    features.forEach((f) => {
      const p = f.properties || {};
      const wkr = berlinWkrFromProps(p);
      if (wkr == null) return;
      const coords = f.geometry && f.geometry.coordinates;
      const key = `${p.strnam}|${p.hausnr}|${p.hausnrz || ''}|${p.postleit}|${wkr}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        type: 'address',
        wkr,
        label: formatBerlinAddress(p),
        sub: `WK ${wkr}`,
        kind: 'Adresse',
        lon: coords ? coords[0] : null,
        lat: coords ? coords[1] : null,
        source: 'berlin-rbs'
      });
    });
    return out.slice(0, 8);
  }

  async function searchPhotonAddresses(query, code, geo) {
    const q = String(query || '').trim();
    if (q.length < 3) return [];
    const bounds = geoBounds(geo);
    const stateHint = {
      BE: 'Berlin',
      MV: 'Mecklenburg-Vorpommern',
      ST: 'Sachsen-Anhalt'
    }[code] || '';
    const params = new URLSearchParams({
      q: stateHint ? `${q}, ${stateHint}` : q,
      limit: '8',
      lang: 'de'
    });
    if (bounds) {
      params.set('bbox', `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`);
      params.set('lon', String((bounds.minLon + bounds.maxLon) / 2));
      params.set('lat', String((bounds.minLat + bounds.maxLat) / 2));
    }
    const res = await fetch(`${PHOTON_API}?${params.toString()}`);
    if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
    const data = await res.json();
    const features = (data.features || []).slice();
    // Prefer named places/squares over railway stops when both match (e.g. Leopoldplatz).
    features.sort((a, b) => {
      const score = (f) => {
        const p = (f && f.properties) || {};
        if (p.osm_value === 'square' || p.type === 'locality') return 0;
        if (p.osm_key === 'place') return 1;
        if (p.osm_key === 'highway') return 2;
        if (p.housenumber) return 3;
        if (p.osm_key === 'railway') return 4;
        return 5;
      };
      return score(a) - score(b);
    });
    const out = [];
    const seen = new Set();
    features.forEach((f) => {
      const p = f.properties || {};
      const coords = f.geometry && f.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      const lon = coords[0];
      const lat = coords[1];
      const hit = findWkrAtLonLat(geo, lon, lat);
      if (!hit) return;
      const isPlace = p.osm_key === 'place'
        || p.osm_key === 'railway'
        || p.osm_value === 'station'
        || p.osm_value === 'halt'
        || p.osm_value === 'square'
        || p.type === 'locality'
        || p.type === 'district';
      let label;
      if (p.housenumber && (p.street || p.name)) {
        label = [p.street || p.name, p.housenumber].filter(Boolean).join(' ');
      } else if (p.name) {
        label = p.name;
      } else {
        label = [p.street, p.housenumber].filter(Boolean).join(' ') || q;
      }
      const city = p.city || p.town || p.village || '';
      const subParts = [p.postcode, city, `WK ${hit.wkr}${hit.wkr_name ? `: ${hit.wkr_name}` : ''}`]
        .filter(Boolean);
      const key = `${label}|${hit.wkr}|${lon.toFixed(5)}|${lat.toFixed(5)}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        type: 'address',
        wkr: hit.wkr,
        label,
        sub: subParts.join(' · '),
        kind: isPlace ? 'Ort' : 'Adresse',
        lon,
        lat,
        source: 'photon'
      });
    });
    return out.slice(0, 6);
  }

  function buildLocalSearchHits(query, items, geo) {
    const qn = normalizeSearchText(query);
    if (qn.length < 2) return [];
    const hits = [];
    const seenWkr = new Set();
    ((geo && geo.features) || []).forEach((f) => {
      const props = f.properties || {};
      const wkr = props.wkr;
      if (wkr == null) return;
      const name = props.wkr_name || '';
      const hay = normalizeSearchText(`wk ${wkr} wahlkreis ${wkr} ${name}`);
      if (!hay.includes(qn) && !(qn === String(wkr))) return;
      seenWkr.add(Number(wkr));
      hits.push({
        type: 'wkr',
        wkr: Number(wkr),
        label: `WK ${wkr}: ${name}`,
        sub: 'Wahlkreis',
        kind: 'Wahlkreis',
        score: (qn === String(wkr) || hay.startsWith(qn)) ? 0 : 1
      });
    });

    const seenCand = new Set();
    (items || []).forEach((r) => {
      if (!r || districtIsOthers(r) || !districtHasCandidateName(r)) return;
      const name = (r.name || [r.Vornamen, r.Nachname].filter(Boolean).join(' ') || '').trim();
      if (!name) return;
      const hay = normalizeSearchText(name);
      if (!hay.includes(qn)) return;
      const key = `${r.wkr}|${hay}|${r.partei}`;
      if (seenCand.has(key)) return;
      seenCand.add(key);
      hits.push({
        type: 'cand',
        wkr: Number(r.wkr),
        label: name,
        sub: `${r.partei || ''} · WK ${r.wkr}${r.wkr_name ? `: ${r.wkr_name}` : ''}`.replace(/^ · /, ''),
        kind: 'Kandidat:in',
        score: hay.startsWith(qn) ? 2 : 3
      });
    });

    hits.sort((a, b) => (a.score - b.score) || String(a.label).localeCompare(String(b.label), 'de'));
    return hits.slice(0, 10);
  }

  function setSearchStatus(text, isError) {
    const el = document.getElementById('district-search-status');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  function hideSearchResults() {
    const list = document.getElementById('district-search-results');
    const input = document.getElementById('district-search-input');
    if (list) {
      list.innerHTML = '';
      list.hidden = true;
    }
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function renderSearchResults(results, activeIdx) {
    const list = document.getElementById('district-search-results');
    const input = document.getElementById('district-search-input');
    if (!list) return;
    if (!results || !results.length) {
      hideSearchResults();
      return;
    }
    list.hidden = false;
    if (input) input.setAttribute('aria-expanded', 'true');
    list.innerHTML = results.map((r, i) => `
      <li role="option" aria-selected="${i === activeIdx ? 'true' : 'false'}">
        <button type="button" class="district-search-item${i === activeIdx ? ' is-active' : ''}" data-idx="${i}">
          <span class="district-search-item-title">
            <span class="district-search-item-kind">${escapeHtml(r.kind || '')}</span>${escapeHtml(r.label || '')}
          </span>
          ${r.sub ? `<span class="district-search-item-sub">${escapeHtml(r.sub)}</span>` : ''}
        </button>
      </li>
    `).join('');
  }

  function bindDistrictSearch(ctx) {
    const input = document.getElementById('district-search-input');
    const list = document.getElementById('district-search-results');
    if (!input || !list) return null;

    searchSession = {
      results: [],
      activeIdx: -1,
      timer: null,
      reqId: 0,
      ctx
    };

    const session = () => searchSession;

    const runSearch = async () => {
      const st = session();
      if (!st || !st.ctx) return;
      const q = input.value.trim();
      const reqId = ++st.reqId;
      if (q.length < 2) {
        st.results = [];
        st.activeIdx = -1;
        hideSearchResults();
        setSearchStatus(
          st.ctx.code === 'BE'
            ? 'Adresse/Ort (Berlin), Wahlkreisname oder Kandidierende'
            : 'Adresse, Wahlkreisname oder Kandidierende'
        );
        return;
      }

      const local = buildLocalSearchHits(q, st.ctx.items, st.ctx.geo);
      st.results = local.slice();
      st.activeIdx = st.results.length ? 0 : -1;
      renderSearchResults(st.results, st.activeIdx);
      setSearchStatus(local.length ? `${local.length} Treffer lokal…` : 'Suche Adressen…');

      const wantAddress = st.ctx.code === 'BE'
        ? (q.length >= 4 || /\d/.test(q))
        : (/\d/.test(q) || (q.length >= 5 && local.length === 0));
      if (!wantAddress) {
        setSearchStatus(local.length ? `${local.length} Treffer` : 'Keine Treffer');
        return;
      }

      try {
        let addr = [];
        let berlinDown = false;
        if (st.ctx.code === 'BE') {
          try {
            addr = await searchBerlinAddresses(q);
          } catch (beErr) {
            berlinDown = true;
            console.warn('Berlin RBS address lookup failed', beErr);
            addr = [];
          }
          // Photon for places (Leopoldplatz, Bahnhöfe, …) and when RBS is empty/down.
          if (!addr.length) {
            addr = await searchPhotonAddresses(q, st.ctx.code, st.ctx.geo);
          }
        } else {
          addr = await searchPhotonAddresses(q, st.ctx.code, st.ctx.geo);
        }
        if (!searchSession || reqId !== searchSession.reqId) return;
        const merged = local.slice();
        const seen = new Set(merged.map((r) => `${r.type}|${r.wkr}|${r.label}`));
        addr.forEach((r) => {
          const key = `${r.type}|${r.wkr}|${r.label}`;
          if (seen.has(key)) return;
          seen.add(key);
          merged.push(r);
        });
        searchSession.results = merged.slice(0, 12);
        searchSession.activeIdx = searchSession.results.length ? 0 : -1;
        renderSearchResults(searchSession.results, searchSession.activeIdx);
        if (!searchSession.results.length) {
          setSearchStatus(
            berlinDown
              ? 'Keine Treffer (Berlin-Adressdienst in Wartung)'
              : 'Keine Treffer',
            true
          );
        } else {
          const nAddr = searchSession.results.filter((r) => r.type === 'address').length;
          let srcNote = '';
          if (nAddr) {
            if (st.ctx.code === 'BE') {
              srcNote = berlinDown
                ? ' · Orte/Adressen: OpenStreetMap (Berlin-RBS in Wartung)'
                : ' · Adressen: Berlin RBS (AfS)';
            } else {
              srcNote = ' · Adressen: OpenStreetMap/Photon';
            }
          }
          setSearchStatus(`${searchSession.results.length} Treffer${srcNote}`);
        }
      } catch (err) {
        if (!searchSession || reqId !== searchSession.reqId) return;
        console.warn('District search address lookup failed', err);
        searchSession.results = local.slice(0, 12);
        searchSession.activeIdx = searchSession.results.length ? 0 : -1;
        renderSearchResults(searchSession.results, searchSession.activeIdx);
        setSearchStatus(
          local.length
            ? `${local.length} Treffer (Adresssuche gerade nicht erreichbar)`
            : 'Adresssuche gerade nicht erreichbar',
          !local.length
        );
      }
    };

    const schedule = () => {
      const st = session();
      if (!st) return;
      if (st.timer) clearTimeout(st.timer);
      st.timer = setTimeout(runSearch, 220);
    };

    const selectIdx = (idx) => {
      const st = session();
      if (!st || !st.ctx || typeof st.ctx.selectHit !== 'function') return;
      const hit = st.results[idx];
      if (!hit) return;
      st.ctx.selectHit(hit);
      hideSearchResults();
      setSearchStatus(
        hit.type === 'address'
          ? `Adresse → WK ${hit.wkr}`
          : hit.type === 'cand'
            ? `${hit.label} → WK ${hit.wkr}`
            : `Wahlkreis ${hit.wkr}`
      );
    };

    input.value = '';
    setSearchStatus(
      ctx.code === 'BE'
        ? 'Adresse/Ort (Berlin), Wahlkreisname oder Kandidierende'
        : 'Adresse, Wahlkreisname oder Kandidierende'
    );
    hideSearchResults();

    if (input.dataset.districtSearchBound !== '1') {
      input.dataset.districtSearchBound = '1';
      input.addEventListener('input', schedule);
      input.addEventListener('keydown', (ev) => {
        const st = session();
        if (!st) return;
        if (!st.results.length) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            runSearch();
          }
          return;
        }
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          st.activeIdx = (st.activeIdx + 1) % st.results.length;
          renderSearchResults(st.results, st.activeIdx);
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          st.activeIdx = (st.activeIdx - 1 + st.results.length) % st.results.length;
          renderSearchResults(st.results, st.activeIdx);
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          if (st.activeIdx >= 0) selectIdx(st.activeIdx);
        } else if (ev.key === 'Escape') {
          hideSearchResults();
        }
      });
      list.addEventListener('mousedown', (ev) => {
        const btn = ev.target.closest('[data-idx]');
        if (!btn) return;
        ev.preventDefault();
        selectIdx(Number(btn.getAttribute('data-idx')));
      });
      document.addEventListener('click', (ev) => {
        const wrap = document.getElementById('district-search');
        if (wrap && !wrap.contains(ev.target)) hideSearchResults();
      });
    }

    return searchSession;
  }

  function hide() {
    const section = document.getElementById('vorhersage-districts-section');
    if (section) section.style.display = 'none';
    setDistrictStand(null);
    setDistrictSourceNote(null);
    setDistrictCalcNote(null);
    clearAddressMarker();
    hideSearchResults();
    setSearchStatus('');
    const detail = document.getElementById('vorhersage-districts-detail');
    if (detail) {
      detail.style.display = 'none';
      detail.innerHTML = '';
    }
    const sizeEl = document.getElementById('vorhersage-parliament-size');
    if (sizeEl) {
      sizeEl.style.display = 'none';
      sizeEl.innerHTML = '';
    }
    const genderEl = document.getElementById('vorhersage-districts-gender');
    if (genderEl) {
      genderEl.style.display = 'none';
      genderEl.innerHTML = '';
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Per-party gender share among named Direktkandidierende (+ win-prob weighted). */
  function districtPartyGenderStats(items) {
    const byParty = Object.create(null);
    (items || []).forEach((r) => {
      if (!r || districtIsOthers(r) || !districtHasCandidateName(r)) return;
      const g = String(r.gender || '').toLowerCase();
      if (g !== 'f' && g !== 'm' && g !== 'x' && g !== 'u') return;
      const key = String(r.party || '').toLowerCase() || normalizePartyCode(r.party, r.partei);
      if (!key || key === 'others' || key === 'oth') return;
      if (!byParty[key]) {
        byParty[key] = {
          party: key,
          partei: r.partei || key,
          n: 0,
          nF: 0,
          nM: 0,
          nOther: 0,
          wF: 0,
          wM: 0,
          wOther: 0
        };
      }
      const row = byParty[key];
      const w = Math.max(0, Number(r.probability) || 0);
      row.n += 1;
      if (g === 'f') {
        row.nF += 1;
        row.wF += w;
      } else if (g === 'm') {
        row.nM += 1;
        row.wM += w;
      } else {
        row.nOther += 1;
        row.wOther += w;
      }
    });
    return Object.keys(byParty)
      .map((k) => {
        const row = byParty[k];
        const denom = row.nF + row.nM;
        const wDenom = row.wF + row.wM;
        // probability is 0–100; expected Direktmandate = Σp / 100
        const expectedWins = Math.round((wDenom / 100) * 10) / 10;
        const noSeatsExpected = !wDenom || expectedWins < 1;
        return {
          ...row,
          expectedWins,
          noSeatsExpected,
          pctF: denom ? Math.round((1000 * row.nF) / denom) / 10 : null,
          pctM: denom ? Math.round((1000 * row.nM) / denom) / 10 : null,
          pctFWeighted: noSeatsExpected
            ? null
            : Math.round((1000 * row.wF) / wDenom) / 10,
          pctMWeighted: noSeatsExpected
            ? null
            : Math.round((1000 * row.wM) / wDenom) / 10
        };
      })
      .filter((r) => r.pctF != null)
      .sort((a, b) => (b.n || 0) - (a.n || 0) || String(a.partei).localeCompare(String(b.partei), 'de'));
  }

  function districtGenderBarHtml(pctF) {
    const barF = Math.max(0, Math.min(100, Number(pctF) || 0));
    return `<span class="district-gender-bar" aria-hidden="true"><span class="district-gender-bar-f" style="width:${barF}%"></span></span>`;
  }

  function renderDistrictGender(items, metadata) {
    const el = document.getElementById('vorhersage-districts-gender');
    if (!el) return;
    const rows = districtPartyGenderStats(items);
    if (!rows.length) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    const note =
      (metadata && metadata.gender_note_de) ||
      'Geschlecht geschätzt anhand der Vornamen (Wörterbuch + Korrekturen), nicht amtlich.';
    const body = rows
      .map((r) => {
        const color = DISTRICT_PARTY_COLORS[r.partei] || '#888';
        const unweighted = `
          <div class="district-gender-metric">
            <div class="district-gender-bar-wrap">
              ${districtGenderBarHtml(r.pctF)}
              <span class="district-gender-pct">${escapeHtml(String(r.pctF))}% Frauen · n=${escapeHtml(String(r.n))}</span>
            </div>
            <span class="district-gender-metric-label">Kandidierende</span>
          </div>`;
        let weighted;
        if (r.noSeatsExpected) {
          weighted = `
          <div class="district-gender-metric">
            <span class="district-gender-pct" style="color:#777;">keine Mandate erwartet</span>
            <span class="district-gender-metric-label">× Siegchance</span>
          </div>`;
        } else if (r.pctFWeighted != null) {
          weighted = `
          <div class="district-gender-metric">
            <div class="district-gender-bar-wrap">
              ${districtGenderBarHtml(r.pctFWeighted)}
              <span class="district-gender-pct">${escapeHtml(String(r.pctFWeighted))}% Frauen · ~${escapeHtml(String(r.expectedWins))} Mandate</span>
            </div>
            <span class="district-gender-metric-label">× Siegchance</span>
          </div>`;
        } else {
          weighted = '';
        }
        return `
          <div class="district-gender-row" title="${escapeHtml(note)}">
            <span class="district-gender-party" style="border-left:3px solid ${escapeHtml(color)};padding-left:0.4rem;">${escapeHtml(r.partei)}</span>
            <div class="district-gender-metrics">${unweighted}${weighted}</div>
          </div>`;
      })
      .join('');
    el.style.display = 'block';
    el.innerHTML = `
      <details class="district-fold"${genderFoldOpen ? ' open' : ''}>
        <summary>Geschlechteranteil — Direktkandidierende</summary>
        <p class="district-gender-intro">
          Anteil Frauen unter den bekannt benannten Direktkandidierenden je Partei.
          „×&nbsp;Siegchance“ gewichtet mit der prognostizierten Direktmandat-Wahrscheinlichkeit
          (erwartete Geschlechterverteilung der Gewinner*innen; bei Σ&nbsp;P&nbsp;&lt;&nbsp;1:&nbsp;„keine Mandate erwartet“).
          ${escapeHtml(note)}
        </p>
        <div class="district-gender-rows">${body}</div>
        <div class="zs-wm-strip zs-wm-strip--compact" aria-hidden="true"></div>
      </details>
    `;
    bindDistrictFold(el, (open) => { genderFoldOpen = open; });
  }

  function renderParliamentSize(code, payload) {
    const el = document.getElementById('vorhersage-parliament-size');
    if (!el) return;
    const st = payload && payload.states && payload.states[code];
    if (!st) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    const buckets = Array.isArray(st.buckets) ? st.buckets : [];
    const maxPct = Math.max(1, ...buckets.map(b => Number(b.pct) || 0));
    const chamber = st.chamber || 'Parlament';
    const pointSize = st.point && st.point.size;
    const lastEl = lastElectionForState(code, st);
    const lastSize = lastEl && lastEl.size != null ? Number(lastEl.size) : null;
    const lastYear = lastEl ? (lastEl.year != null ? String(lastEl.year) : (lastEl.label || '')) : '';
    const bars = buckets.map(b => {
      const pct = Number(b.pct) || 0;
      const width = Math.max(pct > 0 ? 2 : 0, (pct / maxPct) * 100);
      const isLast = lastSize != null && bucketContainsSize(b.label, lastSize);
      return `
        <div class="district-size-row${isLast ? ' is-last-election' : ''}">
          <span>${escapeHtml(b.label)}${isLast ? ` <em title="Letzte Wahl ${escapeHtml(lastYear)}: ${lastSize} Sitze">← ${escapeHtml(lastYear)}</em>` : ''}</span>
          <div class="district-size-bar-track">
            <div class="district-size-bar-fill" style="width:${width}%;"></div>
          </div>
          <span style="text-align:right;">${pct.toFixed(1)}%</span>
        </div>`;
    }).join('');

    let note = '';
    if (code === 'MV') {
      const pInc = st.p_incomplete_pct;
      const p1 = (st.advantage_seats_pct && st.advantage_seats_pct['1']) || null;
      const impact = st.majority_impact || {};
      const abs = impact.scenarios && impact.scenarios.abs_maj_afd;
      const absLine = abs
        ? ` Die <strong>Absolute Mehrheit der AfD</strong> verschiebt der Deckel nicht
            (Sitzmehrheit mit Deckel ${escapeHtml(String(abs.seats_capped_pct))} % vs.
            vollem Ausgleich ${escapeHtml(String(abs.seats_full_ausgleich_pct))} % —
            Differenz ${escapeHtml(String(abs.cap_minus_full_pp))} pp).`
        : '';
      const oneSeat = p1 != null
        ? ` Wenn der Deckel greift, bleibt praktisch immer <strong>genau ein</strong> Extra-Sitz
            (ca. ${escapeHtml(String(p1))} % der Simulationen).`
        : '';
      note = `
        <div class="district-size-note">
          <p><strong>Überhang &amp; Ausgleich in MV:</strong> ${escapeHtml(st.note_de)}</p>
          <p>
            In etwa <strong>${escapeHtml(String(pInc))} %</strong> der Simulationen reicht der Ausgleich
            nicht vollständig (Deckel: höchstens doppelt so viele Ausgleichs- wie Überhangmandate).
            ${oneSeat}
            Betroffen sind vor allem SPD oder AfD als Überhangpartei — andere Parteien erhalten
            dann Ausgleichssitze, aber keinen unkompensierten Extra-Sitz.
          </p>
          <p>
            <strong>Mehrheiten:</strong> Der Effekt auf Szenario-Wahrscheinlichkeiten liegt unter 0,5 pp.
            ${absLine}
            Die Koalitionsszenarien der Landesprognose bleiben deshalb die Zweitstimmen-Näherung.
          </p>
          <p style="color:#888;font-size:0.76rem;">
            Indikativ aus dem Wahlkreis-Swing-Modell (ohne Kandidateneffekte) — keine amtliche Sitzzuteilung.
            Details im <a href="${escapeHtml((global.pipelineData.SITE_BASE || '/') + 'blog/posts/district-forecast-methodology/#parlamentsgroesse')}" style="color:var(--primary,#0056b3);">Methoden-Explainer</a>.
          </p>
        </div>`;
    } else if (code === 'ST') {
      const majNote = (st.majority_impact && st.majority_impact.note_de)
        ? escapeHtml(st.majority_impact.note_de)
        : 'Ausgleich stellt den Proporz in der Regel (nahezu) wieder her; Mehrheits-Szenarien über Zweitstimmen bleiben eine gute Näherung.';
      note = `
        <div class="district-size-note">
          <p><strong>Überhang &amp; Ausgleich in ST:</strong> ${escapeHtml(st.note_de)}</p>
          <p>
            Der Ausgleich vergrößert den Landtag schrittweise; ein kleiner Restüberhang
            kann nach mehreren Runden an der Fraktionsstärke-Grenze stehen bleiben
            (meist höchstens ein Sitz). Die Verteilung zeigt vor allem die
            mögliche Gesamtgröße.
          </p>
          <p><strong>Mehrheiten:</strong> ${majNote}</p>
          <p style="color:#888;font-size:0.76rem;">
            Indikativ aus dem Wahlkreis-Swing-Modell — keine amtliche Sitzzuteilung.
          </p>
        </div>`;
    } else {
      const majNote = (st.majority_impact && st.majority_impact.note_de)
        ? escapeHtml(st.majority_impact.note_de)
        : 'Überhang je Bezirksliste bleibt; Ausgleich über die amtliche Formel (einmal).';
      note = `
        <div class="district-size-note">
          <p><strong>Überhang &amp; Ausgleich in Berlin:</strong> ${escapeHtml(st.note_de)}</p>
          <p>
            CDU, SPD und Linke treten 2026 mit <strong>Bezirkslisten</strong> an.
            Direktmandate zählen je Bezirk — Überhang in einem Bezirk wird nicht
            mit ungenutzten Listenplätzen anderswo verrechnet. Deshalb liegt die
            simulierte Größe oft deutlich über 130 Sitzen (Median typisch eher
            um 170 als bei der gesetzlichen Mindestgröße).
          </p>
          <p><strong>Mehrheiten:</strong> ${majNote}</p>
          <p style="color:#888;font-size:0.76rem;">
            Indikativ aus dem Wahlkreis-Swing-Modell — keine amtliche Sitzzuteilung.
          </p>
        </div>`;
    }

    el.style.display = 'block';
    const lastSizeHtml = lastEl && lastEl.size != null
      ? `<span>Letzte Wahl (${escapeHtml(lastYear)}): <strong>${escapeHtml(String(lastEl.size))}</strong></span>`
      : '';
    const lastToHtml = lastEl && lastEl.turnout != null
      ? `<span>Wahlbeteiligung ${escapeHtml(lastYear)}: <strong>${escapeHtml(String(lastEl.turnout).replace('.', ','))} %</strong></span>`
      : '';
    el.innerHTML = `
      <details class="district-fold"${sizeFoldOpen ? ' open' : ''}>
        <summary>Geschätzte Größe — ${escapeHtml(chamber)}</summary>
        <div class="district-size-stats">
          <span>Minimum gesetzlich: <strong>${escapeHtml(String(st.base_seats))}</strong></span>
          <span>Median: <strong>${escapeHtml(String(st.size_median))}</strong></span>
          <span>Punktschätzung: <strong>${escapeHtml(String(pointSize))}</strong></span>
          <span>p90: <strong>${escapeHtml(String(st.size_p90))}</strong></span>
          ${lastSizeHtml}
          ${lastToHtml}
        </div>
        <div class="district-size-bars">${bars}</div>
        <div class="zs-wm-strip zs-wm-strip--compact" aria-hidden="true"></div>
        ${note}
      </details>
    `;
    bindDistrictFold(el, (open) => { sizeFoldOpen = open; });
  }

  async function mount(opts) {
    const code = String((opts && opts.code) || 'MV').toUpperCase();
    const focusWkr = opts && opts.wkr != null && opts.wkr !== ''
      ? Number(opts.wkr)
      : NaN;
    const section = document.getElementById('vorhersage-districts-section');
    const mapEl = document.getElementById('vorhersage-districts-map');
    const legendEl = document.getElementById('vorhersage-districts-legend');
    if (!section || !mapEl || !global.pipelineData) {
      console.warn('DistrictForecastMap: missing DOM or pipelineData');
      return;
    }
    if (!['MV', 'ST', 'BE'].includes(code)) {
      hide();
      return;
    }

    try {
      const [districtForecast, geo, parliamentSize, candidateEntry] = await Promise.all([
        global.pipelineData.loadForecastDistricts(code),
        global.pipelineData.loadWahlkreiseGeo(code),
        global.pipelineData.loadParliamentSize
          ? global.pipelineData.loadParliamentSize().catch(() => null)
          : Promise.resolve(null),
        global.pipelineData.loadCandidateEntry
          ? global.pipelineData.loadCandidateEntry().catch(() => null)
          : Promise.resolve(null)
      ]);
      const items = districtForecast.items || districtForecast;
      const meta = districtForecast.metadata || {};
      const l1Label = meta.l1_label || 'l1';
      const listLookup = buildListLookup(candidateEntry, code);
      const winners = districtWinnerIndex(items);
      const rowsByWkr = districtRowsByWkr(items);
      const L = await ensureLeaflet();

      section.style.display = 'block';
      setDistrictStand(meta);
      setDistrictSourceNote(code);
      setDistrictCalcNote(code);
      if (mapInstance) {
        clearAddressMarker();
        mapInstance.remove();
        mapInstance = null;
        mapLayer = null;
      }
      mapEl.innerHTML = '';
      mapInstance = L.map(mapEl, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false
      });
      if (typeof global.attachZweitstimmeWatermark === 'function') {
        global.attachZweitstimmeWatermark(mapEl, { map: true });
      }
      const geoAttr = DISTRICT_GEO_ATTRIBUTION[code] || 'Wahlkreise';
      // OSM tiles (CARTO Voyager now watermarks "API key required" without a key).
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ${geoAttr}`,
        maxZoom: 19
      }).addTo(mapInstance);

      function styleForWkr(wkr) {
        const key = String(wkr);
        return districtFillStyle(winners[key], {
          map: mapInstance,
          partyRows: rowsByWkr[key] || null
        });
      }

      function paintPathFill(layer, fill) {
        const path = layer && layer._path;
        if (!path || !fill) return;
        path.setAttribute('fill', fill);
        // CSS fill beats a stale presentation attribute after Leaflet updates.
        path.style.fill = fill;
      }

      function applyLayerStyle(layer) {
        if (!layer || !layer.feature) return;
        const wkr = layer.feature.properties.wkr;
        const style = styleForWkr(wkr);
        layer.setStyle({
          color: style.color,
          weight: style.weight,
          opacity: style.opacity,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity
        });
        if (style.patternId) {
          paintPathFill(layer, districtPatternFill(style.patternId));
        } else if (layer._path) {
          layer._path.style.fill = '';
        }
      }

      function findLayerByWkr(wkrNum) {
        let found = null;
        mapLayer.eachLayer((layer) => {
          if (found) return;
          const props = layer.feature && layer.feature.properties;
          if (props && Number(props.wkr) === Number(wkrNum)) found = layer;
        });
        return found;
      }

      let selectedWkr = null;

      function resetDistrictStyles() {
        if (!mapLayer) return;
        mapLayer.eachLayer((layer) => {
          try { applyLayerStyle(layer); } catch (_) { /* ignore */ }
        });
        if (selectedWkr == null) return;
        const focused = findLayerByWkr(selectedWkr);
        if (!focused) return;
        try {
          const style = styleForWkr(selectedWkr);
          focused.setStyle({
            weight: 3,
            color: '#111',
            opacity: 1,
            fillOpacity: 0.85,
            fillColor: style.fillColor
          });
          if (style.patternId) {
            paintPathFill(focused, districtPatternFill(style.patternId));
          }
          if (focused.bringToFront) focused.bringToFront();
        } catch (_) { /* ignore */ }
      }

      function highlightLayer(layer) {
        if (!layer || !layer.feature) return;
        selectedWkr = layer.feature.properties.wkr;
        resetDistrictStyles();
      }

      function focusDistrict(wkrNum, opts) {
        const focused = findLayerByWkr(wkrNum);
        if (!focused || !mapInstance) return false;
        const props = focused.feature.properties;
        selectedWkr = wkrNum;
        renderDistrictDetail(wkrNum, items, props.wkr_name, l1Label, listLookup, meta);
        resetDistrictStyles();

        const pinLon = opts && Number(opts.lon);
        const pinLat = opts && Number(opts.lat);
        clearAddressMarker();
        if (Number.isFinite(pinLon) && Number.isFinite(pinLat)) {
          addressMarker = L.circleMarker([pinLat, pinLon], {
            radius: 7,
            color: '#111',
            weight: 2,
            fillColor: '#fff',
            fillOpacity: 0.95
          }).addTo(mapInstance);
          if (opts && opts.label) {
            addressMarker.bindTooltip(opts.label, { permanent: false, direction: 'top' });
          }
          try {
            mapInstance.invalidateSize();
            mapInstance.setView([pinLat, pinLon], Math.max(mapInstance.getZoom(), 13));
          } catch (_) { /* ignore */ }
        } else {
          try {
            mapInstance.invalidateSize();
            mapInstance.fitBounds(focused.getBounds(), { padding: [36, 36], maxZoom: 12 });
          } catch (_) { /* ignore */ }
        }
        const detailEl = document.getElementById('vorhersage-districts-detail');
        if (detailEl) {
          detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return true;
      }

      mapLayer = L.geoJSON(geo, {
        style(feature) {
          return styleForWkr(feature.properties.wkr);
        },
        onEachFeature(feature, layer) {
          const wkr = feature.properties.wkr;
          const name = feature.properties.wkr_name;
          const win = winners[String(wkr)];
          const rows = rowsByWkr[String(wkr)] || [];
          const runnerUp = districtRunnerUpWinProbability(rows);
          const like = districtWinLikelihoodLabel(districtWinProbability(win), runnerUp);
          let tip = `WK ${wkr}: ${name}`;
          if (win) {
            tip += `<br>${win.partei} ${formatWinProbabilityPct(win.probability)}`;
            if (like) tip += ` · ${like}`;
          }
          layer.bindTooltip(tip, { sticky: true });
          layer.on('click', () => {
            if (opts && opts.navigateToWkr) {
              try {
                // Navigate to the WK on the full preview page.
                const url =
                  `${siteBase()}direktmandate/?state=${encodeURIComponent(code || '')}&wkr=${encodeURIComponent(wkr)}`;
                window.location.href = url;
              } catch (_) {
                /* ignore */
              }
              return;
            }
            clearAddressMarker();
            selectedWkr = wkr;
            renderDistrictDetail(wkr, items, name, l1Label, listLookup, meta);
            resetDistrictStyles();
          });
        }
      }).addTo(mapInstance);

      function restyleAllDistricts() {
        resetDistrictStyles();
      }
      // Re-apply pattern fills after Leaflet path redraws (fit/zoom/move).
      restyleAllDistricts();
      mapInstance.on('viewreset zoomend moveend', restyleAllDistricts);
      setTimeout(restyleAllDistricts, 0);
      setTimeout(restyleAllDistricts, 300);

      bindDistrictSearch({
        code,
        items,
        geo,
        selectHit(hit) {
          if (!hit || hit.wkr == null) return;
          focusDistrict(hit.wkr, {
            lon: hit.lon,
            lat: hit.lat,
            label: hit.label
          });
          try {
            const input = document.getElementById('district-search-input');
            if (input) input.value = hit.label || '';
          } catch (_) { /* ignore */ }
        }
      });

      const extraZoom = opts && Number(opts.extraZoom);
      const overviewPadding = Number.isFinite(extraZoom) && extraZoom > 0 ? 0 : 12;
      function fitStateOverview() {
        if (!mapInstance || !mapLayer) return;
        mapInstance.fitBounds(mapLayer.getBounds(), { padding: [overviewPadding, overviewPadding] });
        if (Number.isFinite(extraZoom) && extraZoom > 0) {
          const z = mapInstance.getZoom();
          if (Number.isFinite(z)) mapInstance.setZoom(z + extraZoom, { animate: false });
        }
      }

      const hasFocus = Number.isFinite(focusWkr);
      if (!hasFocus) {
        fitStateOverview();
      }
      // Section was display:none before mount; size can be wrong on first paint.
      // When deep-linking a WK, do NOT refit to the full state after focus.
      requestAnimationFrame(() => {
        if (!mapInstance) return;
        mapInstance.invalidateSize();
        if (hasFocus) focusDistrict(focusWkr);
        else fitStateOverview();
        restyleAllDistricts();
      });
      setTimeout(() => {
        if (!mapInstance) return;
        mapInstance.invalidateSize();
        if (hasFocus) focusDistrict(focusWkr);
        else fitStateOverview();
        restyleAllDistricts();
      }, 250);

      const used = new Set();
      Object.keys(rowsByWkr).forEach((wkr) => {
        const rows = rowsByWkr[wkr] || [];
        const win = winners[wkr];
        if (!win) return;
        const runnerUp = districtRunnerUpWinProbability(rows);
        const label = districtWinLikelihoodLabel(districtWinProbability(win), runnerUp);
        if (districtNeedsStripes(label)) {
          districtStripeCandidates(rows).forEach((r) => {
            if (r && r.partei) used.add(r.partei);
          });
        } else if (win.partei) {
          used.add(win.partei);
        }
      });
      const partyOrder = ['CDU', 'CSU', 'CDU/CSU', 'AfD', 'SPD', 'GRÜNE', 'LINKE', 'BSW', 'FDP', 'Sonstige'];
      const usedList = [...used].sort((a, b) => {
        const ia = partyOrder.indexOf(a);
        const ib = partyOrder.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a).localeCompare(String(b), 'de');
      });
      if (legendEl) {
        legendEl.innerHTML = usedList.map(p => `
          <span style="display:inline-flex;align-items:center;gap:0.35rem;">
            <span style="width:12px;height:12px;border-radius:2px;background:${DISTRICT_PARTY_COLORS[p] || '#999'};"></span>
            ${p}
          </span>
        `).join('') + `
          <span style="width:100%; text-align:center; color:#777; font-size:0.78rem; margin-top:0.15rem;">
            Einfarbig ab P(Favorit) ≥ 66 %, wenn die Zweitplatzierte ≤ 33 % hat; je höher P, desto kräftiger die Farbe. Streifen bei offen/tendenziell (alle Parteien &gt;10 %, Breite ≈ P).
          </span>`;
      }

      function percentileSorted(sortedArr, p) {
        if (!sortedArr.length) return 0;
        const idx = Math.min(
          sortedArr.length - 1,
          Math.max(0, Math.ceil((p / 100) * sortedArr.length) - 1)
        );
        return sortedArr[idx];
      }

      /** p10–p90 Direktmandate from district win probs (multinomial per WK). */
      function simulateDirectRanges(districtItems, nsim) {
        const byWkr = {};
        (districtItems || []).forEach((r) => {
          if (districtIsOthers(r)) return;
          const p = districtWinProbability(r);
          if (!Number.isFinite(p) || p <= 0 || !r.partei) return;
          const key = String(r.wkr);
          if (!byWkr[key]) byWkr[key] = [];
          byWkr[key].push({ partei: r.partei, p });
        });
        const parties = [];
        const seen = {};
        Object.keys(byWkr).forEach((w) => {
          byWkr[w].forEach((r) => {
            if (!seen[r.partei]) {
              seen[r.partei] = true;
              parties.push(r.partei);
            }
          });
        });
        const sims = {};
        parties.forEach((p) => { sims[p] = new Int16Array(nsim); });
        const wkList = Object.keys(byWkr);
        for (let i = 0; i < nsim; i++) {
          for (let w = 0; w < wkList.length; w++) {
            const rows = byWkr[wkList[w]];
            let sum = 0;
            for (let k = 0; k < rows.length; k++) sum += rows[k].p;
            if (sum <= 0) continue;
            let u = Math.random() * sum;
            for (let k = 0; k < rows.length; k++) {
              u -= rows[k].p;
              if (u <= 0) {
                sims[rows[k].partei][i] += 1;
                break;
              }
            }
          }
        }
        return parties.map((p) => {
          const arr = Array.from(sims[p]).sort((a, b) => a - b);
          const p10 = percentileSorted(arr, 10);
          const p90 = percentileSorted(arr, 90);
          const median = percentileSorted(arr, 50);
          return { partei: p, p10, p90, median };
        })
          .filter((r) => r.p90 > 0)
          .sort((a, b) => b.median - a.median || b.p90 - a.p90 || String(a.partei).localeCompare(String(b.partei), 'de'));
      }

      const hint = document.getElementById('vorhersage-districts-hint');
      if (hint) {
        hint.style.display = 'block';
        const ranges = simulateDirectRanges(items, 2500);
        const tallyHtml = ranges.map((r) => {
          const span = r.p10 === r.p90
            ? String(r.p10)
            : `${r.p10}–${r.p90}`;
          return `<strong>${escapeHtml(r.partei)}</strong> ${escapeHtml(span)}`;
        }).join(' · ');
        hint.innerHTML = `
          Anzahl Direktmandate:
          ${tallyHtml}
          <span style="color:#777;font-weight:400;"> · p10–p90</span>
          <div style="color:#777; font-size:0.8rem; margin-top:0.25rem;">Klicken Sie einen Wahlkreis für Erststimmen-Details.</div>
        `;
      }
      renderDistrictGender(items, meta);
      renderParliamentSize(code, parliamentSize);

      if (hasFocus) {
        focusDistrict(focusWkr);
      }
    } catch (e) {
      console.warn('District map unavailable', e);
      hide();
    }
  }

  global.DistrictForecastMap = { mount, hide };
})(typeof window !== 'undefined' ? window : this);
