-- Migration: Remove unique constraint on dealer_code because dealer_code can repeat
-- Run this as root/admin on the MySQL server at 192.168.1.196

ALTER TABLE dealers
  DROP INDEX uk_dealer_code,
  ADD INDEX idx_dealer_code (dealer_code);
