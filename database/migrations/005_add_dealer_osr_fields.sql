-- Stores OSR metadata returned by /api/ai-wangjai/dealers.
ALTER TABLE dealers
  ADD COLUMN osr_dealer TINYINT(1) NOT NULL DEFAULT 0 AFTER dealer_name,
  ADD COLUMN osr_dealer_code VARCHAR(32) NULL AFTER osr_dealer;
