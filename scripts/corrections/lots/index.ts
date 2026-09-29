/**
 * Registre des lots de corrections (`pnpm corrections:* <lot>`)
 */

import type { Lot } from '../lib/lot';
import { PILOT_LOT } from './pilote';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LOTS: Record<string, Lot> = {
	[PILOT_LOT.name]: PILOT_LOT
};

// ============================================================================
// FUNCTIONS
// ============================================================================

export function findLot(name: string | undefined): Lot {
	const lot = name ? LOTS[name] : undefined;
	if (!lot) {
		throw new Error(`lot inconnu « ${name ?? ''} » ; lots : ${Object.keys(LOTS).join(', ')}`);
	}
	return lot;
}
