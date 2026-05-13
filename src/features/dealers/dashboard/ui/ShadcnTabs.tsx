import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export function ShadcnTabs({
  items
}: {
  items: Array<{
    key: string;
    label: string;
    content: ReactNode;
  }>;
}) {
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? "");
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-md border border-[#d9e3e6] bg-white p-1 shadow-sm">
        {items.map((item) => (
          <button
            key={item.key}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 sm:flex-none",
              activeKey === item.key && "bg-slate-100 text-slate-950"
            )}
            onClick={() => setActiveKey(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem?.content}
    </div>
  );
}
