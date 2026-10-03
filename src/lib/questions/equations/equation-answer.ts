/**
 * Réponse « équation » : jugement d'une équation de droite ou de cercle
 * =====================================================================
 *
 * Case marquée `answerKind: 'equation'` (géométrie repérée). Une équation est
 * jugée sur l'ENSEMBLE DE POINTS qu'elle décrit, pas sur son écriture
 * (spécification validée par David le 2026-10-03) :
 *
 * - P = membre gauche − membre droit, développé et réduit par mathAST
 *   (`normalize` : coefficients rationnels et radicaux EXACTS, aucun flottant) ;
 *   P doit être un polynôme non constant en x et y ;
 * - la réponse est juste si P_rép = k·P_att, k constante non nulle
 *   (proportionnalité vérifiée par produits en croix, exacts) ;
 * - degré 1 (droite) : tout k → `correct` (`y = 2x + 1`, `4x − 2y + 2 = 0`…) ;
 * - degré ≥ 2 (cercle) : l'équation ramenée au coefficient 1 du terme de
 *   référence (x², sinon y², sinon le premier terme de plus haut degré dans
 *   l'ordre canonique de mathAST) ; réponse de coefficient ±1 → `correct` (forme
 *   centre-rayon ou développée, `3^2` ou `9`, membres échangés) ; |k| ≠ 1 →
 *   `unoptimal_form` (½), à simplifier (décision du 2026-10-03) ;
 * - forme exigée (`requiredForm` : `reduite`, `cartesienne`, `centre-rayon`) non
 *   respectée par une équation juste → `bad_form` ;
 * - pas une équation, non polynomiale, autres variables, illisible → `incorrect`,
 *   jamais d'exception ; rien d'écrit → `empty`.
 *
 * @module questions/equations/equation-answer
 */

import type { ValidationStatus, RequiredForm, EquationForm } from '$lib/questions/types';
import type { MathNode, RelationNode } from '$lib/mathAST/types';
import type { AlgebraicCoefficient, NormalTerm } from '$lib/mathAST/normal/types';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { normalize } from '$lib/mathAST/normal';
import { algebraicEquals, mulAlgebraic, negAlgebraic } from '$lib/mathAST/normal/algebraic';
import { getMonomialSignature } from '$lib/mathAST/normal/term';
import { subtract, variable } from '$lib/mathAST/factory';
import { flattenSumShallow } from '$lib/mathAST/flatten';
import { mapNode } from '$lib/mathAST/transforms';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { makeAbortChecker } from '$lib/mathAST/common/abort';
import { stripLatexSpacing } from '$lib/math';
import { isAnswerTooComplex } from '$lib/questions/answer-complexity';

// Types
export interface EquationVerdict {
	status: ValidationStatus;
	/** Message montré à l'élève (forme exigée, équation à simplifier, lecture impossible) */
	feedback?: string;
}

/** Équation lue : polynôme P = gauche − droite, sous forme num / dén (dén constant) */
interface EquationPolynomial {
	/** Termes de P (monômes en x et y, triés canoniquement par mathAST) */
	terms: readonly NormalTerm[];
	/** Dénominateur constant de P (souvent 1) */
	denominator: AlgebraicCoefficient;
	degree: number;
	/** P contient un terme en x² */
	hasXSquared: boolean;
	/**
	 * Terme de référence du coefficient 1 (degré ≥ 2) : x², sinon y², sinon le
	 * premier terme de plus haut degré dans l'ordre canonique de mathAST
	 */
	referenceIndex: number;
}

type ReadEquation =
	| { ok: true; relation: RelationNode; polynomial: EquationPolynomial }
	| { ok: false; error: string };

// Constantes

/** Messages figés (français, tutoiement) */
export const EQUATION_FEEDBACK = {
	notEquation: 'Écris une équation (avec le signe =) en x et y.',
	scaledSquare: 'Simplifie l’équation : le coefficient de x² doit valoir 1.',
	scaled: 'Simplifie l’équation : divise-la par le facteur commun de ses coefficients.',
	forms: {
		reduite: 'Donne l’équation réduite : y = mx + p (ou x = c pour une droite verticale).',
		cartesienne: 'Donne une équation cartésienne : ax + by + c = 0.',
		'centre-rayon': 'Donne l’équation sous la forme (x − a)² + (y − b)² = r².'
	}
} as const satisfies {
	notEquation: string;
	scaledSquare: string;
	scaled: string;
	forms: Record<EquationForm, string>;
};

