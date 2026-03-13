import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  opts: { compact?: boolean; decimals?: number } = {}
) {
  if (opts.compact && Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (opts.compact && Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 0) {
  return `${value.toFixed(decimals)}%`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function utilization(active: number, total: number) {
  if (total === 0) return 0;
  return Math.round((active / total) * 100);
}

export function categorizeSeverity(utilizationPct: number): "critical" | "warning" | "ok" {
  if (utilizationPct < 30) return "critical";
  if (utilizationPct < 60) return "warning";
  return "ok";
}

export const APP_CATEGORIES = [
  "communication",
  "design",
  "dev",
  "productivity",
  "hr",
  "finance",
  "security",
  "analytics",
  "other",
] as const;

export type AppCategory = (typeof APP_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<AppCategory, string> = {
  communication: "#2ed9ff",
  design:        "#ff6b9d",
  dev:           "#a78bfa",
  productivity:  "#00d97e",
  hr:            "#ffb142",
  finance:       "#00d97e",
  security:      "#ff4757",
  analytics:     "#38bdf8",
  other:         "#8892a0",
};
