import { useMemo, useState } from "react";
import DealCard from "./DealCard";
import { EmptyState } from "../lib/ui";
import { PageHeader } from "../lib/sectionUi";

const COMBO_GRID =
  "grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]";

export default function CombosSection({ data, embedded = false }) {
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

  return (
    <section className={embedded ? "" : "mb-14"}>
      {!embedded && (
        <PageHeader
          eyebrow="Weekend packs"
          title="Combo & weekend pack deals"
          description="Bundle / multi-buy deals running near your ZIP codes — copy the ideas for Sat & Sun."
        />
      )}

      {embedded && (
        <p className="mb-6 text-sm text-white/55">
          Multi-buy and bundle promos near your markets — inspiration for Sat &amp; Sun flyers.
        </p>
      )}

      {!combos.length ? (
        <EmptyState>
          No weekend pack deals near your markets this week. Check back after the next ad refresh.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/60">
              <span>Area</span>
              <select
                value={zipFilter}
                onChange={(e) => setZipFilter(e.target.value)}
                className="toolbar-control cursor-pointer text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
            <EmptyState>
              No combo deals match this filter. Try unchecking &quot;Latino groceries only&quot; or
              refresh deals.
            </EmptyState>
          ) : (
            <div className={COMBO_GRID}>
              {filtered.map((deal, i) => (
                <div key={`${deal.merchant}-${deal.name}-${i}`} className={filtered.length <= 3 ? "max-w-xs" : ""}>
                  <DealCard d={{ ...deal, catLabel: "combo" }} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
