/**
 * `L = 1,5 ; 2 ; 3,5` tapé dans Calcul : la carte qui apparaît dans le panneau
 * est celle d'une LISTE — mêmes actions que la carte « + Liste ».
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '$lib/atelier/calcul';
import { menuItemOf, openCardMenu } from './harness/function-card';

describe('une liste tapée dans Calcul, vue dans le panneau', () => {
	it('sa carte propose l’action Statistiques', async () => {
		const atelier = new Atelier();
		runInput({ atelier, engine: new WebReplEngine(), seed: () => 1 }, 'L = 1,5 ; 2 ; 3,5');
		const { container } = await render(WithAtelier, { atelier });

		// Dans le menu de sa carte (lot 4a de la refonte)
		const menu = await openCardMenu(container, 'L');

		expect(menuItemOf(menu, 'Statistiques')).toBeTruthy();
	});
});
