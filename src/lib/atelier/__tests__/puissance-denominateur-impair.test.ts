/**
 * Puissances d'exposant rationnel de dénominateur IMPAIR définies sur ℝ
 * (décision de David, 2026-10-08) : x^{1/3} = ∛x pour tout réel x,
 * x^{p/q} = (ᵠ√x)^p, ℝ si p > 0, ℝ* si p < 0. Dénominateur pair inchangé.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { readableText } from '$lib/mathAST/variations/display';

function output(input: string): string {
	const result = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
	expect(result.kind).toBe('commande');
	return result.kind === 'commande' ? result.output : '';
}

describe('.domaine — dénominateur impair', () => {
	it('x^(2/3) : ℝ', () => {
		expect(output('.domaine x^(2/3)')).toMatch(/Domaine : ℝ/);
	});

	it('x^(-1/3) : ℝ privé de 0', () => {
		expect(output('.domaine x^(-1/3)')).toMatch(/Domaine : ℝ \\ \{0\}|Domaine : ℝ\*/);
	});

	it('x^(4/6) se lit x^(2/3) : ℝ', () => {
		expect(output('.domaine x^(4/6)')).toMatch(/Domaine : ℝ/);
	});

	it('(x-1)^(5/3) : ℝ', () => {
		expect(output('.domaine (x-1)^(5/3)')).toMatch(/Domaine : ℝ/);
	});

	it('x^(1/2) inchangé : [0 ; +∞[', () => {
		expect(output('.domaine x^(1/2)')).toMatch(/Domaine : \[0 ; \+∞\[/);
	});
});

describe('.variations x^(1/3)', () => {
	const text = () => output('.variations x^(1/3)');

	it('domaine ℝ', () => {
		expect(text()).toMatch(/Domaine : ℝ\n/);
	});

	it('limites en −∞ et +∞', () => {
		const t = text();
		expect(t).toMatch(/x → -∞.*= -∞/);
		expect(t).toMatch(/x → \+∞.*= \+∞/);
	});

	it('croissante sur ℝ, sans extremum', () => {
		const t = text();
		expect(t).toMatch(/\]-∞ ; \+∞\[ : \+ {2}\(f croissante\)/);
		expect(t).not.toMatch(/décroissante/i);
		expect(t).toMatch(/Extrema : aucun/);
	});
});

describe('.variations x^(2/3)', () => {
	it('décroissante puis croissante, minimum en 0', () => {
		const t = output('.variations x^(2/3)');
		expect(t).toMatch(/\]-∞ ; 0\[ : - {2}\(f décroissante\)/);
		expect(t).toMatch(/\]0 ; \+∞\[ : \+ {2}\(f croissante\)/);
		expect(t).toMatch(/Minimum global : f\(0\)/);
		expect(t).toMatch(/x → -∞.*= \+∞/);
	});
});

describe('.variations : valeur de l’extremum calculée', () => {
	it.each([
		['.variations x^(2/3)-4', 'f(0) = -4'],
		['.variations x^(4/3)', 'f(0) = 0']
	])('%s : %s', (input, value) => {
		expect(output(input)).toContain(`Minimum global : ${value}\n`);
	});
});

describe('.variations : f′ affichée comme `.dériver` l’écrit', () => {
	/** La ligne « Dérivée : … » de `.variations`, et la dérivée de `.dériver`. */
	function derivatives(f: string): { variations: string; derive: string } {
		const line = /Dérivée : f'\(x\) = (.*)/.exec(output(`.variations ${f}`));
		const derive = /= (.*)$/.exec(output(`.dériver ${f}`).split('\n')[0]);
		return { variations: line?.[1] ?? '', derive: derive?.[1] ?? '' };
	}

	it.each(['x^(4/3)', 'x^(1/3)', 'x^(2/3)-4', 'x^(-1/3)', 'x^3-3x'])('%s', (f) => {
		const { variations, derive } = derivatives(f);
		expect(variations).not.toMatch(/sqrt\[/);
		// Même expression ; `.variations` l'écrit en texte lisible (`4x^{1/3}/3`),
		// sans les accolades de fraction de `.dériver` (`{4x^{1/3}}/3`)
		const parsed = parseCustomSafe(derive).ast;
		expect(parsed).toBeDefined();
		if (parsed !== undefined) expect(variations).toBe(readableText(parsed));
	});
});

describe('.variations : racine cubique écrite ∛, pas √ (seconde revue)', () => {
	it.each([
		['.variations x^(2/3)*(x-5)', 'Minimum local : f(2) = -3*∛4'],
		['.variations cbrt(x^2)(x-1)', '∛(4/25)']
	])('%s', (input, expected) => {
		const text = output(input);
		expect(text).toContain(expected);
		expect(text).not.toMatch(/√/);
	});
});

describe('.résoudre : x^{p/q} = c, q impair (troisième revue)', () => {
	it.each([
		['.résoudre x^(2/3)=4', 'x = -8 ou x = 8'],
		['.résoudre x^(-2/3)=4', 'x = -1/8 ou x = 1/8'],
		['.résoudre (x-1)^(2/3)=4', 'x = -7 ou x = 9'],
		['.résoudre x^(2/3)=x', 'x = 0 ou x = 1'],
		['.résoudre x^(1/3)=x^3', 'x = -1 ou x = 0 ou x = 1']
	])('%s', (input, expected) => {
		expect(output(input)).toContain(expected);
	});
});

describe('.variations x^(2/3)-x : points critiques (quatrième revue)', () => {
	it('x = 0 (f′ non définie) et x = 8/27 (f′ = 0)', () => {
		const text = output('.variations x^(2/3)-x');
		expect(text).toMatch(/x = 0 \(f' non définie\)/);
		expect(text).toMatch(/x = 8\/27 \(f'=0\)/);
	});
});

describe('.intégrer x^(1/3) de -8 a 1', () => {
	it('vaut exactement −45/4', () => {
		const result = runInput(
			{ atelier: new Atelier(), engine: new WebReplEngine() },
			'.intégrer x^(1/3) de -8 a 1'
		);
		expect(result.kind).toBe('commande');
		if (result.kind === 'commande') {
			expect(result.latex).toMatch(/^-\\dfrac\{45\}\{4\}$/);
		}
	});
});
