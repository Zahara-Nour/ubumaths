/**
 * Noyau exact de factorisation (ADR 0024, couche 1) : un polynôme en une
 * variable, factorisé dans ℚ[x], ou dans ℝ sur demande. Sans étapes : les
 * stratégies qui racontent (lot 2) s'appuient dessus.
 *
 * Chaîne : lecture exacte (`toRationalFunction`) → contenu (constante avec son
 * signe, partie primitive entière à coefficient dominant > 0) → racines
 * rationnelles avec multiplicités (`extractRationalRoots` : x = 0, puis ±p/q)
 * → le reste de degré 2 par Δ (`quadraticRootParts`) → le reste de degré ≥ 3,
 * sans racine rationnelle, gardé tel quel.
 *
 * Ce que le noyau ne fait PAS (limites assumées du lot 1) : chercher un facteur
 * de degré 2 dans un reste de degré ≥ 3 (`x⁴ + 4`, `(x² + 1)²` développé),
 * scinder dans ℝ autre chose qu'un facteur de degré 2 (`x³ − 2`, `x⁴ − 5x² + 6`).
 * Ces restes sont rendus exacts, non décomposés.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	ZERO,
	absRational,
	compareRational,
	divRational,
	fromInteger,
	gcd,
	isPositive,
	lcm,
	mulRational,
	rational
} from '../normal/rational';
import {
	type Poly,
	MAX_POLYNOMIAL_DEGREE,
	integerCoefficients,
	toPolynomial,
	trimPoly
} from './polynomial';
import { extractRationalRoots } from './rational-roots';
import { quadraticRootParts } from './quadratic';

// =============================================================================
// Types
// =============================================================================

/** `Q` : racines rationnelles seulement ; `R` : un facteur de degré 2 à Δ > 0 se scinde. */
export type FactorField = 'Q' | 'R';

export interface FactorOptions {
	/** Corps de factorisation, `Q` par défaut. */
	readonly field?: FactorField;
}

/** Facteur à coefficients entiers primitifs (PGCD 1), coefficient dominant > 0. */
export interface IntegerFactor {
	readonly kind: 'integer';
	/** Par degré croissant : `[c0, c1, …]` ; `x` est `[0n, 1n]`, `2x − 1` est `[-1n, 2n]`. */
	readonly coefficients: readonly bigint[];
	readonly multiplicity: number;
}

/**
 * Facteur `x − (center + sign·offset·√radicand)`, corps `R` seulement :
 * `x − 1 − √2` est `{ center: 1, offset: 1, radicand: 2, sign: 1 }`.
 */
export interface SurdFactor {
	readonly kind: 'surd';
	readonly center: Rational;
	/** > 0 */
	readonly offset: Rational;
	/** > 1, sans facteur carré */
	readonly radicand: bigint;
	readonly sign: 1 | -1;
	readonly multiplicity: number;
}

export type PolynomialFactor = IntegerFactor | SurdFactor;

/**
 * P(x) = constant × Π factors^multiplicité × rest.
 *
 * Ordre des facteurs (déterministe, pas une décision de produit) : facteurs du
 * premier degré par |racine| croissante, la racine positive avant la négative
 * (donc `x` d'abord) ; puis les facteurs irrationnels (la racine `center +
 * offset√m` avant `center − offset√m`) ; puis les facteurs de degré 2.
 */
export interface Factorization {
	readonly variable: string;
	readonly field: FactorField;
	/** Le contenu, avec son signe ; 0 pour le polynôme nul. */
	readonly constant: Rational;
	/** Facteurs irréductibles dans le corps demandé, avec leur multiplicité. */
	readonly factors: readonly PolynomialFactor[];
	/**
	 * Partie de degré ≥ 3 non décomposée (coefficients entiers primitifs, par
	 * degré croissant) ; `null` si tout est factorisé. Sans racine rationnelle
	 * quand `complete` vaut `true` — mais pas forcément irréductible : le lot 1
	 * ne cherche pas de facteur de degré 2 (`x^8-1` laisse `x^6+x^4+x^2+1`).
	 */
	readonly rest: readonly bigint[] | null;
	/**
	 * `false` quand une borne a coupé le travail (`MAX_RATIONAL_ROOT_CANDIDATES`,
	 * `MAX_DIVISOR_SEARCH`, `MAX_RADICAND`) : le produit est toujours EXACT, mais
	 * `rest` ou un facteur pourrait encore se décomposer.
	 *
	 * ⚠️ `true` ne veut PAS dire « irréductible » : `rest` peut encore se
	 * factoriser, et dans ℝ un carré comme `(x^2-2)^2` développé reste entier.
	 * Ne jamais en conclure « ne se factorise pas » devant l'élève.
	 */
	readonly complete: boolean;
}

