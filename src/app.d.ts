// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { type MathfieldElementAttributes } from 'mathlive';
import type { Profile } from '$lib/types/database-helpers';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ user: User | null }>;
			user: User | null;
			profile: Profile | null;
			requestId: string;
			/**
			 * Admin-scoped Supabase client, present only when the request carries a
			 * valid admin elevation (Pattern 2). Queries through this client run with
			 * RLS evaluated as `auth.uid() = <admin>`. Set by adminElevationHandle.
			 */
			adminSupabase?: SupabaseClient;
			/**
			 * Admin elevation state for this request. `null`/absent → not elevated.
			 * `expiresAt` is a Unix epoch in milliseconds. Set by adminElevationHandle.
			 */
			adminElevation?: { active: boolean; adminUserId: string; expiresAt: number } | null;
		}
		interface PageData {
			user: User | null;
			profile: Profile | null;
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
