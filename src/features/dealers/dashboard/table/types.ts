import type { ReactNode } from "react";

export type DataColumn<T> = {
  align?: "left" | "right" | "center";
  dataIndex?: keyof T;
  headerClassName?: string;
  key: string;
  render?: (value: never, record: T) => ReactNode;
  sortable?: boolean;
  sortAccessor?: keyof T | ((record: T) => unknown);
  title: ReactNode;
  width?: number;
};
