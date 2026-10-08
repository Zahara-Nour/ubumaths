/**
 * Changement de variable x = u^L pour une équation où x n'apparaît qu'en
 * puissances rationnelles de x (quatrième revue du 2026-10-08).
 *
 * x^{2/3} = x, x^{1/3} = x³, 1/x^{1/3} = x, x^{2/5} = x^{1/5} + 2 : la
 * réécriture en radical ∛(x²) = x n'était résolue par aucun solveur (∅). Avec
 * L le ppcm des dénominateurs des exposants, x^{p/q} = u^{pL/q} : l'équation
 * devient polynomiale (ou rationnelle) en u.
 *
 * ## Domaine
 *
 * - L impair (tous les dénominateurs impairs, décision du 2026-10-08) :
 *   u ↦ u^L est une bijection de ℝ, chaque u réel donne x = u^L, sans
 *   condition ;
 * - L pair, ou un exposant DÉCIMAL (`x^{0.5}`, `x^{0.2}` : convention
 *   x^a = e^{a ln x}, base ≥ 0) : u ≥ 0 seulement, puis x = u^L.
 * Chaque x est enfin vérifié numériquement dans l'équation de départ : une
 * solution qui ne la vérifie pas est écartée.
 *
 * S'applique seulement s'il y a un exposant de dénominateur impair ≥ 3 ou un
 * exposant décimal : les équations en √x seul gardent leur solveur.
 *
 * @module mathAST/solve/power-substitution
 */

import type { MathNode, RelationNode } from '../types';
import type { Solution, SolveOptions, SolveResult } from './types';
import { isDelimiter, isVariable } from '../guards';
import { findFirst, mapNodeTopDown } from '../transforms';
import { divide, equals, number, superscript, variable as variableNode } from '../factory';
import { writtenRational } from '../eval/real-root';
import { extractRational, numericNode } from '../common/numeric';
import { compile } from '../eval/compile';
import { evaluate } from '../eval/evaluate';

interface Power {
	/** Exposant irréductible n/d (d > 0) */
	readonly n: bigint;
	readonly d: bigint;
	/** Écrit en décimal (`0.5`) : base ≥ 0 exigée */
	readonly decimal: boolean;
}

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

function reduce(n: bigint, d: bigint, decimal: boolean): Power {
	const g = gcd(n, d) || 1n;
	return d < 0n ? { n: -n / g, d: -d / g, decimal } : { n: n / g, d: d / g, decimal };
}

function isX(node: MathNode, x: string): boolean {
	const inner = isDelimiter(node) ? node.content : node;
	return isVariable(inner) && inner.name === x;
}

/** Exposant entier ÉCRIT de `x^k`, `x` (1), ou `null`. */
function integerPowerOfX(node: MathNode, x: string): bigint | null {
	const inner = isDelimiter(node) ? node.content : node;
	if (isX(inner, x)) return 1n;
	if (inner.type === 'superscript' && isX(inner.base, x)) {
		const e = writtenRational(inner.superscript);
		return e !== null && e.d === 1n ? e.n : null;
	}
	return null;
}

/** `node` vu comme une puissance rationnelle de x, ou `null`. */
function powerOfX(node: MathNode, x: string): Power | null {
	const inner = isDelimiter(node) ? node.content : node;
	if (isX(inner, x)) return { n: 1n, d: 1n, decimal: false };
	if (inner.type === 'superscript' && isX(inner.base, x)) {
		const written = writtenRational(inner.superscript);
		if (written !== null) return { ...written, decimal: false };
		const decimal = extractRational(inner.superscript);
		return decimal === null ? null : reduce(decimal.n, decimal.d, true);
	}
	if (inner.type === 'function' && inner.args.length === 1 && inner.power === undefined) {
		let index: bigint | null = null;
		if (inner.name === 'cbrt' && inner.base === undefined) index = 3n;
		if (inner.name === 'sqrt') {
			const base = inner.base === undefined ? { n: 2n, d: 1n } : writtenRational(inner.base);
			index = base !== null && base.d === 1n && base.n >= 2n ? base.n : null;
		}
		if (index === null) return null;
		// ⁿ√(x^k) ou ⁿ√(1/x^k) — la forme que rend `expandOddRootPowers`
		const radicand = isDelimiter(inner.args[0]) ? inner.args[0].content : inner.args[0];
		let k = integerPowerOfX(radicand, x);
		if (k === null && radicand.type === 'division') {
			const one = writtenRational(radicand.numerator);
			const below = integerPowerOfX(radicand.denominator, x);
			if (one !== null && one.n === 1n && one.d === 1n && below !== null) k = -below;
		}
		if (k === null) return null;
		// ⁿ√(x^k), n et k pairs : |x|^{k/n}, pas une puissance de x
		if (index % 2n === 0n && k % 2n === 0n) return null;
		return reduce(k, index, false);
	}
	return null;
}

