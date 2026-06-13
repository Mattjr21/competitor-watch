import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

const AREAS = [
  { id: "30701", label: "Calhoun GA", zips: ["30701"], group: "local", flag: "🏠" },
  { id: "30735", label: "Resaca GA", zips: ["30735"], group: "local", flag: "🏠" },
  { id: "30733", label: "Plainville GA", zips: ["30733"], group: "local", flag: "🏠" },
  { id: "30746", label: "Sugar Valley GA", zips: ["30746"], group: "local", flag: "🏠" },
  { id: "30103", label: "Adairsville GA", zips: ["30103"], group: "local", flag: "🏠" },
  { id: "30720", label: "Dalton GA", zips: ["30720"], group: "local", flag: "🏠" },
  { id: "houston", label: "Houston TX", zips: ["77001", "77002", "77003"], group: "texas", flag: "🤠" },
  { id: "dallas", label: "Dallas TX", zips: ["75201", "75202", "76101"], group: "texas", flag: "🤠" },
  { id: "sanantonio", label: "San Antonio TX", zips: ["78201", "78202", "78203"], group: "texas", flag: "🤠" },
  { id: "rgv", label: "Rio Grande Valley TX", zips: ["78501", "78502", "78503"], group: "texas", flag: "🤠" },
  { id: "hialeah", label: "Hialeah / Miami FL", zips: ["33010", "33012", "33016"], group: "florida", flag: "🌴" },
  { id: "orlando", label: "Orlando FL", zips: ["32801", "32805", "32808"], group: "florida", flag: "🌴" },
];

const GROUPS = [
  { id: "local", label: "🏠 Your local area" },
  { id: "texas", label: "🤠 Texas markets" },
  { id: "florida", label: "🌴 Florida markets" },
];

/** Default local market ZIPs — matches AreaSelector’s initial selection. */
export const DEFAULT_LOCAL_ZIPS = AREAS.filter((a) => a.group === "local")
  .flatMap((a) => a.zips)
  .join(",");

function initialSelected() {
  const init = {};
  AREAS.forEach((a) => (init[a.id] = a.group === "local"));
  return init;
}

function zipsFromSelection(selected) {
  return AREAS.filter((a) => selected[a.id])
    .flatMap((a) => a.zips)
    .join(",");
}

function idsFromSelection(selected) {
  return AREAS.filter((a) => selected[a.id]).map((a) => a.id);
}

export default function AreaSelector({ onApply, isLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(initialSelected);
  const [applied, setApplied] = useState(initialSelected);
  const [pendingIds, setPendingIds] = useState([]);

  const hasPendingChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(applied),
    [draft, applied]
  );

  useEffect(() => {
    if (!isLoading && pendingIds.length > 0) {
      queueMicrotask(() => {
        setApplied((prev) => {
          const next = { ...prev };
          pendingIds.forEach((id) => {
            next[id] = draft[id];
          });
          return next;
        });
        setPendingIds([]);
      });
    }
  }, [isLoading, pendingIds, draft]);

  const applySelection = useCallback(() => {
    const activeAreas = AREAS.filter((a) => draft[a.id]);
    if (activeAreas.length === 0) return;
    const zips = zipsFromSelection(draft);
    const ids = idsFromSelection(draft);
    setPendingIds(ids);
    onApply(zips);
  }, [draft, onApply]);

  const toggle = (id) =>
    setDraft((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });

  const setGroup = (group, value) =>
    setDraft((prev) => {
      const next = { ...prev };
      AREAS.filter((a) => a.group === group).forEach((a) => (next[a.id] = value));
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });

  const getChipState = (id) => {
    if (!draft[id]) return "idle";
    if (pendingIds.includes(id)) return "loading";
    if (applied[id]) return "active";
    return "pending";
  };

  const activeAreas = AREAS.filter((a) => applied[a.id] && !pendingIds.includes(a.id));
  const pendingAreas = AREAS.filter((a) => pendingIds.includes(a.id));
  const summaryLabels = activeAreas.slice(0, 3).map((a) => a.label.split(" ")[0]);
  const summary =
    activeAreas.length === 0 && pendingAreas.length === 0
      ? "No markets selected"
      : `${activeAreas.length + pendingAreas.length} market${
          activeAreas.length + pendingAreas.length !== 1 ? "s" : ""
        }${summaryLabels.length ? ` · ${summaryLabels.join(", ")}${activeAreas.length > 3 ? "…" : ""}` : ""}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-2/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <MapPin size={16} className="shrink-0 text-brand" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white/90">Market areas</div>
            <div className="truncate text-xs text-white/55">{summary}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasPendingChanges && !isLoading && (
            <span className="text-xs text-amber-300">Unsaved changes</span>
          )}
          {isLoading && <span className="text-xs text-amber-400">Updating…</span>}
          <ChevronDown
            size={18}
            className={"text-white/55 transition-transform " + (expanded ? "rotate-180" : "")}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-5 pb-5 pt-4">
          <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/55">Active:</span>

            {pendingAreas.map((area) => (
              <span
                key={area.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400"
              >
                <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                {area.flag} {area.label}
              </span>
            ))}

            {activeAreas.map((area) => (
              <span
                key={area.id}
                className="inline-flex items-center gap-1 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf"
              >
                ✓ {area.flag} {area.label}
              </span>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {GROUPS.map((group) => (
              <div key={group.id}>
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    {group.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroup(group.id, true)}
                    className="text-xs text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroup(group.id, false)}
                    className="text-xs text-white/55 underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    None
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AREAS.filter((a) => a.group === group.id).map((area) => {
                    const state = getChipState(area.id);
                    const styles = {
                      idle: "border-white/12 text-white/60 hover:border-white/35 hover:text-white/85",
                      pending: "border-amber-400/50 bg-amber-400/10 text-amber-200",
                      loading: "border-amber-500/50 bg-amber-500/10 text-amber-400",
                      active: "border-leaf/60 bg-leaf/10 text-leaf",
                    };
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggle(area.id)}
                        className={
                          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:ring-2 focus-visible:ring-brand " +
                          styles[state]
                        }
                      >
                        {area.flag} {area.label}
                        {state === "active" && " ✓"}
                        {state === "loading" && (
                          <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={applySelection}
              disabled={isLoading || !hasPendingChanges}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-2"
            >
              Apply markets
            </button>
            <p className="text-xs text-white/55">
              Changes apply only when you click Apply — avoids accidental 60s reloads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
