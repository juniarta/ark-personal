-- Store original duration so timer can be replayed after completion
ALTER TABLE alarms ADD COLUMN original_duration_ms INTEGER;

-- Backfill existing timers that have a positive duration (not yet marked done)
UPDATE alarms
SET original_duration_ms = duration_ms
WHERE alarm_type = 'timer'
  AND original_duration_ms IS NULL
  AND duration_ms IS NOT NULL
  AND duration_ms > 0;
