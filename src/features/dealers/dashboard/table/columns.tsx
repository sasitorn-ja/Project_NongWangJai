/* eslint-disable react-refresh/only-export-components */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/number";
import type { Dealer } from "@/features/dealers/types";
import { getDealerStatusKey, statusText } from "../lib/status";
import type { DataColumn } from "./types";

export function dealerColumn<T extends Dealer>(onOpen?: (dealer: T) => void): DataColumn<T> {
  return {
    title: "Dealer",
    dataIndex: "dealer_name",
    key: "dealer_name",
    width: 300,
    render: (_, record) => (
      <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onOpen?.(record)} type="button">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {record.dealer_name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-950">{record.dealer_name}</div>
          <div className="text-xs font-medium text-slate-500">{record.dealer_code}</div>
        </div>
      </button>
    )
  };
}

export function statusColumn<T extends { status?: unknown }>(): DataColumn<T> {
  return {
    title: "สถานะ",
    dataIndex: "status",
    key: "status",
    width: 120,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold",
          getDealerStatusKey(value) === "active" && "bg-emerald-100 text-emerald-700",
          getDealerStatusKey(value) === "idle" && "bg-amber-100 text-amber-700",
          getDealerStatusKey(value) === "new" && "bg-sky-100 text-sky-700"
        )}
      >
        {statusText(value)}
      </span>
    )
  };
}

export function regionPill(value: string) {
  return <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{value}</span>;
}

export function VolumeCell({ max, unit, value }: { max: number; unit: string; value: number }) {
  return (
    <div>
      <div className="font-semibold text-slate-950">
        {formatNumber(value)} {unit}
      </div>
      <TinyProgress percent={Math.round((value / max) * 100)} />
    </div>
  );
}

function TinyProgress({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#edf2f4]">
      <div className="h-full rounded-full bg-[#0f766e] dark:bg-[#5eead4]" style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} />
    </div>
  );
}

export function ApiErrorBanner({ message }: { message?: string }) {
  const missingCredentials = message?.includes("Missing CPAC API credentials");

  return (
    <Card className="border-amber-200 bg-amber-50/90 shadow-sm">
      <CardContent className="space-y-1 p-4">
        <div className="text-sm font-semibold text-amber-900">โหลดข้อมูลจาก API ไม่สำเร็จ</div>
        <p className="text-sm text-amber-800">{message ?? "เกิดข้อผิดพลาดระหว่างโหลดข้อมูลจาก backend"}</p>
        {missingCredentials && (
          <p className="text-xs font-medium text-amber-700">
            ตรวจสอบ Environment Variables บน Vercel ให้มี `CPAC_API_USER` และ `CPAC_API_PASSWORD`
            รวมถึง `CPAC_API_TARGET` ถ้าต้องการเปลี่ยนปลายทาง API
          </p>
        )}
      </CardContent>
    </Card>
  );
}
