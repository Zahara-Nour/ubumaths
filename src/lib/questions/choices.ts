/**
 * Case choix : lettres affichées et barème
 * ========================================
 *
 * La case choix (bloc ```choix, ADR 0033) parle en indices d'ORIGINE (ordre de
 * l'auteur) ; l'élève voit des lettres dans l'ordre affiché (`blank.choice.order`).
 *
 * @module questions/choices
 */

import type { ValidationStatus } from './types';

/** Lettre affichée (A, B, C…) d'une position affichée */
export function choiceLetter(displayedPosition: number): string {
	return String.fromCharCode(65 + displayedPosition);
}

/**
 * Statut d'une case choix (A4, barème Q101), indices d'ORIGINE : rien coché → empty ;
 * un mauvais coché → incorrect ; exactement les bons → correct ; des bons
 * seulement, mais pas tous → unoptimal_form (½).
 *
 * Seule source de vérité : la note du serveur (`gradeQuestion`) et la validation
 * du navigateur passent toutes deux par `choiceBlankResult` (answer-validator), qui
 * l'appelle (V4).
 */
export function statusFromChoices(
	selected: readonly number[],
	correct: readonly number[]
): ValidationStatus {
	const chosen = new Set(selected);
	if (chosen.size === 0) return 'empty';
	const good = new Set(correct);
	for (const index of chosen) {
		if (!good.has(index)) return 'incorrect';
	}
	return chosen.size === good.size ? 'correct' : 'unoptimal_form';
}
