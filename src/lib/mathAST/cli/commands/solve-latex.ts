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
import { isSolverFailure } from '../../solve/types';
import type { Domain, IntervalSet } from '../../domain/types';
import { isDivision, isInfinity, isMultiplication, isNumber, isPiConstant } from '../../guards';
import { toLatex } from '../../latex-generator';
import { tidy } from '../../tidy';
import { tidyCriticalAbscissa } from '../../variations/critical-points';

/** Au-delà, un coefficient de période trahit une dérive flottante (20000000000000000/3333333333333333). */
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

/** Un entier positif raisonnable, sinon `null`. */
function smallInteger(node: MathNode): number | null {
	if (!isNumber(node) || !/^\d+$/.test(node.value)) return null;
	const n = Number(node.value);
	return n >= 1 && n <= MAX_PERIOD_INTEGER ? n : null;
}

/**
 * Le terme `k·T` d'une période T = (a/b)·π : `k\pi`, `2k\pi`, `\dfrac{k\pi}{2}`,
 * `\dfrac{2k\pi}{3}` — ou `null` si T n'a pas cette forme.
 */
function periodTermLatex(period: MathNode): string | null {
	let numerator = 1;
	let denominator = 1;
	if (!isPiConstant(period)) {
		if (!isMultiplication(period) || !isPiConstant(period.right)) return null;
		const coefficient = period.left;
		if (isDivision(coefficient)) {
			const a = smallInteger(coefficient.numerator);
			const b = smallInteger(coefficient.denominator);
			if (a === null || b === null) return null;
			numerator = a;
			denominator = b;
		} else {
			const a = smallInteger(coefficient);
			if (a === null) return null;
			numerator = a;
		}
	}
	const top = `${numerator === 1 ? '' : numerator}k\\pi`;
	return denominator === 1 ? top : `\\dfrac{${top}}{${denominator}}`;
}

/** Les solutions rangées dans l'ordre croissant, quand toutes ont une valeur approchée. */
function sorted(solutions: readonly Solution[]): readonly Solution[] {
	const allNumeric = solutions.every(
		(s) => s.approximate !== undefined && Number.isFinite(s.approximate)
	);
	if (!allNumeric) return solutions;
	return [...solutions].sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));
}

/** La famille périodique, `x = a + 2k\pi \text{ ou } … , \; k \in \mathbb{Z}` — ou `null`. */
function periodicLatex(result: SolveResult): string | null {
	const family = result.periodicSolutions;
	if (family === undefined || family.baseSolutions.length === 0) return null;
	const term = periodTermLatex(family.period);
	if (term === null) return null;
	const members = sorted(family.baseSolutions).map((solution) => {
		const base = tidyValue(solution.value);
		const isZero = isNumber(base) && base.value === '0';
		return `${result.variable} = ${isZero ? term : `${toLatex(base)} + ${term}`}`;
	});
	return `${members.join(' \\text{ ou } ')}, \\; k \\in \\mathbb{Z}`;
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
			if (values.length === 1) return `${result.variable} = ${values[0]}`;
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
	return toLatex(tidyValue(value));
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
export function inequalitySolutionLatex(domain: Domain): string | null {
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
