import { useMemo, useState } from "react";
import DealCard from "./DealCard";
import { Eyebrow, EmptyState } from "../lib/ui";

export default function CombosSection({ data }) {
  const combos = data?.combos || [];
  const zips = data?.zips || [];
  const [zipFilter, setZipFilter] = useState("");
  const [latinoOnly, setLatinoOnly] = useState(false);

  const filtered = useMemo(() => {
    let rows = combos;
    if (zipFilter) rows = rows.filter((c) => (c.zips || []).includes(zipFilter));
    if (latinoOnly) rows = rows.filter((c) => c.is_latino);
    return rows;
  }, [combos, zipFilter, latinoOnly]);

  if (!combos.length) return null;

  return (
    <section className="mb-14">
      <Eyebrow>Weekend packs</Eyebrow>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        🎁 Combo &amp; weekend pack deals
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Bundle / multi-buy deals running near your ZIP codes — copy the ideas for Sat &amp; Sun
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-white/60">
          <span>Area</span>
          <select
            value={zipFilter}
            onChange={(e) => setZipFilter(e.target.value)}
            className="cursor-pointer rounded-full border border-white/15 bg-ink-2 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All areas</option>
            {zips.map((z) => {
              const n = combos.filter((c) => (c.zips || []).includes(z)).length;
              return (
                <option key={z} value={z}>
                  {z} ({n})
                </option>
              );
            })}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={latinoOnly}
            onChange={(e) => setLatinoOnly(e.target.checked)}
            className="rounded border-white/20"
          />
          Latino groceries only
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState>
            No combo deals match this filter. Try unchecking &quot;Latino groceries only&quot; or refresh deals.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((deal, i) => (
            <DealCard key={`${deal.merchant}-${deal.name}-${i}`} d={{ ...deal, catLabel: "combo" }} />
          ))}
        </div>
      )}
    </section>
  );
}
