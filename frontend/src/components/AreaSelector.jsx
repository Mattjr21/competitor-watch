import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function selectionFromZips(zipsCsv) {
  const zipSet = new Set((zipsCsv || "").split(",").map((z) => z.trim()).filter(Boolean));
  if (zipSet.size === 0) return initialSelected();
  const sel = {};
  AREAS.forEach((a) => {
    sel[a.id] = a.zips.some((z) => zipSet.has(z));
  });
  if (!Object.values(sel).some(Boolean)) return initialSelected();
  return sel;
}

function zipsFromSelection(selected) {
  return AREAS.filter((a) => selected[a.id])
    .flatMap((a) => a.zips)
    .join(",");
}

function areasFromSelection(selected) {
  return AREAS.filter((a) => selected[a.id]);
}

function selectionDiff(applied, draft) {
  const added = AREAS.filter((a) => draft[a.id] && !applied[a.id]);
  const removed = AREAS.filter((a) => applied[a.id] && !draft[a.id]);
  return { added, removed };
}

export default function AreaSelector({ onApply, isLoading, appliedZips }) {
  const [expanded, setExpanded] = useState(false);
  const loadedSelection = useMemo(
    () => (appliedZips ? selectionFromZips(appliedZips) : initialSelected()),
    [appliedZips]
  );
  const [draft, setDraft] = useState(loadedSelection);
  const [applied, setApplied] = useState(loadedSelection);
  const applyingRef = useRef(null);

  useEffect(() => {
    setApplied(loadedSelection);
    setDraft((prev) => {
      const unchanged = JSON.stringify(prev) === JSON.stringify(applied);
      return unchanged ? loadedSelection : prev;
    });
  }, [loadedSelection]); // eslint-disable-line react-hooks/exhaustive-deps -- only sync when parent zips change

  useEffect(() => {
    if (!isLoading && applyingRef.current) {
      setApplied(applyingRef.current);
      applyingRef.current = null;
    }
  }, [isLoading]);

  const hasPendingChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(applied),
    [draft, applied]
  );

  const applySelection = useCallback(() => {
    const activeAreas = AREAS.filter((a) => draft[a.id]);
    if (activeAreas.length === 0) return;
    applyingRef.current = { ...draft };
    onApply(zipsFromSelection(draft));
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

  const loadedAreas = areasFromSelection(applied);
  const draftAreas = areasFromSelection(draft);
  const { added, removed } = selectionDiff(applied, draft);
  const summaryLabels = loadedAreas.slice(0, 3).map((a) => a.label.split(" ")[0]);
  const summary =
    loadedAreas.length === 0
      ? "No markets selected"
      : `${loadedAreas.length} market${loadedAreas.length !== 1 ? "s" : ""}${
          summaryLabels.length ? ` · ${summaryLabels.join(", ")}${loadedAreas.length > 3 ? "…" : ""}` : ""
        }`;

  const isApplying = isLoading && applyingRef.current != null;

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
          {hasPendingChanges && !isApplying && (
            <span className="text-xs text-amber-300">Unsaved changes</span>
          )}
          {isApplying && <span className="text-xs text-amber-400">Updating…</span>}
          <ChevronDown
            size={18}
            className={"text-white/55 transition-transform " + (expanded ? "rotate-180" : "")}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-5 pb-5 pt-4">
          <div className="space-y-3">
            <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Loaded in deals:
              </span>
              {loadedAreas.length === 0 ? (
                <span className="text-xs text-white/45">None</span>
              ) : (
                loadedAreas.map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center gap-1 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf"
                  >
                    ✓ {area.flag} {area.label}
                  </span>
                ))
              )}
            </div>

            {hasPendingChanges && (
              <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                  Selected (unsaved):
                </span>
                {draftAreas.map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100"
                  >
                    {area.flag} {area.label}
                  </span>
                ))}
                {(added.length > 0 || removed.length > 0) && (
                  <span className="w-full text-[11px] text-amber-200/70">
                    {added.length > 0 && `+ ${added.map((a) => a.label).join(", ")}`}
                    {added.length > 0 && removed.length > 0 && " · "}
                    {removed.length > 0 && `− ${removed.map((a) => a.label).join(", ")}`}
                  </span>
                )}
              </div>
            )}
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
                    const selected = draft[area.id];
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggle(area.id)}
                        disabled={isApplying}
                        className={
                          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 " +
                          (selected
                            ? "border-leaf/60 bg-leaf/10 text-leaf"
                            : "border-white/12 text-white/60 hover:border-white/35 hover:text-white/85")
                        }
                      >
                        {area.flag} {area.label}
                        {selected && " ✓"}
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
              disabled={isApplying || !hasPendingChanges}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-2"
            >
              {isApplying ? "Updating…" : "Apply markets"}
            </button>
            <p className="text-xs text-white/55">
              Pills above match your selection. &ldquo;Loaded in deals&rdquo; updates after Apply —
              avoids accidental 60s reloads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
