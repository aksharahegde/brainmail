ALTER TABLE `collections` ADD `workspace_id` text;
--> statement-breakpoint
ALTER TABLE `collections` ADD `status` text DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `collections` ADD `updated_at` text;
