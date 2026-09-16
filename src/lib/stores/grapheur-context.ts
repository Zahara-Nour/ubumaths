/**
 * Grapheur — quelle instance un composant doit lire
 *
 * Les composants du grapheur importaient jusqu'ici le singleton `grapheurStore`
 * en dur, ce qui rendait une seconde instance impossible : `/calc` et
 * `/grapheur` partageaient donc le même état sans l'avoir décidé, et l'atelier
 * de recherche ne pouvait pas posséder le sien (décision figée n° 1 du cadrage,
 * `docs/wip/atelier-recherche-eleve.md`).
 *
 * @module stores/grapheur-context
 */

import { getContext, hasContext, setContext } from 'svelte';
import { GrapheurStore, grapheurStore } from './grapheur.svelte';

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
 * ⚠️ **Repli sur le singleton** quand aucun fournisseur n'est monté au-dessus.
 * Ce n'est pas une facilité : les composants du grapheur sont montés seuls dans
 * sept fichiers de tests (`render(ParameterInput, …)`), sans parent donc sans
 * contexte. Sans ce repli, le refactor les casserait tous — et un composant
 * monté hors de son conteneur cesserait de fonctionner sans rien dire.
 *
 * Le singleton reste donc l'instance par défaut, et `/grapheur` comme `/calc`
 * gardent exactement le comportement qu'ils avaient.
 */
export function useGrapheurStore(): GrapheurStore {
	return hasContext(GRAPHEUR_KEY) ? getContext<GrapheurStore>(GRAPHEUR_KEY) : grapheurStore;
}
