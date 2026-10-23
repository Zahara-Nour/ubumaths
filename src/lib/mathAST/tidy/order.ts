/**
 * Étape 8 du contrat : l'ordre canonique — **le même partout**, sommes
 * imbriquées comprises (finding K1 de la revue).
 *
 * - **Facteurs** (Q13, David, 2026-10-23) : nombre (porté par le coefficient),
 *   constantes, lettres et leurs puissances, parenthèses (sommes et leurs
 *   puissances), fonctions, exponentielles, puis le reste — `(x + 1)eˣ`,
 *   `x(x + 1)eˣ`, `(2x + 1)cos x`, `ln(2)·2ˣ`. À catégorie égale, ordre
 *   alphabétique de l'écriture de la base, sauf entre deux parenthèses : l'ordre
 *   écrit reste (`(x − 1)(x + 2)`).
 * - **Termes** : degré décroissant (la constante finit donc dernière), puis,
 *   à degré égal, comparaison facteur par facteur de leur **écriture** —
 *   c'est elle qui met `4hx` avant `2h^2` et `(h+x)^2` avant `x^2`.
 * - **Somme de degré 1** (décision de David, 2026-10-06) : les termes négatifs
 *   passent derrière les positifs, chaque groupe gardant l'ordre ci-dessus —
 *   `1 − x`, `3 − 2x`, `x − 3`, `b − a`. De degré ≥ 2, l'ordre décroissant
 *   reste, signes compris : `−x² + x + 1`.
 * - **Termes simples d'abord** (décision de David, 2026-10-20) : dans chaque
 *   groupe de signe, les termes qui contiennent une somme en facteur passent
 *   derrière les autres, quel que soit leur degré — `2x + 3(x + 1)`,
 *   `1 + (1 − 2x)/3`, `x² + 3 + 2(x + 1)`.
 * - **Somme sans variable** (décision de David, 2026-10-12) : le nombre
 *   rationnel passe en tête, comme dans les manuels — `1 + √5`, `3 + 2√2`,
 *   `1 + ln 2`, `1 + π`. `e`, `i`, `π` sont des constantes. Un rationnel
 *   négatif n'y passe que si tous les autres termes sont négatifs (`−1 − √2`) :
 *   sinon `√2 − 1` évite le signe − en tête.
 * - **Nombre complexe** (décision de David, 2026-10-12) : forme algébrique
 *   a + ib, la partie réelle (les termes sans `i`) en tête, même négative ou
 *   irrationnelle — `−2 + 3i`, `−1 + i√3`, `−√2 + i`, `π + i`. La partie réelle
 *   se range comme un réel (`√2 − 1 + i`).
 *
 * L'écriture d'un terme est calculée **une fois par terme** avant le tri, pas
 * à chaque comparaison.
 *
 * @module mathAST/tidy/order
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { TidyFactor, TidyTerm } from './types';
import { toCustom } from '../custom-generator';
import { hashMathNode } from '../normal/hash';
import {
	ONE,
	ZERO,
	addRational,
	compareRational,
	equalRational,
	isNegative as isNegativeRational
} from '../normal/rational';
import { buildFactor } from './build';
import { variable } from '../factory';
import {
	isDerivativeFunction,
	isEulerConstant,
	isFunction,
	isGreek,
	isComplex,
	isDelimiter,
	isHole,
	isImaginaryUnit,
	isNumber,
	isSegmentLength,
	isSubscript,
	isSymbol,
	isVariable
} from '../guards';
import { mapNode } from '../transforms';
import { isKnownFunctionName } from '../numtype/rules/functions';

// =============================================================================
// Types
// =============================================================================

/** Clé d'ordre d'un terme, calculée une fois avant le tri. */
type TermOrderKey = {
	readonly degree: Rational;
	readonly factorTexts: readonly string[];
	readonly coefficient: Rational;
};

// =============================================================================
// Constantes
// =============================================================================

