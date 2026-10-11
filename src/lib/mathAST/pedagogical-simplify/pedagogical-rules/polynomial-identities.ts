/**
 * Identités remarquables sur un polynôme en une variable, coefficients compris
 * (ADR 0024, lot 2, stratégie 2 de `factoriser`).
 *
 * Les règles numériques de `pattern/rule-sets/algebraic-identities.ts` ne voient
 * le carré d'un nombre que s'il est écrit seul : `4x^2-25` et `9x^2-12x+4`
 * restaient inchangés, et `x^2-4` rendait `(x+2)(x-2)`. Ici, un polynôme écrit
 * réduit, à coefficients entiers primitifs, est lu par ses coefficients :
 * `4x² − 25 = (2x)² − 5²`. Les facteurs sortent dans l'ordre du noyau
 * (`factor/`, décision Q3) : `(2x − 5)(2x + 5)`, `(x − 2)(x + 2)`.
 *
 * Ces règles REMPLACENT, dans `factoriser` seulement, les quatre règles
 * numériques de même nom : même nom, même phrase, un seul chemin par entrée.
 * Hors du domaine polynomial (`sin²x − 4`, plusieurs lettres, polynôme écrit
 * développable comme `(x+1)² − 1`), la règle d'origine s'applique telle quelle.
 * `auto` et `simplify` gardent les règles d'origine (ADR 0007).
 *
 * @module mathAST/pedagogical-simplify/pedagogical-rules/polynomial-identities
 */

import type { MathNode } from '../../types';
import type { Rule } from '../../pattern/types';
import { getBindingNode } from '../../pattern/types';
import { applyRule, createRule } from '../../pattern/rule';
import { P } from '../../pattern/builder';
import { getVariables } from '../../eval/substitute';
import { divRational, gcd, isZero } from '../../normal/rational';
import { integerNthRoot } from '../../normal/radical';
import { type Poly, toRationalFunction, trimPoly } from '../../factor/polynomial';
import { type IntegerFactor, polynomialNode } from '../../factor';
import { integerNode, monomialNode } from '../../factor/polynomial-node';
import {
	add,
	multiply,
	number,
	parentheses,
	power,
	subtract,
	variable as variableNode
} from '../../factory';
import { algebraicFactoringRules } from '../../pattern/rule-sets/algebraic-identities';

// =============================================================================
// Lecture d'un polynôme tel qu'il est écrit
// =============================================================================

/** Un polynôme en une variable, et ce que son écriture dit de lui. */
export interface WrittenPolynomial {
	readonly variable: string;
	readonly poly: Poly;
	/** Coefficients entiers par degré croissant ; `null` si l'un n'est pas entier. */
	readonly coefficients: readonly bigint[] | null;
	/** Un produit ou une puissance de somme : le lire comme polynôme, c'est développer. */
	readonly developable: boolean;
	/** Écrit comme ses termes : autant de termes écrits que de coefficients non nuls. */
	readonly reduced: boolean;
}

function isSum(node: MathNode): boolean {
	const inner = node.type === 'delimiter' ? node.content : node;
	return inner.type === 'addition' || inner.type === 'subtraction';
}

/** Un produit, un quotient ou une puissance porte-t-il sur une somme ? */
function hasDevelopableProduct(node: MathNode): boolean {
	switch (node.type) {
		case 'multiplication':
			return (
				isSum(node.left) ||
				isSum(node.right) ||
				hasDevelopableProduct(node.left) ||
				hasDevelopableProduct(node.right)
			);
		case 'division':
			return (
				isSum(node.numerator) ||
				isSum(node.denominator) ||
				hasDevelopableProduct(node.numerator) ||
				hasDevelopableProduct(node.denominator)
			);
		case 'superscript':
			return isSum(node.base) || hasDevelopableProduct(node.base);
		case 'addition':
		case 'subtraction':
			return hasDevelopableProduct(node.left) || hasDevelopableProduct(node.right);
		case 'opposite':
		case 'positive':
			return hasDevelopableProduct(node.operand);
		case 'delimiter':
			return hasDevelopableProduct(node.content);
		default:
			return false;
	}
}

/** Nombre de termes écrits, parenthèses et signes traversés : `(2x+1)-(x-3)` en a 4. */
function writtenTermCount(node: MathNode): number {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
			return writtenTermCount(node.left) + writtenTermCount(node.right);
		case 'opposite':
		case 'positive':
			return writtenTermCount(node.operand);
		case 'delimiter':
			return writtenTermCount(node.content);
		default:
			return 1;
	}
}

/** La seule lettre de `node`, ou `null` (aucune, ou plusieurs). `e` est une constante. */
export function soleVariable(node: MathNode): string | null {
	const names = getVariables(node);
	return names.size === 1 ? [...names][0] : null;
}

/**
 * Lit `node` comme un polynôme en `variable` (sa seule lettre par défaut).
 * `null` hors du champ : autre lettre, fonction, fraction rationnelle.
 */
