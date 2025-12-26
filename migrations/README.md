Migration Files

This folder contains SQL migration(s) for the project.

Migration files:
- `001_add_bios_fields.sql` — adds BIOS columns to the `pcinfo` table.
- `002_add_notes_field.sql` — adds notes/comments column to the `pcinfo` table.

How to apply

1) Use Supabase SQL editor (web UI):
   - Open your project's Dashboard → SQL Editor → New query
   - Copy & paste the contents of `001_add_bios_fields.sql` and run it

2) Using psql (example):
   - Ensure you have the DATABASE_URL or connection string
   - Run:

```powershell
psql "<YOUR_DATABASE_URL>" -f migrations/001_add_bios_fields.sql
```

3) Using Supabase CLI (optional):
   - You can run the SQL via `supabase db remote commit` or use the SQL editor workflow.

Notes
- All migrations use `ADD COLUMN IF NOT EXISTS` so they are idempotent (safe to re-run).
- Column types:
  - `bios_vendor` and `bios_version` => `text`
  - `bios_release_date` and `bios_manufacture_date` => `date`
  - `notes` => `text`

If you want `timestamp with time zone` instead of `date`, tell me and I will provide an alternate migration file.
