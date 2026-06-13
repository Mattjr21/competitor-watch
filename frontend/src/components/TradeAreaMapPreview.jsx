import { Lock } from "lucide-react";
import { DEFAULT_STORE } from "../lib/mapbox";
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
  const mapBottomPadding = locked ? 152 : 48;

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 sm:min-h-[320px] lg:min-h-[360px]">
      <div className="absolute inset-0 z-0">
        <TradeAreaMap
          lat={lat}
          lng={lng}
          radiusMiles={radiusMiles}
          interactive={!locked}
          bottomPadding={mapBottomPadding}
        />
      </div>

      {locked ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-start p-3 sm:p-4">
            <span className="rounded-full border border-white/15 bg-ink/80 px-3 py-1.5 text-[11px] font-medium tabular-nums text-white/70 backdrop-blur-sm">
              {city}, {zip} · ~{radiusMiles} mi radius
            </span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-ink via-ink/85 to-transparent sm:h-40" />

          <div className="absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4">
            <div className="rounded-xl border border-white/12 bg-ink/92 p-4 shadow-lg shadow-black/30 backdrop-blur-md sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className="grid shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/15 p-2.5 text-brand"
                  aria-hidden
                >
                  <Lock size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-display text-base font-semibold leading-snug text-white sm:text-[17px]">
                    {title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/65">{detail}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 bg-gradient-to-t from-ink via-ink/88 to-transparent" />
          {children && <div className="relative z-20">{children}</div>}
        </>
      )}
    </div>
  );
}
