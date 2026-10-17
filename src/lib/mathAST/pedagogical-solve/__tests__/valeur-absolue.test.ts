/**
 * Équations avec valeur absolue : la rédaction que voit l'élève (2026-10-13)
 *
 * Rédaction validée par David :
 * - |u| = c ⇔ u = c ou u = −c (c > 0), puis chaque équation du premier degré ;
 * - |u| = 0 ⇔ u = 0 ;
 * - c < 0 : une valeur absolue est positive ou nulle, donc pas de solution ;
 * - la valeur absolue est d'abord isolée (`3|x − 1| = 6`, `5 − |x| = 2`) ;
 * - |u| = |v| ⇔ u = v ou u = −v ;
 * - les deux résolutions sont À PLAT, toutes visibles (pas de sous-étapes).
 *
 * On asserte le RENDU (titre, explication, LaTeX), pas le nombre d'étapes.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { SchoolLevel } from '../../common/step-renderer-base';
import {
	AbsoluteValueEquationRenderer,
	generateEquationSteps,
	generateLinearEquationSteps,
	LinearEquationRenderer
} from '..';

// =============================================================================
// Fonctions
// =============================================================================

function rendered(latex: string, level: SchoolLevel = 'lycee'): readonly RenderedStep[] {
	const steps = generateEquationSteps(parseLatex(latex) as RelationNode, { level });
	return new AbsoluteValueEquationRenderer().renderAll(steps, {
		schoolLevel: level,
		verbosity: 'detailed'
	});
}

/** La résolution de `latex` SEULE, sans son titre ni son « S = … ». */
function standaloneLinear(latex: string, level: 'college' | 'lycee'): string[] {
	const steps = generateLinearEquationSteps(parseLatex(latex) as RelationNode, { level });
	return lines(
		new LinearEquationRenderer()
			.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
			.filter((s) => s.rule !== 'identify-equation' && s.rule !== 'read-solution')
	);
}

/** Titre et LaTeX de chaque étape, dans l'ordre : ce que l'élève lit. */
function lines(steps: readonly RenderedStep[]): string[] {
	return steps.map((s) => `${s.title} ‖ ${s.expressionLatex ?? ''}`);
}

// =============================================================================
// Tests
// =============================================================================

describe('|u| = c, c > 0', () => {
	it('|2x+1| = 5 : deux équations du premier degré, à plat, puis S', () => {
		const steps = rendered('\\left|2x+1\\right|=5');

		expect(lines(steps)).toEqual([
			'Équation avec une valeur absolue ‖ \\left| 2x + 1 \\right| = 5',
			'Deux nombres ont pour valeur absolue $5$ : $5$ et $-5$ ‖ \\left| 2x + 1 \\right| = 5 \\;\\Longleftrightarrow\\; 2x + 1 = 5 \\;\\text{ou}\\; 2x + 1 = -5',
			'On résout $2x + 1 = 5$ ‖ 2x + 1 = 5',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   2x &= 5 \\textcolor{blue}{- 1} \\\\   2x &= 4 \\end{aligned}',
			'On termine en simplifiant le coefficient de x ‖ x = 2',
			'On résout $2x + 1 = -5$ ‖ 2x + 1 = -5',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   2x &= -5 \\textcolor{blue}{- 1} \\\\   2x &= -6 \\end{aligned}',
			'On termine en simplifiant le coefficient de x ‖ x = -3',
			'On réunit les solutions des deux équations ‖ S = \\left\\{ -3 \\,;\\, 2 \\right\\}'
		]);
		expect(steps[1].explanation).toBe(
			'$5>0$, donc $\\left| 2x + 1 \\right|=5$ équivaut à $2x + 1=5$ ou $2x + 1=-5$.'
		);
		// Aucune sous-étape : tout est visible
		expect(steps.every((s) => s.subSteps === undefined)).toBe(true);
	});

	it('|x| = π : le signe d’une constante non entière se lit, branches déjà résolues', () => {
		expect(lines(rendered('\\left|x\\right|=\\pi'))).toEqual([
			'Équation avec une valeur absolue ‖ \\left| x \\right| = \\pi',
			'Deux nombres ont pour valeur absolue $\\pi$ : $\\pi$ et $-\\pi$ ‖ \\left| x \\right| = \\pi \\;\\Longleftrightarrow\\; x = \\pi \\;\\text{ou}\\; x = -\\pi',
			'On réunit les solutions des deux équations ‖ S = \\left\\{ -\\pi \\,;\\, \\pi \\right\\}'
		]);
	});
});

