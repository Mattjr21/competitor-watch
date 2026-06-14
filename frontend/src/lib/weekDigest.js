function truncate(text, max = 240) {
  if (!text) return "";
  const s = String(text).trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

function weekendDays(forecast) {
  return (forecast?.weather_days || []).filter((d) => /sat|sun|sáb|dom/i.test(d.label || ""));
}

/** Build up to 3 actionable items for staff digest (recommendations first, then weather). */
export function buildWeekDigestActions(dealsData, forecast) {
  const actions = [];
  const recs = dealsData?.recommendations || [];

  for (const rec of recs) {
    if (actions.length >= 3) break;
    actions.push({
      tag: rec.tag,
      title: rec.title,
      summary: rec.plain || rec.goal || "",
      detail: truncate(rec.body, 260),
    });
  }

  const days = weekendDays(forecast);
  const primary = days[0];

  if (actions.length < 3 && primary?.playbook_note) {
    actions.push({
      tag: "WEATHER",
      title: `${primary.label} — ${primary.weather || "weekend playbook"}`,
      summary: primary.playbook_note,
      detail:
        primary.push_categories?.length > 0
          ? `Push: ${primary.push_categories.join(", ")}${
              primary.skip_categories?.length ? ` · Ease off: ${primary.skip_categories.join(", ")}` : ""
            }`
          : "",
    });
  }

  if (actions.length < 3 && primary?.push_categories?.length > 0) {
    const already = actions.some((a) => a.detail?.startsWith("Push:"));
    if (!already) {
      actions.push({
        tag: "PUSH",
        title: `Feature ${primary.push_categories.slice(0, 3).join(", ")}`,
        summary: `${primary.temp_high_f}°F · ${primary.rain_prob_pct}% rain`,
        detail: primary.playbook_note || "",
      });
    }
  }

  if (actions.length < 3 && dealsData?.week_signal) {
    actions.push({
      tag: "MARKET",
      title: "Competitor snapshot",
      summary: dealsData.week_signal,
      detail: "",
    });
  }

  return actions.slice(0, 3);
}

export function formatDigestWhatsApp({ storeName, location, actions, generatedAt }) {
  const city = location?.city || "Calhoun";
  const state = location?.state || "GA";
  const dateLabel = generatedAt || new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  let text = `*${storeName} — ${city}, ${state}*\n*This week's 3 actions* (${dateLabel})\n\n`;

  actions.forEach((action, i) => {
    text += `*${i + 1}. ${action.title}*\n`;
    if (action.summary) text += `${action.summary}\n`;
    if (action.detail) text += `${action.detail}\n`;
    text += "\n";
  });

  text += "_Sent from Competitor Watch_";
  return text.trim();
}

export function formatDigestEmail({ storeName, location, actions, generatedAt }) {
  const city = location?.city || "Calhoun";
  const state = location?.state || "GA";
  const dateLabel = generatedAt || new Date().toLocaleDateString();

  let body = `Hi team,\n\nHere are this week's top 3 actions for ${storeName} (${city}, ${state}):\n\n`;

  actions.forEach((action, i) => {
    body += `${i + 1}. ${action.title}\n`;
    if (action.summary) body += `   ${action.summary}\n`;
    if (action.detail) body += `   ${action.detail}\n`;
    body += "\n";
  });

  body += `Updated: ${dateLabel}\n— Competitor Watch`;
  return body.trim();
}

export function digestEmailSubject(storeName) {
  return `This week's 3 actions — ${storeName}`;
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}

export function whatsAppShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailtoDigestUrl(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
