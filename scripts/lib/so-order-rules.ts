// These business rules explicitly apply to existing orders, including the
// otherwise locked baseline. They only change the three derived fields below.
export const MARK_WANGJAI_ORDERS_SQL = `
  UPDATE so_orders AS so
  SET create_form = 'Wang Jai', create_form_wangjai = 1
  WHERE EXISTS (
    SELECT 1 FROM dealer_sites AS ds WHERE ds.site_code = so.ship_to_code
  )
`;

export const CANCEL_TEST_SO_ORDERS_SQL = `
  UPDATE so_orders
  SET current_status = 'C'
  WHERE (LOWER(ship_to_name) LIKE '%test%' OR ship_to_name LIKE '%ทดสอบ%')
    AND (current_status IS NULL OR current_status <> 'C')
`;

export const COMPLETE_SO_ORDERS_SQL = `
  UPDATE so_orders
  SET current_status = 'E'
  WHERE delivery_date_time < ?
    AND (current_status IS NULL OR current_status NOT IN ('C', 'E'))
`;

/** Exclusive cutoff: complete all orders dated two calendar days ago or earlier. */
export function getSoOrderCompletionCutoff(thailandToday: string) {
  const today = new Date(`${thailandToday}T00:00:00.000Z`);
  today.setUTCDate(today.getUTCDate() - 1);
  return `${today.toISOString().slice(0, 10)} 00:00:00`;
}
