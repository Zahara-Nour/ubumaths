/**
 * « Afficher sur Google » — écritures serveur de `exercises.search_indexed`
 * ========================================================================
 *
 * La base refuse un exercice privé affiché sur Google (CHECK 23514). Chaque
 * écriture qui peut rendre un exercice privé doit donc écrire aussi
 * `search_indexed: false` dans la même requête — sinon dépublier, restaurer ou
 * importer un exercice coché échouerait. Une valeur venue d'ailleurs
 * (restauration, import) ne met jamais la case à `true` implicitement.
 *
 * Mocks à la forme réelle : la ligne `exercises` complète, colonne comprise.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE,
	SearchIndexedRequiresPublicError,
	consistentSearchIndexed,
	isSearchIndexedViolation
} from '../exercise-search-indexed';
import { createExerciseSchema, updateExerciseSchema } from '../validation/exercises';
import { createExercise, updateExercise } from '../exercises';
import { restoreFromBackup } from '../admin/exercise-backup';
import { importExerciseFromJSON } from '../exercise-import-export';

vi.mock('$lib/server/resource-tags', () => ({
	syncResourceTags: vi.fn().mockResolvedValue(undefined),
	fetchResourceTagNames: vi.fn().mockResolvedValue([]),
	fetchTagNamesForResources: vi.fn().mockResolvedValue(new Map()),
	fetchResourceIdsByAnyTag: vi.fn().mockResolvedValue([])
}));

// Types

type ExerciseRow = Database['public']['Tables']['exercises']['Row'];

// Constantes

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const VARIATIONS = [{ label: 'default', statement_md: 'Q ?', solution_md: 'R' }];

/** Erreur telle que PostgREST la rend quand la contrainte refuse l'écriture. */
const CHECK_ERROR = {
	code: '23514',
	message:
		'new row for relation "exercises" violates check constraint "exercises_search_indexed_requires_public"',
	details: null,
	hint: null
};

function exerciseRow(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
	return {
		id: EXERCISE_ID,
		slug: 'google-zz',
		title: 'Google ZZ',
		source: null,
		source_type_id: null,
		category: 'automatisme',
		grades: null,
		topic: null,
		created_at: '2026-10-01T08:00:00+00:00',
		updated_at: '2026-10-02T08:00:00+00:00',
		created_by: TEACHER_ID,
		distribution_mode: 'on_demand',
		is_public: true,
		search_indexed: true,
		variables: null,
		resources: null,
		generic_functions: null,
		shared: null,
		variations: VARIATIONS,
		...overrides
	};
}

/**
 * Client minimal pour create/update de `server/exercises.ts` : chaque appel
 * renvoie la chaîne ; `single` rend successivement les réponses données.
 */
function chainClient(singleResponses: unknown[]) {
	const query = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		single: vi.fn()
	};
	for (const response of singleResponses) query.single.mockResolvedValueOnce(response);
	const client = { from: vi.fn(() => query) };
	return { client: client as unknown as SupabaseClient<Database>, query };
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// Règle pure et détection de l'erreur de la base
// ============================================================================

describe('consistentSearchIndexed', () => {
	it('ne vaut vrai que pour un exercice public explicitement coché', () => {
		expect(consistentSearchIndexed(true, true)).toBe(true);
		expect(consistentSearchIndexed(false, true)).toBe(false);
		expect(consistentSearchIndexed(true, false)).toBe(false);
		expect(consistentSearchIndexed(true, undefined)).toBe(false);
		expect(consistentSearchIndexed(undefined, true)).toBe(false);
	});
});

describe('isSearchIndexedViolation', () => {
	it('reconnaît la contrainte de la base et l’erreur métier', () => {
		expect(isSearchIndexedViolation(CHECK_ERROR)).toBe(true);
		expect(isSearchIndexedViolation(new SearchIndexedRequiresPublicError())).toBe(true);
	});

	it('ne confond pas une autre contrainte CHECK ni une autre erreur', () => {
		expect(
			isSearchIndexedViolation({
				code: '23514',
				message: 'violates check constraint "exercises_category_check"'
			})
		).toBe(false);
		expect(isSearchIndexedViolation(new Error('boom'))).toBe(false);
		expect(isSearchIndexedViolation(null)).toBe(false);
	});
});

