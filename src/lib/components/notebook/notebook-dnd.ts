/**
 * Réordonner les cellules d'un notebook — ce qui entre dans le CONTENU
 *
 * Extrait de la vue parce que l'enjeu n'est pas le geste, mais ce qu'il écrit :
 * les cellules réordonnées vont directement dans `notebook.content.cells`, et
 * l'autosave sérialise ce contenu tel quel.
 *
 * @module components/notebook/notebook-dnd
 */

import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';

/** La copie « ombre » que `svelte-dnd-action` promène pendant le geste. */
export function estOmbre(cellule: unknown): boolean {
	return Boolean((cellule as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
}

/**
 * Les cellules à écrire dans le notebook, pendant et après le geste.
 *
 * ⚠️ La bibliothèque REMPLACE la cellule tirée par son ombre, qui porte un
 * identifiant SENTINELLE (`id:dnd-shadow-placeholder-0000`) à la place du
 * sien. On lui rend le vrai avant toute écriture, pour deux raisons :
 *
 * 1. l'autosave est un débounce de 2 s qui sérialise `content` tel quel. Une
 *    modification faite juste avant un glisser l'arme ; s'il tombe pendant le
 *    geste, la sentinelle part en base comme identifiant de cellule — elle
 *    passe la validation, les identifiants de cellule étant des chaînes
 *    opaques (`cell-<horodatage>-<aléa>`, jamais des UUID) — et le vrai
 *    identifiant est perdu, avec tout ce qui s'y accroche ;
 * 2. la clé du `{#each}` cessait d'être stable : elle changeait DEUX fois par
 *    glisser, ce qui remontait la cellule — son éditeur compris.
 *
 * Une seule zone de dépose ici : l'ombre remplace la cellule, elle ne s'ajoute
 * pas. Lui rendre son identifiant ne crée donc jamais de doublon.
 *
 * @param items     les cellules rendues par la bibliothèque
 * @param tireeId   l'identifiant de la cellule tirée (`event.detail.info.id`)
 */
export function cellulesApresGeste<T extends { id: string }>(items: T[], tireeId: string): T[] {
	return items.map((cellule) => (estOmbre(cellule) ? { ...cellule, id: tireeId } : cellule));
}
