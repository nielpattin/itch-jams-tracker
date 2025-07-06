import { db } from '$lib/server/db';
import { jam, type JamStatus } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ url, cookies }) {
	const limit = Number(url.searchParams.get('limit') ?? 10);
	const offset = Number(url.searchParams.get('offset') ?? 0);
	const category = (url.searchParams.get('category') ??
		cookies.get('itchjam-category') ??
		'upcoming') as JamStatus;

	const jams = await db.query.jam.findMany({
		where: eq(jam.status, category),
		limit,
		offset
	});

	return {
		jams: jams.map((j) => ({ ...j, category })),
		nextOffset: offset + jams.length,
		hasMore: jams.length === limit,
		initialCategory: category
	};
}
