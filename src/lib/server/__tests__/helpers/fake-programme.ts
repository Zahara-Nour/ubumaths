/**
 * Décor commun des tests qui lisent l'arbre du programme.
 *
 * Une branche « Nombres » > notions « Fractions » (> sous-notion « Addition »)
 * et « Décimaux », et une branche « Géométrie » > notion « Triangles ». Points
 * de 5e : trois actifs, un archivé ; un point de 4e ; un point SANS NIVEAU
 * (posé sur un nœud, comme les points de test `TEST-SK-*`).
 *
 * `answerProgramme` répond aux requêtes de `getProgrammeTree` en appliquant les
 * filtres demandés (niveau, archivés exclus) : un test vérifie
 * donc aussi ce que le code DEMANDE, pas seulement ce qu'il range.
 */

import type { Call, Result } from './fake-supabase';

// ============================================================================
// CONSTANTES
// ============================================================================

export const NODES = [
	{ id: 'b-nombres', kind: 'branch', parent_id: null, name: 'Nombres', position: 0 },
	{ id: 'b-geo', kind: 'branch', parent_id: null, name: 'Géométrie', position: 1 },
	{ id: 'n-fractions', kind: 'notion', parent_id: 'b-nombres', name: 'Fractions', position: 0 },
	{ id: 'n-decimaux', kind: 'notion', parent_id: 'b-nombres', name: 'Décimaux', position: 1 },
	{ id: 'n-triangles', kind: 'notion', parent_id: 'b-geo', name: 'Triangles', position: 0 },
	{ id: 's-addition', kind: 'subnotion', parent_id: 'n-fractions', name: 'Addition', position: 0 }
].map((n) => ({ ...n, archived_at: null, created_at: '', updated_at: '' }));

export const P_FRACTION = 'aaaaaaaa-0000-4000-8000-000000000001';
export const P_ADDITION = 'aaaaaaaa-0000-4000-8000-000000000002';
export const P_TRIANGLE_ARCHIVE = 'aaaaaaaa-0000-4000-8000-000000000003';
export const P_QUATRIEME = 'aaaaaaaa-0000-4000-8000-000000000004';
export const P_SANS_NIVEAU = 'aaaaaaaa-0000-4000-8000-000000000005';
export const P_DECIMAL = 'aaaaaaaa-0000-4000-8000-000000000006';

function row(id: string, code: string, grade: string | null, nodeId: string, archived = false) {
	return {
		id,
		code,
		name: `Point ${code}`,
		display_order: Number(code.slice(-3)),
		rubrique: null,
		archived_at: archived ? '2026-10-01T00:00:00Z' : null,
		node_id: nodeId,
		grade
	};
}

export const POINTS = [
	row(P_FRACTION, '5-010', '5', 'n-fractions'),
	row(P_ADDITION, '5-011', '5', 's-addition'),
	row(P_DECIMAL, '5-015', '5', 'n-decimaux'),
	row(P_TRIANGLE_ARCHIVE, '5-020', '5', 'n-triangles', true),
	row(P_QUATRIEME, '4-010', '4', 'n-fractions'),
	row(P_SANS_NIVEAU, 'TEST-001', null, 'n-fractions')
];

// ============================================================================
// FONCTIONS
// ============================================================================

function argsOf(calls: Call[], method: string, column: string): unknown[] | undefined {
	return calls.find((c) => c.method === method && c.args[0] === column)?.args;
}

/** Réponse aux tables de l'arbre, `undefined` pour une autre table. */
export function answerProgramme(table: string, calls: Call[]): Result | undefined {
	if (table === 'classification_nodes') {
		const ids = (argsOf(calls, 'in', 'id')?.[1] as string[]) ?? [];
		return { data: NODES.filter((n) => ids.includes(n.id)) };
	}
	if (table !== 'curriculum_points') return undefined;

	let rows = POINTS;
	const byIds = argsOf(calls, 'in', 'id')?.[1] as string[] | undefined;
	if (byIds) rows = rows.filter((p) => byIds.includes(p.id));
	const byId = argsOf(calls, 'eq', 'id')?.[1];
	if (byId !== undefined) rows = rows.filter((p) => p.id === byId);
	const grade = argsOf(calls, 'eq', 'grade')?.[1];
	if (grade !== undefined) rows = rows.filter((p) => p.grade === grade);
	if (argsOf(calls, 'is', 'archived_at')) rows = rows.filter((p) => p.archived_at === null);

	const terminal = calls.at(-1)?.method;
	if (terminal === 'single' || terminal === 'maybeSingle') return { data: rows[0] ?? null };
	return { data: rows };
}

/** Identifiants des points d'un arbre rendu (branche > notion > points). */
export function pointIdsOf(tree: { notions: { points: { id: string }[] }[] }[]): string[] {
	return tree.flatMap((b) => b.notions.flatMap((n) => n.points.map((p) => p.id)));
}
