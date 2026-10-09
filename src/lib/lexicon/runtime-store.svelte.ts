/**
 * Chargement à la demande du repérage des mots cliquables
 *
 * `MarkdownRenderer` est chargé par presque toutes les pages : il ne doit pas
 * embarquer le dictionnaire. Le module `runtime` est importé au premier énoncé
 * qui demande des mots cliquables ; les rendus se mettent à jour quand il
 * arrive (le texte s'affiche d'abord sans soulignement).
 *
 * @module lexicon/runtime-store
 */

import type * as Runtime from './runtime';

export type LexiconRuntime = typeof Runtime;

let current = $state<LexiconRuntime | null>(null);
let loading: Promise<void> | null = null;

/** Le repérage et les fiches, s'ils sont chargés (lecture réactive). */
export function lexiconRuntime(): LexiconRuntime | null {
	return current;
}

/** Lancer le chargement, une seule fois. */
export function loadLexiconRuntime(): void {
	loading ??= import('./runtime').then((module) => {
		current = module;
	});
}
