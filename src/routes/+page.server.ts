import { db } from '$lib/server/db';

export async function load() {
	return {
		jams: await db.query.jam.findMany()
	};
}
