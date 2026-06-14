import {
  BarChart3,
  CloudSun,
  LayoutDashboard,
  Store,
  TrendingUp,
  Upload,
} from "lucide-react";
import { APP_ICON_SRC } from "@/lib/brand";
import { APP_NAV } from "@/lib/nav";
import { TAG_BADGE } from "@/lib/sectionUi";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ICONS = {
  home: LayoutDashboard,
  weather: CloudSun,
  deals: Store,
  insights: BarChart3,
  trending: TrendingUp,
};

function dealsNavTooltip(label, dealsBadge, nationalRankReady) {
  const parts = [label];
  if (dealsBadge != null) {
    if (dealsBadge === "updating") parts.push("updating ad scan…");
    else parts.push(`${dealsBadge} competitor ads`);
  }
  if (nationalRankReady) parts.push("national rank available");
  return parts.join(" — ");
}

export default function AppSidebar({
  activeTab,
  onTabChange,
  dealsBadge,
  nationalRankReady = false,
  onUploadGuide,
}) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <img
            src={APP_ICON_SRC}
            alt="La Bodega Supermercado y Restaurante"
            className="size-10 shrink-0 rounded-full object-contain ring-1 ring-border"
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-display text-sm font-bold tracking-tight text-sidebar-foreground">
              Competitor Watch
            </p>
            <p className="truncate text-xs text-muted-foreground">La Bodega · Calhoun, GA</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {APP_NAV.map((item) => {
                const Icon = NAV_ICONS[item.id];
                const isDeals = item.id === "deals";
                const badge =
                  isDeals && dealsBadge != null
                    ? dealsBadge === "updating"
                      ? "…"
                      : String(dealsBadge)
                    : null;
                const tooltip = isDeals
                  ? dealsNavTooltip(item.label, dealsBadge, nationalRankReady)
                  : item.label;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => onTabChange(item.id)}
                      tooltip={tooltip}
                      aria-current={activeTab === item.id ? "page" : undefined}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {isDeals && dealsBadge != null && dealsBadge !== "updating" && (
                        <span className="ml-auto hidden text-[10px] font-medium tabular-nums text-muted-foreground group-data-[collapsible=icon]:hidden">
                          {dealsBadge} ads
                        </span>
                      )}
                      {isDeals && nationalRankReady && (
                        <span className={"ml-auto hidden group-data-[collapsible=icon]:hidden " + TAG_BADGE} title="National price ranking available">
                          Nat
                        </span>
                      )}
                    </SidebarMenuButton>
                    {badge && (
                      <SidebarMenuBadge
                        className="tabular-nums"
                        title={
                          dealsBadge === "updating"
                            ? "Updating competitor ads"
                            : `${dealsBadge} competitor ads in benchmark market`
                        }
                      >
                        {badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onUploadGuide} tooltip="Sales summary and data connect">
              <Upload />
              <span>Connect store data</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
