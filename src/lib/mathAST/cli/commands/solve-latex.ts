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
 * Forme : l'ensemble des solutions, toujours (chantier `registre-reference`,
 * Q2) — `S = \left\{ … \,;\, … \right\}` dans l'ordre croissant, une solution
 * comprise (`S = \left\{ 3 \right\}`), `S = \emptyset` sans solution,
 * `S = \mathbb{R}`, et les familles périodiques
 * `S = \left\{ a + 2k\pi \,;\, b + 2k\pi ,\; k \in \mathbb{Z} \right\}` (David,
 * 2026-11-03). La valeur approchée d'une solution en ln va au bouton ≈ ; seul
 * le seuil d'une suite la garde (`n > … \approx 10{,}32`, David, 2026-11-03).
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
	isSuperscript
} from '../../guards';
import { toLatex } from '../../latex-generator';
import { toCustom } from '../../custom-generator';
import { findNodes } from '../../transforms';
import { exactValueToShow } from '../../eval/exact-value';
import {
	approximateDigitsOf,
	approximateSolutionsLatex,
	isWrittenNumber,
	type ApproximateDigits
} from '../approximation';
import { computeNumericValue } from '../../eval/numeric-value';

// =============================================================================
// Types
// =============================================================================

/**
 * L'écriture des valeurs d'une réponse, d'après la ligne tapée (registre-reference,
 * PR 2c, David, 2026-11-09) : `decimal`, un décimal tapé garde les solutions à
 * écriture décimale finie en décimal (Q46 : `x + 0,5 = 2` → `S = \{1,5\}`) ;
 * `angles`, un angle tapé en degrés reste en degrés (`anglesAsTyped`).
 */
export interface SolutionWriting {
	readonly decimal: boolean;
	readonly angles: (node: MathNode) => MathNode;
}

/** Sans décimal ni degré tapé : les valeurs telles que le solveur les rend. */
export const PLAIN_WRITING: SolutionWriting = { decimal: false, angles: (node) => node };

/** Plus grand coefficient de période écrit (`1000k\pi`) : au-delà, la famille n’est pas écrite. */
const MAX_PERIOD_INTEGER = 1000;

// =============================================================================
// Solutions en ln : décimaux gardés, valeur approchée (décision de David,
// 2026-10-09 — seuils des suites géométriques, 1re / Tle). Depuis le
// 2026-11-03 (registre-reference), seul le SEUIL d'une inéquation la garde
// (`n > … \approx 10{,}32`) ; une solution d'équation la laisse au bouton ≈.
// =============================================================================

/** Les logarithmes : une valeur qui en contient se lit avec sa valeur approchée. */
const LOGARITHMS = new Set(['ln', 'log']);

/** Nombre de décimales de la valeur approchée. */
const APPROXIMATION_PLACES = 2;

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
				(isSuperscript(n) && isEulerConstant(n.base))
		).length > 0
	);
}

/** Les décimaux d'une écriture LaTeX, à la française : `0.8` → `0{,}8`. */
function frenchDecimals(latex: string): string {
	return latex.replace(/(\d)\.(\d)/g, '$1{,}$2');
}

/**
 * Une valeur de la réponse en LaTeX : angles et registre décimal de la ligne
 * tapée, décimaux à la française (`1{,}5`).
 */
export function solutionValueLatex(value: MathNode, writing: SolutionWriting): string {
	const shown = writing.angles(value);
	return frenchDecimals(toLatex(exactValueToShow(shown, { decimal: writing.decimal })));
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
	const tidied = exactValueToShow(value);
	if (!hasLogarithm(tidied)) return null;
	const written = frenchDecimals(toLatex(tidied));
	const approximation = approximate ?? computeNumericValue(value);
	return approximation === null
		? written
		: `${written} \\approx ${frenchDecimals(rounded(approximation))}`;
}

