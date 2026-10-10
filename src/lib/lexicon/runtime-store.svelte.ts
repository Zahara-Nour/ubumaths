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

// Un onglet ouvert longtemps relit le dictionnaire au prochain énoncé
// (comportement 3 de docs/wip/dictionnaire-en-base-spec.md : 5 minutes au plus)
const REFRESH_AFTER_MS = 5 * 60 * 1000;

let current = $state<LexiconRuntime | null>(null);
let loading: Promise<void> | null = null;
/** Heure du dernier chargement réussi ; 0 pendant un chargement ou avant le premier. */
let loadedAt = 0;

/** Le repérage et les fiches, s'ils sont chargés (lecture réactive). */
export function lexiconRuntime(): LexiconRuntime | null {
	return current;
}

/**
 * Lancer le chargement, une seule fois ; après un échec (réseau, déploiement),
 * au prochain besoin ; et de nouveau quand le dictionnaire chargé a plus de
 * 5 minutes. Les mots déjà repérés restent affichés pendant le rechargement.
 */
export function loadLexiconRuntime(now: number = Date.now()): Promise<void> {
	if (loadedAt > 0 && now - loadedAt >= REFRESH_AFTER_MS) {
		loadedAt = 0;
		loading = null;
	}
	loading ??= Promise.all([fetchDictionary(), import('./runtime')])
		.then(([entries, module]) => {
			current = module.createLexicon(entries);
			loadedAt = Date.now();
		})
		.catch((error: unknown) => {
			// Les énoncés restent lisibles, sans mot cliquable (ou avec les précédents)
			console.warn('[mots cliquables] dictionnaire non chargé', error);
			loading = null;
		});
	return loading;
}

/** Recharger tout de suite (l'admin vient d'enregistrer une entrée). */
export function refreshLexiconRuntime(): Promise<void> {
	loadedAt = 0;
	loading = null;
	return loadLexiconRuntime();
}
