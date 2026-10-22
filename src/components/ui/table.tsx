import * as React from "react";
import { cn } from "@/lib/utils";
export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}
export function TableHeader(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <thead className="bg-primary-100 text-left" {...props} />;
}
export function TableBody(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <tbody className="divide-y divide-border" {...props} />;
}
export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-primary-50", className)} {...props} />;
}
export function TableHead(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="px-3 py-3 font-semibold text-primary" {...props} />;
}
export function TableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-3 py-3" {...props} />;
}