function freshVariable(expr: MathNode): string {
	for (const name of ['u', 'v', 'w', 't', 's']) {
		if (findFirst(expr, (n) => isVariable(n) && n.name === name) === undefined) return name;
	}
	return 'u_0';
}

/** u^k (k entier, éventuellement négatif → 1/u^{|k|}). */
function uPower(u: string, k: bigint): MathNode {
	const base = variableNode(u);
	if (k === 0n) return number('1');
	const magnitude = k < 0n ? -k : k;
	const raised = magnitude === 1n ? base : superscript(base, number(magnitude.toString()));
	return k < 0n ? divide(number('1'), raised, 'fraction') : raised;
}

/**
 * Résout `expr = 0` par x = u^L, ou rend `null` quand la substitution ne
 * s'applique pas (ou que l'équation en u n'est pas résolue) : l'appelant
 * garde alors son chemin.
 */
export function solveByPowerSubstitution(
	expr: MathNode,
	x: string,
	solveFn: (eq: RelationNode, options?: SolveOptions) => SolveResult
): SolveResult | null {
	// 1. Inventaire : chaque occurrence de x doit être une puissance de x
	const powers: Power[] = [];
	const probe = mapNodeTopDown(expr, (node) => {
		const p = powerOfX(node, x);
		if (p === null) return node;
		powers.push(p);
		return number('0');
	});
	if (findFirst(probe, (n) => isVariable(n) && n.name === x) !== undefined) return null;
	const hasOddRoot = powers.some((p) => p.d >= 3n && p.d % 2n === 1n);
	const hasDecimal = powers.some((p) => p.decimal && p.d !== 1n);
	if (!hasOddRoot && !hasDecimal) return null;

	let L = 1n;
	for (const p of powers) L = (L * p.d) / gcd(L, p.d);
	const nonNegative = L % 2n === 0n || powers.some((p) => p.decimal && p.d !== 1n);

	// 2. x^{n/d} → u^{nL/d}
	const u = freshVariable(expr);
	const substituted = mapNodeTopDown(expr, (node) => {
		const p = powerOfX(node, x);
		return p === null ? node : uPower(u, (p.n * L) / p.d);
	});
	const inU = solveFn(equals(substituted, number('0')), { variable: u });
	if (inU.status === 'infinite' || inU.status === 'approximate') return null;
	if (inU.error !== undefined && !inU.conclusive && inU.solutions.length === 0) {
		// Résolution en u non supportée (u⁵ + u + 1 = 0) : valeurs approchées
		// par changement de signe, jamais une conclusion « aucune solution »
		return numericFallback(expr, x, substituted, u, L, nonNegative, inU);
	}

	// 3. x = u^L, vérifié dans l'équation de départ
	const f = compile(expr);
	const solutions: Solution[] = [];
	for (const s of inU.solutions) {
		// Valeur lue sur le nœud : `approximate` du solveur peut être faux (√2 → 1)
		const uValue = numericValue(s.value) ?? s.approximate;
		if (uValue === undefined) {
			// Paramètre (x^{1/3} = a) : pas de contrôle numérique possible. L
			// impair : u ↦ u^L bijection de ℝ, la solution est sûre ; L pair :
			// u ≥ 0 invérifiable → chemin d'origine
			if (nonNegative) return null;
			solutions.push({ value: xFromU(s.value, L), exact: s.exact });
			continue;
		}
		if (!Number.isFinite(uValue) || (nonNegative && uValue < 0)) continue;
		const xApprox = Math.pow(uValue, Number(L));
		const residual = Number(f({ [x]: xApprox }));
		if (!Number.isFinite(residual) || Math.abs(residual) > 1e-6 * Math.max(1, Math.abs(xApprox))) {
			continue;
		}
		if (solutions.some((t) => Math.abs((t.approximate ?? Number.NaN) - xApprox) < 1e-12)) continue;
		const value = xFromU(s.value, L);
		// Écriture exacte illisible (Cardano à la puissance L) : valeur approchée
		const readable = JSON.stringify(value).length <= MAX_EXACT_SIZE;
		solutions.push(
			readable
				? { value, approximate: xApprox, exact: s.exact }
				: { value: numericNode(xApprox), approximate: xApprox, exact: false }
		);
	}
	solutions.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));
	return {
		variable: x,
		status: solutions.length === 0 ? 'no-solution' : solutions.length === 1 ? 'unique' : 'multiple',
		solutions,
		equationType: inU.equationType,
		strategy: inU.strategy,
		steps: [],
		conclusive: inU.conclusive
	};
}

