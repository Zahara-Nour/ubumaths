/**
 * Registre des lots de corrections (`pnpm corrections:* <lot>`)
 */

import type { Lot } from '../lib/lot';
import { PILOT_LOT } from './pilote';
import { N_DECOMP_LOT } from './n-decomp';
import { N_FRACDEC_LOT } from './n-fracdec';
import { R_INV_LOT } from './r-inv';
import { VAGUE1_DRAFTS_LOT, VAGUE1_PUBLISHED_LOT } from './vague1';
import { VAGUE2_BROUILLONS_LOT, VAGUE2_PUBLIES_LOT } from './vague2';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LOTS: Record<string, Lot> = {
	[PILOT_LOT.name]: PILOT_LOT,
	[R_INV_LOT.name]: R_INV_LOT,
	[N_FRACDEC_LOT.name]: N_FRACDEC_LOT,
	[N_DECOMP_LOT.name]: N_DECOMP_LOT,
	[VAGUE1_DRAFTS_LOT.name]: VAGUE1_DRAFTS_LOT,
	[VAGUE1_PUBLISHED_LOT.name]: VAGUE1_PUBLISHED_LOT,
	[VAGUE2_BROUILLONS_LOT.name]: VAGUE2_BROUILLONS_LOT,
	[VAGUE2_PUBLIES_LOT.name]: VAGUE2_PUBLIES_LOT
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
