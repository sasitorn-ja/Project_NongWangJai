-- Migration: Remove region/province FKs to allow sync order flexibility
-- Run this as root/admin on the MySQL server at 192.168.1.196

ALTER TABLE dealers
  DROP FOREIGN KEY fk_dealers_region,
  DROP FOREIGN KEY fk_dealers_province;

ALTER TABLE dealer_sites
  DROP FOREIGN KEY fk_sites_region,
  DROP FOREIGN KEY fk_sites_province;
