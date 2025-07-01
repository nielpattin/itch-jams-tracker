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
		'https://itch.io/jams/in-progress/sort-date',
		'https://itch.io/jams/upcoming/sort-date'
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

			const jamDivs = $('div.jam.lazy_images');

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

				const utcDate = $jamDiv.find('span.date_countdown').text();
				if (!utcDate) {
					console.warn(`Skipping jam "${name}": No UTC date found.`);
					return null;
				}

				let category: JamStatus | '' = '';
				const lowercasedTimingText = timingText.toLowerCase();
				if (lowercasedTimingText.includes('ended')) {
					category = 'ended';
				} else if (lowercasedTimingText.includes('starts in')) {
					category = 'upcoming';
				} else if (lowercasedTimingText.includes('submission closes in')) {
					category = 'in-progress';
				} else if (lowercasedTimingText.includes('voting ends in')) {
					category = 'voting';
				} else {
					console.info(`Skipping jam "${name}": Uncategorized timing '${timingText}'.`);
					return null;
				}

				const fullUrl = new URL(jamUrl, 'https://itch.io').toString();

				// Fetch and parse the jam's individual page for more details
				const jamPageHtml = await fetchHtml(fullUrl);
				if (!jamPageHtml) {
					console.warn(
						`Skipping details for jam "${name}": Could not fetch HTML for jam page ${fullUrl}.`
					);
					return null;
				}
				const $jamPage = cheerio.load(jamPageHtml);

				const participatingUsers = parseInt(
					$jamDiv
						.find('div.jam_stats > div.stat:nth-child(1) > span.number')
						.text()
						.replace(/,/g, '') || '0',
					10
				);
				const submissionCount = parseInt(
					$jamDiv
						.find('div.jam_stats > a.stat:nth-child(2) > span.number')
						.text()
						.replace(/,/g, '') || '0',
					10
				);

				// Extract additional details from the individual jam page
				const bannerImage = $jamPage('div.jam_header_image img').attr('src') || '';

				// Extract start and end dates from the jam page
				let startDate: Date | null = null;
				let endDate: Date | null = null;

				$jamPage('div.jam_sidebar_widget ul li').each((_i, el) => {
					const text = $jamPage(el).text();
					if (text?.includes('Starts:')) {
						const dateString = text.replace('Starts:', '').trim();
						startDate = new Date(dateString);
					} else if (text?.includes('Ends:')) {
						const dateString = text.replace('Ends:', '').trim();
						endDate = new Date(dateString);
					}
				});

				return {
					id: crypto.randomUUID(),
					title: name.trim(),
					startDate: startDate || new Date(),
					endDate: endDate || new Date(),
					jamPageUrl: fullUrl,
					submissionCount: submissionCount,
					participatingUsers: participatingUsers,
					bannerImage: bannerImage,
					featured: false,
					status: category as JamStatus
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
