CREATE TABLE `players` (
	`owner_key` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`normalized_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`best_sushi` integer DEFAULT 0 NOT NULL,
	`best_ticks` integer DEFAULT 0 NOT NULL,
	`best_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_normalized_id_unique` ON `players` (`normalized_id`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`seed` integer NOT NULL,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	`score` integer,
	`sushi` integer,
	`ticks` integer,
	FOREIGN KEY (`owner_key`) REFERENCES `players`(`owner_key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `runs_owner_created` ON `runs` (`owner_key`,`created_at`);