// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { type MathfieldElementAttributes } from 'mathlive';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ user: User | null }>;
			user: User | null;
		}
		interface PageData {
			user: User | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace svelteHTML {
	interface IntrinsicElements {
		'math-field': MathfieldElementAttributes;
	}
}

export {};
