/** Compact trade-area visual — radius rings + top ZIP bars (no external map API). */

function RadiusRing({ r, label, opacity }) {
  return (
    <circle
      cx="50"
      cy="50"
      r={r}
      fill="none"
      stroke="currentColor"
      strokeOpacity={opacity}
      strokeWidth="1.5"
      className="text-brand"
    />
  );
}

export default function TradeAreaCard({ tradeArea }) {
  const ta = tradeArea || {};
  const topZips = ta.top_zips || [];
  const maxCount = topZips[0]?.count || 1;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-ink-3/80 p-4">
        <div className="relative aspect-square w-full max-w-[180px] text-brand">
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
            <RadiusRing r={42} label="10mi" opacity={0.2} />
            <RadiusRing r={28} label="5mi" opacity={0.35} />
            <circle cx="50" cy="50" r="5" fill="currentColor" className="text-brand" />
            <circle cx="50" cy="50" r="2" fill="#080b0f" />
          </svg>
        </div>
        <p className="mt-3 text-center text-[11px] text-white/55">
          {ta.store_city || "Store"} · {ta.store_zip || "—"}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] text-white/45">
          <span>5 mi</span>
          <span>·</span>
          <span>10 mi</span>
        </div>
      </div>

      <div className="space-y-4">
        {(ta.within_5_mi_pct != null || ta.within_10_mi_pct != null) && (
          <div className="grid grid-cols-2 gap-3">
            {ta.within_5_mi_pct != null && (
              <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/55">Within 5 mi</div>
                <div className="font-display text-2xl font-bold text-leaf">{ta.within_5_mi_pct}%</div>
              </div>
            )}
            {ta.within_10_mi_pct != null && (
              <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/55">Within 10 mi</div>
                <div className="font-display text-2xl font-bold text-sky">{ta.within_10_mi_pct}%</div>
              </div>
            )}
          </div>
        )}

        {topZips.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white/80">Top ZIP codes</h4>
            <div className="space-y-2">
              {topZips.map((z) => (
                <div key={z.zip}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium tabular-nums text-white/85">{z.zip}</span>
                    <span className="text-white/55">
                      {z.count} · {z.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-brand/80"
                      style={{ width: `${Math.max(8, (z.count / maxCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
