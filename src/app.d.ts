// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { type MathfieldElementAttributes } from 'mathlive';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
		}
		interface PageData {
			session: Session | null;
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