describe('écriture et niveau', () => {
	it('|x| = √2 − 1 : S reprend l’écriture des branches, dans l’ordre croissant', () => {
		expect(lines(rendered('\\left|x\\right|=\\sqrt{2}-1'))).toEqual([
			'Équation avec une valeur absolue ‖ \\left| x \\right| = \\sqrt{2} - 1',
			'Deux nombres ont pour valeur absolue $\\sqrt{2} - 1$ : $\\sqrt{2} - 1$ et $1 - \\sqrt{2}$ ‖ \\left| x \\right| = \\sqrt{2} - 1 \\;\\Longleftrightarrow\\; x = \\sqrt{2} - 1 \\;\\text{ou}\\; x = 1 - \\sqrt{2}',
			'On réunit les solutions des deux équations ‖ S = \\left\\{ 1 - \\sqrt{2} \\,;\\, \\sqrt{2} - 1 \\right\\}'
		]);
	});

	it.each(['college', 'lycee'] as const)(
		'%s : chaque branche se rédige comme l’équation du premier degré seule',
		(level) => {
			const steps = lines(rendered('\\left|2x+1\\right|=5', level));
			const first = steps.indexOf('On résout $2x + 1 = 5$ ‖ 2x + 1 = 5');
			const second = steps.indexOf('On résout $2x + 1 = -5$ ‖ 2x + 1 = -5');

			expect(steps.slice(first + 1, second)).toEqual(standaloneLinear('2x+1=5', level));
			expect(steps.slice(second + 1, -1)).toEqual(standaloneLinear('2x+1=-5', level));
		}
	);

	it('collège : « On soustrait 1 », « On divise par 2 », comme 2x + 1 = 5 seule', () => {
		const titles = rendered('\\left|2x+1\\right|=5', 'college').map((s) => s.title);

		expect(titles).toContain('On soustrait $1$ aux deux membres');
		expect(titles).toContain('On divise les deux membres par $2$');
	});

	it('|x| + |x| = 4 : une seule valeur absolue (la même deux fois), titre et explication d’accord', () => {
		const steps = rendered('\\left|x\\right|+\\left|x\\right|=4');

		expect(steps[0].title).toBe('Équation avec une valeur absolue');
		expect(steps[1].title).toBe('On isole la valeur absolue');
		expect(steps[1].explanation).toBe('On se ramène à la forme $|u|=c$.');
	});

	it('|−x| = 2', () => {
		expect(lines(rendered('\\left|-x\\right|=2'))).toEqual([
			'Équation avec une valeur absolue ‖ \\left| -x \\right| = 2',
			'Deux nombres ont pour valeur absolue $2$ : $2$ et $-2$ ‖ \\left| -x \\right| = 2 \\;\\Longleftrightarrow\\; -x = 2 \\;\\text{ou}\\; -x = -2',
			'On résout $-x = 2$ ‖ -x = 2',
			'On termine en simplifiant le coefficient de x ‖ x = -2',
			'On résout $-x = -2$ ‖ -x = -2',
			'On termine en simplifiant le coefficient de x ‖ x = 2',
			'On réunit les solutions des deux équations ‖ S = \\left\\{ -2 \\,;\\, 2 \\right\\}'
		]);
	});

	it('|2x| = |x| : les deux branches donnent 0, une seule solution', () => {
		expect(lines(rendered('\\left|2x\\right|=\\left|x\\right|'))).toEqual([
			'Équation avec deux valeurs absolues ‖ \\left| 2x \\right| = \\left| x \\right|',
			"Deux nombres ont la même valeur absolue s'ils sont égaux ou opposés ‖ \\left| 2x \\right| = \\left| x \\right| \\;\\Longleftrightarrow\\; 2x = x \\;\\text{ou}\\; 2x = -x",
			'On résout $2x = x$ ‖ 2x = x',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   2x \\textcolor{blue}{- x} &= 0 \\\\   x &= 0 \\end{aligned}',
			'On résout $2x = -x$ ‖ 2x = -x',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   2x \\textcolor{blue}{+ x} &= 0 \\\\   3x &= 0 \\end{aligned}',
			'On termine en simplifiant le coefficient de x ‖ x = 0',
			"L'équation a une seule solution ‖ S = \\left\\{ 0 \\right\\}"
		]);
	});
});

describe('|u| = 0', () => {
	it('|x| = 0 ⇔ x = 0', () => {
		expect(lines(rendered('\\left|x\\right|=0'))).toEqual([
			'Équation avec une valeur absolue ‖ \\left| x \\right| = 0',
			'Seul $0$ a pour valeur absolue $0$ ‖ \\left| x \\right| = 0 \\;\\Longleftrightarrow\\; x = 0',
			"L'équation a une seule solution ‖ S = \\left\\{ 0 \\right\\}"
		]);
	});
});

describe('|u| = c, c < 0 : pas de solution', () => {
	it('|x| = −2', () => {
		const steps = rendered('\\left|x\\right|=-2');

		expect(lines(steps)).toEqual([
			'Équation avec une valeur absolue ‖ \\left| x \\right| = -2',
			'Une valeur absolue est positive ou nulle ‖ \\left| x \\right| = -2',
			"L'équation n'a pas de solution ‖ S = \\emptyset"
		]);
		expect(steps[1].explanation).toBe("Or $-2<0$ : aucun réel n'a pour valeur absolue $-2$.");
	});

	it('|x| = 1 − √2 : signe négatif lu sur la valeur, écrit comme l’élève', () => {
		const steps = rendered('\\left|x\\right|=1-\\sqrt{2}');

		expect(steps[1].title).toBe('Une valeur absolue est positive ou nulle');
		expect(steps[1].explanation).toBe(
			"Or $1 - \\sqrt{2}<0$ : aucun réel n'a pour valeur absolue $1 - \\sqrt{2}$."
		);
		expect(steps.at(-1)?.expressionLatex).toBe('S = \\emptyset');
	});
});

