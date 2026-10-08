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
import { isDivision, isMultiplication, isNumber, isPiConstant } from '../../guards';
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
			return 'S = \\mathbb{R}';
		case 'no-solution':
			return isSolverFailure(result) ? null : 'S = \\emptyset';
		case 'no-real-solution':
			return 'S = \\emptyset';
		default:
			return null;
	}
}
