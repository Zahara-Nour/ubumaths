/**
 * Buddy Message Engine
 * =====================
 *
 * Picks random messages from the pre-written bank with anti-repetition.
 * Keeps track of recently used messages per context to avoid repeats.
 */

import {
	buddyMessages,
	type PalotinType,
	type BuddyMessageContext
} from '$lib/config/buddy-messages';
import type { BuddyExpression } from '$lib/types/buddy';

const RECENT_HISTORY_SIZE = 5;

/** Map context -> expression for avatar display */
const CONTEXT_EXPRESSION_MAP: Record<BuddyMessageContext, BuddyExpression> = {
	correct: 'happy',
	incorrect: 'sad',
	idle: 'neutral',
	idle_lore: 'thinking',
	streak_3: 'excited',
	streak_7: 'excited',
	streak_14: 'excited',
	streak_30: 'excited',
	streak_lost: 'sad',
	level_up: 'excited',
	theme_fractions: 'thinking',
	theme_geometry: 'thinking',
	theme_algebra: 'thinking',
	theme_calcul_mental: 'thinking',
	theme_proportions: 'thinking',
	theme_statistiques: 'thinking',
	theme_nombres: 'thinking',
	theme_equations: 'thinking',
	vip_card_common: 'happy',
	vip_card_rare: 'happy',
	vip_card_epic: 'excited',
	vip_card_legendary: 'excited',
	onboarding: 'encouraging'
};

class BuddyMessageEngine {
	/** context -> set of recently used indices */
	private recentIndices = new Map<string, number[]>();

	/**
	 * Pick a random message for the given palotin and context.
	 * Avoids repeating the last RECENT_HISTORY_SIZE messages per context.
	 */
	getMessage(palotin: PalotinType, context: BuddyMessageContext): string | null {
		const messages = buddyMessages[palotin]?.[context];
		if (!messages || messages.length === 0) return null;

		const key = `${palotin}:${context}`;
		const recent = this.recentIndices.get(key) ?? [];

		// Build list of available indices (not recently used)
		let available = messages.map((_, i) => i).filter((i) => !recent.includes(i));

		// If all messages were recently used, reset history
		if (available.length === 0) {
			available = messages.map((_, i) => i);
			this.recentIndices.set(key, []);
		}

		// Pick random from available
		const idx = available[Math.floor(Math.random() * available.length)];

		// Update recent history
		const updated = [...recent, idx];
		if (updated.length > RECENT_HISTORY_SIZE) {
			updated.shift();
		}
		this.recentIndices.set(key, updated);

		return messages[idx];
	}

	/**
	 * Get a specific level-up message (indexed by level).
	 */
	getLevelUpMessage(palotin: PalotinType, level: number): string | null {
		const messages = buddyMessages[palotin]?.level_up;
		if (!messages || level < 1 || level > messages.length) return null;
		return messages[level - 1];
	}

	/**
	 * Get the expression to display for a given context.
	 */
	getExpression(context: BuddyMessageContext): BuddyExpression {
		return CONTEXT_EXPRESSION_MAP[context] ?? 'neutral';
	}
}

export const buddyMessageEngine = new BuddyMessageEngine();
