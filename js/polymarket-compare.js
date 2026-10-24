/**
 * Preview: compare zweitstimme scenario probabilities with Polymarket Yes prices.
 */
(function () {
  const PARTY_COLOR = {
    afd: "#009EE0",
    cdu: "#000000",
    spd: "#E3000F",
    gru: "#46962B",
    lin: "#BE3075",
    fdp: "#FFED00",
    bsw: "#7878C8",
    fw: "#F78400",
    oth: "#888888",
  };

  const SORTS = [
    { id: "market", label: "Markt" },
    { id: "zs", label: "ZS" },
    { id: "naive", label: "Naiv" },
    { id: "pm", label: "PM" },
    { id: "abs", label: "|Δ|" },
    { id: "delta", label: "Δ" },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtPct(v) {
    if (v == null || !Number.isFinite(Number(v))) return "–";
    const n = Number(v);
    if (n > 0 && n < 0.5) return "<1";
    return String(Math.round(n));
  }

  function fmtDate(raw) {
    const m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return raw || "";
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function fmtVol(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " Mio. $";
    if (n >= 1000) return Math.round(n / 1000) + " Tsd. $";
    return Math.round(n) + " $";
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function bar(pct, party, dim) {
    const w = Math.max(0, Math.min(100, Number(pct) || 0));
    const color = PARTY_COLOR[party] || "#666";
    const border = party === "fdp" ? "box-shadow:inset 0 0 0 1px #ccc;" : "";
    const op = dim ? "opacity:0.4;" : "";
    return `<div class="pm-bar-track"><div class="pm-bar-fill" style="width:${w}%;background:${color};${border}${op}"></div></div>`;
  }

  function deltaCell(d) {
    if (d == null || !Number.isFinite(Number(d))) return `<span class="pm-delta">–</span>`;
    const n = Number(d);
    const cls = n > 0.5 ? "is-pos" : n < -0.5 ? "is-neg" : "";
    const txt = (n > 0 ? "+" : "") + n.toFixed(0).replace("-", "−");
    return `<span class="pm-delta ${cls}">${txt}</span>`;
  }

  function visibleRows(group) {
    const rows = group.rows || [];
    if (String(group.id || "").startsWith("seats_")) return rows;
    return rows.filter((r) => Math.max(Number(r.zs) || 0, Number(r.pm) || 0) >= 1);
  }

  function sortKey(row, mode) {
    if (mode === "zs") return num(row.zs);
    if (mode === "naive") return num(row.zs_naive);
    if (mode === "pm") return num(row.pm);
    if (mode === "abs") {
      const d = num(row.delta);
      return d == null ? null : Math.abs(d);
    }
    if (mode === "delta") return num(row.delta);
    return null;
  }

  function sortRows(rows, mode, dir) {
    if (mode === "market") return rows.slice();
    const mul = dir === "asc" ? 1 : -1;
    return rows
      .slice()
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const av = sortKey(a.r, mode);
        const bv = sortKey(b.r, mode);
        if (av == null && bv == null) return a.i - b.i;
        if (av == null) return 1;
        if (bv == null) return -1;
        const d = (av - bv) * mul;
        if (d !== 0) return d;
        return a.i - b.i;
      })
      .map((x) => x.r);
  }

  function renderRow(r, group, ctx) {
    const href = r.url || group.polymarket_url;
    const label = href
      ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(r.label_de)}</a>`
      : escapeHtml(r.label_de);
    const voteNote =
      r.zs_vote != null &&
      r.zs != null &&
      Math.abs(Number(r.zs_vote) - Number(r.zs)) >= 1
        ? `<div class="pm-vote">Stimmen ${fmtPct(r.zs_vote)}%</div>`
        : "";
    const ctxHtml = ctx ? `<div class="pm-row-ctx">${escapeHtml(ctx)}</div>` : "";
    const bars = `${bar(r.zs, r.party)}${bar(r.zs_naive, r.party, true)}${bar(r.pm, r.party)}`;
    return `<div class="pm-row">
      <div class="pm-row-label">
        ${ctxHtml}${label}${voteNote}
        <div class="pm-bars" aria-hidden="true">${bars}</div>
      </div>
      <div class="pm-num">${fmtPct(r.zs)}%</div>
      <div class="pm-num">${fmtPct(r.zs_naive)}%</div>
      <div class="pm-num">${fmtPct(r.pm)}%</div>
      ${deltaCell(r.delta)}
    </div>`;
  }

  function legend(sort, dir) {
    const mark = (id, text) => {
      const on = sort === id ? " is-on" : "";
      const arrow = sort === id ? (dir === "asc" ? " ↑" : " ↓") : "";
      return `<button type="button" class="pm-col${on}" data-sort="${id}">${text}${arrow}</button>`;
    };
    return `<div class="pm-legend"><span></span>${mark("zs", "ZS")}${mark("naive", "Naiv")}${mark("pm", "PM")}${mark("abs", "Δ")}</div>`;
  }

  function isSeatGroup(group) {
    return String(group.id || "").startsWith("seats_");
  }

  function renderOverview(rows) {
    if (!rows || !rows.length) return "";
    const body = rows
      .map((r) => {
        const color = PARTY_COLOR[r.party] || "#666";
        const tag = r.has_pm ? `<span class="pm-pm-tag">PM-Markt</span>` : "";
        return `<tr>
          <td><span class="pm-dot" style="background:${color}"></span>${escapeHtml(r.label_de)}${tag}</td>
          <td>${r.last_seats ?? "–"}</td>
          <td>${r.median_naive ?? "–"}</td>
          <td>${r.median ?? "–"}</td>
          <td>${r.p10 ?? "–"}–${r.p90 ?? "–"}</td>
          <td>${fmtPct(r.p_most_pct)}%</td>
        </tr>`;
      })
      .join("");
    return `<section class="pm-group">
      <h3>Sitze im Modell</h3>
      <p class="pm-group-sub">Letzte Wahl, naives Modell (letzte Größe × Stimmenanteil, 5%-Hürde) und Wahlkreis-Simulation. PM-Markt = Polymarket hat Sitzklassen.</p>
      <table class="pm-ov">
        <thead><tr><th>Partei</th><th>Letzt</th><th>Naiv</th><th>ZS</th><th>P10–P90</th><th>P(meiste)</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
  }

  function renderGroup(group, sort, dir) {
    const rows = sortRows(visibleRows(group), sort, dir);
    if (!rows.length) return "";
    const vol = fmtVol(group.polymarket_volume);
    const link = group.polymarket_url
      ? `<a href="${escapeHtml(group.polymarket_url)}" rel="noopener noreferrer">Polymarket</a>`
      : "Polymarket";
    const sub = [group.note_de, vol ? `Volumen ${vol}` : "", link].filter(Boolean).join(" · ");
    return `<section class="pm-group">
      <h3>${escapeHtml(group.label_de)}</h3>
      <p class="pm-group-sub">${sub}</p>
      ${legend(sort, dir)}
      ${rows.map((r) => renderRow(r, group)).join("")}
    </section>`;
  }

  function collectStateItems(st) {
    const items = [];
    for (const group of st.groups || []) {
      for (const row of visibleRows(group)) {
        items.push({
          row,
          group,
          ctx: `${st.label} · ${group.label_de}`,
        });
      }
    }
    return items;
  }

  function renderFlat(items, sort, dir, headHtml) {
    const ranked = sortRows(
      items.map((x) => Object.assign({ _ctx: x.ctx, _group: x.group }, x.row)),
      sort,
      dir
    );
    if (!ranked.length) return headHtml + "<p class='pm-err'>Keine Märkte.</p>";
    const body = ranked
      .map((r) => renderRow(r, r._group, r._ctx))
      .join("");
    return `${headHtml}<section class="pm-group">${legend(sort, dir)}${body}</section>`;
  }

  function renderState(payload, code, sort, dir) {
    const st = payload.states[code];
    if (!st) return "<p class='pm-err'>Kein Land.</p>";
    const zs = st.zs || {};
    const seatBit = zs.seats ? " · Sitze aus Wahlkreis-Simulation" : "";
    const head = `<p class="pm-meta">${escapeHtml(st.label)} · Wahl ${fmtDate(st.election_date)} · Stand Modell ${fmtDate(zs.asof_date)} · ${zs.seat_nsim || zs.n_draws || 4000} Draws${seatBit}</p>`;
    const seatGs = (st.groups || []).filter(isSeatGroup);
    const otherGs = (st.groups || []).filter((g) => !isSeatGroup(g));
    if (sort === "market") {
      return (
        head +
        renderOverview(st.seat_overview) +
        (seatGs.length ? `<h2 class="pm-h2">Sitzzahlen</h2>` : "") +
        seatGs.map((g) => renderGroup(g, sort, dir)).join("") +
        (otherGs.length ? `<h2 class="pm-h2">Platzierungen</h2>` : "") +
        otherGs.map((g) => renderGroup(g, sort, dir)).join("")
      );
    }
    return renderFlat(collectStateItems(st), sort, dir, head + renderOverview(st.seat_overview));
  }

  function renderAll(payload, sort, dir) {
    const items = [];
    for (const code of ["ST", "BE", "MV"]) {
      const st = payload.states[code];
      if (st) items.push(...collectStateItems(st));
    }
    if (payload.cross) {
      for (const row of visibleRows(payload.cross)) {
        items.push({
          row,
          group: payload.cross,
          ctx: payload.cross.label_de,
        });
      }
    }
    const head = `<p class="pm-meta">Alle drei Landtagswahlen plus übergreifender AfD-Markt.</p>`;
    if (sort === "market") {
      return (
        head +
        ["ST", "BE", "MV"]
          .map((code) => renderState(payload, code, "market", dir))
          .join("") +
        (payload.cross ? renderGroup(payload.cross, "market", dir) : "")
      );
    }
    return renderFlat(items, sort, dir, head);
  }

  function renderCross(payload, sort, dir) {
    const cross = payload.cross;
    if (!cross) return "<p class='pm-err'>Kein übergreifender Markt.</p>";
    const inp = cross.inputs || {};
    const extra = `<p class="pm-meta">Unabhängige Kombination: AfD stärkste Kraft ST ${fmtPct(inp.ST)} % · BE ${fmtPct(inp.BE)} % · MV ${fmtPct(inp.MV)} %.</p>`;
    return extra + renderGroup(cross, sort, dir);
  }

  function mount(payload) {
    const tabs = $("pm-tabs");
    const sortsEl = $("pm-sorts");
    const body = $("pm-body");
    const meta = $("pm-meta");
    const notes = $("pm-notes");
    const order = ["ST", "BE", "MV", "CROSS", "ALL"];
    const labels = {
      ST: "Sachsen-Anhalt",
      BE: "Berlin",
      MV: "Mecklenburg-Vorpommern",
      CROSS: "Drei Länder",
      ALL: "Alle",
    };
    let current = "ST";
    let sort = "market";
    let dir = "desc";
    meta.textContent =
      "Snapshot " +
      fmtDate(payload.generated_at) +
      " · obere Leiste Zweitstimme, untere Polymarket · Δ = ZS − PM, Prozentpunkte";

    function paint() {
      tabs.querySelectorAll(".pm-tab").forEach((btn) => {
        btn.classList.toggle("is-on", btn.dataset.key === current);
      });
      if (sortsEl) {
        sortsEl.querySelectorAll("[data-sort]").forEach((btn) => {
          const on = btn.dataset.sort === sort;
          btn.classList.toggle("is-on", on);
          const base = SORTS.find((s) => s.id === btn.dataset.sort);
          if (!base) return;
          const arrow = on && sort !== "market" ? (dir === "asc" ? " ↑" : " ↓") : "";
          btn.textContent = base.label + arrow;
        });
      }
      if (current === "CROSS") body.innerHTML = renderCross(payload, sort, dir);
      else if (current === "ALL") body.innerHTML = renderAll(payload, sort, dir);
      else body.innerHTML = renderState(payload, current, sort, dir);
    }

    function setSort(next) {
      if (next === "market") {
        sort = "market";
        dir = "desc";
      } else if (sort === next) {
        dir = dir === "desc" ? "asc" : "desc";
      } else {
        sort = next;
        dir = "desc";
      }
      paint();
    }

    tabs.innerHTML = order
      .map(
        (k) =>
          `<button type="button" class="pm-tab" role="tab" data-key="${k}">${escapeHtml(labels[k])}</button>`
      )
      .join("");
    tabs.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".pm-tab");
      if (!btn) return;
      current = btn.dataset.key;
      paint();
    });

    if (sortsEl) {
      sortsEl.innerHTML =
        `<span class="pm-sort-label">Sortierung</span>` +
        SORTS.map(
          (s) =>
            `<button type="button" class="pm-tab" data-sort="${s.id}">${escapeHtml(s.label)}</button>`
        ).join("");
      sortsEl.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-sort]");
        if (!btn) return;
        setSort(btn.dataset.sort);
      });
    }

    body.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".pm-col[data-sort]");
      if (!btn) return;
      setSort(btn.dataset.sort);
    });

    notes.hidden = false;
    notes.innerHTML =
      "<strong>Hinweise</strong><ul>" +
      (payload.notes_de || []).map((n) => `<li>${escapeHtml(n)}</li>`).join("") +
      "<li>Sortierung: Markt belässt die Originalreihenfolge. ZS / PM / Δ sortiert alle sichtbaren Zeilen; |Δ| nach Abstand, Δ nach Vorzeichen (ZS − PM). Nochmal klicken dreht die Richtung.</li>" +
      "</ul>";
    paint();
  }

  async function start() {
    const root = $("pm-root");
    const meta = $("pm-meta");
    if (!root) return;
    const url = root.getAttribute("data-json");
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const payload = await res.json();
      mount(payload);
    } catch (err) {
      if (meta) meta.innerHTML = `<span class="pm-err">Vergleichsdaten nicht geladen (${escapeHtml(err.message)}).</span>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
