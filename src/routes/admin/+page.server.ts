import { scrapeItchIo } from '$lib/server/db/scraper';
import { fail } from '@sveltejs/kit';

export const actions = {
	runScraper: async () => {
		try {
			await scrapeItchIo();
			return { success: true };
		} catch (error) {
			console.error('Error running scraper:', error);
			return fail(500, { message: 'Failed to run scraper' });
		}
	}
};
