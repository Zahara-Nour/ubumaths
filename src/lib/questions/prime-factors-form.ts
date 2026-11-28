/**
 * Forme exigée « produit de facteurs premiers » (outils-manquants n° 76).
 *
 * Lit une réponse déjà analysée (parenthèses inutiles retirées) comme un produit de
 * facteurs `p` ou `p^k` (entiers positifs, k ≥ 1), dans n'importe quel ordre, et dit ce
 * qui ne va pas : facteur non premier (nommé), nombre composé écrit seul, facteurs égaux
 * non regroupés (perfectible quand les puissances sont exigées), autre écriture.
 * Décisions de David : phase 0 du 2026-11-28 (journal `outil-formes-messages`).
 */

import type { MathNode } from '#lib/mathAST/index.ts';
import {
	isMultiplication,
	isNumber,
	isSuperscript,
	flattenProductShallow
} from '#lib/mathAST/index.ts';
import type { PrimeFactorForm, RequiredForm } from './types';
import { PRIME_FACTOR_FORMS } from './types';

// =============================================================================
// TYPES
// =============================================================================

/** Ce que dit la lecture d'une réponse comme produit de facteurs premiers */
export type PrimeFactorsAnalysis =
	| { kind: 'ok' }
	/** Facteurs égaux non regroupés (2 × 2 × 3) : `grouped` est l'écriture regroupée, en LaTeX */
	| { kind: 'ungrouped'; grouped: string }
	/** Bases non premières, dans l'ordre de la réponse, sans doublon */
	| { kind: 'notPrime'; culprits: string[] }
	/** Nombre composé écrit seul (84) */
	| { kind: 'notProduct'; value: string }
	/** Autre écriture : somme, fraction, signe, exposant nul ou littéral… */
	| { kind: 'other' };

interface PrimeFactor {
	base: string;
	exponent: number;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Plus grande base dont on teste la primalité (division d'essai ≤ 10^6) */
const MAX_PRIME_BASE = 1e12;

/** Plus grand exposant lu (au-delà, l'écriture n'est pas une décomposition d'élève) */
const MAX_EXPONENT = 1000;

export const PRIME_FACTORS_FEEDBACK = {
	other: 'La réponse doit être écrite comme un produit de facteurs premiers.'
} as const;

// =============================================================================
// FONCTIONS
// =============================================================================

/** Forme exigée « produit de facteurs premiers » ? */
export function isPrimeFactorForm(form: RequiredForm): form is PrimeFactorForm {
	return typeof form === 'string' && (PRIME_FACTOR_FORMS as readonly string[]).includes(form);
}

/** Entier positif écrit en chiffres (`84`), sinon undefined */
function positiveIntegerOf(node: MathNode): number | undefined {
	if (!isNumber(node) || !/^\d+$/.test(node.value)) return undefined;
	const value = Number(node.value);
	return Number.isSafeInteger(value) ? value : undefined;
}

function isPrime(n: number): boolean {
	if (n < 2) return false;
	if (n % 2 === 0) return n === 2;
	for (let d = 3; d * d <= n; d += 2) {
		if (n % d === 0) return false;
	}
	return true;
}

/** Un facteur `p` ou `p^k` (k entier ≥ 1), sinon undefined */
function primeFactorOf(node: MathNode): PrimeFactor | undefined {
	const plain = positiveIntegerOf(node);
	if (plain !== undefined) return { base: String(plain), exponent: 1 };
	if (!isSuperscript(node)) return undefined;
	const base = positiveIntegerOf(node.base);
	const exponent = positiveIntegerOf(node.superscript);
	if (base === undefined || exponent === undefined || exponent < 1 || exponent > MAX_EXPONENT) {
		return undefined;
	}
	return { base: String(base), exponent };
}

/** Écriture regroupée, bases croissantes : `2^{2} \times 3 \times 7` */
function groupedLatex(factors: readonly PrimeFactor[]): string {
	const exponents = new Map<number, number>();
	for (const { base, exponent } of factors) {
		const n = Number(base);
		exponents.set(n, (exponents.get(n) ?? 0) + exponent);
	}
	return [...exponents.entries()]
		.sort(([a], [b]) => a - b)
		.map(([base, exponent]) => (exponent === 1 ? `${base}` : `${base}^{${exponent}}`))
		.join(' \\times ');
}

/**
 * Lit la réponse (arbre sans parenthèses inutiles) comme un produit de facteurs premiers.
 * La valeur n'est pas jugée ici : le juge de valeur l'a fait avant.
 */
export function analyzePrimeFactors(node: MathNode): PrimeFactorsAnalysis {
	const nodes = isMultiplication(node)
		? flattenProductShallow(node).map(({ factor }) => factor)
		: [node];
	const factors: PrimeFactor[] = [];
	for (const factorNode of nodes) {
		const factor = primeFactorOf(factorNode);
		if (!factor || Number(factor.base) > MAX_PRIME_BASE) return { kind: 'other' };
		factors.push(factor);
	}

	const culprits = [
		...new Set(factors.filter(({ base }) => !isPrime(Number(base))).map(({ base }) => base))
	];
	if (culprits.length > 0) {
		const [only] = factors;
		// Nombre composé écrit seul : « Écris 84 comme un produit… » (1 seul : non premier)
		if (factors.length === 1 && only.exponent === 1 && only.base !== '1') {
			return { kind: 'notProduct', value: only.base };
		}
		return { kind: 'notPrime', culprits };
	}

	const bases = factors.map(({ base }) => base);
	if (new Set(bases).size < bases.length)
		return { kind: 'ungrouped', grouped: groupedLatex(factors) };
	return { kind: 'ok' };
}

/** « $4$ », « $4$ et $21$ », « $4$, $6$ et $9$ » */
function listOf(values: readonly string[]): string {
	const items = values.map((value) => `$${value}$`);
	return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`;
}

/** Message à l'élève pour une lecture qui n'est pas `ok` */
export function primeFactorsFeedback(
	analysis: Exclude<PrimeFactorsAnalysis, { kind: 'ok' }>
): string {
	switch (analysis.kind) {
		case 'ungrouped':
			return `Regroupe les facteurs égaux en puissance : $${analysis.grouped}$.`;
		case 'notPrime':
			return analysis.culprits.length === 1
				? `${listOf(analysis.culprits)} n’est pas un nombre premier.`
				: `${listOf(analysis.culprits)} ne sont pas des nombres premiers.`;
		case 'notProduct':
			return `Écris $${analysis.value}$ comme un produit de facteurs premiers.`;
		case 'other':
			return PRIME_FACTORS_FEEDBACK.other;
	}
}

/**
 * Verdict de la forme : facteurs égaux non regroupés = juste (puissances permises) ou
 * perfectible (puissances exigées) ; toute autre lecture que `ok` est refusée.
 */
export function primeFactorsVerdict(
	analysis: PrimeFactorsAnalysis,
	form: PrimeFactorForm
): 'ok' | 'acceptable' | 'violated' {
	if (analysis.kind === 'ok') return 'ok';
	if (analysis.kind === 'ungrouped') return form === 'primeFactors' ? 'ok' : 'acceptable';
	return 'violated';
}
