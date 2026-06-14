import { ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppRefreshButton({
  onRefreshSection,
  onRefreshAll,
  sectionLabel,
  loading,
  allLoading,
}) {
  return (
    <div className="flex shrink-0 items-stretch">
      <Button
        type="button"
        onClick={onRefreshSection}
        disabled={loading}
        className="min-h-10 rounded-r-none pr-3"
      >
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden />
        <span className="hidden sm:inline">{sectionLabel}</span>
        <span className="sm:hidden">Refresh</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="default"
            disabled={allLoading}
            className="min-h-10 rounded-l-none border-l border-primary-foreground/20 px-2"
            aria-label="More refresh options"
          >
            <ChevronDown size={15} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onRefreshSection} disabled={loading}>
            Update this section
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRefreshAll} disabled={allLoading}>
            Reload all data
            <span className="ml-auto text-xs text-muted-foreground">~60s</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
