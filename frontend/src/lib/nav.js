/** Shared nav labels — keep sidebar, header, and in-app links aligned. */
export const APP_NAV = [
  { id: "home", label: "Dashboard" },
  { id: "weather", label: "Weekend playbook" },
  { id: "deals", label: "Competitor deals" },
  { id: "insights", label: "Your store data" },
  { id: "trending", label: "Market trends" },
];

export const TAB_LABELS = Object.fromEntries(APP_NAV.map(({ id, label }) => [id, label]));

export function navLabel(tabId) {
  return TAB_LABELS[tabId] || tabId;
}
