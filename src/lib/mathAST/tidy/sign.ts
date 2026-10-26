/**
 * Une base peut-elle s'annuler ? (S3, chantier simplify-carte, 2026-10-23)
 *
 * `tidy` ne simplifie une base entre numérateur et dénominateur que si elle
 * reste au dénominateur ou ne peut pas valoir 0 : `eˣ/eˣ → 1`, mais `x/x`
 * reste. Les réponses sont **prudentes** : `false` veut dire « pas prouvé »,
 * et la base reste alors des deux côtés de la barre.
 *
 * `numtype` répond pour les feuilles (constantes, variables sous hypothèse
 * déclarée) ; il ignore qu'un carré est positif ou nul et que `eˣ` est
 * positif (mesuré le 2026-10-23), d'où la lecture de structure ci-dessous.
 *
 * @module mathAST/tidy/sign
 */

import type { MathNode } from '../types';
import type { TidyCondition } from './types';
import type { TypeContext } from '../numtype';
import { isNonNegativeType, isNonzeroType, isPositiveType } from '../numtype';
import { extractExactRational, extractRational } from '../common/numeric';
import { hashMathNode } from '../normal/hash';
import { findNodes, getChildren } from '../transforms';
import { isVariable } from '../guards';

/** La base ne vaut 0 en aucun point où elle est définie. */
export function cannotVanish(node: MathNode, typeCtx: TypeContext | undefined): boolean {
	switch (node.type) {
		case 'number': {
			const value = extractRational(node);
			return value !== null && value.n !== 0n;
		}
		case 'delimiter':
			return cannotVanish(node.content, typeCtx);
		case 'positive':
		case 'opposite':
			return cannotVanish(node.operand, typeCtx);
		case 'multiplication':
			return cannotVanish(node.left, typeCtx) && cannotVanish(node.right, typeCtx);
		case 'division':
			return cannotVanish(node.numerator, typeCtx);
		case 'superscript':
			// a^b ≠ 0 là où il est défini, dès que a ≠ 0.
			return cannotVanish(node.base, typeCtx);
		case 'function':
			if (node.name === 'exp') return true;
			if (node.name === 'sqrt' || node.name === 'abs') {
				return node.args.length === 1 && cannotVanish(node.args[0], typeCtx);
			}
			break;
		case 'addition':
			return isPositive(node, typeCtx);
		default:
			break;
	}
	return isNonzeroType(node, typeCtx);
}

/** Strictement positif partout où c'est défini. */
function isPositive(node: MathNode, typeCtx: TypeContext | undefined): boolean {
	switch (node.type) {
		case 'number': {
			const value = extractRational(node);
			return value !== null && value.n > 0n;
		}
		case 'delimiter':
			return isPositive(node.content, typeCtx);
		case 'multiplication':
			return isPositive(node.left, typeCtx) && isPositive(node.right, typeCtx);
		case 'division':
			return isPositive(node.numerator, typeCtx) && isPositive(node.denominator, typeCtx);
		case 'superscript':
			return isPositive(node.base, typeCtx);
		case 'function':
			if (node.name === 'exp') return true;
			break;
		case 'addition':
			// Une somme de termes positifs ou nuls dont l'un est strictement positif.
			return (
				isNonNegative(node.left, typeCtx) &&
				isNonNegative(node.right, typeCtx) &&
				(isPositive(node.left, typeCtx) || isPositive(node.right, typeCtx))
			);
		default:
			break;
	}
	return isPositiveType(node, typeCtx);
}

