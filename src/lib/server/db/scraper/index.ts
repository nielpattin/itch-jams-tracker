import * as cheerio from 'cheerio';
import { db } from '$lib/server/db';
import { jam, type JamStatus } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import { eq, sql } from 'drizzle-orm';

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

interface JamScriptData {
	end_date?: string;
	voting_end_date?: string;
	start_date?: string;
}

function parseViewJamScriptData($: cheerio.CheerioAPI): JamScriptData | null {
	let scriptData: JamScriptData | null = null;

	$('script[type="text/javascript"]').each((i, scriptEl) => {
		const scriptContent = $(scriptEl).html();
		if (scriptContent) {
			const match = scriptContent.match(
				/new I\.ViewJam\s*\('#view_jam_\d+'\s*,\s*(\{[\s\S]*?\})\s*\);/
			);
			if (match && match[1]) {
				try {
					scriptData = JSON.parse(match[1]) as JamScriptData;
					return false; // Break the loop
				} catch (e) {
					console.error('Error parsing script JSON:', e);
				}
			}
		}
	});
	return scriptData;
}

async function updateMissingJams(processedJamUrls: Set<string>) {
	console.log('Checking for missing jams to update...');
	const allJamsInDb = await db.query.jam.findMany();

	const missingJams = allJamsInDb.filter((dbJam) => !processedJamUrls.has(dbJam.jamPageUrl));

	if (missingJams.length === 0) {
		console.log('No missing jams found to update.');
		return;
	}

	console.log(`Found ${missingJams.length} missing jams. Fetching individual pages...`);

	const scraperDelayMs = parseInt(env.SCRAPER_DELAY_MS || '1000', 10);

	for (const missingJam of missingJams) {
		await new Promise((resolve) => setTimeout(resolve, scraperDelayMs));
		console.log(`Fetching individual page for: ${missingJam.title} (${missingJam.jamPageUrl})`);
		const html = await fetchHtml(missingJam.jamPageUrl);
		if (!html) {
			console.error(`Failed to fetch ${missingJam.jamPageUrl}: Not Found, deleting from database.`);
			await db.delete(jam).where(eq(jam.jamPageUrl, missingJam.jamPageUrl));
			continue;
		}

		const $ = cheerio.load(html);
		const submitterWidget = $('div.jam_submitter_widget');
		let newStatus: JamStatus | null = null;

		if (submitterWidget.hasClass('during_voting')) {
			newStatus = 'voting';
		} else if (submitterWidget.hasClass('after_voting')) {
			newStatus = 'ended';
		} else if (
			submitterWidget.hasClass('before_submissions') ||
			submitterWidget.hasClass('before_start')
		) {
			newStatus = 'upcoming';
		} else if (
			submitterWidget.hasClass('during_submissions') ||
			submitterWidget.hasClass('during_submit')
		) {
			newStatus = 'in-progress';
		}

		const scriptData = parseViewJamScriptData($);

		let newStartDate: Date | null = null;
		let newEndDate: Date | null = null;

		if (scriptData) {
			if (newStatus === 'voting' && scriptData.voting_end_date) {
				newEndDate = new Date(scriptData.voting_end_date);
			} else {
				if (scriptData.start_date) {
					newStartDate = new Date(scriptData.start_date);
				}
				if (scriptData.end_date) {
					newEndDate = new Date(scriptData.end_date);
				}
			}
		}

		const updateFields: { status?: JamStatus; startDate?: Date | null; endDate?: Date | null } = {};
		let needsUpdate = false;

		if (newStatus && newStatus !== missingJam.status) {
			updateFields.status = newStatus;
			needsUpdate = true;
		}

		// Only update if the new date is valid and different from the existing one
		if (newStartDate && newStartDate.getTime() !== missingJam.startDate?.getTime()) {
			updateFields.startDate = newStartDate;
			needsUpdate = true;
		} else if (newStartDate === null && missingJam.startDate !== null) {
			// If newStartDate is null but existing is not, set to null
			updateFields.startDate = null;
			needsUpdate = true;
		}

		if (newEndDate && newEndDate.getTime() !== missingJam.endDate?.getTime()) {
			updateFields.endDate = newEndDate;
			needsUpdate = true;
		} else if (newEndDate === null && missingJam.endDate !== null) {
			// If newEndDate is null but existing is not, set to null
			updateFields.endDate = null;
			needsUpdate = true;
		}

		if (needsUpdate) {
			console.log(`Updating jam "${missingJam.title}" with:`, updateFields);
			await db.update(jam).set(updateFields).where(eq(jam.jamPageUrl, missingJam.jamPageUrl));
		} else {
			// No significant updates needed for "${missingJam.title}".
		}
	}
	console.log('Finished checking and updating missing jams.');
}

export async function scrapeItchIo() {
	const processedJamUrls = new Set<string>();

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
		let maxPages = 1;

		if (scraperMaxPages === 'MAX') {
			loopIndefinitely = true;
		} else {
			maxPages = parseInt(scraperMaxPages || '1', 10);
		}

		while (nextPage && (loopIndefinitely || pageCount < maxPages)) {
			if (pageCount > 0) {
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

				let startDate: Date | null = null;
				let endDate: Date | null = null;

				const statusMatch = timingText.match(
					/(Starts in|Ended|Submission closes in|Voting ends in)/
				);
				if (!statusMatch) {
					console.info(`Skipping jam "${name}": No recognizable status found in timing text.`);
					return null;
				}

				let status: JamStatus = 'upcoming';
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

			jamsToInsert.forEach((j) => processedJamUrls.add(j.jamPageUrl));

			const nextPageLink = $('a.next_page').attr('href');
			pageCount++;

			if (nextPageLink) {
				nextPage = new URL(nextPageLink, nextPage).toString();
				if (loopIndefinitely || pageCount < maxPages) {
					console.log(`Scraping page: ${nextPage}`);
				}
			} else {
				nextPage = null;
			}
		}
	}

	await updateMissingJams(processedJamUrls);
}
