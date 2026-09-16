/**
 * Atelier — reporter les objets tracés vers le grapheur
 *
 * **Option B**, tranchée le 2026-09-16 : l'atelier détient l'état, le grapheur
 * le reflète. Un seul sens — rien de ce qui se passe dans le grapheur ne remonte
 * vers l'atelier, sinon il y aurait deux vérités, et c'est précisément ce que la
 * décision figée n° 1 interdit.
 *
 * Conséquence visible : modifier `f` dans le panneau redessine sa courbe, sans
 * que l'élève ait à re-tracer.
 *
 * @module atelier/plot-sync
 */

import type { Atelier } from './atelier.svelte';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction } from '$lib/grapheur/types';

/**
 * Les courbes posées par l'atelier, par nom d'objet.
 *
 * Tenue à part du grapheur : celui-ci ne connaît pas les noms de l'atelier, et
 * il ne doit pas avoir à les connaître. C'est aussi ce qui garantit qu'on ne
 * touche jamais aux courbes ajoutées à la main dans `/grapheur`.
 */
const posted = new WeakMap<GrapheurStore, Map<string, string>>();

/** Ce qu'un objet doit donner au grapheur, ou `null` s'il ne peut rien donner. */
function drawable(atelier: Atelier, name: string): string | null {
	const object = atelier.get(name);
	if (!object || object.kind !== 'function') return null;
	// Un objet qui ne peut rien produire ne peuple pas le graphe : une courbe
	// absente sans explication est pire qu'une action désactivée qui en donne une.
	if (object.status !== 'ok' || !object.plotted) return null;
	return object.definition;
}

/**
 * Mettre le grapheur en accord avec l'atelier.
 *
 * ⚠️ **Idempotente** : appelée deux fois sans changement, elle ne fait rien.
 * Sans cela, chaque frappe recréerait les courbes et le graphe clignoterait.
 */
export function syncPlots(atelier: Atelier, graph: GrapheurStore): void {
	const mine = posted.get(graph) ?? new Map<string, string>();
	posted.set(graph, mine);

	const wanted = new Map<string, string>();
	for (const object of atelier.objects) {
		const definition = drawable(atelier, object.name);
		if (definition !== null) wanted.set(object.name, definition);
	}

	// Retirer ce qui ne doit plus être tracé.
	for (const [name, id] of mine) {
		if (!wanted.has(name)) {
			graph.removeFunction(id);
			mine.delete(name);
		}
	}

	// Poser ou mettre à jour le reste.
	for (const [name, definition] of wanted) {
		const id = mine.get(name);
		if (id === undefined) {
			mine.set(name, graph.addFunction(definition));
			continue;
		}
		const current = graph.getFunction(id);
		if (current === undefined) {
			// La courbe a disparu du grapheur (effacement manuel) : on la repose.
			mine.set(name, graph.addFunction(definition));
		} else if (isExplicitFunction(current) && current.latex !== definition) {
			graph.updateFunction(id, { latex: definition });
		}
	}
}