// ============================================================================
// Validation Zod des requêtes
// ============================================================================

describe('validation : search_indexed', () => {
	it('création : non coché par défaut', () => {
		const result = createExerciseSchema.safeParse({
			category: 'automatisme',
			variations: VARIATIONS,
			is_public: true
		});
		expect(result.success).toBe(true);
		expect(result.data?.search_indexed).toBe(false);
	});

	it('création : public + Google accepté', () => {
		const result = createExerciseSchema.safeParse({
			category: 'automatisme',
			variations: VARIATIONS,
			is_public: true,
			search_indexed: true
		});
		expect(result.success).toBe(true);
		expect(result.data?.search_indexed).toBe(true);
	});

	it('création : privé + Google refusé, message en français', () => {
		const result = createExerciseSchema.safeParse({
			category: 'automatisme',
			variations: VARIATIONS,
			is_public: false,
			search_indexed: true
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.message)).toContain(
			SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE
		);
		expect(result.error?.issues.find((i) => i.path[0] === 'search_indexed')).toBeDefined();
	});

	it('mise à jour : privé + Google refusé', () => {
		const result = updateExerciseSchema.safeParse({ is_public: false, search_indexed: true });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe(SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE);
	});

	it('mise à jour : public + Google accepté', () => {
		const result = updateExerciseSchema.safeParse({ is_public: true, search_indexed: true });
		expect(result.success).toBe(true);
	});

	it('mise à jour partielle : ni la visibilité ni la case ne sont inventées', () => {
		const result = updateExerciseSchema.safeParse({ title: 'Nouveau titre' });
		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('is_public');
		expect(result.data).not.toHaveProperty('search_indexed');
	});

	it('création : privée par défaut', () => {
		const result = createExerciseSchema.safeParse({
			category: 'automatisme',
			variations: VARIATIONS
		});
		expect(result.data?.is_public).toBe(false);
	});

	it('mise à jour : un booléen seulement', () => {
		const result = updateExerciseSchema.safeParse({ is_public: true, search_indexed: 'oui' });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// createExercise / updateExercise (formulaire et API)
// ============================================================================

describe('createExercise : search_indexed', () => {
	it('écrit search_indexed: true pour un exercice public coché', async () => {
		const { client, query } = chainClient([{ data: exerciseRow(), error: null }]);
		await createExercise(
			client,
			{ category: 'automatisme', variations: VARIATIONS, is_public: true, search_indexed: true },
			TEACHER_ID
		);
		expect(query.insert).toHaveBeenCalledWith(
			expect.objectContaining({ is_public: true, search_indexed: true })
		);
	});

	it('écrit search_indexed: false quand la case n’est pas fournie', async () => {
		const { client, query } = chainClient([
			{ data: exerciseRow({ search_indexed: false }), error: null }
		]);
		await createExercise(
			client,
			{ category: 'automatisme', variations: VARIATIONS, is_public: true },
			TEACHER_ID
		);
		expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ search_indexed: false }));
	});

	it('refuse privé + Google sans écrire', async () => {
		const { client, query } = chainClient([]);
		const result = await createExercise(
			client,
			{ category: 'automatisme', variations: VARIATIONS, is_public: false, search_indexed: true },
			TEACHER_ID
		);
		expect(result.error).toBeInstanceOf(SearchIndexedRequiresPublicError);
		expect(query.insert).not.toHaveBeenCalled();
	});
});

describe('updateExercise : search_indexed', () => {
	it('dépublier un exercice coché décoche Google dans la même écriture', async () => {
		const existing = exerciseRow();
		const { client, query } = chainClient([
			{ data: existing, error: null },
			{ data: { ...existing, is_public: false, search_indexed: false }, error: null }
		]);
		const result = await updateExercise(client, EXERCISE_ID, { is_public: false }, TEACHER_ID);
		expect(result.error).toBeNull();
		expect(query.update).toHaveBeenCalledTimes(1);
		expect(query.update).toHaveBeenCalledWith(
			expect.objectContaining({ is_public: false, search_indexed: false })
		);
	});

	it('une mise à jour partielle (titre) garde l’exercice public et coché', async () => {
		const existing = exerciseRow();
		const { client, query } = chainClient([
			{ data: existing, error: null },
			{ data: { ...existing, title: 'Nouveau titre' }, error: null }
		]);
		const parsed = updateExerciseSchema.parse({ title: 'Nouveau titre' });
		await updateExercise(client, EXERCISE_ID, parsed, TEACHER_ID);
		const payload = query.update.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).not.toHaveProperty('is_public');
		expect(payload).not.toHaveProperty('search_indexed');
	});

	it('cocher Google sur un exercice resté privé est refusé sans écrire', async () => {
		const existing = exerciseRow({ is_public: false, search_indexed: false });
		const { client, query } = chainClient([{ data: existing, error: null }]);
		const result = await updateExercise(client, EXERCISE_ID, { search_indexed: true }, TEACHER_ID);
		expect(result.error).toBeInstanceOf(SearchIndexedRequiresPublicError);
		expect(query.update).not.toHaveBeenCalled();
	});

	it('cocher Google sur un exercice public passe tel quel', async () => {
		const existing = exerciseRow({ search_indexed: false });
		const { client, query } = chainClient([
			{ data: existing, error: null },
			{ data: { ...existing, search_indexed: true }, error: null }
		]);
		await updateExercise(
			client,
			EXERCISE_ID,
			{ is_public: true, search_indexed: true },
			TEACHER_ID
		);
		expect(query.update).toHaveBeenCalledWith(
			expect.objectContaining({ is_public: true, search_indexed: true })
		);
	});

	it('remonte le refus de la base tel quel, reconnaissable', async () => {
		const existing = exerciseRow({ search_indexed: false });
		const { client } = chainClient([
			{ data: existing, error: null },
			{ data: null, error: CHECK_ERROR }
		]);
		const result = await updateExercise(
			client,
			EXERCISE_ID,
			{ is_public: true, search_indexed: true },
			TEACHER_ID
		);
		expect(isSearchIndexedViolation(result.error)).toBe(true);
	});
});

