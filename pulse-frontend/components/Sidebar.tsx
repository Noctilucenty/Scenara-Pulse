"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, MonitorPlay, BarChart3, Zap,
  RefreshCw, GitFork, Trophy, Radio, Download, Settings, LogOut, Activity,
} from "lucide-react";
import { clearAuth, getAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",             label: "Overview",      icon: LayoutDashboard },
  { href: "/dashboard/users",        label: "Users",         icon: Users },
  { href: "/dashboard/sessions",     label: "Sessions",      icon: MonitorPlay },
  { href: "/dashboard/markets",      label: "Markets",       icon: BarChart3 },
  { href: "/dashboard/predictions",  label: "Predictions",   icon: Zap },
  { href: "/dashboard/retention",    label: "Retention",     icon: RefreshCw },
  { href: "/dashboard/funnels",      label: "Funnels",       icon: GitFork },
  { href: "/dashboard/leaderboard",  label: "Leaderboard",   icon: Trophy },
  { href: "/dashboard/realtime",     label: "Real-Time",     icon: Radio },
  { href: "/dashboard/export",       label: "Export",        icon: Download },
  { href: "/dashboard/settings",     label: "Settings",      icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  // Match exact or direct children (e.g. /dashboard/users/42 matches /dashboard/users)
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = getAdmin();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const initial = (admin?.display_name || admin?.email || "A")[0].toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 flex flex-col bg-surface border-r border-border z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-pulse flex items-center justify-center shadow-lg shadow-violet/25">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold gradient-text tracking-wide">PULSE</p>
            <p className="text-[10px] text-text-muted leading-none">Scenara Analytics</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-violet/10 text-violet"
                  : "text-text-muted hover:text-text hover:bg-white/[0.03]"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-violet" : "")} />
              {label}
              {href === "/dashboard/realtime" && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green animate-pulse-slow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin footer */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-pulse flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text truncate">
              {admin?.display_name || admin?.email || "Admin"}
            </p>
            <p className="text-[10px] text-text-muted capitalize">{admin?.role || "admin"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-muted hover:text-red transition-colors opacity-0 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