/** Positif ou nul partout où c'est défini. */
function isNonNegative(node: MathNode, typeCtx: TypeContext | undefined): boolean {
	if (isPositive(node, typeCtx)) return true;
	switch (node.type) {
		case 'number': {
			const value = extractRational(node);
			return value !== null && value.n >= 0n;
		}
		case 'delimiter':
			return isNonNegative(node.content, typeCtx);
		case 'multiplication':
			return isNonNegative(node.left, typeCtx) && isNonNegative(node.right, typeCtx);
		case 'superscript': {
			// Une puissance paire : `x²`, `(x+1)⁴`.
			const exponent = extractRational(node.superscript);
			if (exponent !== null && exponent.d === 1n && exponent.n % 2n === 0n) return true;
			return isNonNegative(node.base, typeCtx);
		}
		case 'function':
			if (node.name === 'sqrt' || node.name === 'abs') return true;
			break;
		case 'addition':
			return isNonNegative(node.left, typeCtx) && isNonNegative(node.right, typeCtx);
		default:
			break;
	}
	return isNonNegativeType(node, typeCtx);
}

/**
 * Les bases non nulles sur un domaine acquis (option `domain` de `tidy`) :
 * l'argument d'un `ln` ou d'un `log`, un dénominateur, la base d'une puissance
 * négative ou d'exposant variable (`xˣ` n'est défini que pour x > 0). Un produit non nul a tous ses facteurs non nuls : `ln(2x)` dit
 * aussi `x ≠ 0`. Rendues par le hash de leur forme mise au propre, celle des
 * facteurs de `tidy`.
 *
 * @param domain - Les expressions dont le domaine de définition est acquis
 * @param tidyBase - La mise au propre (passée en argument : `collect` importe ce module)
 */
export function nonZeroBases(
	domain: readonly MathNode[],
	tidyBase: (node: MathNode) => MathNode
): ReadonlySet<string> {
	const bases = new Set<string>();
	const add = (node: MathNode): void => {
		switch (node.type) {
			case 'delimiter':
				add(node.content);
				return;
			case 'positive':
			case 'opposite':
				add(node.operand);
				return;
			case 'multiplication':
				add(node.left);
				add(node.right);
				return;
			case 'division':
				add(node.numerator);
				add(node.denominator);
				return;
			case 'superscript':
				add(node.base);
				return;
			default:
				bases.add(hashMathNode(node));
		}
	};
	const visit = (node: MathNode): void => {
		if (node.type === 'function' && (node.name === 'ln' || node.name === 'log')) {
			if (node.args.length === 1) add(tidyBase(node.args[0]));
		} else if (node.type === 'division') {
			add(tidyBase(node.denominator));
		} else if (node.type === 'superscript') {
			const exponent = extractRational(node.superscript);
			const variable = exponent === null && findNodes(node.superscript, isVariable).length > 0;
			if (variable || (exponent !== null && exponent.n < 0n)) add(tidyBase(node.base));
		}
		for (const child of getChildren(node)) visit(child);
	};
	for (const node of domain) visit(node);
	return bases;
}

/**
 * Les bases strictement positives sur un domaine acquis : l'argument d'un
 * logarithme, la base d'une puissance d'exposant variable. À part de
 * `nonZeroBases` : un dénominateur dit « ≠ 0 », pas « > 0 » (revue, 2026-10-24 :
 * sur le domaine de `1/x`, `ln(x) − ln(x)` ne s'annule pas).
 */
export function positiveBases(
	domain: readonly MathNode[],
	tidyBase: (node: MathNode) => MathNode
): ReadonlySet<string> {
	const bases = new Set<string>();
	const visit = (node: MathNode): void => {
		if (node.type === 'function' && LOGARITHMS.has(node.name) && node.args.length === 1) {
			bases.add(hashMathNode(tidyBase(node.args[0])));
		} else if (node.type === 'superscript') {
			const exponent = extractRational(node.superscript);
			if (exponent === null && findNodes(node.superscript, isVariable).length > 0) {
				bases.add(hashMathNode(tidyBase(node.base)));
			}
		}
		for (const child of getChildren(node)) visit(child);
	};
	for (const node of domain) visit(node);
	return bases;
}

/** Ce qu'un domaine acquis garantit des bases, par leur hash. */
export type AcquiredDomain = {
	/** Les bases non nulles (`nonZeroBases`). */
	readonly nonZero: ReadonlySet<string>;
	/** Les bases strictement positives (`positiveBases`). */
	readonly positive: ReadonlySet<string>;
};

