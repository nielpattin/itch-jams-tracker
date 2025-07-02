import { db } from '$lib/server/db';
import { jam } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const idsParam = url.searchParams.get('ids');

	if (idsParam) {
		const ids = idsParam.split(',');
		const jams = await db.query.jam.findMany({
			where: inArray(jam.id, ids)
		});
		return new Response(
			JSON.stringify({
				jams,
				nextOffset: 0, // Not relevant for ID-based fetch
				hasMore: false // Not relevant for ID-based fetch
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const limit = Number(url.searchParams.get('limit') ?? 10);
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
