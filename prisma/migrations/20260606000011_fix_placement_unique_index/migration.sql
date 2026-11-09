-- Drop the old unique constraint that blocked historical placements (re-joins, promotions)
DROP INDEX IF EXISTS "mst_user_pharmacies_user_id_pharmacy_id_active_key";

-- One active placement per user per pharmacy — historical (closed) rows are unrestricted
CREATE UNIQUE INDEX "mst_placements_user_id_pharmacy_id_active_key"
  ON "mst_placements" ("user_id", "pharmacy_id")
  WHERE left_at IS NULL AND deleted_at IS NULL;