/** Taille (JSON) au-delà de laquelle une solution exacte est rendue approchée. */
const MAX_EXACT_SIZE = 1500;

/** Valeur numérique d'un nœud sans paramètre, sinon `undefined`. */
function numericValue(node: MathNode): number | undefined {
	try {
		const v = Number(compile(node)({}));
		return Number.isFinite(v) ? v : undefined;
	} catch {
		return undefined;
	}
}

/** x = u^L, simplifié quand c'est possible. */
function xFromU(uValue: MathNode, L: bigint): MathNode {
	const raised = superscript(uValue, number(L.toString()));
	try {
		const exact = evaluate(raised, { mode: 'exact' });
		return exact.status === 'value' ? exact.node : raised;
	} catch {
		return raised;
	}
}

/**
 * Racines réelles de g(u) = 0 par changement de signe (grille ±10⁻⁶…10⁶,
 * puis dichotomie), rendues APPROCHÉES et non concluantes (une racine double
 * sans changement de signe échappe). `null` si g a un paramètre ou si rien
 * n'est trouvé : l'appelant garde son chemin.
 */
function numericFallback(
	expr: MathNode,
	x: string,
	substituted: MathNode,
	u: string,
	L: bigint,
	nonNegative: boolean,
	inU: SolveResult
): SolveResult | null {
	const g = compile(substituted);
	const f = compile(expr);
	const at = (v: number): number => {
		const y = Number(g({ [u]: v }));
		return Number.isFinite(y) ? y : Number.NaN;
	};
	if (Number.isNaN(at(0.731)) && Number.isNaN(at(-0.731))) return null;
	const grid: number[] = [0];
	for (let k = -6; k <= 6; k += 0.05) grid.push(10 ** k, -(10 ** k));
	grid.sort((a, b) => a - b);
	const roots: number[] = [];
	for (let i = 0; i + 1 < grid.length; i++) {
		let a = grid[i];
		let b = grid[i + 1];
		let ga = at(a);
		const gb = at(b);
		if (Number.isNaN(ga) || Number.isNaN(gb)) continue;
		if (ga === 0) {
			roots.push(a);
			continue;
		}
		if (Math.sign(ga) === Math.sign(gb)) continue;
		for (let it = 0; it < 200; it++) {
			const m = (a + b) / 2;
			const gm = at(m);
			if (Number.isNaN(gm)) break;
			if (Math.sign(gm) === Math.sign(ga)) {
				a = m;
				ga = gm;
			} else {
				b = m;
			}
		}
		roots.push((a + b) / 2);
	}
	const solutions: Solution[] = [];
	for (const uValue of roots) {
		if (nonNegative && uValue < 0) continue;
		const xApprox = Math.pow(uValue, Number(L));
		const residual = Number(f({ [x]: xApprox }));
		if (!Number.isFinite(residual) || Math.abs(residual) > 1e-6 * Math.max(1, Math.abs(xApprox))) {
			continue;
		}
		if (solutions.some((t) => Math.abs((t.approximate ?? Number.NaN) - xApprox) < 1e-9)) continue;
		solutions.push({ value: numericNode(xApprox), approximate: xApprox, exact: false });
	}
	if (solutions.length === 0) return null;
	return {
		variable: x,
		status: 'approximate',
		solutions,
		equationType: inU.equationType,
		strategy: 'numeric',
		steps: [],
		conclusive: false
	};
}
