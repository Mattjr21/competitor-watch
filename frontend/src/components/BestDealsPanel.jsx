import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Beef, LayoutGrid, TrendingDown } from "lucide-react";
import DealCard from "./DealCard";
import { getCategoryMeta } from "../lib/categories";
import { computeCategoryWinners, formatDealPrice, MEAT_TYPES } from "../lib/dealWinners";
import { EmptyState, EASE } from "../lib/ui";
import { BTN_GHOST, PANEL, PANEL_MUTED, SECTION_LEDE, SectionHeader, TABLE_HEAD } from "../lib/sectionUi";

const FRESH_CUT_TITLE =
  "Fresh counter cuts only — breaded items, sausages, and frozen patties are excluded from meat winners.";

function SpreadBadge({ spread, storeCount }) {
  if (storeCount < 2 || spread <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
      <TrendingDown size={11} aria-hidden />
      ${spread.toFixed(2).replace(/\.00$/, "")} spread
    </span>
  );
}

function FreshCutBadge() {
  return (
    <span
      title={FRESH_CUT_TITLE}
      className="inline-flex rounded-full border border-leaf/25 bg-leaf/10 px-2 py-0.5 text-[10px] font-semibold text-leaf"
    >
      Fresh cut
    </span>
  );
}

function ViewAtButton({ merchant, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        BTN_GHOST +
        " w-full justify-center px-3 py-2 text-xs sm:w-auto " +
        className
      }
    >
      View at {merchant}
      <ArrowRight size={13} aria-hidden />
    </button>
  );
}

function MarketContext({ row, className = "" }) {
  return (
    <div className={className}>
      {row.storeCount >= 2 ? (
        <span className="tabular-nums text-white/55">
          Med ${row.median} · high ${row.high}
          <span className="text-white/40"> · {row.adCount} ads</span>
        </span>
      ) : (
        <span className="text-white/45">
          {row.adCount} ad{row.adCount !== 1 ? "s" : ""}
        </span>
      )}
      {row.runnerUp && row.runnerUp.merchant !== row.winner.merchant && (
        <span className="mt-0.5 block text-xs text-white/40">
          Next: {formatDealPrice(row.runnerUp.price, row.runnerUp.unit)} at {row.runnerUp.merchant}
        </span>
      )}
    </div>
  );
}

function RankingHelp() {
  return (
    <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 open:bg-white/[0.05]">
      <summary className="cursor-pointer text-sm font-medium text-white/75 hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        How we rank deals
      </summary>
      <ul className={"mt-3 list-disc space-y-1.5 pl-5 " + SECTION_LEDE}>
        <li>Lowest priced ad per category across stores in your market ZIPs.</li>
        <li>Meat is split into chicken, pork, and beef — fresh counter cuts only.</li>
        <li>Products must match the category (tortillas, not frozen corn, etc.).</li>
        <li>Spread shows the gap between the lowest and highest priced ad in that group.</li>
      </ul>
    </details>
  );
}

function WinnerTableRow({ row, idx, reduceMotion, onViewDeal, RowWrapper }) {
  const meta = getCategoryMeta(row.catLabel);
  const Icon = meta.icon;
  const rowProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2, delay: Math.min(idx * 0.02, 0.12), ease: EASE },
      };

  return (
    <RowWrapper className="border-t border-white/8" {...rowProps}>
      <td className="px-4 py-3 sm:px-5">
        <span className="inline-flex flex-wrap items-center gap-2 font-medium text-white/90">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
            style={{ background: `${meta.color}1f`, color: meta.color }}
          >
            <Icon size={14} strokeWidth={2} />
          </span>
          {row.catLabel}
          {row.freshOnly && <FreshCutBadge />}
        </span>
      </td>
      <td className="max-w-[12rem] px-4 py-3 sm:max-w-none sm:px-5">
        <span className="block font-medium leading-snug text-white/85 sm:truncate">{row.winner.name}</span>
        <span className="text-xs text-white/50">{row.winner.merchant}</span>
      </td>
      <td className="px-4 py-3 sm:px-5">
        <span className="font-display text-base font-bold tabular-nums text-leaf">
          {formatDealPrice(row.winner.price, row.winner.unit)}
        </span>
        <div className="mt-1 flex flex-wrap gap-1">
          <SpreadBadge spread={row.spread} storeCount={row.storeCount} />
        </div>
        <MarketContext row={row} className="mt-2 md:hidden" />
      </td>
      <td className="hidden px-4 py-3 md:table-cell sm:px-5">
        <MarketContext row={row} />
      </td>
      <td className="px-4 py-3 sm:px-5">
        <ViewAtButton
          merchant={row.winner.merchant}
          onClick={() => onViewDeal(row.winner.merchant, row.catKey, row.meatSearch)}
          className="sm:min-w-0"
        />
      </td>
    </RowWrapper>
  );
}

