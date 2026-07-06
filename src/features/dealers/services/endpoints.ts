import type {
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";
import { requestJson, requestJsonPost } from "./client";
import {
  normalizeCustomer,
  normalizeDealers,
  normalizeGroup,
  normalizeSite,
  normalizeSoOrder,
  normalizeUsage
} from "./normalize";
import {
  type ApiListResult,
  type CustomerUsageResponse,
  type DealerApiResponse,
  type DealerGroupsResponse,
  type DealerSiteResponse,
  type DealerUsageResponse,
  type SoOrdersResponse,
  normalizeList,
  responseMessage
} from "./responses";

export async function fetchDealers(): Promise<ApiListResult<Dealer>> {
  try {
    const payload = await requestJson<DealerApiResponse>("/api/dealers");
    const rows = normalizeDealers(payload);

    return { rows, state: "live" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealers";
    console.error("Failed to load dealers:", error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchDealerGroups(dealerId: number): Promise<ApiListResult<DealerGroup>> {
  try {
    const payload = await requestJson<DealerGroupsResponse>(`/api/dealers/${dealerId}/groups`);
    return { rows: (payload.groups ?? payload.items ?? []).map(normalizeGroup), state: "live", message: payload.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealer groups";
    console.error(`Failed to load dealer groups for dealer ${dealerId}:`, error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchDealerUsage(): Promise<ApiListResult<DealerUsage>> {
  try {
    const payload = await requestJson<DealerUsageResponse>("/api/dealers/usage");
    return { rows: normalizeList(payload).map(normalizeUsage), state: "live" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealer usage";
    console.error("Failed to load dealer usage:", error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchCustomerUsage(dealerKey: number | string): Promise<ApiListResult<CustomerUsage>> {
  try {
    const payload = await requestJson<CustomerUsageResponse>(`/api/dealers/${dealerKey}/customers/usage`);
    return { rows: normalizeList(payload).map(normalizeCustomer), state: "live", message: responseMessage(payload) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load customer usage";
    console.error(`Failed to load customer usage for dealer ${dealerKey}:`, error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchDealerSites(dealerKey: number | string): Promise<ApiListResult<DealerSite>> {
  try {
    const payload = await requestJson<DealerSiteResponse>(`/api/dealers/${dealerKey}/sites`);
    return { rows: normalizeList(payload).map(normalizeSite), state: "live", message: responseMessage(payload) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealer sites";
    console.error(`Failed to load dealer sites for dealer ${dealerKey}:`, error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchOrders({
  startDate,
  endDate,
  dealers
}: {
  startDate: string;
  endDate: string;
  dealers: Dealer[];
}): Promise<ApiListResult<OrderItem>> {
  try {
    const payload = await requestJsonPost<SoOrdersResponse>("/api/so-orders", {
      start_date: startDate,
      end_date: endDate,
      limit: 1000,
      page: 1
    });

    const dealerMap = new Map(dealers.map((dealer) => [dealer.dealer_code, dealer]));
    const rows = (payload.items ?? []).map((item) => normalizeSoOrder(item, dealerMap));

    return { rows, state: "live", message: responseMessage(payload) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load orders";
    console.error("Failed to load orders:", error);
    return { rows: [], state: "error", message };
  }
}
