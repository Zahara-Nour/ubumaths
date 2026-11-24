/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine mathAST.
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› V35`.
 *
 * Sonde : le chemin de l'Atelier (`runInput`), sauf quand l'écart porte sur une
 * fonction du moteur (`tidy`, `solve`, `solveInequality`, le parseur).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { WebReplEngine } from '#lib/mathAST/cli/web/web-repl-engine.ts';
import { runInput, type CalcResult } from '#lib/atelier/calcul.ts';
import { toLatex } from '#lib/mathAST/index.ts';
import { parseLatex } from '#lib/mathAST/parser/index.ts';
import { tidy } from '#lib/mathAST/tidy/index.ts';
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

describe('V35 — le i derrière la fraction', () => {
	it('écrit -½ + (√3/2)i, i après la fraction', () => {
		const latex = toLatex(tidy(parseLatex('-\\dfrac12+\\dfrac{\\sqrt3}{2}i')));

		expect(latex).not.toContain('\\dfrac{\\imaginaryI');
		expect(latex).toMatch(/\\dfrac\{\\sqrt\{?3\}?\}\{2\}\s*\\imaginaryI/);
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
