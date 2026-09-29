/**
 * Lot de corrections
 * ==================
 *
 * Un lot nomme les modèles à corriger et, pour chacun, sa classe (R / N) et son
 * code (`R-PASS`, `N-SIGNES`…). Une stratégie R est GÉNÉRÉE depuis la structure du
 * modèle (registre `GENERATORS`) ; une règle N est RÉDIGÉE à la main dans le
 * fichier du lot (`written`), au même format de sortie.
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import type { ProposalSteps } from './proposal';
import { generateRPass } from './r-pass';

// ============================================================================
// TYPES
// ============================================================================

export interface WrittenCorrection {
	steps: ProposalSteps;
	notes: string[];
}

export interface LotEntry {
	templateId: string;
	classe: 'R' | 'N';
	code: string;
	/** Correction rédigée (règles N) ; absente → générée par la stratégie du code */
	written?: (template: QuestionTemplate) => WrittenCorrection;
}

export interface Lot {
	name: string;
	description: string;
	entries: LotEntry[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Stratégies R générées depuis la structure du modèle */
export const GENERATORS: Record<string, (template: QuestionTemplate) => WrittenCorrection> = {
	'R-PASS': (template) => {
		const { byVariation, notes } = generateRPass(template);
		return { steps: { byVariation }, notes };
	}
};

// ============================================================================
// FUNCTIONS
// ============================================================================

/** La correction d'une entrée : rédigée si le lot la donne, sinon générée */
export function buildCorrection(
	entry: LotEntry,
	template: QuestionTemplate
): WrittenCorrection & { source: 'generated' | 'written' } {
	if (entry.written) return { ...entry.written(template), source: 'written' };
	const generator = GENERATORS[entry.code];
	if (!generator) {
		throw new Error(`${entry.code} : ni correction rédigée ni stratégie générée`);
	}
	return { ...generator(template), source: 'generated' };
}
