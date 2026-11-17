UPDATE mst_roles SET description = 'Office staff: master data, purchasing, invoices and reports', updated_at = NOW() WHERE type = 'ADMIN' AND pharmacy_id IS NULL;
