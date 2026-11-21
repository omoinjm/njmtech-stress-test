CREATE TABLE `domain_verifications` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_verifications_domain` ON `domain_verifications` (`domain_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `scans` ADD `kind` text DEFAULT 'deep' NOT NULL;--> statement-breakpoint
ALTER TABLE `scans` ADD `access_token` text;