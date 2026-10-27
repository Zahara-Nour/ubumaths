/**
 * Case « choix » : réponse, bonne réponse, envoi (chantier figure-et-choix § 2.1)
 * ==============================================================================
 *
 * Une case choix (bloc ```choix, `InstanceBlank.choice`) répond comme toute case :
 * une chaîne dans `values[]`, les indices d'ORIGINE des choix cochés, triés, sans
 * doublon, séparés par `;` (« 1 », « 0;2 » ; « » = rien coché). Sa bonne réponse
 * (`expectedAnswer`) a la même forme.
 *
 * Évaluation notée : le navigateur ne connaît que l'ordre AFFICHÉ (la version
 * publique ne dit pas l'ordre d'origine, qui trahirait la réponse quand l'auteur
 * écrit le bon choix en premier). Il envoie donc des positions affichées, que le
 * serveur ramène aux indices d'origine (`toOriginalChoiceValues`) avant de
 * corriger et d'enregistrer — comme pour le QCM (`choices.ts`).
 *
 * @module questions/choice-case
 */

import { z } from 'zod';
import type { InstanceBlank, QuestionInstance } from './types';
import { MAX_ANSWER_LENGTH } from './submission';

// Types
type ChoiceBlank = InstanceBlank & { choice: NonNullable<InstanceBlank['choice']> };

// Constantes
/** Indices séparés par `;`, sans zéro de tête ni espace */
const ANSWER_REGEX = /^(?:0|[1-9]\d{0,2})(?:;(?:0|[1-9]\d{0,2}))*$/;
export const CHOICE_ANSWER_UNREADABLE_MESSAGE = 'Réponse à une case choix illisible';

// Functions
/** La case est-elle une case choix ? */
export function isChoiceBlank(blank: InstanceBlank | undefined): blank is ChoiceBlank {
	return blank?.choice !== undefined;
}

/**
 * Indices lus (format seul, sans bornes) ; `null` si illisible, ou répété sauf
 * `repeats: true` (bonne réponse calculée de l'auteur : un indice répété compte une fois)
 */
function readIndexes(value: string, settings: { repeats?: boolean } = {}): number[] | null {
	if (value === '') return [];
	if (!ANSWER_REGEX.test(value)) return null;
	const indexes = value.split(';').map(Number);
	const distinct = [...new Set(indexes)];
	if (distinct.length === indexes.length || settings.repeats) return distinct;
	return null;
}

/**
 * Réponse d'une case choix → indices d'origine triés. `''` → `[]` (rien coché) ;
 * illisible, hors des `count` choix ou répété → `null`.
 */
export function parseChoiceAnswer(value: string, count: number): number[] | null {
	const indexes = readIndexes(value);
	if (indexes === null || indexes.some((index) => index >= count)) return null;
	return [...indexes].sort((a, b) => a - b);
}

/** Indices → réponse d'une case choix (triés, séparés par `;`) */
export function formatChoiceAnswer(indexes: readonly number[]): string {
	return [...new Set(indexes)].sort((a, b) => a - b).join(';');
}

/** Schéma de la réponse à une case choix de `count` choix (refus : illisible, hors bornes, doublon) */
export function choiceAnswerSchema(count: number) {
	return z
		.string()
		.max(MAX_ANSWER_LENGTH)
		.refine((value) => parseChoiceAnswer(value, count) !== null, CHOICE_ANSWER_UNREADABLE_MESSAGE);
}

/**
 * Bonne réponse écrite par l'auteur (résolue), contrôlée : mêmes règles que le
 * QCM (`choice-answer-count.ts`). Rend les indices triés, ou les messages (sans
 * préfixe de case) ; un brouillon peut n'avoir encore aucune bonne réponse.
 */
export function readExpectedChoices(
	raw: string,
	count: number,
	multiple: boolean,
	settings: { draft?: boolean } = {}
): { indexes: number[]; errors: string[] } {
	const value = raw.trim();
	// Calculée (`0;{{f1}};{{eval:2*f2}}`), elle peut répéter un indice : il compte une fois
	const indexes = readIndexes(value, { repeats: true });
	if (indexes === null) {
		return {
			indexes: [],
			errors: [
				`bonne réponse « ${value} » illisible (indices des bons choix, 0 pour le premier, séparés par ;)`
			]
		};
	}
	if (indexes.some((index) => index >= count)) {
		return {
			indexes: [],
			errors: [`bonne réponse « ${value} » hors des choix (0 à ${count - 1})`]
		};
	}
	if (indexes.length === 0) {
		return { indexes, errors: settings.draft ? [] : ['aucune bonne réponse'] };
	}
	if (indexes.length > 1 && !multiple) {
		return {
			indexes: [],
			errors: [
				`${indexes.length} bonnes réponses, mais « plusieurs: oui » n’est pas écrit : il en faut exactement une`
			]
		};
	}
	return { indexes: [...indexes].sort((a, b) => a - b), errors: [] };
}

/** Indices d'origine des bons choix d'une case choix */
export function correctChoiceIndexesOf(blank: ChoiceBlank): number[] {
	return parseChoiceAnswer(blank.expectedAnswer, blank.choice.choices.length) ?? [];
}

/** Lettre AFFICHÉE (A, B, C…) d'un choix désigné par son indice d'origine */
export function displayedChoiceLetter(blank: ChoiceBlank, originalIndex: number): string {
	const position = blank.choice.order.indexOf(originalIndex);
	return String.fromCharCode(65 + (position === -1 ? originalIndex : position));
}

/**
 * Serveur, évaluation notée : positions AFFICHÉES envoyées pour chaque case
 * choix → indices d'origine triés ; les autres cases passent telles quelles.
 * Réponse illisible, hors bornes ou répétée → `error` (refus 400 de l'envoi).
 * Nombre de valeurs différent du nombre de cases : rendu tel quel (le barème
 * le note faux).
 */
export function toOriginalChoiceValues(
	instance: QuestionInstance,
	values: readonly string[]
): { values: string[] } | { error: string } {
	const blanks = instance.blanks ?? [];
	if (values.length !== blanks.length) return { values: [...values] };
	const converted: string[] = [];
	for (const [index, value] of values.entries()) {
		const blank = blanks[index];
		if (!isChoiceBlank(blank)) {
			converted.push(value);
			continue;
		}
		const { order } = blank.choice;
		const checked = choiceAnswerSchema(order.length).safeParse(value);
		if (!checked.success) return { error: CHOICE_ANSWER_UNREADABLE_MESSAGE };
		const positions = parseChoiceAnswer(checked.data, order.length) ?? [];
		converted.push(formatChoiceAnswer(positions.map((position) => order[position])));
	}
	return { values: converted };
}
