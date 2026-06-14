ALTER TABLE `artifacts` ADD `workspace_id` text;
--> statement-breakpoint
ALTER TABLE `artifacts` ADD `share_token` text;
--> statement-breakpoint
ALTER TABLE `artifacts` ADD `shared_at` text;
--> statement-breakpoint
ALTER TABLE `artifacts` ADD `updated_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `artifacts_share_token_unique` ON `artifacts` (`share_token`);
