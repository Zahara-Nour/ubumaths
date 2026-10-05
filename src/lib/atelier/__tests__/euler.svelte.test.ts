/**
 * Le nombre e dans l'atelier — retour de David (2026-10-05) : `f(x) = e^x`
 * créée dans Calcul ne se traçait pas, et `.deriver f` rendait une ligne vide.
 *
 * Cause mesurée : `expressionOf` écrivait le nombre d'Euler `\euler` (notation
 * « custom »), que ni le parseur du grapheur ni le moteur de Calcul ne lisent
 * (« Unknown command: \euler »). `e` est un nom réservé de l'atelier : il peut
 * donc s'écrire `e`, que les deux lisent comme Euler.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { syncPlots } from '../plot-sync';
import { runInput } from '../calcul';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Décor
// =============================================================================

/** La courbe posée pour `f`, après synchronisation. */
function curveFor(definition: string) {
	const d = new CalcDesk(new Atelier());
	d.submit(`f(x)=${definition}`);
	const graph = new GrapheurStore(null);
	syncPlots(d.atelier, graph);
	return graph.functions[0] as { latex: string; parseError?: string; visible: boolean };
}

// =============================================================================
// Le tracé
// =============================================================================

describe('le nombre e se trace', () => {
	it.each(['e^x', '3e^{-x}', 'e^{x^2}', 'x e^x', '2e'])(
		'f(x) = %s est lue par le grapheur',
		(definition) => {
			const curve = curveFor(definition);

			expect(curve.parseError).toBeUndefined();
			expect(curve.visible).toBe(true);
		}
	);

	// ⚠️ La revue l'a montré : `pi*x` reste « en attente » (lu p·i), sa courbe
	// n'est jamais lue — un test sur la seule absence d'erreur passait sans rien
	// prouver. On écrit π en LaTeX et on exige une courbe VISIBLE.
	it('π aussi : \\pi x se trace', () => {
		const curve = curveFor('\\pi x');

		expect(curve.parseError).toBeUndefined();
		expect(curve.visible).toBe(true);
	});

	it('la dérivée de e^x se trace aussi', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('f(x)=e^x');
		d.runFromPanel('derive', 'f');
		const graph = new GrapheurStore(null);

		syncPlots(d.atelier, graph);

		const curves = graph.functions as { parseError?: string }[];
		expect(curves).toHaveLength(2);
		expect(curves.every((c) => c.parseError === undefined)).toBe(true);
	});
});

// =============================================================================
// Les commandes
// =============================================================================

describe('le nombre e dans une commande', () => {
	it('.deriver f répond quand f(x) = e^x', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('f(x)=e^x');

		d.submit('.deriver f');

		expect(d.entries[1].failed).toBe(false);
		expect(d.entries[1].text).toContain('e^x');
	});

	it('f(1) vaut e, écrit e (valeur exacte), pas \\euler', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('f(x)=e^x');

		d.submit('f(1)');

		expect(d.entries[1].text).toBe('e');
	});
});

// =============================================================================
// Un échec du moteur se dit
// =============================================================================

describe('une commande que le moteur ne lit pas', () => {
	it.each(['.deriver )(', '.resoudre )'])(
		'%s est refusée en français, pas une ligne vide',
		(input) => {
			const s = { atelier: new Atelier(), engine: new WebReplEngine() };

			const result = runInput(s, input, 'text');

			expect(result.kind).toBe('refus');
			expect(result.kind === 'refus' && result.message).toMatch(/^Je n’ai pas su lire/);
		}
	);
});
