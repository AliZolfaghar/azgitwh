import type { AuthUser } from '#lib/server/auth.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AuthUser | null;
		}
		interface PageData {
			/** Shown in the top navbar */
			pageTitle?: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
