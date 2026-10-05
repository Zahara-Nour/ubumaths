/**
 * Ensemble FINI de nombres complexes dans une case « intervalles » (décision de David, 2026-10-05)
 * ==============================================================================================
 *
 * « Donne l'ensemble des solutions dans ℂ » : `\{1+i;1-i\}`. La lecture des intervalles
 * (`domain/validation`) ne connaît que des réels : l'attendue était « illisible ». Ici, un
 * ensemble fini dont un élément au moins contient `i` est lu élément par élément et comparé :
 *
 * - ordre libre, éléments appariés par ÉQUIVALENCE de valeur (`areEquivalent` exact :
 *   `\sqrt{2}e^{i\frac{\pi}{4}}` vaut `1+i`, `\imaginaryI` vaut `i`) ;
 * - élément manquant, en trop ou faux : faux ;
 * - fraction simplifiable dans un élément : écriture à reprendre (`intervalForm`, ½ par
 *   défaut), comme pour un ensemble fini de réels.
 *
 * Jamais d'intervalle complexe : seul un ensemble fini `{a ; b ; …}` est lu.
 *
 * @module questions/intervals/complex-finite-set
 */

import type { ConstraintMode } from '$lib/questions/types';
import { areEquivalent } from '$lib/math';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { findNodes } from '$lib/mathAST/transforms';
import { isVariable } from '$lib/mathAST/guards';
import { cosmeticViolations } from '$lib/mathAST/cosmetic-transforms';
import type { IntervalVerdict } from './interval-answer';

/** Au-delà, un ensemble n'est pas une liste de solutions (garde de coût : n² comparaisons) */
const MAX_ELEMENTS = 12;

/** Budget d'une comparaison d'éléments (même ordre que la case ordinaire) */
const EQUIVALENCE_TIMEOUT_MS = 500;

/** Lettres admises dans un élément : unité imaginaire, constante d'Euler */
const CONSTANT_LETTERS = new Set(['i', 'e']);

/** `i` employé seul (pas dans `\pi`, `\sin`, `\infty`) ou `\imaginaryI` */
const IMAGINARY_UNIT = /\\imaginaryI|(?<![\\a-zA-Z])i(?![a-zA-Z])/;

/** Messages figés (français, tutoiement) */
const FEEDBACK = {
	notAFiniteSet: 'Écris l’ensemble des solutions entre accolades : {a ; b}.',
	unsimplified: 'La fraction peut être simplifiée.'
};

/**
 * Éléments d'un ensemble fini écrit `\{a;b\}` (`\left\{…\right\}`, `\lbrace…\rbrace`,
 * `S=` en tête toléré), chacun lisible et constant ; `null` sinon.
 */
export function readFiniteSetElements(text: string): string[] | null {
	const body = text
		.trim()
		.replace(/^(?:S|\\mathcal\s*\{\s*S\s*\})\s*=\s*/, '')
		.replace(/\\left\s*\\\{|\\left\s*\\lbrace/g, '\\{')
		.replace(/\\right\s*\\\}|\\right\s*\\rbrace/g, '\\}')
		.replace(/\\lbrace/g, '\\{')
		.replace(/\\rbrace/g, '\\}')
		.trim();
	if (!body.startsWith('\\{') || !body.endsWith('\\}')) return null;
	const inner = body.slice(2, -2);
	if (inner.includes('\\{') || inner.includes('\\}')) return null;
	const elements = inner.split(';').map((element) => element.trim());
	if (elements.length > MAX_ELEMENTS || elements.some((element) => element === '')) return null;
	for (const element of elements) {
		const parsed = parseLatexSafe(element);
		if (!parsed.ast || parsed.errors.length > 0) return null;
		const letters = findNodes(parsed.ast, isVariable);
		if (letters.some((letter) => !isVariable(letter) || !CONSTANT_LETTERS.has(letter.name))) {
			return null;
		}
	}
	return elements;
}

/**
 * Attendue d'une case « intervalles » écrite comme un ensemble fini de complexes
 * (un élément au moins contient `i`) : ses éléments, sinon `null` (lecture réelle).
 */
export function readExpectedComplexSet(expected: string): string[] | null {
	const elements = readFiniteSetElements(expected);
	return elements && elements.some((element) => IMAGINARY_UNIT.test(element)) ? elements : null;
}

/** Les deux éléments ont-ils la même valeur ? (exact, sous budget) */
function sameValue(a: string, b: string): boolean {
	try {
		return areEquivalent(a, b, { timeoutMs: EQUIVALENCE_TIMEOUT_MS });
	} catch {
		return false;
	}
}

/** Fraction simplifiable dans l'élément (`\frac{2-2i}{4}`, `\frac{2\sqrt{3}}{4}i`) */
function hasReducibleFraction(element: string): boolean {
	return cosmeticViolations(element, { reducedFractions: 'warn' }).some(
		(violation) => violation.id === 'reducedFractions'
	);
}

/**
 * Juge un ensemble fini de complexes.
 *
 * @param written - réponse de l'élève (sans « S = »)
 * @param expected - éléments de l'attendue (`readExpectedComplexSet`)
 * @param mode - réglage `intervalForm` (fraction simplifiable)
 */
export function judgeComplexFiniteSet(
	written: string,
	expected: readonly string[],
	mode: ConstraintMode
): IntervalVerdict {
	const elements = readFiniteSetElements(written);
	if (!elements) return { status: 'incorrect', feedback: FEEDBACK.notAFiniteSet };
	// Chaque élément de l'élève doit valoir un élément attendu, et réciproquement
	const everyWrittenExpected = elements.every((element) =>
		expected.some((target) => sameValue(element, target))
	);
	const everyExpectedWritten = expected.every((target) =>
		elements.some((element) => sameValue(element, target))
	);
	if (!everyWrittenExpected || !everyExpectedWritten) return { status: 'incorrect' };
	if (mode !== 'off' && elements.some(hasReducibleFraction)) {
		return {
			status: mode === 'strict' ? 'bad_form' : 'unoptimal_form',
			feedback: FEEDBACK.unsimplified
		};
	}
	return { status: 'correct' };
}
