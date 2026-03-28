"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, AppWindow, Users, FileText,
  Plug, AlertTriangle, Settings, LogOut,
  Zap, TrendingDown, Shield, Brain, ShieldCheck,
  ChevronLeft, ChevronRight, Sun, Moon, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const NAV = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"      },
      { href: "/apps",         icon: AppWindow,       label: "SaaS Stack"     },
      { href: "/spend",        icon: TrendingDown,    label: "Spend"          },
      { href: "/alerts",       icon: AlertTriangle,   label: "Alerts",  badge: true },
    ],
  },
  {
    section: "AI",
    items: [
      { href: "/advisor",      icon: Sparkles,        label: "AI Advisor"     },
      { href: "/redundancy",   icon: Brain,           label: "AI Insights"    },
    ],
  },
  {
    section: "Automation",
    items: [
      { href: "/offboarding",  icon: Users,           label: "Offboarding"    },
      { href: "/contracts",    icon: FileText,        label: "Contracts"      },
      { href: "/integrations", icon: Plug,            label: "Integrations"   },
    ],
  },
  {
    section: "Compliance",
    items: [
      { href: "/compliance",   icon: ShieldCheck,     label: "Compliance"     },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/settings",     icon: Settings,        label: "Settings"       },
    ],
  },
];

interface SidebarProps {
  orgName: string;
  orgPlan: string;
  userName: string;
  alertCount?: number;
}

export function Sidebar({ orgName, orgPlan, userName, alertCount }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        "relative flex flex-col flex-shrink-0 border-r border-border bg-surface h-screen sticky top-0 transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[4.5rem] z-10 w-6 h-6 rounded-full bg-elevated border border-border flex items-center justify-center text-muted hover:text-primary hover:border-accent/50 transition-colors shadow-card"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft  className="w-3 h-3" />
        }
      </button>

      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 border-b border-border flex-shrink-0",
        collapsed ? "px-3 py-5 justify-center" : "px-4 py-5"
      )}>
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-base" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-display font-bold text-sm text-primary leading-none">SaaS-Scrub</div>
            <div className="text-muted mt-0.5 uppercase tracking-wider" style={{ fontSize: "11px" }}>{orgPlan}</div>
          </div>
        )}
      </div>

      {/* Org switcher */}
      <div className={cn("border-b border-border", collapsed ? "px-2 py-3 flex justify-center" : "px-3 py-3")}>
        {collapsed ? (
          <div className="w-7 h-7 rounded bg-gradient-to-br from-info/30 to-accent/30" title={orgName} />
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-elevated cursor-pointer hover:bg-border/30 transition-colors">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-info/30 to-accent/30 flex-shrink-0" />
            <span className="text-xs text-primary font-medium truncate">{orgName}</span>
            <svg className="w-3 h-3 text-muted ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-3 space-y-4", collapsed ? "px-1.5" : "px-3")}>
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div className="px-2 mb-1.5 font-semibold text-muted uppercase tracking-widest" style={{ fontSize: "11px" }}>
                {group.section}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const count = "badge" in item && item.badge ? alertCount : 0;
                return (
                  <div key={item.href} className="relative group/nav">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded text-sm transition-colors",
                        collapsed ? "px-2.5 py-2 justify-center" : "px-2 py-2",
                        active
                          ? "text-primary bg-elevated"
                          : "text-secondary hover:text-primary hover:bg-elevated/60"
                      )}
                    >
                      {/* Left accent bar for active state */}
                      {active && (
                        <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full bg-accent" />
                      )}
                      <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && count ? (
                        <span className="bg-danger text-white font-bold px-1.5 py-0.5 rounded-full" style={{ fontSize: "11px" }}>
                          {count}
                        </span>
                      ) : null}
                      {collapsed && count ? (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-danger" />
                      ) : null}
                    </Link>

                    {/* Tooltip — collapsed only */}
                    {collapsed && (
                      <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded bg-elevated border border-border text-xs text-primary whitespace-nowrap shadow-card z-50 pointer-events-none opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                        {item.label}
                        {count ? <span className="ml-1.5 bg-danger text-white rounded-full px-1 py-0.5" style={{ fontSize: "10px" }}>{count}</span> : null}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI badge */}
      {collapsed ? (
        <div className="flex justify-center mx-1.5 mb-3">
          <div className="relative group/ai w-8 h-8 rounded bg-accent-dim border border-accent/20 flex items-center justify-center cursor-default">
            <Zap className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded bg-elevated border border-border text-xs text-accent whitespace-nowrap shadow-card z-50 pointer-events-none opacity-0 group-hover/ai:opacity-100 transition-opacity">
              AI Pilot Active — 3 queued
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-3 mb-3 px-3 py-2.5 rounded bg-accent-dim border border-accent/20">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-accent">AI Pilot Active</div>
              <div className="text-accent/60 mt-0.5" style={{ fontSize: "11px" }}>3 actions queued</div>
            </div>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className={cn("border-t border-border", collapsed ? "px-1.5 py-3 flex flex-col items-center gap-2" : "px-3 py-3")}>
        {collapsed ? (
          <>
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center justify-center w-8 h-8 rounded text-muted hover:text-primary hover:bg-elevated transition-colors"
            >
              {theme === "dark"
                ? <Sun  className="w-3.5 h-3.5" aria-hidden="true" />
                : <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              }
            </button>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                aria-label="Sign out"
                className="flex items-center justify-center w-8 h-8 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/40 to-info/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-primary truncate">{userName}</div>
                <div className="text-muted" style={{ fontSize: "11px" }}>Admin</div>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="flex items-center justify-center w-8 h-8 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </form>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-elevated transition-colors group"
            >
              <div className="w-7 h-4 rounded-full border border-border bg-elevated relative flex-shrink-0 transition-colors group-hover:border-secondary">
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200",
                  theme === "light"
                    ? "left-[14px] bg-accent"
                    : "left-0.5 bg-muted"
                )} />
              </div>
              <span className="text-xs text-muted group-hover:text-secondary transition-colors">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
              {theme === "dark"
                ? <Moon className="w-3 h-3 text-muted ml-auto" />
                : <Sun  className="w-3 h-3 text-warning ml-auto" />
              }
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
