/**
 * Mémoire des Mathoux — `student_mathoux` (lecture et écriture)
 * =============================================================
 *
 * Spec validée : docs/wip/mathoux-conception.md § 9, « Changement d'année et
 * oubli ». Par élève et par notion : le meilleur stade jamais atteint et les
 * niveaux étoilés. Un Mathou ne rapetisse jamais.
 *
 * LECTURE au client de L'ÉLÈVE (RLS : l'élève lit ses lignes, le prof celles de
 * ses élèves). ÉCRITURE au client SERVICE seulement : `authenticated` n'a que
 * SELECT sur la table (migration 20261017090200). L'identifiant de l'élève vient
 * toujours de la session, jamais d'une entrée client.
 *
 * RÈGLE D'ÉCRITURE CONCURRENTE — la mémoire ne redescend JAMAIS, même quand
 * deux calculs tournent en même temps (la page et le Palotin, deux onglets) :
 *   1. lignes neuves : UN insert groupé `ON CONFLICT DO NOTHING`
 *      (`ignoreDuplicates`) — il n'écrase jamais une ligne écrite entre-temps ;
 *      `.select()` dit lesquelles ont vraiment été insérées ;
 *   2. lignes existantes (et lignes neuves perdues au conflit, relues) : mise à
 *      jour CONDITIONNELLE, `WHERE updated_at = <valeur lue>` (comparer-et-
 *      échanger ; `updated_at` est posé par trigger à chaque UPDATE). Zéro ligne
 *      rendue = quelqu'un a écrit entre la lecture et l'écriture : on relit,
 *      on fusionne (meilleur stade, union des étoiles) et on réessaie, au plus
 *      `MAX_ATTEMPTS` fois. Sous READ COMMITTED, un UPDATE concurrent attend le
 *      verrou de ligne puis réévalue son WHERE sur la version validée : deux
 *      écritures ne peuvent pas toutes deux réussir sur la même lecture.
 *   Chaque valeur écrite est donc la fusion de la ligne validée et du calcul :
 *   jamais en baisse. Sans fonction SQL (une RPC demanderait une migration et
 *   deux PR), c'est la seule écriture sûre par PostgREST. Coût : rien quand il
 *   n'y a rien de nouveau (le cas courant) ; 1 requête pour les naissances ; 1
 *   requête par Mathou qui grandit (rare : un stade ou une étoile gagnés).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	isMathouStage,
	memoryCovers,
	mergeMemory,
	type MathouMemory,
	type MathouMemoryUpdate
} from '$lib/mathoux/collection-logic';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/mathoux/memory');

type SB = SupabaseClient<Database>;

/** Ligne de mémoire telle que lue : `updatedAt` sert la mise à jour conditionnelle. */
export interface StoredMathouMemory extends MathouMemory {
	updatedAt: string;
}

const TABLE = 'student_mathoux';
const COLUMNS = 'notion_id, best_stage, starred_grades, updated_at';

/** Essais d'une mise à jour conditionnelle avant d'abandonner (journalisé). */
const MAX_ATTEMPTS = 3;

type MemoryRow = {
	notion_id: string;
	best_stage: string;
	starred_grades: string[];
	updated_at: string;
};

/** Ligne → mémoire ; un stade inconnu (interdit par la base) est écarté. */
function toStored(row: MemoryRow): StoredMathouMemory | null {
	if (!isMathouStage(row.best_stage)) {
		logger.warn(`[mathoux] stade inconnu en mémoire pour la notion ${row.notion_id}`);
		return null;
	}
	return {
		bestStage: row.best_stage,
		starredGrades: row.starred_grades ?? [],
		updatedAt: row.updated_at
	};
}

/**
 * Mémoire de l'élève, par notion. Au client de l'élève (RLS).
 *
 * Une notion par ligne, 440 nœuds en tout en prod : sous le plafond de 1 000
 * lignes de PostgREST.
 *
 * @throws si la lecture échoue : sans mémoire, un Mathou rapetisserait à l'écran.
 */
export async function readMathouMemory(
	supabase: SB,
	studentId: string
): Promise<Map<string, StoredMathouMemory>> {
	const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('student_id', studentId);
	if (error) throw new Error(`Mémoire des Mathoux illisible : ${error.message}`);
	const memory = new Map<string, StoredMathouMemory>();
	for (const row of data ?? []) {
		const entry = toStored(row);
		if (entry) memory.set(row.notion_id, entry);
	}
	return memory;
}

