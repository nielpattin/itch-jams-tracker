import { db } from '$lib/server/db';
import { jam, type JamStatus } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function load({ url, cookies }) {
	const limit = Number(url.searchParams.get('limit') ?? 20);
	const page = Number(url.searchParams.get('page') ?? 1);
	const offset = (page - 1) * limit;
	const category = (url.searchParams.get('category') ??
		cookies.get('itchjam-category') ??
		'all') as JamStatus | 'all';

	const whereConditions = [];

	if (category && category !== 'all') {
		whereConditions.push(eq(jam.status, category as JamStatus));
	}

	const jams = await db.query.jam.findMany({
		where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
		limit,
		offset
	});

	return {
		jams: jams.map((j) => ({ ...j, category: j.status })), // Ensure category reflects actual status
		nextPage: page + 1,
		hasMore: jams.length === limit,
		initialCategory: category
	};
}
