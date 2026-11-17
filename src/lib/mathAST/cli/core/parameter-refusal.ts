/**
 * Le refus d'une résolution qui dépend d'un paramètre (V57, Q5 — David,
 * 2026-10-14) : `.résoudre a x = 4` ne répond pas `x = 4/a`, faux pour a = 0.
 *
 * Descendu de l'Atelier dans le registre le 2026-11-09 (chantier
 * `registre-reference`, PR 2c) : le registre est la référence commune de
 * l'Atelier, de `pnpm math` et de la calculatrice (D1). Un paramètre est une
 * lettre NON POSÉE : ni l'inconnue, ni une valeur liée (`.let a = 2`, `a = 2`
 * dans l'Atelier).
 *
 * @module mathAST/cli/core/parameter-refusal
 */

import type { MathNode, RelationNode } from '../../types';
import { getVariables, substitute } from '../../eval/substitute';
import { solve as solveRelation } from '../../solve';
import { getPolynomialDegree } from '../../analysis/expression-classify';
import { differentiateN } from '../../differentiation/differentiate';
import { mapNode } from '../../transforms';
import { simplify } from '../../simplify/simplify';
import { indexVariables } from '../../eval/index-variables';

// =============================================================================
// Messages
// =============================================================================

/**
 * « Le résultat dépend de a : donne-lui une valeur (a = 2) pour l'étudier. » —
 * le refus d'une commande, ou d'un bouton de la carte, que le paramètre
 * empêche de conclure (V56, V57).
 */
export function dependsOnMessage(parameters: readonly string[]): string {
	const letters = lettersText(parameters);
	// Une lettre grecque ne se définit pas dans l'atelier (`α = 2` est lu comme un
	// test d'égalité, mesuré le 2026-10-14) : pas d'exemple qui mènerait nulle part
	const definable = parameters.find((name) => GREEK_LETTERS[name] === undefined);
	if (definable === undefined) {
		const them = parameters.length === 1 ? 'la par un nombre' : 'les par des nombres';
		return `Le résultat dépend de ${letters} : remplace-${them} pour l'étudier.`;
	}
	const pronoun = parameters.length === 1 ? 'lui' : 'leur';
	return `Le résultat dépend de ${letters} : donne-${pronoun} une valeur (${definable} = 2) pour l'étudier.`;
}

/** Les lettres grecques que le moteur nomme en toutes lettres (`\alpha` → `alpha`). */
const GREEK_LETTERS: Readonly<Record<string, string>> = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	theta: 'θ',
	lambda: 'λ',
	mu: 'μ',
	rho: 'ρ',
	sigma: 'σ',
	tau: 'τ',
	phi: 'φ',
	omega: 'ω'
};

/** Une lettre telle que l'élève l'a écrite : `α`, pas `alpha` (revue, 2026-10-14). */
function letterText(letter: string): string {
	return GREEK_LETTERS[letter] ?? letter;
}

/** `a`, `a et b`, `a, b et t` — lettres grecques en symboles. */
export function lettersText(letters: readonly string[]): string {
	const shown = letters.map(letterText);
	return shown.length === 1
		? shown[0]
		: `${shown.slice(0, -1).join(', ')} et ${shown[shown.length - 1]}`;
}

// =============================================================================
// Refus
// =============================================================================

/** Les lettres de `parameters` qu'un arbre contient, inconnues indicées comprises (`u_0`). */
function citedParameters(ast: MathNode, parameters: readonly string[]): string[] {
	const letters = getVariables(indexVariables(ast).node);
	return parameters.filter((p) => letters.has(p));
}

/**
 * Q5 (V57) : `.résoudre` refuse quand la résolution DIVISE par une expression
 * d'un paramètre — `a x = 0` répondait x = 0, faux pour a = 0.
 * - polynôme en l'inconnue : son coefficient dominant contient un paramètre
 *   (`a x + b = 0`, `x/a = 1`, `a x^2 = 1`, et `a x > 1`, dont le sens dépend
 *   du signe de a) ; `(x-a)(x-1) = 0`, `x + a = 0` restent résolus ;
 * - sinon, l'inconnue multipliée par un paramètre (`e^{a x} = 1`), ou un
 *   paramètre au dénominateur de la réponse (`1/x = a` → 1/a) — sauf si le
 *   moteur a écrit la condition (`u_0 \cdot 0{,}5^n = 1` : « si u₀ > 0 »).
 * ⚠️ `x^2 = a` reste : pas de division, et la réponse dit « si a ⩾ 0 ».
 *
 * Descendu de l'Atelier (`calcul.ts`) dans le registre le 2026-11-09
 * (registre-reference, PR 2c) : `pnpm math` et la calculatrice refusent aussi.
 *
 * @param parameters - Les lettres non posées (ni l'inconnue, ni `.let a = 2`)
 * @param latex - La réponse du moteur, `undefined` s'il n'a pas conclu
 * @returns Le refus à dire, ou `null`
 */
