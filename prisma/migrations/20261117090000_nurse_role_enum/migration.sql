-- Kept on its own: a new enum value can only be used after the transaction
-- that added it has committed.
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'NURSE';
