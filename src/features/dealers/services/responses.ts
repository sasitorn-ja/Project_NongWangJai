import type {
  ApiState,
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";

export type DealerApiResponse =
  | Dealer[]
  | {
      data?: Dealer[];
      result?: Dealer[];
      dealers?: Dealer[];
      items?: Dealer[];
      rows?: Dealer[];
    };

export type DealerGroupsResponse = {
  status?: boolean;
  dealer?: Pick<Dealer, "dealer_id" | "dealer_code" | "dealer_name">;
  groups?: DealerGroup[];
  items?: DealerGroup[];
  message?: string;
};

export type ListResponse<T> = T[] | { items?: T[]; data?: T[]; result?: T[]; rows?: T[]; message?: string };

export type ApiListResult<T> = {
  rows: T[];
  state: ApiState;
  message?: string;
};

export type DealerListResponse = ListResponse<Dealer>;
export type DealerUsageResponse = ListResponse<DealerUsage>;
export type CustomerUsageResponse = ListResponse<CustomerUsage>;
export type DealerSiteResponse = ListResponse<DealerSite>;
export type OrderResponse = ListResponse<OrderItem>;

export type SoOrderItem = {
  so_id?: number | string;
  create_form?: string;
  create_form_wangjai?: number;
  InitialOrderQuantity?: number | string;
  CurrentOrderQuantity?: number | string;
  ShipToCode?: string;
  ShipToName?: string;
  SoldToCode?: string;
  SoldToName?: string;
  DocumentDate?: string;
  DeliveryDateTime?: string;
  MaterialCode?: string;
  MaterialDescription?: string;
  CurrentStatus?: string;
  created_at?: string | null;
  modify_at?: string | null;
  [key: string]: unknown;
};

export type SoOrdersResponse = {
  status?: boolean;
  items?: SoOrderItem[];
  message?: string;
};

export function normalizeList<T>(payload: ListResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.data ?? payload.result ?? payload.rows ?? [];
}

export function responseMessage<T>(payload: ListResponse<T>) {
  return Array.isArray(payload) ? undefined : payload.message;
}