export function readWrittenPolynomial(
	node: MathNode,
	variable: string | null = soleVariable(node)
): WrittenPolynomial | null {
	if (variable === null) return null;
	const rf = toRationalFunction(node, variable);
	if (rf === null) return null;
	const den = trimPoly(rf.den);
	if (den.length !== 1) return null;
	const poly = trimPoly(rf.num.map((c) => divRational(c, den[0])));
	const coefficients = poly.every((c) => c.d === 1n) ? poly.map((c) => c.n) : null;
	const developable = hasDevelopableProduct(node);
	const nonZero = poly.filter((c) => !isZero(c)).length;
	return {
		variable,
		poly,
		coefficients,
		developable,
		// `0` écrit seul est réduit (un terme, aucun coefficient non nul)
		reduced: !developable && writtenTermCount(node) === Math.max(nonZero, 1)
	};
}

// =============================================================================
// Détection, coefficients compris
// =============================================================================

export type IdentityKind = 'diff-squares' | 'perfect-square' | 'sum-cubes' | 'diff-cubes';

/** `a = alpha·x^degree`, `b = beta > 0`, et les facteurs dans l'ordre du noyau. */
export interface PolynomialIdentity {
	readonly kind: IdentityKind;
	readonly alpha: bigint;
	readonly degree: number;
	readonly beta: bigint;
	/** Signe du terme du milieu (carré parfait) : `+` pour (a + b)², `−` pour (a − b)². */
	readonly sign: 1 | -1;
	readonly factors: readonly IntegerFactor[];
	/**
	 * Écrite à l'envers, constante devant : `9 − x² = 3² − x²`, donc a = 3 et
	 * b = x (`alpha`, `degree` décrivent alors b). Les facteurs s'écrivent dans
	 * le même sens : `(3 − x)(3 + x)`.
	 */
	readonly reversed: boolean;
}

/** `[c0, 0, …, 0, ck]` : le polynôme `c0 + ck·x^k`. */
function binomial(c0: bigint, ck: bigint, k: number): bigint[] {
	return [c0, ...Array<bigint>(k - 1).fill(0n), ck];
}

function factor(coefficients: readonly bigint[], multiplicity = 1): IntegerFactor {
	return { kind: 'integer', coefficients, multiplicity };
}

/**
 * Reconnaît a² − b², a² ± 2ab + b², a³ ± b³ sur des coefficients entiers
 * PRIMITIFS : le facteur commun passe d'abord (stratégie 3), `4x² − 16`
 * devient `4(x² − 4)` et non `(2x − 4)(2x + 4)`. Coefficient dominant > 0,
 * sauf a² − b² écrit constante devant (`9 − x²`, `−4x² + 9`).
 */
export function polynomialIdentity(coefficients: readonly bigint[]): PolynomialIdentity | null {
	const n = coefficients.length - 1;
	const lead = coefficients[n];
	if (n < 2 || coefficients.reduce((g, c) => gcd(g, c), 0n) !== 1n) return null;
	const c0 = coefficients[0];
	const terms = coefficients.flatMap((c, i) => (c === 0n ? [] : [i]));
	if (c0 === 0n) return null;

	if (lead < 0n) {
		// b² − a² écrit constante devant : (b − a)(b + a), une seule forme lisible en 3e
		if (terms.length !== 2 || n % 2 !== 0 || c0 < 0n) return null;
		const k = n / 2;
		const alpha = integerNthRoot(-lead, 2n);
		const beta = integerNthRoot(c0, 2n);
		if (alpha === null || beta === null) return null;
		const factors = [factor(binomial(beta, -alpha, k)), factor(binomial(beta, alpha, k))];
		return { kind: 'diff-squares', alpha, degree: k, beta, sign: -1, factors, reversed: true };
	}

	if (terms.length === 2) {
		if (n % 2 === 0 && c0 < 0n) {
			const k = n / 2;
			const alpha = integerNthRoot(lead, 2n);
			const beta = integerNthRoot(-c0, 2n);
			if (alpha !== null && beta !== null) {
				const factors = [factor(binomial(-beta, alpha, k)), factor(binomial(beta, alpha, k))];
				return { kind: 'diff-squares', alpha, degree: k, beta, sign: -1, factors, reversed: false };
			}
		}
		if (n % 3 === 0) {
			const k = n / 3;
			const alpha = integerNthRoot(lead, 3n);
			const beta = integerNthRoot(c0 < 0n ? -c0 : c0, 3n);
			if (alpha !== null && beta !== null) {
				const s = c0 < 0n ? -1n : 1n;
				// a³ ± b³ = (a ± b)(a² ∓ ab + b²)
				const square = [beta * beta, ...Array<bigint>(k - 1).fill(0n)];
				const quadratic = [...square, -s * alpha * beta, ...Array<bigint>(k - 1).fill(0n)];
				quadratic.push(alpha * alpha);
				return {
					kind: s < 0n ? 'diff-cubes' : 'sum-cubes',
					alpha,
					degree: k,
					beta,
					sign: s < 0n ? -1 : 1,
					factors: [factor(binomial(s * beta, alpha, k)), factor(quadratic)],
					reversed: false
				};
			}
		}
		return null;
	}

	if (terms.length === 3 && n % 2 === 0 && terms[1] === n / 2 && c0 > 0n) {
		const k = n / 2;
		const alpha = integerNthRoot(lead, 2n);
		const beta = integerNthRoot(c0, 2n);
		if (alpha === null || beta === null) return null;
		const middle = coefficients[k];
		if (middle !== 2n * alpha * beta && middle !== -2n * alpha * beta) return null;
		const sign = middle > 0n ? 1 : -1;
		const base = binomial(BigInt(sign) * beta, alpha, k);
		const factors = [factor(base, 2)];
		return { kind: 'perfect-square', alpha, degree: k, beta, sign, factors, reversed: false };
	}
	return null;
}

