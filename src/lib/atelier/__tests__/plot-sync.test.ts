/**
 * La courbe suit l'objet — option B, tranchée le 2026-09-16.
 *
 * L'atelier détient l'état, le grapheur le reflète. Un seul sens : rien de ce
 * qui se passe dans le grapheur ne remonte vers l'atelier, sinon il y aurait
 * deux vérités.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';

/** Les expressions actuellement tracées, dans l'ordre. */
function drawn(graph: GrapheurStore): string[] {
	return graph.functions.map((f) => ('latex' in f ? f.latex : ''));
}

describe('report des objets vers le grapheur', () => {
	it('ne trace rien tant que rien n’est demandé', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		syncPlots(atelier, graph);
		expect(drawn(graph)).toEqual([]);
	});

	it('trace un objet marqué', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);

		syncPlots(atelier, graph);
		expect(drawn(graph)).toEqual(['x^2']);
	});

	// LE point de l'option B : modifier l'objet redessine la courbe
	it('suit la définition quand elle change', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		atelier.update('f', 'x^3');
		syncPlots(atelier, graph);

		expect(drawn(graph)).toEqual(['x^3']);
	});

	it('retire la courbe quand l’objet n’est plus tracé', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		atelier.setPlotted('f', false);
		syncPlots(atelier, graph);

		expect(drawn(graph)).toEqual([]);
	});

	it('retire la courbe quand l’objet est supprimé', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		atelier.remove('f');
		syncPlots(atelier, graph);

		expect(drawn(graph)).toEqual([]);
	});

	// Un objet qui ne peut rien produire ne doit pas peupler le grapheur
	it('ne trace pas un objet en attente ou en erreur', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		atelier.create({ kind: 'function', name: 'g', definition: 'x^^2' });
		atelier.setPlotted('f', true);
		atelier.setPlotted('g', true);

		syncPlots(atelier, graph);
		expect(drawn(graph)).toEqual([]);
	});

	it('trace dès que l’objet en attente est complété', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);
		expect(drawn(graph)).toEqual([]);

		atelier.createFromOffer('a');
		syncPlots(atelier, graph);
		expect(drawn(graph)).toEqual(['a*x']);
	});

	// ⚠️ Idempotence : re-synchroniser sans changement ne doit RIEN faire, sinon
	// chaque frappe recréerait les courbes et ferait clignoter le graphe.
	it('ne refait rien quand rien n’a changé', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);

		syncPlots(atelier, graph);
		const idBefore = graph.functions[0]?.id;
		syncPlots(atelier, graph);

		expect(graph.functions).toHaveLength(1);
		expect(graph.functions[0]?.id).toBe(idBefore);
	});

	it('ne touche pas aux courbes que l’atelier n’a pas posées', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		graph.addFunction('\\sin(x)'); // ajoutée à la main dans le grapheur

		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		expect(drawn(graph)).toContain('\\sin(x)');
		expect(drawn(graph)).toContain('x^2');
	});
});
