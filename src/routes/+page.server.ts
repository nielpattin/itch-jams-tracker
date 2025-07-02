import { db } from '$lib/server/db';

export async function load({ url }) {
	// const category = url.searchParams.get('category') ?? 'all';
	const limit = Number(url.searchParams.get('limit') ?? 10);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	const jams = await db.query.jam.findMany({
		limit,
		offset
	});

	return {
		jams,
		nextOffset: offset + jams.length,
		hasMore: jams.length === limit
	};
}
