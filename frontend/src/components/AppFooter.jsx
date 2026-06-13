import { APP_VERSION } from "../lib/brand";

export default function AppFooter({ storeName, lastSynced, onUploadGuide }) {
  return (
    <footer className="no-print border-t border-white/10 bg-ink-2/50">
      <div className="app-shell flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-5">
        <div className="text-xs text-white/50">
          <span className="font-medium text-white/70">
            {storeName || "La Bodega Supermarket"}
          </span>
          <span className="text-white/35"> · </span>
          Competitor Watch v{APP_VERSION}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
          {lastSynced && (
            <span>
              Last synced{" "}
              <time className="tabular-nums text-white/70">{lastSynced}</time>
            </span>
          )}
          <button
            type="button"
            onClick={onUploadGuide}
            className="font-medium text-sky underline-offset-2 transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
          >
            Upload guide
          </button>
          <span className="text-white/35">Weekly ads via Flipp</span>
        </div>
      </div>
    </footer>
  );
}
