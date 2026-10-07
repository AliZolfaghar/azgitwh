declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { id: number; email: string; displayName: string } | null;
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