/** Variables d'une équation du plan repéré */
const PLANE_VARIABLES = new Set(['x', 'y']);

/**
 * Plus grand exposant entier écrit : une droite ou un cercle n'en demande que 2.
 * Au-delà, `(x+y+1)^{999}` coûterait un développement démesuré.
 */
const MAX_WRITTEN_EXPONENT = 10;

/** Budget de la réduction d'UNE équation (la garde Q58 a déjà filtré l'écriture) */
const NORMALIZE_BUDGET_MS = 200;

// Functions

/** Formes d'équation exigeables (sous-ensemble de `RequiredForm`) */
export function isEquationForm(form: RequiredForm | undefined): form is EquationForm {
	return form === 'reduite' || form === 'cartesienne' || form === 'centre-rayon';
}

/** Lecture LaTeX tolérante, comme la comparaison d'expressions (virgule décimale, espaces) */
function parseAnswer(text: string): MathNode | null {
	try {
		const { ast } = parseLatexSafe(stripLatexSpacing(text.trim(), 'decimal'));
		return ast ?? null;
	} catch {
		return null;
	}
}

/** Contenu d'une parenthèse (récursivement) */
function unwrap(node: MathNode): MathNode {
	return node.type === 'delimiter' ? unwrap(node.content) : node;
}

/** Valeur d'un nombre écrit (`2`, `10`), NaN sinon */
function writtenInteger(node: MathNode): number {
	const inner = unwrap(node);
	return inner.type === 'number' ? Number(inner.value) : Number.NaN;
}

/** Un exposant entier écrit au-delà de MAX_WRITTEN_EXPONENT */
function hasHugeExponent(node: MathNode): boolean {
	let huge = false;
	mapNode(node, (n) => {
		if (n.type === 'superscript' && writtenInteger(n.superscript) > MAX_WRITTEN_EXPONENT) {
			huge = true;
		}
		return n;
	});
	return huge;
}

/** Coefficient sans unité imaginaire (une équation du plan est réelle) */
function isRealCoefficient(coefficient: AlgebraicCoefficient): boolean {
	return coefficient.terms.every((term) => !term.hasImaginaryUnit);
}

/**
 * P = gauche − droite réduit : un polynôme non constant en x et y, à
 * dénominateur constant. `null` sinon (racine de y, 1/x, autre lettre…).
 */
function polynomialOf(relation: RelationNode): EquationPolynomial | null {
	const form = normalize(subtract(relation.left, relation.right), {
		abortChecker: makeAbortChecker(undefined, NORMALIZE_BUDGET_MS)
	});
	if (form.denominator.length !== 1) return null;
	const [denominatorTerm] = form.denominator;
	if (denominatorTerm.monomial.length > 0 || !isRealCoefficient(denominatorTerm.coefficient)) {
		return null;
	}

	let degree = 0;
	let xSquaredIndex = -1;
	let ySquaredIndex = -1;
	let topIndex = -1;
	for (const [index, term] of form.numerator.entries()) {
		if (!isRealCoefficient(term.coefficient)) return null;
		let termDegree = 0;
		for (const factor of term.monomial) {
			const { base, exponent } = factor;
			if (base.type !== 'variable' || !PLANE_VARIABLES.has(base.name)) return null;
			if (exponent.d !== 1n || exponent.n < 1n) return null;
			termDegree += Number(exponent.n);
			if (exponent.n === 2n && term.monomial.length === 1) {
				if (base.name === 'x') xSquaredIndex = index;
				else ySquaredIndex = index;
			}
		}
		if (termDegree > degree) {
			degree = termDegree;
			topIndex = index;
		}
	}
	// Constante (`1 = 2`, `0 = 0`) : pas l'équation d'une courbe
	if (degree === 0) return null;

	return {
		terms: form.numerator,
		denominator: denominatorTerm.coefficient,
		degree,
		hasXSquared: xSquaredIndex !== -1,
		referenceIndex:
			xSquaredIndex !== -1 ? xSquaredIndex : ySquaredIndex !== -1 ? ySquaredIndex : topIndex
	};
}

