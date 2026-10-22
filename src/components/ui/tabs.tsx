import * as React from "react";
import { cn } from "@/lib/utils";
export function Tabs({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />;
}
export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("inline-flex gap-1 rounded-lg bg-muted p-1", className)}
      {...props}
    />
  );
}
export function TabsTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium hover:bg-background",
        className,
      )}
      {...props}
    />
  );
}
