/**
 * Common Factor Rules
 *
 * La mise en facteur commun : `a×c + b×c → (a+b)c`.
 *
 * ⚠️ **Elle n'existait nulle part dans mathAST.** `algebraicFactoringRules` ne
 * contenait que des identités remarquables — différence de carrés, carré
 * parfait, somme et différence de cubes. Conséquence mesurée : la dérivée de
 * `x·eˣ` restait `eˣ + x·eˣ` au lieu de `(x+1)eˣ`, alors que c'est la forme
 * factorisée qui permet d'étudier le signe. Demandé par David.
 *
 * ⚠️ **Le facteur numérique et le facteur monôme sortent aussi**, depuis la
 * décision de David du 2026-09-21 : un élève à qui on demande de factoriser
 * `2x + 4` attend `2(x + 2)`, et `x² + 2x` attend `x(x + 2)`. Le paragraphe
 * qui tenait le facteur numérique pour « ambigu » est caduc — l'ambiguïté
 * concerne l'intention `auto`, pas `factoriser`, qui est une demande
 * explicite.
 *
 * ⚠️ **Le facteur non polynomial sort aussi** (2026-10-11) : `x·eˣ − eˣ`
 * donne `(x − 1)eˣ`, `(x+1)² − (x+1)` donne `x(x+1)`. Sans lui, une primitive
 * de `x²eˣ` ne pouvait pas s'écrire `(x² − 2x + 2)eˣ`. Il s'écrit APRÈS la
 * parenthèse, comme au tableau.
 *
 * Le PGCD se calcule ici sur une décomposition en monômes
 * (`{ coefficient, exposants, facteurs }`) lue sur l'écriture, sans
 * développer deux sommes entre elles ; ni `gcdMonomials` de `normal/` (forme
 * normale, toujours développée, sur le chemin du décideur), ni le noyau
 * `factor/` (un polynôme d'une lettre, sans facteur non polynomial) ne lisent
 * cette forme (ADR 0024, lot 3b).
 *
 * @module mathAST/pattern/rule-sets/common-factor
 */

import { P } from '../builder';
import { createRule } from '../rule';
import { isMathNodeBinding, type MatchBindings, type Rule } from '../types';
import type { MathNode } from '../../types';
import type { Rational } from '../../normal/types';
import {
	add,
	divide,
	multiply,
	number,
	opposite,
	parentheses,
	subtract,
	superscript,
	variable
} from '../../factory';
import {
	isAddition,
	isDelimiter,
	isDivision,
	isMultiplication,
	isOpposite,
	isPositive,
	isSubtraction,
	isSuperscript,
	isVariable
} from '../../guards';
import { flattenSumShallow } from '../../flatten';
import {
	ONE as RATIONAL_ONE,
	absBigInt,
	addRational,
	absRational,
	divRational,
	fromInteger,
	gcd,
	isInteger,
	isOne,
	isZero,
	mulRational,
	negRational
} from '../../normal/rational';
import { extractRational } from '../../common/numeric';
import { hashMathNode } from '../../normal/hash';
// Import direct : `rule-sets/index.ts` ré-exporte ce module, et passer par le
// baril créerait un cycle de chunk avec `algebraic-identities.ts`.

/**
 * Une règle construite au PREMIER usage, et non au chargement du module.
 *
 * ⚠️ **Cycle d'imports.** `solve/solve.ts` utilise `commonFactorRules` (mise en
 * facteur avant le produit nul). Or `pattern/builder.ts` atteint `solve.ts`
 * par ses propres imports (`rule-parser → constraints → numtype → … →
 * domain/range-helpers → variations/critical-points → solve`). Quand
 * `builder.ts` est chargé le premier, ce module s'évalue AVANT lui : un
 * `P.parse(…)` au niveau du module lit alors un `P` encore `undefined`
 * (mesuré : « Cannot read properties of undefined (reading 'parse') »).
 * Différer la construction du motif au premier appel coupe le problème sans
 * toucher au graphe d'imports ; le nom reste lisible tout de suite.
 */