// =============================================================================
// Bornes
// =============================================================================

/** Degré maximal : au-delà, `factorPolynomial` rend `null` (lecteur `toRationalFunction`). */
export const MAX_FACTOR_DEGREE = MAX_POLYNOMIAL_DEGREE;

/**
 * Candidats ±p/q essayés au plus (rangés par hauteur croissante) : un essai
 * coûte une évaluation exacte de degré ≤ 8 ; mille restent sous quelques
 * dizaines de millisecondes. Au-delà, la factorisation peut rester partielle.
 */
export const MAX_RATIONAL_ROOT_CANDIDATES = 1000;

/**
 * Plus grand radicande dont on extrait les facteurs carrés pour scinder dans ℝ
 * (division d'essai en √n, au plus ~5·10⁴ tours). Au-delà, le facteur de degré 2
 * reste entier et `complete` vaut `false`.
 */
export const MAX_RADICAND = 10_000_000_000n;

// =============================================================================
// Outils
// =============================================================================

/** Contenu (signe du coefficient dominant) et partie primitive entière, dominant > 0. */
export function primitivePart(poly: Poly): { content: Rational; primitive: bigint[] } {
	const p = trimPoly(poly);
	const lcmOfDenominators = p.reduce((acc, c) => lcm(acc, c.d), 1n);
	const ints = integerCoefficients(p);
	const g = ints.reduce((acc, c) => gcd(acc, c), 0n);
	const sign = ints[ints.length - 1] < 0n ? -1n : 1n;
	return {
		content: rational(sign * g, lcmOfDenominators),
		primitive: ints.map((c) => (sign * c) / g)
	};
}

/** Facteur entier `q·x − p` de la racine `p/q` (q > 0). */
function linearFactor(root: Rational): readonly bigint[] {
	return [-root.n, root.d];
}

/** Racine d'un facteur entier du premier degré. */
function linearRoot(coefficients: readonly bigint[]): Rational {
	return rational(-coefficients[0], coefficients[1]);
}

/**
 * Ordre des facteurs : premier degré par |racine| puis signe, irrationnels, degré ≥ 2.
 * Exporté : les stratégies de `factoriser` rangent leurs facteurs dans CET ordre (décision Q3).
 */
export function compareFactors(a: PolynomialFactor, b: PolynomialFactor): number {
	const rank = (f: PolynomialFactor): number =>
		f.kind === 'surd' ? 1 : f.coefficients.length === 2 ? 0 : 2;
	const ra = rank(a);
	const rb = rank(b);
	if (ra !== rb) return ra - rb;
	if (a.kind !== 'integer' || b.kind !== 'integer' || ra !== 0) return 0;
	const rootA = linearRoot(a.coefficients);
	const rootB = linearRoot(b.coefficients);
	const byMagnitude = compareRational(absRational(rootA), absRational(rootB));
	if (byMagnitude !== 0) return byMagnitude;
	return isPositive(rootA) ? -1 : isPositive(rootB) ? 1 : 0;
}

/** Accumule les facteurs, les identiques fusionnés (multiplicités additionnées). */
class FactorCollector {
	private readonly integers = new Map<string, { coefficients: readonly bigint[]; count: number }>();
	private readonly surds: SurdFactor[] = [];

	addInteger(coefficients: readonly bigint[], multiplicity: number): void {
		const key = coefficients.join(',');
		const entry = this.integers.get(key);
		if (entry) entry.count += multiplicity;
		else this.integers.set(key, { coefficients, count: multiplicity });
	}

	addSurd(factor: SurdFactor): void {
		this.surds.push(factor);
	}

