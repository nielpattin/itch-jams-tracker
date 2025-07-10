import { redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { scrapeItchIo } from '$lib/server/db/scraper';
import { db } from '$lib/server/db';
import { scraperStatus } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function setScraperStatus(status: 'running' | 'idle') {
	await db.update(scraperStatus).set({ status }).where(eq(scraperStatus.id, 'singleton'));
}

export const load = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.role || session.user.role !== 'admin') {
		throw redirect(302, '/login');
	}
	return {};
};

export const actions = {
	runScraper: async () => {
		try {
			await setScraperStatus('running');
			await scrapeItchIo();
			await setScraperStatus('idle');
			return { success: true };
		} catch (error) {
			await setScraperStatus('idle');
			console.error('Error running scraper:', error);
			return fail(500, { message: 'Failed to run scraper' });
		}
	},
	endScraper: async () => {
		try {
			await setScraperStatus('idle');
			return { success: true };
		} catch (error) {
			console.error('Error ending scraper:', error);
			return fail(500, { message: 'Failed to end scraper' });
		}
	}
};
