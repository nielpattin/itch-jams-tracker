import * as cheerio from 'cheerio';
import { db } from '$lib/server/db';
import { jam, type JamStatus } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import { sql } from 'drizzle-orm';

async function fetchHtml(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to fetch ${url}: ${response.statusText}`);
			return null;
		}
		return await response.text();
	} catch (error) {
		console.error(`Error fetching ${url}:`, error);
		return null;
	}
}

export async function scrapeItchIo() {
	const scraperDelayMs = parseInt(env.SCRAPER_DELAY_MS || '1000', 10);

	const startUrls = [
		'https://itch.io/jams/in-progress/sort-date'
		// 'https://itch.io/jams/upcoming/sort-date'
	];

	for (const url of startUrls) {
		console.log(`Scraping page: ${url}`);

		let nextPage: string | null = url;
		let pageCount = 0;
		const scraperMaxPages = env.SCRAPER_MAX_PAGES;
		let loopIndefinitely = false;
		let maxPages = 1; // Default or initial value

		if (scraperMaxPages === 'MAX') {
			loopIndefinitely = true;
		} else {
			maxPages = parseInt(scraperMaxPages || '1', 10);
		}

		while (nextPage && (loopIndefinitely || pageCount < maxPages)) {
			if (pageCount > 0) {
				// Apply delay only after the first page
				console.log(`Waiting for ${scraperDelayMs}ms before next page scrape...`);
				await new Promise((resolve) => setTimeout(resolve, scraperDelayMs));
			}
			const html = await fetchHtml(nextPage);
			if (!html) {
				console.error(`Could not fetch HTML for ${nextPage}, skipping.`);
				nextPage = null;
				continue;
			}
			const $ = cheerio.load(html);

			const jamDivs = $('div.jam');

			const jamPromises = jamDivs.toArray().map(async (jamDiv) => {
				const $jamDiv = $(jamDiv);
				const name = $jamDiv.find('h3 a').text();
				if (!name) {
					console.warn('Skipping jam: No name found.');
					return null;
				}

				const jamUrl = $jamDiv.find('h3 a').attr('href');
				if (!jamUrl) {
					console.warn(`Skipping jam "${name}": No URL found.`);
					return null;
				}

				const timingText = $jamDiv.find('div.timestmap.meta_row').text();
				if (!timingText) {
					console.warn(`Skipping jam "${name}": No timing text found.`);
					return null;
				}

				const dateCountdownSpan = $jamDiv.find('span.date_countdown');
				const utcDateText = dateCountdownSpan.text();
				const utcDateTitle = dateCountdownSpan.attr('title');

				if (!utcDateText && !utcDateTitle) {
					console.warn(`Skipping jam "${name}": No UTC date found.`);
					return null;
				}

				// Extract the status and determine which date to use
				let startDate: Date | null = null;
				let endDate: Date | null = null;

				const statusMatch = timingText.match(
					/(Starts in|Ended|Submission closes in|Voting ends in)/
				);
				if (!statusMatch) {
					console.info(`Skipping jam "${name}": No recognizable status found in timing text.`);
					return null;
				}

				// Map the raw status text to the JamStatus enum
				let status: JamStatus = 'upcoming'; // Default to 'upcoming' if no match
				switch (statusMatch[0]) {
					case 'Starts in':
						status = 'upcoming';
						break;
					case 'Submission closes in':
						status = 'in-progress';
						break;
					case 'Voting ends in':
						status = 'voting';
						break;
					case 'Ended':
						status = 'ended';
						break;
					default:
						console.warn(`Unexpected status text: ${statusMatch[0]}`);
						break;
				}
				const dateText = utcDateTitle || utcDateText;
				if (!dateText) {
					console.warn(`Skipping jam "${name}": No date text found.`);
					return null;
				}

				const date = new Date(dateText);
				if (isNaN(date.getTime())) {
					console.warn(`Skipping jam "${name}": Invalid date format "${dateText}"`);
					return null;
				}

				if (status === 'upcoming') {
					startDate = date;
				} else {
					endDate = date;
				}

				const fullUrl = new URL(jamUrl, 'https://itch.io').toString();

				// Extract all required fields from the main page's div.jam element
				const participatingUsers = parseInt(
					$jamDiv.find('div.jam_stats .stat:first-child span.number').text().replace(/,/g, '') ||
						'0',
					10
				);
				const submissionCount = parseInt(
					$jamDiv.find('div.jam_stats a.stat span.number').text().replace(/,/g, '') || '0',
					10
				);
				const bannerImage = $jamDiv.find('.jam_cover').attr('data-background_image') || '';
				const host = $jamDiv.find('.hosted_by a').text().trim() || '';

				return {
					id: crypto.randomUUID(),
					title: name.trim(),
					startDate: startDate,
					endDate: endDate,
					jamPageUrl: fullUrl,
					submissionCount: submissionCount,
					participatingUsers: participatingUsers,
					bannerImage: bannerImage,
					host: host,
					featured: false,
					status: status
				};
			});

			const jamsToInsert = (await Promise.all(jamPromises)).filter(
				(jamData): jamData is NonNullable<typeof jamData> => jamData !== null
			);
			if (jamsToInsert.length > 0) {
				const result = await db
					.insert(jam)
					.values(jamsToInsert)
					.onConflictDoUpdate({
						target: jam.jamPageUrl,
						set: {
							title: sql`excluded.title`,
							startDate: sql`excluded.start_date`,
							endDate: sql`excluded.end_date`,
							submissionCount: sql`excluded.submission_count`,
							participatingUsers: sql`excluded.participating_users`,
							bannerImage: sql`excluded.banner_image`,
							host: sql`excluded.host`,
							status: sql`excluded.status`
						}
					})
					.returning();

				if (result && result.length > 0) {
					console.log(`Successfully processed ${result.length} jams.`);
				} else {
					console.warn(`Failed to process jams.`);
				}
			}

			const nextPageLink = $('a.next_page').attr('href');
			pageCount++; // Increment pageCount at the end of the current page's processing

			if (nextPageLink) {
				nextPage = new URL(nextPageLink, nextPage).toString();
				// Only log if we are actually going to scrape the next page
				if (loopIndefinitely || pageCount < maxPages) {
					console.log(`Scraping page: ${nextPage}`);
				}
			} else {
				nextPage = null;
			}
		}
	}
}
