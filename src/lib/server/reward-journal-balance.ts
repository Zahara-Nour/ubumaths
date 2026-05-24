/**
 * Reward Journal — Gidouilles Balance Helper
 * ==========================================
 *
 * Computes the gidouilles balance just after each event for display in the
 * student reward journal (e.g. "+1 → 9").
 *
 * Strategy: dynamic computation against `profiles.gidouilles` (current balance)
 * minus the sum of signed deltas for events strictly newer than the page's
 * newest gidouilles event. Avoids storing snapshots in event metadata, which
 * would require touching every trigger and historical backfill.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { RewardEvent, RewardEventType } from '$lib/types/reward-journal';

const POSITIVE_TYPES: ReadonlySet<RewardEventType> = new Set(['earned', 'awarded', 'unlocked']);
const NEGATIVE_TYPES: ReadonlySet<RewardEventType> = new Set(['spent', 'removed']);

/**
 * Compute the signed gidouilles delta from a stored event.
 *
 * Most insertion paths store `amount = ABS(delta)` and encode the sign via
 * `event_type`. The `traded` event type already stores a signed amount.
 */
function signedGidouilleDelta(event: Pick<RewardEvent, 'event_type' | 'amount'>): number {
	const amount = event.amount ?? 0;
	if (event.event_type === 'traded') return amount;
	if (POSITIVE_TYPES.has(event.event_type)) return Math.abs(amount);
	if (NEGATIVE_TYPES.has(event.event_type)) return -Math.abs(amount);
	return 0;
}

/**
 * Mutates the events array in place, attaching `balance_after` to each
 * gidouilles event. Non-gidouilles events are left untouched.
 *
 * Pre-condition: `events` is sorted by `created_at` DESC (newest first), as
 * returned by the journal endpoints.
 */
export async function attachGidouillesBalances(
	events: RewardEvent[],
	studentId: string,
	supabase: SupabaseClient<Database>
): Promise<void> {
	const gidouillesEvents = events.filter((e) => e.reward_type === 'gidouilles');
	if (gidouillesEvents.length === 0) return;

	const newestInPage = gidouillesEvents[0];

	const [profileResult, newerResult] = await Promise.all([
		supabase.from('profiles').select('gidouilles').eq('id', studentId).single(),
		supabase
			.from('reward_events')
			.select('event_type, amount')
			.eq('student_id', studentId)
			.eq('reward_type', 'gidouilles')
			.gt('created_at', newestInPage.created_at)
	]);

	if (profileResult.error || !profileResult.data) {
		console.error('[reward-journal-balance] Failed to fetch profile:', profileResult.error);
		return;
	}
	if (newerResult.error) {
		console.error('[reward-journal-balance] Failed to fetch newer events:', newerResult.error);
		return;
	}

	const currentBalance = profileResult.data.gidouilles ?? 0;
	const sumNewer = (newerResult.data ?? []).reduce(
		(acc, ev) => acc + signedGidouilleDelta(ev as Pick<RewardEvent, 'event_type' | 'amount'>),
		0
	);

	let runningBalance = currentBalance - sumNewer;
	for (const event of gidouillesEvents) {
		event.balance_after = runningBalance;
		runningBalance -= signedGidouilleDelta(event);
	}
}
