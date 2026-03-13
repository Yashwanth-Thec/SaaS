import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  const variants = {
    default:  "bg-border/50 text-secondary",
    success:  "bg-accent/10 text-accent border border-accent/20",
    warning:  "bg-warning/10 text-warning border border-warning/20",
    danger:   "bg-danger/10 text-danger border border-danger/20",
    info:     "bg-info/10 text-info border border-info/20",
    neutral:  "bg-elevated text-muted border border-border",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-2xs font-medium",
    md: "px-2.5 py-1 text-xs font-medium",
  };

  return (
    <span className={cn("inline-flex items-center rounded uppercase tracking-wider", variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    active:       { label: "Active",        variant: "success"  },
    flagged:      { label: "Flagged",       variant: "warning"  },
    zombie:       { label: "Zombie",        variant: "danger"   },
    cancelled:    { label: "Cancelled",     variant: "neutral"  },
    under_review: { label: "Under Review",  variant: "info"     },
    connected:    { label: "Connected",     variant: "success"  },
    pending:      { label: "Pending",       variant: "warning"  },
    error:        { label: "Error",         variant: "danger"   },
    disconnected: { label: "Disconnected",  variant: "neutral"  },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={variant}>{label}</Badge>;
}
