import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className, elevated, glow, style }: CardProps) {
  return (
    <div
      className={cn(
        elevated ? "card-elevated" : "card",
        glow && "shadow-glow",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between px-5 pt-5 pb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn("font-display font-semibold text-sm text-primary tracking-tight", className)}
    >
      {children}
    </h3>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}
