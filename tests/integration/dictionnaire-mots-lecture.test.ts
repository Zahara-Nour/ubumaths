/**
 * Dictionnaire en base — mots de la lecture d'une expression (Supabase local requis)
 * ==================================================================================
 *
 * Migration 20261016090300_dictionnaire_mots_lecture (2026-10-11) : 4 entrées
 * (`différent`, `racine cubique`, `racine n-ième`, `logarithme décimal`), clés que
 * `src/lib/mathAST/structure/reading.ts` passe à `LexiconTerm`.
 *
 * Question d'accès tranchée par David : tout le monde (visiteurs compris) lit ces
 * 4 définitions, comme les 671 autres ; aucun autre accès.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { REFERENCE_DICTIONARY } from '../fixtures/lexique/dictionnaire-reference';
import { READING_WORDS_2026_10_11 } from '../fixtures/lexique/mots-lecture-2026-10-11';
import type { Database } from '$lib/types/database';
import { newProblems, type CheckedEntry } from '$lib/dictionary/consistency';
import { rowToTerm } from '$lib/dictionary/entry-schema';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const TERMS = READING_WORDS_2026_10_11.map((t) => t.term);

// ============================================================================
// VARIABLES
// ============================================================================

let anon: SupabaseClient<Database>;
let service: SupabaseClient<Database>;

// ============================================================================
// SUITE
// ============================================================================

describe('Dictionnaire en base — mots de la lecture (2026-10-11)', () => {
	beforeAll(() => {
		anon = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		service = createClient<Database>(SUPABASE_URL, SERVICE_KEY, CLIENT_OPTIONS);
	});

	it('un visiteur lit les 4 entrées, avec leur niveau et leur définition', async () => {
		const { data, error } = await anon
			.from('dictionary_entries')
			.select('term, sense, grade, tags, definitions, auto_link, hidden')
			.in('term', TERMS);
		expect(error).toBeNull();
		const byTerm = new Map((data ?? []).map((row) => [row.term, row]));
		expect([...byTerm.keys()].sort()).toEqual([...TERMS].sort());
		for (const term of READING_WORDS_2026_10_11) {
			expect(byTerm.get(term.term)).toEqual({
				term: term.term,
				sense: null,
				grade: term.grade,
				tags: term.tags,
				definitions: term.definitions,
				auto_link: term.autoLink !== false,
				hidden: false
			});
		}
	});

	it('les 4 entrées viennent après toutes les autres, dans l’ordre de la migration', async () => {
		const { data, error } = await service
			.from('dictionary_entries')
			.select('term, position')
			.not('term', 'like', 'itest-%')
			.order('position');
		expect(error).toBeNull();
		const rows = data ?? [];
		expect(rows.slice(-4).map((r) => r.term)).toEqual(TERMS);
		const before = rows.slice(0, -4).map((r) => r.position);
		expect(rows[rows.length - 4].position).toBeGreaterThan(Math.max(...before));
	});

	it('le dictionnaire lu en base n’a aucun problème de cohérence de plus que la référence', async () => {
		const { data, error } = await service
			.from('dictionary_entries')
			.select('*')
			.not('term', 'like', 'itest-%')
			.order('position');
		expect(error).toBeNull();
		const inBase: CheckedEntry[] = (data ?? []).map((row) => {
			const term = rowToTerm(row);
			if (!term) throw new Error(`ligne illisible : ${row.term}`);
			return { term, hidden: row.hidden };
		});
		expect(inBase.map((e) => e.term.term)).toEqual(expect.arrayContaining(TERMS));
		const reference = REFERENCE_DICTIONARY.map((term) => ({ term, hidden: false }));
		expect(newProblems(reference, inBase)).toEqual([]);
	});
});
