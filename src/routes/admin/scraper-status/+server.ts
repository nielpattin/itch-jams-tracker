import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scraperStatus } from '$lib/server/db/schema';

import { eq } from 'drizzle-orm';

async function getScraperStatus(): Promise<'running' | 'idle'> {
	const row = await db.query.scraperStatus.findFirst({
		where: eq(scraperStatus.id, 'singleton')
	});
	if (!row) {
		await db.insert(scraperStatus).values({ id: 'singleton', status: 'idle' });
		return 'idle';
	}
	return row.status === 'running' ? 'running' : 'idle';
}

export async function GET() {
	const status = await getScraperStatus();
	return json({ status });
}
