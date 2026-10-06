/**
 * L'atelier : `.dériver`, `.résoudre`, `.intégrer` calculent en x, sauf `; v`.
 *
 * Décision de David (2026-10-06) : plus aucune devinette (ni « dernier mot »,
 * ni « seule variable libre »). Quand x n'apparaît pas et qu'aucune variable
 * n'est donnée, la réponse est calculée en x ET la ligne porte une indication
 * (`note`), affichée avec la réponse.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function command(input: string): Extract<CalcResult, { kind: 'commande' }> {
	const outcome = runInput(session(), input);
	expect(outcome.kind).toBe('commande');
	if (outcome.kind !== 'commande') throw new Error(JSON.stringify(outcome));
	return outcome;
}

const hint = (name: string) =>
	`Calcul par rapport à x. Pour une autre variable, écris « ; ${name} ».`;

describe('.dériver', () => {
	it('`t^2` : 0, avec l’indication', () => {
		const outcome = command('.dériver t^2');
		expect(outcome.latex).toBe('0');
		expect(outcome.note).toBe(hint('t'));
	});

	it.each([
		['.dériver t^2 ; t', '2 t'],
		['.dériver a x^2 + b x', '2 a x + b'],
		['.dériver x^2 y', '2 x y']
	])('%s → %s, sans indication', (input, latex) => {
		const outcome = command(input);
		expect(outcome.latex).toBe(latex);
		expect(outcome.note).toBeUndefined();
	});

	it('l’indication n’est pas répétée dans le texte de la ligne', () => {
		expect(command('.dériver t^2').output).not.toContain('Calcul par rapport');
	});

	it('`sin x` : refus, des parenthèses', () => {
		expect(runInput(session(), '.dériver sin x')).toEqual({
			kind: 'refus',
			message: 'Écris sin(x) avec des parenthèses.'
		});
	});

	it('`.dériver f` reste en x, sans indication', () => {
		const s = session();
		runInput(s, 'f(x) = x^3');
		const outcome = runInput(s, '.dériver f');
		expect(outcome).toMatchObject({ kind: 'commande', latex: '3 x^2' });
		expect(outcome.kind === 'commande' && outcome.note).toBeFalsy();
	});
});

describe('.résoudre', () => {
	it('`3 = 2 x` : le x final fait partie de l’équation', () => {
		expect(command('.résoudre 3 = 2 x').latex).toBe('x = \\dfrac{3}{2}');
	});

	it('`3 = 2t ; t` : t = 3/2, étapes comprises, en t', () => {
		const outcome = command('.résoudre 3 = 2t ; t');
		expect(outcome.latex).toBe('t = \\dfrac{3}{2}');
		expect(outcome.note).toBeUndefined();
		const steps = JSON.stringify(outcome.steps);
		expect(steps).toContain('isoler t');
		expect(steps).not.toContain('isoler x');
	});

	it('`x^2 = 4` : ±2', () => {
		const latex = command('.résoudre x^2 = 4').latex ?? '';
		expect(latex).toContain('-2');
		expect(latex).toContain('2');
	});

	it('`3 = 2t` sans « ; » : pas de t = 3/2 deviné, l’indication', () => {
		const outcome = command('.résoudre 3 = 2t');
		expect(outcome.latex ?? '').not.toContain('t =');
		expect(outcome.note).toBe(hint('t'));
	});

	it('`sin x = 0` : refus, des parenthèses', () => {
		expect(runInput(session(), '.résoudre sin x = 0')).toEqual({
			kind: 'refus',
			message: 'Écris sin(x) avec des parenthèses.'
		});
	});
});

describe('.intégrer', () => {
	it('`x^2 y` : en x', () => {
		expect(command('.intégrer x^2 y').output).toBe('∫ x^2y dx = {1/3}x^3y + C');
	});

	it('`x^2 y ; y`', () => {
		expect(command('.intégrer x^2 y ; y').output).toBe('∫ x^2y dy = {1/2}x^2y^2 + C');
	});

	it('`t` : en x, avec l’indication', () => {
		const outcome = command('.intégrer t');
		expect(outcome.output).toBe('∫ t dx = tx + C');
		expect(outcome.note).toBe(hint('t'));
	});
});

describe('la note de `.dériver f` passe par `note` (visible avec le LaTeX)', () => {
	it('« f′ existe déjà » au second `.dériver f`', () => {
		const s = session();
		runInput(s, 'f(x) = x^3');
		runInput(s, '.dériver f');
		const again = runInput(s, '.dériver f');
		expect(again).toMatchObject({ kind: 'commande', latex: '3 x^2', note: 'f′ existe déjà' });
		expect(again.kind === 'commande' && again.output).not.toContain('existe déjà');
	});
});
