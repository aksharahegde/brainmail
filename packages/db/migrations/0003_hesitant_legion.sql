ALTER TABLE `emails` ADD `body_text` text;--> statement-breakpoint
ALTER TABLE `emails` ADD `body_html` text;--> statement-breakpoint
ALTER TABLE `emails` ADD `cc` text;--> statement-breakpoint
ALTER TABLE `emails` ADD `bcc` text;--> statement-breakpoint
ALTER TABLE `emails` ADD `category` text;--> statement-breakpoint
ALTER TABLE `emails` ADD `classification_confidence` real;--> statement-breakpoint
ALTER TABLE `emails` ADD `processing_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `emails` ADD `processing_error` text;--> statement-breakpoint
ALTER TABLE `emails` ADD `processed_at` text;