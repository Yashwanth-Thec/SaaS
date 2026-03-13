"use client";
import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="font-display font-bold text-lg text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            placeholder="Search apps, people..."
            className="bg-elevated border border-border rounded pl-8 pr-3 py-1.5 text-xs text-primary placeholder:text-muted
                       focus:outline-none focus:border-accent/50 w-52 transition-all"
          />
        </div>
        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded hover:bg-elevated text-secondary hover:text-primary transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
}
