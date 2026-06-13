import { motion } from "motion/react";
import { Sun, CloudRain, Snowflake, CloudSun } from "lucide-react";
import { ErrorState, EmptyState, EASE } from "../lib/ui";
import { PageHeader, PANEL, SectionHeader, TAB_SECTION_SPACE, TABLE_HEAD } from "../lib/sectionUi";

function profileMeta(profile) {
  switch (profile) {
    case "hot_grill":
      return { Icon: Sun, color: "#ff6a3d", label: "Grill weather" };
    case "rain_comfort":
      return { Icon: CloudRain, color: "#4aa3ff", label: "Rainy / comfort" };
    case "cold_comfort":
      return { Icon: Snowflake, color: "#8fd0ff", label: "Cold / comfort" };
    default:
      return { Icon: CloudSun, color: "#f0b429", label: "Mild" };
  }
}

function WeatherDayCard({ day, index }) {
  const { Icon, color, label } = profileMeta(day.profile);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: EASE }}
      className={"flex flex-col gap-3 " + PANEL + " p-4 sm:p-5"}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-semibold tracking-tight">{day.label}</div>
          <div className="text-xs text-white/55">{day.date}</div>
        </div>
        <span
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{ background: `${color}1f`, color }}
        >
          <Icon size={22} strokeWidth={1.8} />
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${color}1a`, color }}>
          {day.temp_high_f}°F high
        </span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/65">
          {day.rain_prob_pct}% rain
        </span>
      </div>

      {day.weather && <p className="text-sm text-white/55">{day.weather}</p>}
      {day.playbook_note && <p className="text-sm leading-relaxed text-white/80">{day.playbook_note}</p>}

      {day.push_categories?.length > 0 && (
        <div className="mt-auto border-t border-white/8 pt-3 text-xs text-white/60">
          <span className="font-semibold text-leaf">Push:</span> {day.push_categories.join(", ")}
          {day.skip_categories?.length > 0 && (
            <span className="text-white/40"> · ease off: {day.skip_categories.join(", ")}</span>
          )}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
    </motion.div>
  );
}

export default function WeatherSection({ forecast, loading, error, onRefresh }) {
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;
  if (loading && !forecast)
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-56" />
        ))}
      </div>
    );
  if (!forecast) return <EmptyState>No forecast loaded yet.</EmptyState>;

  const days = forecast.weather_days || [];
  const targets = forecast.targets || {};
  const todayTargets = (targets.days || [])[0];
  const loc = forecast.location || {};

  return (
    <section className={TAB_SECTION_SPACE}>
      <div>
        <PageHeader
          eyebrow="Daily ops"
          title="The weekend playbook."
          meta={`${loc.city || "Calhoun"}, ${loc.state || "GA"} · updated ${forecast.generated_at}`}
          onRefresh={onRefresh}
          loading={loading}
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((day, i) => (
            <WeatherDayCard key={i} day={day} index={i} />
          ))}
        </div>
      </div>

      {todayTargets && (
        <div>
          <SectionHeader
            title="Today's sales targets"
            description={targets.note}
            className="mb-6"
          />

          <div className={"mt-6 overflow-hidden rounded-2xl border border-white/10 md:block hidden"}>
            <table className="w-full text-left text-sm">
              <thead className={TABLE_HEAD}>
                <tr>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Typical day</th>
                  <th className="px-5 py-3 font-semibold">Today’s target</th>
                  <th className="px-5 py-3 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody>
                {(todayTargets.categories || []).map((r, i) => (
                  <tr key={i} className="border-t border-white/8">
                    <td className="px-5 py-3 font-medium text-white/90">{r.label}</td>
                    <td className="px-5 py-3 text-white/55 tabular-nums">${r.baseline?.toLocaleString()}</td>
                    <td
                      className={
                        "px-5 py-3 font-semibold tabular-nums " +
                        (r.target > r.baseline ? "text-leaf" : "text-amber-400")
                      }
                    >
                      ${r.target?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-white/55">{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3 md:hidden">
            {(todayTargets.categories || []).map((r, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-ink-2 p-4">
                <div className="font-medium text-white/90">{r.label}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/55">Typical</div>
                    <div className="tabular-nums text-white/70">${r.baseline?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/55">Target</div>
                    <div
                      className={
                        "font-semibold tabular-nums " +
                        (r.target > r.baseline ? "text-leaf" : "text-amber-400")
                      }
                    >
                      ${r.target?.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/60">{r.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
