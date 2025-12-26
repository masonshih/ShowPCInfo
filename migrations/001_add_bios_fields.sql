-- Migration: 001_add_bios_fields.sql
-- Purpose: Add BIOS related columns to the `pcinfo` table
-- Notes: Run this in Supabase SQL editor or with psql against your database.

BEGIN;

ALTER TABLE public.pcinfo
  ADD COLUMN IF NOT EXISTS bios_vendor text,
  ADD COLUMN IF NOT EXISTS bios_version text,
  ADD COLUMN IF NOT EXISTS bios_release_date date,
  ADD COLUMN IF NOT EXISTS bios_manufacture_date date;

COMMIT;

-- End of migration
