/**
 * Pedagogical Simplify — `réduire` et `auto` sans `normalize`
 *
 * Chantier simplify-carte, lot 3 (`docs/wip/simplify-carte-progress.md` § 33,
 * validé par David le 2026-10-23). Avant, les deux intentions finissaient par
 * `normalize`, qui développe tout : `2(x+3) → 2x+6`, `(x+1)² → x²+2x+1`, et
 * `auto` montrait l'aller-retour `x²+2x+1 → (x+1)² → x²+2x+1`.
 *
 * - **`réduire`** (ne développe ni ne factorise) : après les règles de la
 *   phase A, `tidy`, qui raconte ses gestes (`tidy-*`).
 * - **`auto`** : `réduire`, puis les fractions de polynômes simplifiées en
 *   montrant la factorisation, avec la condition (Q4 : « `auto` ne factorise
 *   jamais » vise le résultat, pas les étapes), puis « développer seulement si
 *   c'est plus court », la règle de `simplify` (tidy-spec §B), rédigé comme
 *   `.développer` (« une intention, une rédaction »).
 *
 * Les intentions voisines sont passées en fonctions (`factorise`, `develop`),
 * comme pour les stratégies de `factoriser` : ce module ne rappelle pas le
 * pipeline qui l'appelle.
 *
 * @module mathAST/pedagogical-simplify/reduce-steps
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { divide, multiply, number, opposite, parentheses, superscript } from '../factory';
import { flattenProductShallow, flattenSumShallow } from '../flatten';
import { findNodes, mapNode, mapNodeTopDown } from '../transforms';
import { nodesEqual } from '../pattern/match';
import { nodesEqual as sameWriting } from '../normal/hash';
import { tidy, TidyStepRecorder } from '../tidy';
import { hasDecimalLiteral } from '../tidy/decimal';
import { computeCost } from '../simplify/cost';
import { divRational, equalRational, isNegative, negRational } from '../normal/rational';
import { readWrittenPolynomial } from './pedagogical-rules/polynomial-identities';
import { getVariables } from '../eval/substitute';
import { isPolynomialIn } from '../analysis/expression-classify';
import { toCustom } from '../custom-generator';
import { orderExpanded } from './expand-order';
import { writeExpandSteps } from './expand-steps';
import {
	decimalFraction,
	hasUnfinishedArithmetic,
	unwrapGrouping,
	withExplicitMinusOne,
	withoutGrouping
} from './expand-format';
import type { PedagogicalSimplifyStep } from './types';

// =============================================================================
// Types
// =============================================================================

/** La fabrique d'étapes du pipeline (numérotation, description, catégorie). */
export type MakeStep = (
	rule: string,
	before: MathNode,
	after: MathNode,
	globalBefore: MathNode,
	globalAfter: MathNode
) => PedagogicalSimplifyStep;

/** Une étape de la chaîne : une expression, et comment on y est arrivé. */
interface Stage {
	readonly result: MathNode;
	readonly steps: readonly PedagogicalSimplifyStep[];
}

/** Un facteur d'un produit factorisé : sa base, son exposant, son polynôme. */
interface Factor {
	readonly base: MathNode;
	readonly exponent: number;
	/**
	 * Les coefficients de la base, `c0 + c1·x + …`, quand la fraction n'a qu'une
	 * lettre : la clé de comparaison. Plusieurs lettres : `null`, on compare les
	 * écritures mises au propre.
	 */
	readonly poly: readonly Rational[] | null;
}

/** Un produit factorisé lu facteur par facteur. */
interface FactoredProduct {
	readonly negative: boolean;
	/** Les nombres du produit (`2(x+1)` : `2`). */
	readonly numbers: readonly MathNode[];
	readonly factors: readonly Factor[];
}

// =============================================================================
// Constantes
// =============================================================================

/** Au plus autant de fractions simplifiées dans une même expression. */
const MAX_FRACTIONS = 8;

// =============================================================================
// Fonctions — `tidy` raconté
// =============================================================================

/**
 * `tidy`, ses gestes en étapes. Chaque étape de `tidy` est une image entière
 * de l'expression : elle sert aussi de contexte global.
 */
