import { Sparkles } from "lucide-react";

// Chat icon matching the mockup: two overlapping speech bubbles, filled blue,
// with three dots in the front bubble.
function ChatBubblesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* back bubble */}
      <path
        d="M7 4h11a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v2.6c0 .8-.95 1.2-1.5.6L14 16H10a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
        fill="currentColor"
        opacity="0.35"
      />
      {/* front bubble */}
      <path
        d="M6 3h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9.5l-3 2.4c-.6.5-1.5.05-1.5-.7V14a3 3 0 0 1-2-2.8V6a3 3 0 0 1 3-3z"
        fill="currentColor"
      />
      {/* dots */}
      <circle cx="7.5" cy="8.5" r="1.1" fill="#fff" />
      <circle cx="11" cy="8.5" r="1.1" fill="#fff" />
      <circle cx="14.5" cy="8.5" r="1.1" fill="#fff" />
    </svg>
  );
}

import { cn } from "@/lib/cn";
import { WangjaiLogo } from "./WangjaiLogo";

type WangjaiAdvisorProps = {
  accent?: "sky" | "emerald" | "amber" | "violet" | "slate";
  className?: string;
  compact?: boolean;
  message: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  title: string;
};

const accentClasses = {
  amber: {
    bg: "from-amber-50 via-white to-sky-50",
    chip: "bg-amber-100 text-amber-700",
    ring: "ring-amber-100"
  },
  emerald: {
    bg: "from-emerald-50 via-white to-sky-50",
    chip: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-100"
  },
  sky: {
    bg: "from-sky-50 via-white to-cyan-50",
    chip: "bg-sky-100 text-sky-700",
    ring: "ring-sky-100"
  },
  slate: {
    bg: "from-slate-50 via-white to-sky-50",
    chip: "bg-slate-100 text-slate-700",
    ring: "ring-slate-100"
  },
  violet: {
    bg: "from-violet-50 via-white to-sky-50",
    chip: "bg-violet-100 text-violet-700",
    ring: "ring-violet-100"
  }
} as const;

export function WangjaiAdvisor({
  accent = "sky",
  className,
  compact = false,
  message,
  stats,
  title
}: WangjaiAdvisorProps) {
  const colors = accentClasses[accent];

  if (compact) {
    return (
      <section
        className={cn(
          "relative overflow-hidden rounded-lg border border-[#d9e3e6] bg-gradient-to-br px-3.5 py-2 shadow-sm",
          colors.bg,
          className
        )}
      >
        <div className="relative z-10 flex items-center gap-3">
          <WangjaiLogo className="hidden shrink-0 sm:flex" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", colors.chip, colors.ring)}>
                <Sparkles size={11} />
                น้องวางใจ
              </span>
              <h2 className="truncate text-[13px] font-bold text-slate-950">{title}</h2>
              <span className="hidden truncate text-xs font-medium text-slate-500 md:inline">— {message}</span>
            </div>
          </div>
          {stats?.length ? (
            <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
              {stats.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-lg border border-white/80 bg-white/80 px-2.5 py-1 shadow-sm">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
                  <div className="max-w-[11rem] truncate text-[11px] font-bold text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-visible rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50/90 via-white to-sky-100/70 px-4 py-3 shadow-sm sm:px-5",
        "min-h-[104px]",
        className
      )}
    >
      <div className="pointer-events-none absolute -left-12 -top-16 z-0 h-40 w-40 rounded-full bg-white/65 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 right-16 z-0 h-32 w-72 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[28%] items-end justify-end gap-1 pr-3 md:flex lg:w-[24%]">
        {[30, 42, 52, 66, 82].map((h, i) => (
          <div
            key={i}
            className="w-4 rounded-t-sm bg-gradient-to-t from-sky-300/28 via-sky-200/20 to-sky-100/5"
            style={{ height: `${h}%` }}
          />
        ))}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points="8,66 28,56 43,60 58,44 76,34 96,22"
            fill="none"
            stroke="rgba(56,140,216,0.24)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="pointer-events-none absolute -top-7 bottom-[-8px] right-10 z-20 hidden items-end md:flex md:right-14 lg:right-20">
        <div className="absolute bottom-1 right-2 h-20 w-32 rounded-full bg-sky-300/25 blur-2xl" />
        <div className="absolute bottom-[-4px] right-7 h-4 w-24 rounded-full bg-slate-900/10 blur-md" />
        <WangjaiLogo
          variant="bust"
          className="relative h-[110px] max-h-none translate-y-[4px] drop-shadow-[0_20px_24px_rgba(14,116,214,0.28)] lg:h-[120px]"
        />
      </div>

      <div className="relative z-10 flex min-h-full items-center gap-3 sm:gap-4 md:pr-[230px] lg:pr-[320px]">
        <div className="hidden h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-sky-100/80 text-sky-600 ring-1 ring-sky-200 sm:flex">
          <ChatBubblesIcon className="h-8 w-8" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-extrabold leading-snug text-slate-950 sm:text-[22px]">{title}</h2>
          <p className="mt-1 max-w-[44rem] text-[12px] font-medium leading-5 text-slate-600 sm:text-[13px]">{message}</p>

          {stats?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-md border border-white/80 bg-white/85 px-2.5 py-1 shadow-sm">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
                  <div className="mt-0.5 max-w-[12rem] truncate text-[12px] font-bold text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
