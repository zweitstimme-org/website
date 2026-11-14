/**
 * Minimal 1D Kalman filter + RTS smoother for latent vote support.
 *
 * Model (random walk):
 *   x_t = x_{t-1} + w_t,   w_t ~ N(0, q)
 *   y_t = x_t     + v_t,   v_t ~ N(0, r)
 *
 * Missing observations are handled by prediction-only steps.
 *
 * Exposes: window.kalmanLatentSupport
 */
(function () {
  function isFiniteNumber(x) {
    return typeof x === 'number' && Number.isFinite(x);
  }

  /**
   * Run filter + RTS smoother on a daily grid.
   *
   * @param {Array<number|null>} y  observations (same length as dates), null = missing
   * @param {object} opts
   * @param {number} opts.q process noise variance
   * @param {number} opts.r observation noise variance
   * @param {number|null} opts.x0 initial mean (if null, first observed value)
   * @param {number} opts.p0 initial variance
   * @returns {{ filtered: number[], smoothed: number[] }}
   */
  function smooth1D(y, { q = 0.1, r = 1.0, x0 = null, p0 = 1.0 } = {}) {
    const n = y.length;
    const xf = new Array(n);
    const pf = new Array(n);
    const xp = new Array(n);
    const pp = new Array(n);

    // init
    let init = x0;
    if (!isFiniteNumber(init)) {
      for (let i = 0; i < n; i++) {
        if (isFiniteNumber(y[i])) {
          init = y[i];
          break;
        }
      }
    }
    if (!isFiniteNumber(init)) {
      // no data at all
      return { filtered: new Array(n).fill(NaN), smoothed: new Array(n).fill(NaN) };
    }

    let x = init;
    let p = p0;

    for (let t = 0; t < n; t++) {
      // predict
      const xPred = x;
      const pPred = p + q;
      xp[t] = xPred;
      pp[t] = pPred;

      // update if observed
      const yt = y[t];
      if (isFiniteNumber(yt)) {
        const s = pPred + r;
        const k = pPred / s;
        x = xPred + k * (yt - xPred);
        p = (1 - k) * pPred;
      } else {
        x = xPred;
        p = pPred;
      }

      xf[t] = x;
      pf[t] = p;
    }

    // RTS smoother
    const xs = new Array(n);
    const ps = new Array(n);
    xs[n - 1] = xf[n - 1];
    ps[n - 1] = pf[n - 1];

    for (let t = n - 2; t >= 0; t--) {
      const pPredNext = pp[t + 1];
      const c = pPredNext > 0 ? (pf[t] / pPredNext) : 0;
      xs[t] = xf[t] + c * (xs[t + 1] - xp[t + 1]);
      ps[t] = pf[t] + c * c * (ps[t + 1] - pPredNext);
    }

    return { filtered: xf, smoothed: xs };
  }

  function toISODate(d) {
    return d.toISOString().slice(0, 10);
  }

  function buildDailyGrid({ startISO, endISO }) {
    const start = new Date(startISO + 'T00:00:00Z');
    const end = new Date(endISO + 'T00:00:00Z');
    const dates = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(toISODate(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  }

  /**
   * Compute latent support series (per party) on daily grid from polls.
   *
   * @param {Array<object>} polls pollingapi-v2 poll items (must include results[])
   * @param {object} opts
   * @param {string} opts.startISO inclusive
   * @param {string} opts.endISO inclusive
   * @param {Array<string>} opts.parties list of parties to output
   * @param {number} opts.q
   * @param {number} opts.r
   * @returns {{ dates: string[], series: Record<string, Array<number|null>>, current: Record<string, number|null> }}
   */
  function latentSupportFromPolls(polls, { startISO, endISO, parties, q = 0.1, r = 1.0 } = {}) {
    const dates = buildDailyGrid({ startISO, endISO });
    const byDate = new Map();
    for (const d of dates) byDate.set(d, []);

    // group polls by publish_date
    for (const poll of (Array.isArray(polls) ? polls : [])) {
      if (!poll || !poll.publish_date) continue;
      const d = poll.publish_date;
      if (!byDate.has(d)) continue;
      byDate.get(d).push(poll);
    }

    const series = {};
    const current = {};
    const pMap = window.pollsMapperAggregator;

    for (const party of parties) {
      // Build observation per day:
      // if multiple polls on same day -> simple mean (could be weighted; keep it deterministic/simple)
      const y = dates.map(d => {
        const dayPolls = byDate.get(d) || [];
        if (!dayPolls.length) return null;
        const vals = [];
        for (const poll of dayPolls) {
          const mapped = pMap ? pMap.consolidatePartyMap(pMap.resultsArrayToPartyMap(poll.results)) : {};
          const v = mapped[party];
          if (isFiniteNumber(v)) vals.push(v);
        }
        if (!vals.length) return null;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return avg;
      });

      // Use the forward-only Kalman *filter* (not the RTS smoother).
      // The RTS smoother uses future observations and therefore "connects"
      // latent values across gaps where we should only be able to predict
      // based on data available up to that date.
      const { filtered } = smooth1D(y, { q, r });
      series[party] = filtered.map(v => (isFiniteNumber(v) ? Math.round(v * 10) / 10 : null));
      const last = series[party][series[party].length - 1];
      current[party] = last === null ? null : last;
    }

    return { dates, series, current };
  }

  window.kalmanLatentSupport = {
    smooth1D,
    latentSupportFromPolls,
  };
})();

