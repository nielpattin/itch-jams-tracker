import { db } from '$lib/server/db';
import { jam } from '$lib/server/db/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

function isDateLike(val: unknown): val is Date {
	return typeof val === 'object' && val !== null && typeof (val as Date).getTime === 'function';
}

export const GET: RequestHandler = async ({ url }) => {
	const limit = Number(url.searchParams.get('limit') ?? 20);
	const page = Number(url.searchParams.get('page') ?? 1);
	const offset = (page - 1) * limit;
	const category = url.searchParams.get('category') ?? 'all';
	const idsParam = url.searchParams.get('ids');

	if (idsParam) {
		const ids = idsParam.split(',');
		const jams = await db.query.jam.findMany({
			where: inArray(jam.id, ids)
		});

		const now = Date.now();
		const jamsToEnd = jams.filter(
			(j) =>
				j.endDate &&
				((typeof j.endDate === 'number' && j.endDate * 1000 <= now) ||
					(isDateLike(j.endDate) && j.endDate.getTime() <= now)) &&
				j.status === 'in-progress'
		);

		if (jamsToEnd.length > 0) {
			const { jam: jamTable } = await import('$lib/server/db/schema');
			const { eq } = await import('drizzle-orm');
			await Promise.all(
				jamsToEnd.map((j) => {
					return db.update(jamTable).set({ status: 'ended' }).where(eq(jamTable.id, j.id));
				})
			);
		}

		// Refetch jams after possible updates
		const updatedJams = await db.query.jam.findMany({
			where: inArray(jam.id, ids)
		});

		// Ensure status is correct in the response, even if DB is stale
		const now2 = Date.now();
		const jamsWithCorrectStatus = updatedJams.map((jam) => {
			let currentStatus = jam.status;
			if (
				jam.endDate &&
				((typeof jam.endDate === 'number' && jam.endDate * 1000 <= now2) ||
					(isDateLike(jam.endDate) && jam.endDate.getTime() <= now2)) &&
				jam.status === 'in-progress'
			) {
				currentStatus = 'ended';
			}
			return { ...jam, status: currentStatus, category: currentStatus };
		});

		return new Response(
			JSON.stringify({
				jams: jamsWithCorrectStatus,
				nextPage: page + 1,
				hasMore: jamsWithCorrectStatus.length === Number(url.searchParams.get('limit') ?? 20)
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const search = url.searchParams.get('search') ?? '';

	const whereConditions = [];

	// Only apply category filter if no search term is present
	if (!search && category && category !== 'all') {
		whereConditions.push(eq(jam.status, category as import('$lib/server/db/schema').JamStatus));
	}

	if (search) {
		whereConditions.push(sql`lower(${jam.title}) like ${`%${search.toLowerCase()}%`}`);
	}

	const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

	const jamsRaw = await db.query.jam.findMany({
		where,
		limit,
		offset
	});
	const jams = jamsRaw.map((jam) => ({
		...jam,
		category: jam.status
	}));

	return new Response(
		JSON.stringify({
			jams,
			nextPage: page + 1,
			hasMore: jams.length === limit
		}),
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
};
