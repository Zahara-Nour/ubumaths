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
import type { AtelierObject } from './types';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction } from '$lib/grapheur/types';

/**
 * Les courbes posées par l'atelier, par nom d'objet.
 *
 * Tenue à part du grapheur : celui-ci ne connaît pas les noms de l'atelier, et
 * il ne doit pas avoir à les connaître. C'est aussi ce qui garantit qu'on ne
 * touche jamais aux courbes ajoutées à la main dans `/grapheur`.
 *
 * ⚠️ Clé sur le COUPLE (atelier, grapheur), et pas sur le seul grapheur : deux
 * ateliers partageant un même grapheur partiraient sinon en ping-pong — chaque
 * synchronisation retirerait les courbes de l'autre, dont l'effet les reposerait.
 * L'invariant est structurel plutôt que supposé.
 */
const posted = new WeakMap<Atelier, WeakMap<GrapheurStore, Map<string, string>>>();

/** Ce qu'une courbe doit valoir, ou `null` si l'objet ne doit pas être tracé. */
interface Wanted {
	readonly definition: string;
	/**
	 * Une courbe reste EN PLACE, masquée, tant que son objet ne peut rien
	 * produire.
	 *
	 * ⚠️ La retirer puis la recréer lui donnerait un nouvel identifiant et une
	 * nouvelle couleur : en pleine saisie, chaque frappe intermédiaire fautive
	 * ferait changer la courbe de couleur. Seul un retrait VOULU la supprime.
	 */
	readonly visible: boolean;
}

function wantedFor(object: AtelierObject): Wanted | null {
	if (object.kind !== 'function' || !object.plotted) return null;
	return { definition: object.definition, visible: object.status === 'ok' };
}

/**
 * Mettre le grapheur en accord avec l'atelier.
 *
 * ⚠️ **Idempotente** : appelée deux fois sans changement, elle ne fait rien.
 * Sans cela, chaque frappe recréerait les courbes et le graphe clignoterait.
 */
export function syncPlots(atelier: Atelier, graph: GrapheurStore): void {
	const perGraph = posted.get(atelier) ?? new WeakMap<GrapheurStore, Map<string, string>>();
	posted.set(atelier, perGraph);
	const mine = perGraph.get(graph) ?? new Map<string, string>();
	perGraph.set(graph, mine);

	const wanted = new Map<string, Wanted>();
	for (const object of atelier.objects) {
		const target = wantedFor(object);
		if (target !== null) wanted.set(object.name, target);
	}

	// Retirer ce qui ne doit plus être tracé.
	for (const [name, id] of mine) {
		if (!wanted.has(name)) {
			graph.removeFunction(id);
			mine.delete(name);
		}
	}

	// Poser ou mettre à jour le reste.
	for (const [name, target] of wanted) {
		const id = mine.get(name);
		if (id === undefined) {
			const fresh = graph.addFunction(target.definition);
			if (!target.visible) graph.updateFunction(fresh, { visible: false });
			mine.set(name, fresh);
			continue;
		}

		const current = graph.getFunction(id);
		if (current === undefined) {
			// La courbe a disparu du grapheur (effacement manuel) : on la repose.
			const fresh = graph.addFunction(target.definition);
			if (!target.visible) graph.updateFunction(fresh, { visible: false });
			mine.set(name, fresh);
			continue;
		}

		// N'écrire que ce qui diffère : c'est cette condition qui rend la
		// synchronisation idempotente, donc l'effet qui l'appelle non bouclant.
		const changes: { latex?: string; visible?: boolean } = {};
		if (isExplicitFunction(current) && current.latex !== target.definition) {
			changes.latex = target.definition;
		}
		if (current.visible !== target.visible) changes.visible = target.visible;
		if (Object.keys(changes).length > 0) graph.updateFunction(id, changes);
	}
}
