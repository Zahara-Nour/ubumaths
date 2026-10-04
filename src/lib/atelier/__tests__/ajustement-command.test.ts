/**
 * `.ajustement` tapé dans l'atelier (manche 15, PR c, Q173-Q177) : le nom
 * français et les options après « ; » arrivent bien jusqu'au moteur (la vue
 * Calcul montre le texte : c'est lui qu'on vérifie).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';

function run(text: string) {
	const result = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, text);
	expect(result.kind).toBe('commande');
	return result.kind === 'commande' ? result : null;
}

describe('`.ajustement` dans l’atelier', () => {
	it('prévision : extrapolation', () => {
		const result = run('.ajustement 1,2,3,4,5,6 : 12,15,19,22,27,30 ; x = 8');

		expect(result?.output).toContain('Point moyen : G(3,5 ; 20,833)');
		expect(result?.output).toContain('Pour x = 8 : y ≈ 37,419 (extrapolation)');
	});

	it('changement de variable : la droite en z', () => {
		const result = run('.ajustement 0,1,2,3,4,5 : 2.1,3,4.6,6.9,10.2,15.4 ; z = ln(y) ; x = 7');

		expect(result?.output).toContain('z = 0,401x + 0,723');
		expect(result?.output).toContain('Pour x = 7 : y ≈ 34,152 (extrapolation)');
	});
});
