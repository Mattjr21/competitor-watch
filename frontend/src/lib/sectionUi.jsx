import { Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow, CountUp } from "./ui";
import { PANEL, PANEL_MUTED } from "./layout";

export const PAGE_TITLE =
  "font-display text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl lg:text-[2.75rem]";
export const PAGE_LEDE = "mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground";
export const PAGE_META = "mt-3 text-sm text-muted-foreground";
export const SECTION_TITLE =
  "font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl";
export const SECTION_LEDE = "mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground";

export const BTN_GHOST =
  "inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export const BTN_PRIMARY =
  "inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring";

export { PANEL, PANEL_MUTED };
export const SCROLL_MT = "scroll-mt-section";
export const TAB_SECTION_SPACE = "space-y-10 sm:space-y-12";
export const TABLE_HEAD =
  "bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
/** Shared pill badges — sample, tags, status chips */
export const SAMPLE_BADGE =
  "inline-flex items-center rounded-full border border-border bg-muted/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px] sm:normal-case sm:tracking-normal";
export const TAG_BADGE =
  "inline-flex items-center rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand sm:text-[11px]";
export const INFO_BADGE =
  "inline-flex items-center rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[10px] font-semibold text-sky sm:text-[11px]";
export const SUCCESS_BADGE =
  "inline-flex items-center gap-1 rounded-full border border-leaf/30 bg-leaf/10 px-2.5 py-1 text-[10px] font-semibold text-leaf sm:text-[11px]";
export const META_CHIP =
  "inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground sm:text-[11px]";
export const META_CHIP_ACCENT =
  "inline-flex max-w-full items-center gap-1 rounded-full border border-sky/25 bg-sky/10 px-2 py-0.5 text-[10px] font-medium text-foreground sm:text-[11px]";

/** In-app navigation links (sky). Primary green stays for CTAs and UploadCtaLink actions. */
export const NAV_LINK =
  "font-medium text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring";
export const NAV_LINK_SEMIBOLD =
  "font-semibold text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring";

/** Light-theme alert for server week_signal copy (amber on white). */
export const WEEK_SIGNAL_PANEL =
  "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-900";

export function RefreshButton({ onClick, loading, label = "Refresh" }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={loading} className="min-h-11">
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
      {label}
    </Button>
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
  iconClass = "text-primary",
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

export function StatCard({ label, value, suffix = "", hint, accentClass = "text-foreground" }) {
  const display =
    typeof value === "number"
      ? value < 1000
        ? String(value)
        : value.toLocaleString()
      : value;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-5" aria-label={`${label}: ${display}${suffix}`}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        {hint && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function UploadCtaLink({ className = "", label = "Connect store data" }) {
  return (
    <a href="#insights-pulse" className={"inline-flex min-h-11 items-center text-sm " + NAV_LINK_SEMIBOLD + " " + className}>
      {label}
    </a>
  );
}

export function LockedFooter({ title, detail, showUploadLink = true, className = "" }) {
  return (
    <div className={"border-t border-border bg-muted/40 px-3 py-3 sm:px-4 sm:py-4 " + className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="grid shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary"
            aria-hidden
          >
            <Lock size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold leading-snug text-foreground sm:text-base">
              {title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
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
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{detail}</p>
      {showUploadLink && (
        <div className="mt-4">
          <UploadCtaLink />
        </div>
      )}
    </div>
  );
}
