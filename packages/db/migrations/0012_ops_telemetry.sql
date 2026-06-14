CREATE TABLE IF NOT EXISTS `ops_events` (
  `id` text PRIMARY KEY NOT NULL,
  `event_type` text NOT NULL,
  `severity` text,
  `source` text,
  `user_id` text,
  `payload` text,
  `created_at` text DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `ops_events_type_created_idx`
  ON `ops_events` (`event_type`, `created_at` DESC);
