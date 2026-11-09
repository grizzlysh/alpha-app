-- Selling expired medicine is always blocked now; the switch is gone.
DELETE FROM "mst_system_parameters" WHERE "key" = 'ALLOW_EXPIRED_MEDICINE_SALE';
