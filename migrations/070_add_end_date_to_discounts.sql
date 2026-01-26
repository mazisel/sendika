-- Add end_date column to discounts table
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Add description for documentation
COMMENT ON COLUMN discounts.end_date IS 'İndirimin geçerlilik bitiş tarihi';
