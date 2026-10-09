/**
 * Les solutions d'une équation, en LaTeX
 *
 * `.solve` n'écrivait ses solutions qu'en texte de terminal :
 * `x = 0 ou x = {1/2}sqrt(2) ou x = -{1/2}sqrt(2)`. L'atelier affiche la
 * réponse en écriture mathématique (décision de David, 2026-10-08) ; quand
 * les étapes pédagogiques ne savent pas faire (degré ≥ 3, transcendantes,
 * trigonométriques), c'est ce LaTeX, bâti sur les solutions STRUCTURÉES du
 * solveur, qu'il montre — jamais une relecture du texte.
 *
 * Forme : celle des étapes pédagogiques (`atelier/solve-steps.ts`) — une
 * solution `x = …`, plusieurs `S = \left\{ … \,;\, … \right\}` dans l'ordre
 * croissant, `S = \emptyset` sans solution ; plus `S = \mathbb{R}` et les
 * familles périodiques `x = a + 2k\pi, \; k \in \mathbb{Z}`.
 *
 * @module mathAST/cli/commands/solve-latex
 */

import type { MathNode } from '../../types';
import type { SolveResult, Solution } from '../../solve';
import type { PeriodicSolutionFamily } from '../../solve/types';
import { mergePeriodicFamilies } from '../../solve/periodic';
import { isSolverFailure } from '../../solve/types';
import type { Domain, IntervalSet } from '../../domain/types';
import {
	isEulerConstant,
	isFunction,
	isInfinity,
	isNumber,
	isPiConstant,
	isSuperscript,
	isVariable
} from '../../guards';
import { toLatex } from '../../latex-generator';
import { toCustom } from '../../custom-generator';
import { findNodes, mapNode } from '../../transforms';
import { getVariables } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { tidy } from '../../tidy';
import { tidyCriticalAbscissa } from '../../variations/critical-points';

/** Plus grand coefficient de période écrit (`1000k\pi`) : au-delà, la famille n’est pas écrite. */
const MAX_PERIOD_INTEGER = 1000;

/** Une valeur mise au propre (`{1/2}sqrt(2)` → `\dfrac{\sqrt{2}}{2}`, `exp(-1)` → `1/e`). */
function tidyValue(value: MathNode): MathNode {
	try {
		const abscissa = tidyCriticalAbscissa(value);
		return abscissa === value ? tidy(value) : abscissa;
	} catch {
		return value;
	}
}

// =============================================================================
// Solutions en ln : décimaux gardés, valeur approchée (décision de David,
// 2026-10-09 — seuils des suites géométriques, 1re / Tle)
// =============================================================================

/** Les logarithmes dont l'argument décimal tapé par l'élève est gardé. */
const LOGARITHMS = new Set(['ln', 'log']);

/** Nombre de décimales de la valeur approchée. */
const APPROXIMATION_PLACES = 2;

/** Écart toléré pour reconnaître le décimal d'origine sous sa fraction. */
const SAME_VALUE_TOLERANCE = 1e-12;

/** La base e (constante ou lettre `e`). */
function isEuler(node: MathNode): boolean {
	return isEulerConstant(node) || (isVariable(node) && node.name === 'e');
}

/**
 * Un ln (ou log) ou une exponentielle (`e^2`, `exp(…)`) quelque part dans la
 * valeur : elle ne se lit pas sans sa valeur approchée. Le nombre e seul
 * (`ln x = 1` → x = e) n'en reçoit pas.
 */
function hasLogarithm(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) =>
				(isFunction(n) && (LOGARITHMS.has(n.name) || n.name === 'exp')) ||
				(isSuperscript(n) && isEuler(n.base))
		).length > 0
	);
}

