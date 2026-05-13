import type { ReactNode } from "react";

export type DataColumn<T> = {
  align?: "left" | "right" | "center";
  dataIndex?: keyof T;
  key: string;
  render?: (value: never, record: T) => ReactNode;
  title: ReactNode;
  width?: number;
};