export function tidyAsSteps(node: MathNode, makeStep: MakeStep): Stage {
	const recorder = new TidyStepRecorder();
	const result = tidy(node, { recorder });
	// Une étape qui ne retire que des parenthèses de groupement ne montre rien à
	// l'élève : `(x+1)/(x−1)` s'affiche déjà `\frac{x+1}{x-1}`
	const steps = recorder
		.getSteps()
		.filter((step) => !sameWriting(withoutGrouping(step.before), withoutGrouping(step.after)))
		.map((step) => makeStep(step.rule, step.before, step.after, step.before, step.after));
	// Rien de visible : l'écriture de l'élève reste la sienne
	if (steps.length === 0 && sameWriting(withoutGrouping(result), withoutGrouping(node))) {
		return { result: node, steps };
	}
	return { result, steps };
}

// =============================================================================
// Fonctions — fractions de polynômes (Q4)
// =============================================================================

/** `(x+1)²` → base `x+1`, exposant 2 ; sinon exposant 1. */
function baseAndExponent(node: MathNode): { base: MathNode; exponent: number } {
	const bare = unwrapGrouping(node);
	if (bare.type === 'superscript' && bare.superscript.type === 'number') {
		const exponent = Number(bare.superscript.value);
		if (Number.isInteger(exponent) && exponent >= 1) {
			return { base: unwrapGrouping(bare.base), exponent };
		}
	}
	return { base: bare, exponent: 1 };
}

/** Un polynôme en chacune de ses lettres, et au moins une lettre. */
function isPolynomial(node: MathNode): boolean {
	const names = [...getVariables(node)];
	return names.length > 0 && names.every((name) => isPolynomialIn(node, name));
}

/**
 * Un produit factorisé, lu facteur par facteur, ou `null` hors du champ.
 * `variable` : la seule lettre de la fraction, `null` s'il y en a plusieurs.
 */
function readFactoredProduct(node: MathNode, variable: string | null): FactoredProduct | null {
	let current = unwrapGrouping(node);
	let negative = false;
	while (current.type === 'opposite') {
		negative = !negative;
		current = unwrapGrouping(current.operand);
	}
	const numbers: MathNode[] = [];
	const factors: Factor[] = [];
	for (const { factor } of flattenProductShallow(current)) {
		if (factor.type === 'number') {
			numbers.push(factor);
			continue;
		}
		const { base, exponent } = baseAndExponent(factor);
		if (variable === null) {
			if (!isPolynomial(base)) return null;
			factors.push({ base, exponent, poly: null });
			continue;
		}
		const written = readWrittenPolynomial(base, variable);
		if (written === null) return null;
		factors.push({ base, exponent, poly: written.poly });
	}
	return { negative, numbers, factors };
}

/** Deux facteurs égaux : mêmes coefficients, ou même écriture mise au propre. */
function sameFactor(a: Factor, b: Factor): boolean {
	if (a.poly !== null && b.poly !== null) {
		const [p, q] = [a.poly, b.poly];
		return p.length === q.length && p.every((c, i) => equalRational(c, q[i]));
	}
	return sameWriting(tidy(a.base), tidy(b.base));
}

/** Un facteur écrit dans un produit : une somme entre parenthèses, une puissance. */
function writeFactor(base: MathNode, exponent: number): MathNode {
	const isSum = base.type === 'addition' || base.type === 'subtraction';
	const written = isSum ? parentheses(base) : base;
	return exponent === 1 ? written : superscript(written, number(String(exponent)));
}

/** Le produit de ce qui reste, `1` s'il ne reste rien. */
function writeProduct(product: {
	negative: boolean;
	numbers: readonly MathNode[];
	factors: readonly { base: MathNode; exponent: number }[];
}): MathNode {
	const parts = [
		...product.numbers,
		...product.factors.map(({ base, exponent }) => writeFactor(base, exponent))
	];
	const body =
		parts.length === 0
			? number('1')
			: parts
					.slice(1)
					.reduce<MathNode>((left, right) => multiply(left, right, 'implicit'), parts[0]);
	return product.negative ? opposite(body) : body;
}

