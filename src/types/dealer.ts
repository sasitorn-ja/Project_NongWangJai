export type Dealer = {
  status: boolean | string | null;
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  region_id: number;
  region: string;
  province_id: number;
  province: string;
  group_count: number;
  volume: number;
  unit: string;
  last_active_at?: string | null;
  last_active_days?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  message?: string | null;
};

export type DealerGroup = {
  group_id: number;
  group_name: string;
  group_type: string | null;
  delivered_volume: number;
  booked_volume: number;
  unit: string;
  price_check_count: number;
  booking_count: number;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  message?: string | null;
};

export type DealerUsage = {
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  region_id: number;
  region: string;
  province_id: number;
  province: string;
  price_concrete_count: number;
  booking_create_count: number;
  customer_create_count: number;
  updated_at: string | null;
  message?: string | null;
};

export type CustomerUsage = {
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  customer_id: number;
  customer_code: string;
  customer_name: string;
  price_concrete_count: number;
  booking_create_count: number;
  updated_at: string | null;
  message?: string | null;
};

export type DealerSite = {
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  site_id: number;
  site_code: string;
  site_name: string;
  customer?: {
    id?: number;
    code?: string;
    name?: string;
  } | null;
  total_ordered: number;
  total_delivered: number;
  unit: string;
  last_pour_datetime: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  message?: string | null;
};

export type ApiState = "loading" | "live" | "error";
