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
		expiresIn: 60 * 60, // 60 minutes
		updateAge: 60 * 60 // 60 minutes (every 60 minutes the session expiration is updated)
	}
});

export type Auth = typeof auth;

declare module 'better-auth' {
	interface Register {
		Auth: typeof auth;
	}
}