/** Lecture d'une équation polynomiale en x et y ; jamais d'exception */
function readEquation(text: string): ReadEquation {
	if (isAnswerTooComplex(text)) return { ok: false, error: 'écriture trop complexe' };
	const node = parseAnswer(text);
	if (!node) return { ok: false, error: 'écriture illisible' };
	const relation = unwrap(node);
	if (relation.type !== 'relation' || relation.relation !== '=') {
		return { ok: false, error: 'pas une équation (signe = attendu)' };
	}
	if (hasHugeExponent(relation)) return { ok: false, error: 'exposant démesuré' };
	try {
		const polynomial = polynomialOf(relation);
		if (!polynomial) {
			return { ok: false, error: 'pas une équation polynomiale non triviale en x et y' };
		}
		return { ok: true, relation, polynomial };
	} catch {
		// Budget dépassé ou nœud que la réduction ne sait pas lire
		return { ok: false, error: 'équation impossible à réduire' };
	}
}

/**
 * Réponse attendue écrite par l'auteur : une équation polynomiale non triviale
 * en x et y. Sert aux specs de test (une attendue illisible est une erreur du
 * MODÈLE, pas de l'élève).
 */
export function readExpectedEquation(text: string): { ok: true } | { ok: false; error: string } {
	const read = readEquation(text);
	return read.ok ? { ok: true } : { ok: false, error: read.error };
}

/**
 * P_rép = k·P_att pour une constante k non nulle ? Comparé exactement par produits
 * en croix (num_rép[i]·num_att[0] = num_att[i]·num_rép[0]).
 */
function isProportional(answer: EquationPolynomial, expected: EquationPolynomial): boolean {
	const a = answer.terms;
	const e = expected.terms;
	if (a.length !== e.length || a.length === 0) return false;
	for (let i = 0; i < a.length; i++) {
		if (getMonomialSignature(a[i]) !== getMonomialSignature(e[i])) return false;
	}
	for (let i = 1; i < a.length; i++) {
		const left = mulAlgebraic(a[i].coefficient, e[0].coefficient);
		const right = mulAlgebraic(e[i].coefficient, a[0].coefficient);
		if (!algebraicEquals(left, right)) return false;
	}
	return true;
}

/**
 * Coefficient du terme de référence (x², sinon y², sinon premier terme de plus
 * haut degré) égal à ±1 dans la réponse : coefficient / dénRép = ±1. L'attendue
 * est ainsi ramenée au coefficient 1 avant de mesurer k : une attendue
 * `2x^2+2y^2=8` n'impose pas son écriture, et le signe (membres échangés) est libre.
 */
function hasUnitReferenceCoefficient(answer: EquationPolynomial, referenceIndex: number): boolean {
	const coefficient = answer.terms[referenceIndex]?.coefficient;
	if (!coefficient) return false;
	return (
		algebraicEquals(coefficient, answer.denominator) ||
		algebraicEquals(coefficient, negAlgebraic(answer.denominator))
	);
}

// --- Formes exigées -----------------------------------------------------------

/** Une expression sans x ni y (nombre, fraction, radical, π…) */
function isConstant(node: MathNode): boolean {
	return getVariables(node).size === 0;
}

/** L'expression vaut 0, écrite `0` */
function isWrittenZero(node: MathNode): boolean {
	const inner = unwrap(node);
	return inner.type === 'number' && Number(inner.value) === 0;
}

function isVariableNamed(node: MathNode, name: string): boolean {
	const inner = unwrap(node);
	return inner.type === 'variable' && inner.name === name;
}

/**
 * Un terme réduit : UN monôme (ou une constante) non nul, à dénominateur
 * constant. Signature du monôme, `null` sinon.
 */
function reducedTermSignature(node: MathNode): string | null {
	const form = normalize(node, { abortChecker: makeAbortChecker(undefined, NORMALIZE_BUDGET_MS) });
	if (form.numerator.length !== 1 || form.denominator.length !== 1) return null;
	if (form.denominator[0].monomial.length > 0) return null;
	return getMonomialSignature(form.numerator[0]);
}

/**
 * Somme réduite : chaque terme est un monôme non nul, deux termes n'ont jamais le
 * même monôme. Signatures des monômes, `null` sinon.
 */
function reducedSumSignatures(node: MathNode): string[] | null {
	const signatures: string[] = [];
	for (const { term } of flattenSumShallow(node)) {
		const signature = reducedTermSignature(term);
		if (signature === null || signatures.includes(signature)) return null;
		signatures.push(signature);
	}
	return signatures;
}

/** Membre droit de `y = mx + p` : un terme en x et/ou une constante, réduits */
function isReducedAffineInX(node: MathNode): boolean {
	if (getVariables(node).has('y')) return false;
	if (!reducedSumSignatures(node)) return false;
	const xSignature = getMonomialSignature(normalize(variable('x')).numerator[0]);
	return flattenSumShallow(node).every(
		({ term }) => isConstant(term) || reducedTermSignature(term) === xSignature
	);
}

