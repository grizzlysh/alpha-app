-- Admin becomes office staff (master data, purchasing, invoices, reports) instead
-- of a copy of Owner. Only the global Admin role's defaults change; overrides a
-- pharmacy set for itself are kept.
--
-- Signing is now decided by the practice license (see src/utils/signer.ts), so
-- the sign.standard / sign.full permissions are removed.

DELETE FROM mst_role_permissions rp
USING mst_roles r
WHERE rp.role_id = r.id AND r.type = 'ADMIN' AND r.pharmacy_id IS NULL AND rp.pharmacy_id IS NULL;

INSERT INTO mst_role_permissions (uuid, role_id, permission_id, pharmacy_id, is_enabled, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, p.id, NULL, true, NOW(), NOW()
FROM mst_roles r
JOIN mst_permissions p ON p.module || '.' || p.action IN (SELECT k FROM (VALUES
  ('medicine_shapes.read'),
  ('medicine_shapes.create'),
  ('medicine_shapes.update'),
  ('medicine_shapes.delete'),
  ('medicine_types.read'),
  ('medicine_types.create'),
  ('medicine_types.update'),
  ('medicine_types.delete'),
  ('medicine_classes.read'),
  ('medicine_classes.create'),
  ('medicine_classes.update'),
  ('medicine_classes.delete'),
  ('medicines.read'),
  ('medicines.create'),
  ('medicines.update'),
  ('medicines.delete'),
  ('distributors.read'),
  ('distributors.create'),
  ('distributors.update'),
  ('distributors.delete'),
  ('customers.read'),
  ('customers.create'),
  ('customers.update'),
  ('customers.delete'),
  ('doctors.read'),
  ('doctors.create'),
  ('doctors.update'),
  ('doctors.delete'),
  ('storage.read'),
  ('storage.create'),
  ('storage.update'),
  ('storage.delete'),
  ('stock.read'),
  ('stock_movements.read'),
  ('purchase_orders.read'),
  ('purchase_orders.create'),
  ('purchase_orders.update'),
  ('purchase_orders.delete'),
  ('invoices.read'),
  ('invoices.create'),
  ('invoices.update'),
  ('invoices.delete'),
  ('invoices.verify'),
  ('sales.read'),
  ('stock_return.read'),
  ('stock_disposal.read'),
  ('prescriptions.read'),
  ('examinations.read'),
  ('examinations.checkin'),
  ('reports.read'),
  ('reports.export'),
  ('business_parameters.read'),
  ('pharmacies.read'),
  ('licenses.read'),
  ('dashboard.read'),
  ('dashboard.advanced')
) AS a(k))
WHERE r.type = 'ADMIN' AND r.pharmacy_id IS NULL AND r.deleted_at IS NULL;

DELETE FROM mst_role_permissions
WHERE permission_id IN (SELECT id FROM mst_permissions WHERE module = 'sign');
DELETE FROM mst_permissions WHERE module = 'sign';
