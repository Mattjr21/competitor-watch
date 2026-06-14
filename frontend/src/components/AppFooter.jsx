import { APP_VERSION } from "../lib/brand";

export default function AppFooter({ storeName, lastSynced }) {
  return (
    <footer className="no-print border-t border-border bg-muted/30">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6 md:py-5">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {storeName || "La Bodega Supermarket"}
          </span>
          <span className="text-muted-foreground/60"> · </span>
          Competitor Watch v{APP_VERSION}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {lastSynced && (
            <span>
              Last synced{" "}
              <time className="tabular-nums text-foreground">{lastSynced}</time>
            </span>
          )}
          <span className="text-muted-foreground/60">Weekly ads via Flipp</span>
        </div>
      </div>
    </footer>
  );
}