/**
 * Rang de la catégorie d'une base dans un produit. Les constantes `e`, `i`, `π`
 * forment la PREMIÈRE catégorie : devant toute lettre, latine (minuscule ou
 * majuscule) ou grecque. Comparées comme du texte, leurs clés (`\euler`, `\i`,
 * `\pi`) passaient derrière `A` et `\alpha` (`A\pi`, `\alpha \imaginaryI`).
 */
const CATEGORY_CONSTANT = 0;
const CATEGORY_SYMBOL = 1;
const CATEGORY_SUM = 2;
const CATEGORY_FUNCTION = 3;
const CATEGORY_EXPONENTIAL = 4;
const CATEGORY_OTHER = 5;

/** La constante d'Euler dans une clé d'ordre (voir `writtenForm`). */
const EULER_ORDER_KEY: MathNode = variable('\\euler');

/** L'unité imaginaire dans une clé d'ordre (voir `writtenForm`). */
const IMAGINARY_ORDER_KEY: MathNode = variable('\\i');

// =============================================================================
// Écriture d'un nœud
// =============================================================================

/**
 * L'écriture d'un nœud, utilisée comme clé d'ordre. `toCustom` lève sur les
 * quelques nœuds qu'il ne sait pas écrire (lettre grecque non gérée, style de
 * multiplication absent) : on retombe alors sur le hash, déterministe lui aussi.
 *
 * La constante d'Euler s'y range sous `\euler`, comme `\pi` sous `\pi` : les
 * constantes passent devant les lettres (`\pi a`, `e a`). `toCustom` l'écrit
 * `e`, qui la rangerait parmi les lettres (`a e`). Le nom `\euler` ne sert qu'à
 * la clé : il n'est jamais affiché ni relu.
 *
 * L'unité imaginaire de même, sous `\i`. Entre constantes (catégorie à part,
 * voir `categoryOf`), l'ordre des clés donne `e`, `i`, `π` (`e i`, `i\pi`,
 * l'écriture de `e^{i\pi}`).
 */
function writtenForm(node: MathNode): string {
	try {
		return toCustom(
			mapNode(node, (n) =>
				isEulerConstant(n) ? EULER_ORDER_KEY : isImaginaryUnit(n) ? IMAGINARY_ORDER_KEY : n
			)
		);
	} catch {
		return hashMathNode(node);
	}
}

/**
 * Rang de la catégorie d'une base. Une puissance d'exposant non rationnel prend
 * celle de sa base pour une lettre ou une somme (`xⁿ`, `(x + 1)ⁿ`) ; de base
 * numérique ou constante, c'est une exponentielle (`eˣ`, `2ˣ`) ; le reste
 * (`(ln x)ˣ`…) passe en dernier.
 */
function categoryOf(base: MathNode): number {
	if (isImaginaryUnit(base)) return CATEGORY_CONSTANT;
	let inner = base;
	while (isDelimiter(inner)) inner = inner.content;
	switch (inner.type) {
		case 'constant':
			return CATEGORY_CONSTANT;
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'subscript':
			return CATEGORY_SYMBOL;
		case 'addition':
		case 'subtraction':
			return CATEGORY_SUM;
		case 'function':
			return CATEGORY_FUNCTION;
		case 'superscript':
			return powerCategory(inner.base);
		default:
			return CATEGORY_OTHER;
	}
}

/** La catégorie d'une puissance d'exposant non rationnel, d'après sa base. */
function powerCategory(base: MathNode): number {
	if (isNumber(base)) return CATEGORY_EXPONENTIAL;
	const category = categoryOf(base);
	if (category === CATEGORY_CONSTANT) return CATEGORY_EXPONENTIAL;
	if (category === CATEGORY_SYMBOL || category === CATEGORY_SUM) return category;
	return CATEGORY_OTHER;
}

// =============================================================================
// Ordre des facteurs
// =============================================================================

