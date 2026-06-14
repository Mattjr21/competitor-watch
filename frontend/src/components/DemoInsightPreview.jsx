import { DEMO_BADGE } from "../lib/demoAnalytics";
import { LockedFooter, SAMPLE_BADGE } from "../lib/sectionUi";

export default function DemoInsightPreview({
  badge = DEMO_BADGE,
  title,
  detail,
  children,
  className = "",
  previewMaxH = "max-h-[192px] sm:max-h-[216px]",
}) {
  return (
    <div
      className={"overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm " + className}
      role="region"
      aria-label={`Sample preview: ${title}`}
    >
      <div className="flex items-center border-b border-border bg-background/90 px-3 py-2.5 sm:px-4">
        <span className={SAMPLE_BADGE}>{badge}</span>
      </div>

      <div className={"relative overflow-hidden " + previewMaxH} aria-hidden="true">
        <div className="p-3 opacity-[0.68] saturate-[0.92] sm:p-4">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <LockedFooter title={title} detail={detail} />
    </div>
  );
}
