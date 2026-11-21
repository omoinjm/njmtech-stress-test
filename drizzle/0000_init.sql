CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`origin` text NOT NULL,
	`hostname` text NOT NULL,
	`verify_token` text NOT NULL,
	`verified_at` integer,
	`verify_method` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_user_origin` ON `domains` (`user_id`,`origin`);--> statement-breakpoint
CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`key` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`evidence` text NOT NULL,
	`impact` text NOT NULL,
	`fix` text NOT NULL,
	`diy_friendly` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `findings_scan` ON `findings` (`scan_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`company` text,
	`message` text,
	`status` text DEFAULT 'new' NOT NULL,
	`quote_cents` integer,
	`quote_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `load_shards` (
	`scan_id` text NOT NULL,
	`shard` integer NOT NULL,
	`latencies` text NOT NULL,
	`errors` integer NOT NULL,
	`peak` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`aborted` integer NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `load_shards_pk` ON `load_shards` (`scan_id`,`shard`);--> statement-breakpoint
CREATE TABLE `login_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`redirect_to` text,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_tokens_email` ON `login_tokens` (`email`,`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scan_id` text NOT NULL,
	`lead_id` text,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`yoco_checkout_id` text,
	`yoco_payment_id` text,
	`mode` text,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_yoco_checkout_id_unique` ON `payments` (`yoco_checkout_id`);--> statement-breakpoint
CREATE INDEX `payments_scan` ON `payments` (`scan_id`);--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`domain_id` text NOT NULL,
	`origin` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`include_load_test` integer DEFAULT false NOT NULL,
	`requester_ip` text,
	`run_id` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`load_test` text,
	`error` text,
	`unlocked_at` integer,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scans_user_created` ON `scans` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `scans_domain` ON `scans` (`domain_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`terms_accepted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);