function compareFactors(a: TidyFactor, b: TidyFactor): number {
	const categoryA = categoryOf(a.base);
	const categoryB = categoryOf(b.base);
	if (categoryA !== categoryB) return categoryA - categoryB;
	// Deux parenthèses : l'ordre écrit reste (le tri est stable). Le regroupement
	// des termes semblables n'en dépend pas : sa clé est triée (`factorsKey`).
	if (categoryA === CATEGORY_SUM && !sameBase(a, b)) return 0;

	const textA = writtenForm(a.base);
	const textB = writtenForm(b.base);
	if (textA !== textB) return textA < textB ? -1 : 1;

	return compareRational(a.exponent, b.exponent);
}

/** Les deux facteurs ont-ils la même base (`(x + 1)` et `(x + 1)²`) ? */
function sameBase(a: TidyFactor, b: TidyFactor): boolean {
	return writtenForm(a.base) === writtenForm(b.base);
}

/** Trie les facteurs d'un terme selon l'ordre canonique. */
export function sortFactors(factors: readonly TidyFactor[]): TidyFactor[] {
	return [...factors].sort(compareFactors);
}

// =============================================================================
// Ordre des termes
// =============================================================================

/** Degré d'un terme : la somme des exposants de ses facteurs. */
function termDegree(term: TidyTerm): Rational {
	let degree = ZERO;
	for (const factor of term.factors) degree = addRational(degree, factor.exponent);
	return degree;
}

function termOrderKey(term: TidyTerm): TermOrderKey {
	return {
		degree: termDegree(term),
		factorTexts: term.factors.map((factor) => writtenForm(buildFactor(factor))),
		coefficient: term.coefficient
	};
}

function compareOrderKeys(a: TermOrderKey, b: TermOrderKey): number {
	const degreeComparison = compareRational(b.degree, a.degree);
	if (degreeComparison !== 0) return degreeComparison;

	const shared = Math.min(a.factorTexts.length, b.factorTexts.length);
	for (let i = 0; i < shared; i++) {
		if (a.factorTexts[i] !== b.factorTexts[i]) {
			return a.factorTexts[i] < b.factorTexts[i] ? -1 : 1;
		}
	}

	if (a.factorTexts.length !== b.factorTexts.length) {
		return a.factorTexts.length - b.factorTexts.length;
	}

	return compareRational(b.coefficient, a.coefficient);
}

/** Le degré total d'une somme : le plus grand degré de ses termes. */
function sumDegree(keys: readonly TermOrderKey[]): Rational | null {
	let degree: Rational | null = null;
	for (const key of keys) {
		if (degree === null || compareRational(key.degree, degree) > 0) degree = key.degree;
	}
	return degree;
}

/** La somme est-elle de degré total 1 (`2x − 3`, `b − a`, mais pas `x² − x`) ? */
export function isFirstDegreeSum(terms: readonly TidyTerm[]): boolean {
	const degree = sumDegree(terms.map(termOrderKey));
	return degree !== null && equalRational(degree, ONE);
}

/**
 * Le nœud contient-il une inconnue ? Les constantes `e`, `i`, `π` n'en sont
 * pas (π est un nœud `constant`, jamais `greek`), ni une fonction usuelle en un
 * nombre (`\sin(1)`, `\ln 2`, `\sqrt{2}`). Une lettre, une lettre grecque, un
 * indice (`u_0`), une longueur (`AB`), un trou, un symbole en sont, et aussi
 * une fonction de l'énoncé (`f(2)`, `f'(1)`, `g(0)`) : sa valeur est inconnue.
 */
function containsUnknown(node: MathNode): boolean {
	let found = false;
	mapNode(node, (n) => {
		if (
			isVariable(n) ||
			isGreek(n) ||
			isSubscript(n) ||
			isSegmentLength(n) ||
			isHole(n) ||
			isSymbol(n) ||
			(isFunction(n) && (!isKnownFunctionName(n.name) || isDerivativeFunction(n)))
		) {
			found = true;
		}
		return n;
	});
	return found;
}

/**
 * Un terme ordinaire : ni opaque (infini, zéro signé), ni grandeur. Partagé
 * avec la mise en facteur du signe d'une somme toute négative (`collect.ts`).
 */
export function isPlainTerm(term: TidyTerm): boolean {
	return !term.verbatim && term.unit === null;
}