export function parameterSolveRefusal(
	ast: RelationNode,
	unknown: string,
	parameters: readonly string[],
	latex: string | undefined
): string | null {
	if (parameters.length === 0) return null;
	const cited = (node: MathNode) => citedParameters(node, parameters);
	const rational = ast.relation === '=' ? forbiddenSolutions(ast, unknown, parameters, cited) : [];
	if (rational.length > 0) return dependsOnMessage(rational);
	const difference: MathNode = { type: 'subtraction', left: ast.left, right: ast.right };
	const degree = getPolynomialDegree(difference, unknown);
	if (degree === 0) return null;
	if (degree !== null) {
		const leading = leadingParameters(difference, degree, unknown, cited);
		if (leading.length > 0) return dependsOnMessage(leading);
	}
	const conditioned = latex?.includes('\\text{si') ?? false;
	if (conditioned) return null;
	const multiplied =
		degree === null ? multipliedParameters(difference, unknown, parameters, cited) : [];
	if (multiplied.length > 0) return dependsOnMessage(multiplied);
	if (latex === undefined) return null;
	const cites = (chunk: string, p: string) =>
		new RegExp(`(?<![A-Za-z\\\\])${p}(?![A-Za-z])`).test(chunk);
	const denominators = latexDenominators(latex);
	const divisors = parameters.filter((p) => denominators.some((d) => cites(d, p)));
	return divisors.length === 0 ? null : dependsOnMessage(divisors);
}

/**
 * Équation rationnelle (revue de 0d3d9beea) : les paramètres pour lesquels une
 * solution tombe sur une valeur interdite. `x/(x-a) = 0` → x = 0, interdite si
 * a = 0 ; `(x-a)/(x-1) = 0` → x = a, interdite si a = 1 ; `a/x = 1` → x = a.
 * `1/(x-a) = 1` → x = a + 1 n'annule jamais x − a : gardée.
 */
function forbiddenSolutions(
	relation: RelationNode,
	unknown: string,
	parameters: readonly string[],
	cited: (node: MathNode) => string[]
): string[] {
	const denominators: MathNode[] = [];
	mapNode(relation, (node) => {
		if (node.type === 'division' && getVariables(node.denominator).has(unknown)) {
			denominators.push(node.denominator);
		}
		return node;
	});
	if (denominators.length === 0) return [];
	let solutions: readonly { readonly value: MathNode }[];
	try {
		solutions = solveRelation(relation, { variable: unknown }).solutions;
	} catch {
		return [];
	}
	const found = new Set<string>();
	for (const solution of solutions) {
		for (const denominator of denominators) {
			const at = simplify(substitute(denominator, { [unknown]: solution.value })).result;
			for (const p of cited(at)) found.add(p);
		}
	}
	return parameters.filter((p) => found.has(p));
}

/** Les paramètres du coefficient dominant d'un polynôme en `unknown`. */
function leadingParameters(
	polynomial: MathNode,
	degree: number,
	unknown: string,
	cited: (node: MathNode) => string[]
): string[] {
	try {
		const leading = simplify(differentiateN(polynomial, degree, { variable: unknown })).result;
		return cited(leading);
	} catch {
		return [];
	}
}

/** Les paramètres qui multiplient (ou divisent) l'inconnue : `a x`, `x/a`. */
function multipliedParameters(
	ast: MathNode,
	unknown: string,
	parameters: readonly string[],
	cited: (node: MathNode) => string[]
): string[] {
	const found = new Set<string>();
	const withUnknown = (n: MathNode) => getVariables(n).has(unknown);
	mapNode(ast, (node) => {
		const pairs: (readonly [MathNode, MathNode])[] =
			node.type === 'multiplication'
				? [
						[node.left, node.right],
						[node.right, node.left]
					]
				: node.type === 'division'
					? [[node.numerator, node.denominator]]
					: [];
		for (const [carrier, factor] of pairs) {
			if (withUnknown(carrier) && !withUnknown(factor)) {
				for (const p of cited(factor)) found.add(p);
			}
		}
		return node;
	});
	return parameters.filter((p) => found.has(p));
}

/** Les dénominateurs `\dfrac{…}{…}` d'une réponse en LaTeX. */
function latexDenominators(latex: string): string[] {
	const denominators: string[] = [];
	// La fin du groupe `{…}` ouvert en `from`, -1 s'il ne se ferme pas
	const groupEnd = (from: number): number => {
		let depth = 0;
		for (let i = from; i < latex.length; i++) {
			if (latex[i] === '{') depth++;
			else if (latex[i] === '}' && --depth === 0) return i;
		}
		return -1;
	};
	for (const match of latex.matchAll(/\\d?frac\{/g)) {
		const numeratorEnd = groupEnd(match.index + match[0].length - 1);
		if (numeratorEnd === -1 || latex[numeratorEnd + 1] !== '{') continue;
		const denominatorEnd = groupEnd(numeratorEnd + 1);
		if (denominatorEnd !== -1) denominators.push(latex.slice(numeratorEnd + 2, denominatorEnd));
	}
	return denominators;
}
