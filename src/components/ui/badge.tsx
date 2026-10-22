import * as React from "react";
import { cn } from "@/lib/utils";
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "success" && "bg-accent/15 text-accent",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "destructive" && "bg-destructive/10 text-destructive",
        variant === "secondary" && "bg-muted text-muted-foreground",
        variant === "default" && "bg-primary/10 text-primary",
        className,
      )}
      {...props}
    />
  );
}