/** Un terme qui n'est qu'un nombre rationnel (ni facteur, ni unité). */
function isRationalTerm(term: TidyTerm): boolean {
	return term.factors.length === 0 && isPlainTerm(term);
}

/**
 * Le rationnel qui doit passer en tête de la somme, ou `null`.
 *
 * Somme sans variable : le rationnel passe en tête (`1 + √5`). Négatif, il n'y
 * passe que si tous les autres termes le sont aussi (`−1 − √2`, mais `√2 − 1`).
 * Une somme qui contient une inconnue, une unité ou un terme opaque : `null`.
 * Ne dépend que de l'ensemble des termes, pas de leur ordre.
 */
export function leadingRational(terms: readonly TidyTerm[]): TidyTerm | null {
	const rational = terms.find(isRationalTerm);
	if (rational === undefined || terms.length < 2) return null;
	const others = terms.filter((term) => term !== rational);
	const plain = others.every(
		(term) => isPlainTerm(term) && term.factors.every((factor) => !containsUnknown(factor.base))
	);
	if (!plain) return null;
	if (
		isNegativeRational(rational.coefficient) &&
		!others.every((term) => isNegativeRational(term.coefficient))
	) {
		return null;
	}
	return rational;
}

/** Met en tête le rationnel désigné par `leadingRational`, l'ordre des autres gardé. */
function rationalFirst(terms: readonly TidyTerm[]): TidyTerm[] {
	const rational = leadingRational(terms);
	if (rational === null) return [...terms];
	return [rational, ...terms.filter((term) => term !== rational)];
}

/** La somme est-elle un complexe écrit a + ib (`−2 + 3i`) ? */
export function isAlgebraicComplex(terms: readonly TidyTerm[]): boolean {
	return algebraicParts(terms) !== null;
}

/** Le nœud contient-il un nombre complexe (l'unité `i` comprise) ? */
function containsComplex(node: MathNode): boolean {
	let found = false;
	mapNode(node, (n) => {
		if (isComplex(n)) found = true;
		return n;
	});
	return found;
}

/** Un terme de partie imaginaire : `i` en facteur (exposant 1), nulle part ailleurs. */
function isImaginaryTerm(term: TidyTerm): boolean {
	const imaginary = term.factors.filter(
		(factor) => isImaginaryUnit(factor.base) && equalRational(factor.exponent, ONE)
	);
	return (
		imaginary.length === 1 &&
		term.factors.every((factor) => imaginary.includes(factor) || !containsComplex(factor.base))
	);
}

/** Un terme de partie réelle : aucun `i`, nulle part. */
function isRealTerm(term: TidyTerm): boolean {
	return term.factors.every((factor) => !containsComplex(factor.base));
}

/**
 * Les parties réelle et imaginaire d'une somme écrite a + ib, ou `null`.
 *
 * Il en faut une de chaque, chaque terme dans l'une ou l'autre, et aucune
 * inconnue, unité ni terme opaque : `x + iy` et `e^{iπ/3} − 1` ne sont pas des
 * formes algébriques au sens de cette règle. L'ordre des termes est gardé.
 */
function algebraicParts(
	terms: readonly TidyTerm[]
): { real: TidyTerm[]; imaginary: TidyTerm[] } | null {
	const plain = terms.every(
		(term) => isPlainTerm(term) && term.factors.every((factor) => !containsUnknown(factor.base))
	);
	if (!plain) return null;
	const real = terms.filter(isRealTerm);
	const imaginary = terms.filter((term) => !isRealTerm(term));
	if (real.length === 0 || imaginary.length === 0 || !imaginary.every(isImaginaryTerm)) {
		return null;
	}
	return { real, imaginary };
}

/**
 * Le geste « le nombre en tête », l'ordre des autres termes gardé : la partie
 * réelle d'un complexe (`3i − 2` → `−2 + 3i`), sinon le rationnel d'une somme
 * sans variable (`√5 + 1` → `1 + √5`).
 */
