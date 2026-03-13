"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium rounded transition-all duration-150 focus-accent select-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-accent text-base hover:bg-accent-hover active:scale-[0.98] shadow-glow-sm",
      secondary:
        "bg-elevated border border-border text-primary hover:border-secondary hover:bg-surface",
      ghost:
        "text-secondary hover:text-primary hover:bg-elevated",
      danger:
        "bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20",
      outline:
        "border border-border text-primary hover:border-accent hover:text-accent",
    };

    const sizes = {
      xs: "px-2.5 py-1 text-xs",
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            {children}
          </>
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";
