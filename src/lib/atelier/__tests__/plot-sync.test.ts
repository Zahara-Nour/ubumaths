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
import { isExplicitFunction } from '$lib/grapheur/types';

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

	// Un objet qui ne peut rien produire n'affiche rien — mais sa courbe reste en
	// place, masquée, pour ne pas changer de couleur à chaque frappe (voir plus
	// bas « la courbe garde son identité »).
	it('n’affiche pas un objet en attente ou en erreur', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		atelier.create({ kind: 'function', name: 'g', definition: 'x^^2' });
		atelier.setPlotted('f', true);
		atelier.setPlotted('g', true);

		syncPlots(atelier, graph);
		expect(graph.visibleFunctions).toHaveLength(0);
	});

	it('affiche dès que l’objet en attente est complété', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);
		expect(graph.visibleFunctions).toHaveLength(0);

		atelier.createFromOffer('a');
		syncPlots(atelier, graph);

		// ⚠️ **Ce test vérifiait `['a*x']`** — la chaîne transmise. Mesuré le
		// 2026-09-16 : le grapheur parse `a*x` SANS ERREUR, garde la courbe
		// visible, et ne dessine RIEN, parce que ses `parameters` sont vides et
		// que `a` y est une variable libre. La chaîne était juste, l'écran vide.
		//
		// Ce qui compte, c'est que la courbe soit DESSINABLE : plus aucune
		// variable libre en dehors de `x`.
		expect(graph.visibleFunctions).toHaveLength(1);
		const curve = graph.visibleFunctions[0];
		expect(isExplicitFunction(curve) && curve.latex).not.toContain('a');
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

// =============================================================================
// Ce que la revue #337 a trouvé
// =============================================================================

describe('la courbe garde son identité', () => {
	// ⚠️ Retirer puis recréer donne un nouvel id ET une nouvelle couleur. Dès que
	// la définition sera éditable, chaque faute de frappe intermédiaire ferait
	// changer la courbe de couleur — le clignotement que l'idempotence évite.
	it('ne change ni d’identité ni de couleur en traversant une erreur', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		const id = graph.functions[0]?.id;
		const couleur = graph.functions[0]?.color;

		atelier.update('f', 'x^^'); // frappe intermédiaire : erreur
		syncPlots(atelier, graph);

		atelier.update('f', 'x^3'); // l'élève finit sa saisie
		syncPlots(atelier, graph);

		expect(graph.functions[0]?.id).toBe(id);
		expect(graph.functions[0]?.color).toBe(couleur);
		expect(drawn(graph)).toEqual(['x^3']);
	});

	it('masque la courbe tant que l’objet ne peut rien produire', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		atelier.update('f', 'a*x'); // en attente de a
		syncPlots(atelier, graph);

		expect(graph.functions).toHaveLength(1);
		expect(graph.functions[0]?.visible).toBe(false);
	});

	it('la remontre dès que l’objet redevient utilisable', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		atelier.createFromOffer('a');
		syncPlots(atelier, graph);

		expect(graph.functions[0]?.visible).toBe(true);
	});

	// Retirer volontairement, en revanche, retire bien la courbe
	it('retire vraiment la courbe quand l’élève la retire', () => {
		const atelier = new Atelier();
		const graph = new GrapheurStore(null);
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		syncPlots(atelier, graph);

		atelier.setPlotted('f', false);
		syncPlots(atelier, graph);

		expect(graph.functions).toHaveLength(0);
	});
});