/** Les fonctions usuelles qui ne sont pas définies sur ℝ entier (`domain/builtins.ts`, `eval/evaluate.ts`). */
const RESTRICTED_FUNCTIONS = new Set([
	'sqrt',
	'ln',
	'log',
	'log10',
	'log2',
	'arcsin',
	'arccos',
	'arccosh',
	'arctanh',
	'tan',
	'cot',
	'sec',
	'csc',
	'factorial'
]);

/** Les logarithmes : argument strictement positif. */
const LOGARITHMS = new Set(['ln', 'log', 'log10', 'log2']);

/**
 * L'expression est-elle définie pour toute valeur de ses variables ? (S3
 * étendue aux sommes, David, 2026-10-24.) Des termes semblables de somme nulle
 * ne disparaissent que si elle l'est : `x − x → 0`, mais `ln(x) − ln(x)` et
 * `1/x − 1/x` restent. Une hypothèse déclarée (`typeCtx`) ou le domaine acquis
 * (`acquired`) lève la restriction. Prudente comme `cannotVanish` : `false`
 * veut dire « pas prouvé ». Une fonction inconnue (`f`) est tenue pour définie
 * partout, comme dans `domain/builtins.ts`.
 */
export function definedEverywhere(
	node: MathNode,
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain
): boolean {
	// Une constante : `tidy` ne lui fait rien perdre en l'annulant
	if (findNodes(node, isVariable).length === 0) return true;
	if (!getChildren(node).every((child) => definedEverywhere(child, typeCtx, acquired))) {
		return false;
	}
	switch (node.type) {
		case 'division':
			return knownNonZero(node.denominator, typeCtx, acquired);
		case 'superscript': {
			const exponent = extractRational(node.superscript);
			return exponent === null
				? knownPositive(node.base, typeCtx, acquired)
				: powerDefinedEverywhere(node.base, exponent, typeCtx, acquired);
		}
		case 'function': {
			if (!RESTRICTED_FUNCTIONS.has(node.name)) return true;
			if (node.args.length !== 1) return false;
			const [arg] = node.args;
			// Une racine d'indice impair est définie sur ℝ : `∛x − ∛x → 0` (Q41)
			if (node.name === 'sqrt') return hasOddIndex(node.base) || isNonNegative(arg, typeCtx);
			if (LOGARITHMS.has(node.name)) return knownPositive(arg, typeCtx, acquired);
			return false;
		}
		default:
			return true;
	}
}

/** `∛x`, `⁵√x` : l'indice d'une racine est un entier impair positif (`√x` n'en a pas). */
function hasOddIndex(index: MathNode | undefined): boolean {
	if (index === undefined) return false;
	const value = extractRational(index);
	return value !== null && value.d === 1n && value.n > 0n && value.n % 2n !== 0n;
}

/**
 * `base^exposant`, exposant rationnel, est-il défini partout ? Un entier
 * positif toujours ; un entier négatif si la base ne s'annule pas ; un
 * exposant fractionnaire si la base est positive (ou nulle, exposant positif).
 * `key` : le hash de la base, quand l'appelant l'a déjà (facteur de `tidy`).
 */
export function powerDefinedEverywhere(
	base: MathNode,
	exponent: { readonly n: bigint; readonly d: bigint },
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain,
	key: string = hashMathNode(base)
): boolean {
	if (findNodes(base, isVariable).length === 0) return true;
	if (exponent.d === 1n) {
		return exponent.n >= 0n || cannotVanish(base, typeCtx) || acquired.nonZero.has(key);
	}
	if (acquired.positive.has(key)) return true;
	return exponent.n > 0n ? isNonNegative(base, typeCtx) : isPositive(base, typeCtx);
}

/** Une base dont on sait qu'elle ne vaut pas 0 : par sa structure, ou par le domaine acquis. */
function knownNonZero(
	node: MathNode,
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain
): boolean {
	return cannotVanish(node, typeCtx) || acquired.nonZero.has(hashMathNode(node));
}

