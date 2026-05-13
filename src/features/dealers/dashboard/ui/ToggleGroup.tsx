import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ToggleGroupProps<T extends string> = {
  ariaLabel?: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
};

export function ToggleGroup<T extends string>({ ariaLabel, onChange, options, value }: ToggleGroupProps<T>) {
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex shrink-0 gap-1 rounded-[18px] border border-border bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          aria-pressed={value === option.value}
          className={cn(
            "min-w-16 rounded-[14px] px-3 text-xs font-semibold shadow-none transition-colors hover:translate-y-0",
            "hover:bg-muted dark:hover:bg-slate-700/60",
            "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90"
          )}
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