/** Une valeur numérique, ou `null`. */
function numericValue(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Remettre dans les ln les décimaux que `tidy` a changés en fractions :
 * `\ln(\frac{4}{5})` redevient `\ln(0,8)` quand l'élève a tapé 0.8.
 */
function keepLogDecimals(original: MathNode, tidied: MathNode): MathNode {
	const decimals = findNodes(
		original,
		(n) =>
			isFunction(n) &&
			LOGARITHMS.has(n.name) &&
			n.args.length === 1 &&
			isNumber(n.args[0]) &&
			n.args[0].value.includes('.')
	).flatMap((n) => (isFunction(n) ? [n.args[0]] : []));
	if (decimals.length === 0) return tidied;
	return mapNode(tidied, (node) => {
		if (!isFunction(node) || !LOGARITHMS.has(node.name) || node.args.length !== 1) return node;
		const [argument] = node.args;
		if (getVariables(argument).size > 0) return node;
		const value = numericValue(argument);
		const decimal = decimals.find(
			(d) =>
				value !== null && isNumber(d) && Math.abs(Number(d.value) - value) < SAME_VALUE_TOLERANCE
		);
		return decimal === undefined ? node : { ...node, args: [decimal] };
	});
}

/** Les décimaux d'une écriture LaTeX, à la française : `0.8` → `0{,}8`. */
function frenchDecimals(latex: string): string {
	return latex.replace(/(\d)\.(\d)/g, '$1{,}$2');
}

/** La valeur approchée à 2 décimales, point décimal (`10.32`). */
function rounded(value: number): string {
	const text = value.toFixed(APPROXIMATION_PLACES);
	return /^-0\.0+$/.test(text) ? text.slice(1) : text;
}

/**
 * Une valeur qui contient un ln, en LaTeX : décimaux gardés, à la française,
 * suivie de sa valeur approchée — `\dfrac{\ln(0{,}1)}{\ln(0{,}8)} \approx 10{,}32`.
 * `null` sans ln : l'appelant garde son écriture.
 */
export function logarithmicValueLatex(value: MathNode, approximate?: number): string | null {
	const tidied = tidyValue(value);
	if (!hasLogarithm(tidied)) return null;
	const written = frenchDecimals(toLatex(keepLogDecimals(value, tidied)));
	const approximation = approximate ?? numericValue(value);
	return approximation === null
		? written
		: `${written} \\approx ${frenchDecimals(rounded(approximation))}`;
}

/**
 * La même valeur en texte, pour dire la même chose que le LaTeX :
 * `ln(0.1)/ln(0.8) ≈ 10.32`. `null` sans ln.
 */
export function logarithmicValueText(value: MathNode, approximate?: number): string | null {
	if (!hasLogarithm(tidyValue(value))) return null;
	const approximation = approximate ?? numericValue(value);
	// Mis au propre comme le LaTeX : ln(3)/2, pas {1/2}ln(3)
	const written = toCustom(keepLogDecimals(value, tidyValue(value)));
	return approximation === null ? written : `${written} ≈ ${rounded(approximation)}`;
}

/**
 * Un seuil : l'ensemble est UN intervalle infini d'un côté, sans point exclu,
 * dont la borne finie contient un ln — `]\frac{\ln 0,1}{\ln 0,8} ; +∞[`.
 * Il s'écrit alors `n > …`, valeur approchée comprise ; sinon `null`.
 */
function thresholdOf(
	domain: Domain
): { bound: MathNode; latexSign: string; textSign: string } | null {
	if (domain.kind !== 'interval_set') return null;
	if (domain.intervals.length !== 1 || domain.excludedPoints.length > 0) return null;
	const [{ lower, upper }] = domain.intervals;
	const lowerInfinite = isInfinity(lower.value);
	const upperInfinite = isInfinity(upper.value);
	if (lowerInfinite === upperInfinite) return null;
	const end = lowerInfinite ? upper : lower;
	if (!hasLogarithm(tidyValue(end.value))) return null;
	const open = end.type === 'open';
	if (lowerInfinite) {
		return { bound: end.value, latexSign: open ? '<' : '\\leq', textSign: open ? '<' : '≤' };
	}
	return { bound: end.value, latexSign: open ? '>' : '\\geq', textSign: open ? '>' : '≥' };
}

/** Un seuil en LaTeX (`n > \dfrac{…}{…} \approx 10{,}32`), ou `null`. */
function thresholdLatex(domain: Domain, variable: string): string | null {
	const threshold = thresholdOf(domain);
	if (threshold === null) return null;
	const value = logarithmicValueLatex(threshold.bound);
	return value === null ? null : `${variable} ${threshold.latexSign} ${value}`;
}

/** Le même seuil en texte (`n > ln(0.1)/ln(0.8) ≈ 10.32`), ou `null`. */
export function inequalityThresholdText(domain: Domain, variable: string): string | null {
	const threshold = thresholdOf(domain);
	if (threshold === null) return null;
	const value = logarithmicValueText(threshold.bound);
	return value === null ? null : `${variable} ${threshold.textSign} ${value}`;
}

/** Plus grand dénominateur reconnu dans une période (`\dfrac{k\pi}{12}`). */
const MAX_PERIOD_DENOMINATOR = 24;

/** Écart toléré pour reconnaître une période rationnelle (en π ou non). */
const PERIOD_TOLERANCE = 1e-9;

/** Le terme `k·T` d'une période, en LaTeX et en texte. */
interface PeriodTerm {
	readonly latex: string;
	readonly text: string;
}

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

/**
 * Le terme `k·T` d'une période T = (p/q)·π — `k\pi`, `6k\pi`, `\dfrac{k\pi}{3}` —
 * ou T = p/q sans π (`sin(πx) = 0` : période 1 → `k`). `null` si T n'a pas
 * cette forme : on n'écrit pas une famille qu'on ne sait pas dire.
 *
 * Lue sur sa VALEUR, le nœud étant exact (2π/(1/3) = 6π, voir
 * `solvers/transcendental.ts`) : 6π, 2·3π ou 18π/3 s'écrivent tous `6k\pi`.
 */
function periodTerm(period: MathNode): PeriodTerm | null {
	const value = numericValue(period);
	if (value === null || value <= 0) return null;
	const withPi = findNodes(period, isPiConstant).length > 0;
	const ratio = withPi ? value / Math.PI : value;
	for (let q = 1; q <= MAX_PERIOD_DENOMINATOR; q++) {
		const p = Math.round(ratio * q);
		if (Math.abs(ratio * q - p) > PERIOD_TOLERANCE * q) continue;
		if (p < 1 || p > MAX_PERIOD_INTEGER) return null;
		const g = gcd(p, q);
		const [a, b] = [p / g, q / g];
		const pi = withPi ? '\\pi' : '';
		const top = `${a === 1 ? '' : a}k${pi}`;
		return {
			latex: b === 1 ? top : `\\dfrac{${top}}{${b}}`,
			// Écrit comme les solutions (`\pi/4`, `{5\pi}/6`) : `k\pi/2`, `{2k\pi}/3`
			text: b === 1 ? top : a === 1 ? `${top}/${b}` : `{${top}}/${b}`
		};
	}
	return null;
}

/**
 * La famille écrite au plus court : `{0 ; 3π} + 6kπ` devient `3kπ`, `{0 ; π} +
 * 2kπ` devient `kπ` (réduction de `mergePeriodicFamilies`, qui rend la MÊME
 * famille) ; `null` de la réunion → la famille d'origine.
 */
function shortestFamily(family: PeriodicSolutionFamily): PeriodicSolutionFamily {
	try {
		return mergePeriodicFamilies([family]) ?? family;
	} catch {
		return family;
	}
}

/** Les solutions rangées dans l'ordre croissant, quand toutes ont une valeur approchée. */
function sorted(solutions: readonly Solution[]): readonly Solution[] {
	const allNumeric = solutions.every(
		(s) => s.approximate !== undefined && Number.isFinite(s.approximate)
	);
	if (!allNumeric) return solutions;
	return [...solutions].sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));
}

