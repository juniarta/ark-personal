-- Add started_at to alarms so we can compute remaining time on the frontend
ALTER TABLE alarms ADD COLUMN started_at TEXT;