function lazyRule(name: string, build: () => Rule): Rule {
	let built: Rule | null = null;
	const rule = (): Rule => (built ??= build());
	return {
		name,
		get pattern() {
			return rule().pattern;
		},
		get replacement() {
			return rule().replacement;
		},
		get condition() {
			return rule().condition;
		},
		get priority() {
			return rule().priority;
		},
		get group() {
			return rule().group;
		}
	};
}

/**
 * La somme mise en facteur, TOUJOURS parenthésée.
 *
 * ⚠️ Sans les parenthèses, `(a+b)x` se rend `a + b x` — une expression fausse,
 * qui se lit `a + bx`. C'est le défaut qu'a produit la première version.
 */
function factoredProduct(sum: MathNode, factor: MathNode): MathNode {
	return multiply(parentheses(sum), factor, 'implicit');
}

/** Le nœud est-il un nombre ? (`-3` s'écrit `opposite(number)`.) */
function isNumeric(node: MathNode): boolean {
	return extractRational(node) !== null;
}

/**
 * `a×c + b×c → (a+b)c`
 *
 * Le facteur commun ne doit pas être un nombre : ce serait la factorisation
 * numérique, traitée ailleurs.
 */
const factorCommonInProducts = lazyRule('common-factor-products', () =>
	createRule(
		P.parse('a * c + b * c'),
		(bindings) =>
			factoredProduct(
				add(bindings.get('a') as MathNode, bindings.get('b') as MathNode),
				bindings.get('c') as MathNode
			),
		{
			name: 'common-factor-products',
			condition: (bindings) => !isNumeric(bindings.get('c') as MathNode)
		}
	)
);

/**
 * `c + b×c → (b+1)c`
 *
 * Le terme nu compte pour `1 × c`. On écrit `(b+1)` plutôt que `(1+b)` : c'est
 * l'ordre du tableau, degré décroissant — `eˣ + x·eˣ = (x+1)eˣ`.
 */
const factorCommonWithBareTerm = lazyRule('common-factor-bare-term', () =>
	createRule(
		P.parse('c + b * c'),
		(bindings) =>
			factoredProduct(
				add(bindings.get('b') as MathNode, number('1')),
				bindings.get('c') as MathNode
			),
		{
			name: 'common-factor-bare-term',
			condition: (bindings) => !isNumeric(bindings.get('c') as MathNode)
		}
	)
);

// =============================================================================
// Facteur commun numérique et monôme
// =============================================================================

/**
 * Un monôme : un coefficient rationnel signé et des exposants entiers par
 * variable. `6x²` est `{ coefficient: 6, powers: { x: 2 } }`.
 *
 * C'est la forme sur laquelle le PGCD se calcule : sans elle, `x³ + x²`
 * demande de comparer des exposants à travers deux `superscript` différents.
 */
interface Monomial {
	readonly coefficient: Rational;
	readonly powers: ReadonlyMap<string, number>;
	/** Les facteurs non polynomiaux (eˣ, sin x, (x+1)…), par clé structurelle. */
	readonly atoms: ReadonlyMap<string, Atom>;
}

/**
 * Un facteur non polynomial, élevé à une puissance entière : `eˣ` est
 * `{ base: eˣ, exponent: 1 }`, `(x+1)²` est `{ base: (x+1), exponent: 2 }`.
 *
 * C'est ce qui permet de sortir `eˣ` de `x·eˣ − eˣ` : le PGCD le traite comme
 * une variable de plus, dont la clé est la structure du nœud.
 */
interface Atom {
	readonly base: MathNode;
	readonly exponent: number;
}

const NO_POWERS: ReadonlyMap<string, number> = new Map();
const NO_ATOMS: ReadonlyMap<string, Atom> = new Map();

/** Le monôme réduit à un facteur non polynomial. */
function atomMonomial(base: MathNode, exponent: number): Monomial {
	const key = hashMathNode(isDelimiter(base) ? base.content : base);
	return {
		coefficient: RATIONAL_ONE,
		powers: NO_POWERS,
		atoms: new Map([[key, { base, exponent }]])
	};
}

