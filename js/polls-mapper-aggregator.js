/**
 * Poll mapping + simple aggregation helpers (browser-side).
 *
 * Designed to consume Fasttrack `/v2/polls` items with `results[]` rows.
 * Exposes a single global: `window.pollsMapperAggregator`.
 */

(function () {
  const CORE_ORDER = ['CDU/CSU', 'AfD', 'SPD', 'GRÜNE', 'LINKE', 'BSW', 'FDP', 'FW', 'SSW', 'PIRATEN', 'REP', 'Sonstige'];

  const PARTY_KEY_TO_NAME = {
    AFD: 'AfD',
    CDU_CSU: 'CDU/CSU',
    CDU: 'CDU/CSU',
    CSU: 'CDU/CSU',
    SPD: 'SPD',
    GRUENE: 'GRÜNE',
    FDP: 'FDP',
    LINKE: 'LINKE',
    BSW: 'BSW',
    SONSTIGE: 'Sonstige',
    FREIE_WAEHLER: 'FW',
    SSW: 'SSW',
    PIRATEN: 'PIRATEN',
    DIE_PARTEI: 'PIRATEN',
  };

  const NORMALIZE = {
    CDU: 'CDU/CSU',
    CSU: 'CDU/CSU',
    cdu: 'CDU/CSU',
    csu: 'CDU/CSU',
    Grüne: 'GRÜNE',
    gruene: 'GRÜNE',
    grüne: 'GRÜNE',
    GRUENE: 'GRÜNE',
    Linke: 'LINKE',
    PDS: 'LINKE',
    'Linke.PDS': 'LINKE',
    FW: 'FW',
    'Freie Wähler': 'FW',
    FREIE_WAEHLER: 'FW',
    'BVB/FW': 'FW',
    Piraten: 'PIRATEN',
    BSW: 'BSW',
    Sonstige: 'Sonstige',
    SONSTIGE: 'Sonstige',
    REP: 'REP',
    SSW: 'SSW',
    AFD: 'AfD',
  };

  function normalizePartyName(name) {
    if (!name) return name;
    const s = String(name).trim();
    if (s === 'CDU' || s === 'CSU') return 'CDU/CSU';
    if (PARTY_KEY_TO_NAME[s]) return PARTY_KEY_TO_NAME[s];
    return NORMALIZE[s] || name;
  }

  function abbreviatePartyName(name) {
    if (!name) return name;
    const n = normalizePartyName(name);
    if (n === 'Freie Wähler') return 'FW';
    return n;
  }

  function resultsArrayToPartyMap(results) {
    const out = {};
    if (!Array.isArray(results)) return out;
    for (const r of results) {
      if (!r || typeof r !== 'object') continue;
      const partyNameRaw = r.party_key || r.party_short_name || r.party_name;
      const pct = r.percentage;
      if (!partyNameRaw) continue;
      if (pct === null || pct === undefined) continue;
      const party = normalizePartyName(partyNameRaw);
      const val = Number(pct);
      if (!Number.isFinite(val)) continue;
      out[party] = val;
    }
    return out;
  }

  function consolidatePartyMap(partyMap) {
    const out = {};
    let sum = 0;

    for (const p of CORE_ORDER) {
      if (p === 'Sonstige') continue;
      if (partyMap[p] === null || partyMap[p] === undefined) continue;
      const v = Number(partyMap[p]);
      if (!Number.isFinite(v)) continue;
      out[p] = v;
      sum += v;
    }

    const explicit = partyMap.Sonstige;
    if (explicit !== null && explicit !== undefined && Number.isFinite(Number(explicit))) {
      out.Sonstige = Number(explicit);
    } else if (sum > 0) {
      out.Sonstige = Math.max(0, Math.round((100 - sum) * 10) / 10);
    }

    const total = Object.values(out).reduce((a, b) => a + b, 0);
    if (total > 0 && Math.abs(total - 100) > 0.05) {
      const factor = 100 / total;
      for (const p of Object.keys(out)) {
        out[p] = Math.round(out[p] * factor * 10) / 10;
      }
    }

    return out;
  }

  function pollToPartyMap(poll) {
    return consolidatePartyMap(resultsArrayToPartyMap(poll && poll.results));
  }

  window.pollsMapperAggregator = {
    normalizePartyName,
    abbreviatePartyName,
    resultsArrayToPartyMap,
    consolidatePartyMap,
    pollToPartyMap,
    CORE_ORDER,
  };
})();