/** L'identité d'un polynôme ÉCRIT réduit (`4x^2-25`), ou `null`. */
export function identityOfNode(node: MathNode): PolynomialIdentity | null {
	const written = readWrittenPolynomial(node);
	if (written === null || !written.reduced || written.coefficients === null) return null;
	return polynomialIdentity(written.coefficients);
}

/** `3 + x`, `3 - 2x` : un polynôme entier écrit par degré CROISSANT. */
export function ascendingPolynomialNode(coefficients: readonly bigint[], x: MathNode): MathNode {
	let result: MathNode | null = null;
	coefficients.forEach((c, degree) => {
		if (c === 0n) return;
		if (result === null) result = monomialNode(c, x, degree);
		else if (c < 0n) result = subtract(result, monomialNode(-c, x, degree));
		else result = add(result, monomialNode(c, x, degree));
	});
	return result ?? integerNode(0n);
}

/** L'écriture d'un facteur d'identité : dans le sens de l'identité reconnue. */
export function identityFactorNode(
	identity: PolynomialIdentity,
	coefficients: readonly bigint[],
	variable: string
): MathNode {
	const x = variableNode(variable);
	return identity.reversed
		? ascendingPolynomialNode(coefficients, x)
		: polynomialNode(coefficients, x);
}

/** Le produit des facteurs d'une identité, dans l'ordre du noyau. */
export function identityNode(identity: PolynomialIdentity, variable: string): MathNode {
	const nodes: MathNode[] = identity.factors.map((f) => {
		const base = parentheses(identityFactorNode(identity, f.coefficients, variable));
		return f.multiplicity > 1 ? power(base, number(String(f.multiplicity))) : base;
	});
	return nodes.slice(1).reduce<MathNode>((acc, node) => multiply(acc, node, 'implicit'), nodes[0]);
}

// =============================================================================
// Règles de `factoriser`
// =============================================================================

const RULE_KINDS: Readonly<Record<string, IdentityKind>> = {
	'diff-squares-numeric': 'diff-squares',
	'perfect-square-trinomial': 'perfect-square',
	'sum-cubes-numeric': 'sum-cubes',
	'diff-cubes-numeric': 'diff-cubes'
};

/** Nom de la règle qui raconte une identité : le même que la règle de motif. */
export const IDENTITY_RULE_NAMES: Readonly<Record<IdentityKind, string>> = {
	'diff-squares': 'diff-squares-numeric',
	'perfect-square': 'perfect-square-trinomial',
	'sum-cubes': 'sum-cubes-numeric',
	'diff-cubes': 'diff-cubes-numeric'
};

/** Un polynôme d'une lettre écrit réduit, à coefficients entiers : le domaine des coefficients. */
function inPolynomialDomain(node: MathNode): boolean {
	const written = readWrittenPolynomial(node);
	return (
		written !== null && written.reduced && written.coefficients !== null && written.poly.length > 1
	);
}

/** Sans lettre ni constante (`1 - 1`, `9 - 4`) : un nombre, rien à factoriser. */
function isPurelyNumeric(node: MathNode): boolean {
	return getVariables(node).size === 0 && toRationalFunction(node, 'x') !== null;
}

function withCoefficients(original: Rule, kind: IdentityKind): Rule {
	const rewrite = (node: MathNode): MathNode | null => {
		// Un nombre seul ne se factorise pas : sans cette garde, `x(1 - 1)` (mise en
		// facteur de `x - x`) devenait `x(1 + 1)(1 - 1)`, puis les cubes s'y emboîtaient
		if (isPurelyNumeric(node)) return null;
		if (!inPolynomialDomain(node)) return applyRule(original, node);
		const identity = identityOfNode(node);
		const variable = soleVariable(node);
		return identity?.kind === kind && variable !== null ? identityNode(identity, variable) : null;
	};
	return createRule(
		P._(
			'expr',
			P.custom((n) => rewrite(n) !== null)
		),
		(bindings) => {
			const node = getBindingNode(bindings, 'expr');
			const rewritten = node ? rewrite(node) : null;
			if (rewritten === null) throw new Error(`${original.name} : plus de correspondance`);
			return rewritten;
		},
		{ name: original.name, ...(original.priority !== undefined && { priority: original.priority }) }
	);
}

/** `algebraicFactoringRules`, les quatre règles numériques lues par coefficients. */
export const factoriserIdentityRules: readonly Rule[] = algebraicFactoringRules.map((rule) => {
	const kind = RULE_KINDS[rule.name];
	return kind === undefined ? rule : withCoefficients(rule, kind);
});