/** Les membres d'UNE famille (`x = a + 2kπ`), en LaTeX et en texte — ou `null`. */
function familyMembers(
	variable: string,
	periodic: PeriodicSolutionFamily
): { readonly latex: readonly string[]; readonly text: readonly string[] } | null {
	const family = shortestFamily(periodic);
	if (family.baseSolutions.length === 0) return null;
	const term = periodTerm(family.period);
	if (term === null) return null;
	const bases = sorted(family.baseSolutions).map((solution) => {
		const base = tidyValue(solution.value);
		return { base, isZero: isNumber(base) && base.value === '0' };
	});
	const member = (written: string, isZero: boolean, k: string) =>
		`${variable} = ${isZero ? k : `${written} + ${k}`}`;
	return {
		latex: bases.map(({ base, isZero }) => member(toLatex(base), isZero, term.latex)),
		text: bases.map(({ base, isZero }) => member(toCustom(base), isZero, term.text))
	};
}

/**
 * Les membres d'une solution périodique, en LaTeX et en texte — ou `null`.
 * L'écriture du manuel d'abord (`displayFamilies` : une période par famille,
 * `sin 2x = sin x` → 2kπ ou π/3 + 2kπ/3), sinon la famille réunie.
 */
function periodicMembers(
	result: SolveResult
): { readonly latex: readonly string[]; readonly text: readonly string[] } | null {
	if (result.periodicSolutions === undefined) return null;
	if (result.displayFamilies !== undefined && result.displayFamilies.length > 0) {
		const parts = result.displayFamilies.map((f) => familyMembers(result.variable, f));
		if (parts.every((p) => p !== null)) {
			return {
				latex: parts.flatMap((p) => p?.latex ?? []),
				text: parts.flatMap((p) => p?.text ?? [])
			};
		}
	}
	return familyMembers(result.variable, result.periodicSolutions);
}

