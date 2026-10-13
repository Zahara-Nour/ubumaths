/**
 * La droite y = x, grise en pointillés, tracée d'office quand f ET sa carte
 * f⁻¹ sont affichées dans le Graphe (décision (3) de David, 2026-10-13).
 * Retirée dès que l'une est masquée ou supprimée. Pas une carte, jamais
 * sauvegardée : elle n'existe que dans le grapheur.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { isExplicitFunction, type ExplicitFunction } from '$lib/grapheur/types';

// =============================================================================
// Décor
// =============================================================================

/** f tracée, puis sa carte f⁻¹ (tracée elle aussi, comme f). */
function withReciprocal(definition = '2x+3'): { desk: CalcDesk; graph: GrapheurStore } {
	const desk = new CalcDesk(new Atelier());
	desk.submit(`f(x) = ${definition}`);
	desk.atelier.setPlotted('f', true);
	desk.submit('.réciproque f');
	const graph = new GrapheurStore(null);
	syncPlots(desk.atelier, graph);
	return { desk, graph };
}

/** Les droites y = x posées dans le grapheur. */
function identityLines(graph: GrapheurStore): ExplicitFunction[] {
	return graph.functions.filter(
		(c): c is ExplicitFunction => isExplicitFunction(c) && c.latex === 'x'
	);
}

// =============================================================================
// Tests
// =============================================================================

describe('la droite y = x', () => {
	it('f et f⁻¹ tracées : y = x grise, en pointillés, avec un token de couleur', () => {
		const { graph } = withReciprocal();
		expect(graph.functions).toHaveLength(3);
		const [line] = identityLines(graph);
		expect(line).toMatchObject({
			visible: true,
			lineStyle: 'dashed',
			color: 'var(--color-muted-foreground)'
		});
	});

	it('idempotente : une seconde synchronisation ne pose rien de plus', () => {
		const { desk, graph } = withReciprocal();
		syncPlots(desk.atelier, graph);
		expect(identityLines(graph)).toHaveLength(1);
		expect(graph.functions).toHaveLength(3);
	});

	it.each(['f', 'f^-1'])('%s masquée : y = x retirée, puis reposée', (name) => {
		const { desk, graph } = withReciprocal();
		desk.atelier.setPlotted(name, false);
		syncPlots(desk.atelier, graph);
		expect(identityLines(graph)).toHaveLength(0);
		desk.atelier.setPlotted(name, true);
		syncPlots(desk.atelier, graph);
		expect(identityLines(graph)).toHaveLength(1);
	});

	it('la carte f⁻¹ supprimée : y = x retirée', () => {
		const { desk, graph } = withReciprocal();
		desk.remove('f^-1');
		syncPlots(desk.atelier, graph);
		expect(identityLines(graph)).toHaveLength(0);
		expect(graph.functions).toHaveLength(1);
	});

	it('f devenue non bijective (carte f⁻¹ en erreur) : y = x retirée', () => {
		const { desk, graph } = withReciprocal();
		desk.submit('f(x) = x^2');
		syncPlots(desk.atelier, graph);
		expect(identityLines(graph)).toHaveLength(0);
	});

	it('f seule tracée, sans carte f⁻¹ : pas de droite', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = 2x+3');
		desk.atelier.setPlotted('f', true);
		const graph = new GrapheurStore(null);
		syncPlots(desk.atelier, graph);
		expect(identityLines(graph)).toHaveLength(0);
	});

	it('pas une carte : l’atelier ne la connaît pas, elle ne se sauvegarde pas', () => {
		const { desk } = withReciprocal();
		expect(desk.atelier.names).toEqual(['f', 'f^-1']);
		expect(JSON.stringify(desk.atelier.serialize())).not.toContain('muted-foreground');
	});
});
