/**
 * Single-candidate profile page.
 * Load via ?id=<person_id> or state/party/name[/wkr] query params.
 */
(function () {
  const GENDER_LABEL = {
    m: "männlich",
    f: "weiblich",
    unknown: "unklar",
  };

  const PARTY_COLORS = {
    CDU: "#000000",
    CSU: "#000000",
    "CDU/CSU": "#000000",
    SPD: "#E3000F",
    GRÜNE: "#46962b",
    GRUENE: "#46962b",
    AfD: "#009EE0",
    FDP: "#FFED00",
    LINKE: "#BE3075",
    BSW: "#7B2266",
    FW: "#FF8000",
    SSW: "#003C8F",
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function siteBase() {
    return ((window.pipelineData && window.pipelineData.SITE_BASE) || "/").replace(
      /\/?$/,
      "/"
    );
  }

  function queryParams() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function httpSource(url) {
    const s = String(url || "").trim();
    return /^https?:\/\//i.test(s) ? s : "";
  }

  function pct(v) {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${Math.round(n)}\u00a0%`;
  }

  function pctNum(v) {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  /**
   * Plain-language German explanation of P(Einzug)/P(Direkt)/P(Liste).
   * p_list is mutually exclusive with p_direct (Direkt winners are skipped on the list),
   * so Einzug ≈ Direkt + Liste.
   */
  function probabilityNarrative(c) {
    const hasList = c.list_pos != null;
    const hasDirect = c.wkr_direct != null && c.wkr_direct !== "";
    const pD = pctNum(c.p_direct) ?? 0;
    const pL = hasList ? pctNum(c.p_list) ?? 0 : null;
    const pE = pctNum(hasList ? c.p_entry : c.p_direct) ?? pD;
    const paras = [];

    paras.push(
      `Insgesamt schätzen wir die Chance auf einen Parlamentssitz auf <strong>${escapeHtml(pct(pE))}</strong> — also in etwa ${escapeHtml(String(pE))} von 100 Simulationen.`
    );

    if (!hasList && hasDirect) {
      paras.push(
        `Für diese Person ist <strong>kein Listenplatz</strong> bekannt. Der Einzug kann deshalb nur über das Direktmandat laufen: P(Einzug) = P(Direkt) = <strong>${escapeHtml(pct(pD))}</strong>. Über die Liste besteht praktisch keine Chance (bzw. wir können sie nicht ausweisen).`
      );
    } else if (hasList && !hasDirect) {
      paras.push(
        `Es ist kein Direktwahlkreis hinterlegt — der Einzug läuft nur über die Liste (Platz ${escapeHtml(String(c.list_pos))}): P(Einzug) = P(Liste) = <strong>${escapeHtml(pct(pL))}</strong>.`
      );
    } else if (hasList && hasDirect) {
      paras.push(
        `Die Person kandidiert <strong>doppelt</strong> (Wahlkreis ${escapeHtml(String(c.wkr_direct))} und Listenplatz ${escapeHtml(String(c.list_pos))}). P(Direkt) = <strong>${escapeHtml(pct(pD))}</strong> und P(Liste) = <strong>${escapeHtml(pct(pL))}</strong> addieren sich zur Einzugschance (P(Einzug) ≈ P(Direkt) + P(Liste)), weil Direktmandat und Listenmandat sich gegenseitig ausschließen: Wer den Wahlkreis gewinnt, wird auf der Liste übersprungen.`
      );

      if (pL === 0 && pD > 0) {
        paras.push(
          `Die Listen-Chance liegt bei praktisch <strong>0&nbsp;%</strong>: Der Einzug kommt in unseren Simulationen (nahezu) nur über den Wahlkreis zustande.`
        );
      } else if (pD === 0 && pL > 0) {
        paras.push(
          `Ein Direktmandat ist in unseren Simulationen praktisch ausgeschlossen; der Einzug käme (nahezu) nur über die Liste.`
        );
      } else if (pD > 0 && pL > 0) {
        paras.push(
          `Je höher die Siegchance im Wahlkreis, desto seltener „braucht“ die Person die Liste — und desto öfter rücken darunterliegende Listenplätze nach. P(Liste) ist deshalb die Chance, <em>tatsächlich über die Liste einzuziehen</em>, nicht die Chance „hätte die Liste allein gereicht“.`
        );
      }

      if (pD < 100 && pL === 0 && hasList) {
        paras.push(
          `Auch wenn der Wahlkreis verloren geht, reicht der Listenplatz in unseren Simulationen praktisch nie für einen Sitz — die bedingte Listen-Chance ohne Direktmandat liegt nahe 0&nbsp;%.`
        );
      }
    } else {
      paras.push(
        `Weder Listenplatz noch Direktwahlkreis sind hinterlegt; die ausgewiesenen Werte sind deshalb nur eingeschränkt interpretierbar.`
      );
    }

    const nsim = c._nsim;
    paras.push(
      nsim
        ? `Grundlage sind ${escapeHtml(String(nsim))} Simulationen — dieselben Zweitstimmen-Züge wie die Landes- und Wahlkreis-Vorhersage.`
        : `Grundlage sind dieselben Zweitstimmen-Züge wie die Landes- und Wahlkreis-Vorhersage.`
    );

    return paras.map((p) => `<p class="cp-explain">${p}</p>`).join("");
  }

  function formatSource(source) {
    const s = String(source || "").trim();
    if (!s) return "";
    const http = httpSource(s);
    if (http) {
      return `<a href="${escapeHtml(http)}" target="_blank" rel="noopener noreferrer">${escapeHtml(http)}</a>`;
    }
    return `<span class="cp-source-path">${escapeHtml(s)}</span>`;
  }

  function partyColor(party, partei) {
    const keys = [party, partei].map((x) => String(x || "").trim()).filter(Boolean);
    for (const k of keys) {
      if (PARTY_COLORS[k]) return PARTY_COLORS[k];
      const up = k.toUpperCase();
      if (PARTY_COLORS[up]) return PARTY_COLORS[up];
    }
    return "#555";
  }

  function findCandidate(payload, params) {
    const id = String(params.get("id") || "").trim();
    const stateQ = String(params.get("state") || "").trim().toUpperCase();
    const partyQ = String(params.get("party") || "").trim().toLowerCase();
    const nameQ = String(params.get("name") || params.get("q") || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const wkrQ = params.get("wkr");
    const wkrNum = wkrQ != null && wkrQ !== "" ? Number(wkrQ) : null;

    const states = (payload && payload.states) || {};
    const hits = [];

    Object.keys(states).forEach((stateCode) => {
      const st = states[stateCode];
      if (!st || !Array.isArray(st.parties)) return;
      if (stateQ && stateCode !== stateQ) return;
      st.parties.forEach((party) => {
        const pCode = String(party.party || "").toLowerCase();
        if (partyQ && pCode !== partyQ) return;
        (party.candidates || []).forEach((c) => {
          if (!c) return;
          hits.push({
            stateCode,
            state: st,
            party,
            candidate: c,
          });
        });
      });
    });

    if (id) {
      const byId = hits.find((h) => h.candidate.person_id === id);
      if (byId) return byId;
    }

    let pool = hits;
    if (nameQ) {
      const named = pool.filter(
        (h) =>
          String(h.candidate.name || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim() === nameQ
      );
      if (named.length) pool = named;
    }
    if (Number.isFinite(wkrNum)) {
      const byWkr = pool.filter((h) => Number(h.candidate.wkr_direct) === wkrNum);
      if (byWkr.length) pool = byWkr;
    }
    // Prefer non-placeholder named matches
    const namedPrefer = pool.filter((h) => !h.candidate.is_placeholder);
    if (namedPrefer.length) pool = namedPrefer;
    return pool[0] || null;
  }

  function districtHref(hit) {
    const c = hit.candidate;
    if (c.wkr_direct == null || c.wkr_direct === "") return "";
    const u = new URLSearchParams();
    u.set("state", hit.stateCode);
    u.set("wkr", String(c.wkr_direct));
    return siteBase() + "direktmandate/?" + u.toString();
  }

  function listHref(hit) {
    const c = hit.candidate;
    if (c.list_pos == null) return "";
    const u = new URLSearchParams();
    u.set("state", hit.stateCode);
    if (hit.party.party) u.set("party", hit.party.party);
    if (c.list_type === "bezirk" && (c.bezirk || c.bezirk_name)) {
      u.set("bezirk", String(c.bezirk || c.bezirk_name));
    }
    if (c.name) u.set("q", c.name);
    u.set("platz", String(c.list_pos));
    return siteBase() + "einzug/?" + u.toString();
  }

  function linkedText(href, html, title) {
    if (!href) return html;
    const t = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(href)}"${t}>${html}</a>`;
  }

  function backLinks(hit, params) {
    const base = siteBase();
    const state = hit.stateCode;
    const c = hit.candidate;
    const from = String((params && params.get("from")) || "").toLowerCase();
    const links = [];
    const toDistrict = from === "direktmandate"
      || (!from && c.wkr_direct != null && c.wkr_direct !== "");
    if (toDistrict) {
      const u = new URLSearchParams();
      u.set("state", state);
      const wkrBack = (c.wkr_direct != null && c.wkr_direct !== "")
        ? c.wkr_direct
        : (params && params.get("wkr"));
      if (wkrBack != null && wkrBack !== "") {
        u.set("wkr", String(wkrBack));
      }
      links.push(
        `<a class="cp-back" href="${escapeHtml(base + "direktmandate/?" + u.toString())}">← Wahlkreise</a>`
      );
    } else {
      links.push(
        `<a class="cp-back" href="${escapeHtml(base + "einzug/?state=" + encodeURIComponent(state))}">← Alle Kandidierende</a>`
      );
    }
    const dHref = districtHref(hit);
    if (dHref) {
      links.push(
        `<a href="${escapeHtml(dHref)}">Direktmandat WK ${escapeHtml(String(c.wkr_direct))}</a>`
      );
    }
    const lHref = listHref(hit);
    if (lHref) {
      links.push(`<a href="${escapeHtml(lHref)}">Listenplatz in der Tabelle</a>`);
    }
    return links;
  }

  function render(root, hit) {
    const c = hit.candidate;
    const party = hit.party;
    const st = hit.state;
    const color = partyColor(party.party, party.partei);
    const nameClass = c.is_placeholder ? "cp-name cp-ph" : "cp-name";
    const displayName = c.is_placeholder
      ? c.name || "Name noch nicht bekannt"
      : c.name || "unbekannt";

    let badge = "";
    if (c.is_incumbent) {
      const chamber = c.incumbent_chamber || (hit.stateCode === "BE" ? "MdA" : "MdL");
      const title =
        chamber === "MdA"
          ? "Amtsinhaber:in im Abgeordnetenhaus"
          : "Amtsinhaber:in im Landtag";
      const href = httpSource(c.incumbent_url) || httpSource(c.aw_url);
      badge = href
        ? `<a class="cp-badge" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)} (abgeordnetenwatch)">${escapeHtml(chamber)}</a>`
        : `<span class="cp-badge" title="${escapeHtml(title)}">${escapeHtml(chamber)}</span>`;
    }
    const awHref = httpSource(c.aw_url);
    if (awHref) {
      badge += `<a class="cp-aw" href="${escapeHtml(awHref)}" target="_blank" rel="noopener noreferrer" title="Profil bei abgeordnetenwatch">abgeordnetenwatch</a>`;
    }

    const metaRows = [];
    metaRows.push(["Land", st.label || hit.stateCode]);
    if (st.chamber) metaRows.push(["Kammer", st.chamber]);
    metaRows.push([
      "Partei",
      `<span style="font-weight:650;color:${escapeHtml(color)}">${escapeHtml(party.partei || party.party)}</span>`,
    ]);

    if (c.list_pos != null) {
      const listBits = [`Platz ${c.list_pos}`];
      if (c.list_type === "bezirk") {
        listBits.push(
          `Bezirksliste${c.bezirk_name ? ` ${c.bezirk_name}` : c.bezirk ? ` ${c.bezirk}` : ""}`
        );
      } else if (c.list_type === "landes") {
        listBits.push("Landesliste");
      }
      metaRows.push([
        "Liste",
        linkedText(
          listHref(hit),
          escapeHtml(listBits.join(" · ")),
          "Zur Einzugsübersicht"
        ),
      ]);
    } else {
      metaRows.push(["Liste", "kein Listenplatz bekannt"]);
    }

    if (c.wkr_direct != null && c.wkr_direct !== "") {
      metaRows.push([
        "Direktwahlkreis",
        linkedText(
          districtHref(hit),
          `WK ${escapeHtml(String(c.wkr_direct))}`,
          "Zur Wahlkreiskarte"
        ),
      ]);
    }

    if (c.birth_year || c.birth_place) {
      let born = "";
      if (c.birth_year) {
        born = String(c.birth_year);
        if (c.birth_place) born += ` in ${c.birth_place}`;
      } else {
        born = c.birth_place;
      }
      metaRows.push(["Geboren", escapeHtml(born)]);
    }
    if (c.residence) metaRows.push(["Wohnort", escapeHtml(c.residence)]);
    if (c.profession) metaRows.push(["Beruf", escapeHtml(c.profession)]);

    if (c.gender && !c.is_placeholder) {
      const g = GENDER_LABEL[c.gender] || c.gender;
      const conf = c.gender_confidence
        ? ` (Schätzung, Konfidenz: ${c.gender_confidence})`
        : " (Schätzung anhand des Vornamens)";
      metaRows.push(["Geschlecht", escapeHtml(g + conf)]);
    }

    if (c.is_incumbent) {
      const bits = [];
      if (c.incumbent_mandate) bits.push(`Mandat: ${c.incumbent_mandate}`);
      if (c.incumbent_match) bits.push(`Match: ${c.incumbent_match}`);
      if (bits.length) metaRows.push(["Amtsinhaber:in", escapeHtml(bits.join(" · "))]);
    }

    const hasList = c.list_pos != null;
    const pEntry = hasList ? c.p_entry : c.p_direct;
    const narr = probabilityNarrative({ ...c, _nsim: st.nsim });
    const probs = `
      <div class="cp-probs">
        <div class="cp-prob">
          <div class="cp-prob-label">P(Einzug)</div>
          <div class="cp-prob-value">${escapeHtml(pct(pEntry))}</div>
        </div>
        <div class="cp-prob">
          <div class="cp-prob-label">P(Direkt)</div>
          <div class="cp-prob-value">${escapeHtml(pct(c.p_direct))}</div>
        </div>
        <div class="cp-prob">
          <div class="cp-prob-label">P(Liste)</div>
          <div class="cp-prob-value">${escapeHtml(hasList ? pct(c.p_list) : "—")}</div>
        </div>
      </div>
      <div class="cp-explain-block">
        <h3 class="cp-explain-heading">Was bedeuten diese Zahlen?</h3>
        ${narr}
      </div>
    `;

    const sourceHtml = formatSource(c.source);
    const awBlock = awHref
      ? `<div class="cp-card cp-source">
          <h2 class="cp-section-title">abgeordnetenwatch</h2>
          <div><a href="${escapeHtml(awHref)}" target="_blank" rel="noopener noreferrer">Profil ansehen</a></div>
          <p class="cp-note">Wahlkreisprofil und Positionen von abgeordnetenwatch (nicht von Zweitstimme betrieben).</p>
        </div>`
      : "";
    const sourceBlock = sourceHtml
      ? `<div class="cp-card cp-source">
          <h2 class="cp-section-title">Quelle</h2>
          <div>${sourceHtml}</div>
          <p class="cp-note">Name und Biografie-Angaben stammen aus dieser Quelle (Partei, Landeswahlleitung oder Medien). Prognosewerte sind Modellausgaben von Zweitstimme.</p>
        </div>`
      : `<div class="cp-card cp-source">
          <h2 class="cp-section-title">Quelle</h2>
          <p class="cp-note">Keine öffentliche URL hinterlegt (lokale Rohdatei / noch ohne Link).</p>
        </div>`;

    const links = backLinks(hit, queryParams());
    const titleEl = document.getElementById("cp-title");
    if (titleEl) titleEl.textContent = displayName;
    const descEl = document.getElementById("cp-description");
    if (descEl) {
      descEl.textContent = `${party.partei || party.party} · ${st.label || hit.stateCode}`;
    }
    try {
      document.title = `${displayName} — zweitstimme.org`;
    } catch (_) { /* ignore */ }

    root.innerHTML = `
      ${links[0] || ""}
      <div class="cp-card">
        <div class="cp-name-row">
          <h2 class="${nameClass}">${escapeHtml(displayName)}</h2>
          <span class="cp-party" style="color:${escapeHtml(color)}">${escapeHtml(party.partei || party.party)}</span>
          ${badge}
        </div>
        <dl class="cp-meta">
          ${metaRows
            .map(
              ([k, v]) =>
                `<div class="cp-meta-item"><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`
            )
            .join("")}
        </dl>
      </div>
      <div class="cp-card">
        <h2 class="cp-section-title">Einzugschancen</h2>
        ${probs}
        <div class="zs-wm-strip" aria-hidden="true"></div>
      </div>
      ${awBlock}
      ${sourceBlock}
      <div class="cp-links">
        ${links.slice(1).join("")}
      </div>
      ${
        c.person_id
          ? `<p class="cp-note" style="margin-top:1.25rem;">Interne ID: <code>${escapeHtml(c.person_id)}</code></p>`
          : ""
      }
    `;
  }

  function mount(root) {
    if (!root) return;
    if (!window.pipelineData || !window.pipelineData.loadCandidateEntry) {
      root.innerHTML =
        `<p class="cp-error">pipelineData nicht geladen — Seite neu laden.</p>`;
      return;
    }
    const params = queryParams();
    if (
      !params.get("id") &&
      !params.get("name") &&
      !params.get("q") &&
      !(params.get("state") && params.get("wkr") && params.get("party"))
    ) {
      root.innerHTML = `<p class="cp-error">Kein Kandidat angegeben. Bitte über <a href="${escapeHtml(siteBase() + "einzug/")}">Alle Kandidierende</a> oder die <a href="${escapeHtml(siteBase() + "direktmandate/")}">Wahlkreise</a> öffnen.</p>`;
      return;
    }

    root.innerHTML = `<p class="cp-loading">Lade Kandidat:innenprofil…</p>`;
    window.pipelineData
      .loadCandidateEntry()
      .then((data) => {
        const hit = findCandidate(data, params);
        if (!hit) {
          root.innerHTML = `<p class="cp-error">Kandidat:in nicht gefunden. <a href="${escapeHtml(siteBase() + "einzug/")}">Zur Einzugsübersicht</a></p>`;
          return;
        }
        render(root, hit);
      })
      .catch((err) => {
        root.innerHTML = `<p class="cp-error">Daten nicht verfügbar (${escapeHtml(err.message)}).</p>`;
      });
  }

  function autoMount() {
    const root = document.getElementById("candidate-profile-root");
    if (!root || root.dataset.cpMounted === "1") return;
    if (!window.pipelineData) {
      let n = 0;
      const t = window.setInterval(() => {
        n += 1;
        if (window.pipelineData) {
          window.clearInterval(t);
          root.dataset.cpMounted = "1";
          mount(root);
        } else if (n > 40) {
          window.clearInterval(t);
          root.innerHTML =
            `<p class="cp-error">pipelineData nicht geladen — Seite neu laden.</p>`;
        }
      }, 50);
      return;
    }
    root.dataset.cpMounted = "1";
    mount(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }
})();