describe('isoler la valeur absolue d’abord', () => {
	it('3|x − 1| = 6 : on divise, puis |x − 1| = 2', () => {
		const steps = rendered('3\\left|x-1\\right|=6');

		expect(lines(steps)).toEqual([
			'Équation avec une valeur absolue ‖ 3\\left| x - 1 \\right| = 6',
			'On isole la valeur absolue ‖ \\begin{aligned} 3\\left| x - 1 \\right| &= 6 \\\\ \\left| x - 1 \\right| &= 2 \\end{aligned}',
			'Deux nombres ont pour valeur absolue $2$ : $2$ et $-2$ ‖ \\left| x - 1 \\right| = 2 \\;\\Longleftrightarrow\\; x - 1 = 2 \\;\\text{ou}\\; x - 1 = -2',
			'On résout $x - 1 = 2$ ‖ x - 1 = 2',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   x &= 2 \\textcolor{blue}{+ 1} \\\\   x &= 3 \\end{aligned}',
			'On résout $x - 1 = -2$ ‖ x - 1 = -2',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   x &= -2 \\textcolor{blue}{+ 1} \\\\   x &= -1 \\end{aligned}',
			'On réunit les solutions des deux équations ‖ S = \\left\\{ -1 \\,;\\, 3 \\right\\}'
		]);
	});

	it('5 − |x| = 2 : |x| = 3', () => {
		expect(lines(rendered('5-\\left|x\\right|=2'))).toEqual([
			'Équation avec une valeur absolue ‖ 5 - \\left| x \\right| = 2',
			'On isole la valeur absolue ‖ \\begin{aligned} 5 - \\left| x \\right| &= 2 \\\\ \\left| x \\right| &= 3 \\end{aligned}',
			'Deux nombres ont pour valeur absolue $3$ : $3$ et $-3$ ‖ \\left| x \\right| = 3 \\;\\Longleftrightarrow\\; x = 3 \\;\\text{ou}\\; x = -3',
			'On réunit les solutions des deux équations ‖ S = \\left\\{ -3 \\,;\\, 3 \\right\\}'
		]);
	});
});

describe('|u| = |v|', () => {
	it('|x − 1| = |x + 3| : une branche impossible, l’autre donne −1', () => {
		const steps = rendered('\\left|x-1\\right|=\\left|x+3\\right|');

		expect(lines(steps)).toEqual([
			'Équation avec deux valeurs absolues ‖ \\left| x - 1 \\right| = \\left| x + 3 \\right|',
			"Deux nombres ont la même valeur absolue s'ils sont égaux ou opposés ‖ \\left| x - 1 \\right| = \\left| x + 3 \\right| \\;\\Longleftrightarrow\\; x - 1 = x + 3 \\;\\text{ou}\\; x - 1 = -x - 3",
			'On résout $x - 1 = x + 3$ ‖ x - 1 = x + 3',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   x \\textcolor{blue}{- x} &= 3 \\textcolor{blue}{+ 1} \\\\   0 &= 4 \\end{aligned}',
			"Cette équation n'a pas de solution ‖ 0 = 4",
			'On résout $x - 1 = -x - 3$ ‖ x - 1 = -x - 3',
			'On isole les termes en x dans le membre de gauche ‖ \\begin{aligned}   x \\textcolor{blue}{+ x} &= -3 \\textcolor{blue}{+ 1} \\\\   2x &= -2 \\end{aligned}',
			'On termine en simplifiant le coefficient de x ‖ x = -1',
			"L'équation a une seule solution ‖ S = \\left\\{ -1 \\right\\}"
		]);
		expect(steps[4].explanation).toBe("L'égalité $0 = 4$ est fausse quel que soit $x$.");
	});

	it('|x − 1| = |1 − x| : une branche est toujours vraie, S = ℝ', () => {
		const steps = rendered('\\left|x-1\\right|=\\left|1-x\\right|');
		const truth = steps.find((s) => s.title === 'Cette équation est vérifiée par tout réel');

		expect(truth?.expressionLatex).toBe('0 = 0');
		expect(truth?.explanation).toBe("L'égalité $0 = 0$ est vraie quel que soit $x$.");
		expect(lines(steps).at(-1)).toBe('Tout réel est solution ‖ S = \\mathbb{R}');
	});
});

describe('hors périmètre : refus, jamais une rédaction fausse', () => {
	it('|x² − 1| = 3 jette', () => {
		expect(() => rendered('\\left|x^2-1\\right|=3')).toThrow();
	});

	it('|x| = x + 1 jette', () => {
		expect(() => rendered('\\left|x\\right|=x+1')).toThrow();
	});
});
