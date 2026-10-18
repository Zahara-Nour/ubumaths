/**
 * Thème d'une question pour le bonus « nouveau thème » du Palotin
 * ================================================================
 *
 * Le thème d'une réponse est le thème du programme du point que valide la
 * question : `question_template_points` → `curriculum_points` →
 * `curriculum_objectives` → `curriculum_themes`. Une seule requête groupée pour
 * toute la séance ; une question sans point n'a pas de thème, sans erreur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { fetchTemplateThemeIds } from '../buddy-themes';

// Types
type Link = {
	template_id: string;
	curriculum_points: { curriculum_objectives: { theme_id: string } | null } | null;
};

// Constantes
const TEMPLATE_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const TEMPLATE_B = 'aaaaaaaa-0000-4000-8000-000000000002';
const TEMPLATE_C = 'aaaaaaaa-0000-4000-8000-000000000003';
const THEME_1 = '11111111-0000-4000-8000-000000000001';
const THEME_2 = '22222222-0000-4000-8000-000000000002';

// Variables
let rows: Link[];
let failure: { message: string } | null;
let fromCalls: string[];
let inCalls: { column: string; ids: string[] }[];

// Functions
function link(templateId: string, themeId: string | null, withPoint = true): Link {
	return {
		template_id: templateId,
		curriculum_points: withPoint
			? { curriculum_objectives: themeId ? { theme_id: themeId } : null }
			: null
	};
}

function fakeSupabase(): SupabaseClient<Database> {
	return {
		from(table: string) {
			fromCalls.push(table);
			return {
				select: () => ({
					in: async (column: string, ids: string[]) => {
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
		fromCalls = [];
		inCalls = [];
	});

	it('rend le thème du programme de chaque question, en UNE requête', async () => {
		rows = [link(TEMPLATE_A, THEME_1), link(TEMPLATE_B, THEME_2)];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A, TEMPLATE_B]);

		expect(themes.get(TEMPLATE_A)).toBe(THEME_1);
		expect(themes.get(TEMPLATE_B)).toBe(THEME_2);
		expect(fromCalls).toEqual(['question_template_points']);
		expect(inCalls).toEqual([{ column: 'template_id', ids: [TEMPLATE_A, TEMPLATE_B] }]);
	});

	it('question sans point : pas de thème, sans erreur', async () => {
		rows = [link(TEMPLATE_A, THEME_1)];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A, TEMPLATE_C]);
		expect(themes.has(TEMPLATE_C)).toBe(false);
	});

	it('point sans objectif (ou point illisible) : pas de thème', async () => {
		rows = [link(TEMPLATE_A, null), link(TEMPLATE_B, null, false)];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A, TEMPLATE_B]);
		expect(themes.size).toBe(0);
	});

	it('plusieurs thèmes pour une question : toujours le même, le plus petit identifiant', async () => {
		rows = [link(TEMPLATE_A, THEME_2), link(TEMPLATE_A, THEME_1)];
		const themes = await fetchTemplateThemeIds(fakeSupabase(), [TEMPLATE_A]);
		expect(themes.get(TEMPLATE_A)).toBe(THEME_1);

		rows = [link(TEMPLATE_A, THEME_1), link(TEMPLATE_A, THEME_2)];
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
});
