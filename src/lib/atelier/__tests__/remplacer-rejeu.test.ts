/**
 * Annuler un remplacement d'atelier n'est pas un geste rejouable (revue de
 * `atelier-remplacer`) : le remplacement n'a aucune ligne de console, et au
 * rejeu d'un export, « annuler » déferait l'étape d'avant — une vraie saisie.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { ATELIER_STATE_VERSION } from '../persistence';

describe('Annuler un remplacement, dans la console', () => {
	it('la ligne « Annuler » d’un remplacement ne se rejoue pas ; celle d’une saisie, si', () => {
		const atelier = new Atelier();
		const desk = new CalcDesk(atelier);
		desk.submit('a = 3');
		atelier.replaceWith(
			{ version: ATELIER_STATE_VERSION, objects: [{ name: 'g', kind: 'value', definition: '1' }] },
			'remplacer mon atelier'
		);

		desk.undo();
		desk.redo();
		desk.undo();
		desk.undo();

		const lines = desk.entries.filter((e) => e.label === 'Annuler' || e.label === 'Rétablir');
		expect(lines.map((e) => e.replay ?? null)).toEqual([null, null, null, { kind: 'annuler' }]);
		expect(atelier.names).toEqual([]);
	});
});