/** `−3/2`, `25` : signe moins typographique. */
function rationalText(r: Rational): string {
	const magnitude = `${r.n < 0n ? -r.n : r.n}${r.d === 1n ? '' : `/${r.d}`}`;
	return isNegative(r) ? `−${magnitude}` : magnitude;
}

/** `x-y` → `x − y`, `x^2+1` → `x² + 1` : le facteur écrit dans un titre. */
function plainText(node: MathNode): string {
	return toCustom(node)
		.replace(/\^2/g, '²')
		.replace(/\^3/g, '³')
		.replace(/-/g, ' − ')
		.replace(/\+/g, ' + ')
		.trim();
}

/** « x ≠ −1 » pour un facteur du premier degré en une lettre, « x − y ≠ 0 » sinon. */
function conditionText(factor: Factor, variable: string | null): string {
	if (factor.poly !== null && factor.poly.length === 2 && variable !== null) {
		const root = divRational(negRational(factor.poly[0]), factor.poly[1]);
		return `${variable} ≠ ${rationalText(root)}`;
	}
	return `${plainText(factor.base)} ≠ 0`;
}

/**
 * La première fraction de polynômes qui a un facteur commun, simplifiée en deux
 * étapes : la factorisation, puis la simplification avec la condition. `null`
 * s'il n'y en a pas.
 */
function simplifyOneFraction(
	node: MathNode,
	factorise: (node: MathNode) => MathNode,
	makeStep: MakeStep
): Stage | null {
	for (const fraction of findNodes(node, (n) => n.type === 'division')) {
		if (fraction.type !== 'division') continue;
		const { numerator: top0, denominator: bottom0 } = fraction;
		if (!isPolynomial(bottom0) || ![...getVariables(top0)].every((v) => isPolynomialIn(top0, v))) {
			continue;
		}
		// Une seule lettre en tout : les facteurs se comparent par leurs coefficients
		const names = new Set([...getVariables(top0), ...getVariables(bottom0)]);
		const variable = names.size === 1 ? [...names][0] : null;

		const numerator = factorise(fraction.numerator);
		const denominator = factorise(fraction.denominator);
		const top = readFactoredProduct(numerator, variable);
		const bottom = readFactoredProduct(denominator, variable);
		if (top === null || bottom === null) continue;

		// Les facteurs communs, à la plus petite des deux puissances
		const common: { factor: Factor; exponent: number }[] = [];
		const restBottom = bottom.factors.map((f) => ({ ...f }));
		const restTop = top.factors.map((factor) => {
			const match = restBottom.find((f) => f.exponent > 0 && sameFactor(f, factor));
			if (match === undefined) return factor;
			const shared = Math.min(match.exponent, factor.exponent);
			common.push({ factor, exponent: shared });
			match.exponent -= shared;
			return { ...factor, exponent: factor.exponent - shared };
		});
		if (common.length === 0) continue;

		const factored = divide(numerator, denominator, fraction.displayStyle);
		const keep = (f: { exponent: number }) => f.exponent > 0;
		const remainingBottom = { ...bottom, factors: restBottom.filter(keep) };
		const newTop = writeProduct({ ...top, factors: restTop.filter(keep) });
		const simplified =
			remainingBottom.factors.length === 0 &&
			remainingBottom.numbers.length === 0 &&
			!remainingBottom.negative
				? newTop
				: divide(newTop, writeProduct(remainingBottom), fraction.displayStyle);
		const reduced = tidy(simplified);

		// Par le haut : `mapNode` reconstruit les parents avant de les voir, et la
		// fraction ne serait jamais reconnue par son identité
		const withFactored = mapNodeTopDown(node, (n) => (n === fraction ? factored : n));
		const withReduced = mapNodeTopDown(node, (n) => (n === fraction ? reduced : n));
		const steps: PedagogicalSimplifyStep[] = [];
		if (!nodesEqual(unwrapGrouping(factored), unwrapGrouping(fraction))) {
			steps.push(makeStep('fraction-factorise', fraction, factored, node, withFactored));
		}
		const cancel = makeStep('fraction-cancel', factored, reduced, withFactored, withReduced);
		const conditions = common.map(({ factor }) => conditionText(factor, variable));
		steps.push({
			...cancel,
			description: `On simplifie par le facteur commun, pour ${conditions.join(' et ')}`
		});
		return { result: withReduced, steps };
	}
	return null;
}

