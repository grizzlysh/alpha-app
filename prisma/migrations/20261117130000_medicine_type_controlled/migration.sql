-- Controlled medicines (narcotics, psychotropics, precursors) are marked on the
-- medicine type instead of being recognised by name. Existing types whose name
-- says so are marked; pharmacies can change it per type afterwards.
ALTER TABLE "mst_medicine_types" ADD COLUMN "is_controlled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "mst_medicine_types"
SET "is_controlled" = true, "required_prescription" = true, "updated_at" = NOW()
WHERE "name" ~* '(narkoti|psikotropi|prekursor|precursor|psychotropic|narcotic)';
