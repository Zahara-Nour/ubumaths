/**
 * Atelier — le modèle sous le champ de la console pour une définition de
 * fonction : « f(x) = x² sur [0;3] », puis, « sur » tapé, l'écriture d'un
 * intervalle.
 *
 * Phase 0 `docs/wip/modele-definition-progress.md` (validée le 2026-11-14).
 * Une indication seulement : la ligne se calcule telle quelle.
 *
 * Lit `desk.draft`, la ligne en TEXTE quel que soit le champ (`draftTextOf`).
 * Venue du champ mathématique, elle garde « sur » collé à ce qui précède
 * (`x^2sur`, `xsur`) : on la lit alors comme le LaTeX, où « sur » se reconnaît à
 * ce qui le SUIT (`interval.ts`).
 *
 * @module atelier/draft-hint
 */

import type { InputMode } from './input-mode';
import { intervalWord } from './interval';

// =============================================================================
// Types
// =============================================================================

/** Ce que montre la ligne « Modèle : » : l'écriture à suivre, et à quoi elle sert. */
export interface DraftHint {
	readonly model: string;
	readonly note?: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** Les écritures d'un ensemble, une fois « sur » tapé. */
export const INTERVAL_MODEL = '[a;b], ]a;b[, [0;+∞[';

const INTERVAL_NOTE = 'pour choisir l’ensemble';

/** Le début d'une définition de fonction : `f(x) =`, `f_1(t) =` (la forme de `calcul.ts`). */
const FUNCTION_DEFINITION = /^\s*([A-Za-z](?:_\d+)?)\s*\(\s*([A-Za-z])\s*\)\s*=/;

// =============================================================================
// Fonctions
// =============================================================================

/** Le modèle d'une définition de fonction en cours d'écriture, ou `null`. */
export function definitionHint(draft: string, inputMode: InputMode): DraftHint | null {
	const match = FUNCTION_DEFINITION.exec(draft);
	if (match === null) return null;
	const [start, name, letter] = match;
	// Une définition en n est une SUITE (`kindOf`, `calcul.ts`), qui refuse « sur »
	if (letter === 'n') return null;
	const body = draft.slice(start.length);
	if (intervalWord(body, inputMode === 'math' ? 'latex' : 'detect', true) !== null) {
		return { model: INTERVAL_MODEL };
	}
	return { model: `${name}(${letter}) = ${letter}² sur [0;3]`, note: INTERVAL_NOTE };
}