/** Le produit de deux monômes : coefficients multipliés, exposants ajoutés. */
function mulMonomial(a: Monomial, b: Monomial): Monomial {
	const powers = new Map(a.powers);
	for (const [name, exponent] of b.powers) {
		powers.set(name, (powers.get(name) ?? 0) + exponent);
	}
	const atoms = new Map(a.atoms);
	for (const [key, atom] of b.atoms) {
		const existing = atoms.get(key);
		atoms.set(key, { base: atom.base, exponent: (existing?.exponent ?? 0) + atom.exponent });
	}
	return { coefficient: mulRational(a.coefficient, b.coefficient), powers, atoms };
}

/** L'opposé d'un monôme. */
function negateMonomial(m: Monomial): Monomial {
	return { ...m, coefficient: negRational(m.coefficient) };
}

/**
 * Décompose une expression en somme de monômes, ou `null` si elle n'en est
 * pas une.
 *
 * ⚠️ **Un seul facteur peut être une somme.** `2(x+1)` se décompose en
 * `2x + 2` — c'est la forme que cette règle elle-même produit, et la relire
 * est ce qui permet de factoriser au bon niveau quand la passe remontante a
 * déjà factorisé un bout de chaîne. Mais `(x+1)(x-1)` a DEUX facteurs somme :
 * le décomposer serait développer, ce que l'intention `factoriser` interdit.
 * On rend `null`.
 *
 * Ce qui n'est pas polynomial — `eˣ`, `sin x`, `√x`, une lettre grecque — est
 * un **facteur** (`Atom`), comparé par sa structure. Avec `sumsAsAtoms`, une
 * somme entre parenthèses l'est aussi au lieu d'être développée : c'est ce
 * qui voit `(x+1)` dans `(x+1)² − (x+1)`.
 */
function toMonomials(node: MathNode, sumsAsAtoms: boolean): Monomial[] | null {
	const recurse = (child: MathNode) => toMonomials(child, sumsAsAtoms);
	const rat = extractRational(node);
	if (rat !== null) return [{ coefficient: rat, powers: NO_POWERS, atoms: NO_ATOMS }];

	// Les lettres grecques ne passent pas ici : `powersNode` les reconstruirait
	// en variables ordinaires, et `\alpha` deviendrait le mot « alpha ». Elles
	// tombent dans le cas général, comme facteurs gardés tels quels.
	if (isVariable(node)) {
		return [{ coefficient: RATIONAL_ONE, powers: new Map([[node.name, 1]]), atoms: NO_ATOMS }];
	}

	if (isOpposite(node)) {
		const inner = recurse(node.operand);
		return inner === null ? null : inner.map(negateMonomial);
	}

	if (isPositive(node)) return recurse(node.operand);

	if (isDelimiter(node)) {
		if (sumsAsAtoms && isSum(node.content)) return [atomMonomial(node, 1)];
		return recurse(node.content);
	}

	if (isAddition(node)) {
		const left = recurse(node.left);
		const right = recurse(node.right);
		return left === null || right === null ? null : [...left, ...right];
	}

	if (isSubtraction(node)) {
		const left = recurse(node.left);
		const right = recurse(node.right);
		return left === null || right === null ? null : [...left, ...right.map(negateMonomial)];
	}

	if (isMultiplication(node)) {
		const left = recurse(node.left);
		const right = recurse(node.right);
		if (left === null || right === null) return null;
		// Deux facteurs somme : développer. Interdit.
		if (left.length > 1 && right.length > 1) return null;
		const product: Monomial[] = [];
		for (const l of left) for (const r of right) product.push(mulMonomial(l, r));
		return product;
	}

	if (isDivision(node)) {
		const denominator = extractRational(node.denominator);
		if (denominator !== null && denominator.n === 0n) return null;
		// Un dénominateur non numérique : la fraction entière est un facteur.
		if (denominator === null) return [atomMonomial(node, 1)];
		const numerator = recurse(node.numerator);
		if (numerator === null) return null;
		return numerator.map((m) => ({ ...m, coefficient: divRational(m.coefficient, denominator) }));
	}

	if (isSuperscript(node)) {
		const exponent = extractRational(node.superscript);
		// Un exposant non entier (`eˣ`, `x^{1/2}`) : la puissance entière est un
		// facteur. `e²ˣ` n'est donc PAS vu comme `(eˣ)²`.
		if (exponent === null || exponent.d !== 1n || exponent.n <= 0n || exponent.n > 16n) {
			return [atomMonomial(node, 1)];
		}
		const base = recurse(node.base);
		if (base === null) return null;
		// `(x+1)²` est une somme élevée à une puissance : la développer serait
		// défaire une factorisation. Sa base est un facteur, à l'exposant près.
		if (base.length !== 1) return [atomMonomial(node.base, Number(exponent.n))];
		let result = base[0];
		for (let i = 1n; i < exponent.n; i++) result = mulMonomial(result, base[0]);
		return [result];
	}

	// Tout le reste — fonction, racine, lettre grecque… — est un facteur entier.
	return [atomMonomial(node, 1)];
}

