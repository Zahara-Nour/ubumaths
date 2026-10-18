/**
 * « Image d'un nombre » n'est plus une action de la carte d'une fonction.
 *
 * Décision de David (2026-10-18) : `f(2)` s'écrit tout seul dans la console,
 * l'action n'apporte rien. Le geste `image` reste rejouable : un historique
 * exporté avant ce retrait doit toujours se rejouer (cf. aussi
 * `rejeu-calcul.svelte.test.ts`, R4).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';

function withF(definition = 'x^2'): { atelier: Atelier; desk: CalcDesk } {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	return { atelier, desk: new CalcDesk(atelier) };
}

describe('carte d’une fonction sans « Image d’un nombre »', () => {
	it('le menu ne propose plus l’image', () => {
		const { atelier } = withF();

		const actions = actionsFor(atelier.get('f')!, atelier);

		expect(actions.map((a) => a.label)).not.toContain('Image d’un nombre');
		expect(actions.map((a) => a.id)).not.toContain('image');
	});

	it('les autres actions validées restent', () => {
		const { atelier } = withF();

		const ids = actionsFor(atelier.get('f')!, atelier).map((a) => a.id);

		for (const id of ['plot', 'figure', 'derive', 'reciprocal', 'table', 'solve', 'variations']) {
			expect(ids).toContain(id);
		}
	});

	it('le panneau ne prépare plus f( dans la console', () => {
		const { desk } = withF();
		desk.draft = 'g(2)+';

		desk.runFromPanel('image', 'f');

		expect(desk.draft).toBe('g(2)+');
	});

	it('un ancien geste « image » se rejoue toujours', () => {
		const { desk } = withF();

		const result = desk.image('f', '3');

		expect(result.failed).toBe(false);
		expect(result.text).toContain('9');
	});
});
