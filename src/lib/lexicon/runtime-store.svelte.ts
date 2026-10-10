/**
 * Chargement à la demande du repérage des mots cliquables
 *
 * `MarkdownRenderer` est chargé par presque toutes les pages : il ne doit pas
 * embarquer le repérage. Au premier énoncé qui demande des mots cliquables,
 * le dictionnaire (`/api/dictionnaire`, ADR 0022) et le module `runtime` sont
 * chargés ensemble ; les rendus se mettent à jour quand ils arrivent (le texte
 * s'affiche d'abord sans soulignement).
 *
 * @module lexicon/runtime-store
 */

import { fetchDictionary } from '$lib/dictionary/fetch-dictionary';
import type { Lexicon } from './runtime';

export type LexiconRuntime = Lexicon;

let current = $state<LexiconRuntime | null>(null);
let loading: Promise<void> | null = null;

/** Le repérage et les fiches, s'ils sont chargés (lecture réactive). */
export function lexiconRuntime(): LexiconRuntime | null {
	return current;
}

/** Lancer le chargement, une seule fois ; après un échec (réseau, déploiement), au prochain besoin. */
export function loadLexiconRuntime(): void {
	loading ??= Promise.all([fetchDictionary(), import('./runtime')])
		.then(([entries, module]) => {
			current = module.createLexicon(entries);
		})
		.catch((error: unknown) => {
			// Les énoncés restent lisibles, sans mot cliquable
			console.warn('[mots cliquables] dictionnaire non chargé', error);
			loading = null;
		});
}