/**
 * Une valeur qui contient un ln, en LaTeX, SANS sa valeur approchée (élément
 * d'un ensemble de solutions : le bouton ≈ la donne) — `\ln\left( 0{,}5 \right)`.
 * `null` sans ln.
 */
export function logarithmicExactLatex(value: MathNode): string | null {
	const tidied = exactValueToShow(value);
	return hasLogarithm(tidied) ? frenchDecimals(toLatex(tidied)) : null;
}

/**
 * La même valeur en texte, pour dire la même chose que le LaTeX :
 * `ln(0.1)/ln(0.8) ≈ 10.32`. `null` sans ln.
 */
export function logarithmicValueText(value: MathNode, approximate?: number): string | null {
	// Mis au propre comme le LaTeX : ln(3)/2, pas {1/2}ln(3)
	const tidied = exactValueToShow(value);
	if (!hasLogarithm(tidied)) return null;
	const approximation = approximate ?? computeNumericValue(value);
	const written = toCustom(tidied);
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
	if (!hasLogarithm(exactValueToShow(end.value))) return null;
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
	const value = computeNumericValue(period);
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

/**
 * Les membres d'UNE famille, éléments de S, en LaTeX (`a + 2k\pi`) et en
 * texte (`a + 2kπ`) — ou `null`.
 */
function familyMembers(
	periodic: PeriodicSolutionFamily,
	writing: SolutionWriting
): { readonly latex: readonly string[]; readonly text: readonly string[] } | null {
	const family = shortestFamily(periodic);
	if (family.baseSolutions.length === 0) return null;
	const term = periodTerm(family.period);
	if (term === null) return null;
	const bases = sorted(family.baseSolutions).map((solution) => {
		const base = exactValueToShow(writing.angles(solution.value));
		return { base, isZero: isNumber(base) && base.value === '0' };
	});
	const member = (written: string, isZero: boolean, k: string) =>
		isZero ? k : `${written} + ${k}`;
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
	result: SolveResult,
	writing: SolutionWriting
): { readonly latex: readonly string[]; readonly text: readonly string[] } | null {
	if (result.periodicSolutions === undefined) return null;
	if (result.displayFamilies !== undefined && result.displayFamilies.length > 0) {
		const parts = result.displayFamilies.map((f) => familyMembers(f, writing));
		if (parts.every((p) => p !== null)) {
			return {
				latex: parts.flatMap((p) => p?.latex ?? []),
				text: parts.flatMap((p) => p?.text ?? [])
			};
		}
	}
	return familyMembers(result.periodicSolutions, writing);
}

/**
 * La famille périodique, `S = \left\{ a + 2k\pi \,;\, … ,\; k \in \mathbb{Z} \right\}`
 * — ou `null`.
 */
function periodicLatex(
	result: SolveResult,
	writing: SolutionWriting = PLAIN_WRITING
): string | null {
	const members = periodicMembers(result, writing);
	if (members === null) return null;
	return `S = \\left\\{ ${members.latex.join(' \\,;\\, ')} ,\\; k \\in \\mathbb{Z} \\right\\}`;
}

/**
 * La même famille en texte, période comprise : `S = {3k\pi, k ∈ ℤ}`. Le texte
 * disait « x = 0 ou x = 3\pi » — deux solutions pour une infinité
 * (2026-10-09) ; l'ensemble, comme le LaTeX, depuis la PR 2c (Q2).
 * `null` sans famille, ou si elle ne s'écrit pas.
 */
export function periodicSolutionsText(
	result: SolveResult,
	writing: SolutionWriting = PLAIN_WRITING
): string | null {
	const members = periodicMembers(result, writing);
	if (members === null) return null;
	return `S = {${members.text.join(' ; ')}, k ∈ ℤ}`;
}

/**
 * Un ensemble aux bornes écrites comme la réponse (angles, registre décimal) :
 * le texte d'une inéquation dit ce que dit son LaTeX (revue de la PR 2c).
 */
export function domainWritten(domain: Domain, writing: SolutionWriting): Domain {
	if (domain.kind !== 'interval_set') return domain;
	const value = (node: MathNode) =>
		isInfinity(node) ? node : exactValueToShow(writing.angles(node), { decimal: writing.decimal });
	return {
		...domain,
		intervals: domain.intervals.map((i) => ({
			...i,
			lower: { ...i.lower, value: value(i.lower.value) },
			upper: { ...i.upper, value: value(i.upper.value) }
		})),
		excludedPoints: domain.excludedPoints.map((p) => ({ ...p, value: value(p.value) }))
	};
}

/**
 * L'ensemble des solutions en texte du terminal, dans l'ordre et l'écriture
 * du LaTeX (Q2, texte compris — David, 2026-11-04 ; PR 2c) : `S = {3}`,
 * `S = {-2 ; 2}`, `S = {ln(3)}` (sa valeur approchée va au mode décimal),
 * `S = {1.5}` pour un décimal tapé. Point décimal : la syntaxe du terminal.
 */
export function solutionsSetText(
	solutions: readonly Solution[],
	writing: SolutionWriting = PLAIN_WRITING
): string {
	const ordered = sorted(solutions);
	const common = commonCondition(ordered);
	const values = ordered.map(
		(s) =>
			toCustom(exactValueToShow(writing.angles(s.value), { decimal: writing.decimal })) +
			(common === undefined && s.condition ? ` si ${toCustom(s.condition)}` : '')
	);
	return `S = {${values.join(' ; ')}}` + (common ? `, si ${toCustom(common)}` : '');
}

/**
 * Les mêmes solutions en valeurs approchées, pour le mode décimal du
 * terminal : `S ≈ {1.0986}`, `S = {0.5}` (règle du bouton ≈ : 4 décimales,
 * « = » quand l'écriture décimale est exacte). `null` quand il n'y a rien à
 * montrer de plus (solutions déjà écrites en nombres, paramètre).
 */
export function approximateSolutionsText(solutions: readonly Solution[]): string | null {
	const values = sorted(solutions).map((s) => exactValueToShow(s.value));
	if (values.every(isWrittenNumber)) return null;
	const approximations: ApproximateDigits[] = [];
	for (const value of values) {
		const approximation = approximateDigitsOf(value);
		if (approximation === null) return null;
		approximations.push(approximation);
	}
	const relation = approximations.every((a) => a.exact) ? '=' : '≈';
	const written = approximations.map(({ digits, exponent }) =>
		exponent === null ? digits : `${digits} × 10^${exponent}`
	);
	return `S ${relation} {${written.join(' ; ')}}`;
}

/**
 * La condition sur les paramètres que portent TOUTES les solutions (x² = y :
 * y ≥ 0 sur les deux), écrite une seule fois ; `undefined` si aucune ou si
 * elles diffèrent (chaque solution porte alors la sienne).
 */
export function commonCondition(solutions: readonly Solution[]): MathNode | undefined {
	const [first] = solutions;
	if (first?.condition === undefined) return undefined;
	const latex = toLatex(first.condition);
	return solutions.every((s) => s.condition !== undefined && toLatex(s.condition) === latex)
		? first.condition
		: undefined;
}

/**
 * Le LaTeX des solutions d'un résultat du solveur — ou `null` quand il n'y a
 * rien de sûr à écrire (échec du solveur, statut inconnu) : l'appelant garde
 * alors le texte, qui EXPLIQUE l'échec.
 */
export function solutionsLatex(
	result: SolveResult,
	writing: SolutionWriting = PLAIN_WRITING
): string | null {
	switch (result.status) {
		case 'unique':
		case 'multiple': {
			if (result.solutions.length === 0) return null;
			const periodic = periodicLatex(result, writing);
			if (periodic !== null) return periodic;
			// Une famille qu'on ne sait pas écrire : ne pas la faire passer pour
			// un nombre fini de solutions
			if (result.periodicSolutions !== undefined) return null;
			const ordered = sorted(result.solutions);
			const common = commonCondition(ordered);
			// Une solution en ln garde ses décimaux (`\ln(0{,}5)`, S1), qu'elle soit
			// seule ou non (revue de la PR 2b)
			const written = (value: MathNode) =>
				logarithmicExactLatex(value) ?? solutionValueLatex(value, writing);
			const values = ordered.map(
				(s) =>
					written(s.value) +
					(common === undefined && s.condition ? ` \\text{ si } ${toLatex(s.condition)}` : '')
			);
			const suffix = common ? ` \\quad \\text{si } ${toLatex(common)}` : '';
			return `S = \\left\\{ ${values.join(' \\,;\\, ')} \\right\\}${suffix}`;
		}
		case 'infinite':
			// Une identité sur un domaine (`x²/x = x`) : tout le domaine, pas ℝ
			return result.domain === undefined
				? 'S = \\mathbb{R}'
				: inequalitySolutionLatex(result.domain, undefined, writing);
		case 'no-solution':
			return isSolverFailure(result) ? null : 'S = \\emptyset';
		case 'no-real-solution':
			return 'S = \\emptyset';
		default:
			return null;
	}
}

/**
 * Les solutions en valeurs approchées, pour le bouton ≈ de l'atelier :
 * `S \approx \left\{ -1.4142 \,;\, 1.4142 \right\}`, `S = \left\{ 0.5 \right\}` (règle de
 * `approximation.ts` : 4 décimales, « = » quand l'écriture décimale est exacte).
 *
 * `null` quand il n'y a rien à montrer : solutions déjà entières ou décimales,
 * famille périodique, paramètre, ensemble infini, seuil qui donne déjà sa
 * valeur approchée (`n > \dfrac{\ln…}{\ln…} \approx 10{,}32`).
 */
export function solutionsApproximationLatex(result: SolveResult): string | null {
	if (result.status !== 'unique' && result.status !== 'multiple') return null;
	if (result.solutions.length === 0 || result.periodicSolutions !== undefined) return null;
	if (periodicLatex(result) !== null) return null;

	// Dans l'ordre et la forme de `solutionsLatex` : la ligne qu'elles accompagnent
	const values = sorted(result.solutions).map((s) => exactValueToShow(s.value));
	return approximateSolutionsLatex(values);
}

/** Une borne d'intervalle : `+\infty`, `-\infty`, sinon la valeur mise au propre. */
function boundLatex(value: MathNode, writing: SolutionWriting): string {
	if (isInfinity(value)) return value.sign === 'negative' ? '-\\infty' : '+\\infty';
	// Décimaux gardés dans les ln (`\ln(0{,}1)`, S1), à la française comme un seuil
	const tidied = exactValueToShow(value);
	return hasLogarithm(tidied)
		? frenchDecimals(toLatex(tidied))
		: solutionValueLatex(value, writing);
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
export function inequalitySolutionLatex(
	domain: Domain,
	variable?: string,
	writing: SolutionWriting = PLAIN_WRITING
): string | null {
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
				const points = whole.map((p) => solutionValueLatex(p, writing));
				return `S = \\mathbb{R} \\setminus \\left\\{ ${points.join(' \\,;\\, ')} \\right\\}`;
			}
			const intervals = domain.intervals.map((i) => {
				const open = i.lower.type === 'open' ? ']' : '[';
				const close = i.upper.type === 'open' ? '[' : ']';
				const lower = boundLatex(i.lower.value, writing);
				const upper = boundLatex(i.upper.value, writing);
				// [a ; a] est le singleton {a} (√x ≤ x : {0} ∪ [1 ; +∞[)
				if (open === '[' && close === ']' && lower === upper) return `\\{${lower}\\}`;
				return `${open}${lower} ; ${upper}${close}`;
			});
			const excluded = domain.excludedPoints.map((p) => solutionValueLatex(p.value, writing));
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
