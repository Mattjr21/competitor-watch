import { Trophy, Upload } from "lucide-react";
import { PANEL, TABLE_HEAD, UploadCtaLink, SUCCESS_BADGE, INFO_BADGE } from "../lib/sectionUi";

const BAND_STYLE = {
  national_leader: { label: "National leader", className: "text-leaf" },
  competitive: { label: "Competitive", className: "text-sky" },
  above_national: { label: "Above national", className: "text-amber-300" },
  no_data: { label: "No data", className: "text-muted-foreground/80" },
};

function ScoreRing({ score }) {
  if (score == null) return null;
  const color = score >= 90 ? "#34c759" : score >= 60 ? "#4aa3ff" : "#f0b429";
  return (
    <div
      className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border-2"
      style={{ borderColor: color }}
      aria-label={`Overall national score ${score} out of 100`}
    >
      <span className="font-display text-xl font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default function NationalRankPanel({ ranking, onUploadGuide }) {
  if (!ranking) return null;

  const rows = (ranking.rows || []).filter((r) => r.national_low != null || r.own_avg != null);
  if (!rows.length && !ranking.overall_score) return null;

  return (
    <section className={PANEL + " p-4 sm:p-5"} aria-labelledby="national-rank-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <ScoreRing score={ranking.overall_score} />
          <div className="min-w-0">
            <h3 id="national-rank-title" className="font-display text-lg font-semibold text-foreground">
              National price ranking
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {ranking.profile_label || "Benchmark"} · {ranking.scanned_zips?.length || 0} national
              ZIPs · {ranking.categories_ranked || 0} categories scored
            </p>
            {ranking.generated_at && (
              <p className="mt-0.5 text-xs text-muted-foreground/70">Benchmark ads: {ranking.generated_at}</p>
            )}
          </div>
        </div>
      </div>

      {ranking.requires_upload ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/8 px-4 py-3 text-sm text-foreground/85">
          <Upload size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          <p>
            Upload your POS CSV to rank <strong className="text-foreground">your shelf prices</strong> vs
            national {ranking.profile_label} markets.{" "}
            {onUploadGuide ? (
              <button
                type="button"
                onClick={onUploadGuide}
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                Upload sales CSV
              </button>
            ) : (
              <UploadCtaLink className="min-h-0 inline text-sm" />
            )}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className={SUCCESS_BADGE}>
            <Trophy size={12} aria-hidden />
            {ranking.national_leaders || 0} at national low
          </span>
          <span className={INFO_BADGE}>{ranking.competitive_count || 0} competitive</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">
              Your prices ranked against national {ranking.profile_label} weekly ad lows
            </caption>
            <thead className={TABLE_HEAD}>
              <tr>
                <th scope="col" className="px-4 py-2.5">
                  Category
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Your avg
                </th>
                <th scope="col" className="px-4 py-2.5">
                  National low
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Score
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const band = BAND_STYLE[row.national_band] || BAND_STYLE.no_data;
                return (
                  <tr key={row.key} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {row.own_avg != null ? `$${row.own_avg}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.national_low != null ? (
                        <>
                          <span className="font-display font-bold tabular-nums text-leaf">
                            ${row.national_low}
                          </span>
                          {row.national_cheapest && (
                            <span className="ml-1 text-xs text-muted-foreground/80">· {row.national_cheapest}</span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={"px-4 py-3 font-semibold tabular-nums " + band.className}>
                      {row.national_score ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.national_rank ? `#${row.national_rank}` : band.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ranking.note && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">{ranking.note}</p>
      )}
    </section>
  );
}
