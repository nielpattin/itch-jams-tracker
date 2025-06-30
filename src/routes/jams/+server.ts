import { db } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const limit = Number(url.searchParams.get('limit') ?? 8);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	const jams = await db.query.jam.findMany({
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