export function numberFirst(terms: readonly TidyTerm[]): TidyTerm[] {
	const parts = algebraicParts(terms);
	if (parts === null) return rationalFirst(terms);
	return [...rationalFirst(parts.real), ...parts.imaginary];
}

/**
 * L'ordre d'un complexe placé sous un `−` (`−(i − 2)`, `−3(i − 2)`), ou `null`
 * s'il n'y a rien à changer. `tidy` ne distribue pas ce signe ; la partie réelle
 * négative en tête y ferait un double signe, `−(−2 + i)` : la somme garde alors
 * l'ordre d'avant la règle a + ib (`i − 2`). Partie réelle positive, ou tous
 * les termes négatifs, l'ordre a + ib reste (`−(2 + i)`, `−(−2 − i)`).
 */
export function orderUnderMinus(terms: readonly TidyTerm[]): TidyTerm[] | null {
	if (algebraicParts(terms) === null) return null;
	const algebraic = sortTerms(terms);
	if (!isNegativeRational(algebraic[0].coefficient)) return null;
	const previous = sortTerms(terms, false);
	return previous.some((term, index) => term !== algebraic[index]) ? previous : null;
}

/** Un terme qui contient une somme en facteur : `3(x + 1)`, `(2x − 1)/3`, `x(x + 1)²`. */
function containsSumFactor(term: TidyTerm): boolean {
	return term.factors.some((factor) => {
		let base = factor.base;
		while (isDelimiter(base)) base = base.content;
		return base.type === 'addition' || base.type === 'subtraction';
	});
}

/**
 * Dans un groupe de termes, les termes simples d'abord, puis ceux qui
 * contiennent une somme, l'ordre gardé dans chacun (David, 2026-10-20) :
 * `1 + (1 − 2x)/3`, `2x + 3(x + 1)`, `x² + x(x + 1)`. Le résultat ne dépend que
 * de l'ensemble des termes : idempotent.
 */
function simpleTermsFirst(terms: readonly TidyTerm[]): TidyTerm[] {
	return [...terms.filter((term) => !containsSumFactor(term)), ...terms.filter(containsSumFactor)];
}

/**
 * Ordonne les termes d'une somme, quel que soit son niveau d'imbrication.
 * `realPartFirst` à `false` coupe la règle a + ib (voir `orderUnderMinus`).
 */
export function sortTerms(terms: readonly TidyTerm[], realPartFirst = true): TidyTerm[] {
	const decorated = terms.map((term) => ({ term, key: termOrderKey(term) }));
	decorated.sort((a, b) => compareOrderKeys(a.key, b.key));
	const sorted = decorated.map((entry) => entry.term);

	const degree = sumDegree(decorated.map((entry) => entry.key));
	// Degré 1, ou deux termes quel que soit le degré (David, 2026-10-20 : `1 − x²`,
	// pas `−x² + 1` ; un complexe garde sa partie réelle en tête, `−1 + 1/i`) : les
	// positifs devant, les négatifs derrière, l'ordre gardé dans chaque groupe.
	// Idempotent : trier à nouveau redonne les mêmes groupes.
	const isNegativeTerm = (term: TidyTerm) => isNegativeRational(term.coefficient);
	const twoRealTerms =
		terms.length === 2 &&
		!terms.some((term) => term.factors.some((factor) => containsComplex(factor.base)));
	const positivesFirst = twoRealTerms || (degree !== null && equalRational(degree, ONE));
	const ordered = positivesFirst
		? [
				...simpleTermsFirst(sorted.filter((term) => !isNegativeTerm(term))),
				...simpleTermsFirst(sorted.filter(isNegativeTerm))
			]
		: simpleTermsFirst(sorted);

	// Complexe : la partie réelle, rangée comme un réel, puis la partie
	// imaginaire dans l'ordre ci-dessus. Le résultat ne dépend que de
	// l'ensemble des termes : idempotent.
	const parts = realPartFirst ? algebraicParts(ordered) : null;
	if (parts !== null) return [...sortTerms(parts.real), ...parts.imaginary];
	return rationalFirst(ordered);
}