/**
 * Les fractions de polynômes à facteur commun, simplifiées une à une : on
 * factorise le numérateur et le dénominateur, puis on simplifie, en disant
 * pour quelles valeurs (`(x²−1)/(x+1) = (x−1)(x+1)/(x+1) = x−1`, pour
 * `x ≠ −1`). Une fraction sans facteur commun reste telle quelle.
 */
export function simplifyPolynomialFractions(
	node: MathNode,
	factorise: (node: MathNode) => MathNode,
	makeStep: MakeStep
): Stage {
	let current = node;
	const steps: PedagogicalSimplifyStep[] = [];
	for (let i = 0; i < MAX_FRACTIONS; i++) {
		const next = simplifyOneFraction(current, factorise, makeStep);
		if (next === null) break;
		steps.push(...next.steps);
		current = next.result;
	}
	return { result: current, steps };
}

// =============================================================================
// Fonctions — développer seulement si c'est plus court
// =============================================================================

/** Une somme entre parenthèses (`(x+1)`), ou nue dans une puissance. */
function isSum(node: MathNode): boolean {
	const bare = unwrapGrouping(node);
	return bare.type === 'addition' || bare.type === 'subtraction';
}

/**
 * Une somme à développer : facteur d'un produit, base d'une puissance entière,
 * ou précédée d'un signe −. Pas sous une fonction ni dans une fraction : la
 * rédaction de `.développer` ne les sait pas.
 */
function hasSumToDevelop(node: MathNode): boolean {
	return (
		findNodes(node, (n) => {
			if (n.type === 'multiplication') {
				const factors = flattenProductShallow(n);
				return factors.length > 1 && factors.some(({ factor }) => isSum(factor));
			}
			if (n.type === 'superscript') return isSum(n.base) && n.superscript.type === 'number';
			if (n.type === 'opposite') return n.operand.type === 'delimiter' && isSum(n.operand);
			return false;
		}).length > 0
	);
}

/** Nombre de termes de la somme de tête (1 pour tout ce qui n'est pas une somme). */
function termCount(node: MathNode): number {
	return flattenSumShallow(node).length;
}

/**
 * La forme développée, si elle est plus courte, avec les étapes de
 * `.développer` (détaillées et résumées) ; `null` sinon.
 *
 * Plus courte : la règle de `simplify` (tidy-spec §B) — coût strictement
 * inférieur, ou égal sans plus de termes (`2(x+1)` reste : 13 contre 13, mais
 * deux termes). Une forme qu'on ne sait pas rédiger n'est pas retenue : `auto`
 * ne montre jamais un résultat tombé du ciel.
 */
export function expandIfShorter(
	node: MathNode,
	develop: (node: MathNode) => MathNode
): {
	result: MathNode;
	steps: PedagogicalSimplifyStep[];
	summary: PedagogicalSimplifyStep[];
} | null {
	const start = unwrapGrouping(node);
	// Rien à développer : le développement par `normalize` ferait passer en
	// silence ses autres réductions (`cos(−x) → cos(x)`) sous « On réduit »
	if (!hasSumToDevelop(start)) return null;
	let developed: MathNode;
	try {
		developed = develop(withExplicitMinusOne(start));
	} catch {
		return null;
	}
	const ordered = orderExpanded(developed);
	const decimal = hasDecimalLiteral(start);
	const format = (image: MathNode) => (decimal ? mapNode(image, decimalFraction) : image);
	const answer = format(ordered);
	if (nodesEqual(answer, start) || hasUnfinishedArithmetic(answer)) return null;

	const answerCost = computeCost(answer);
	const startCost = computeCost(start);
	const shorter =
		answerCost < startCost || (answerCost === startCost && termCount(answer) <= termCount(start));
	if (!shorter) return null;

	const raw = writeExpandSteps(start, ordered, { format });
	if (raw === null) return null;
	return { result: answer, steps: [...raw.steps], summary: [...raw.summary] };
}
