import { useEffect, useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/number";
import { buildPaginationItems } from "../lib/pagination";
import type { DataColumn } from "./types";

export function DataTable<T>({
  columns,
  data,
  loading = false,
  minWidth = 900,
  pageSize,
  rowKey
}: {
  columns: Array<DataColumn<T>>;
  data: T[];
  loading?: boolean;
  minWidth?: number;
  pageSize?: number;
  rowKey: keyof T | ((record: T) => string | number);
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(Math.ceil(data.length / (pageSize ?? (data.length || 1))), 1);
  const rows = pageSize ? data.slice((page - 1) * pageSize, page * pageSize) : data;
  const fillerRowCount = !loading && pageSize && rows.length > 0 ? Math.max(pageSize - rows.length, 0) : 0;

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [data.length, pageSize]);

  const getKey = (record: T) => {
    if (typeof rowKey === "function") return rowKey(record);
    return String(record[rowKey]);
  };

  const alignClass = (align?: DataColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9] dark:border-slate-800 dark:bg-slate-900">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "border-r border-[#e5e9ec] px-3 py-2.5 text-xs font-semibold text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400",
                    alignClass(column.align)
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={columns.length}>
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={columns.length}>
                  ไม่มีข้อมูล
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((record) => (
                <tr
                  key={getKey(record)}
                  className="border-b border-[#edf1f2] transition-colors hover:bg-[#f3faf8] dark:border-slate-800 dark:hover:bg-slate-900/70"
                >
                  {columns.map((column) => {
                    const rawValue = column.dataIndex ? record[column.dataIndex] : undefined;
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "border-r border-[#edf1f2] px-3 py-2.5 align-middle text-slate-800 last:border-r-0 dark:border-slate-800 dark:text-slate-200",
                          alignClass(column.align)
                        )}
                      >
                        {column.render ? column.render(rawValue as never, record) : String(rawValue ?? "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            {Array.from({ length: fillerRowCount }).map((_, index) => (
              <tr
                key={`filler-${index}`}
                aria-hidden="true"
                className="border-b border-[#edf1f2] dark:border-slate-800"
              >
                {columns.map((column) => (
                  <td key={`${column.key}-filler-${index}`} className="border-r border-[#edf1f2] px-3 py-2.5 last:border-r-0 dark:border-slate-800">
                    <div className="h-[45px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && (
        <ShadcnPagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={data.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

export function ShadcnPagination({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
  totalPages
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const start = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pages = buildPaginationItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-2 border-t border-[#d9e3e6] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        แสดง {formatNumber(start)}-{formatNumber(end)} จาก {formatNumber(totalItems)} รายการ
      </div>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            />
          </PaginationItem>
          {pages.map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {typeof page === "number" ? (
                <PaginationLink
                  className={cn(index > 2 && "hidden sm:inline-flex")}
                  isActive={currentPage === page}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </PaginationLink>
              ) : (
                <PaginationEllipsis className="hidden sm:flex" />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
