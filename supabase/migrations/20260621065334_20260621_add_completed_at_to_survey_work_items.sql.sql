-- Add completed_at column to survey_work_items for tracking when each stage is completed
ALTER TABLE survey_work_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update completed_at when completed is set to true
CREATE OR REPLACE FUNCTION update_survey_work_item_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false AND OLD.completed = true THEN
    NEW.completed_at = null;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_work_item_completed_at_trigger
BEFORE UPDATE ON survey_work_items
FOR EACH ROW
EXECUTE FUNCTION update_survey_work_item_completed_at();