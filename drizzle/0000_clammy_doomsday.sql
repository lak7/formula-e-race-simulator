CREATE TABLE `plants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`growth_stage` integer DEFAULT 0 NOT NULL,
	`sessions_completed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`duration` integer NOT NULL,
	`completed_at` text NOT NULL,
	`session_type` text NOT NULL,
	`created_at` text NOT NULL
);
