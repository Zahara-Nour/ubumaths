/**
 * Lecture du dictionnaire en base (ADR 0022)
 * ==========================================
 *
 * Le site entier lit les mêmes entrées : celles qui ne sont pas masquées,
 * dans l'ordre d'origine (`position` : un renvoi vise le premier terme
 * principal de son nom). Le filtre `hidden` est explicite : l'admin, à qui la
 * RLS montre aussi les entrées masquées, lit le même dictionnaire que les
 * élèves, et le résultat peut être gardé en mémoire pour tous.
 *
 * Une modification est visible au plus tard 5 minutes après (spécification,
 * comportement 3) : 2 min ici, 2 min au CDN, 1 min au navigateur
 * (`/api/dictionnaire`). L'admin demande une lecture fraîche.
 *
 * @module server/dictionary/load
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { MathTerm } from '$lib/dictionary/model';
import { DICTIONARY_COLUMNS, rowToTerm } from '$lib/dictionary/entry-schema';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Durée pendant laquelle une lecture sert à toutes les requêtes de l'instance. */
export const DICTIONARY_MEMO_MS = 2 * 60 * 1000;

/** Base injoignable : la dernière lecture sert encore, mais pas indéfiniment (entrée masquée entre-temps). */
export const DICTIONARY_FALLBACK_MS = 15 * 60 * 1000;

/** Cache de `/api/dictionnaire` : navigateur 1 min, CDN 2 min. */
export const DICTIONARY_PUBLIC_CACHE = 'public, max-age=60, s-maxage=120';
export const DICTIONARY_ADMIN_CACHE = 'private, no-store';

/** PostgREST ne rend pas plus de lignes par requête (`max_rows`). */
const PAGE_SIZE = 1000;

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

let memo: { entries: MathTerm[]; at: number } | null = null;

/** Lecture en cours, partagée par les requêtes qui arrivent en même temps. */
let inflight: Promise<MathTerm[]> | null = null;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * ⚠️ Invariant : le résultat ne dépend pas de l'appelant. La lecture se fait
 * avec le client de la première requête venue (visiteur, élève, admin), puis
 * sert à tous : seul le filtre `hidden` décide, et aucune policy de lecture ne
 * varie selon le lecteur. Une policy par niveau ou par école casserait cette
 * mémoire : lire alors avec un client anonyme dédié.
 */
async function queryDictionary(supabase: SupabaseClient<Database>): Promise<MathTerm[]> {
	const entries: MathTerm[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.from('dictionary_entries')
			.select(DICTIONARY_COLUMNS)
			.eq('hidden', false)
			.order('position')
			.order('id')
			.range(from, from + PAGE_SIZE - 1);
		if (error) throw new Error(`Dictionnaire illisible : ${error.message}`);
		for (const row of data) {
			const term = rowToTerm(row);
			// Une ligne invalide ne doit pas priver le site du reste du dictionnaire
			if (term) entries.push(term);
			// console : le logger du projet est muet en production (logs Vercel)
			else console.error('[dictionnaire] entrée invalide, ignorée :', row.term);
		}
		if (data.length < PAGE_SIZE) return entries;
	}
}

/** Une seule lecture à la fois quand la mémoire expire sous plusieurs requêtes. */
function readOnce(supabase: SupabaseClient<Database>): Promise<MathTerm[]> {
	inflight ??= queryDictionary(supabase).finally(() => {
		inflight = null;
	});
	return inflight;
}

/**
 * Les entrées visibles du dictionnaire. `fresh` relit la base (admin qui vient
 * d'enregistrer) ; sinon une lecture de moins de 2 minutes est réutilisée.
 * Base injoignable : la dernière lecture réussie, si elle a moins de 15 minutes.
 */
export async function loadDictionary(
	supabase: SupabaseClient<Database>,
	{ fresh = false, now = Date.now() }: { fresh?: boolean; now?: number } = {}
): Promise<MathTerm[]> {
	if (!fresh && memo && now - memo.at < DICTIONARY_MEMO_MS) return memo.entries;
	try {
		const entries = fresh ? await queryDictionary(supabase) : await readOnce(supabase);
		memo = { entries, at: now };
		return entries;
	} catch (error) {
		if (memo && now - memo.at < DICTIONARY_FALLBACK_MS) {
			console.error('[dictionnaire] base injoignable, dernière lecture servie', error);
			return memo.entries;
		}
		throw error;
	}
}

/** Oublier la lecture gardée (après un enregistrement de l'admin, et entre deux tests). */
export function forgetDictionary(): void {
	memo = null;
}

/** L'admin (connecté, ou prof élevé) : lui seul voit ses modifications tout de suite. */
export function isDictionaryAdmin(locals: App.Locals): boolean {
	return (
		Boolean(locals.adminElevation?.active && locals.adminSupabase) ||
		(Boolean(locals.user) && locals.profile?.role === 'admin')
	);
}
