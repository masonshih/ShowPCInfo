-- Migration: 002_add_notes_field.sql
-- Purpose: Add notes/comments column to the `pcinfo` table
-- Notes: Run this in Supabase SQL editor or with psql against your database.

BEGIN;

ALTER TABLE public.pcinfo
  ADD COLUMN IF NOT EXISTS notes text;

COMMIT;

-- End of migration
