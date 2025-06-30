CREATE TABLE `jam` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`jam_page_url` text NOT NULL,
	`submission_count` integer DEFAULT 0 NOT NULL,
	`participating_users` integer DEFAULT 0 NOT NULL,
	`banner_image` text,
	`featured` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jam_jam_page_url_unique` ON `jam` (`jam_page_url`);