	sorted(): PolynomialFactor[] {
		const integers: PolynomialFactor[] = [...this.integers.values()].map((entry) => ({
			kind: 'integer',
			coefficients: entry.coefficients,
			multiplicity: entry.count
		}));
		// Tri stable : les irrationnels gardent leur ordre d'arrivée
		return [...integers, ...this.surds].sort(compareFactors);
	}
}

// =============================================================================
// Noyau
// =============================================================================

/**
 * Factorise `node`, lu comme un polynôme en `variable` à coefficients rationnels.
 *
 * Rend `null`, sans lever, hors du champ du noyau : pas un polynôme en
 * `variable` (`x e^x`, `sin x`, `1/x`), coefficient non rationnel ou symbolique
 * (`√2 x`, `a x + a y`), degré au-delà de `MAX_FACTOR_DEGREE`.
 */
export function factorPolynomial(
	node: MathNode,
	variable: string,
	options: FactorOptions = {}
): Factorization | null {
	const field = options.field ?? 'Q';
	const poly = toPolynomial(node, variable);
	if (poly === null) return null; // fraction rationnelle, autre lettre… : pas un polynôme

	if (poly.length === 0) {
		return { variable, field, constant: ZERO, factors: [], rest: null, complete: true };
	}

	// 1. Contenu
	const { content, primitive } = primitivePart(poly);
	let constant = content;
	let complete = true;
	const collector = new FactorCollector();

	// 2. Racines rationnelles (x = 0 compris), avec multiplicités
	const search = extractRationalRoots(primitive.map(fromInteger), MAX_RATIONAL_ROOT_CANDIDATES);
	let denominators = 1n;
	for (const root of search.roots) {
		collector.addInteger(linearFactor(root), 1);
		denominators *= root.d;
	}

	// Le reste a le coefficient dominant du primitif ; on le divise par le produit
	// des q (x − p/q = (qx − p)/q), et son contenu passe dans la constante. Par le
	// lemme de Gauss (produit de primitifs = primitif), ce contenu et les
	// quotients a/(q₁q₂) ci-dessous valent 1 : on les calcule quand même, la
	// constante reste exacte par construction et non par théorème.
	let rest: readonly bigint[] | null = null;
	if (search.rest.length > 1) {
		const scaled = search.rest.map((c) => divRational(c, fromInteger(denominators)));
		const part = primitivePart(scaled);
		constant = mulRational(constant, part.content);
		const r = part.primitive;
		const degree = r.length - 1;

		if (degree === 1) {
			collector.addInteger(r, 1);
		} else if (degree === 2) {
			const [c, b, a] = r.map(fromInteger);
			const parts = quadraticRootParts(a, b, c, field === 'R' ? MAX_RADICAND : 0n);
			switch (parts.kind) {
				case 'double':
					collector.addInteger(linearFactor(parts.root), 2);
					constant = mulRational(constant, divRational(a, fromInteger(parts.root.d ** 2n)));
					break;
				case 'rational': {
					const [r1, r2] = parts.roots;
					collector.addInteger(linearFactor(r1), 1);
					collector.addInteger(linearFactor(r2), 1);
					constant = mulRational(constant, divRational(a, fromInteger(r1.d * r2.d)));
					break;
				}
				case 'surd':
					if (field === 'R') {
						for (const sign of [1, -1] as const) {
							collector.addSurd({
								kind: 'surd',
								center: parts.center,
								offset: parts.offset,
								radicand: parts.radicand,
								sign,
								multiplicity: 1
							});
						}
						constant = mulRational(constant, a);
					} else {
						collector.addInteger(r, 1);
					}
					break;
				case 'irrational':
					// Q : non carré, donc irréductible ; R : trop grand pour être réduit
					if (field === 'R') complete = false;
					collector.addInteger(r, 1);
					break;
				case 'none':
					collector.addInteger(r, 1);
					break;
			}
		} else {
			rest = r;
			if (!search.complete) complete = false;
		}
	} else {
		// Reste constant (le dominant du primitif) : son quotient par le produit
		// des q entre dans la constante
		constant = mulRational(constant, divRational(search.rest[0], fromInteger(denominators)));
	}

	return { variable, field, constant, factors: collector.sorted(), rest, complete };
}