/** Le nœud est-il une somme (ou une différence) ? */
function isSum(node: MathNode): boolean {
	return isAddition(node) || isSubtraction(node);
}

/**
 * Le contenu d'une somme de monômes : le facteur commun qu'on peut sortir.
 *
 * - **numérique** : le PGCD des numérateurs, **et seulement si tous les
 *   coefficients sont entiers**. C'est un PGCD d'entiers POSITIFS, signe
 *   exclu : `2x − 4` donne `2(x − 2)`, jamais `−2(−x + 2)`.
 * - **monôme** : pour chaque variable présente dans TOUS les monômes, le plus
 *   petit exposant. `x³ + x²` donne `x²`.
 */
function commonContent(monomials: readonly Monomial[]): Monomial {
	let numericGcd: bigint | null = null;
	for (const m of monomials) {
		if (!isInteger(m.coefficient)) {
			numericGcd = 1n;
			break;
		}
		const magnitude = absBigInt(m.coefficient.n);
		numericGcd = numericGcd === null ? magnitude : gcd(numericGcd, magnitude);
	}

	const powers = new Map<string, number>();
	const [first, ...others] = monomials;
	for (const [name, exponent] of first.powers) {
		let min = exponent;
		for (const other of others) min = Math.min(min, other.powers.get(name) ?? 0);
		if (min > 0) powers.set(name, min);
	}

	const atoms = new Map<string, Atom>();
	for (const [key, atom] of first.atoms) {
		let min = atom.exponent;
		for (const other of others) min = Math.min(min, other.atoms.get(key)?.exponent ?? 0);
		if (min > 0) atoms.set(key, { base: atom.base, exponent: min });
	}

	return {
		coefficient: fromInteger(numericGcd === null || numericGcd === 0n ? 1n : numericGcd),
		powers,
		atoms
	};
}

/** Le monôme divisé par le contenu commun. */
function divideByContent(m: Monomial, content: Monomial): Monomial {
	const powers = new Map(m.powers);
	for (const [name, exponent] of content.powers) {
		const rest = (powers.get(name) ?? 0) - exponent;
		if (rest === 0) powers.delete(name);
		else powers.set(name, rest);
	}
	const atoms = new Map(m.atoms);
	for (const [key, atom] of content.atoms) {
		const rest = (atoms.get(key)?.exponent ?? 0) - atom.exponent;
		if (rest === 0) atoms.delete(key);
		else atoms.set(key, { base: atom.base, exponent: rest });
	}
	return { coefficient: divRational(m.coefficient, content.coefficient), powers, atoms };
}

/** Le contenu vaut-il 1 ? Alors il n'y a rien à sortir. */
function isTrivialContent(content: Monomial): boolean {
	return isOne(content.coefficient) && content.powers.size === 0 && content.atoms.size === 0;
}

/** Le produit des variables d'un monôme, `x²y` pour `{ x: 2, y: 1 }`. */
function powersNode(powers: ReadonlyMap<string, number>): MathNode | null {
	let node: MathNode | null = null;
	for (const [name, exponent] of powers) {
		const factor =
			exponent === 1 ? variable(name) : superscript(variable(name), number(String(exponent)));
		node = node === null ? factor : multiply(node, factor, 'implicit');
	}
	return node;
}

