import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hide on small screens to keep tables readable. */
  hideBelow?: "sm" | "md" | "lg";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

const hideClass = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

/** Admin table. Rows are fully clickable when rowHref is set (first cell holds the real link). */
export function DataTable<T>({ columns, rows, rowKey, rowHref, empty, caption, className }: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <div className={cn("edge surface rounded-card", className)}>{empty}</div>;

  return (
    <div className={cn("edge surface overflow-hidden rounded-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.875rem]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-white/[0.07]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-micro font-semibold uppercase tracking-[0.08em] text-fg-3 first:pl-5 last:pr-5",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.hideBelow && hideClass[col.hideBelow],
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "group border-b border-white/[0.05] transition-colors last:border-0",
                    href && "relative cursor-pointer hover:bg-white/[0.035]",
                  )}
                >
                  {columns.map((col, index) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5 align-middle text-fg-2 first:pl-5 last:pr-5",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.hideBelow && hideClass[col.hideBelow],
                        col.className,
                      )}
                    >
                      {index === 0 && href ? (
                        <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-accent-2/70">
                          {col.cell(row)}
                        </Link>
                      ) : (
                        col.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
