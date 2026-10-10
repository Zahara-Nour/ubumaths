/**
 * Produits et quotients de puissances d'une même variable réunis en UNE
 * puissance : x^{1/5}/x^{1/3} = x^{-2/15}, √x/x^{1/3} = x^{1/6},
 * x^{1/3}·x^{-1/3} = x^0 = 1 (seconde revue du 2026-10-08).
 *
 * Les limites traitaient ces quotients de racines d'indices différents par
 * L'Hôpital, et f′/g′ y était mal classée : « ≈ 60 » pour +∞, « 0 » pour +∞.
 * Une seule puissance de x, elles la savent.
 *
 * ## Pourquoi c'est juste, domaine compris
 *
 * Facteurs reconnus : x, x^{r} (r rationnel ÉCRIT, voir `writtenRational`),
 * √x, ⁿ√x, ⁿ√(x^k), cbrt(x). Sur l'ensemble où tous sont définis, la somme
 * des exposants donne la même valeur :
 * - dénominateurs tous impairs : défini sur ℝ (ℝ* si un exposant < 0) ;
 *   x^{a/q}·x^{b/r} = x^{(ar+bq)/(qr)} vaut aussi pour x < 0 — la parité du
 *   numérateur réduit est celle de a + b (q, r impairs) ;
 * - un dénominateur pair : le facteur impose déjà x ≥ 0, où l'identité est
 *   celle des réels positifs ; la puissance réunie a un dénominateur pair ou
 *   reste définie sur ℝ₊, sans élargir le domaine du côté x < 0 qui compte
 *   pour une limite à gauche, sauf si l'exposant devient entier (√x·√x = x) :
 *   on ne réunit alors PAS (la limite en 0⁻ n'existerait pas, x l'aurait).
 * - ⁿ√(x^k) avec n pair et k pair vaut |x|^{k/n}, pas x^{k/n} : non reconnu.
 *
 * Les autres facteurs (constantes, autres expressions) sont gardés tels quels.
 * Rien n'est réécrit quand moins de deux facteurs sont des puissances de x,
 * ni quand aucun n'a d'exposant fractionnaire (x·x² reste tel quel).
 *
 * @module mathAST/common/variable-powers
 */

import type { MathNode } from '../types';
import { isDelimiter, isDivision, isMultiplication, isVariable } from '../guards';
import { mapNode } from '../transforms';
import { flattenProductShallow } from '../flatten';
import {
	divide,
	multiply,
	number,
	opposite,
	superscript,
	variable as variableNode
} from '../factory';
import { writtenRational } from '../eval/real-root';

interface Exponent {
	readonly n: bigint;
	readonly d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

function addExponents(a: Exponent, b: Exponent): Exponent {
	const n = a.n * b.d + b.n * a.d;
	const d = a.d * b.d;
	const g = gcd(n, d);
	return g === 0n ? { n: 0n, d: 1n } : { n: n / g, d: d / g };
}

function isTheVariable(node: MathNode, name: string): boolean {
	const inner = isDelimiter(node) ? node.content : node;
	return isVariable(inner) && inner.name === name;
}

/** Exposant de `factor` vu comme puissance de la variable, ou `null`. */
function exponentOf(factor: MathNode, name: string): Exponent | null {
	const node = isDelimiter(factor) ? factor.content : factor;
	if (isTheVariable(node, name)) return { n: 1n, d: 1n };
	if (node.type === 'superscript' && isTheVariable(node.base, name)) {
		return writtenRational(node.superscript);
	}
	if (node.type === 'function' && node.args.length === 1 && node.power === undefined) {
		let index: Exponent | null = null;
		if (node.name === 'cbrt' && node.base === undefined) index = { n: 3n, d: 1n };
		if (node.name === 'sqrt') {
			index = node.base === undefined ? { n: 2n, d: 1n } : writtenRational(node.base);
		}
		if (index === null || index.d !== 1n || index.n < 2n) return null;
		const radicand = node.args[0];
		const inner = exponentOf(radicand, name);
		if (inner === null || inner.d !== 1n) return null;
		// ⁿ√(x^k), n pair et k pair : |x|^{k/n}, pas x^{k/n}
		if (index.n % 2n === 0n && inner.n % 2n === 0n) return null;
		const g = gcd(inner.n, index.n);
		return { n: inner.n / g, d: index.n / g };
	}
	return null;
}

function powerNode(name: string, e: Exponent): MathNode {
	const x = variableNode(name);
	if (e.n === 1n && e.d === 1n) return x;
	const magnitude = e.n < 0n ? -e.n : e.n;
	const body: MathNode =
		e.d === 1n
			? number(magnitude.toString())
			: divide(number(magnitude.toString()), number(e.d.toString()), 'fraction');
	return superscript(x, e.n < 0n ? opposite(body) : body);
}

/** Réunit les facteurs puissances de x d'un produit / quotient, ou `null`. */
function combineAt(node: MathNode, name: string): MathNode | null {
	if (!isMultiplication(node) && !isDivision(node)) return null;
	const numerator = isDivision(node) ? node.numerator : node;
	const denominator = isDivision(node) ? node.denominator : null;
	const top = flattenProductShallow(numerator);
	const bottom = denominator === null ? [] : flattenProductShallow(denominator);

	let total: Exponent = { n: 0n, d: 1n };
	let count = 0;
	let evenDenominator = false;
	let fractional = false;
	const keepTop = top.filter((f) => {
		const e = exponentOf(f.factor, name);
		if (e === null) return true;
		total = addExponents(total, e);
		evenDenominator ||= e.d % 2n === 0n;
		fractional ||= e.d !== 1n;
		count++;
		return false;
	});
	const keepBottom = bottom.filter((f) => {
		const e = exponentOf(f.factor, name);
		if (e === null) return true;
		total = addExponents(total, { n: -e.n, d: e.d });
		evenDenominator ||= e.d % 2n === 0n;
		fractional ||= e.d !== 1n;
		count++;
		return false;
	});
	// Seulement s'il y a une racine : x·x² reste écrit comme l'élève l'a écrit
	if (count < 2 || !fractional) return null;
	// Un facteur impose x ≥ 0 mais l'exposant réuni est entier : la puissance
	// réunie serait définie pour x < 0 (√x·√x ≠ x en −1) — on ne réunit pas
	if (evenDenominator && total.d % 2n === 1n) return null;

	// Exposant réuni positif au numérateur, négatif au DÉNOMINATEUR en x^{|r|} :
	// sin(x)·x^{-1} n'est pas une forme que les stratégies reconnaissent,
	// sin(x)/x l'est (sinon 5 limites justes devenaient « non supportées »)
	const factors = keepTop.map((f) => f.factor);
	const below = keepBottom.map((f) => f.factor);
	if (total.n > 0n) factors.push(powerNode(name, total));
	if (total.n < 0n) below.push(powerNode(name, { n: -total.n, d: total.d }));
	const product = (list: MathNode[]): MathNode | null =>
		list.reduce<MathNode | null>(
			(acc, f) => (acc === null ? f : multiply(acc, f, 'implicit')),
			null
		);
	const numeratorNode = product(factors) ?? number('1');
	const denominatorNode = product(below);
	return denominatorNode === null
		? numeratorNode
		: divide(numeratorNode, denominatorNode, 'fraction');
}

/**
 * Réunit, de bas en haut, les puissances de `name` de chaque produit ou
 * quotient (voir l'en-tête pour le domaine). Rend le nœud tel quel sinon.
 */
export function combineVariablePowers(node: MathNode, name: string): MathNode {
	return mapNode(node, (current) => combineAt(current, name) ?? current);
}
