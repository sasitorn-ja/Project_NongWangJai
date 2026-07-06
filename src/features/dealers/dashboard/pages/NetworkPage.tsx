import { useMemo, useState } from "react";
import { Layers, PackagePlus, ShoppingCart, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import mascotImage from "@/assets/mascot/nong-wangjai.png";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { Dealer } from "@/features/dealers/types";
import { useDashboardOutletContext } from "../DealerDashboardApp";
import { dateText } from "../lib/dates";
import { getRegionAccent, getRegionLabel } from "../lib/regions";

type NetworkDealer = Dealer & {
  bookedVolume: number;
  priceCheckCount: number;
};

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
          <div className="font-medium text-slate-400">ยอดส่งจริง</div>
          <div className="mt-0.5 font-semibold text-sky-700">{compactNumber(dealer.volume)}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">ยอดรวมที่สั่งจอง</div>
          <div className="mt-0.5 font-semibold text-amber-700">{compactNumber(dealer.bookedVolume)}</div>
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
    totalBookedVolume: number;
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
          <span className="text-amber-600">จอง {compactNumber(region.totalBookedVolume)} {region.unit}</span>
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

export function NetworkPage() {
  const { data, onSelectDealer } = useDashboardOutletContext();
  const { apiState, filteredDealers: dealers, ordersInDateRange: orders, filteredUsageRows: usageRows, selectedDealerId } = data;
  const priceChecksByDealer = useMemo(
    () => new Map(usageRows.map((row) => [row.dealer_id, row.price_concrete_count])),
    [usageRows]
  );

  const deliveredByDealer = useMemo(() => {
    const totals = new Map<number, { unit: string; bookedVolume: number; volume: number }>();
    orders.forEach((order) => {
      const currentStatus = String(order.status?.order ?? "").trim().toUpperCase();
      if (currentStatus === "C") return;

      const initialOrdered = order.quantity?.initial_ordered ?? 0;
      const delivered = order.quantity?.delivered ?? 0;
      const current = totals.get(order.dealer_id) ?? {
        unit: "คิว",
        bookedVolume: 0,
        volume: 0
      };
      current.bookedVolume += Math.max(initialOrdered, 0);
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
        bookedVolume: delivered?.bookedVolume ?? 0,
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
          totalBookedVolume: number;
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
          totalBookedVolume: 0,
          totalVolume: 0,
          unit: "คิว"
        };

      current.dealers.push(dealer);
      current.dealerCount += 1;
      current.totalGroups += dealer.group_count;
      current.totalBookedVolume += dealer.bookedVolume;
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
  const totalBookedVolume = uniqueDealers.reduce((sum, dealer) => sum + dealer.bookedVolume, 0);
  const totalVolume = uniqueDealers.reduce((sum, dealer) => sum + dealer.volume, 0);
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-0 bg-transparent shadow-none">
        <CardContent className="px-0 pt-0">
          <div className="relative w-full rounded-[24px] bg-gradient-to-r from-[#004ee0] via-[#026ff6] to-[#b302f6] p-6 text-white shadow-[0_16px_36px_rgba(0,107,240,0.18)] overflow-hidden min-h-[220px] flex items-center">
            {/* Curved abstract highlights on the left */}
            <div className="absolute left-[-10%] top-[-30%] w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none z-0" />
            <div className="absolute left-[-5%] bottom-[-10%] w-[250px] h-[250px] rounded-full bg-cyan-400/20 blur-2xl pointer-events-none z-0" />

            {/* Thailand map mesh graphic on the right */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[240px] h-[200px] opacity-80 pointer-events-none z-0 hidden lg:block">
              <svg viewBox="0 0 120 180" className="h-full w-full object-contain">
                {/* Thailand Map Path Silhouette (Stylized mesh) */}
                <path d="M45,15 L65,10 L75,25 L60,40 L40,35 Z" fill="none" stroke="#00d0ff" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />
                <path d="M60,40 L95,35 L105,65 L85,85 L65,65 Z" fill="none" stroke="#00d0ff" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />
                <path d="M40,35 L60,40 L65,65 L55,90 L35,80 Z" fill="none" stroke="#00d0ff" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />
                <path d="M55,90 L75,95 L70,110 L50,105 Z" fill="none" stroke="#00d0ff" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />
                <path d="M42,90 L48,105 L40,120 L35,140 L28,160 L35,175 L30,175 L22,155 L28,135 L35,115 Z" fill="none" stroke="#00d0ff" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />

                {/* Grid nodes */}
                <circle cx="50" cy="18" r="1.5" fill="#00d0ff" />
                <circle cx="68" cy="14" r="1.5" fill="#00d0ff" />
                <circle cx="58" cy="30" r="1.5" fill="#00d0ff" />
                <circle cx="78" cy="28" r="2" fill="#00e1ff" />
                <circle cx="92" cy="40" r="1.5" fill="#00d0ff" />
                <circle cx="68" cy="50" r="1.5" fill="#00d0ff" />
                <circle cx="82" cy="58" r="2" fill="#00e1ff" />
                <circle cx="100" cy="62" r="1.5" fill="#00d0ff" />
                <circle cx="48" cy="42" r="1.5" fill="#00d0ff" />
                <circle cx="52" cy="68" r="2" fill="#00e1ff" />
                <circle cx="62" cy="82" r="1.5" fill="#00d0ff" />
                <circle cx="44" cy="94" r="1.5" fill="#00d0ff" />
                <circle cx="60" cy="102" r="2" fill="#00e1ff" />
                <circle cx="42" cy="115" r="1.5" fill="#00d0ff" />
                <circle cx="36" cy="132" r="1.5" fill="#00d0ff" />
                <circle cx="28" cy="150" r="2" fill="#00e1ff" />
                <circle cx="32" cy="168" r="1.5" fill="#00d0ff" />
                <circle cx="28" cy="176" r="1.5" fill="#00d0ff" />

                {/* Connection lines between nodes */}
                <line x1="50" y1="18" x2="68" y2="14" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="50" y1="18" x2="58" y2="30" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="68" y1="14" x2="78" y2="28" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="58" y1="30" x2="78" y2="28" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="78" y1="28" x2="92" y2="40" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="58" y1="30" x2="68" y2="50" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="68" y1="50" x2="82" y2="58" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="82" y1="58" x2="92" y2="40" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="82" y1="58" x2="100" y2="62" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="48" y1="42" x2="58" y2="30" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="48" y1="42" x2="52" y2="68" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="52" y1="68" x2="68" y2="50" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="52" y1="68" x2="62" y2="82" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="62" y1="82" x2="82" y2="58" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="62" y1="82" x2="60" y2="102" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="44" y1="94" x2="52" y2="68" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="44" y1="94" x2="62" y2="82" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="44" y1="94" x2="42" y2="115" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="42" y1="115" x2="60" y2="102" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="42" y1="115" x2="36" y2="132" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="36" y1="132" x2="28" y2="150" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="28" y1="150" x2="32" y2="168" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
                <line x1="32" y1="168" x2="28" y2="176" stroke="#ffffff" strokeWidth="0.3" opacity="0.4" />
              </svg>
            </div>

            {/* Mascot on the left */}
            <img
              src={mascotImage}
              alt="น้องวางใจ"
              className="absolute left-6 bottom-0 h-[210px] w-auto object-contain object-bottom z-10 hidden lg:block drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
            />

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 lg:pl-[180px] w-full text-center">
              {/* Title */}
              <h1 className="text-[28px] sm:text-[36px] font-black tracking-tight text-white drop-shadow-sm leading-none">
                CPAC - AI วางใจ
              </h1>

              {/* Subtitle with lines and dots */}
              <div className="mt-2.5 flex items-center justify-center gap-3 text-xs sm:text-[14px] font-bold text-white/95">
                <span className="h-px w-8 bg-cyan-400 opacity-80" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="tracking-wide">Dealer Network ทั่วประเทศ</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="h-px w-8 bg-cyan-400 opacity-80" />
              </div>

              {/* 5 KPI Cards */}
              <div className="mt-6 flex flex-wrap justify-center items-stretch gap-3.5 w-full">
                {/* 1. Dealers */}
                <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-md min-w-[130px] flex-1 max-w-[160px] border border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-[#006bf0] flex items-center justify-center shrink-0">
                    <Users size={20} className="fill-current" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[22px] font-extrabold leading-none text-[#006bf0]">{formatNumber(totalDealers)}</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400 tracking-wide">Dealers</div>
                  </div>
                </div>

                {/* 2. Groups */}
                <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-md min-w-[130px] flex-1 max-w-[160px] border border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-purple-50 text-[#8b5cf6] flex items-center justify-center shrink-0">
                    <Layers size={19} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[22px] font-extrabold leading-none text-[#8b5cf6]">{formatNumber(totalGroups)}</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400 tracking-wide">กลุ่ม</div>
                  </div>
                </div>

                {/* 3. Booked Volume */}
                <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-md min-w-[145px] flex-1 max-w-[190px] border border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-amber-50 text-[#d97706] flex items-center justify-center shrink-0">
                    <PackagePlus size={19} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[22px] font-extrabold leading-none text-[#d97706]">
                      {compactNumber(totalBookedVolume)} <span className="text-[12px] font-bold text-[#d97706]/80">คิว</span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400 tracking-wide">ยอดรวมที่สั่งจอง</div>
                  </div>
                </div>

                {/* 4. Delivered Volume */}
                <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-md min-w-[145px] flex-1 max-w-[190px] border border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-sky-50 text-[#0284c7] flex items-center justify-center shrink-0">
                    <ShoppingCart size={19} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[22px] font-extrabold leading-none text-[#006bf0]">
                      {compactNumber(totalVolume)} <span className="text-[12px] font-bold text-[#006bf0]/80">คิว</span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400 tracking-wide">ยอดรวมที่มีส่งจริง</div>
                  </div>
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
