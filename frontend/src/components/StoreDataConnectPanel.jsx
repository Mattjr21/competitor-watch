import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cloud, FileSpreadsheet, RefreshCw, Upload, Plug, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CSV_FILE_TYPES,
  DEFAULT_STATUS,
  getProvider,
  PROVIDERS,
} from "@/lib/integrationProviders";

const API = import.meta.env.VITE_API_URL || "";

const CSV_SLOTS = [
  { key: "sales", required: true },
  { key: "customers", required: false },
  { key: "products", required: false },
  { key: "loyalty", required: false },
  { key: "offers", required: false },
  { key: "pricelist", required: false },
];

function defaultForm(providerId, connection = {}) {
  const p = getProvider(providerId);
  const saved = connection[providerId] || connection.odoo || {};
  const form = {};
  for (const field of p.fields || []) {
    if (field.type === "number") {
      form[field.key] = saved[field.key] ?? field.default ?? "";
    } else {
      form[field.key] = saved[field.key] ?? field.default ?? "";
    }
  }
  return form;
}

async function readJson(res) {
  const out = await res.json();
  if (!res.ok || out.error) {
    throw new Error(out.error || `Request failed (${res.status})`);
  }
  return out;
}

export default function StoreDataConnectPanel({ dataSource, onComplete, hasLiveData = false }) {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [apiReady, setApiReady] = useState(true);
  const [mode, setMode] = useState("api");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [csvFiles, setCsvFiles] = useState({});
  const [form, setForm] = useState(() => defaultForm("odoo"));
  const [expanded, setExpanded] = useState(true);
  const fileRefs = useRef({});
  const singleSalesRef = useRef(null);

  const activeId = status?.provider || "odoo";
  const activeProvider = useMemo(() => getProvider(activeId), [activeId]);
  const providers = useMemo(
    () => (status?.providers?.length ? status.providers : DEFAULT_STATUS.providers),
    [status?.providers]
  );
  const csvTypes = status?.csv_file_types || CSV_FILE_TYPES;
  const connection = status?.connection?.[activeId] || status?.connection?.odoo || {};
  const apiFields = activeProvider?.fields || [];
  const isConnected = Boolean(connection?.configured);
  const isSampleSource = /default/i.test(dataSource || "");
  const canCollapse = hasLiveData || isConnected || (!isSampleSource && Boolean(dataSource));

  useEffect(() => {
    if (canCollapse) setExpanded(false);
  }, [canCollapse]);

  const loadStatus = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`${API}/api/integration`);
      if (res.status === 404) {
        setApiReady(false);
        setStatus(DEFAULT_STATUS);
        return;
      }
      const out = await readJson(res);
      setApiReady(true);
      setStatus(out);
      const pid = out.provider || "odoo";
      setForm(defaultForm(pid, out.connection || {}));
      const p = getProvider(pid);
      setMode(p.mode === "manual" ? "manual" : "api");
    } catch (e) {
      if (e.message === "not found" || e.message?.includes("404")) {
        setApiReady(false);
        setStatus(DEFAULT_STATUS);
        return;
      }
      setApiReady(false);
      setStatus(DEFAULT_STATUS);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  function selectProviderLocal(providerId) {
    const p = getProvider(providerId);
    setStatus((prev) => ({ ...prev, provider: providerId }));
    setForm(defaultForm(providerId, status?.connection || {}));
    setMode(p.mode === "manual" ? "manual" : "api");
    setErr(null);
    setMsg(null);
  }

  async function selectProvider(providerId) {
    selectProviderLocal(providerId);
    if (!apiReady) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/integration/provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const out = await readJson(res);
      setStatus(out);
      setForm(defaultForm(providerId, out.connection || {}));
    } catch (e) {
      setErr(e.message || "Could not set provider");
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    if (!apiReady) {
      setErr("Deploy the latest backend to save API credentials.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg("Saving connection…");
    try {
      const res = await fetch(`${API}/api/integration/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeId, credentials: form }),
      });
      const out = await readJson(res);
      setStatus(out);
      setForm(defaultForm(activeId, out.connection || {}));
      setMsg("Connection saved.");
    } catch (e) {
      setErr(e.message || "Could not save credentials");
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    if (!apiReady) {
      setErr("Deploy the latest backend to test API credentials.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg("Testing connection…");
    try {
      await saveCredentialsQuiet();
      const res = await fetch(`${API}/api/integration/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeId }),
      });
      const out = await readJson(res);
      setMsg(out.message || "Connection successful.");
    } catch (e) {
      setErr(e.message || "Connection test failed");
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentialsQuiet() {
    const res = await fetch(`${API}/api/integration/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: activeId, credentials: form }),
    });
    const out = await readJson(res);
    setStatus(out);
  }

  async function syncNow() {
    if (!apiReady) {
      setErr("Deploy the latest backend to sync from your ERP/POS.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(`Syncing from ${activeProvider.label}…`);
    try {
      if (!isConnected) await saveCredentialsQuiet();
      const res = await fetch(`${API}/api/integration/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeId }),
      });
      const out = await readJson(res);
      setMsg(`Synced ${out.source_label}`);
      await loadStatus();
      onComplete?.();
    } catch (e) {
      setErr(e.message || "Sync failed");
      setMsg(null);
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function uploadSingle(file) {
    setBusy(true);
    setErr(null);
    setMsg(`Analyzing ${file.name}…`);
    try {
      const text = await file.text();
      const res = await fetch(`${API}/api/upload`, {
        method: "POST",
        headers: { "Content-Type": "text/csv", "X-Filename": file.name },
        body: text,
      });
      const out = await readJson(res);
      setMsg(`Loaded ${out.source_label}`);
      onComplete?.();
    } catch (e) {
      setErr(e.message || "Upload failed");
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  async function uploadBundle() {
    if (!csvFiles.sales) {
      setErr("Sales / order-lines CSV is required.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg("Merging CSV files…");
    try {
      const files = {};
      for (const [key, file] of Object.entries(csvFiles)) {
        files[key] = await file.text();
      }
      const res = await fetch(`${API}/api/upload/bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      const out = await readJson(res);
      setMsg(`Loaded ${out.source_label}`);
      setCsvFiles({});
      onComplete?.();
    } catch (e) {
      setErr(e.message || "Bundle upload failed");
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  const syncHint = status?.last_sync_at ? `Last synced ${status.last_sync_at}` : null;
  const sourceHint = isSampleSource ? "Sample data" : dataSource || "Not loaded yet";
  const collapseSummary = [activeProvider.label, sourceHint, syncHint].filter(Boolean).join(" · ");

  return (
    <div
      id="insights-upload"
      className={cn(
        "no-print rounded-2xl border bg-muted/80",
        expanded ? "border-dashed border-border p-4 sm:p-5 lg:p-6" : "border-border bg-card shadow-sm"
      )}
    >
      {canCollapse && !expanded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Data source</p>
            <p className="truncate text-xs text-muted-foreground">{collapseSummary}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => setExpanded(true)}>
            Manage connection
          </Button>
        </div>
      ) : (
      <div className="flex flex-wrap items-start gap-6">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand" aria-hidden>
          <Upload size={22} />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
            <h3 className="font-display text-xl font-semibold">Connect your system</h3>
            <p id="insights-upload-help" className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Link Odoo or another POS for live orders, or upload CSV exports manually.
              {dataSource && !isSampleSource && (
                <>
                  {" "}
                  Current view:{" "}
                  <span className="font-medium text-foreground">{dataSource}</span>
                </>
              )}
            </p>
            </div>
            {canCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10 shrink-0 gap-1"
                onClick={() => setExpanded(false)}
              >
                Hide
                <ChevronDown size={14} className="rotate-180" aria-hidden />
              </Button>
            )}
          </div>

          {!apiReady && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Live API connect isn&apos;t available on this server yet. You can still upload CSV files below, or open
              the <strong className="font-medium">Sales summary</strong> tab for sample analytics.
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your system</p>
            <div className="flex flex-wrap gap-2">
              {providers
                .filter((p) => p.id !== "csv")
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy || !p.available}
                    onClick={() => (p.available ? selectProvider(p.id) : null)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      activeId === p.id
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border bg-background text-foreground hover:bg-muted",
                      !p.available && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {p.label}
                    {!p.available && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        Soon
                      </Badge>
                    )}
                  </button>
                ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => selectProvider("csv")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  activeId === "csv"
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                CSV only
              </button>
            </div>
          </div>

          <Tabs value={mode} onValueChange={setMode} className="gap-4">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="api" className="gap-1.5" disabled={activeProvider.mode === "manual"}>
                <Cloud size={14} aria-hidden />
                API sync
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5">
                <FileSpreadsheet size={14} aria-hidden />
                Manual CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="mt-0 space-y-4">
              {activeProvider.mode === "manual" ? (
                <p className="text-sm text-muted-foreground">
                  CSV-only mode — switch to Odoo (or another API provider) above, or use the Manual CSV tab.
                </p>
              ) : !activeProvider.available ? (
                <p className="text-sm text-muted-foreground">{activeProvider.description}</p>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Plug size={16} className="text-brand" aria-hidden />
                      <p className="text-sm font-medium">{activeProvider.label} connection</p>
                      {isConnected && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 size={12} aria-hidden />
                          Ready
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{activeProvider.description}</p>
                    {activeProvider.docs && (
                      <p className="mt-1 text-xs text-muted-foreground">{activeProvider.docs}</p>
                    )}

                    {activeId === "odoo" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Odoo uses <strong className="font-medium text-foreground">XML-RPC</strong>, not a separate
                        bearer token. You need: instance URL, database name, login email, and an{" "}
                        <strong className="font-medium text-foreground">API key</strong> (Settings → Users → API Keys)
                        or password. The app reads POS/Sales order lines, customer ZIPs, and product names.
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {apiFields.map((field) => (
                        <div key={field.key} className={field.type === "password" ? "sm:col-span-2" : ""}>
                          <label htmlFor={`cred-${field.key}`} className="mb-1 block text-xs font-medium">
                            {field.label}
                            {field.required && <span className="text-destructive"> *</span>}
                          </label>
                          {field.type === "select" ? (
                            <select
                              id={`cred-${field.key}`}
                              value={form[field.key] ?? field.default ?? ""}
                              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              {(field.options || []).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={`cred-${field.key}`}
                              type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                              placeholder={field.placeholder || ""}
                              value={form[field.key] ?? ""}
                              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              autoComplete={field.type === "password" ? "off" : undefined}
                            />
                          )}
                          {field.key === "api_key" && connection.has_secret && !form.api_key && (
                            <p className="mt-1 text-xs text-muted-foreground">Saved — leave blank to keep current key.</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" disabled={busy} onClick={saveCredentials}>
                        Save connection
                      </Button>
                      <Button type="button" variant="outline" disabled={busy} onClick={testConnection}>
                        Test connection
                      </Button>
                      <Button type="button" disabled={busy} onClick={syncNow} className="gap-2">
                        <RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />
                        Sync now
                      </Button>
                    </div>
                  </div>

                  {status?.last_sync_at && (
                    <p className="text-sm text-muted-foreground">
                      Last sync: {status.last_sync_at}
                      {status.last_sync_status === "error" && status.last_sync_error && (
                        <span className="text-destructive"> — {status.last_sync_error}</span>
                      )}
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="manual" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Export from any ERP or POS. Sales order-lines are required; optional files enrich customer ZIPs,
                product names, loyalty, offers, and pricelist data.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {CSV_SLOTS.map(({ key, required }) => {
                  const meta = csvTypes[key] || {};
                  const file = csvFiles[key];
                  return (
                    <div key={key} className="rounded-xl border border-border bg-background/80 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {meta.label || key}
                            {required && <span className="text-destructive"> *</span>}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
                        </div>
                        {file && (
                          <Badge variant="secondary" className="max-w-[8rem] shrink-0 truncate" title={file.name}>
                            {file.name}
                          </Badge>
                        )}
                      </div>
                      <input
                        ref={(el) => {
                          fileRefs.current[key] = el;
                        }}
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        id={`csv-${key}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setCsvFiles((prev) => {
                            const next = { ...prev };
                            if (f) next[key] = f;
                            else delete next[key];
                            return next;
                          });
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={busy}
                        onClick={() => fileRefs.current[key]?.click()}
                      >
                        {file ? "Replace" : "Choose file"}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={busy || !csvFiles.sales} onClick={uploadBundle} className="min-h-11">
                  {busy ? "Analyzing…" : "Upload selected files"}
                </Button>
                <span className="text-xs text-muted-foreground">or</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => singleSalesRef.current?.click()}
                >
                  Single sales CSV only
                </Button>
                <input
                  ref={singleSalesRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadSingle(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div id="insights-upload-status" aria-live="polite" aria-atomic="true" className="min-w-0">
            {msg && <span className="text-sm text-leaf">{msg}</span>}
            {err && (
              <span className="text-sm text-destructive" role="alert">
                {err}
              </span>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
