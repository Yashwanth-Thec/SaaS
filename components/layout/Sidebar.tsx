"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, AppWindow, Users, FileText,
  Plug, AlertTriangle, Settings, LogOut,
  Zap, TrendingDown, Shield, Brain, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"      },
      { href: "/apps",         icon: AppWindow,       label: "SaaS Stack"     },
      { href: "/spend",        icon: TrendingDown,    label: "Spend"          },
      { href: "/alerts",       icon: AlertTriangle,   label: "Alerts",  badge: 3 },
    ],
  },
  {
    section: "AI",
    items: [
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
}

export function Sidebar({ orgName, orgPlan, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 flex-shrink-0 border-r border-border bg-surface h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-base" />
        </div>
        <div>
          <div className="font-display font-bold text-sm text-primary leading-none">SaaS-Scrub</div>
          <div className="text-2xs text-muted mt-0.5 uppercase tracking-wider">{orgPlan}</div>
        </div>
      </div>

      {/* Org switcher */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-elevated cursor-pointer hover:bg-border/30 transition-colors">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-info/30 to-accent/30 flex-shrink-0" />
          <span className="text-xs text-primary font-medium truncate">{orgName}</span>
          <svg className="w-3 h-3 text-muted ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-2 mb-1.5 text-2xs font-semibold text-muted uppercase tracking-widest">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-item", active && "active")}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="bg-danger text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI badge */}
      <div className="mx-3 mb-3 px-3 py-2.5 rounded bg-accent-dim border border-accent/20">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-accent">AI Pilot Active</div>
            <div className="text-2xs text-accent/60 mt-0.5">3 actions queued</div>
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/40 to-info/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-primary truncate">{userName}</div>
            <div className="text-2xs text-muted">Admin</div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-muted hover:text-danger transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
