import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, DealerUsage, OrderItem } from "@/features/dealers/types";
import { dateText } from "../lib/dates";
import { getRegionAccent, getRegionLabel } from "../lib/regions";
import { WangjaiLogo } from "../ui/WangjaiLogo";

type NetworkDealer = Dealer & { priceCheckCount: number };

function DealerNetworkCard({
  dealer,
  accent,
  dotClass,
  onSelect,
  selected
}: {
  dealer: NetworkDealer;
    accent: "sky" | "blue" | "emerald" | "amber" | "violet" | "cyan" | "teal" | "slate";
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
	            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black uppercase", accent === "sky" && "bg-sky-50 text-sky-700", accent === "blue" && "bg-blue-50 text-blue-700", accent === "emerald" && "bg-emerald-50 text-emerald-700", accent === "amber" && "bg-amber-50 text-amber-700", accent === "violet" && "bg-violet-50 text-violet-700", accent === "cyan" && "bg-cyan-50 text-cyan-700", accent === "teal" && "bg-teal-50 text-teal-700", accent === "slate" && "bg-slate-50 text-slate-700")}>
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
          <div className="font-medium text-slate-400">ยอดรวมที่มีส่งจริง</div>
          <div className="mt-0.5 font-semibold text-slate-800">{compactNumber(dealer.volume)}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Province</div>
          <div className="mt-0.5 truncate font-semibold text-slate-800">{dealer.province || "-"}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">เช็คราคารวม</div>
          <div className="mt-0.5 font-semibold text-slate-800">{formatNumber(dealer.priceCheckCount)} ครั้ง</div>
        </div>
        <div className="col-span-2 border-t border-slate-100 pt-2">
          <div className="font-medium text-slate-400">Created at</div>
          <div className="mt-0.5 font-semibold text-slate-800">{dateText(dealer.created_at)}</div>
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
    dealers: NetworkDealer[];
    dealerCount: number;
    totalGroups: number;
    totalVolume: number;
    unit: string;
  };
}) {
  const accent = getRegionAccent(region.region);
  const accentClasses = {
    sky: "border-sky-200 text-sky-700 bg-sky-50",
    blue: "border-blue-200 text-blue-700 bg-blue-50",
    emerald: "border-emerald-200 text-emerald-700 bg-emerald-50",
	    amber: "border-amber-200 text-amber-700 bg-amber-50",
	    violet: "border-violet-200 text-violet-700 bg-violet-50",
	    cyan: "border-cyan-200 text-cyan-700 bg-cyan-50",
	    teal: "border-teal-200 text-teal-700 bg-teal-50",
    slate: "border-slate-200 text-slate-700 bg-slate-50"
  } as const;
  const dotClasses = {
    sky: "bg-sky-500",
    blue: "bg-blue-500",
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
      <div className="mx-auto mb-4 hidden h-6 w-px bg-[#b7d7f5] xl:block" />
      <div className="rounded-[22px] border border-[#a8d5ff] bg-white px-4 py-4 shadow-sm">
        <div className={cn("text-[10px] font-black tracking-[0.22em]", accentClasses[accent].split(" ")[1])}>{getRegionLabel(region.region)}</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">{region.region}</div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
          <span>{formatNumber(region.dealerCount)} dealers</span>
          <span>{formatNumber(region.totalGroups)} groups</span>
          <span>{compactNumber(region.totalVolume)} {region.unit}</span>
        </div>
      </div>

      <div className="mx-auto mt-4 hidden h-6 w-px bg-[#d9e7f7] xl:block" />
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
  usageRows,
  onSelectDealer,
  selectedDealerId
}: {
  apiState: ApiState;
  dealers: Dealer[];
  orders: OrderItem[];
  usageRows: DealerUsage[];
  onSelectDealer: (dealerId: number) => void;
  selectedDealerId: number | null;
}) {
  const priceChecksByDealer = useMemo(
    () => new Map(usageRows.map((row) => [row.dealer_id, row.price_concrete_count])),
    [usageRows]
  );

  const deliveredByDealer = useMemo(() => {
    const totals = new Map<number, { unit: string; volume: number }>();
    orders.forEach((order) => {
      const delivered = order.quantity?.delivered ?? 0;
      const current = totals.get(order.dealer_id) ?? {
        unit: "คิว",
        volume: 0
      };
      current.volume += Math.max(delivered, 0);
      totals.set(order.dealer_id, current);
    });
    return totals;
  }, [orders]);

  const uniqueDealers = useMemo(() => {
    return dealers.map((dealer) => {
      const delivered = deliveredByDealer.get(dealer.dealer_id);
      return {
        ...dealer,
        priceCheckCount: priceChecksByDealer.get(dealer.dealer_id) ?? 0,
        unit: "คิว",
        volume: delivered?.volume ?? 0
      };
    });
  }, [dealers, deliveredByDealer, priceChecksByDealer]);

  const regionColumns = useMemo(() => {
    const grouped = uniqueDealers.reduce<
      Map<
        string,
        {
          region: string;
          dealers: NetworkDealer[];
          dealerCount: number;
          totalGroups: number;
          totalVolume: number;
          unit: string;
        }
      >
    >((acc, dealer) => {
      const current =
        acc.get(dealer.region) ?? {
          region: dealer.region,
          dealers: [],
          dealerCount: 0,
          totalGroups: 0,
          totalVolume: 0,
          unit: "คิว"
        };

      current.dealers.push(dealer);
      current.dealerCount += 1;
      current.totalGroups += dealer.group_count;
      current.totalVolume += dealer.volume;
      current.unit = "คิว";
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
          <div className="mx-auto grid max-w-[720px] grid-cols-1 items-center gap-4 rounded-lg border border-sky-200 bg-gradient-to-br from-sky-600 via-blue-600 to-sky-500 px-4 py-4 text-white shadow-[0_16px_36px_rgba(14,116,214,0.22)] sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5 sm:px-5">
            <WangjaiLogo variant="full" className="mx-auto h-[92px] object-contain drop-shadow-[0_12px_18px_rgba(15,23,42,0.18)] sm:mx-0 sm:h-[120px]" />
            <div className="min-w-0 text-center">
              <div className="text-[18px] font-bold leading-tight sm:text-[24px] xl:text-[26px]">CPAC - AI วางใจ</div>
              <div className="mt-1 text-[13px] font-medium text-sky-50/95 sm:text-[16px]">Dealer Network ทั่วประเทศ</div>
              <div className="mt-4 grid grid-cols-1 gap-2 text-sky-950 sm:grid-cols-3 sm:gap-3">
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-[24px] font-bold leading-none text-sky-600">{formatNumber(totalDealers)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-slate-500">Dealers</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-[24px] font-bold leading-none text-sky-600">{formatNumber(totalGroups)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-slate-500">กลุ่ม</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-[24px] font-bold leading-none text-sky-600">{compactNumber(uniqueDealers.reduce((sum, dealer) => sum + dealer.volume, 0))} <span className="text-[12px]">คิว</span></div>
                  <div className="mt-0.5 text-[12px] font-semibold text-slate-500">ยอดรวมที่มีส่งจริง</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pb-2 xl:hidden">
        <div className="grid gap-4 px-1 sm:grid-cols-2">
          {regionColumns.map((region) => (
            <RegionNetworkColumn key={region.region} onSelectDealer={onSelectDealer} region={region} selectedDealerId={selectedDealerId} />
          ))}
        </div>
      </div>

      <div className="hidden overflow-x-auto pb-2 xl:block">
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
