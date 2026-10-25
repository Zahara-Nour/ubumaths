/**
 * Grapheur — quelle instance un composant doit lire
 *
 * Chaque atelier possède SON grapheur (`new GrapheurStore()`) et le donne aux
 * composants descendants par le contexte Svelte : plusieurs ateliers peuvent
 * coexister sans partager d'état (décision figée n° 1 du cadrage,
 * `docs/archive/wip/atelier-recherche-eleve.md`).
 *
 * Il n'y a aucun repli : un composant du grapheur monté sans fournisseur lève
 * une erreur explicite. Les tests le montent seul avec `grapheurContext(store)` :
 * `render(Comp, { props, context: grapheurContext(store) })`.
 *
 * @module stores/grapheur-context
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { GrapheurStore } from './grapheur.svelte';

const GRAPHEUR_KEY = Symbol('grapheur-store');

/**
 * Donner une instance aux composants descendants.
 *
 * À appeler pendant l'initialisation d'un composant, comme tout `setContext`.
 */
export function provideGrapheurStore(store: GrapheurStore): GrapheurStore {
	setContext(GRAPHEUR_KEY, store);
	return store;
}

/**
 * L'instance qu'un composant doit lire.
 *
 * @throws Error si aucun fournisseur n'est monté au-dessus du composant.
 */
export function useGrapheurStore(): GrapheurStore {
	if (!hasContext(GRAPHEUR_KEY)) {
		throw new Error(
			'Aucun grapheur fourni : monter ce composant sous un fournisseur (provideGrapheurStore), ' +
				'ou, dans un test, avec l’option context: grapheurContext(store).'
		);
	}
	return getContext<GrapheurStore>(GRAPHEUR_KEY);
}

/**
 * Le contexte à passer à `mount` / `render` (option `context`) pour monter un
 * composant seul avec une instance donnée.
 */
export function grapheurContext(store: GrapheurStore): Map<symbol, GrapheurStore> {
	return new Map([[GRAPHEUR_KEY, store]]);
}
