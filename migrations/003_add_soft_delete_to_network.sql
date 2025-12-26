-- Add soft delete columns to network_equipment table
ALTER TABLE network_equipment
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: Create an index for faster filtering of non-hidden items
CREATE INDEX IF NOT EXISTS idx_network_equipment_is_hidden ON network_equipment(is_hidden);
