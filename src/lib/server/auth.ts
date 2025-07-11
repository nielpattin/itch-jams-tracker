import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from './db'; // your drizzle instance

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite'
	}),

	emailAndPassword: {
		enabled: true
	},
	plugins: [admin()],

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 1 week
		updateAge: 60 * 60 * 24 * 7 // 1 week
	}
});

export type Auth = typeof auth;

declare module 'better-auth' {
	interface Register {
		Auth: typeof auth;
	}
}
