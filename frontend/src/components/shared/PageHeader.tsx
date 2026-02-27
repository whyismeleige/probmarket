// components/shared/PageHeader.tsx
// Consistent page header used across all dashboard pages.
// Provides a uniform title + subtitle + optional right-side slot + optional grid background.

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Icon shown in the coloured pill left of the title */
  icon?: LucideIcon;
  /** Accent colour class for the icon background (e.g. "bg-primary/10 text-primary") */
  iconClass?: string;
  title: string;
  subtitle?: string;
  /** Optional content floated to the right (e.g. buttons, badges) */
  actions?: React.ReactNode;
  /** Extra content rendered below title/subtitle row (e.g. stat pills) */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconClass = "bg-primary/10 border-primary/20 text-primary",
  title,
  subtitle,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative border-b border-border/60 overflow-hidden",
        className,
      )}
    >
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, currentColor, currentColor 1px, transparent 1px, transparent 40px)`,
        }}
      />

      <div className="relative px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          {/* Left: icon + title */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-xl border",
                  iconClass,
                )}
              >
                <Icon className="size-4" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>

        {/* Extra row (stat pills, filters, etc.) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}