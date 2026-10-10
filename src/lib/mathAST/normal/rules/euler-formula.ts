/**
 * Formule d'Euler : `exp(a + iθ)` devient `exp(a)·(cos θ + i sin θ)`.
 *
 * ## Le trou, mesuré (sondes du 2026-10-05 sur les cartes de maths expertes)
 *
 * `2e^{i\frac{\pi}{3}}` et `1+i\sqrt{3}` n'étaient pas reconnus égaux : la
 * normalisation voyait dans `exp(iπ/3)` un facteur symbolique opaque, sans lien
 * avec `cos` et `sin`. Une forme exponentielle JUSTE d'élève était comptée fausse,
 * `e^{i\pi}` ne valait pas −1.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * Comme `euler-power.ts`, ce module vit sur le chemin de `equivalenceForm` seul :
 * l'affichage garde la notation de l'élève. Après lui, les valeurs remarquables de
 * `cos` et `sin` (`cos(π/3) = 1/2`, `cos(7π/3) = cos(π/3)`) sont celles que la
 * normalisation connaît déjà : la forme trigonométrique `2(cos(π/3) + i sin(π/3))`
 * était déjà égale à `1+i\sqrt{3}`.
 *
 * ## Pourquoi c'est sûr
 *
 * `e^{iθ} = cos θ + i sin θ` est une IDENTITÉ, vraie pour tout θ (réel ou
 * complexe) : la réécriture ne peut pas créer de faux positif. On la restreint
 * pourtant à une partie imaginaire CONSTANTE (aucune lettre que `i`) : un argument
 * variable (`e^{ix}`) amènerait `cos x`, `sin x` dans la réduction de Pythagore,
 * sans besoin pédagogique mesuré. Une partie réelle quelconque reste dans `exp`
 * (`e^{1+iπ} = −e`).
 *
 * Limite assumée (faux négatif) : un argument dont `cos` et `sin` ne sont pas des
 * valeurs remarquables reste `cos θ + i sin θ` des deux côtés ; deux écritures
 * de θ que la normalisation ne réduit pas l'une à l'autre ne se rencontrent pas.
 */

import { add, func, multiply, variable } from '../../factory';
import { isComplex, isFunction, isVariable } from '../../guards';
import { findNodes, mapNode } from '../../transforms';
import type { MathNode } from '../../types';
import { denormalizeTerm } from '../denormalize';
import { isOneTerm } from '../term';
import type { AlgebraicTerm, NormalForm, NormalTerm } from '../types';

export interface EulerFormulaOptions {
	/** Normalisation de l'argument (passée par `normalize.ts` : pas d'import circulaire) */
	readonly normalizeArgument: (node: MathNode) => NormalForm;
}

/** L'argument mentionne-t-il l'unité imaginaire (`i`, ou `\imaginaryI` lu `complex`) ? */
function mentionsImaginaryUnit(node: MathNode): boolean {
	return findNodes(node, (n) => (isVariable(n) && n.name === 'i') || isComplex(n)).length > 0;
}

/** Aucune lettre dans les facteurs symboliques du terme (π, constantes, fonctions de nombres) */
function hasLetterFreeMonomial(term: NormalTerm): boolean {
	return term.monomial.every((factor) => findNodes(factor.base, isVariable).length === 0);
}

/** Somme de termes normaux réécrite en arbre (le résultat sera renormalisé) */
function sumOfTerms(terms: readonly NormalTerm[]): MathNode | null {
	if (terms.length === 0) return null;
	return terms.map(denormalizeTerm).reduce((sum, term) => add(sum, term));
}

/**
 * Partie réelle et partie imaginaire (sans le facteur i) d'un argument normalisé,
 * ou `null` s'il n'a pas de partie imaginaire constante.
 */
function splitArgument(form: NormalForm): { real: NormalTerm[]; imaginary: NormalTerm[] } | null {
	// Dénominateur 1 : `\frac{i\pi}{3}` y arrive comme (i/3)·π
	if (form.denominator.length !== 1 || !isOneTerm(form.denominator[0])) return null;
	const real: NormalTerm[] = [];
	const imaginary: NormalTerm[] = [];
	for (const term of form.numerator) {
		const realCoefficient: AlgebraicTerm[] = [];
		const imaginaryCoefficient: AlgebraicTerm[] = [];
		for (const coefficientTerm of term.coefficient.terms) {
			if (coefficientTerm.hasImaginaryUnit) {
				imaginaryCoefficient.push({ ...coefficientTerm, hasImaginaryUnit: false });
			} else {
				realCoefficient.push(coefficientTerm);
			}
		}
		if (imaginaryCoefficient.length > 0) {
			if (!hasLetterFreeMonomial(term)) return null;
			imaginary.push({ coefficient: { terms: imaginaryCoefficient }, monomial: term.monomial });
		}
		if (realCoefficient.length > 0) {
			real.push({ coefficient: { terms: realCoefficient }, monomial: term.monomial });
		}
	}
	return imaginary.length > 0 ? { real, imaginary } : null;
}

/** `exp(u)` réécrit par la formule d'Euler, ou `null` quand elle ne s'applique pas */
function eulerFormulaAt(node: MathNode, options: EulerFormulaOptions): MathNode | null {
	if (!isFunction(node) || node.name !== 'exp' || node.args.length !== 1) return null;
	const argument = node.args[0];
	if (!mentionsImaginaryUnit(argument)) return null;
	let form: NormalForm;
	try {
		form = options.normalizeArgument(argument);
	} catch {
		return null;
	}
	const parts = splitArgument(form);
	if (!parts) return null;
	const theta = sumOfTerms(parts.imaginary);
	if (!theta) return null;
	const trigonometric = add(
		func('cos', [theta]),
		multiply(variable('i'), func('sin', [theta]), 'implicit')
	);
	const realPart = sumOfTerms(parts.real);
	return realPart ? multiply(func('exp', [realPart]), trigonometric, 'implicit') : trigonometric;
}

/**
 * Applique la formule d'Euler à toute exponentielle d'argument à partie imaginaire
 * constante, de bas en haut. À appeler APRÈS `expandEulerPowers` (qui fait de
 * `e^{u}` un appel `exp(u)`) et AVANT les définitions trigonométriques.
 */
export function expandImaginaryExponentials(
	node: MathNode,
	options: EulerFormulaOptions
): MathNode {
	return mapNode(node, (current) => eulerFormulaAt(current, options) ?? current);
}
