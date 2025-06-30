import { redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { scrapeItchIo } from '$lib/server/db/scraper';

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
			await scrapeItchIo();
			return { success: true };
		} catch (error) {
			console.error('Error running scraper:', error);
			return fail(500, { message: 'Failed to run scraper' });
		}
	}
};