/** Une base dont on sait qu'elle est strictement positive. */
function knownPositive(
	node: MathNode,
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain
): boolean {
	return isPositive(node, typeCtx) || acquired.positive.has(hashMathNode(node));
}

/**
 * Ce qu'une simplification fait perdre quand `base` quitte le dénominateur
 * (chantier tidy-conditions) : `base ≠ 0`, et le domaine de `base` s'il est
 * restreint. `null` : une condition qu'on ne sait pas écrire simplement
 * (`tan`, `arcsin`), la simplification n'a pas lieu.
 */
export function cancelledBaseConditions(
	base: MathNode,
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain
): TidyCondition[] | null {
	const defined = domainConditions(base, typeCtx, acquired);
	if (defined === null) return null;
	return [{ expression: base, relation: 'nonzero' }, ...defined];
}

/**
 * Ce que fait perdre un terme `base^exposant` effacé par une somme nulle
 * (`ln(x) − ln(x)`, `1/x − 1/x`) : son domaine. `null` comme ci-dessus.
 */
export function cancelledFactorConditions(
	base: MathNode,
	exponent: { readonly n: bigint; readonly d: bigint },
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain
): TidyCondition[] | null {
	const defined = domainConditions(base, typeCtx, acquired);
	if (defined === null) return null;
	const power = powerCondition(base, exponent);
	if (power === null || powerDefinedEverywhere(base, exponent, typeCtx, acquired)) return defined;
	return [...defined, { expression: base, relation: power }];
}

/** Ce qu'il faut à `base` pour que `base^exposant` soit défini, `null` : rien. */
function powerCondition(
	base: MathNode,
	exponent: { readonly n: bigint; readonly d: bigint }
): TidyCondition['relation'] | null {
	if (findNodes(base, isVariable).length === 0) return null;
	if (exponent.d === 1n) return exponent.n < 0n ? 'nonzero' : null;
	return exponent.n > 0n ? 'nonnegative' : 'positive';
}

/**
 * Les conditions qui définissent `node`, sauf celles qu'on sait déjà vraies
 * (structure, hypothèse déclarée, domaine acquis) — mêmes règles que
 * `definedEverywhere`. `null` si l'une ne s'écrit pas simplement.
 */
export function domainConditions(
	node: MathNode,
	typeCtx: TypeContext | undefined,
	acquired: AcquiredDomain
): TidyCondition[] | null {
	if (findNodes(node, isVariable).length === 0) return [];
	const found: TidyCondition[] = [];
	for (const child of getChildren(node)) {
		const inner = domainConditions(child, typeCtx, acquired);
		if (inner === null) return null;
		found.push(...inner);
	}
	const need = (expression: MathNode, relation: TidyCondition['relation']): void => {
		const known =
			relation === 'nonzero'
				? knownNonZero(expression, typeCtx, acquired)
				: relation === 'positive'
					? knownPositive(expression, typeCtx, acquired)
					: isNonNegative(expression, typeCtx) || acquired.positive.has(hashMathNode(expression));
		if (!known) found.push({ expression, relation });
	};
	switch (node.type) {
		case 'division':
			need(node.denominator, 'nonzero');
			break;
		case 'superscript': {
			if (findNodes(node.base, isVariable).length === 0) break;
			// `x^(1/2)` : un quotient de deux nombres est un exposant rationnel
			const exponent = extractExactRational(node.superscript);
			const relation = exponent === null ? 'positive' : powerCondition(node.base, exponent);
			if (relation !== null) need(node.base, relation);
			break;
		}
		case 'function': {
			if (!RESTRICTED_FUNCTIONS.has(node.name)) break;
			if (node.args.length !== 1) return null;
			const [arg] = node.args;
			if (node.name === 'sqrt') {
				if (!hasOddIndex(node.base)) need(arg, 'nonnegative');
			} else if (LOGARITHMS.has(node.name)) need(arg, 'positive');
			else return null;
			break;
		}
		default:
			break;
	}
	return found;
}
