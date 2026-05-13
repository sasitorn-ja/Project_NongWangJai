export type DatePreset = "all" | "7d" | "30d" | "90d" | "custom";

export function dateText(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function parseDateValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPresetDateRange(preset: DatePreset) {
  if (preset === "all") return { from: "", to: "" };

  const today = new Date();
  const end = formatDateInputValue(today);
  const start = new Date(today);
  const offsetDays = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  start.setDate(today.getDate() - offsetDays);

  return { from: formatDateInputValue(start), to: end };
}

export function isWithinDateRange(value: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;

  const date = parseDateValue(value);
  if (!date) return false;

  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (date < start) return false;
  }

  if (to) {
    const end = new Date(`${to}T23:59:59`);
    if (date > end) return false;
  }

  return true;
}

export function getMonthKey(dateValue?: string | null) {
  const date = parseDateValue(dateValue);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthLabel(monthKey: string) {
  if (!monthKey) return "-";
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;

  return new Intl.DateTimeFormat("en-US", {
    month: "short"
  }).format(new Date(year, month - 1, 1));
}