/**
 * Apprend à la mémoire les Mathoux nés ou grandis (cf. règle d'écriture en tête).
 *
 * @param service client SERVICE (seul autorisé à écrire).
 * @param studentId l'élève de la SESSION.
 * @param updates `memoryUpdates(...)` : lignes complètes, jamais en baisse.
 * @param known la mémoire lue avant le calcul (`readMathouMemory`).
 * @throws si une écriture échoue : l'appelant journalise, l'affichage tient.
 */
export async function rememberMathoux(
	service: SB,
	studentId: string,
	updates: MathouMemoryUpdate[],
	known: Map<string, StoredMathouMemory>
): Promise<void> {
	if (updates.length === 0) return;

	const toInsert = updates.filter((update) => !known.has(update.notionId));
	const toUpdate: { update: MathouMemoryUpdate; current: StoredMathouMemory }[] = [];
	for (const update of updates) {
		const current = known.get(update.notionId);
		if (current) toUpdate.push({ update, current });
	}

	if (toInsert.length > 0) {
		// Toutes les colonnes dans chaque ligne (étoiles comprises) : dans un insert
		// groupé, une colonne absente d'une ligne deviendrait NULL.
		const { data, error } = await service
			.from(TABLE)
			.upsert(
				toInsert.map((update) => ({
					student_id: studentId,
					notion_id: update.notionId,
					best_stage: update.bestStage,
					starred_grades: update.starredGrades
				})),
				{ onConflict: 'student_id,notion_id', ignoreDuplicates: true, defaultToNull: false }
			)
			.select('notion_id');
		if (error) throw new Error(`Mémoire des Mathoux : insertion refusée : ${error.message}`);

		// Ligne non rendue = créée entre-temps par un autre calcul : relue, puis fusionnée
		const inserted = new Set((data ?? []).map((row) => row.notion_id));
		const raced = toInsert.filter((update) => !inserted.has(update.notionId));
		if (raced.length > 0) {
			const fresh = await readRows(
				service,
				studentId,
				raced.map((update) => update.notionId)
			);
			for (const update of raced) {
				const current = fresh.get(update.notionId);
				if (current) toUpdate.push({ update, current });
				else logger.warn(`[mathoux] ligne ni insérée ni relue : notion ${update.notionId}`);
			}
		}
	}

	const results = await Promise.allSettled(
		toUpdate.map(({ update, current }) => updateUntilStable(service, studentId, update, current))
	);
	const failure = results.find((result) => result.status === 'rejected');
	if (failure && failure.status === 'rejected') throw failure.reason;
}

/** Relit des lignes de mémoire (client service, après un conflit). */
async function readRows(
	service: SB,
	studentId: string,
	notionIds: string[]
): Promise<Map<string, StoredMathouMemory>> {
	const { data, error } = await service
		.from(TABLE)
		.select(COLUMNS)
		.eq('student_id', studentId)
		.in('notion_id', notionIds);
	if (error) throw new Error(`Mémoire des Mathoux : relecture refusée : ${error.message}`);
	const rows = new Map<string, StoredMathouMemory>();
	for (const row of data ?? []) {
		const entry = toStored(row);
		if (entry) rows.set(row.notion_id, entry);
	}
	return rows;
}

/** Comparer-et-échanger sur `updated_at`, relecture et fusion à chaque échec. */
async function updateUntilStable(
	service: SB,
	studentId: string,
	update: MathouMemoryUpdate,
	initial: StoredMathouMemory
): Promise<void> {
	let current = initial;
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
		if (memoryCovers(current, update)) return;
		const merged = mergeMemory(current, update);
		const { data, error } = await service
			.from(TABLE)
			.update({ best_stage: merged.bestStage, starred_grades: merged.starredGrades })
			.eq('student_id', studentId)
			.eq('notion_id', update.notionId)
			.eq('updated_at', current.updatedAt)
			.select('notion_id');
		if (error) throw new Error(`Mémoire des Mathoux : mise à jour refusée : ${error.message}`);
		if ((data ?? []).length === 1) return;

		// La ligne a bougé depuis la lecture : on la relit et on refusionne
		const { data: row, error: readError } = await service
			.from(TABLE)
			.select(COLUMNS)
			.eq('student_id', studentId)
			.eq('notion_id', update.notionId)
			.maybeSingle();
		if (readError) {
			throw new Error(`Mémoire des Mathoux : relecture refusée : ${readError.message}`);
		}
		const fresh = row ? toStored(row) : null;
		if (!fresh) {
			logger.warn(`[mathoux] ligne disparue pendant la mise à jour : notion ${update.notionId}`);
			return;
		}
		current = fresh;
	}
	logger.warn(
		`[mathoux] mémoire non écrite après ${MAX_ATTEMPTS} essais : notion ${update.notionId}`
	);
}