/** La famille périodique, `x = a + 2k\pi \text{ ou } … , \; k \in \mathbb{Z}` — ou `null`. */
function periodicLatex(result: SolveResult): string | null {
	const members = periodicMembers(result);
	if (members === null) return null;
	return `${members.latex.join(' \\text{ ou } ')}, \\; k \\in \\mathbb{Z}`;
}

/**
 * La même famille en texte, période comprise : `x = 3k\pi, k ∈ ℤ`. Le texte
 * disait « x = 0 ou x = 3\pi » — deux solutions pour une infinité
 * (2026-10-09). `null` sans famille, ou si elle ne s'écrit pas.
 */
export function periodicSolutionsText(result: SolveResult): string | null {
	const members = periodicMembers(result);
	if (members === null) return null;
	return `${members.text.join(' ou ')}, k ∈ ℤ`;
}

/**
 * Le LaTeX des solutions d'un résultat du solveur — ou `null` quand il n'y a
 * rien de sûr à écrire (échec du solveur, statut inconnu) : l'appelant garde
 * alors le texte, qui EXPLIQUE l'échec.
 */
export function solutionsLatex(result: SolveResult): string | null {
	switch (result.status) {
		case 'unique':
		case 'multiple': {
			if (result.solutions.length === 0) return null;
			const periodic = periodicLatex(result);
			if (periodic !== null) return periodic;
			// Une famille qu'on ne sait pas écrire : ne pas la faire passer pour
			// un nombre fini de solutions
			if (result.periodicSolutions !== undefined) return null;
			const values = sorted(result.solutions).map((s) => toLatex(tidyValue(s.value)));
			if (values.length === 1) {
				const [only] = result.solutions;
				const logarithmic = logarithmicValueLatex(only.value, only.approximate);
				return `${result.variable} = ${logarithmic ?? values[0]}`;
			}
			return `S = \\left\\{ ${values.join(' \\,;\\, ')} \\right\\}`;
		}
		case 'infinite':
			// Une identité sur un domaine (`x²/x = x`) : tout le domaine, pas ℝ
			return result.domain === undefined
				? 'S = \\mathbb{R}'
				: inequalitySolutionLatex(result.domain);
		case 'no-solution':
			return isSolverFailure(result) ? null : 'S = \\emptyset';
		case 'no-real-solution':
			return 'S = \\emptyset';
		default:
			return null;
	}
}

/** Une borne d'intervalle : `+\infty`, `-\infty`, sinon la valeur mise au propre. */
function boundLatex(value: MathNode): string {
	if (isInfinity(value)) return value.sign === 'negative' ? '-\\infty' : '+\\infty';
	// Décimaux gardés dans les ln (`\ln(0{,}1)`), comme un seuil
	const tidied = tidyValue(value);
	return hasLogarithm(tidied)
		? frenchDecimals(toLatex(keepLogDecimals(value, tidied)))
		: toLatex(tidied);
}

/**
 * Les bornes FINIES qui contiennent un ln, avec leur valeur approchée — dites
 * après un ensemble borné : `… \text{ avec } \dfrac{\ln(0{,}1)}{\ln(0{,}8)}
 * \approx 10{,}32`. Une borne qui revient n'est dite qu'une fois.
 */
export function logarithmicBounds(domain: Domain): { latex: string; text: string }[] {
	if (domain.kind !== 'interval_set') return [];
	const bounds: { latex: string; text: string }[] = [];
	for (const { lower, upper } of domain.intervals) {
		for (const { value } of [lower, upper]) {
			if (isInfinity(value)) continue;
			const latex = logarithmicValueLatex(value);
			const text = logarithmicValueText(value);
			if (latex === null || text === null || bounds.some((b) => b.latex === latex)) continue;
			bounds.push({ latex, text });
		}
	}
	return bounds;
}

/**
 * Les points qu'il manque à ℝ, quand l'ensemble EST ℝ privé d'un nombre fini
 * de points — `]-∞ ; 0[ ∪ ]0 ; +∞[` → [0], `]-∞ ; +∞[` → [] —, sinon `null`.
 *
 * ⚠️ Le solveur d'inéquations rend ℝ sous la forme d'un intervalle
 * `]-∞ ; +∞[` : `.résoudre x+1>x` affichait `S = ]-\infty ; +\infty[`, et
 * `x² > 0` `]-∞ ; 0[ ∪ ]0 ; +∞[` là où `.domaine 1/x` écrit `ℝ \ {0}`
 * (2026-10-08).
 */
