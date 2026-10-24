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
	bestGrowth,
	isMathouStage,
	memoryCovers,
	mergeMemory,
	type MathouMemory,
	type MathouMemoryUpdate
} from '$lib/mathoux/collection-logic';
import { isMathouDecoration } from '$lib/mathoux/decorations';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/mathoux/memory');

type SB = SupabaseClient<Database>;

/** Ligne de mémoire telle que lue : `updatedAt` sert la mise à jour conditionnelle. */
export interface StoredMathouMemory extends MathouMemory {
	updatedAt: string;
	/**
	 * Stade et étoiles déjà payés en gidouilles (`rewarded_*`, migration
	 * 20261024210000) : faux → `payMathouMilestones` a quelque chose à verser.
	 */
	paid: boolean;
}

/**
 * Ce que CET appel a écrit, par notion : la ligne qu'il a remplacée (`null` :
 * il l'a insérée). Les nouveautés se classent contre elle, pas contre la mémoire
 * lue avant le calcul : un autre calcul a pu écrire entre-temps (cf. `mathouNews`).
 */
export type WrittenMathoux = Map<string, MathouMemory | null>;

/** Écriture en échec : porte ce qui a déjà été écrit avant la panne (à annoncer quand même). */
export class MathouMemoryWriteError extends Error {
	constructor(
		cause: unknown,
		readonly written: WrittenMathoux
	) {
		super(cause instanceof Error ? cause.message : String(cause), { cause });
		this.name = 'MathouMemoryWriteError';
	}
}

const TABLE = 'student_mathoux';
const COLUMNS =
	'notion_id, best_stage, starred_grades, asleep, updated_at, rewarded_stage, rewarded_grades, decoration';

/** Essais d'une mise à jour conditionnelle avant d'abandonner (journalisé). */
const MAX_ATTEMPTS = 3;

type MemoryRow = {
	notion_id: string;
	best_stage: string;
	starred_grades: string[];
	asleep: boolean;
	updated_at: string;
	rewarded_stage: string | null;
	rewarded_grades: string[];
	decoration: string | null;
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
		asleep: row.asleep,
		updatedAt: row.updated_at,
		// Lue seulement : posée par `set_mathou_decoration`, jamais écrite ici
		decoration: isMathouDecoration(row.decoration) ? row.decoration : null,
		// Payé au moins jusqu'au meilleur stade (un stade corrigé à la main sous le payé ne
		// redemande rien) et toutes les étoiles payées
		paid:
			row.rewarded_stage !== null &&
			isMathouStage(row.rewarded_stage) &&
			bestGrowth(row.rewarded_stage, row.best_stage) === row.rewarded_stage &&
			(row.starred_grades ?? []).every((grade) => (row.rewarded_grades ?? []).includes(grade))
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
 * @returns les notions dont CET appel a écrit la ligne (insérée, ou mise à jour
 *   avec du nouveau), chacune avec la ligne qu'il a remplacée : les nouveautés à
 *   annoncer (`mathouNews`). Une ligne qu'un autre calcul a déjà écrite n'y est
 *   pas, et ce qu'il a écrit ne se ré-annonce pas : jamais annoncé deux fois.
 * @throws `MathouMemoryWriteError` si une écriture échoue (avec ce qui a été
 *   écrit avant) : l'appelant journalise, l'affichage tient.
 */
export async function rememberMathoux(
	service: SB,
	studentId: string,
	updates: MathouMemoryUpdate[],
	known: Map<string, StoredMathouMemory>
): Promise<WrittenMathoux> {
	const written: WrittenMathoux = new Map();
	if (updates.length === 0) return written;

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
					starred_grades: update.starredGrades,
					asleep: update.asleep
				})),
				{ onConflict: 'student_id,notion_id', ignoreDuplicates: true, defaultToNull: false }
			)
			.select('notion_id');
		if (error) {
			throw new MathouMemoryWriteError(
				new Error(`Mémoire des Mathoux : insertion refusée : ${error.message}`),
				written
			);
		}

		// Ligne non rendue = créée entre-temps par un autre calcul : relue, puis fusionnée
		const inserted = new Set((data ?? []).map((row) => row.notion_id));
		for (const notionId of inserted) written.set(notionId, null);
		const raced = toInsert.filter((update) => !inserted.has(update.notionId));
		if (raced.length > 0) {
			let fresh: Map<string, StoredMathouMemory>;
			try {
				fresh = await readRows(
					service,
					studentId,
					raced.map((update) => update.notionId)
				);
			} catch (err) {
				throw new MathouMemoryWriteError(err, written);
			}
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
	results.forEach((result, index) => {
		if (result.status === 'fulfilled' && result.value) {
			written.set(toUpdate[index].update.notionId, toMemory(result.value));
		}
	});
	const failure = results.find((result) => result.status === 'rejected');
	if (failure && failure.status === 'rejected') {
		throw new MathouMemoryWriteError(failure.reason, written);
	}
	return written;
}

/** La mémoire seule, sans `updatedAt`. */
function toMemory(stored: StoredMathouMemory): MathouMemory {
	return {
		bestStage: stored.bestStage,
		starredGrades: stored.starredGrades,
		asleep: stored.asleep
	};
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

/**
 * Comparer-et-échanger sur `updated_at`, relecture et fusion à chaque échec.
 * Rend la ligne que CET appel a remplacée ; `null` si elle disait déjà tout
 * (écrite par un autre calcul), a disparu, ou n'a pas pu être écrite.
 */
async function updateUntilStable(
	service: SB,
	studentId: string,
	update: MathouMemoryUpdate,
	initial: StoredMathouMemory
): Promise<StoredMathouMemory | null> {
	let current = initial;
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
		if (memoryCovers(current, update)) return null;
		const merged = mergeMemory(current, update);
		const { data, error } = await service
			.from(TABLE)
			.update({
				best_stage: merged.bestStage,
				starred_grades: merged.starredGrades,
				asleep: merged.asleep
			})
			.eq('student_id', studentId)
			.eq('notion_id', update.notionId)
			.eq('updated_at', current.updatedAt)
			.select('notion_id');
		if (error) throw new Error(`Mémoire des Mathoux : mise à jour refusée : ${error.message}`);
		if ((data ?? []).length === 1) return current;

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
			return null;
		}
		current = fresh;
	}
	logger.warn(
		`[mathoux] mémoire non écrite après ${MAX_ATTEMPTS} essais : notion ${update.notionId}`
	);
	return null;
}
