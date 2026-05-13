import { useState } from "react";

import { type DatePreset, getPresetDateRange } from "../lib/dates";

export function useDashboardFilters() {
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  const setDatePresetWithRange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = getPresetDateRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  return {
    dateFrom,
    datePreset,
    dateTo,
    orderSearch,
    region,
    search,
    setDateFrom,
    setDatePreset: setDatePresetWithRange,
    setDateTo,
    setOrderSearch,
    setRegion,
    setSearch,
    setStatus,
    status
  };
}
