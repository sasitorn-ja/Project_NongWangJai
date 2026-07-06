-- Migration: Remove FK from dealer_sites to dealers because sites may belong to dealers outside the cutoff filter
-- Run this as root/admin on the MySQL server at 192.168.1.196

ALTER TABLE dealer_sites
  DROP FOREIGN KEY fk_sites_dealer;
