/**
 * Thème d'une question pour le bonus « nouveau thème » du Palotin
 * ================================================================
 *
 * Le thème d'une réponse est la BRANCHE de l'arbre des notions où se range le
 * point que valide la question : `question_template_points` → `curriculum_points`
 * → nœud (sous-notion ou notion) → … → branche. Les tags des anciens points
 * (thème → objectif) ne comptent plus. Une question sans point neuf n'a pas de
 * thème, sans erreur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { fetchTemplateThemeIds } from '../buddy-themes';

// Types
type Link = { template_id: string; curriculum_points: { node_id: string | null } | null };
type NodeRow = { id: string; kind: string; parent_id: string | null; name: string };

// Constantes
const TEMPLATE_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const TEMPLATE_B = 'aaaaaaaa-0000-4000-8000-000000000002';
const TEMPLATE_C = 'aaaaaaaa-0000-4000-8000-000000000003';
const THEME_1 = '11111111-0000-4000-8000-000000000001';
const THEME_2 = '22222222-0000-4000-8000-000000000002';

/** Branche 1 > notion 1 > sous-notion 1 ; branche 2 > notion 2. */
const NODES: NodeRow[] = [
	{ id: THEME_1, kind: 'branch', parent_id: null, name: 'Nombres' },
	{ id: 'notion-1', kind: 'notion', parent_id: THEME_1, name: 'Fractions' },
	{ id: 'sous-notion-1', kind: 'subnotion', parent_id: 'notion-1', name: 'Addition' },
	{ id: THEME_2, kind: 'branch', parent_id: null, name: 'Géométrie' },
	{ id: 'notion-2', kind: 'notion', parent_id: THEME_2, name: 'Angles' }
];

// Variables
let rows: Link[];
let failure: { message: string } | null;
let nodesFailure: { message: string } | null;
let fromCalls: string[];
let inCalls: { column: string; ids: string[] }[];

// Functions
function link(templateId: string, nodeId: string | null, withPoint = true): Link {
	return { template_id: templateId, curriculum_points: withPoint ? { node_id: nodeId } : null };
}

function fakeSupabase(): SupabaseClient<Database> {
	return {
		from(table: string) {
			fromCalls.push(table);
			return {
				select: () => ({
					in: async (column: string, ids: string[]) => {
						if (table === 'classification_nodes') {
							if (nodesFailure) return { data: null, error: nodesFailure };
							return { data: NODES.filter((n) => ids.includes(n.id)), error: null };
						}
						inCalls.push({ column, ids });
						return failure ? { data: null, error: failure } : { data: rows, error: null };
					}
				})
			};
		}
	} as unknown as SupabaseClient<Database>;
}

describe('fetchTemplateThemeIds', () => {
	beforeEach(() => {
		rows = [];
		failure = null;
		nodesFailure = null;
		fromCalls = [];
		inCalls = [];
	});

	it('rend la branche de chaque question (point sur une sous-notion ou une notion)', async () => {
		rows = [link(TEMPLATE_A, 'sous-notion-1'), link(TEMPLATE_B, 'notion-2')];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A, TEMPLATE_B]);

		expect(themes.get(TEMPLATE_A)).toBe(THEME_1);
		expect(themes.get(TEMPLATE_B)).toBe(THEME_2);
		expect(fromCalls[0]).toBe('question_template_points');
		expect(inCalls).toEqual([{ column: 'template_id', ids: [TEMPLATE_A, TEMPLATE_B] }]);
	});

	it('question sans point : pas de thème, sans erreur', async () => {
		rows = [link(TEMPLATE_A, 'notion-1')];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A, TEMPLATE_C]);
		expect(themes.has(TEMPLATE_C)).toBe(false);
	});

	it('ancien point (sans nœud) ou point illisible : pas de thème', async () => {
		rows = [link(TEMPLATE_A, null), link(TEMPLATE_B, null, false)];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A, TEMPLATE_B]);
		expect(themes.size).toBe(0);
	});

	it('plusieurs thèmes pour une question : toujours le même, le plus petit identifiant', async () => {
		rows = [link(TEMPLATE_A, 'notion-2'), link(TEMPLATE_A, 'sous-notion-1')];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A]);
		expect(themes.get(TEMPLATE_A)).toBe(THEME_1);

		rows = [link(TEMPLATE_A, 'sous-notion-1'), link(TEMPLATE_A, 'notion-2')];
		const again = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A]);
		expect(again.get(TEMPLATE_A)).toBe(THEME_1);
	});

	it('aucune question : aucune requête', async () => {
		const themes = await fetchTemplateThemeIds(fakeSupabase(), []);
		expect(themes.size).toBe(0);
		expect(fromCalls).toEqual([]);
	});

	it('lecture en panne : aucun thème, sans lever (le gain de base reste dû)', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		failure = { message: 'connexion perdue' };
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A]);
		expect(themes.size).toBe(0);
	});

	it('arbre illisible : aucun thème, sans lever', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		rows = [link(TEMPLATE_A, 'notion-1')];
		nodesFailure = { message: 'connexion perdue' };
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A]);
		expect(themes.size).toBe(0);
	});
});
