import { DEFAULT_STORE } from "../lib/mapbox";
import { LockedFooter, SAMPLE_BADGE } from "../lib/sectionUi";
import TradeAreaMap from "./TradeAreaMap";

export default function TradeAreaMapPreview({
  title = "Upload POS data to unlock trade area",
  detail = "Include ZIP or postal codes in your export to see reach and top ZIP codes.",
  zip = DEFAULT_STORE.zip,
  city = DEFAULT_STORE.city,
  lng = DEFAULT_STORE.lng,
  lat = DEFAULT_STORE.lat,
  radiusMiles = DEFAULT_STORE.radiusMiles,
  locked = true,
  children,
}) {
  const mapBottomPadding = locked ? 24 : 48;

  if (locked) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-white/10 bg-ink-2/30"
        role="region"
        aria-label={`Sample preview: ${title}`}
      >
        <div className="flex items-center border-b border-white/10 bg-ink/70 px-3 py-2.5 sm:px-4">
          <span className={SAMPLE_BADGE}>
            {city}, {zip} · ~{radiusMiles} mi radius
          </span>
        </div>

        <div className="relative h-[220px] sm:h-[260px]">
          <TradeAreaMap
            lat={lat}
            lng={lng}
            radiusMiles={radiusMiles}
            interactive={false}
            bottomPadding={mapBottomPadding}
            className="absolute inset-0"
          />
        </div>

        <LockedFooter title={title} detail={detail} />
      </div>
    );
  }

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 sm:min-h-[320px] lg:min-h-[360px]">
      <div className="absolute inset-0 z-0">
        <TradeAreaMap
          lat={lat}
          lng={lng}
          radiusMiles={radiusMiles}
          interactive
          bottomPadding={mapBottomPadding}
          className="absolute inset-0"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 bg-gradient-to-t from-ink via-ink/88 to-transparent" />
      {children && <div className="relative z-20">{children}</div>}
    </div>
  );
}
