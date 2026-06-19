/**
 * Typed-confirmation guard for destructive admin actions
 * ======================================================
 *
 * Once a teacher is elevated (or is a real admin), destructive operations don't
 * ask for the password again — instead they require a **typed confirmation**:
 * the client must echo back an EXACT expected token, either the resource's own
 * name (targeted op, e.g. delete a school → type the school name) or a fixed
 * keyword (global op, e.g. run a destructive cron → type `LANCER-CRON`).
 *
 * Enforced SERVER-SIDE so it can't be bypassed by calling the endpoint directly
 * (the UI dialog is only the friendly front door). Comparison is trimmed and
 * exact (case-sensitive) — the user is shown precisely what to type.
 *
 * @module lib/server/confirmAction
 */

import { error } from '@sveltejs/kit';

/**
 * Throw 400 unless `provided` exactly matches `expected` (after trimming).
 *
 * @param provided - the `confirm` value sent by the client (body/formData)
 * @param expected - the exact token the user must type (resource name or keyword)
 * @throws `400` when missing, non-string, or not an exact match
 *
 * @example Targeted (type the resource name)
 * ```ts
 * assertTypedConfirmation(formData.get('confirm'), school.name);
 * await supabase.from('schools').delete().eq('id', school.id);
 * ```
 * @example Global (type a keyword)
 * ```ts
 * assertTypedConfirmation(body.confirm, 'LANCER-CRON');
 * ```
 */
export function assertTypedConfirmation(provided: unknown, expected: string): void {
	if (typeof provided !== 'string' || provided.trim() !== expected.trim()) {
		throw error(400, `Confirmation requise : tapez exactement « ${expected} » pour confirmer.`);
	}
}
