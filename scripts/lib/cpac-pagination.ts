type PagePayload = {
  items?: unknown[];
  total?: number;
  totalPage?: number;
};

export async function* fetchCpacPages(
  fetchPage: (page: number, limit: number) => Promise<unknown>
): AsyncGenerator<unknown[]> {
  const limit = 500;
  const seenIds = new Set<unknown>();
  let received = 0;

  for (let page = 1; ; page++) {
    const payload = (await fetchPage(page, limit)) as PagePayload;
    if (!payload || !Array.isArray(payload.items)) {
      throw new Error(`Invalid CPAC items on page ${page}`);
    }
    const rows = payload.items;
    const total = Number(payload.total);
    const totalPages = Number(payload.totalPage);

    if (rows.length === 0) {
      if (Number.isFinite(total) && received < total) {
        throw new Error(`CPAC pagination ended early: received ${received} of ${total}`);
      }
      return;
    }

    for (const row of rows) {
      const id = (row as Record<string, unknown>).so_id;
      if (id == null || seenIds.has(String(id))) {
        throw new Error(`Missing or repeated SO order ID on CPAC page ${page}`);
      }
      seenIds.add(String(id));
    }
    received += rows.length;
    yield rows;

    if (Number.isFinite(total) && received >= total) return;
    if (Number.isFinite(totalPages) && page >= totalPages) {
      if (Number.isFinite(total) && received < total) {
        throw new Error(`CPAC pagination ended early: received ${received} of ${total}`);
      }
      return;
    }
  }
}
