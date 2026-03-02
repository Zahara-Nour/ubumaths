/**
 * VIP Card Activation Context Validator
 * ======================================
 *
 * Validates whether a student can self-activate a VIP card based on its
 * action.context field. Cards with a non-null action.context can
 * bypass teacher approval when the context condition is met.
 *
 * To add a new context: add an entry to contextValidators.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type ContextValidator = (supabase: SupabaseClient<Database>, studentId: string) => Promise<boolean>;

/**
 * Registry of context validators.
 * Each key matches a possible value of action.context in the JSONB action field.
 */
const contextValidators: Record<string, ContextValidator> = {
	/** Always valid — student can self-activate freely */
	any: async () => true,

	/** Valid only when the student has an in-progress minesweeper game */
	minesweeper: async (supabase, studentId) => {
		const { data, error } = await supabase
			.from('minesweeper_games')
			.select('id')
			.eq('student_id', studentId)
			.eq('status', 'in_progress')
			.limit(1);
		if (error) {
			console.error('[vip-card-context] minesweeper query failed:', error);
			return false;
		}
		return (data?.length ?? 0) > 0;
	}
};

/**
 * Validate whether a student meets the activation context requirements.
 *
 * @param context - The action.context value from the card's action JSONB
 * @param supabase - Supabase client
 * @param studentId - UUID of the student attempting activation
 * @returns true if the context is valid, false otherwise
 */
export async function validateActivationContext(
	context: string,
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<boolean> {
	const validator = contextValidators[context];
	if (!validator) {
		// Unknown context — deny by default
		return false;
	}
	return validator(supabase, studentId);
}
