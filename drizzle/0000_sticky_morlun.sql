CREATE TABLE `access_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`access_key_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`approved_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_access_requests_email` ON `access_requests` (`email`);--> statement-breakpoint
CREATE INDEX `idx_access_requests_status` ON `access_requests` (`status`);--> statement-breakpoint
CREATE TABLE `access_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_access_sessions_token` ON `access_sessions` (`token_hash`);