/**
 * Candidate entry probabilities (Direkt + Liste).
 * Expects pipelineData.loadCandidateEntry().
 */
(function () {
  const LIVE_STATES = [
    { code: "BE", label: "Berlin", date: "20.09.2026" },
    { code: "MV", label: "Mecklenburg-Vorpommern", date: "20.09.2026" },
  ];
  const ARCHIVE_STATES = [
    { code: "ST", label: "Sachsen-Anhalt", date: "06.09.2026" },
  ];
  const STATES = LIVE_STATES;
  const STATE_COATS = {
    BE: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/DEU_Berlin_COA.svg/60px-DEU_Berlin_COA.svg.png",
    MV: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Coat_of_arms_of_Mecklenburg-Western_Pomerania_%28small%29.svg/60px-Coat_of_arms_of_Mecklenburg-Western_Pomerania_%28small%29.svg.png",
    ST: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Wappen_Sachsen-Anhalt.svg/60px-Wappen_Sachsen-Anhalt.svg.png",
  };

  const UNOFFICIAL_SOURCE_NOTE =
    "Die hier angezeigten Namen stammen überwiegend aus Angaben der Parteien; je Person finden Sie die genutzte Quelle auf der Profilseite. Nichtamtliche Namensstände können sich bis zum amtlichen Bewerberverzeichnis ändern.";

  let genderFoldOpen = false;

  const PARTY_COLOR = {
    spd: "#E3000F",
    afd: "#009EE0",
    cdu: "#000000",
    linke: "#BE3075",
    gruene: "#46962B",
    fdp: "#FFED00",
    bsw: "#7878C8",
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pctInt(pct) {
    const n = Number(pct);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n);
  }

  /** Sort key without academic titles (Dr./Prof./med./…). */
  function nameSortKey(name) {
    return String(name || "")
      .replace(/\b(dr|prof|med|dipl|mag|ing)\.?\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cmpNames(a, b) {
    return nameSortKey(a).localeCompare(nameSortKey(b), "de");
  }

  /** Gender ratio from named candidates (first-name estimate). */
  function genderStats(cands, { weightKey, minExpected } = {}) {
    const named = (cands || []).filter((c) => !c.is_placeholder && c.gender);
    const n = named.length;
    if (!n) return null;
    let nF = 0;
    let nM = 0;
    let nOther = 0;
    let wF = 0;
    let wM = 0;
    for (const c of named) {
      if (c.gender === "f") nF += 1;
      else if (c.gender === "m") nM += 1;
      else nOther += 1;
      if (weightKey) {
        const w = Math.max(0, Number(c[weightKey]) || 0);
        if (c.gender === "f") wF += w;
        else if (c.gender === "m") wM += w;
      }
    }
    if (weightKey) {
      const denom = wF + wM;
      // p_* are 0–100; expected count = Σp / 100
      const expected = Math.round((denom / 100) * 10) / 10;
      const belowMin =
        !denom || (minExpected != null && expected < minExpected);
      return {
        n,
        nF,
        nM,
        nOther,
        weighted: true,
        weightSum: denom,
        expected,
        noSeatsExpected: belowMin,
        pctF: belowMin ? null : Math.round((1000 * wF) / denom) / 10,
        pctM: belowMin ? null : Math.round((1000 * wM) / denom) / 10,
      };
    }
    const denom = nF + nM;
    return {
      n,
      nF,
      nM,
      nOther,
      pctF: denom ? Math.round((1000 * nF) / denom) / 10 : null,
      pctM: denom ? Math.round((1000 * nM) / denom) / 10 : null,
    };
  }

  function genderBreakdown(cands) {
    const named = (cands || []).filter((c) => !c.is_placeholder && c.gender);
    const list = named.filter((c) => c.list_pos != null);
    const district = named.filter(
      (c) => c.wkr_direct != null && c.wkr_direct !== ""
    );
    return {
      overall: genderStats(named),
      list: genderStats(list),
      district: genderStats(district),
      listWeighted: genderStats(list, {
        weightKey: "p_list",
        minExpected: 1,
      }),
      districtWeighted: genderStats(district, {
        weightKey: "p_direct",
        minExpected: 1,
      }),
    };
  }

  function genderRowHtml(g, label, { compact, showN, expectedUnit } = {}) {
    if (!g) return "";
    const title =
      "Geschlecht geschätzt anhand der Vornamen (Wörterbuch + Korrekturen), nicht amtlich";
    if (g.weighted && g.noSeatsExpected) {
      return `<div class="ce-gender ce-gender-empty" title="${escapeHtml(title)}">
        <span class="ce-gender-kind">${escapeHtml(label)}</span>
        <span class="ce-gender-label">keine Mandate erwartet</span>
      </div>`;
    }
    if (g.pctF == null) return "";
    const barF = Math.max(0, Math.min(100, g.pctF));
    let text;
    if (compact) {
      text = `${g.pctF}% w · ${g.pctM}% m`;
      if (showN !== false) text += ` (n=${g.n})`;
    } else {
      text = `${g.pctF}% Frauen`;
      if (g.weighted && g.expected != null) {
        const unit = expectedUnit || "Mandate";
        text += ` · ~${g.expected} ${unit}`;
      } else if (showN !== false && !g.weighted) {
        text += ` · n=${g.n}`;
      }
    }
    return `<div class="ce-gender" title="${escapeHtml(title)}">
      <span class="ce-gender-kind">${escapeHtml(label)}</span>
      <div class="ce-gender-bar" aria-hidden="true">
        <span class="ce-gender-f" style="width:${barF}%"></span>
      </div>
      <span class="ce-gender-label">${escapeHtml(text)}</span>
    </div>`;
  }

  function genderRatioHtml(cands, { compact } = {}) {
    if (compact) {
      // Bezirk group header: list seats in that Bezirk.
      const list = (cands || []).filter(
        (c) => !c.is_placeholder && c.list_pos != null
      );
      return genderRowHtml(genderStats(list.length ? list : cands), "Liste", {
        compact: true,
      });
    }
    const b = genderBreakdown(cands);
    const rows = [
      genderRowHtml(b.overall, "Gesamt"),
      genderRowHtml(b.list, "Liste"),
      genderRowHtml(b.district, "Direkt"),
      genderRowHtml(b.listWeighted, "Liste × P(Liste)", {
        expectedUnit: "Listensitze",
      }),
      genderRowHtml(b.districtWeighted, "Direkt × P(Sieg)", {
        expectedUnit: "Direktmandate",
      }),
    ].filter(Boolean);
    if (!rows.length) return "";
    return `<details class="ce-gender-fold"${genderFoldOpen ? " open" : ""}>
      <summary>Geschlechteranteil</summary>
      <div class="ce-gender-block">${rows.join("")}<div class="zs-wm-strip zs-wm-strip--compact" aria-hidden="true"></div></div>
    </details>`;
  }

  function pctBar(pct, color) {
    const w = Math.max(0, Math.min(100, pctInt(pct)));
    return `<span class="ce-bar" title="${w}%"><span class="ce-bar-fill" style="width:${w}%;background:${color}"></span></span>`;
  }

  function httpSource(url) {
    const s = String(url || "").trim();
    return /^https?:\/\//i.test(s) ? s : "";
  }

  function hasCandidateBio(c) {
    if (!c) return false;
    return Boolean(
      c.birth_year || c.birth_place || c.residence || c.profession
    );
  }

  function candidateBioHtml(c) {
    if (!hasCandidateBio(c)) return "";
    const lines = [];
    if (c.birth_year) {
      const place = c.birth_place ? ` in ${c.birth_place}` : "";
      lines.push(`Geboren ${c.birth_year}${place}`);
    } else if (c.birth_place) {
      lines.push(`Geburtsort: ${c.birth_place}`);
    }
    if (c.residence) lines.push(`Wohnort: ${c.residence}`);
    if (c.profession) lines.push(c.profession);
    const body = lines
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");
    return `<details class="ce-cand-info">
      <summary class="ce-cand-info-btn" aria-label="Angaben laut Landeswahlleiterin">i</summary>
      <div class="ce-cand-info-body">
        ${body}
        <div class="ce-cand-info-src">Angaben laut Landeswahlleiterin / StaLa</div>
      </div>
    </details>`;
  }

  /** Close other open bio popovers when one opens (single-open UX). */
  function bindCandInfoExclusive(root) {
    if (!root || root.dataset.ceInfoBound === "1") return;
    root.dataset.ceInfoBound = "1";
    root.addEventListener("toggle", (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLDetailsElement) || !t.classList.contains("ce-cand-info")) {
        return;
      }
      if (!t.open) return;
      root.querySelectorAll("details.ce-cand-info[open]").forEach((d) => {
        if (d !== t) d.open = false;
      });
    }, true);
  }

  function candidateProfileHref(c, stateCode) {
    const params = new URLSearchParams();
    params.set("from", "einzug");
    if (stateCode) params.set("state", String(stateCode).toUpperCase());
    if (c && c.person_id) {
      params.set("id", String(c.person_id));
      return `${siteBase()}kandidat/?${params.toString()}`;
    }
    if (c && c.name) params.set("name", String(c.name));
    const party = c && (c.party || c._party);
    if (party) params.set("party", String(party).toLowerCase());
    if (c && c.wkr_direct != null && c.wkr_direct !== "") {
      params.set("wkr", String(c.wkr_direct));
    }
    return `${siteBase()}kandidat/?${params.toString()}`;
  }

  function candidateNameHtml(c, stateCode, partyCode) {
    const label = escapeHtml(c.name || "unbekannt");
    const info = candidateBioHtml(c);
    if (c.is_placeholder) {
      return `<span class="ce-ph" title="Name noch nicht bekannt">${label}</span>`;
    }
    const href = candidateProfileHref(
      { ...c, party: partyCode || c.party, _party: partyCode },
      stateCode
    );
    const name = `<a class="ce-source-link" href="${escapeHtml(href)}" title="Profil öffnen">${label}</a>`;
    let badge = "";
    if (c.is_incumbent) {
      const chamber = c.incumbent_chamber || "MdL";
      const title =
        chamber === "MdA"
          ? "Amtsinhaber:in im Abgeordnetenhaus"
          : "Amtsinhaber:in im Landtag";
      const aw = httpSource(c.incumbent_url) || httpSource(c.aw_url);
      badge = aw
        ? `<a class="ce-incumbent" href="${escapeHtml(aw)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)} (abgeordnetenwatch)">${escapeHtml(chamber)}</a>`
        : `<span class="ce-incumbent" title="${escapeHtml(title)}">${escapeHtml(chamber)}</span>`;
    } else {
      const aw = httpSource(c.aw_url);
      if (aw) {
        badge = `<a class="ce-aw" href="${escapeHtml(aw)}" target="_blank" rel="noopener noreferrer" title="Profil bei abgeordnetenwatch">AW</a>`;
      }
    }
    return `<span class="ce-name-wrap">${name}${badge}${info}</span>`;
  }

  function mount(root) {
    if (!root) return;
    if (!window.pipelineData || !window.pipelineData.loadCandidateEntry) {
      root.innerHTML =
        `<p class="ce-error">pipelineData nicht geladen — Seite neu laden.</p>`;
      return;
    }
    root.innerHTML = `<p class="ce-loading">Lade Einzugschancen…</p>`;

    const slow = window.setTimeout(() => {
      if (root.querySelector(".ce-loading")) {
        root.innerHTML =
          `<p class="ce-loading">Lade Einzugschancen… (große Datei, einen Moment)</p>`;
      }
    }, 2500);

    window.pipelineData
      .loadCandidateEntry()
      .then((data) => {
        window.clearTimeout(slow);
        try {
          render(root, data);
        } catch (err) {
          root.innerHTML = `<p class="ce-error">Anzeige fehlgeschlagen (${escapeHtml(err.message)}).</p>`;
          console.error(err);
        }
      })
      .catch((err) => {
        window.clearTimeout(slow);
        root.innerHTML = `<p class="ce-error">Daten nicht verfügbar (${escapeHtml(err.message)}).</p>`;
      });
  }

  function autoMount() {
    const root = document.getElementById("candidate-entry-root");
    if (!root || root.dataset.ceMounted === "1") return;
    if (!window.pipelineData) {
      // pipeline-data.js is deferred before this file; retry briefly if order glitches.
      let n = 0;
      const t = window.setInterval(() => {
        n += 1;
        if (window.pipelineData) {
          window.clearInterval(t);
          root.dataset.ceMounted = "1";
          mount(root);
        } else if (n > 40) {
          window.clearInterval(t);
          root.innerHTML =
            `<p class="ce-error">pipelineData nicht geladen — Seite neu laden.</p>`;
        }
      }, 50);
      return;
    }
    root.dataset.ceMounted = "1";
    mount(root);
  }

  function siteBase() {
    return ((window.pipelineData && window.pipelineData.SITE_BASE) || "/").replace(
      /\/?$/,
      "/"
    );
  }

  function districtHref(stateCode, wkr) {
    const params = new URLSearchParams();
    params.set("state", String(stateCode || "").toUpperCase());
    params.set("wkr", String(wkr));
    return `${siteBase()}direktmandate/?${params.toString()}`;
  }

  /** Cached wkr → name maps per state (from Wahlkreise GeoJSON). */
  const wkrNamesByState = Object.create(null);
  const wkrNamesPending = Object.create(null);

  function wkrNameFor(stateCode, wkr) {
    const map = wkrNamesByState[String(stateCode || "").toUpperCase()];
    if (!map || wkr == null || wkr === "") return "";
    return map[String(wkr)] || "";
  }

  function ensureWkrNames(stateCode) {
    const code = String(stateCode || "").toUpperCase();
    if (!code) return Promise.resolve({});
    if (wkrNamesByState[code]) return Promise.resolve(wkrNamesByState[code]);
    if (wkrNamesPending[code]) return wkrNamesPending[code];
    const loader =
      window.pipelineData &&
      (window.pipelineData.loadWahlkreiseGeo || window.pipelineData.loadForecastDistricts);
    if (!loader) {
      wkrNamesByState[code] = {};
      return Promise.resolve(wkrNamesByState[code]);
    }
    const loadGeo = window.pipelineData.loadWahlkreiseGeo;
    const loadDist = window.pipelineData.loadForecastDistricts;
    wkrNamesPending[code] = (loadGeo
      ? loadGeo.call(window.pipelineData, code.toLowerCase())
      : Promise.reject(new Error("no geo"))
    )
      .then((geo) => {
        const map = Object.create(null);
        (geo.features || []).forEach((f) => {
          const p = (f && f.properties) || {};
          if (p.wkr == null) return;
          const name = String(p.wkr_name || "").trim();
          if (name) map[String(p.wkr)] = name;
        });
        return map;
      })
      .catch(() =>
        loadDist
          ? loadDist.call(window.pipelineData, code.toLowerCase()).then((d) => {
              const map = Object.create(null);
              ((d && d.items) || []).forEach((row) => {
                if (row == null || row.wkr == null) return;
                const name = String(row.wkr_name || "").trim();
                if (name) map[String(row.wkr)] = name;
              });
              return map;
            })
          : Promise.resolve({})
      )
      .catch(() => ({}))
      .then((map) => {
        wkrNamesByState[code] = map || {};
        delete wkrNamesPending[code];
        return wkrNamesByState[code];
      });
    return wkrNamesPending[code];
  }

  function readQuery() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function writeQuery(stateCode, partyCode, bezirk, q, hidePh, minP, sortKey, sortDir) {
    try {
      const u = new URL(window.location.href);
      const p = u.searchParams;
      p.set("state", stateCode);
      if (partyCode) p.set("party", partyCode);
      else p.delete("party");
      if (bezirk) p.set("bezirk", bezirk);
      else p.delete("bezirk");
      if (q && q.trim()) p.set("q", q.trim());
      else p.delete("q");
      p.delete("platz");
      if (hidePh) p.set("named", "1");
      else p.delete("named");
      if (minP !== 0) p.set("min", String(minP));
      else p.delete("min");
      if (sortKey && (sortKey !== "list" || sortDir !== "asc")) {
        p.set("sort", sortKey);
        p.set("dir", sortDir);
      } else {
        p.delete("sort");
        p.delete("dir");
      }
      window.history.replaceState({}, "", u.pathname + "?" + p.toString() + u.hash);
    } catch (_) {
      /* ignore */
    }
  }

  const SORT_DEFAULT_DIR = {
    name: "asc",
    list: "asc",
    wkr: "asc",
    entry: "desc",
    direct: "desc",
    listpct: "desc",
  };

  const SORT_LABELS = {
    name: "Name",
    list: "Listenplatz",
    wkr: "Wahlkreis",
    entry: "Einzug",
    direct: "Direkt",
    listpct: "Liste",
  };

  function formatStandDate(raw) {
    if (!raw || typeof raw !== "string") return "";
    const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}.${mm}.${yyyy}`;
  }

  function standText(stateObj, meta) {
    const stand = formatStandDate(
      (stateObj && stateObj.last_update) || (meta && meta.last_update) || ""
    );
    const poll = formatStandDate(
      (stateObj && stateObj.statewide_last_poll_date) ||
        (meta && meta.last_poll_date) ||
        ""
    );
    const bits = [];
    if (stand) bits.push(`Stand: ${stand}`);
    if (poll) bits.push(`Letzte Umfrage: ${poll}`);
    return bits.join(" · ");
  }

  function render(root, data) {
    const states = data.states || {};
    const params = readQuery();
    const liveCodes = new Set(LIVE_STATES.map((s) => s.code));
    const archiveCodes = new Set(ARCHIVE_STATES.map((s) => s.code));
    let stateCode = String(params.get("state") || "BE").toUpperCase();
    const archived = archiveCodes.has(stateCode) && Boolean(states[stateCode]);
    if (!archived && (!liveCodes.has(stateCode) || !states[stateCode])) {
      stateCode = LIVE_STATES.find((s) => states[s.code])?.code || "BE";
    }
    let partyCode = params.get("party") || null;
    let bezirkFilter = params.get("bezirk") || "";
    let q = params.get("q") || "";
    let hidePh = params.get("named") === "1";
    let minP = params.get("min") != null ? Number(params.get("min")) : 0;
    if (!Number.isFinite(minP)) minP = 0;
    let sortKey = params.get("sort") || "list";
    if (!SORT_DEFAULT_DIR[sortKey]) sortKey = "list";
    let sortDir =
      params.get("dir") === "desc" || params.get("dir") === "asc"
        ? params.get("dir")
        : SORT_DEFAULT_DIR[sortKey];

    bindCandInfoExclusive(root);

    root.innerHTML = `
      <div class="ce-wrap">
        <nav class="ce-cross-nav" aria-label="Wahlkreise und Listen">
          <a class="ce-districts-link" href="#">Wahlkreise</a>
          <span class="is-here">Alle Kandidierende</span>
        </nav>
        <p class="ce-archive-note"${archived ? "" : " hidden"}>
          Eingefrorene Vorhersage vor der Wahl —
          <a href="${escapeHtml(siteBase() + "archive/posts/vergangene-vorhersagen/")}">Vergangene Vorhersagen</a>.
        </p>
        <div class="ce-controls">
          <div class="ce-state-tabs" role="tablist"></div>
          <p class="ce-stand"></p>
        </div>

        <div class="scenario-prob-panel">
          <div class="ce-party-tabs" role="tablist" aria-label="Partei"></div>
          <div class="ce-filters">
            <label class="ce-bezirk-wrap" style="display:none">Bezirk
              <select class="ce-bezirk"><option value="">Alle</option></select>
            </label>
            <label>Suche
              <input type="search" class="ce-search" placeholder="Name…" />
            </label>
            <label>Min. Einzug %
              <input type="number" class="ce-min" min="0" max="100" step="1" value="${escapeHtml(String(minP))}" />
            </label>
            <label class="ce-check"><input type="checkbox" class="ce-hide-ph"${hidePh ? " checked" : ""} /> Nur bekannte Namen</label>
          </div>
          <p class="ce-note"></p>
          <div class="ce-table-wrap"></div>
          <div class="zs-wm-strip zs-wm-strip--compact" aria-hidden="true"></div>
        </div>
      </div>
    `;

    // Place the (collapsed) "So lesen Sie …" explainer below the country buttons
    // (ce-state-tabs inside ce-controls), so the visual reading order matches
    // the /direktmandate/ page.
    try {
      const explainer = document.querySelector(".ce-explainer");
      const controls = root.querySelector(".ce-controls");
      const note = root.querySelector(".ce-note");
      if (explainer && controls && note) {
        const inRoot = explainer.closest("#candidate-entry-root") === root;
        const noteWrap = note && note.parentElement;
        if (!inRoot && noteWrap) noteWrap.insertBefore(explainer, note);
      }
    } catch (_) { /* ignore */ }

    const tabs = root.querySelector(".ce-state-tabs");
    const partyTabs = root.querySelector(".ce-party-tabs");
    const bezirkWrap = root.querySelector(".ce-bezirk-wrap");
    const bezirkSel = root.querySelector(".ce-bezirk");
    const search = root.querySelector(".ce-search");
    const minInput = root.querySelector(".ce-min");
    const hidePhBox = root.querySelector(".ce-hide-ph");
    const note = root.querySelector(".ce-note");
    const standEl = root.querySelector(".ce-stand");
    const tableWrap = root.querySelector(".ce-table-wrap");
    const districtsLink = root.querySelector(".ce-districts-link");
    search.value = q;

    function availableStates() {
      return STATES.filter((s) => states[s.code]);
    }

    function syncUrl() {
      writeQuery(stateCode, partyCode, bezirkFilter, q, hidePh, minP, sortKey, sortDir);
      if (districtsLink) {
        districtsLink.href = `${siteBase()}direktmandate/?state=${encodeURIComponent(stateCode)}`;
      }
    }

    function paintTabs() {
      tabs.innerHTML = availableStates()
        .map((s) => {
          const active = s.code === stateCode;
          const coat = STATE_COATS[s.code] || "";
          return `<button type="button" class="state-arm visible ce-tab${active ? " selected is-active" : ""}" data-state="${s.code}" aria-pressed="${active ? "true" : "false"}">
            <!-- Narrow (subpage tiles): Name top, Wappen+Datum bottom -->
            <div class="state-arm-narrow">
              <div class="state-arm-name">${escapeHtml(s.label)}</div>
              <div class="state-arm-sub">
                <img src="${escapeHtml(coat)}" alt="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}">
                <div class="election-date">${escapeHtml(s.date || "")}</div>
              </div>
            </div>

            <!-- Wide (subpages): Startseite-Layout (Wappen left, Name+Datum right) -->
            <div class="state-arm-wide">
              <img src="${escapeHtml(coat)}" alt="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}">
              <div class="state-arm-wide-text">
                <div class="state-arm-wide-name">${escapeHtml(s.label)}</div>
                <div class="election-date">${escapeHtml(s.date || "")}</div>
              </div>
            </div>
          </button>`;
        })
        .join("");
    }

    function paintPartyTabs() {
      const st = states[stateCode];
      if (!st) {
        partyTabs.innerHTML = "";
        return;
      }
      const parties = st.parties || [];
      if (!partyCode || !parties.some((p) => p.party === partyCode)) {
        partyCode = parties[0] ? parties[0].party : null;
      }
      partyTabs.innerHTML = parties
        .map((p) => {
          const active = p.party === partyCode;
          const color = PARTY_COLOR[p.party] || "#666";
          const listHint =
            p.list_type === "bezirk" ? "Bezirkslisten" : "Landesliste";
          const activeFg = p.party === "fdp" ? "#111" : "#fff";
          const style = active
            ? `background:${color};border-color:${color};color:${activeFg}`
            : `border-color:${color};color:${p.party === "cdu" ? "#111" : color}`;
          return `<button type="button" class="ce-party-tab${active ? " is-active" : ""}" data-party="${escapeHtml(p.party)}" style="${style}" title="${escapeHtml(listHint)}">${escapeHtml(p.partei)}</button>`;
        })
        .join("");
    }

    function paintBezirkSelect() {
      const st = states[stateCode];
      const party = st && (st.parties || []).find((p) => p.party === partyCode);
      const isBezirk = party && party.list_type === "bezirk";
      if (!isBezirk) {
        bezirkWrap.style.display = "none";
        bezirkFilter = "";
        return;
      }
      const seen = new Map();
      (party.candidates || []).forEach((c) => {
        if (!c.bezirk && !c.bezirk_name) return;
        const key = c.bezirk || c.bezirk_name;
        if (!seen.has(key)) seen.set(key, c.bezirk_name || c.bezirk);
      });
      const opts = [["", "Alle"], ...[...seen.entries()].sort((a, b) =>
        String(a[1]).localeCompare(String(b[1]), "de")
      )];
      // Accept bezirk name from URL even if filter key is code
      if (bezirkFilter && !seen.has(bezirkFilter)) {
        for (const [code, name] of seen) {
          if (
            String(name).toLowerCase() === String(bezirkFilter).toLowerCase() ||
            String(code).toLowerCase() === String(bezirkFilter).toLowerCase()
          ) {
            bezirkFilter = code;
            break;
          }
        }
      }
      bezirkWrap.style.display = "";
      bezirkSel.innerHTML = opts
        .map(
          ([val, label]) =>
            `<option value="${escapeHtml(val)}"${val === bezirkFilter ? " selected" : ""}>${escapeHtml(label)}</option>`
        )
        .join("");
    }

    function paintTable() {
      const st = states[stateCode];
      if (standEl) {
        standEl.textContent = st ? standText(st, data.metadata) : "";
      }
      if (!st) {
        tableWrap.innerHTML = "<p>Keine Daten.</p>";
        return;
      }
      const bits = [st.list_note_de || ""];
      const official =
        st.sources_official === true || String(stateCode).toUpperCase() === "ST";
      if (!official) bits.push(UNOFFICIAL_SOURCE_NOTE);
      note.textContent = bits.filter(Boolean).join(" ");
      const showBeNotes = String(stateCode).toUpperCase() === "BE";
      document.querySelectorAll(".ce-be-calc-note").forEach((el) => {
        el.hidden = !showBeNotes;
      });
      const party = (st.parties || []).find((p) => p.party === partyCode);
      if (!party) {
        tableWrap.innerHTML = "<p>Keine Partei gewählt.</p>";
        return;
      }
      const color = PARTY_COLOR[party.party] || "#666";
      let rows = [...(party.candidates || [])];
      if (bezirkFilter) {
        const bf = String(bezirkFilter).toLowerCase();
        rows = rows.filter(
          (c) =>
            String(c.bezirk || "").toLowerCase() === bf ||
            String(c.bezirk_name || "").toLowerCase() === bf
        );
      }
      const ql = q.trim().toLowerCase();
      const nameMatch = (c) =>
        Boolean(ql) && (c.name || "").toLowerCase().includes(ql);
      if (hidePh) rows = rows.filter((c) => !c.is_placeholder);
      rows = rows.filter((c) => (c.p_entry || 0) >= minP);

      const isBezirkList = party.list_type === "bezirk";
      // Bezirkslisten: keep Bezirk blocks whenever all districts are shown
      // (including during name search — hit groups float to the top).
      const useGroups = isBezirkList && !bezirkFilter;

      function cmpWithin(a, b) {
        if (sortKey === "name") {
          return cmpNames(a.name, b.name);
        }
        if (sortKey === "wkr") {
          const wa = a.wkr_direct == null || a.wkr_direct === "" ? 9999 : Number(a.wkr_direct);
          const wb = b.wkr_direct == null || b.wkr_direct === "" ? 9999 : Number(b.wkr_direct);
          if (wa !== wb) return wa - wb;
          return cmpNames(a.name, b.name);
        }
        if (sortKey === "entry") {
          const ea = pctInt(a.list_pos != null ? a.p_entry : a.p_direct);
          const eb = pctInt(b.list_pos != null ? b.p_entry : b.p_direct);
          if (ea !== eb) return ea - eb;
          return cmpNames(a.name, b.name);
        }
        if (sortKey === "direct") {
          const da = pctInt(a.p_direct);
          const db = pctInt(b.p_direct);
          if (da !== db) return da - db;
          return cmpNames(a.name, b.name);
        }
        if (sortKey === "listpct") {
          const la = a.list_pos == null ? -1 : pctInt(a.p_list);
          const lb = b.list_pos == null ? -1 : pctInt(b.p_list);
          if (la !== lb) return la - lb;
          return cmpNames(a.name, b.name);
        }
        // Default / list: Listenplatz (Direkt-only after named list places)
        const pa = a.list_pos == null ? 9999 : Number(a.list_pos);
        const pb = b.list_pos == null ? 9999 : Number(b.list_pos);
        if (pa !== pb) return pa - pb;
        return cmpNames(a.name, b.name);
      }

      function bezirkKey(c) {
        return String(c.bezirk || c.bezirk_name || "\uffff");
      }

      const bezirkHasHit = new Set();
      if (ql && useGroups) {
        for (const c of rows) {
          if (nameMatch(c)) bezirkHasHit.add(bezirkKey(c));
        }
      }

      rows.sort((a, b) => {
        if (useGroups) {
          // Groups with search hits first, then Bezirk order, then column sort.
          if (ql) {
            const ha = bezirkHasHit.has(bezirkKey(a)) ? 0 : 1;
            const hb = bezirkHasHit.has(bezirkKey(b)) ? 0 : 1;
            if (ha !== hb) return ha - hb;
          }
          const ba = bezirkKey(a);
          const bb = bezirkKey(b);
          if (ba !== bb) return ba.localeCompare(bb, "de");
          const na = a.bezirk_name || "";
          const nb = b.bezirk_name || "";
          if (na !== nb) return na.localeCompare(nb, "de");
          if (ql) {
            const ma = nameMatch(a) ? 0 : 1;
            const mb = nameMatch(b) ? 0 : 1;
            if (ma !== mb) return ma - mb;
          }
        } else if (ql) {
          // Flat lists: pin hits to top, then column sort.
          const ma = nameMatch(a) ? 0 : 1;
          const mb = nameMatch(b) ? 0 : 1;
          if (ma !== mb) return ma - mb;
        }
        const c = cmpWithin(a, b);
        return sortDir === "desc" ? -c : c;
      });

      const nNamed = rows.filter((c) => !c.is_placeholder).length;
      const nPh = rows.filter((c) => c.is_placeholder).length;
      const nHits = ql ? rows.filter(nameMatch).length : 0;
      const scope =
        bezirkFilter || hidePh || minP > 0
          ? "in der Ansicht"
          : "insgesamt";
      const sortLabel = SORT_LABELS[sortKey] || "Listenplatz";
      const dirLabel = sortDir === "desc" ? "↓" : "↑";
      const searchHint = ql
        ? useGroups
          ? ` · Suche „${q.trim()}“: ${nHits} Treffer — Bezirke mit Treffer oben`
          : ` · Suche „${q.trim()}“: ${nHits} Treffer oben markiert`
        : "";
      const metaLine = `${nNamed} Namen bekannt · ${nPh} ohne Namen (${scope}) · ${st.nsim} Simulationen · sortiert nach ${sortLabel} ${dirLabel}${searchHint}`;
      // Same named set as the meta line (incl. Direkt-only without Listenplatz).
      const genderBlock = genderRatioHtml(rows);
      const head = `
        <div class="ce-party-head">
          <span class="ce-party-dot" style="background:${color}"></span>
          <strong>${escapeHtml(party.partei)}</strong>
          <span class="ce-meta">${escapeHtml(metaLine)}</span>
        </div>
        ${genderBlock}
        ${
          nPh
            ? `<p class="ce-ph-hint">„Ohne Namen“ = Listenplatz oder Direkt-WK, zu dem uns noch kein Kandidatenname vorliegt (kursiv als <em>unbekannt</em>). Parteiweit: ${party.n_named} bekannt / ${party.n_placeholder} ohne Namen.</p>`
            : party.n_placeholder
              ? `<p class="ce-ph-hint">Es gibt ${party.n_placeholder} Plätze ohne Namen bei dieser Partei — sie sind durch den Filter („Nur bekannte Namen“ / Bezirk / Min. %) ausgeblendet.</p>`
              : ""
        }`;

      function bindGenderFold() {
        const fold = tableWrap.querySelector("details.ce-gender-fold");
        if (!fold) return;
        fold.addEventListener("toggle", () => {
          genderFoldOpen = fold.open;
        });
      }

      if (!rows.length) {
        tableWrap.innerHTML = head + "<p>Keine Kandidierenden für diese Filter.</p>";
        bindGenderFold();
        return;
      }

      function rowHtml(c) {
        const hasList = c.list_pos != null;
        const loc = hasList
          ? String(c.list_pos)
          : `<span class="ce-na" title="Kein Listenplatz — Einzug nur über Direktmandat möglich">—</span>`;
        const name = candidateNameHtml(c, stateCode, party.party);
        const wkName = wkrNameFor(stateCode, c.wkr_direct);
        const wkTitle = wkName
          ? `${wkName} — zur Karte`
          : "Wahlkreis auf der Karte";
        const wk =
          c.wkr_direct != null && c.wkr_direct !== ""
            ? `<a class="ce-wk-link" href="${escapeHtml(districtHref(stateCode, c.wkr_direct))}" title="${escapeHtml(wkTitle)}">WK ${escapeHtml(String(c.wkr_direct))}</a>`
            : "—";
        const dataAttrs = hasList
          ? ` data-party="${escapeHtml(party.party)}" data-bezirk="${escapeHtml(String(c.bezirk || ""))}" data-platz="${c.list_pos}"`
          : c.wkr_direct != null
            ? ` data-party="${escapeHtml(party.party)}" data-wkr="${escapeHtml(String(c.wkr_direct))}"`
            : "";
        // No list place → Liste N/A; Einzug = Direkt.
        const pDirect = pctInt(c.p_direct);
        const pEntry = pctInt(hasList ? c.p_entry : pDirect);
        const pList = pctInt(c.p_list);
        const entryMain = hasList
          ? `${pEntry}% ${pctBar(pEntry, color)}`
          : `<span title="Kein Listenplatz: Einzug = Direkt">${pEntry}%</span> ${pctBar(pEntry, color)}`;
        const stackTop = `${pEntry}%`;
        const stackMid = hasList ? `${pList}%` : "—";
        const stackBot = `${pDirect}%`;
        const entryCell = `
          <span class="ce-entry-main">${entryMain}</span>
          <span class="ce-entry-stack">${stackTop}<br>${stackMid}<br>${stackBot}</span>
        `;
        const listCell = hasList
          ? `${pList}%`
          : `<span class="ce-na" title="Kein Listenplatz">—</span>`;
        const hl = nameMatch(c) ? " class=\"ce-row-hl\"" : "";
        return `<tr${hl}${dataAttrs}>
            <td class="ce-name">${name}</td>
            <td class="ce-loc">${loc}</td>
            <td class="ce-num">${wk}</td>
            <td class="ce-num ce-entry">${entryCell}</td>
            <td class="ce-num">${listCell}</td>
            <td class="ce-num">${pDirect}%</td>
          </tr>`;
      }

      let body = "";
      if (useGroups) {
        let prevKey = null;
        const byBez = new Map();
        for (const c of rows) {
          const key = c.bezirk || c.bezirk_name || "_";
          if (!byBez.has(key)) byBez.set(key, []);
          byBez.get(key).push(c);
        }
        for (const c of rows) {
          const key = c.bezirk || c.bezirk_name || "_";
          if (key !== prevKey) {
            prevKey = key;
            const label =
              c.bezirk_name || (c.bezirk ? `Bezirk ${c.bezirk}` : "Ohne Bezirk");
            body += `<tr class="ce-group"><td colspan="6"><span class="ce-group-label">${escapeHtml(label)}</span></td></tr>`;
          }
          body += rowHtml(c);
        }
      } else {
        body = rows.map(rowHtml).join("");
      }

      function th(key, label, num, displayHtml) {
        const active = sortKey === key;
        const ind = active ? (sortDir === "desc" ? " ↓" : " ↑") : "";
        const cls = `ce-sortable${num ? " ce-num" : ""}${active ? " is-sorted" : ""}`;
        const labelHtml = displayHtml || escapeHtml(label);
        return `<th class="${cls}" data-sort="${key}" title="Nach ${escapeHtml(label)} sortieren" role="columnheader" aria-sort="${active ? (sortDir === "desc" ? "descending" : "ascending") : "none"}">${labelHtml}${ind}</th>`;
      }

      tableWrap.innerHTML =
        head +
        `<table class="ce-table">
          <thead>
            <tr>
              ${th("name", "Name", false)}
              ${th("list", isBezirkList ? "Platz" : "Listenplatz", false, isBezirkList ? null : "Listen<br>platz")}
              ${th("wkr", "WK", true)}
              ${th("entry", "Einzug", true)}
              ${th("listpct", "Liste %", true)}
              ${th("direct", "Direkt", true)}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>`;

      bindGenderFold();
      tableWrap.querySelectorAll("th.ce-sortable").forEach((thEl) => {
        thEl.addEventListener("click", () => {
          const key = thEl.getAttribute("data-sort");
          if (!key || !SORT_DEFAULT_DIR[key]) return;
          if (sortKey === key) {
            sortDir = sortDir === "asc" ? "desc" : "asc";
          } else {
            sortKey = key;
            sortDir = SORT_DEFAULT_DIR[key];
          }
          paintTable();
          syncUrl();
        });
      });

      // Scroll to first search hit or deep-linked platz
      const platz = readQuery().get("platz");
      let highlight = null;
      if (platz) {
        highlight = [...tableWrap.querySelectorAll("tbody tr[data-platz]")].find(
          (tr) =>
            tr.getAttribute("data-platz") === String(platz) &&
            (!bezirkFilter ||
              tr.getAttribute("data-bezirk") === bezirkFilter ||
              String(tr.getAttribute("data-bezirk") || "").toLowerCase() ===
                String(bezirkFilter).toLowerCase())
        );
      }
      if (!highlight && ql) {
        highlight = tableWrap.querySelector("tbody tr.ce-row-hl");
      }
      if (highlight) {
        highlight.classList.add("ce-row-hl");
        highlight.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      applyWkrTitles();
    }

    function applyWkrTitles() {
      const map = wkrNamesByState[stateCode];
      if (!map) return;
      tableWrap.querySelectorAll("a.ce-wk-link").forEach((a) => {
        try {
          const u = new URL(a.getAttribute("href") || "", window.location.origin);
          const name = map[String(u.searchParams.get("wkr") || "")];
          if (name) a.title = `${name} — zur Karte`;
        } catch (_) {
          /* ignore */
        }
      });
    }

    function refresh() {
      const archiveNote = root.querySelector(".ce-archive-note");
      if (archiveNote) archiveNote.hidden = !archiveCodes.has(stateCode);
      paintTabs();
      paintPartyTabs();
      paintBezirkSelect();
      paintTable();
      syncUrl();
      ensureWkrNames(stateCode).then(applyWkrTitles);
    }

    tabs.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-state]");
      if (!btn) return;
      stateCode = btn.getAttribute("data-state");
      partyCode = null;
      bezirkFilter = "";
      refresh();
    });
    partyTabs.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-party]");
      if (!btn) return;
      partyCode = btn.getAttribute("data-party");
      bezirkFilter = "";
      paintPartyTabs();
      paintBezirkSelect();
      paintTable();
      syncUrl();
    });
    bezirkSel.addEventListener("change", () => {
      bezirkFilter = bezirkSel.value;
      paintTable();
      syncUrl();
    });
    search.addEventListener("input", () => {
      q = search.value;
      paintTable();
      syncUrl();
    });
    minInput.addEventListener("change", () => {
      minP = Number(minInput.value) || 0;
      paintTable();
      syncUrl();
    });
    hidePhBox.addEventListener("change", () => {
      hidePh = hidePhBox.checked;
      paintTable();
      syncUrl();
    });

    refresh();
  }

  window.candidateEntry = { mount, autoMount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }
})();