/** `y = mx + p`, ou `x = c` pour une verticale */
function isReducedForm(relation: RelationNode): boolean {
	if (isVariableNamed(relation.left, 'y')) return isReducedAffineInX(relation.right);
	if (isVariableNamed(relation.left, 'x')) {
		return isConstant(relation.right) && reducedSumSignatures(relation.right) !== null;
	}
	return false;
}

/** `ax + by + c = 0` (et, pour un cercle, sa forme développée = 0) */
function isCartesianForm(relation: RelationNode): boolean {
	return isWrittenZero(relation.right) && reducedSumSignatures(relation.left) !== null;
}

/** Base d'un carré de la forme centre-rayon : `x`, ou `x − a` (coefficient 1) ; sa variable */
function centeredVariable(base: MathNode): string | null {
	const inner = unwrap(base);
	const variables = getVariables(inner);
	if (variables.size !== 1) return null;
	const [name] = [...variables];
	if (!PLANE_VARIABLES.has(name)) return null;
	const terms = flattenSumShallow(inner);
	if (terms.length > 2) return null;
	let variableTerms = 0;
	for (const { sign, term } of terms) {
		if (isConstant(term)) continue;
		if (sign !== '+' || !isVariableNamed(term, name)) return null;
		variableTerms++;
	}
	return variableTerms === 1 ? name : null;
}

/** `(x − a)² + (y − b)² = r²` (ordre des carrés indifférent, `r²` ou sa valeur) */
function isCenterRadiusForm(relation: RelationNode): boolean {
	if (!isConstant(relation.right)) return false;
	const terms = flattenSumShallow(relation.left);
	if (terms.length !== 2) return false;
	const names = new Set<string>();
	for (const { sign, term } of terms) {
		if (sign !== '+' || term.type !== 'superscript' || writtenInteger(term.superscript) !== 2) {
			return false;
		}
		const name = centeredVariable(term.base);
		if (!name) return false;
		names.add(name);
	}
	return names.size === 2;
}

/**
 * Forme d'une équation, jugée sur son ÉCRITURE (pas sa valeur). Sert aussi au
 * validateur de forme exigée (`required-form-validator`) pour une case ordinaire.
 */
export function matchesEquationForm(node: MathNode, form: EquationForm): boolean {
	const relation = unwrap(node);
	if (relation.type !== 'relation' || relation.relation !== '=') return false;
	try {
		switch (form) {
			case 'reduite':
				return isReducedForm(relation);
			case 'cartesienne':
				return isCartesianForm(relation);
			case 'centre-rayon':
				return isCenterRadiusForm(relation);
		}
	} catch {
		return false;
	}
}

/**
 * Verdict d'une case « équation ».
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param expected - réponse attendue (équation écrite par l'auteur)
 * @param requiredForm - forme exigée de la case ; seules les formes d'équation comptent
 */
export function judgeEquationAnswer(
	answer: string,
	expected: string,
	requiredForm?: RequiredForm
): EquationVerdict {
	if (!answer.trim()) return { status: 'empty' };

	const expectedRead = readEquation(expected);
	if (!expectedRead.ok) return { status: 'incorrect' };

	const answerRead = readEquation(answer);
	if (!answerRead.ok) {
		const relation = parseAnswer(answer);
		const isEquation = relation !== null && unwrap(relation).type === 'relation';
		return isEquation
			? { status: 'incorrect' }
			: { status: 'incorrect', feedback: EQUATION_FEEDBACK.notEquation };
	}

	if (!isProportional(answerRead.polynomial, expectedRead.polynomial)) {
		return { status: 'incorrect' };
	}

	if (isEquationForm(requiredForm) && !matchesEquationForm(answerRead.relation, requiredForm)) {
		return { status: 'bad_form', feedback: EQUATION_FEEDBACK.forms[requiredForm] };
	}

	// Cercle (degré ≥ 2) : coefficient ±1 pour x² (sinon y², sinon le terme de référence)
	const { degree, referenceIndex } = expectedRead.polynomial;
	if (degree >= 2 && !hasUnitReferenceCoefficient(answerRead.polynomial, referenceIndex)) {
		const feedback = expectedRead.polynomial.hasXSquared
			? EQUATION_FEEDBACK.scaledSquare
			: EQUATION_FEEDBACK.scaled;
		return { status: 'unoptimal_form', feedback };
	}

	return { status: 'correct' };
}