/**
 * Le monôme rendu en nœud, **valeur absolue du coefficient** : le signe est
 * porté par la somme qui l'accueille (`x − 2`, pas `x + (−2)`).
 */
function monomialNode(m: Monomial): MathNode {
	const magnitude = absRational(m.coefficient);
	const vars = joinFactors(powersNode(m.powers), atomsNode(m.atoms));
	if (vars === null) return rationalNode(magnitude);
	if (isOne(magnitude)) return vars;
	return multiply(rationalNode(magnitude), vars, 'implicit');
}

/** Le produit des facteurs non polynomiaux, `eˣ·sin x`. */
function atomsNode(atoms: ReadonlyMap<string, Atom>): MathNode | null {
	let node: MathNode | null = null;
	for (const { base, exponent } of atoms.values()) {
		const factor = exponent === 1 ? base : superscript(base, number(String(exponent)));
		node = joinFactors(node, factor);
	}
	return node;
}

/** Le produit implicite de deux facteurs, l'un ou l'autre pouvant manquer. */
function joinFactors(left: MathNode | null, right: MathNode | null): MathNode | null {
	if (left === null) return right;
	if (right === null) return left;
	return multiply(left, right, 'implicit');
}

/** Un rationnel positif rendu en nœud : entier, ou fraction. */
function rationalNode(r: Rational): MathNode {
	if (r.d === 1n) return number(r.n.toString());
	return divide(number(r.n.toString()), number(r.d.toString()), 'fraction');
}

/** La somme des monômes, les négatifs portés par des soustractions. */
function monomialsNode(monomials: readonly Monomial[]): MathNode {
	const first = monomials[0];
	let sum: MathNode = isNegativeRational(first.coefficient)
		? opposite(monomialNode(first))
		: monomialNode(first);
	for (const m of monomials.slice(1)) {
		sum = isNegativeRational(m.coefficient)
			? subtract(sum, monomialNode(m))
			: add(sum, monomialNode(m));
	}
	return sum;
}

/** Le coefficient est-il négatif ? */
function isNegativeRational(r: Rational): boolean {
	return r.n < 0n;
}

/**
 * Sort le facteur commun — numérique ET monôme — d'une somme de monômes.
 *
 * Rend `null` quand il n'y a rien à sortir : un facteur `1` ne se sort pas,
 * `x + y` reste `x + y`.
 */
function factorCommonContent(node: MathNode): MathNode | null {
	// Deux lectures : en développant les sommes d'un seul facteur (`2(x+1)` →
	// `2x + 2`), ce qui permet de factoriser au bon niveau ; ou en les gardant
	// comme facteurs, ce qui sort `(x+1)` de `(x+1)² − (x+1)`.
	//
	// ⚠️ La seconde l'emporte dès qu'elle sort au moins autant de facteurs non
	// polynomiaux, et au moins un. Prendre la première dès qu'elle réussit
	// redéveloppait la somme : `3(x+1)² − 6(x+1)` rendait `3((x+1)² − 2x − 2)`,
	// moins factorisé que l'entrée. À égalité, seule la seconde réduit son
	// reste : `(x+1)² − (x+1)³` donne `−x(x+1)²`.
	const expanded = factorCommonContentWith(node, false);
	const kept = factorCommonContentWith(node, true);
	if (
		kept !== null &&
		(expanded === null || (kept.atomCount > 0 && kept.atomCount >= expanded.atomCount))
	) {
		return kept.node;
	}
	return expanded?.node ?? null;
}

/** Une mise en facteur, et le nombre de facteurs non polynomiaux sortis. */
interface ContentFactoring {
	readonly node: MathNode;
	readonly atomCount: number;
}

