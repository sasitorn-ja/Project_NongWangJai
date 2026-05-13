import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />;
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />;
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & React.ComponentProps<"button">;

function PaginationLink({ className, isActive, ...props }: PaginationLinkProps) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-slate-700 hover:bg-muted dark:bg-slate-950 dark:text-slate-200",
        className
      )}
      type="button"
      {...props}
    />
  );
}

function PaginationPrevious(props: React.ComponentProps<typeof Button>) {
  return (
    <Button aria-label="Go to previous page" size="sm" variant="outline" {...props}>
      <ChevronLeft className="h-4 w-4" />
      <span>Previous</span>
    </Button>
  );
}

function PaginationNext(props: React.ComponentProps<typeof Button>) {
  return (
    <Button aria-label="Go to next page" size="sm" variant="outline" {...props}>
      <span>Next</span>
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden className={cn("flex h-8 w-8 items-center justify-center text-slate-500", className)} {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
};
