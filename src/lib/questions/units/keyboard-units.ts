/**
 * Unit System - Virtual Keyboard Units
 * ====================================
 *
 * Touches de l'onglet « Unités » du clavier virtuel MathLive : les unités
 * scolaires de la GRANDEUR attendue par les trous à unité d'une question.
 *
 * Une touche insère la forme d'AFFICHAGE de l'unité (`unitWritingToLatex` :
 * `\mathrm{km}`, `\mathrm{m}/\mathrm{s}`…), jamais une macro `\unit` : la
 * correction la relit via `normalizeStudentQuantity` (cf. le test
 * `keyboard-units.test.ts`, aller-retour touche → correction).
 *
 * @module questions/units/keyboard-units
 */

import type { VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';
import { unitWritingToLatex } from '$lib/mathAST/units/display';
import { unitsAreCompatible } from '$lib/mathAST/units/conversion';
import type { Unit } from '$lib/mathAST/units/types';
import { extractUnitFromLatex, parseUnitExpression } from './parser';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Identifiant de l'onglet, pour le retrouver parmi les layouts du clavier */
export const UNITS_LAYOUT_ID = 'chiphre-units';

/**
 * Unités courantes au collège, par grandeur, dans l'ordre croissant.
 * Les écritures suivent `docs/ref/notation-unites.md` (lisibles par `parseUnitExpression`).
 */
const UNIT_CATALOGUE: readonly (readonly string[])[] = [
	['mm', 'cm', 'm', 'km'], // longueur
	['mg', 'g', 'kg', 't'], // masse
	['s', 'min', 'h'], // durée
	['mL', 'cL', 'L', 'cm^3', 'm^3'], // volume
	['mm^2', 'cm^2', 'm^2', 'km^2', 'ha'], // aire
	['m/s', 'km/h'], // vitesse
	['°C'], // température
	['°'], // angle
	['€'] // monnaie
];

/** Grandeur inconnue (ou réponse attendue illisible) : quelques unités d'usage courant */
const FALLBACK_UNITS: readonly string[] = ['cm', 'm', 'km', 'g', 'kg', 's', 'min', 'h', 'L'];

/** Nombre de touches d'unité par rangée du clavier */
const KEYS_PER_ROW = 6;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Unité de la réponse attendue d'un trou (`5\unit{km}` → km), ou null si illisible */
function expectedUnit(expectedAnswer: string): Unit | null {
	const writing = extractUnitFromLatex(expectedAnswer);
	return writing ? parseUnitExpression(writing) : null;
}

/** Unités du catalogue de même grandeur que `unit`, ou null si la grandeur n'y est pas */
function magnitudeUnits(unit: Unit): readonly string[] | null {
	return (
		UNIT_CATALOGUE.find((group) =>
			group.some((writing) => {
				const candidate = parseUnitExpression(writing);
				return candidate !== null && unitsAreCompatible(candidate, unit);
			})
		) ?? null
	);
}

/**
 * Écritures des touches d'unité pour les trous à unité d'une question.
 *
 * - les unités imposées (lisibles) d'abord ;
 * - puis les unités scolaires de la grandeur de chaque réponse attendue ;
 * - grandeur introuvable → un petit jeu générique ;
 * - aucun trou à unité → aucune touche.
 *
 * @param expectedAnswers - réponses attendues des trous à unité (`5\unit{km}`)
 * @param requiredUnits - unité imposée de chaque trou, s'il y en a une
 * @example
 * unitKeysFor(['5\\unit{km}'], ['km']) // ['km', 'mm', 'cm', 'm']
 */
export function unitKeysFor(
	expectedAnswers: string[],
	requiredUnits: (string | undefined)[]
): string[] {
	if (expectedAnswers.length === 0) return [];

	const keys: string[] = [];
	const add = (writing: string) => {
		if (!keys.includes(writing)) keys.push(writing);
	};

	for (const required of requiredUnits) {
		if (required && parseUnitExpression(required)) add(required);
	}

	for (const answer of expectedAnswers) {
		const unit = expectedUnit(answer);
		const group = unit ? magnitudeUnits(unit) : null;
		(group ?? FALLBACK_UNITS).forEach(add);
	}

	return keys;
}

/** Une touche d'unité : l'étiquette et l'insertion sont la forme affichée */
function unitKeycap(writing: string): Partial<VirtualKeyboardKeycap> {
	const latex = unitWritingToLatex(writing);
	return { latex, insert: latex, tooltip: writing };
}

/**
 * L'onglet « Unités » du clavier virtuel MathLive : les touches d'unité,
 * puis une rangée de navigation (le reste reste accessible par les autres onglets).
 */
export function buildUnitsKeyboardLayout(writings: string[]): VirtualKeyboardLayout {
	const rows: (string | Partial<VirtualKeyboardKeycap>)[][] = [];
	for (let i = 0; i < writings.length; i += KEYS_PER_ROW) {
		rows.push(writings.slice(i, i + KEYS_PER_ROW).map(unitKeycap));
	}
	rows.push(['[left]', '[right]', '[backspace]']);

	return {
		id: UNITS_LAYOUT_ID,
		label: 'Unités',
		tooltip: 'Unités de la réponse',
		rows
	};
}
