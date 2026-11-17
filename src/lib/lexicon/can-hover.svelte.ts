/**
 * L'appareil a-t-il un survol (souris, pavé tactile) ?
 *
 * Mots du dictionnaire masqués (R6) : à la souris, le survol les révèle ; au
 * doigt, il n'y a pas de survol, donc pas de mot cliquable — toucher un mot ne
 * doit pas ouvrir une fiche par surprise (B4).
 *
 * @module lexicon/can-hover
 */

import { MediaQuery } from 'svelte/reactivity';

// Créée au premier usage : rien à évaluer côté serveur ; repli = souris
let query: MediaQuery | null = null;

/** Vrai si un pointeur peut survoler (lecture réactive). */
export function canHover(): boolean {
	query ??= new MediaQuery('(hover: hover)', true);
	return query.current;
}
