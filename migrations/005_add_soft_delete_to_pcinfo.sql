-- Add soft delete columns to pcinfo table
ALTER TABLE public.pcinfo 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ DEFAULT NULL;

-- Update existing records to be visible
UPDATE public.pcinfo SET is_hidden = FALSE WHERE is_hidden IS NULL;
