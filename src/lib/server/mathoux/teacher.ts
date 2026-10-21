/**
 * Chatterie vue par le professeur — compteurs d'une classe
 * ========================================================
 *
 * La liste d'une classe compte la MÉMOIRE seule (`student_mathoux`) : le calcul
 * complet coûte une quarantaine de requêtes par élève (docs/systeme/mathoux.md
 * § Coût), trop pour trente élèves. Choix validé par David le 2026-10-21 : un
 * Mathou né depuis la dernière visite de l'élève n'y paraît qu'après cette
 * visite, et les siestes ne se voient que sur la Chatterie de l'élève.
 *
 * Comme sur la page de l'élève, une notion ou une branche archivée fait
 * disparaître son Mathou.
 *
 * Lu au client du PROF (RLS : `is_my_student`, `is_teacher_or_admin`). Un refus
 * RLS rendrait des compteurs à zéro, sans erreur : prouvé en intégration
 * (`tests/integration/mathoux-vue-prof.test.ts`).
 *
 * Coût : 1 lecture de l'arbre (branches et notions, ~160 lignes) en parallèle
 * de la mémoire, par lots de 100 élèves, chaque lot lu par pages de 1 000
 * lignes (jusqu'à une ligne par élève et par notion : 30 élèves × 160 notions
 * dépasseraient le plafond de PostgREST).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { fetchInChunks } from '$lib/server/utils/chunked-in';

type SB = SupabaseClient<Database>;

/** Plafond `max_rows` de PostgREST (supabase/config.toml). */
const PAGE_SIZE = 1000;

/** Ce que la liste d'une classe montre d'un élève. */
export interface StudentMathouxCounts {
	born: number;
	grandMatous: number;
}

interface MemoryRow {
	student_id: string;
	notion_id: string;
	best_stage: string;
}

/**
 * Mathoux nés et grands matous de chaque élève demandé, d'après la mémoire.
 * Chaque élève demandé a une entrée, à zéro s'il n'a aucun Mathou.
 *
 * @throws si une lecture échoue : des zéros se liraient « aucun Mathou ».
 */
export async function loadMathouxCountsByStudent(
	supabase: SB,
	studentIds: string[]
): Promise<Map<string, StudentMathouxCounts>> {
	const counts = new Map<string, StudentMathouxCounts>();
	for (const id of studentIds) counts.set(id, { born: 0, grandMatous: 0 });
	if (studentIds.length === 0) return counts;

	const [treeResult, memoryResult] = await Promise.all([
		supabase
			.from('classification_nodes')
			.select('id, kind, parent_id')
			.in('kind', ['branch', 'notion'])
			.is('archived_at', null),
		fetchInChunks(studentIds, (batch) => fetchMemoryPages(supabase, batch))
	]);
	if (treeResult.error) throw new Error(`Arbre illisible : ${treeResult.error.message}`);
	if (memoryResult.error) {
		throw new Error(`Mémoire des Mathoux illisible : ${memoryResult.error.message}`);
	}

	const activeNotions = activeNotionIds(treeResult.data ?? []);
	for (const row of memoryResult.data) {
		const entry = counts.get(row.student_id);
		if (!entry || !activeNotions.has(row.notion_id)) continue;
		entry.born += 1;
		if (row.best_stage === 'grand_matou') entry.grandMatous += 1;
	}
	return counts;
}

/** Notions non archivées dont la branche n'est pas archivée non plus. */
function activeNotionIds(
	nodes: { id: string; kind: string; parent_id: string | null }[]
): Set<string> {
	const branches = new Set(nodes.filter((n) => n.kind === 'branch').map((n) => n.id));
	return new Set(
		nodes
			.filter((n) => n.kind === 'notion' && n.parent_id !== null && branches.has(n.parent_id))
			.map((n) => n.id)
	);
}

/** Mémoire d'un lot d'élèves, lue par pages : l'ordre (élève, notion) rend les pages stables. */
async function fetchMemoryPages(
	supabase: SB,
	studentIds: string[]
): Promise<{ data: MemoryRow[]; error: { message: string } | null }> {
	const rows: MemoryRow[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.from('student_mathoux')
			.select('student_id, notion_id, best_stage')
			.in('student_id', studentIds)
			.order('student_id')
			.order('notion_id')
			.range(from, from + PAGE_SIZE - 1);
		if (error) return { data: [], error };
		const page = data ?? [];
		rows.push(...page);
		if (page.length < PAGE_SIZE) return { data: rows, error: null };
	}
}
