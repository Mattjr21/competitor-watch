import { useMemo, useState } from "react";
import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PANEL } from "../lib/sectionUi";
import {
  buildWeekDigestActions,
  copyText,
  digestEmailSubject,
  formatDigestEmail,
  formatDigestWhatsApp,
  mailtoDigestUrl,
  whatsAppShareUrl,
} from "../lib/weekDigest";

export default function WeekDigestPanel({ dealsData, forecast, storeName = "La Bodega" }) {
  const [copied, setCopied] = useState(null);
  const location = forecast?.location || {};
  const actions = useMemo(
    () => buildWeekDigestActions(dealsData, forecast),
    [dealsData, forecast]
  );

  const digestCtx = useMemo(
    () => ({
      storeName,
      location,
      actions,
      generatedAt: dealsData?.generated_at || "",
    }),
    [storeName, location, actions, dealsData?.generated_at]
  );

  const whatsAppText = useMemo(() => formatDigestWhatsApp(digestCtx), [digestCtx]);
  const emailText = useMemo(() => formatDigestEmail(digestCtx), [digestCtx]);
  const emailSubject = digestEmailSubject(storeName);

  if (!actions.length) return null;

  async function handleCopy(kind, text) {
    const ok = await copyText(text);
    if (ok) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <section className={PANEL + " p-4 sm:p-5"} aria-labelledby="week-digest-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="week-digest-title" className="font-display text-base font-semibold text-foreground sm:text-lg">
            This week&apos;s 3 actions
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Share with your team on WhatsApp or email — pulled from live ads and the weekend playbook.
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {actions.map((action, i) => (
          <li
            key={`${action.title}-${i}`}
            className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-3 sm:px-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-display text-sm font-bold tabular-nums text-brand">{i + 1}.</span>
              {action.tag && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                  {action.tag}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{action.title}</p>
            {action.summary && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action.summary}</p>
            )}
            {action.detail && action.detail !== action.summary && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/90">{action.detail}</p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={() => handleCopy("whatsapp", whatsAppText)}
        >
          {copied === "whatsapp" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied === "whatsapp" ? "Copied" : "Copy for WhatsApp"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={() => handleCopy("email", emailText)}
        >
          {copied === "email" ? <Check size={14} aria-hidden /> : <Mail size={14} aria-hidden />}
          {copied === "email" ? "Copied" : "Copy for email"}
        </Button>
        <Button type="button" variant="default" size="sm" className="min-h-10" asChild>
          <a href={whatsAppShareUrl(whatsAppText)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} aria-hidden />
            Open WhatsApp
          </a>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="min-h-10" asChild>
          <a href={mailtoDigestUrl(emailSubject, emailText)}>Email draft</a>
        </Button>
      </div>
    </section>
  );
}
