// Load environment variables from .env file
import 'dotenv/config';
/**
 * Standalone seed script: uses its own Drizzle client and auth instance.
 * Avoids importing db or auth from SvelteKit context to prevent $app/$env errors.
 */
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { user } from './schema';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';

// Create local Drizzle client for seeding
const client = createClient({
	url: process.env.DATABASE_URL!,
	authToken: process.env.DATABASE_AUTH_TOKEN
});
const db = drizzle(client, { schema });

// Create local auth instance for seeding
const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite'
	}),
	emailAndPassword: { enabled: true },
	plugins: [admin()],
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 1 week
		updateAge: 60 * 60 * 24 * 7 // 1 week
	}
});

async function main() {
	console.log('Seeding database...');

	// Check if an admin user already exists
	const existingAdmin = await db.query.user.findFirst({
		where: eq(user.role, 'admin')
	});

	if (existingAdmin) {
		console.log('Admin user already exists. Skipping seed.');
		return;
	}

	// Create an admin user
	const { user: createdUser } = await auth.api.createUser({
		body: {
			email: process.env.ADMIN_EMAIL || 'mail@example.com',
			password: process.env.ADMIN_PASSWORD || 'pass', // This will be hashed by Better Auth
			name: 'Admin User',
			role: 'admin'
		}
	});

	console.log(`Created admin user: ${createdUser.email}`);

	console.log('Database seeding complete.');
}

main()
	.catch((e) => {
		console.error('Database seeding failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		// Close the database connection if necessary
		// For Drizzle, the connection is usually managed by the adapter,
		// but if there's a direct client, it might need to be closed.
		// For now, assuming the process will exit.
	});
