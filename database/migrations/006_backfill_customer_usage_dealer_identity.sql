-- Customer usage items omit dealer identity; CPAC provides it on the envelope.
-- Repair only missing identity fields using the existing dealer_id relationship.
UPDATE customer_usage c
INNER JOIN dealers d ON d.dealer_id = c.dealer_id
SET
  c.dealer_code = COALESCE(NULLIF(TRIM(c.dealer_code), ''), d.dealer_code),
  c.dealer_name = COALESCE(NULLIF(TRIM(c.dealer_name), ''), d.dealer_name)
WHERE TRIM(COALESCE(c.dealer_code, '')) = ''
   OR TRIM(COALESCE(c.dealer_name, '')) = '';