// ============================================================================
// Restauration d'une sauvegarde (admin)
// ============================================================================

/**
 * Client de restauration : `profiles` connaît le prof ; `exercises` dit si la
 * ligne existe déjà, puis enregistre chaque update/insert.
 */
function restoreClient(rowExists: boolean) {
	const updates: unknown[] = [];
	const inserts: unknown[] = [];
	const existsResponse = rowExists
		? { data: { id: EXERCISE_ID }, error: null }
		: { data: null, error: { code: 'PGRST116', message: 'no rows' } };

	const from = vi.fn((table: string) => {
		if (table === 'profiles') {
			return { select: () => Promise.resolve({ data: [{ id: TEACHER_ID }], error: null }) };
		}
		return {
			// `select('id')` est attendu tel quel (liste) ou suivi de eq().single()
			select: () =>
				Object.assign(Promise.resolve({ data: [{ id: EXERCISE_ID }], error: null }), {
					eq: () => ({ single: () => Promise.resolve(existsResponse) })
				}),
			update: (payload: unknown) => {
				updates.push(payload);
				return { eq: () => Promise.resolve({ error: null }) };
			},
			insert: (payload: unknown) => {
				inserts.push(payload);
				return Promise.resolve({ error: null });
			}
		};
	});
	return { client: { from } as unknown as SupabaseClient<Database>, updates, inserts };
}

