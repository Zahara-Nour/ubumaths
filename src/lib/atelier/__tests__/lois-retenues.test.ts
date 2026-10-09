/**
 * L'atelier RETIENT la loi d'une variable aléatoire (décision de David,
 * 2026-10-09) : après `.binomiale X 10 0,3`, `P(X ⩽ 3)` tapé seul dans Calcul
 * se calcule — même texte, mêmes valeurs que la ligne de la loi. Aucune liste
 * créée (Q142) ; rien de rangé d'une visite à l'autre.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { ATELIER_STATE_VERSION } from '../persistence';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import type { LawScene } from '$lib/ubumark/utils/stat-chart-scene';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Taper les lignes dans l'ordre ; rend le résultat de la dernière */
function typed(s: CalcSession, ...inputs: string[]) {
	let result = runInput(s, inputs[0]);
	for (const input of inputs.slice(1)) result = runInput(s, input);
	return result;
}

/** La sortie d'une ligne qui doit se calculer */
function output(s: CalcSession, input: string): string {
	const result = runInput(s, input);
	expect(result.kind, JSON.stringify(result)).toBe('commande');
	return result.kind === 'commande' ? result.output : '';
}

function refusal(s: CalcSession, input: string): string {
	const result = runInput(s, input);
	expect(result.kind, JSON.stringify(result)).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
}

/** La ligne de probabilité que donne la commande de loi, option comprise */
function lawLine(command: string): string {
	const result = runInput(session(), command);
	if (result.kind !== 'commande') throw new Error(JSON.stringify(result));
	const scene = result.chart as LawScene;
	return scene.indicators[scene.indicators.length - 1];
}

describe('P(X ⩽ 3) après .binomiale X 10 0,3', () => {
	it('se calcule : 0,6496 ≈ 0,650, la ligne même de la loi', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		const line = output(s, 'P(X ⩽ 3)');
		expect(line).toContain('≈ 0,650');
		expect(line).toBe(lawLine('.binomiale X 10 0,3 P(X ⩽ 3)'));
	});

	it.each([
		'P(X ⩽ 3)',
		'P(X ≤ 3)',
		'P(X <= 3)',
		'P(X\\leqslant 3)',
		'P(X\\leq 3)',
		'P(X\\le 3)',
		'P\\left(X\\leqslant3\\right)',
		'P(X<4)'
	])('%s : le même événement, la même valeur', (input) => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		expect(output(s, input)).toContain('≈ 0,650');
	});

	it.each(['P(X ⩾ 3)', 'P(X ≥ 3)', 'P(X >= 3)', 'P(X\\geqslant 3)', 'P(X\\geq 3)', 'P(X>2)'])(
		'%s : le complémentaire',
		(input) => {
			const s = session();
			runInput(s, '.binomiale X 10 0,3');
			expect(output(s, input)).toContain(
				lawLine('.binomiale X 10 0,3 P(X ⩾ 3)').replace(/^.* (≈|=) /, '')
			);
		}
	);

	it('P(2 ⩽ X ⩽ 5) et P(X = 2)', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		expect(output(s, 'P(2 ⩽ X ⩽ 5)')).toBe(lawLine('.binomiale X 10 0,3 P(2 ⩽ X ⩽ 5)'));
		expect(output(s, 'P(X = 2)')).toBe(lawLine('.binomiale X 10 0,3 P(X = 2)'));
	});
});

describe('les autres lois retenues', () => {
	it('.geometrique : la conditionnelle P(X > 5 | X > 2)', () => {
		const s = session();
		runInput(s, '.geometrique X 0,2');
		expect(output(s, 'P(X > 5 | X > 2)')).toBe(lawLine('.geometrique X 0,2 P(X > 5 | X > 2)'));
	});

	it('.exponentielle, saisie LaTeX et virgule décimale', () => {
		const s = session();
		runInput(s, '.exponentielle T 0,5');
		expect(output(s, 'P\\left(T\\leqslant2\\right)')).toBe(
			lawLine('.exponentielle T 0,5 P(T ⩽ 2)')
		);
		expect(output(s, 'P(T ⩽ 1{,}5)')).toBe(lawLine('.exponentielle T 0,5 P(T ⩽ 1,5)'));
	});

	it('.uniforme discrète et à densité', () => {
		const s = session();
		runInput(s, '.uniforme X 1 6');
		expect(output(s, 'P(X ⩽ 2)')).toBe(lawLine('.uniforme X 1 6 P(X ⩽ 2)'));
		runInput(s, '.uniforme Y [0 ; 10]');
		expect(output(s, 'P(2 ⩽ Y ⩽ 5)')).toBe('P(2 ⩽ Y ⩽ 5) = 3/10 = 0,3');
	});

	it('deux variables gardées chacune avec sa loi', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		runInput(s, '.exponentielle T 0,5');
		expect(output(s, 'P(X ⩽ 3)')).toContain('≈ 0,650');
		expect(output(s, 'P(T ⩽ 2)')).toBe(lawLine('.exponentielle T 0,5 P(T ⩽ 2)'));
	});
});

describe('redéfinir, oublier, refuser', () => {
	it('une nouvelle loi de X remplace l’ancienne', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		runInput(s, '.geometrique X 0,2');
		expect(output(s, 'P(X ⩽ 3)')).toBe(lawLine('.geometrique X 0,2 P(X ⩽ 3)'));
	});

	it('une commande refusée ne remplace rien', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		expect(typed(s, '.geometrique X 2').kind).toBe('refus');
		expect(output(s, 'P(X ⩽ 3)')).toContain('≈ 0,650');
	});

	it('une variable sans loi : refus qui dit comment la définir', () => {
		expect(refusal(session(), 'P(X ⩽ 3)')).toBe(
			'X n’a pas de loi : définis-la avec une commande de loi (.binomiale, .geometrique, .uniforme, .exponentielle, .normale), par exemple .normale X 0 1'
		);
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		expect(refusal(s, 'P(Y ⩽ 3)')).toContain('Y n’a pas de loi : définis-la');
	});

	it('vider l’atelier oublie les lois', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		s.atelier.restore({ version: ATELIER_STATE_VERSION, objects: [] });
		expect(refusal(s, 'P(X ⩽ 3)')).toContain('X n’a pas de loi');
	});

	it('un événement mal écrit : le message du bloc, sans « Ligne N »', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		const message = refusal(s, 'P(5 ⩽ X ⩽ 2)');
		expect(message).not.toMatch(/Ligne \d/);
		expect(message).toContain('bornes dans l’ordre');
	});

	it('X objet de l’atelier ET variable aléatoire : P(…) lit la loi', () => {
		const s = session();
		runInput(s, 'X = 5');
		runInput(s, '.binomiale X 10 0,3');
		expect(output(s, 'P(X ⩽ 3)')).toContain('≈ 0,650');
		expect(s.atelier.get('X')).toBeDefined();
	});

	it('aucune liste créée (Q142)', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		runInput(s, 'P(X ⩽ 3)');
		expect(s.atelier.objects).toEqual([]);
	});
});
