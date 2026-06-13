import { useState } from "react";
import { Search } from "lucide-react";
import DealCard from "./DealCard";
import { EmptyState } from "../lib/ui";
import { PANEL } from "../lib/sectionUi";

const API = import.meta.env.VITE_API_URL || "";

export default function DealSearchPanel({ zips = "", searchHints = [], latinoOnly = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runSearch(term) {
    const q = (term ?? query).trim();
    if (q.length < 2) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (zips) params.set("zips", zips);
      if (latinoOnly) params.set("latino", "1");
      const res = await fetch(`${API}/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);
      setResults(data.results || []);
    } catch (e) {
      setError(e.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={PANEL + " space-y-4 p-4 sm:p-5"}>
      <div>
        <label htmlFor="flipp-search" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Search weekly ads
        </label>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
              aria-hidden
            />
            <input
              id="flipp-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Product name — e.g. chorizo, maseca, carne asada"
              className="toolbar-control w-full pl-11 text-white placeholder:text-white/45 outline-none focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="toolbar-control shrink-0 justify-center disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search ads"}
          </button>
        </form>
        {searchHints.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Popular searches">
            {searchHints.slice(0, 8).map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => runSearch(hint)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      {results && (
        <div>
          <p className="mb-3 text-sm text-white/55">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
          {results.length === 0 ? (
            <EmptyState>No ads found — try another term or market ZIP.</EmptyState>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 p-0 sm:grid-cols-[repeat(auto-fill,minmax(188px,1fr))]">
              {results.map((deal, i) => (
                <li key={`${deal.merchant}-${deal.name}-${i}`}>
                  <DealCard d={deal} compact showMerchant />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