function backupWith(record: Record<string, unknown>) {
	const now = '2026-10-02T08:00:00.000Z';
	return {
		version: '1.0',
		format: 'chiphre-backup',
		created_at: now,
		created_by: 'admin@test.com',
		metadata: {
			tables_included: ['exercises'],
			record_counts: {
				exercises: 1,
				exercise_templates: 0,
				exercise_favorites: 0,
				exercise_share_tokens: 0
			}
		},
		data: {
			exercises: [
				{
					id: EXERCISE_ID,
					slug: 'google-zz',
					title: 'Google ZZ',
					source: null,
					category: 'automatisme',
					tags: [],
					statement_md: 'Q ?',
					solution_md: 'R',
					grades: null,
					topic: null,
					distribution_mode: 'on_demand',
					variables: [],
					variations: VARIATIONS,
					shared: null,
					resources: null,
					generic_functions: null,
					created_at: now,
					updated_at: now,
					created_by: TEACHER_ID,
					...record
				}
			],
			exercise_templates: [],
			exercise_favorites: [],
			exercise_share_tokens: []
		}
	};
}

describe('restauration : search_indexed', () => {
	it('remplacer par une version privée décoche Google dans la même écriture', async () => {
		const { client, updates } = restoreClient(true);
		const result = await restoreFromBackup(client, backupWith({ is_public: false }), {
			conflict_strategy: 'replace'
		});
		expect(result.errors).toEqual([]);
		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({ is_public: false, search_indexed: false });
	});

	it('une sauvegarde ancienne (sans la colonne) ne coche jamais Google', async () => {
		const { client, updates } = restoreClient(true);
		await restoreFromBackup(client, backupWith({ is_public: true }), {
			conflict_strategy: 'replace'
		});
		expect(updates[0]).toMatchObject({ is_public: true, search_indexed: false });
	});

	it('restaure la case quand elle est présente et cohérente', async () => {
		const { client, inserts } = restoreClient(false);
		await restoreFromBackup(client, backupWith({ is_public: true, search_indexed: true }), {});
		expect(inserts[0]).toMatchObject({ is_public: true, search_indexed: true });
	});

	it('une case incohérente (privé + Google) est restaurée à false', async () => {
		const { client, inserts } = restoreClient(false);
		await restoreFromBackup(client, backupWith({ is_public: false, search_indexed: true }), {});
		expect(inserts[0]).toMatchObject({ is_public: false, search_indexed: false });
	});
});

// ============================================================================
// Import JSON (professeur)
// ============================================================================

describe('import : search_indexed', () => {
	/**
	 * Le format d'échange ne porte ni `is_public` ni `search_indexed` : un
	 * fichier qui les contient ne doit rien afficher sur Google.
	 */
	const forgedFile = {
		version: '2.0',
		category: 'automatisme',
		tags: [],
		statement_md: 'Q ?',
		solution_md: 'R',
		title: 'Google ZZ',
		variations: VARIATIONS,
		is_public: true,
		search_indexed: true
	};

	function importClient(duplicate: boolean) {
		const query = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			single: vi.fn()
		};
		query.range.mockResolvedValue({
			data: duplicate
				? [{ id: EXERCISE_ID, title: 'Google ZZ', shared: null, variations: VARIATIONS }]
				: [],
			error: null
		});
		if (duplicate) {
			query.single
				.mockResolvedValueOnce({ data: { created_by: TEACHER_ID }, error: null })
				.mockResolvedValueOnce({ data: exerciseRow(), error: null });
		} else {
			query.single.mockResolvedValueOnce({ data: exerciseRow(), error: null });
		}
		return { client: { from: vi.fn(() => query) } as unknown as SupabaseClient<Database>, query };
	}

	it('un nouvel exercice importé n’est jamais affiché sur Google', async () => {
		const { client, query } = importClient(false);
		const result = await importExerciseFromJSON(client, forgedFile, TEACHER_ID);
		expect(result.success).toBe(true);
		expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ search_indexed: false }));
		expect(query.insert).not.toHaveBeenCalledWith(expect.objectContaining({ is_public: true }));
	});

	it('remplacer un exercice ne touche ni à sa visibilité ni à Google', async () => {
		const { client, query } = importClient(true);
		const result = await importExerciseFromJSON(client, forgedFile, TEACHER_ID, {
			onDuplicate: 'replace'
		});
		expect(result.success).toBe(true);
		expect(query.update).toHaveBeenCalledTimes(1);
		const payload = query.update.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).not.toHaveProperty('is_public');
		expect(payload).not.toHaveProperty('search_indexed');
	});
});