export default function BestDealsPanel({
  data,
  onViewDeal,
  onBrowseByStore,
  reduceMotion = false,
}) {
  const winners = computeCategoryWinners(data?.deals_by_category, data?.categories || []);
  const storeCount = new Set(data?.merchants || []).size;
  const meatWinners = MEAT_TYPES.map((t) => winners.find((w) => w.meatType === t.key) || null);
  const liveSummary =
    winners.length === 0
      ? "No category winners available."
      : `${winners.length} winners across ${storeCount} store${storeCount !== 1 ? "s" : ""}.`;

  const RowWrapper = reduceMotion ? "tr" : motion.tr;

  if (!winners.length) {
    return (
      <EmptyState>
        <div className="mx-auto max-w-md space-y-4">
          <p>No priced ads yet for a cross-store comparison.</p>
          <p className="text-sm text-white/55">
            Try another market ZIP, or browse individual store ads.
          </p>
          {onBrowseByStore && (
            <button type="button" onClick={onBrowseByStore} className={BTN_GHOST}>
              Browse deals by store
              <ArrowRight size={14} aria-hidden />
            </button>
          )}
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveSummary}
      </p>

      <div className={PANEL + " p-4 sm:p-5"}>
        <p className="text-sm leading-relaxed text-white/65">
          Cheapest advertised price in each category — use the gaps to decide what to match this weekend.
        </p>
        <RankingHelp />
      </div>

      {data?.deals_by_category?.meat != null && (
        <section aria-label="Meat winners by protein type">
          <SectionHeader
            icon={Beef}
            iconClass="text-brand"
            title="Meat winners"
            description="Fresh chicken, pork, and beef — lowest ad in each group."
            className="mb-4"
          />
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {MEAT_TYPES.map((type, i) => {
              const row = meatWinners[i];
              if (!row) {
                return (
                  <li
                    key={type.key}
                    className="flex min-h-[220px] flex-col justify-center rounded-2xl border border-dashed border-white/12 bg-ink-2/40 p-5 text-center"
                  >
                    <p className="font-medium text-white/75">{type.label}</p>
                    <p className="mt-2 text-sm text-white/45">No fresh ads this week</p>
                    <p className="mt-1 text-xs text-white/35">Breaded &amp; prepped items excluded</p>
                  </li>
                );
              }

              const deal = {
                ...row.winner,
                catLabel: row.catLabel,
                catKey: row.catKey,
              };
              const Wrapper = reduceMotion ? "li" : motion.li;
              const motionProps = reduceMotion
                ? { className: "flex min-h-0" }
                : {
                    className: "flex min-h-0",
                    initial: { opacity: 0, y: 8 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.25, delay: i * 0.04, ease: EASE },
                  };

              return (
                <Wrapper key={row.rowKey} {...motionProps}>
                  <div className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-white/10 bg-ink-2/30 p-3 sm:p-3.5">
                    <DealCard d={deal} compact showMerchant />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <FreshCutBadge />
                      <SpreadBadge spread={row.spread} storeCount={row.storeCount} />
                    </div>
                    <ViewAtButton
                      className="mt-2"
                      merchant={row.winner.merchant}
                      onClick={() => onViewDeal(row.winner.merchant, row.catKey, row.meatSearch)}
                    />
                  </div>
                </Wrapper>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="All category winners">
        <SectionHeader
          icon={LayoutGrid}
          title="All categories"
          description="Full comparison table — meat rows appear first."
          className="mb-4"
        />

        <p className="mb-2 text-xs text-white/45 md:hidden">Swipe horizontally for the full table on small screens.</p>

        <div className={PANEL_MUTED + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[min(100%,36rem)] text-left text-sm md:min-w-[640px]">
              <caption className="sr-only">
                Category winners — lowest competitor ad price per category
              </caption>
              <thead className={TABLE_HEAD}>
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                    Best deal
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                    Price
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-semibold md:table-cell sm:px-5">
                    Market
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {winners.map((row, idx) => (
                  <WinnerTableRow
                    key={row.rowKey}
                    row={row}
                    idx={idx}
                    reduceMotion={reduceMotion}
                    onViewDeal={onViewDeal}
                    RowWrapper={RowWrapper}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
