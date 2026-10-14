/**
 * V59 — une fonction usuelle écrite SANS parenthèses (`ln x`, `sin x`) se lit
 * l·n·x, s·i·n·x : un produit de lettres, sans erreur. Décision de David
 * (2026-10-06, `bareFunctionName`) : on la REFUSE partout dans l'atelier, avec
 * le même message, qui cite ce que l'élève a tapé.
 *
 * `ln(x)`, `\ln x` (LaTeX, clavier MathLive) et `l n` (un produit écrit avec
 * une espace) restent lus.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { parseDefinition, type Provenance } from '../parse';

function session(...setup: string[]): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function refusalOf(text: string, s: CalcSession = session(), provenance?: Provenance): string {
	const result = runInput(s, text, provenance);
	expect(result.kind).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
}

describe('une fonction usuelle sans parenthèses est refusée, avec ce qui a été tapé', () => {
	it.each([
		['ln x', '« ln x » : écris ln(x) avec des parenthèses.'],
		['sin x', '« sin x » : écris sin(x) avec des parenthèses.'],
		['cos x', '« cos x » : écris cos(x) avec des parenthèses.'],
		['tan x', '« tan x » : écris tan(x) avec des parenthèses.'],
		['exp x', '« exp x » : écris exp(x) avec des parenthèses.'],
		['sqrt x', '« sqrt x » : écris sqrt(x) avec des parenthèses.'],
		['log x', '« log x » : écris log(x) avec des parenthèses.'],
		// Le fragment fautif seulement, et son argument tel quel
		['ln x + 1', '« ln x » : écris ln(x) avec des parenthèses.'],
		['2 ln x', '« ln x » : écris ln(x) avec des parenthèses.'],
		['ln 2x', '« ln 2x » : écris ln(2x) avec des parenthèses.'],
		['ln 2', '« ln 2 » : écris ln(2) avec des parenthèses.'],
		['sin^2 x', '« sin^2 x » : écris sin^2(x) avec des parenthèses.'],
		['e^ln x', '« ln x » : écris ln(x) avec des parenthèses.']
	])('ligne de calcul « %s »', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	it.each([
		'.évaluer ln x en x=1',
		'.résoudre ln x = 0',
		'.intégrer ln x',
		'.intégrer ln x de 1 à 2',
		'.simplifier ln x',
		'.factoriser ln x',
		'.dériver ln x',
		'.domaine ln x',
		'.limite ln x en 0',
		'.variations ln x',
		'.taylor ln x ordre 3',
		'f(x) = ln x',
		'f(x) = 2 ln x + 1',
		'a = ln 2x'
	])('« %s » : le même refus', (text) => {
		const message = refusalOf(text);
		expect(message).toMatch(/^« ln (x|2x) » : écris ln\((x|2x)\) avec des parenthèses\.$/);
	});

	it('ne crée aucun objet pour une définition refusée', () => {
		const s = session();
		refusalOf('f(x) = ln x', s);
		expect(s.atelier.get('f')).toBeUndefined();
	});

	it('cite le nom tapé seul quand rien ne le suit', () => {
		expect(refusalOf('ln')).toBe('« ln » : écris ln(x) avec des parenthèses.');
	});

	// Presque toujours une erreur : on refuse même si les lettres existent
	it('refuse `ln x` même quand la lettre l est posée', () => {
		expect(refusalOf('ln x', session('l = 2'))).toBe(
			'« ln x » : écris ln(x) avec des parenthèses.'
		);
	});

	it('refuse `cos x` même quand c, o et s sont posées', () => {
		expect(refusalOf('cos x', session('c = 1', 'o = 2', 's = 3'))).toBe(
			'« cos x » : écris cos(x) avec des parenthèses.'
		);
	});

	it.each(['text', 'mathfield'] as const)(
		'la carte d’une fonction porte le même refus (%s)',
		(provenance) => {
			expect(parseDefinition('function', 'ln x + 1', provenance).error).toBe(
				'« ln x » : écris ln(x) avec des parenthèses.'
			);
			expect(parseDefinition('function', '\\ln x', 'mathfield').error).toBeUndefined();
		}
	);

	it('refuse aussi un `ln x` sans antislash venu d’un champ MathLive', () => {
		expect(refusalOf('ln x', session(), 'mathfield')).toBe(
			'« ln x » : écris ln(x) avec des parenthèses.'
		);
	});
});

describe('les écritures justes restent lues', () => {
	it.each([
		['ln(x)', 'text', '\\ln\\left( x \\right)'],
		['2 ln(x)', 'text', '2 \\ln\\left( x \\right)'],
		['\\ln x', 'mathfield', '\\ln\\left( x \\right)'],
		['\\sin x', 'mathfield', '\\sin\\left( x \\right)'],
		['sin^2(x)', 'text', '\\sin^2\\left( x \\right)'],
		['sqrt[3](8)', 'text', '2'],
		['log_2(8)', 'text', '3']
	] as const)('« %s » (%s)', (text, provenance, latex) => {
		const result = runInput(session(), text, provenance);
		expect(result.kind).toBe('calcul');
		expect(result.kind === 'calcul' && result.latex).toBe(latex);
	});

	it('`\\ln x` du clavier MathLive s’évalue en x = 1', () => {
		const result = runInput(session(), '.évaluer \\ln x en x=1', 'mathfield');
		expect(result.kind === 'commande' && result.output).toBe('0');
	});

	it('`f(x) = \\ln x` du clavier MathLive définit ln de x', () => {
		const s = session();
		runInput(s, 'f(x) = \\ln x', 'mathfield');
		expect(s.atelier.get('f')?.status).toBe('ok');
		const value = runInput(s, 'f(1)');
		expect(value.kind === 'calcul' && value.output).toBe('0');
	});

	it('`l n` écrit avec une espace reste le produit de deux lettres', () => {
		const result = runInput(session('l = 2'), 'l n');
		expect(result.kind).toBe('calcul');
		expect(result.kind === 'calcul' && result.latex).toBe('l n');
	});

	it('`b c` avec deux valeurs posées reste leur produit', () => {
		const result = runInput(session('b = 2', 'c = 3'), 'b c');
		expect(result.kind === 'calcul' && result.output).toBe('6');
	});

	it('`.dériver ln(x)` reste calculée', () => {
		const result = runInput(session(), '.dériver ln(x)');
		expect(result.kind).toBe('commande');
	});
});
