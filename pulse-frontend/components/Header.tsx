"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Activity } from "lucide-react";
import { getAdmin } from "@/lib/auth";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":             "Overview",
  "/dashboard/users":       "Users",
  "/dashboard/sessions":    "Sessions",
  "/dashboard/markets":     "Markets",
  "/dashboard/predictions": "Predictions",
  "/dashboard/retention":   "Retention",
  "/dashboard/funnels":     "Funnels",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/realtime":    "Real-Time",
  "/dashboard/export":      "Export",
  "/dashboard/settings":    "Settings",
};

function getTitle(pathname: string): string {
  // Exact match
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Dynamic route e.g. /dashboard/users/42
  const segments = pathname.split("/");
  const parentPath = segments.slice(0, -1).join("/");
  if (PAGE_TITLES[parentPath]) return `${PAGE_TITLES[parentPath]} Detail`;
  return "Pulse";
}

export default function Header() {
  const pathname = usePathname();
  const admin = getAdmin();
  const title = getTitle(pathname);
  const isSubpage = pathname.split("/").length > 3;

  return (
    <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-6 h-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-text-muted">Pulse</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
          {isSubpage && (
            <>
              <span className="text-text-muted capitalize">
                {pathname.split("/")[2]}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
            </>
          )}
          <span className="text-text font-medium">{title}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            Live
          </div>

          {/* Admin avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-pulse flex items-center justify-center text-xs font-semibold text-white shadow-sm shadow-violet/20">
            {(admin?.display_name || admin?.email || "A")[0].toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
