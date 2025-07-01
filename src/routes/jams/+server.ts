import { db } from '$lib/server/db';
import { jam } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const limit = Number(url.searchParams.get('limit') ?? 8);
	const offset = Number(url.searchParams.get('offset') ?? 0);
	const category = url.searchParams.get('category') ?? 'all';

	const where =
		category && category !== 'all'
			? eq(jam.status, category as import('$lib/server/db/schema').JamStatus)
			: undefined;

	const jams = await db.query.jam.findMany({
		where,
		limit,
		offset
	});

	return new Response(
		JSON.stringify({
			jams,
			nextOffset: offset + jams.length,
			hasMore: jams.length === limit
		}),
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
};
