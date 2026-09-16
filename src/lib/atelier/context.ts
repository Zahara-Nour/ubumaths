/**
 * Atelier — quelle instance un composant pilote
 *
 * Même principe que `stores/grapheur-context.ts` : l'instance descend par le
 * contexte, jamais par un import de singleton. C'est ce qui permet à deux
 * ateliers de coexister — un atelier ouvert et un atelier reçu par URL en mode
 * éphémère, par exemple (§6).
 *
 * ⚠️ Pas de repli ici, contrairement au grapheur : l'atelier est neuf, aucun
 * composant n'est monté sans conteneur, et un repli masquerait l'oubli au lieu
 * de le signaler.
 *
 * @module atelier/context
 */

import { getContext, setContext } from 'svelte';
import type { Atelier } from './atelier.svelte';

const ATELIER_KEY = Symbol('atelier');

/** Donner l'instance aux composants descendants, à l'initialisation. */
export function provideAtelier(atelier: Atelier): Atelier {
	setContext(ATELIER_KEY, atelier);
	return atelier;
}

/**
 * L'instance que pilote ce composant.
 *
 * Jette si aucun conteneur n'est monté au-dessus : c'est une erreur de montage,
 * et elle doit se voir tout de suite plutôt que produire un écran vide.
 */
export function useAtelier(): Atelier {
	const atelier = getContext<Atelier | undefined>(ATELIER_KEY);
	if (!atelier) {
		throw new Error('useAtelier() sans conteneur : ce composant doit être monté sous un atelier.');
	}
	return atelier;
}
