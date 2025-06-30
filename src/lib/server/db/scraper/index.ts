import * as cheerio from 'cheerio';
import { db } from '$lib/server/db';
import { jam, type JamStatus } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';

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
	const startUrls = [
		'https://itch.io/jams/in-progress/sort-date',
		'https://itch.io/jams/upcoming/sort-date'
	];

	for (const url of startUrls) {
		console.log(`Scraping page: ${url}`);

		let nextPage: string | null = url;
		let pageCount = 0;
		const maxPages = parseInt(env.SCRAPER_MAX_PAGES || '1', 10);

		while (nextPage && pageCount < maxPages) {
			const html = await fetchHtml(nextPage);
			if (!html) {
				console.error(`Could not fetch HTML for ${nextPage}, skipping.`);
				nextPage = null;
				continue;
			}
			const $ = cheerio.load(html);

			const jamDivs = $('div.jam.lazy_images');

			for (const jamDiv of jamDivs.toArray()) {
				const $jamDiv = $(jamDiv);
				const name = $jamDiv.find('h3 a').text();
				if (!name) {
					console.warn('Skipping jam: No name found.');
					continue;
				}

				const jamUrl = $jamDiv.find('h3 a').attr('href');
				if (!jamUrl) {
					console.warn(`Skipping jam "${name}": No URL found.`);
					continue;
				}

				const timingText = $jamDiv.find('div.timestmap.meta_row').text();
				if (!timingText) {
					console.warn(`Skipping jam "${name}": No timing text found.`);
					continue;
				}

				const utcDate = $jamDiv.find('span.date_countdown').text();
				if (!utcDate) {
					console.warn(`Skipping jam "${name}": No UTC date found.`);
					continue;
				}

				let category = '';
				const lowercasedTimingText = timingText.toLowerCase();
				if (lowercasedTimingText.includes('starts in')) {
					category = 'upcoming';
				} else if (lowercasedTimingText.includes('submission closes in')) {
					category = 'in-progress';
				} else if (lowercasedTimingText.includes('voting ends in')) {
					category = 'voting';
				} else if (lowercasedTimingText.includes('ended')) {
					continue; // Skip ended jams
				} else {
					console.info(`Skipping jam "${name}": Uncategorized timing '${timingText}'.`);
					continue;
				}

				const fullUrl = new URL(jamUrl, 'https://itch.io').toString();

				// Fetch and parse the jam's individual page for more details
				const jamPageHtml = await fetchHtml(fullUrl);
				if (!jamPageHtml) {
					console.warn(
						`Skipping details for jam "${name}": Could not fetch HTML for jam page ${fullUrl}.`
					);
					continue;
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
				const bannerImage = $jamPage('div.jam_header_image img').attr('src') || ''; // Often the same as background, or needs specific selector

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

				const result = await db
					.insert(jam)
					.values({
						id: crypto.randomUUID(),
						title: name.trim(),
						startDate: startDate || new Date(), // Fallback to current date if parsing fails
						endDate: endDate || new Date(), // Fallback to current date if parsing fails
						jamPageUrl: fullUrl,
						submissionCount: submissionCount,
						participatingUsers: participatingUsers,
						bannerImage: bannerImage,
						featured: false, // Default to false, can be updated later if a "featured" indicator is found
						status: category as JamStatus
					})
					.onConflictDoUpdate({
						target: jam.jamPageUrl,
						set: {
							title: name.trim(),
							startDate: startDate || new Date(),
							endDate: endDate || new Date(),
							submissionCount: submissionCount,
							participatingUsers: participatingUsers,
							bannerImage: bannerImage,
							status: category as JamStatus
						}
					})
					.returning();

				if (result && result.length > 0) {
					console.log(`Successfully processed jam: "${name}"`);
				} else {
					console.warn(`Failed to process jam: "${name}"`);
				}
			}

			const nextPageLink = $('a.next_page').attr('href');
			if (nextPageLink) {
				nextPage = new URL(nextPageLink, 'https://itch.io').toString();
			} else {
				nextPage = null;
			}
			pageCount++;
		}
	}
}
