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
  dealer_id?: number;
  dealer_code?: string;
  dealer_name?: string;
  customer_id: number;
  customer_code: string;
  customer_name: string;
  price_concrete_count: number;
  booking_create_count: number;
  updated_at: string | null;
  message?: string | null;
};

export type DealerSite = {
  id?: number;
  dealer_id?: number;
  dealer_code?: string;
  dealer_name?: string;
  site_id: number;
  site_code: string;
  site_name: string;
  province_id?: number;
  province_bluenet_id?: string | null;
  province_name?: string | null;
  region_id?: number;
  region?: string | null;
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

export type OrderItem = {
  updated_at: string | null;
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  customer?: {
    id?: number | string;
    code?: string;
    name?: string;
    phone?: string;
  } | null;
  site?: {
    site_id?: number | string;
    site_code?: string;
    site_name?: string;
  } | null;
  order?: {
    order_no?: string;
    product_sku?: string;
    product_name?: string;
  } | null;
  quantity?: {
    initial_ordered?: number;
    ordered?: number;
    delivered?: number;
    unit?: string;
  } | null;
  full_loop?: boolean;
  pour_datetime: string | null;
  status?: {
    order?: string;
  } | null;
  created_at: string | null;
  message?: string | null;
};

export type ApiState = "loading" | "live" | "error";
