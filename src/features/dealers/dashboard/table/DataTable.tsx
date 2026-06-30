import { useEffect, useMemo, useState } from "react";

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
import { SortHeader } from "./SortHeader";
import type { DataColumn } from "./types";

function sortValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const numeric = Number(value.replace(/,/g, ""));
    if (Number.isFinite(numeric) && value.trim() !== "") return numeric;
    const date = Date.parse(value);
    if (Number.isFinite(date) && /[-/:T]/.test(value)) return date;
    return value.toLocaleLowerCase();
  }
  return String(value).toLocaleLowerCase();
}

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
  const [sort, setSort] = useState<{ direction: "asc" | "desc"; key: string } | null>(null);
  const sortableColumns = useMemo(
    () => new Set(columns.filter((column) => column.sortable !== false && (column.sortAccessor || column.dataIndex)).map((column) => column.key)),
    [columns]
  );
  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((item) => item.key === sort.key);
    if (!column || !sortableColumns.has(column.key)) return data;

    return [...data].sort((a, b) => {
      const accessor = column.sortAccessor ?? column.dataIndex;
      const rawA = typeof accessor === "function" ? accessor(a) : accessor ? a[accessor] : undefined;
      const rawB = typeof accessor === "function" ? accessor(b) : accessor ? b[accessor] : undefined;
      const valueA = sortValue(rawA);
      const valueB = sortValue(rawB);
      const direction = sort.direction === "asc" ? 1 : -1;

      if (typeof valueA === "number" && typeof valueB === "number") return (valueA - valueB) * direction;
      return String(valueA).localeCompare(String(valueB), "th", { numeric: true }) * direction;
    });
  }, [columns, data, sort, sortableColumns]);
  const totalPages = Math.max(Math.ceil(sortedData.length / (pageSize ?? (sortedData.length || 1))), 1);
  const rows = pageSize ? sortedData.slice((page - 1) * pageSize, page * pageSize) : sortedData;
  const fillerRowCount = !loading && pageSize && rows.length > 0 ? Math.max(pageSize - rows.length, 0) : 0;

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [data.length, pageSize, sort]);

  const toggleSort = (columnKey: string) => {
    setSort((current) => {
      if (!current || current.key !== columnKey) return { direction: "desc", key: columnKey };
      if (current.direction === "desc") return { direction: "asc", key: columnKey };
      return null;
    });
  };

  const getKey = (record: T) => {
    if (typeof rowKey === "function") return rowKey(record);
    return String(record[rowKey]);
  };

  const alignClass = (align?: DataColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-[13px]" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9] dark:border-slate-800 dark:bg-slate-900">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
	                    "border-r border-[#e5e9ec] px-3 py-2 text-[12px] font-semibold text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400",
                    alignClass(column.align)
                  )}
                  style={{ width: column.width }}
                >
                  {sortableColumns.has(column.key) ? (
                    <SortHeader
                      active={sort?.key === column.key}
                      direction={sort?.key === column.key ? sort.direction : null}
                      label={column.title}
                      onClick={() => toggleSort(column.key)}
                    />
                  ) : (
                    column.title
                  )}
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
                          "border-r border-[#edf1f2] px-3 py-2 align-middle text-slate-800 last:border-r-0 dark:border-slate-800 dark:text-slate-200",
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
                  <td key={`${column.key}-filler-${index}`} className="border-r border-[#edf1f2] px-3 py-2 last:border-r-0 dark:border-slate-800">
                    <div className="h-[34px]" />
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
          totalItems={sortedData.length}
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
