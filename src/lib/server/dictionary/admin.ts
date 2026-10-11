/**
 * Écriture du dictionnaire par l'admin (ADR 0022, comportements 5 à 16)
 * =====================================================================
 *
 * Chaque enregistrement relit tout le dictionnaire (entrées masquées
 * comprises), applique la modification en mémoire et vérifie les règles de
 * cohérence : un refus n'écrit rien. La version précédente est gardée par le
 * trigger de la base (auteur et date posés par elle). Après une écriture, la
 * lecture gardée en mémoire par le serveur est oubliée.
 *
 * Le client reçu est celui de `requireAdmin` : la RLS (`is_admin()`) et le
 * trigger (`auth.uid()`) voient l'admin.
 *
 * @module server/dictionary/admin
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { Database, Json } from '$lib/types/database';
import { newProblems, type CheckedEntry } from '$lib/dictionary/consistency';
import type { AdminDictionaryRow, DictionaryVersion } from '$lib/dictionary/admin-draft';
import {
	DICTIONARY_COLUMNS,
	rowToTerm,
	type DictionaryEntryInput,
	type DictionaryRow
} from '$lib/dictionary/entry-schema';
import { forgetDictionary } from './load';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { AdminDictionaryRow, DictionaryVersion };

/** Résultat d'un enregistrement : la ligne écrite, ou les refus en français. */
export type SaveResult =
	| { ok: true; row: AdminDictionaryRow }
	| { ok: false; status: 400 | 404; problems: string[] };

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const ADMIN_DICTIONARY_COLUMNS = `id, position, hidden, updated_at, ${DICTIONARY_COLUMNS}`;

const PAGE_SIZE = 1000;
const VERSIONS_MAX = 50;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Tout le dictionnaire, entrées masquées comprises, dans l'ordre d'origine. */
export async function loadAdminDictionary(
	supabase: SupabaseClient<Database>
): Promise<AdminDictionaryRow[]> {
	const rows: AdminDictionaryRow[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.from('dictionary_entries')
			.select(ADMIN_DICTIONARY_COLUMNS)
			.order('position')
			.order('id')
			.range(from, from + PAGE_SIZE - 1);
		if (error) throw new Error(`Dictionnaire illisible : ${error.message}`);
		rows.push(...data);
		if (data.length < PAGE_SIZE) return rows;
	}
}

/** Premier problème d'une saisie, avec le champ concerné (« definitions.items.0.content : Texte vide »). */
export function inputProblem(zodError: z.ZodError): string {
	const issue = zodError.issues[0];
	const where = issue.path.join('.');
	return where ? `${where} : ${issue.message}` : issue.message;
}

/** Les lignes telles que les vérifient les règles (une ligne illisible est ignorée). */
function toChecked(rows: readonly (DictionaryRow & { hidden: boolean })[]): CheckedEntry[] {
	return rows.flatMap((row) => {
		const term = rowToTerm(row);
		return term ? [{ term, hidden: row.hidden }] : [];
	});
}

/** Ligne de la base pour une saisie de l'admin (jsonb : forme validée par Zod). */
function toColumns(input: DictionaryEntryInput) {
	return {
		...input,
		definitions: input.definitions as Json,
		exemples: input.exemples as Json,
		see_also: input.see_also as Json
	};
}

/** Refus de la base : nom et sens déjà pris (index unique, accents compris). */
function duplicateProblem(input: DictionaryEntryInput): string {
	const name = input.sense ? `${input.term} (${input.sense})` : input.term;
	return `« ${name} » existe déjà : même nom et même sens.`;
}

/** Ajouter une entrée, à la fin du dictionnaire. */
export async function createEntry(
	supabase: SupabaseClient<Database>,
	input: DictionaryEntryInput
): Promise<SaveResult> {
	const rows = await loadAdminDictionary(supabase);
	const draft = { ...toColumns(input), hidden: false };
	const problems = newProblems(toChecked(rows), toChecked([...rows, draft]));
	if (problems.length > 0) return { ok: false, status: 400, problems };

	const position = rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
	const { data, error } = await supabase
		.from('dictionary_entries')
		.insert({ ...toColumns(input), position })
		.select(ADMIN_DICTIONARY_COLUMNS)
		.single();
	if (error?.code === '23505')
		return { ok: false, status: 400, problems: [duplicateProblem(input)] };
	// Refus de la RLS : aucune ligne rendue, `.single()` le signale
	if (error || !data)
		throw new Error(`Entrée non enregistrée : ${error?.message ?? 'aucune ligne'}`);
	forgetDictionary();
	return { ok: true, row: data };
}

/** Modifier une entrée, la masquer ou la réafficher. */
export async function updateEntry(
	supabase: SupabaseClient<Database>,
	id: string,
	change: { entry?: DictionaryEntryInput; hidden?: boolean }
): Promise<SaveResult> {
	const rows = await loadAdminDictionary(supabase);
	const current = rows.find((row) => row.id === id);
	if (!current) return { ok: false, status: 404, problems: ['Entrée introuvable.'] };

	const patch = {
		...(change.entry && toColumns(change.entry)),
		...(change.hidden !== undefined && { hidden: change.hidden })
	};
	const after = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
	const problems = newProblems(toChecked(rows), toChecked(after));
	if (problems.length > 0) return { ok: false, status: 400, problems };

	const { data, error } = await supabase
		.from('dictionary_entries')
		.update(patch)
		.eq('id', id)
		.select(ADMIN_DICTIONARY_COLUMNS)
		.single();
	if (error?.code === '23505' && change.entry) {
		return { ok: false, status: 400, problems: [duplicateProblem(change.entry)] };
	}
	// Refus de la RLS : zéro ligne modifiée, sans erreur de la base ; `.single()` le signale
	if (error || !data)
		throw new Error(`Entrée non enregistrée : ${error?.message ?? 'aucune ligne'}`);
	forgetDictionary();
	return { ok: true, row: data };
}

/** Les versions précédentes d'une entrée, de la plus récente à la plus ancienne. */
export async function loadVersions(
	supabase: SupabaseClient<Database>,
	entryId: string
): Promise<DictionaryVersion[]> {
	const { data, error } = await supabase
		.from('dictionary_entry_versions')
		.select('id, entry, saved_at, saved_by')
		.eq('entry_id', entryId)
		.order('saved_at', { ascending: false })
		.limit(VERSIONS_MAX);
	if (error) throw new Error(`Historique illisible : ${error.message}`);

	const authorIds = [...new Set(data.flatMap((v) => (v.saved_by ? [v.saved_by] : [])))];
	const names = new Map<string, string>();
	if (authorIds.length > 0) {
		const { data: profiles, error: profilesError } = await supabase
			.from('profiles')
			.select('id, firstname, lastname, full_name')
			.in('id', authorIds);
		// Sans les noms, l'historique reste lisible : « admin » à la place
		if (profilesError) console.error('[dictionnaire] auteurs illisibles', profilesError);
		for (const p of profiles ?? []) {
			const name = p.full_name ?? [p.firstname, p.lastname].filter(Boolean).join(' ');
			if (name) names.set(p.id, name);
		}
	}
	return data.map((v) => ({
		id: v.id,
		savedAt: v.saved_at,
		savedBy: v.saved_by ? (names.get(v.saved_by) ?? 'admin') : null,
		entry: withoutAuthorId(v.entry)
	}));
}

/** La version telle que l'admin la lit : sans l'identifiant de compte de l'auteur précédent */
function withoutAuthorId(entry: Json): Json {
	if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry;
	const { updated_by: _authorId, ...rest } = entry;
	return rest;
}
