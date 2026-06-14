ALTER TABLE `reports` ADD `name` text;
--> statement-breakpoint
ALTER TABLE `reports` ADD `schedule` text DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE `reports` ADD `updated_at` text;
--> statement-breakpoint
ALTER TABLE `reports` ADD `refreshed_at` text;
