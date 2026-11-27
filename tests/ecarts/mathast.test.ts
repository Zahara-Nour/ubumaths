/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine mathAST.
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› V35`.
 *
 * Sonde : le chemin de l'Atelier (`runInput`), sauf quand l'écart porte sur une
 * fonction du moteur (`tidy`, `solve`, `solveInequality`, `normalize`, `intersect`,
 * `union`, le parseur).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { WebReplEngine } from '#lib/mathAST/cli/web/web-repl-engine.ts';
import { runInput, type CalcResult } from '#lib/atelier/calcul.ts';
import { toCustom, toLatex } from '#lib/mathAST/index.ts';
import { parseLatex } from '#lib/mathAST/parser/index.ts';
import { parseCustom } from '#lib/mathAST/parser/custom/index.ts';
import { tidy } from '#lib/mathAST/tidy/index.ts';
import { normalize } from '#lib/mathAST/normal/normalize.ts';
import { containsValue, intersect, union } from '#lib/mathAST/domain/algebra.ts';
import { cotDomain, tanDomain, UNIVERSAL_SET } from '#lib/mathAST/domain/factory.ts';
import { solve } from '#lib/mathAST/solve/solve.ts';
import { solveInequality } from '#lib/mathAST/solve/inequality/index.ts';
import { isRelation } from '#lib/mathAST/guards.ts';
import type { RelationNode } from '#lib/mathAST/types.ts';

/** Une saisie de l'Atelier, dans une session neuve. */
function run(input: string): CalcResult {
	return runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
}

/** Le LaTeX d'une réponse de l'Atelier (vide pour un refus). */
function latexOf(result: CalcResult): string {
	return 'latex' in result && result.latex ? result.latex : '';
}

/** Une relation lue par le parseur (`|x|=x+1`). */
function relation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error(`pas une relation : ${latex}`);
	return node;
}

/** Le texte d'une réponse : la sortie d'une commande, ou le message d'un refus. */
function textOf(result: CalcResult): string {
	if ('output' in result && result.output) return result.output;
	return 'message' in result ? result.message : '';
}

/** Le bouton proposé sous la réponse (« Simplifier pour x ≠ 0 »), s'il y en a un. */
function buttonOf(result: CalcResult) {
	return 'alternative' in result ? result.alternative : undefined;
}

/** Le LaTeX du bouton (vide sans bouton). */
function buttonLatexOf(result: CalcResult): string {
	return buttonOf(result)?.latex ?? '';
}

/** Les étapes du « Comment ? » d'une réponse (aucune : tableau vide). */
function stepsOf(result: CalcResult) {
	return 'steps' in result && result.steps ? result.steps : [];
}

/** Combien de fois `needle` apparaît dans `text`. */
function count(text: string, needle: string): number {
	return text.split(needle).length - 1;
}

describe('V17 — ∫eˣ sin x : le ½ commun mis en facteur', () => {
	it('rend ½(sin x − cos x)eˣ, un seul dénominateur 2 et un seul eˣ', () => {
		const latex = latexOf(run('.intégrer e^x\\sin x'));

		// Aujourd'hui `\dfrac{1}{2} e^x sin x - \dfrac{1}{2} cos x e^x + C` : deux de chaque.
		expect(latex).toContain('\\sin');
		expect(count(latex, '{2}')).toBe(1);
		expect(count(latex, '\\exponentialE')).toBe(1);
	});
});

describe('V34 — tidy garde x + iy dans l’ordre', () => {
	it('écrit x avant iy', () => {
		const latex = toLatex(tidy(parseLatex('x+iy')));

		expect(latex.startsWith('x + ')).toBe(true);
		expect(latex).toContain('\\imaginaryI');
	});
});

describe('V39 — le parseur lit \\ln 5^2 comme ln(5²)', () => {
	it('met le carré sous le ln', () => {
		const node = parseLatex('\\ln 5^2');

		// Aujourd'hui : un `superscript` dont la base est ln(5).
		expect(node.type).toBe('function');
		if (node.type !== 'function') return;
		expect(node.name).toBe('ln');
		expect(node.args[0]?.type).toBe('superscript');
	});
});

describe('V40 — valeur absolue hors périmètre : pas de « aucune solution » faux', () => {
	// Aujourd'hui `solve` refuse par `no-solution` + `error`, pour des équations qui
	// ont des solutions (−1/2 ; ±2). Aucune erreur n'est avalée : un test qui lève reste rouge.
	for (const input of ['|x|=x+1', '|x^2-1|=3']) {
		it(`solve(${input}) ne rend pas no-solution`, () => {
			expect(solve(relation(input)).status).not.toBe('no-solution');
		});
	}

	it('solveInequality(|x|>x) ne rend pas un partial vide', () => {
		const result = solveInequality(relation('|x|>x'));

		expect(`${result.status}/${result.solution.kind}`).not.toBe('partial/empty');
	});
});

describe('V48 — 2x³/x < 2 : une étape annonce la valeur interdite 0', () => {
	it('a des étapes, dont une parle de la valeur interdite', () => {
		const result = run('.résoudre \\frac{2x^3}{x}<2');
		const steps = 'steps' in result && result.steps ? result.steps : [];

		expect(steps.length).toBeGreaterThan(0);
		expect(JSON.stringify(steps)).toMatch(/interdite|\\\\neq?\b|≠/);
	});
});

describe('V64 — intégrales à paramètre encore refusées', () => {
	for (const input of [
		'.intégrer 1/(x^2+2x+a^2)',
		'.intégrer 1/(x^2+a^2+1)',
		'.intégrer (x+1)^a de 0 à 1'
	]) {
		it(`${input} n’est plus refusée`, () => {
			const result = run(input);

			// Une réponse de commande, avec son écriture : ni refus, ni réponse vide.
			expect(result.kind).toBe('commande');
			expect(latexOf(result)).not.toBe('');
		});
	}
});

describe('L25 — factoriser une somme longue sort x', () => {
	// La ligne du registre écrit `k·x^{k-1}` : avec k = 1, le terme `x⁰` n'a
	// pas de x et rien ne sort à aucune longueur. Le défaut mesuré est sur
	// `k·x^k` (x sort jusqu'à 10 termes, pas à 30).
	it('30 termes k·x^k·eˣ·sin x : x en facteur', () => {
		const terms = Array.from({ length: 30 }, (_, i) => `${i + 1}x^{${i + 1}}e^x\\sin x`);
		const latex = latexOf(run(`.factoriser ${terms.join('+')}`));

		// Aujourd'hui `\left( 30 x^{30} + … + x \right) e^x sin x` : x reste dans chaque
		// terme. Une fois x sorti, le plus haut degré de la parenthèse est 29.
		expect(latex).toContain('x^{29}');
		expect(latex).not.toContain('x^{30}');
	});
});

// =============================================================================
// Écarts du tri du 2026-11-24 (docs/wip/ecarts-tri/mathast-a.md et mathast-b.md)
// =============================================================================

describe('V78 — développer x(1/x − 1) ne laisse pas x/x sur la ligne', () => {
	it('la réponse ne contient pas la fraction x/x', () => {
		const latex = latexOf(run('.developper x(\\frac{1}{x}-1)'));

		// Aujourd'hui `-x + \dfrac{x}{x}`.
		expect(latex).not.toBe('');
		expect(latex).not.toContain('\\dfrac{x}{x}');
	});
});

describe('V79 — développer √x³·√x ne rend pas (√x)⁴', () => {
	it('rend x², ou garde l’écriture tapée', () => {
		const latex = latexOf(run('.developper \\sqrt{x}^3\\sqrt{x}'));

		// Aujourd'hui `\sqrt{x}^4`.
		expect(['x^2', '\\sqrt{x}^3 \\sqrt{x}']).toContain(latex);
	});
});

describe('V80 — factoriser ln(xy) − ln(xy) : le bouton va jusqu’à 0', () => {
	it('le bouton rend 0', () => {
		const latex = buttonLatexOf(run('.factoriser \\ln(xy)-\\ln(xy)'));

		// Aujourd'hui `ln x + ln y − (ln x + ln y), pour x > 0 et y > 0`.
		expect(latex.startsWith('0')).toBe(true);
	});

	it('le bouton n’écrit pas deux fois la même étape', () => {
		const steps = buttonOf(run('.factoriser \\ln(xy)-\\ln(xy)'))?.steps ?? [];
		const lines = steps.map((step) => step.expressionLatex);

		expect(lines.length).toBeGreaterThan(0);
		expect(new Set(lines).size).toBe(lines.length);
	});
});

describe('V81 — simplifier ln x + ln y − ln(xy) : le bouton va jusqu’à 0', () => {
	it('le bouton « pour xy > 0 » rend 0', () => {
		const latex = buttonLatexOf(run('.simplifier \\ln x+\\ln y-\\ln(xy)'));

		expect(latex.startsWith('0')).toBe(true);
	});
});

describe('V82 — simplifier ln(2x) − ln(2x) ne s’arrête pas sur ln x − ln x', () => {
	it('la ligne rend 0, ou garde l’écriture tapée', () => {
		const latex = latexOf(run('.simplifier \\ln(2x)-\\ln(2x)'));

		// Aujourd'hui `\ln( x ) - \ln( x )` : un calcul commencé, pas fini.
		expect(['0', '\\ln\\left( 2 x \\right) - \\ln\\left( 2 x \\right)']).toContain(latex);
	});
});

describe('V83 — simplifier x(−eˣ)e regroupe e·eˣ', () => {
	it('rend −x e^{x+1}', () => {
		const latex = latexOf(run('.simplifier x(-e^x)e'));

		// Aujourd'hui `-\exponentialE x \exponentialE^x`.
		expect(['-x \\exponentialE^{x + 1}', '-x \\exponentialE^{1 + x}']).toContain(latex);
	});
});

describe('L62 — simplifier ln((x+y)z) propose un bouton', () => {
	it('a un bouton vers ln(x + y) + ln z', () => {
		const latex = buttonLatexOf(run('.simplifier \\ln((x+y)z)'));

		expect(latex).toContain('\\ln\\left( x + y \\right)');
		expect(latex).toContain('\\ln\\left( z \\right)');
	});
});

describe('V84 — simplifier ln(6x) − ln(2x) va jusqu’à ln 3', () => {
	it('rend ln 3, sur la ligne ou par le bouton', () => {
		const result = run('.simplifier \\ln(6x)-\\ln(2x)');

		// Aujourd'hui `ln 6 + ln x − (ln x + ln 2)`, sans bouton.
		expect(`${latexOf(result)} | ${buttonLatexOf(result)}`).toContain('\\ln\\left( 3 \\right)');
	});
});

describe('L63 — le bouton de e^{ln(x²)} a des étapes', () => {
	it('le bouton « pour x ≠ 0 » rend x² avec au moins une étape', () => {
		const button = buttonOf(run('.simplifier e^{\\ln(x^2)}'));

		expect(button?.latex.startsWith('x^2')).toBe(true);
		expect(button?.steps?.length ?? 0).toBeGreaterThan(0);
	});
});

describe('L64 — simplifier cot x · sin x propose cos x', () => {
	it('a un bouton vers cos x', () => {
		const latex = buttonLatexOf(run('.simplifier \\cot(x)\\sin(x)'));

		expect(latex).toContain('\\cos');
		expect(latex).not.toContain('\\cot');
	});
});

describe('L65 — simplifier ln(xy) − ln y propose ln x', () => {
	it('a un bouton qui rend ln x', () => {
		const latex = buttonLatexOf(run('.simplifier \\ln(xy)-\\ln y'));

		expect(latex.startsWith('\\ln\\left( x \\right)')).toBe(true);
	});
});

describe('L67 — tidy regroupe 1/(1/x) + 1/(1/x)', () => {
	it('n’écrit plus une somme de deux termes égaux', () => {
		const latex = toLatex(tidy(parseLatex('\\frac{1}{\\frac{1}{x}}+\\frac{1}{\\frac{1}{x}}')));

		expect(latex).not.toBe('');
		expect(latex).not.toContain('+');
	});
});

describe('V86 — simplifier exp(10000000 ln 2) répond vite et court', () => {
	// Aujourd'hui une douzaine de secondes, puis un entier de millions de chiffres.
	it('répond en moins d’une seconde, par une écriture courte', () => {
		const start = performance.now();
		const latex = latexOf(run('.simplifier \\exp(10000000\\ln 2)'));
		const elapsed = performance.now() - start;

		expect(latex).not.toBe('');
		expect(latex.length).toBeLessThan(100);
		expect(elapsed).toBeLessThan(1000);
	}, 60_000);
});

describe('L68 — 2^{1/3} et ∛2 sont reconnus égaux', () => {
	it('leur différence se simplifie en 0', () => {
		expect(latexOf(run('.simplifier 2^{1/3}-\\sqrt[3]{2}'))).toBe('0');
	});
});

describe('V87 — simplifier √2 − √3 − 1 ne range pas « par puissances de x »', () => {
	it('n’a aucune étape de rangement par degré', () => {
		const result = run('.simplifier \\sqrt2-\\sqrt3-1');

		// Aujourd'hui `√2 − 1 − √3`, étape « par puissances décroissantes de x » sans x.
		expect(latexOf(result)).not.toBe('');
		expect(stepsOf(result).map((step) => step.rule)).not.toContain('tidy-sort-terms');
	});
});

describe('L69 — simplifier cos(0,5π)x donne 0 avec des étapes', () => {
	it('rend 0 et dit comment', () => {
		const result = run('.simplifier \\cos(0.5\\pi)x');

		expect(latexOf(result)).toBe('0');
		expect(stepsOf(result).length).toBeGreaterThan(0);
	});
});

describe('V88 — simplifier sin(−(π/6)) va jusqu’à −1/2', () => {
	it('rend −1/2', () => {
		// Aujourd'hui `-\sin( ( \pi / 6 ) )`, double parenthèse comprise.
		expect(latexOf(run('.simplifier \\sin(-(\\pi/6))'))).toBe('-\\dfrac{1}{2}');
	});
});

describe('V89 — sin(π/3) + cos(π/6) + tan(7π/3) : pas deux étapes identiques', () => {
	it('aucune étape ne répète la ligne de la précédente', () => {
		const lines = stepsOf(run('.simplifier \\sin(\\pi/3)+\\cos(\\pi/6)+\\tan(7\\pi/3)')).map(
			(step) => step.expressionLatex
		);

		// Aujourd'hui l'étape des valeurs de sin et cos fait déjà la période de tan,
		// et l'étape « tan est π-périodique » montre la même ligne.
		expect(lines.length).toBeGreaterThan(0);
		expect(new Set(lines).size).toBe(lines.length);
	});
});

describe('V90 — simplifier cos(30° + 30°) va jusqu’à 1/2', () => {
	it('rend 1/2', () => {
		// Aujourd'hui `\cos( 60° )`.
		expect(latexOf(run('.simplifier \\cos(30°+30°)'))).toBe('\\dfrac{1}{2}');
	});
});

describe('V91 — résoudre cos(π/5)x = 1 : « on divise par cos(π/5) »', () => {
	it('le titre de l’étape écrit π/5, pas 1/5 π', () => {
		const step = stepsOf(run('.résoudre \\cos(\\pi/5)x=1')).find(
			(candidate) => candidate.rule === 'divide-both-sides'
		);

		expect(step?.title).toMatch(/\\dfrac\{\\pi\}\{5\}|\\pi \/ 5/);
		expect(step?.title).not.toContain('\\dfrac{1}{5}');
	});
});

describe('L71 — le moteur résout ax² − 1 = 0 pour a > 0, pas a ⩾ 0', () => {
	it('chaque solution porte la condition a > 0', () => {
		const result = solve(relation('ax^2-1=0'), { variable: 'x' });
		const conditions = result.solutions.map((solution) =>
			solution.condition ? toLatex(solution.condition) : ''
		);

		// Aujourd'hui `a \geqslant 0` : a = 0 divise par zéro.
		expect(conditions.length).toBe(2);
		for (const condition of conditions) expect(condition).toBe('a > 0');
	});
});

describe('V93 — x² − 4α = 0 : la condition est réduite', () => {
	it('dit « si α ⩾ 0 », comme pour x² − 4a = 0', () => {
		const latex = latexOf(run('.résoudre x^2-4\\alpha=0'));

		// Aujourd'hui « si 16α ⩾ 0 ».
		expect(latex).toContain('\\text{si } \\alpha \\geqslant 0');
		expect(latex).not.toContain('16');
	});
});

describe('V94 — x² + a = 0 : ±√(−a)', () => {
	it('écrit √(−a), pas √(−4a)/2', () => {
		const latex = latexOf(run('.résoudre x^2+a=0'));

		expect(latex).toContain('\\sqrt{-a}');
		expect(latex).not.toContain('-4 a');
	});
});

describe('V95 — x³ + a²x = 0 : S = {0}', () => {
	it('rend la seule solution 0, sans condition « 0 ⩽ a ⩽ 0 »', () => {
		// x(x² + a²) = 0 : pour a ≠ 0 seul 0 convient, et pour a = 0 aussi.
		expect(latexOf(run('.résoudre x^3+a^2x=0'))).toBe('S = \\left\\{ 0 \\right\\}');
	});
});

describe('V96 — x² − ab = 0 : les coefficients ne s’appellent pas a et b', () => {
	it('le texte n’écrit pas « a = 1 » quand a est le paramètre', () => {
		const text = textOf(run('.résoudre x^2-ab=0'));

		// Aujourd'hui « On identifie les coefficients: a = 1, b = 0, c = -ab ».
		expect(text).toContain('S = ');
		expect(text).not.toContain('a = 1');
	});
});

describe('V97 — l’écriture texte de (1/2)ˣ·eˣ se relit telle quelle', () => {
	it('toCustom puis parseCustom rend la même expression', () => {
		const node = parseLatex('\\left(\\frac{1}{2}\\right)^x e^x');
		const text = toCustom(node);

		// Aujourd'hui `(1/2)^xe^x`, relu comme (1/2) puissance « xe^x ».
		expect(toLatex(parseCustom(text))).toBe(toLatex(node));
	});
});

describe('V98 — intégrale à paramètre : une condition, écrite une fois', () => {
	it('∫₀¹ √(a − 1,5) x dx porte une seule condition sur a', () => {
		const latex = latexOf(run('.intégrer \\sqrt{a-1.5} x de 0 à 1'));

		// Aujourd'hui `(a - 3/2 ⩾ 0, a ⩾ 1,5)`.
		expect(count(latex, '\\geqslant')).toBe(1);
	});
});

describe('V99 — intégrale à paramètre : pas de « a > −0 »', () => {
	it('∫₀¹ ln(a + 0) x dx dit seulement a > 0', () => {
		const latex = latexOf(run('.intégrer \\ln(a+0) x de 0 à 1'));

		expect(latex).toContain('a > 0');
		expect(latex).not.toContain('-0');
	});
});

describe('V100 — intégrale à paramètre : conditions jamais vraies ensemble', () => {
	it('∫₀¹ ln(a − 3) ln(3 − a) x dx ne rend pas de valeur', () => {
		const result = run('.intégrer \\ln(a-3)\\ln(3-a) x de 0 à 1');

		// Aujourd'hui une valeur « pour a < 3, a > 3 ».
		expect(textOf(result)).not.toBe('');
		expect(latexOf(result)).not.toMatch(/\\d?frac/);
		expect(textOf(result)).not.toMatch(/a < 3.*a > 3/);
	});
});

describe('V101 — intégrale à paramètre : « a ≠ 1 », pas « ln(a) ≠ 0 »', () => {
	it('∫₀¹ x/ln(a) dx porte la condition a ≠ 1', () => {
		const latex = latexOf(run('.intégrer \\frac{x}{\\ln(a)} de 0 à 1'));

		expect(latex).toContain('a \\neq 1');
		expect(latex).not.toContain('\\ln\\left( a \\right) \\neq 0');
	});
});

describe('V102 — factoriser (x² − 1)/(1 − x) voit les facteurs opposés', () => {
	it('avec x ≠ 1, rend −(x + 1) ou −x − 1', () => {
		const latex = latexOf(run('.factoriser \\frac{x^2-1}{1-x} avec x \\neq 1'));

		// Aujourd'hui `(x − 1)(x + 1)/(1 − x)`, « x ≠ 1 ne change rien ici ».
		expect(['-x - 1', '-\\left( x + 1 \\right)']).toContain(latex);
	});
});

describe('L72 — plus de 8 fractions simplifiables : toutes simplifiées', () => {
	it('9 fractions (x² − k²)/(x + k) : le bouton rend 9x − 45', () => {
		const terms = Array.from({ length: 9 }, (_, i) => `\\frac{x^2-${(i + 1) ** 2}}{x+${i + 1}}`);
		const latex = buttonLatexOf(run(`.simplifier ${terms.join('+')}`));

		// Aujourd'hui `8 x + \dfrac{x^2 - 9}{x + 3} - 42` : la 9ᵉ fraction reste, sans rien dire.
		expect(latex.startsWith('9 x - 45')).toBe(true);
	});
});

describe('L75 — domaines de 1/(ln(x²) − 1) et de 1/(log x − 1)', () => {
	// Aujourd'hui : « Je ne sais pas encore déterminer ce domaine. »
	it('1/(log x − 1) : ]0 ; +∞[ privé de 10', () => {
		const latex = latexOf(run('.domaine \\frac{1}{\\log(x)-1}'));

		expect(latex).toContain(']0 ; +\\infty[');
		expect(latex).toContain('10');
	});

	it('1/(ln(x²) − 1) n’est plus refusé', () => {
		const result = run('.domaine \\frac{1}{\\ln(x^2)-1}');

		// ℝ privé de 0, de −√e et de √e.
		expect(result.kind).toBe('commande');
		expect(latexOf(result)).toContain('\\setminus');
		expect(latexOf(result)).toContain('\\exponentialE');
	});
});

describe('L77 — limites de Terminale encore refusées', () => {
	// Aujourd'hui : « Je ne sais pas calculer cette limite. » pour les quatre.
	for (const [input, expected] of [
		['.limite x^{-1}\\sin x en 0', '= 1'],
		['.limite x^3e^{-x^2+x} en +inf', '= 0'],
		['.limite x^2e^{-\\sqrt{x}} en +inf', '= 0'],
		['.limite x^{\\frac{4}{2}} en -inf', '= +\\infty']
	] as const) {
		it(`${input} rend « ${expected} »`, () => {
			expect(latexOf(run(input)).endsWith(expected)).toBe(true);
		});
	}
});

describe('L117 — domaine : deux familles de valeurs interdites, ou une famille et un point', () => {
	const REFERENCE = latexOf(run('.domaine \\frac{1}{\\sin(x)}'));

	it('témoin : 1/sin x rend ℝ privé des kπ', () => {
		expect(REFERENCE).toBe('D = \\mathbb{R}\\setminus\\left\\{k\\pi,\\ k\\in\\mathbb{Z}\\right\\}');
	});

	// Aujourd'hui : « Je ne sais pas encore déterminer ce domaine. » pour les trois.
	it('1/(sin x cos 2x) : ℝ privé des kπ et des π/4 + kπ/2', () => {
		const latex = latexOf(run('.domaine \\frac{1}{\\sin(x)\\cos(2x)}'));

		expect(latex).toContain('\\setminus');
		expect(latex).toContain('\\frac{\\pi}{4}');
		// Les kπ, cherchés hors du kπ/2 de la seconde famille.
		expect(latex.replaceAll('\\frac{k\\pi}{2}', '')).toContain('k\\pi');
	});

	it('1/((x − 1) cos x) : ℝ privé de 1 et des π/2 + kπ', () => {
		const latex = latexOf(run('.domaine \\frac{1}{(x-1)\\cos(x)}'));

		expect(latex).toContain('\\setminus');
		expect(latex).toContain('\\frac{\\pi}{2}');
		// Le point 1, écrit seul entre deux séparateurs de l'ensemble.
		expect(latex).toMatch(/[{;,]\s*1\s*[;,}\\]/);
	});

	it('1/((x − π) sin x) : π est déjà un kπ, même réponse que 1/sin x', () => {
		expect(latexOf(run('.domaine \\frac{1}{(x-\\pi)\\sin(x)}'))).toBe(REFERENCE);
	});
});

describe('L118 — limite en 0 de x ln x + kx : l’énoncé de la réponse dit 0⁺', () => {
	it('témoin : x ln x en 0 s’écrit x → 0⁺', () => {
		expect(latexOf(run('.limite x\\ln x en 0'))).toContain('x\\to 0^+');
	});

	// Aujourd'hui `\lim\limits_{x\to 0} \left(x \ln(x) + k x\right) = 0`.
	it('x ln x + kx en 0 s’écrit x → 0⁺', () => {
		const latex = latexOf(run('.limite x\\ln x+kx en 0'));

		expect(latex).toContain('x\\to 0^+');
		expect(latex.endsWith('= 0')).toBe(true);
	});
});

describe('L119 — intersect et union de deux familles périodiques', () => {
	// ℝ privé des kπ, et ℝ privé des π/2 + kπ.
	const withoutKPi = cotDomain();
	const withoutHalfPi = tanDomain();

	it('témoin : ℝ ∖ {kπ} coupé avec ℝ reste privé de 0 et garde π/2', () => {
		const domain = intersect(withoutKPi, UNIVERSAL_SET);

		expect(containsValue(domain, 0)).toBe(false);
		expect(containsValue(domain, Math.PI / 2)).toBe(true);
	});

	// Aujourd'hui : la première famille seule, π/2 est encore dans l'intersection.
	it('l’intersection est privée des deux familles', () => {
		const domain = intersect(withoutKPi, withoutHalfPi);

		expect(containsValue(domain, 0)).toBe(false);
		expect(containsValue(domain, Math.PI / 2)).toBe(false);
		expect(containsValue(domain, 1)).toBe(true);
	});

	it('témoin : ℝ ∖ {kπ} réuni avec lui-même reste privé de 0', () => {
		expect(containsValue(union(withoutKPi, withoutKPi), 0)).toBe(false);
	});

	// Aujourd'hui : la première famille seule, 0 manque à la réunion (qui est ℝ).
	it('la réunion de deux familles sans valeur commune est ℝ', () => {
		const domain = union(withoutKPi, withoutHalfPi);

		expect(containsValue(domain, 0)).toBe(true);
		expect(containsValue(domain, Math.PI / 2)).toBe(true);
	});
});

describe('L120 — normalize ne découpe pas √(4ab) en 2 √a √b', () => {
	// √a √b n'existe pas pour a = b = −1, alors que √(ab) vaut 1.
	it('témoin : √(ab) reste une seule racine', () => {
		expect(normalize(parseLatex('\\sqrt{ab}')).hash).toBe('*(V(a),V(b))^1/2');
	});

	// Aujourd'hui `2*V(a)^1/2*V(b)^1/2`.
	it('√(4ab) garde ab sous une seule racine', () => {
		const hash = normalize(parseLatex('\\sqrt{4ab}')).hash;

		// Que le 4 sorte de la racine ou non : ni √a ni √b seuls.
		expect(hash).not.toContain('V(a)^1/2');
		expect(hash).not.toContain('V(b)^1/2');
	});
});

describe('L121 — refus à lever : une seule famille kπ/2, limite à droite avec une lettre', () => {
	it('témoin : 1/(sin x cos x) rend ℝ privé des kπ/2', () => {
		expect(latexOf(run('.domaine \\frac{1}{\\sin(x)\\cos(x)}'))).toContain('\\frac{k\\pi}{2}');
	});

	// Aujourd'hui : « Je ne sais pas encore déterminer ce domaine. » pour les deux.
	for (const input of [
		'.domaine \\frac{1}{\\sin(x)}+\\frac{1}{\\cos(x)}',
		'.domaine \\frac{\\tan(x)}{\\sin(x)}'
	]) {
		it(`${input} rend ℝ privé des kπ/2`, () => {
			expect(latexOf(run(input))).toContain('\\frac{k\\pi}{2}');
		});
	}

	it('témoin : ln(x + k) en 0⁺ rend ln k, pour k > 0', () => {
		expect(latexOf(run('.limite \\ln(x+k) en 0+'))).toContain('\\text{pour }k > 0');
	});

	// Aujourd'hui : « Je ne sais pas calculer cette limite : elle peut dépendre du signe de k. »
	// x/(kx + x²) = 1/(k + x) : 1/k pour tout k ≠ 0 ; « k > 0 » (constat du registre)
	// serait juste aussi, en plus étroit.
	it('x/(kx + x²) en 0⁺ rend 1/k, avec sa condition sur k', () => {
		const latex = latexOf(run('.limite \\frac{x}{kx+x^2} en 0+'));

		expect(latex).toContain('= \\dfrac{1}{k}');
		expect(latex).toMatch(/\\text\{pour \}k (>|\\neq) 0/);
	});
});

describe('V124 — x² − a²bc = 0 : la solution 0 du cas a = 0', () => {
	it('témoin : x² − ab = 0 rend ±√(ab) si ab ⩾ 0', () => {
		const latex = latexOf(run('.résoudre x^2-ab=0'));

		expect(latex).toContain('\\sqrt{a b}');
		expect(latex).toContain('a b \\geqslant 0');
	});

	// Aujourd'hui `S = {√(bc)|a| ; −√(bc)|a|} si bc ⩾ 0` : rien pour a = 0 avec bc < 0,
	// où 0 est pourtant solution. La forme de la réponse corrigée n'est pas tranchée :
	// le test demande seulement que le cas a = 0 soit écrit.
	it('la réponse annonce le cas a = 0', () => {
		const latex = latexOf(run('.résoudre x^2-a^2bc=0'));

		expect(latex).toContain('b c \\geqslant 0');
		expect(latex).toMatch(/a\s*=\s*0/);
	});
});

describe('V125 — limite à paramètre : k/k simplifié en 1', () => {
	it('témoin : 1/(x² + k) en 0 rend 1/k, pour k ≠ 0', () => {
		const latex = latexOf(run('.limite \\frac{1}{x^2+k} en 0'));

		expect(latex).toContain('= \\dfrac{1}{k}');
		expect(latex).toContain('\\text{pour }k \\neq 0');
	});

	// Aujourd'hui `… = \dfrac{k}{k}\text{,}\quad\text{pour }k \neq 0`.
	it('(x + k)/(x² + k) en 0 rend 1, pour k ≠ 0', () => {
		const latex = latexOf(run('.limite \\frac{x+k}{x^2+k} en 0'));

		expect(latex).toContain('= 1');
		expect(latex).not.toContain('\\dfrac{k}{k}');
		// La condition reste : pour k = 0 l'expression est 1/x, sans limite en 0.
		expect(latex).toContain('\\text{pour }k \\neq 0');
	});
});
