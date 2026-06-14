CREATE TABLE `entity_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`email_id` text,
	`confidence` real,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_relationships_unique_edge` ON `entity_relationships` (`user_id`,`source_type`,`source_id`,`target_type`,`target_id`,`relationship_type`);