-- Add soft delete columns to printers table
ALTER TABLE public.printers 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ DEFAULT NULL;

-- Update existing records to be visible
UPDATE public.printers SET is_hidden = FALSE WHERE is_hidden IS NULL;