function factorCommonContentWith(node: MathNode, sumsAsAtoms: boolean): ContentFactoring | null {
	const terms = flattenSumShallow(node);
	if (terms.length < 2) return null;

	const monomials: Monomial[] = [];
	for (const { sign, term } of terms) {
		const decomposed = toMonomials(term, sumsAsAtoms);
		if (decomposed === null || decomposed.length === 0) return null;
		for (const m of decomposed) {
			if (isZero(m.coefficient)) return null;
			monomials.push(sign === '+' ? m : negateMonomial(m));
		}
	}

	const content = commonContent(monomials);

	// Le signe sort quand TOUS les termes sont négatifs : `−2x − 4` donne
	// `−2(x + 2)`, pas `2(−x − 2)`. C'est ce qu'on enseigne, et le pgcd seul ne
	// le donne pas puisqu'il porte sur des entiers positifs.
	//
	// ⚠️ Seulement quand ils le sont TOUS. Sur des signes mélangés, sortir un
	// signe déplacerait le problème sans rien factoriser.
	const allNegative = monomials.every((m) => isNegativeRational(m.coefficient));

	// Rien à sortir : un facteur `1` ne se sort pas, `x + y` reste `x + y`.
	// Un contenu `1` redevient significatif quand le signe l'accompagne :
	// `−x − 1` donne `−(x + 1)`.
	if (isTrivialContent(content) && !allNegative) return null;

	const signedContent: Monomial = allNegative
		? { ...content, coefficient: negRational(content.coefficient) }
		: content;

	const divided = monomials.map((m) => divideByContent(m, signedContent));
	const remainder = sumsAsAtoms ? collectRemainder(divided) : divided;
	let atomCount = 0;
	for (const atom of content.atoms.values()) atomCount += atom.exponent;

	// Le reste se réduit à un seul terme : il n'y a plus de parenthèse à écrire.
	// `(x+1)² − (x+1)³` donne `−x(x+1)²`, pas `(1 − (x+1))(x+1)²`.
	if (remainder.length === 1) {
		const total = mulMonomial(signedContent, remainder[0]);
		const factors = factorsNode(total) ?? number('1');
		return {
			node: isNegativeRational(total.coefficient) ? opposite(factors) : factors,
			atomCount
		};
	}

	const inner = parentheses(monomialsNode(remainder));

	// Un contenu dont la valeur absolue vaut 1 et qui ne porte aucune variable
	// n'a rien à écrire : `−x − 1` donne `−(x + 1)`, pas `−1(x + 1)`.
	// Le facteur non polynomial s'écrit APRÈS la parenthèse, comme au tableau :
	// `(x − 1)eˣ`, `3(x + 2)e²ˣ`. Le nombre et les variables restent devant.
	const lead: Monomial = { ...content, atoms: NO_ATOMS };
	const bare = isOne(absRational(content.coefficient)) && content.powers.size === 0;
	const front = bare ? inner : multiply(monomialNode(lead), inner, 'implicit');
	const product = joinFactors(front, atomsNode(content.atoms)) ?? front;

	return { node: allNegative ? opposite(product) : product, atomCount };
}

/**
 * Le reste, quand les sommes ont été gardées en facteurs, relu en développant
 * celles qui y restent seules puis réduit : `(x+1) − 2` devient `x − 1`.
 *
 * C'est un développement À L'INTÉRIEUR de la parenthèse du reste, jamais du
 * facteur sorti. Si la relecture échoue, ou si tout s'annule, le reste est
 * gardé tel quel.
 */
function collectRemainder(remainder: readonly Monomial[]): readonly Monomial[] {
	const expanded = toMonomials(monomialsNode(remainder), false);
	if (expanded === null) return remainder;

	const byKey = new Map<string, Monomial>();
	for (const m of expanded) {
		const key = monomialKey(m);
		const existing = byKey.get(key);
		byKey.set(
			key,
			existing === undefined
				? m
				: { ...existing, coefficient: addRational(existing.coefficient, m.coefficient) }
		);
	}
	const collected = [...byKey.values()].filter((m) => !isZero(m.coefficient));
	return collected.length === 0 ? remainder : collected;
}

/** La partie littérale d'un monôme, pour reconnaître deux termes semblables. */
function monomialKey(m: Monomial): string {
	const powers = [...m.powers].map(([name, e]) => `${name}^${e}`).sort();
	const atoms = [...m.atoms].map(([key, atom]) => `${key}^${atom.exponent}`).sort();
	return [...powers, '|', ...atoms].join(',');
}

/**
 * Le monôme écrit en produit, valeur absolue du coefficient : le nombre et les
 * variables devant, les facteurs non polynomiaux derrière. `null` pour 1.
 */