function realLineExclusions(domain: IntervalSet): MathNode[] | null {
	const { intervals } = domain;
	const first = intervals[0];
	const last = intervals[intervals.length - 1];
	if (first === undefined || last === undefined) return null;
	if (!isInfinity(first.lower.value) || first.lower.value.sign !== 'negative') return null;
	if (!isInfinity(last.upper.value) || last.upper.value.sign === 'negative') return null;
	const gaps: MathNode[] = [];
	for (let i = 0; i + 1 < intervals.length; i++) {
		const upper = intervals[i].upper;
		const lower = intervals[i + 1].lower;
		// Deux intervalles qui se touchent en un point exclu des deux côtés
		if (upper.type !== 'open' || lower.type !== 'open') return null;
		if (toLatex(upper.value) !== toLatex(lower.value)) return null;
		gaps.push(upper.value);
	}
	return [...gaps, ...domain.excludedPoints.map((p) => p.value)];
}

/**
 * Le même ensemble, ℝ privé de points écrit comme tel : un `]-∞ ; +∞[` dont
 * les points manquants sont des `excludedPoints` — la forme que les
 * formateurs de domaine écrivent `ℝ` ou `ℝ \ {0}`, comme `.domaine`.
 * Tout autre ensemble est rendu inchangé.
 */
export function withRealLineWritten(domain: Domain): Domain {
	if (domain.kind !== 'interval_set') return domain;
	const missing = realLineExclusions(domain);
	const first = domain.intervals[0];
	const last = domain.intervals[domain.intervals.length - 1];
	if (missing === null || first === undefined || last === undefined) return domain;
	return {
		kind: 'interval_set',
		intervals: [{ kind: 'interval', lower: first.lower, upper: last.upper }],
		excludedPoints: missing.map((value) => ({ kind: 'excluded_point', value }))
	};
}

/**
 * L'ensemble des solutions d'une inéquation, en LaTeX, à la française :
 * `S = [0 ; 4[`, `S = ]-\infty ; -2] \cup [2 ; +\infty[`, `S = \emptyset`,
 * `S = \mathbb{R}` — la forme des conclusions de `pedagogical-solve`. Les
 * points exclus s'écrivent `\setminus \left\{ … \right\}`. `null` pour un
 * domaine qui n'est pas une réunion d'intervalles (condition, périodique).
 */
export function inequalitySolutionLatex(domain: Domain, variable?: string): string | null {
	const threshold = variable === undefined ? null : thresholdLatex(domain, variable);
	if (threshold !== null) return threshold;
	switch (domain.kind) {
		case 'empty':
			return 'S = \\emptyset';
		case 'universal':
			return 'S = \\mathbb{R}';
		case 'interval_set': {
			if (domain.intervals.length === 0) return 'S = \\emptyset';
			const whole = realLineExclusions(domain);
			if (whole !== null) {
				if (whole.length === 0) return 'S = \\mathbb{R}';
				const points = whole.map((p) => toLatex(tidyValue(p)));
				return `S = \\mathbb{R} \\setminus \\left\\{ ${points.join(' \\,;\\, ')} \\right\\}`;
			}
			const intervals = domain.intervals.map((i) => {
				const open = i.lower.type === 'open' ? ']' : '[';
				const close = i.upper.type === 'open' ? '[' : ']';
				const lower = boundLatex(i.lower.value);
				const upper = boundLatex(i.upper.value);
				// [a ; a] est le singleton {a} (√x ≤ x : {0} ∪ [1 ; +∞[)
				if (open === '[' && close === ']' && lower === upper) return `\\{${lower}\\}`;
				return `${open}${lower} ; ${upper}${close}`;
			});
			const excluded = domain.excludedPoints.map((p) => toLatex(tidyValue(p.value)));
			const minus =
				excluded.length === 0
					? ''
					: ` \\setminus \\left\\{ ${excluded.join(' \\,;\\, ')} \\right\\}`;
			const set = intervals.join(' \\cup ');
			return `S = ${excluded.length > 0 && intervals.length > 1 ? `\\left(${set}\\right)` : set}${minus}`;
		}
		default:
			return null;
	}
}
