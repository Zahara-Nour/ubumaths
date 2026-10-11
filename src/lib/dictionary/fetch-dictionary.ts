/**
 * Chargement du dictionnaire dans le navigateur (ADR 0022)
 * ========================================================
 *
 * `/api/dictionnaire` est gardé en cache jusqu'à 5 minutes. L'admin qui vient
 * d'enregistrer une entrée note l'heure (`markDictionaryEdited`) : pendant
 * 5 minutes, ses lectures demandent une version fraîche, sous une adresse qui
 * change à chaque modification (le CDN a pu garder une réponse publique pour
 * une adresse `?frais` fixe, demandée par n'importe qui).
 *
 * @module dictionary/fetch-dictionary
 */

import type { MathTerm } from './model';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const EDITED_KEY = 'chiphre:dictionnaire-modifie';

/** Au-delà, tout le monde (l'admin compris) lit la version publique, à jour. */
const FRESH_WINDOW_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** L'admin vient d'enregistrer : ses prochaines lectures sont fraîches. */
export function markDictionaryEdited(now: number = Date.now()): void {
	try {
		localStorage.setItem(EDITED_KEY, String(now));
	} catch {
		// Stockage refusé (navigation privée) : la modification arrive avec le cache
	}
}

/** Adresse du dictionnaire : fraîche si l'admin a enregistré il y a moins de 5 minutes. */
export function dictionaryUrl(now: number = Date.now()): string {
	let edited = NaN;
	try {
		edited = Number(localStorage.getItem(EDITED_KEY));
	} catch {
		// Pas de stockage (serveur, navigation privée) : version publique
	}
	return edited > 0 && now - edited < FRESH_WINDOW_MS
		? `/api/dictionnaire?frais=${edited}`
		: '/api/dictionnaire';
}

/** Les entrées visibles du dictionnaire ; rejette si le serveur ne répond pas. */
export async function fetchDictionary(fetchFn: typeof fetch = fetch): Promise<MathTerm[]> {
	const url = dictionaryUrl();
	const response = await fetchFn(url, url.includes('?') ? { cache: 'no-store' } : {});
	if (!response.ok) throw new Error(`Dictionnaire indisponible (${response.status})`);
	const entries: unknown = await response.json();
	if (!Array.isArray(entries)) throw new Error('Dictionnaire : réponse inattendue');
	// Entrées validées par le serveur (dictionary/entry-schema)
	return entries as MathTerm[];
}