function factorsNode(m: Monomial): MathNode | null {
	const lead: Monomial = { ...m, atoms: NO_ATOMS };
	const bare = isOne(absRational(m.coefficient)) && m.powers.size === 0;
	return joinFactors(bare ? null : monomialNode(lead), atomsNode(m.atoms));
}

/** Le nœud lié à ce nom, ou `null` si c'est une séquence. */
function boundNode(bindings: MatchBindings, name: string): MathNode | null {
	const value = bindings.get(name);
	if (value === undefined) return null;
	return isMathNodeBinding(value) ? value : null;
}

/** La somme d'origine, reconstruite depuis les deux membres liés. */
function boundSum(bindings: MatchBindings, kind: 'addition' | 'subtraction'): MathNode | null {
	const left = boundNode(bindings, 'a');
	const right = boundNode(bindings, 'b');
	if (left === null || right === null) return null;
	return kind === 'addition' ? add(left, right) : subtract(left, right);
}

/**
 * Construit la règle de mise en facteur du contenu pour un type de somme.
 *
 * ⚠️ **Priorité négative** : les identités remarquables passent devant.
 * `x² − 1` doit rester `(x+1)(x−1)`, pas devenir `1(x²−1)` ni bloquer
 * `diff-squares`.
 */
function createContentRule(kind: 'addition' | 'subtraction', name: string): Rule {
	return lazyRule(name, () => buildContentRule(kind, name));
}

/** La construction elle-même, différée par `createContentRule` (voir `lazyRule`). */
function buildContentRule(kind: 'addition' | 'subtraction', name: string): Rule {
	const pattern = kind === 'addition' ? P.add(P._('a'), P._('b')) : P.sub(P._('a'), P._('b'));
	return createRule(
		pattern,
		(bindings) => {
			const sum = boundSum(bindings, kind);
			// Inatteignable : le motif lie toujours deux nœuds, et `condition` a
			// déjà exigé que la factorisation existe.
			if (sum === null) throw new Error(`${name}: membres de la somme absents`);
			return factorCommonContent(sum) ?? sum;
		},
		{
			name,
			priority: -1,
			condition: (bindings) => {
				const sum = boundSum(bindings, kind);
				return sum !== null && factorCommonContent(sum) !== null;
			}
		}
	);
}

/** `2x + 4 → 2(x + 2)`, `x³ + x² → x²(x + 1)`, `2x² + 4x → 2x(x + 2)`. */
const factorCommonContentInAddition = createContentRule('addition', 'common-factor-content-add');

/** `2x − 4 → 2(x − 2)`, `x² − x → x(x − 1)`. */
const factorCommonContentInSubtraction = createContentRule(
	'subtraction',
	'common-factor-content-sub'
);

/**
 * Les règles de mise en facteur d'un facteur **symbolique**, `a·c + b·c → (a+b)c`.
 * Elles s'appliquent en profondeur, sans danger : elles n'agissent que sur des
 * produits déjà écrits.
 */
export const commonFactorRules: readonly Rule[] = [
	factorCommonInProducts,
	factorCommonWithBareTerm
];

/**
 * Les règles de mise en facteur du **contenu** — le facteur numérique et le
 * facteur monôme. `2x + 4 → 2(x+2)`, `x³ + x² → x²(x+1)`.
 *
 * ⚠️ **Elles s'appliquent à la RACINE seulement**, et le pipeline s'en charge.
 * Appliquées en profondeur, elles factoriseraient une sous-somme avant que la
 * somme entière ne soit vue : `x² + 2x + 1` se parse `((x² + 2x) + 1)`, et le
 * parcours remontant visite `x² + 2x` d'abord. Il deviendrait `x(x+2)`, et
 * `perfect-square-trinomial` ne reconnaîtrait plus le trinôme — l'élève
 * perdrait la phrase « On reconnaît un trinôme carré parfait », qui est la
 * raison d'être de ce module.
 */
export const commonContentFactorRules: readonly Rule[] = [
	factorCommonContentInAddition,
	factorCommonContentInSubtraction
];
