/**
 * Édition d'un modèle (admin) — chargement serveur : les tags par programme
 * ===========================================================================
 *
 * Un modèle porte au plus UN point par programme (règle 2, en base), choisi parmi les points
 * posés sur le nœud du modèle ou sur la notion de ce nœud (règle 1). L'écran propose donc un
 * choix par programme. Un modèle sans nœud ne peut pas être tagué (décision (a)) : l'écran
 * demande de le ranger d'abord. Les tags des anciens points (thème → objectif) restent en base
 * jusqu'à l'étape 4 de C5, mais ne s'affichent plus.
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+page.server';
import { createFakeSupabase, type Call } from '$lib/server/__tests__/helpers/fake-supabase';
import type { PageServerData } from '../$types';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];
// Ce que rend VRAIMENT le load : SvelteKit l'infère sans l'annotation `PageServerLoad`.
type LoadResult = PageServerData;

// ============================================================================
// CONSTANTS
// ============================================================================

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '22222222-2222-4222-8222-222222222222';

/** Branche > notion « Fractions » > sous-notion « Addition ». */
const NODES = [
	{ id: 'branche', kind: 'branch', parent_id: null, name: 'Nombres', archived_at: null },
	{ id: 'notion', kind: 'notion', parent_id: 'branche', name: 'Fractions', archived_at: null },
	{ id: 'sous-notion', kind: 'subnotion', parent_id: 'notion', name: 'Addition', archived_at: null }
];

function point(id: string, code: string, grade: string, nodeId: string, archived = false) {
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

/** Points sur le nœud du modèle et sur sa notion, en 5e et en 4e. */
const POINTS = [
	point('p5-b', '5-027', '5', 'sous-notion'),
	point('p5-a', '5-026', '5', 'notion'),
	point('p5-archive', '5-030', '5', 'sous-notion', true),
	point('p4', '4-010', '4', 'notion'),
	point('p6', '6-050', '6', 'notion')
];

// ============================================================================
// HELPERS
// ============================================================================

function idsIn(calls: Call[]): string[] {
	return (calls.find((c) => c.method === 'in')?.args[1] as string[]) ?? [];
}

/** Charge la page pour un modèle de 5e rangé sur `nodeId`, portant ces tags. */
async function loadWith(nodeId: string | null, tags: unknown[]) {
	const fake = createFakeSupabase((table, calls) => {
		switch (table) {
			case 'question_templates':
				return { data: { id: TEMPLATE_ID, grades: ['5'], classification_node_id: nodeId } };
			case 'question_template_points':
				return { data: tags };
			case 'classification_nodes':
				return { data: NODES.filter((n) => idsIn(calls).includes(n.id)) };
			case 'curriculum_points':
				return { data: POINTS.filter((p) => idsIn(calls).includes(p.node_id)) };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
	const event = {
		params: { id: TEMPLATE_ID },
		locals: { user: { id: ADMIN_ID }, profile: { role: 'admin' }, supabase: fake.client }
	} as unknown as LoadEvent;
	const result = (await load(event)) as LoadResult;
	return { fake, result };
}

/** Tag lu avec son point (colonnes du programme) ; un ancien point n'a ni nœud ni programme. */
function tag(pointId: string, nodeId: string | null, grade: string | null) {
	const known = POINTS.find((p) => p.id === pointId);
	return {
		point_id: pointId,
		curriculum_points: known ?? { ...point(pointId, '0-000', 'X', 'aucun'), node_id: nodeId, grade }
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe('édition d’un modèle — tags par programme (étape 3 de C5)', () => {
	it('un choix par programme du modèle (son niveau et les suivants), points du nœud et de sa notion', async () => {
		const { result } = await loadWith('sous-notion', []);

		expect(result.programmeTags.nodeMissing).toBe(false);
		expect(result.programmeTags.programmes.map((p) => p.grade)).toEqual(['5', '4']);
		const cinquieme = result.programmeTags.programmes[0];
		expect(cinquieme.points.map((p) => p.code)).toEqual(['5-026', '5-027']);
		expect(cinquieme.selectedPointId).toBeNull();
	});

	it('modèle posé sur une notion : seulement les points de cette notion', async () => {
		const { result } = await loadWith('notion', []);
		const cinquieme = result.programmeTags.programmes.find((p) => p.grade === '5');
		expect(cinquieme?.points.map((p) => p.code)).toEqual(['5-026']);
	});

	it('le tag neuf posé est le choix du programme ; l’ancien tag est ignoré', async () => {
		const { result } = await loadWith('sous-notion', [
			tag('p5-b', 'sous-notion', '5'),
			tag('p-ancien', null, null)
		]);
		const cinquieme = result.programmeTags.programmes[0];
		expect(cinquieme.selectedPointId).toBe('p5-b');
		expect(result.programmeTags.taggedCount).toBe(1);
	});

	it('point archivé : absent des choix, sauf s’il est le tag posé', async () => {
		const sansTag = await loadWith('sous-notion', []);
		expect(sansTag.result.programmeTags.programmes[0].points.map((p) => p.id)).not.toContain(
			'p5-archive'
		);

		const avecTag = await loadWith('sous-notion', [tag('p5-archive', 'sous-notion', '5')]);
		const cinquieme = avecTag.result.programmeTags.programmes[0];
		expect(cinquieme.selectedPointId).toBe('p5-archive');
		expect(cinquieme.points.find((p) => p.id === 'p5-archive')?.archived).toBe(true);
	});

	it('modèle sans nœud : aucun choix, l’écran demande de le ranger d’abord', async () => {
		const { result, fake } = await loadWith(null, []);
		expect(result.programmeTags).toEqual({ nodeMissing: true, programmes: [], taggedCount: 0 });
		expect(fake.on('curriculum_points')).toEqual([]);
	});

	it('la requête des tags lit le nœud et le programme du point, plus l’objectif', async () => {
		const { fake } = await loadWith('sous-notion', []);
		const select = fake
			.on('question_template_points')
			.flatMap((q) => q.calls)
			.find((c) => c.method === 'select');
		expect(String(select?.args[0])).toMatch(/curriculum_points\([^)]*node_id[^)]*grade/);
		expect(String(select?.args[0])).not.toMatch(/objective/);
	});

	it('tag posé sur un point hors des choix (nœud d’un autre rangement) : il reste visible', async () => {
		const ailleurs = point('p-ailleurs', '4-099', '4', 'autre-notion');
		const { result } = await loadWith('sous-notion', [
			{ point_id: ailleurs.id, curriculum_points: ailleurs }
		]);
		const quatrieme = result.programmeTags.programmes.find((p) => p.grade === '4');
		expect(quatrieme?.selectedPointId).toBe('p-ailleurs');
		expect(quatrieme?.points.map((p) => p.code)).toEqual(['4-010', '4-099']);
	});
});
