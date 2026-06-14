CREATE TABLE IF NOT EXISTS `rate_limit_buckets` (
  `bucket_key` text PRIMARY KEY NOT NULL,
  `request_count` integer NOT NULL DEFAULT 0,
  `window_started_at` text NOT NULL
);
