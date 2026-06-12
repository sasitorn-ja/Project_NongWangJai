import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { getRegionAccent, getRegionLabel } from "../lib/regions";
import { WangjaiLogo } from "../ui/WangjaiLogo";

function DealerNetworkCard({
  dealer,
  accent,
  dotClass,
  onSelect,
  selected
}: {
  dealer: Dealer;
    accent: "sky" | "emerald" | "amber" | "violet" | "cyan" | "teal" | "slate";
  dotClass: string;
  onSelect: (dealerId: number) => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-2xl border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-200",
        selected ? "border-sky-300 bg-sky-50/80 ring-2 ring-sky-100" : "border-[#d9e3e6] bg-white"
      )}
      onClick={() => onSelect(dealer.dealer_id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
	            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black uppercase", accent === "sky" && "bg-sky-50 text-sky-700", accent === "emerald" && "bg-emerald-50 text-emerald-700", accent === "amber" && "bg-amber-50 text-amber-700", accent === "violet" && "bg-violet-50 text-violet-700", accent === "cyan" && "bg-cyan-50 text-cyan-700", accent === "teal" && "bg-teal-50 text-teal-700", accent === "slate" && "bg-slate-50 text-slate-700")}>
              {dealer.dealer_name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{dealer.dealer_name}</div>
              <div className="text-[11px] font-medium text-slate-500">{dealer.dealer_code}</div>
            </div>
          </div>
        </div>
        <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <div>
          <div className="font-medium text-slate-400">Groups</div>
          <div className="mt-0.5 font-semibold text-slate-800">{formatNumber(dealer.group_count)}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Delivered Volume</div>
          <div className="mt-0.5 font-semibold text-slate-800">{compactNumber(dealer.volume)}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Province</div>
          <div className="mt-0.5 truncate font-semibold text-slate-800">{dealer.province || "-"}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Unit</div>
          <div className="mt-0.5 font-semibold text-slate-800">{dealer.unit || "m3"}</div>
        </div>
      </div>

      <div className={cn("mt-3 rounded-xl px-3 py-2 text-center text-[11px] font-bold", selected ? "bg-sky-600 text-white" : "bg-slate-50 text-sky-700")}>
        {selected ? "กำลังดูใน Dealer Analysis" : "ดู Dealer Analysis"}
      </div>
    </button>
  );
}

function RegionNetworkColumn({
  onSelectDealer,
  region,
  selectedDealerId
}: {
  onSelectDealer: (dealerId: number) => void;
  selectedDealerId: number | null;
  region: {
    region: string;
    dealers: Dealer[];
    dealerCount: number;
    totalGroups: number;
    totalVolume: number;
  };
}) {
  const accent = getRegionAccent(region.region);
  const accentClasses = {
    sky: "border-sky-200 text-sky-700 bg-sky-50",
    emerald: "border-emerald-200 text-emerald-700 bg-emerald-50",
	    amber: "border-amber-200 text-amber-700 bg-amber-50",
	    violet: "border-violet-200 text-violet-700 bg-violet-50",
	    cyan: "border-cyan-200 text-cyan-700 bg-cyan-50",
	    teal: "border-teal-200 text-teal-700 bg-teal-50",
    slate: "border-slate-200 text-slate-700 bg-slate-50"
  } as const;
  const dotClasses = {
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
	    amber: "bg-amber-500",
	    violet: "bg-violet-500",
	    cyan: "bg-cyan-500",
	    teal: "bg-teal-500",
    slate: "bg-slate-500"
  } as const;
  const [expanded, setExpanded] = useState(false);
  const visibleDealers = expanded ? region.dealers : region.dealers.slice(0, 6);
  const hiddenCount = Math.max(region.dealers.length - 6, 0);

  return (
    <div className="relative">
      <div className="mx-auto mb-4 h-6 w-px bg-[#b7d7f5]" />
      <div className="rounded-[22px] border border-[#a8d5ff] bg-white px-4 py-4 shadow-sm">
        <div className={cn("text-[10px] font-black tracking-[0.22em]", accentClasses[accent].split(" ")[1])}>{getRegionLabel(region.region)}</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">{region.region}</div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
          <span>{formatNumber(region.dealerCount)} dealers</span>
          <span>{formatNumber(region.totalGroups)} groups</span>
          <span>{compactNumber(region.totalVolume)} m3</span>
        </div>
      </div>

      <div className="mx-auto mt-4 h-6 w-px bg-[#d9e7f7]" />
      <div className="space-y-3">
        {visibleDealers.map((dealer) => (
          <DealerNetworkCard
            key={dealer.dealer_id}
            accent={accent}
            dealer={dealer}
            dotClass={dotClasses[accent]}
            onSelect={onSelectDealer}
            selected={selectedDealerId === dealer.dealer_id}
          />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="w-full rounded-2xl border border-dashed border-[#cfe0ef] bg-white/80 px-4 py-3 text-center text-xs font-semibold text-slate-500 transition-colors hover:border-[#9ec5ea] hover:bg-sky-50 hover:text-sky-700"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "ย่อรายการ" : `และอีก ${formatNumber(hiddenCount)} dealers`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function NetworkPage({
  apiState,
  dealers,
  orders,
  onSelectDealer,
  selectedDealerId
}: {
  apiState: ApiState;
  dealers: Dealer[];
  orders: OrderItem[];
  onSelectDealer: (dealerId: number) => void;
  selectedDealerId: number | null;
}) {
  const deliveredByDealer = useMemo(() => {
    const totals = new Map<number, { unit: string; volume: number }>();
    orders.forEach((order) => {
      const delivered = order.quantity?.delivered ?? 0;
      if (delivered <= 0) return;
      const current = totals.get(order.dealer_id) ?? {
        unit: order.quantity?.unit || "m3",
        volume: 0
      };
      current.volume += delivered;
      totals.set(order.dealer_id, current);
    });
    return totals;
  }, [orders]);

  const uniqueDealers = useMemo(() => {
    const byIdentity = new Map<string, Dealer>();

    dealers.forEach((dealer) => {
      const delivered = deliveredByDealer.get(dealer.dealer_id);
      const dealerWithDelivered = {
        ...dealer,
        unit: delivered?.unit || dealer.unit,
        volume: delivered?.volume ?? 0
      };
      const identity =
        dealer.dealer_code?.trim() ||
        `${dealer.dealer_name?.trim() || "unknown"}::${dealer.region?.trim() || "-"}::${dealer.province?.trim() || "-"}`;
      const current = byIdentity.get(identity);
      if (!current) {
        byIdentity.set(identity, dealerWithDelivered);
        return;
      }

      byIdentity.set(identity, {
        ...current,
        ...dealerWithDelivered,
        dealer_id: current.dealer_id || dealer.dealer_id,
        dealer_code: current.dealer_code || dealer.dealer_code,
        dealer_name: current.dealer_name || dealer.dealer_name,
        region_id: current.region_id || dealer.region_id,
        region: current.region || dealer.region,
        province_id: current.province_id || dealer.province_id,
        province: current.province || dealer.province,
        group_count: current.group_count + dealer.group_count,
        volume: current.volume + dealerWithDelivered.volume,
        unit: current.unit || dealerWithDelivered.unit,
        last_active_days: current.last_active_days ?? dealer.last_active_days,
        last_active_at: current.last_active_at ?? dealer.last_active_at,
        created_at: current.created_at ?? dealer.created_at,
        updated_at: current.updated_at ?? dealer.updated_at,
        status: current.status ?? dealer.status
      });
    });

    return Array.from(byIdentity.values());
  }, [dealers, deliveredByDealer]);

  const regionColumns = useMemo(() => {
    const grouped = uniqueDealers.reduce<
      Map<
        string,
        {
          region: string;
          dealers: Dealer[];
          dealerCount: number;
          totalGroups: number;
          totalVolume: number;
        }
      >
    >((acc, dealer) => {
      const current =
        acc.get(dealer.region) ?? {
          region: dealer.region,
          dealers: [],
          dealerCount: 0,
          totalGroups: 0,
          totalVolume: 0
        };

      current.dealers.push(dealer);
      current.dealerCount += 1;
      current.totalGroups += dealer.group_count;
      current.totalVolume += dealer.volume;
      acc.set(dealer.region, current);
      return acc;
    }, new Map());

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        dealers: [...item.dealers].sort((a, b) => b.volume - a.volume)
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume);
  }, [uniqueDealers]);

  const totalDealers = uniqueDealers.length;
  const totalGroups = uniqueDealers.reduce((sum, dealer) => sum + dealer.group_count, 0);
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-0 bg-transparent shadow-none">
        <CardContent className="px-0 pt-0">
          <div className="mx-auto grid max-w-[720px] grid-cols-[112px_minmax(0,1fr)] items-center gap-5 rounded-lg border border-sky-200 bg-gradient-to-br from-sky-600 via-blue-600 to-sky-500 px-5 py-4 text-white shadow-[0_16px_36px_rgba(14,116,214,0.22)]">
            <WangjaiLogo variant="full" className="h-[120px] object-contain drop-shadow-[0_12px_18px_rgba(15,23,42,0.18)]" />
            <div className="min-w-0 text-center">
              <div className="text-[26px] font-bold leading-tight">CPAC - AI วางใจ</div>
              <div className="mt-1 text-[16px] font-medium text-sky-50/95">Dealer Network ทั่วประเทศ</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sky-950">
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-[24px] font-bold leading-none text-sky-600">{formatNumber(totalDealers)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-slate-500">Dealers</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-[24px] font-bold leading-none text-sky-600">{formatNumber(totalGroups)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-slate-500">กลุ่ม</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-[24px] font-bold leading-none text-sky-600">{compactNumber(uniqueDealers.reduce((sum, dealer) => sum + dealer.volume, 0))}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-slate-500">Delivered m3</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[1180px] px-1">
          <div className="mx-auto h-8 w-px bg-[#b7d7f5]" />
          <div className="h-px w-full bg-[#b7d7f5]" />
          <div className="grid gap-4 pt-6" style={{ gridTemplateColumns: `repeat(${Math.max(regionColumns.length, 1)}, minmax(0, 1fr))` }}>
            {regionColumns.map((region) => (
              <RegionNetworkColumn key={region.region} onSelectDealer={onSelectDealer} region={region} selectedDealerId={selectedDealerId} />
            ))}
          </div>
        </div>
      </div>

      {apiState === "loading" ? (
        <div className="rounded-2xl border border-dashed border-[#d9e3e6] bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">
          กำลังโหลดข้อมูล dealer network...
        </div>
      ) : null}
      {apiState !== "loading" && !regionColumns.length ? (
        <div className="rounded-2xl border border-dashed border-[#d9e3e6] bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">
          ไม่มีข้อมูล dealer สำหรับสร้างแผนผัง
        </div>
      ) : null}
    </section>
  );
}
