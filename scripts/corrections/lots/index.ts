/**
 * Registre des lots de corrections (`pnpm corrections:* <lot>`)
 */

import type { Lot } from '../lib/lot';
import { PILOT_LOT } from './pilote';
import { R_INV_LOT } from './r-inv';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LOTS: Record<string, Lot> = {
	[PILOT_LOT.name]: PILOT_LOT,
	[R_INV_LOT.name]: R_INV_LOT
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
