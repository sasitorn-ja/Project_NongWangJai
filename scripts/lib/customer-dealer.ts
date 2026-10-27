type DealerIdentity = {
  dealer_code?: unknown;
  dealer_name?: unknown;
};

function firstNonBlank(...values: unknown[]): string | null {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

export function resolveCustomerDealer(
  customer: DealerIdentity,
  responseDealer: DealerIdentity | undefined,
  storedDealer: DealerIdentity
) {
  return {
    dealer_code: firstNonBlank(responseDealer?.dealer_code, customer.dealer_code, storedDealer.dealer_code),
    dealer_name: firstNonBlank(responseDealer?.dealer_name, customer.dealer_name, storedDealer.dealer_name)
  };
}
