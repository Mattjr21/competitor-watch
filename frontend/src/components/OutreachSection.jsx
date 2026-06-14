import { useEffect, useState } from "react";
import { ExternalLink, Shield } from "lucide-react";
import { EmptyState, ErrorState } from "../lib/ui";
import { PANEL, StatCard, TABLE_HEAD } from "../lib/sectionUi";

const API = import.meta.env.VITE_API_URL || "";

export default function OutreachSection({ facts, compactDemo = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/outreach`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load outreach data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facts?.customer_analytics?.has_customer_ids]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    );
  }

  if (error && !data) return <ErrorState message={error} />;

  if (!data) return <EmptyState>Outreach data unavailable.</EmptyState>;

  const s = data.summary || {};
  const campaigns = data.campaigns || [];
  const hideDetails = compactDemo || data.demo_mode;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {data.channel === "whatsapp" ? "WhatsApp Business" : data.channel} · {data.period_label}
          </p>
          {!data.demo_mode && (
            <p className="mt-1 text-xs text-leaf">Live aggregates from Supabase</p>
          )}
        </div>
        {data.crm_app_url && (
          <a
            href={data.crm_app_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
          >
            Open production CRM <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sent" value={s.sent} hint={`${s.read_rate_pct ?? "—"}% read rate`} />
        <StatCard label="Read" value={s.read} accentClass="text-sky" />
        <StatCard
          label="Replied"
          value={s.replied}
          accentClass="text-brand"
          hint={`${s.reply_rate_pct ?? "—"}% reply rate`}
        />
        <StatCard
          label="Store visit (7d)"
          value={s.visited_7d}
          accentClass="text-leaf"
          hint={`${s.visit_match_pct ?? "—"}% matched to POS`}
        />
      </div>

      {data.language_mix?.length > 0 && !hideDetails && (
        <div className={PANEL}>
          <h4 className="text-sm font-semibold text-foreground/85">Campaign language mix</h4>
          <div className="mt-4 flex flex-wrap gap-4">
            {data.language_mix.map((row) => (
              <div key={row.language} className="min-w-[120px]">
                <div className="text-xs text-muted-foreground">{row.language}</div>
                <div className="font-display text-2xl font-bold text-foreground">{row.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaigns.length > 0 && !hideDetails && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="border-b border-border/70 bg-muted/60 px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold text-foreground/85">Recent campaigns (aggregates)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className={TABLE_HEAD}>
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Campaign</th>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Sent</th>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Read</th>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Reply</th>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Visit 7d</th>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Lang</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium text-foreground sm:px-5">{c.name}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground sm:px-5">{c.sent?.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums text-sky sm:px-5">{c.read_rate_pct}%</td>
                    <td className="px-4 py-3 tabular-nums text-brand sm:px-5">{c.reply_rate_pct}%</td>
                    <td className="px-4 py-3 tabular-nums text-leaf sm:px-5">{c.visit_match_pct}%</td>
                    <td className="px-4 py-3 text-muted-foreground sm:px-5">{c.language || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.visit_match_note && !hideDetails && (
        <p className="text-xs leading-relaxed text-muted-foreground">{data.visit_match_note}</p>
      )}
      {data.privacy_note && !hideDetails && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground/80">
          <Shield size={14} className="mt-0.5 shrink-0" />
          {data.privacy_note}
        </p>
      )}
    </div>
  );
}

export function DemoModeBanner() {
  const [demoMode, setDemoMode] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setDemoMode(j?.demo_mode ?? false))
      .catch(() => setDemoMode(false));
  }, []);

  if (!demoMode) return null;

  return (
    <div
      role="status"
      className="border-b border-sky/25 bg-sky/10 py-2.5 text-center text-xs text-sky-900"
    >
      <p className="app-shell">
        <span className="font-semibold">Demo mode</span> — sample metrics for review. Upload a POS export
        on Your store data to see your store&apos;s live numbers.
      </p>
    </div>
  );
}
