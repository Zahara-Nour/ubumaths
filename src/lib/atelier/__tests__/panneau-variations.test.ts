/**
 * L'action « Variations » du panneau rend un TABLEAU, pas un bloc de terminal.
 *
 * ⚠️ Ce que l'élève voyait, capture à l'appui :
 *
 *   Expression : x^2-3x+2
 *   Derivee : f'(x) = 2x-3
 *   Signe de f'(x) :
 *     ]-inf ; 3/2[ : -  (f decroissante)
 *     {3/2}        : 0  (f constante)
 *
 * Sans un accent, aligné à l'espace — alors que `VariationTable.svelte` dessine
 * ce tableau depuis toujours, flèches comprises.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';
import type { SignRow, VariationRow } from '$lib/ubumark/types/variation-table';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('« Variations » rend un tableau', () => {
	it('le tableau porte le nom de l’objet, pas un « f » générique', () => {
		const s = session();
		runInput(s, 'g(x) = x^2 - 3x + 2');

		const outcome = runAction(s, 'variations', 'g');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.table).toBeDefined();
		const labels = outcome.table!.rows.map((r) => r.label);
		expect(labels).toEqual(["g'(x)", 'g(x)']);
	});

	it('le signe de la dérivée et le minimum y sont', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const outcome = runAction(s, 'variations', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok || outcome.table === undefined) return;

		const signe = outcome.table.rows.find((r): r is SignRow => r.type === 'sign')!;
		const variation = outcome.table.rows.find((r): r is VariationRow => r.type === 'variation')!;

		expect(signe.values.get('\\dfrac{3}{2}')).toEqual({ type: 'marker', marker: 'zero' });
		expect(variation.values.get('\\dfrac{3}{2}')).toMatchObject({
			expression: '-\\dfrac{1}{4}',
			position: 'bottom'
		});
	});

	it('la sortie du moteur reste en repli, jamais perdue', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const outcome = runAction(s, 'variations', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.output.length).toBeGreaterThan(0);
	});
});

describe('le repli de l’action', () => {
	it('une fonction à asymptote garde le texte du moteur', () => {
		const s = session();
		runInput(s, 'h(x) = 1/x');

		const outcome = runAction(s, 'variations', 'h');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		// ⚠️ La réponse ne disparaît jamais : c'est la seule façon dont ce lot
		// pourrait rendre l'atelier pire qu'avant.
		expect(outcome.table).toBeUndefined();
		expect(outcome.output.length).toBeGreaterThan(0);
	});

	it('les autres actions ne portent pas de tableau', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.table).toBeUndefined();
	});
});

describe('la ligne d’historique reçoit le tableau', () => {
	/**
	 * ⚠️ `runAction` peut produire le tableau sans que la LIGNE le reçoive —
	 * fonction verte, geste mort (#339).
	 */
	it('cliquer « Variations » pousse une entrée qui le porte', () => {
		const desk = new CalcDesk(new Atelier());
		desk.atelier.create({ kind: 'function', name: 'f', definition: 'x^2 - 3x + 2' });

		desk.runFromPanel('variations', 'f');

		expect(desk.entries.length).toBe(1);
		expect(desk.entries[0].table).toBeDefined();
	});
});
