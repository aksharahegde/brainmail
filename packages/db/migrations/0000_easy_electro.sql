CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`encrypted_access_token` text,
	`encrypted_refresh_token` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`timezone` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`email_id` text NOT NULL,
	`filename` text,
	`mime_type` text,
	`size_bytes` integer,
	`r2_path` text,
	`extracted_text` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `email_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject` text,
	`participants` text,
	`message_count` integer,
	`last_message_at` text
);
--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`user_id` text NOT NULL,
	`thread_id` text,
	`gmail_message_id` text,
	`subject` text,
	`sender` text,
	`recipients` text,
	`snippet` text,
	`received_at` text,
	`raw_path` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`external_id` text,
	`title` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`domain` text,
	`website` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`email` text,
	`company_id` text,
	`first_seen` text,
	`last_seen` text,
	`interaction_count` integer
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`confidence` real,
	`source_id` text,
	`data` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contact_id` text,
	`relationship_score` real,
	`last_interaction` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text,
	`source_id` text,
	`invoice_number` text,
	`amount` real,
	`currency` text,
	`invoice_date` text,
	`due_date` text,
	`confidence` real,
	`attachment_id` text
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text,
	`source_id` text,
	`amount` real,
	`currency` text,
	`receipt_date` text
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text,
	`source_id` text,
	`name` text,
	`amount` real,
	`currency` text,
	`billing_period` text,
	`renewal_date` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `trip_events` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text,
	`event_type` text,
	`entity_id` text,
	`occurred_at` text
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`destination` text,
	`start_date` text,
	`end_date` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `collection_members` (
	`collection_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`added_by` text,
	`created_at` text DEFAULT (datetime('now')),
	PRIMARY KEY(`collection_id`, `entity_id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`description` text,
	`collection_type` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text,
	`name` text,
	`definition` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text,
	`report_type` text,
	`definition` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `workspace_entities` (
	`workspace_id` text NOT NULL,
	`entity_id` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `entity_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`description` text,
	`workspace_type` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`artifact_type` text,
	`title` text,
	`payload` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`automation_id` text,
	`status` text,
	`execution_log` text,
	`executed_at` text
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`definition` text,
	`enabled` integer,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `filters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`query` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`role` text,
	`content` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `session_state` (
	`session_id` text PRIMARY KEY NOT NULL,
	`current_artifact_id` text,
	`current_workspace_id` text,
	`current_dashboard_id` text,
	`state` text
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text,
	`payload` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`vector_id` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`insight_type` text,
	`payload` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `user_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rule_type` text,
	`rule_definition` text,
	`created_at` text DEFAULT (datetime('now'))
);
