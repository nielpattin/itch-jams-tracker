DROP INDEX "jam_jam_page_url_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `jam` ALTER COLUMN "start_date" TO "start_date" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `jam_jam_page_url_unique` ON `jam` (`jam_page_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
ALTER TABLE `jam` ALTER COLUMN "end_date" TO "end_date" integer;--> statement-breakpoint
ALTER TABLE `jam` ALTER COLUMN "status" TO "status" text;