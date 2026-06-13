import { Lock, RefreshCw } from "lucide-react";
import { Eyebrow, CountUp } from "./ui";
import { PANEL, PANEL_MUTED } from "./layout";

export const PAGE_TITLE =
  "font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl lg:text-5xl";
export const PAGE_LEDE = "mt-3 max-w-2xl text-sm leading-relaxed text-white/65";
export const PAGE_META = "mt-3 text-sm text-white/65";
export const SECTION_TITLE =
  "font-display text-xl font-semibold tracking-tight text-white sm:text-2xl";
export const SECTION_LEDE = "mt-1.5 max-w-2xl text-sm leading-relaxed text-white/65";

export const BTN_GHOST =
  "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand";
export const BTN_PRIMARY =
  "inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink-2";

export { PANEL, PANEL_MUTED };
export const SCROLL_MT = "scroll-mt-36";
export const TAB_SECTION_SPACE = "space-y-12 sm:space-y-14";
export const TABLE_HEAD =
  "bg-white/5 text-[11px] uppercase tracking-wider text-white/60";
export const SAMPLE_BADGE =
  "rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/65 sm:text-[11px] sm:normal-case sm:tracking-normal";

export function RefreshButton({ onClick, loading, label = "Refresh" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={loading || undefined}
      className={BTN_GHOST}
    >
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
      {label}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  eyebrowDot = false,
  title,
  titleId,
  description,
  meta,
  onRefresh,
  loading,
  children,
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow dot={eyebrowDot}>{eyebrow}</Eyebrow>}
        <h2 id={titleId} className={"mt-4 " + PAGE_TITLE}>
          {title}
        </h2>
        {description && <p className={PAGE_LEDE}>{description}</p>}
        {meta && <p className={PAGE_META}>{meta}</p>}
        {children}
      </div>
      {onRefresh && <RefreshButton onClick={onRefresh} loading={loading} />}
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  iconClass = "text-white/70",
  title,
  description,
  className = "mb-6",
}) {
  return (
    <header className={className}>
      <div className="flex items-start gap-3">
        {Icon && (
          <Icon size={20} className={"mt-0.5 shrink-0 " + iconClass} aria-hidden />
        )}
        <div className="min-w-0">
          <h3 className={SECTION_TITLE}>{title}</h3>
          {description && <p className={SECTION_LEDE}>{description}</p>}
        </div>
      </div>
    </header>
  );
}

export function StatCard({ label, value, suffix = "", hint, accentClass = "text-white" }) {
  const display =
    typeof value === "number"
      ? value < 1000
        ? String(value)
        : value.toLocaleString()
      : value;

  return (
    <article className={PANEL} aria-label={`${label}: ${display}${suffix}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
        {label}
      </div>
      <div className={"mt-2 font-display text-3xl font-bold tabular-nums " + accentClass}>
        {typeof value === "number" && value < 1000 ? (
          <>
            <CountUp to={value} />
            {suffix}
          </>
        ) : (
          <>
            {display}
            {suffix}
          </>
        )}
      </div>
      {hint && <p className="mt-2 text-xs leading-relaxed text-white/60">{hint}</p>}
    </article>
  );
}

export function UploadCtaLink({ className = "", label = "Upload sales CSV" }) {
  return (
    <a
      href="#insights-upload"
      className={
        "inline-flex min-h-[44px] items-center text-sm font-semibold text-brand underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand " +
        className
      }
    >
      {label}
    </a>
  );
}

export function LockedFooter({ title, detail, showUploadLink = true }) {
  return (
    <div className="border-t border-white/12 bg-ink px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="grid shrink-0 place-items-center rounded-lg border border-brand/30 bg-brand/15 p-2 text-brand"
            aria-hidden
          >
            <Lock size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold leading-snug text-white sm:text-base">
              {title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/70">{detail}</p>
          </div>
        </div>
        {showUploadLink && <UploadCtaLink className="shrink-0 sm:mt-1" />}
      </div>
    </div>
  );
}

export function NeedsDataPanel({ title, detail, showUploadLink = true }) {
  return (
    <div className={PANEL_MUTED + " px-5 py-6 sm:px-6 sm:py-8"} role="status">
      <p className="font-medium text-white/90">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{detail}</p>
      {showUploadLink && (
        <div className="mt-4">
          <UploadCtaLink />
        </div>
      )}
    </div>
  );
}
