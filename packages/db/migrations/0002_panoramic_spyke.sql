CREATE TABLE `gmail_sync_states` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`history_id` text,
	`watch_expiration` text,
	`last_synced_at` text,
	`last_error` text,
	`synced_message_count` integer DEFAULT 0,
	`initial_sync_complete` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gmail_sync_states_account_id_unique` ON `gmail_sync_states` (`account_id`);