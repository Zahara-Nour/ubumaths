/**
 * Page publique d'un exercice — balise `noindex`
 *
 * Seul un exercice public coché « Afficher sur Google », ouvert par son
 * adresse publique, peut être indexé. Tout le reste (public non coché, accès
 * par jeton de partage) porte `<meta name="robots" content="noindex">`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';

type ExerciseRow = Database['public']['Tables']['exercises']['Row'];

vi.mock('$lib/server/exercises', () => ({
	getExerciseBySlug: vi.fn(),
	getExercise: vi.fn()
}));
vi.mock('$lib/server/exercise-share-tokens', () => ({
	getExerciseByShareToken: vi.fn()
}));

const { getExerciseBySlug } = await import('$lib/server/exercises');
const { getExerciseByShareToken } = await import('$lib/server/exercise-share-tokens');
const { load } = await import('../+page.server');

function exerciseRow(overrides: Partial<ExerciseRow> = {}): ExerciseRow & { tags: string[] } {
	return {
		id: '550e8400-e29b-41d4-a716-446655440003',
		slug: 'pythagore-zz',
		title: 'Pythagore',
		source: null,
		source_type_id: null,
		category: 'automatisme',
		grades: null,
		topic: null,
		created_at: '2026-10-01T08:00:00+00:00',
		updated_at: '2026-10-02T08:00:00+00:00',
		created_by: '550e8400-e29b-41d4-a716-446655440001',
		distribution_mode: 'on_demand',
		is_public: true,
		search_indexed: true,
		variables: null,
		resources: null,
		generic_functions: null,
		shared: null,
		variations: [{ label: 'default', statement_md: 'Q ?', solution_md: 'R' }],
		tags: [],
		...overrides
	};
}

async function loadPage(
	query = '',
	slug = 'pythagore-zz'
): Promise<{ noindex: boolean; exercise: { id: string } }> {
	const result = await (
		load as unknown as (e: unknown) => Promise<{ noindex: boolean; exercise: { id: string } }>
	)({
		params: { slug },
		locals: { supabase: {} },
		url: new URL(`https://www.chiph.re/exercice/${slug}${query}`)
	});
	return result;
}

/** Redirection levée par le chargement. */
async function loadRedirect(
	query: string,
	slug = 'pythagore-zz'
): Promise<{ status: number; location: string }> {
	try {
		await loadPage(query, slug);
	} catch (e) {
		if (isRedirect(e)) return { status: e.status, location: e.location };
		throw e;
	}
	throw new Error('le chargement n’a pas redirigé');
}

/** Statut de l'erreur HTTP levée par le chargement. */
async function loadStatus(query: string, slug = 'pythagore-zz'): Promise<number> {
	try {
		await loadPage(query, slug);
	} catch (e) {
		if (isHttpError(e)) return e.status;
		throw e;
	}
	throw new Error('le chargement n’a rien refusé');
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('/exercice/[slug] — noindex', () => {
	it('un exercice public coché « Afficher sur Google » est indexable', async () => {
		vi.mocked(getExerciseBySlug).mockResolvedValue({ data: exerciseRow(), error: null });
		expect((await loadPage()).noindex).toBe(false);
	});

	it('un exercice public non coché porte noindex', async () => {
		vi.mocked(getExerciseBySlug).mockResolvedValue({
			data: exerciseRow({ search_indexed: false }),
			error: null
		});
		expect((await loadPage()).noindex).toBe(true);
	});

	it('un exercice privé ouvert par jeton porte noindex', async () => {
		// Forme rendue par la RPC get_exercise_by_share_token
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow({ is_public: false, search_indexed: false }) as never,
			error: null
		});
		expect((await loadPage('?token=abc')).noindex).toBe(true);
	});

	it('même coché, une adresse à jeton porte noindex (le jeton ne doit pas finir sur Google)', async () => {
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow() as never,
			error: null
		});
		expect((await loadPage('?token=abc')).noindex).toBe(true);
	});

	it('une ligne lue sans la colonne porte noindex', async () => {
		const { search_indexed: _omitted, ...withoutColumn } = exerciseRow();
		vi.mocked(getExerciseBySlug).mockResolvedValue({
			data: withoutColumn as never,
			error: null
		});
		expect((await loadPage()).noindex).toBe(true);
	});
});

describe('/exercice/[slug] — jeton et adresse', () => {
	it('jeton valide + ancien slug (renommé) → redirection 307 vers le nouveau slug, query gardée', async () => {
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow({ slug: 'nouveau-slug', is_public: false }) as never,
			error: null
		});
		expect(await loadRedirect('?token=abc&variation=guided', 'ancien-slug')).toEqual({
			status: 307,
			location: '/exercice/nouveau-slug?token=abc&variation=guided'
		});
	});

	it('jeton d’un AUTRE exercice → redirection vers l’adresse de cet exercice', async () => {
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow({
				id: '550e8400-e29b-41d4-a716-446655440099',
				slug: null,
				is_public: false
			}) as never,
			error: null
		});
		expect(await loadRedirect('?token=abc')).toEqual({
			status: 307,
			location: '/exercice/550e8400-e29b-41d4-a716-446655440099?token=abc'
		});
	});

	it('exercice A public ouvert avec le jeton de B → redirection vers B (le jeton prime)', async () => {
		vi.mocked(getExerciseBySlug).mockResolvedValue({ data: exerciseRow(), error: null });
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow({
				id: '550e8400-e29b-41d4-a716-446655440099',
				slug: 'exercice-b'
			}) as never,
			error: null
		});
		expect((await loadRedirect('?token=abc')).location).toBe('/exercice/exercice-b?token=abc');
	});

	it('jeton invalide ou révoqué + exercice public → l’exercice de l’adresse, sans redirection', async () => {
		vi.mocked(getExerciseByShareToken).mockResolvedValue({ data: null, error: 'Token invalide' });
		vi.mocked(getExerciseBySlug).mockResolvedValue({ data: exerciseRow(), error: null });
		expect((await loadPage('?token=abc')).exercise.id).toBe('550e8400-e29b-41d4-a716-446655440003');
	});

	it('jeton invalide + adresse inconnue → 404', async () => {
		vi.mocked(getExerciseByShareToken).mockResolvedValue({ data: null, error: 'Token invalide' });
		vi.mocked(getExerciseBySlug).mockResolvedValue({ data: null, error: null } as never);
		expect(await loadStatus('?token=abc', 'inconnu')).toBe(404);
	});

	it('jeton de cet exercice, adresse par slug → affiché', async () => {
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow({ is_public: false }) as never,
			error: null
		});
		expect((await loadPage('?token=abc')).exercise.id).toBe('550e8400-e29b-41d4-a716-446655440003');
	});

	it('jeton de cet exercice, adresse par identifiant (exercice sans slug) → affiché', async () => {
		const id = '550e8400-e29b-41d4-a716-446655440003';
		vi.mocked(getExerciseByShareToken).mockResolvedValue({
			data: exerciseRow({ is_public: false, slug: null }) as never,
			error: null
		});
		expect((await loadPage('?token=abc', id)).exercise.id).toBe(id);
	});
});
