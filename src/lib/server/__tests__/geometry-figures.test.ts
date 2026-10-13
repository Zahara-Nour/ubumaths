/**
 * Figures géométriques stockées — fonctions serveur (ADR 0027).
 *
 * Un refus RLS rend zéro ligne sans erreur : chaque écriture doit le tenir pour
 * un 404, jamais pour un succès. Les tags passent par `resource-tags.ts`, simulé
 * ici (le module a ses propres tests et l'intégration couvre la chaîne entière).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { called, createFakeSupabase, methods } from './helpers/fake-supabase';

vi.mock('$lib/server/resource-tags', () => ({
	fetchResourceIdsByAnyTag: vi.fn(),
	fetchResourceTagNames: vi.fn(),
	fetchTagNamesForResources: vi.fn(),
	syncResourceTags: vi.fn()
}));

import {
	fetchResourceIdsByAnyTag,
	fetchResourceTagNames,
	fetchTagNamesForResources,
	syncResourceTags
} from '$lib/server/resource-tags';
import {
	createGeometryFigure,
	deleteGeometryFigure,
	FIGURE_CREATE_FORBIDDEN_MESSAGE,
	FIGURE_LIST_LIMIT,
	FIGURE_NOT_FOUND_MESSAGE,
	FIGURE_TAGS_NOT_SAVED_MESSAGE,
	getOwnGeometryFigure,
	getPublicGeometryFigure,
	listGeometryFigures,
	listGeometryFigureTagNames,
	toIlikePattern,
	updateGeometryFigure
} from '../geometry-figures';

const AUTHOR = '1a2b3c4d-1111-4111-8111-111111111111';
const OTHER = '9a9b9c9d-9999-4999-8999-999999999999';
const FIGURE_ID = '2b3c4d5e-2222-4222-8222-222222222222';

const INPUT = {
	title: 'Flocon',
	description: null,
	dsl_script: 'A = point(0, 0)',
	grades: ['T_SPE' as const],
	is_public: false,
	tags: ['fractales']
};

function figureRow(overrides: Record<string, unknown> = {}) {
	return {
		id: FIGURE_ID,
		author_id: AUTHOR,
		title: 'Flocon',
		description: null,
		dsl_script: 'A = point(0, 0)',
		grades: ['T_SPE'],
		is_public: false,
		created_at: '2026-10-13T10:00:00Z',
		updated_at: '2026-10-13T10:00:00Z',
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.mocked(fetchTagNamesForResources).mockResolvedValue(new Map());
	vi.mocked(syncResourceTags).mockResolvedValue(undefined);
});

describe('toIlikePattern', () => {
	it('entoure de jokers et échappe % et _', () => {
		expect(toIlikePattern('50%_x')).toBe('%50\\%\\_x%');
	});

	it('neutralise la grammaire de .or() et le joker * de PostgREST', () => {
		expect(toIlikePattern('a,b(c)"d*e\\f')).toBe('%a b c  d e f%');
	});
});

describe('listGeometryFigures', () => {
	it('sans filtre : toutes les figures visibles, récentes d’abord, bornées, sans le script', async () => {
		const fake = createFakeSupabase(() => ({ data: [figureRow()] }));
		vi.mocked(fetchTagNamesForResources).mockResolvedValue(new Map([[FIGURE_ID, ['fractales']]]));

		const figures = await listGeometryFigures(fake.client, AUTHOR, { tags: [] });

		const [query] = fake.on('geometry_figures');
		expect(called(query, 'order', 'updated_at', { ascending: false })).toBe(true);
		expect(called(query, 'limit', FIGURE_LIST_LIMIT)).toBe(true);
		expect(String(query.calls[0].args[0])).not.toContain('dsl_script');
		expect(methods(query)).not.toContain('eq');
		expect(figures[0].tags).toEqual(['fractales']);
	});

	it('combine portée « mes figures », niveau, tags et texte', async () => {
		vi.mocked(fetchResourceIdsByAnyTag).mockResolvedValue([FIGURE_ID]);
		const fake = createFakeSupabase(() => ({ data: [] }));

		await listGeometryFigures(fake.client, AUTHOR, {
			scope: 'mine',
			grade: '6',
			tags: ['aires', 'périmètres'],
			q: 'carré'
		});

		expect(fetchResourceIdsByAnyTag).toHaveBeenCalledWith(fake.client, 'geometry_figure', [
			'aires',
			'périmètres'
		]);
		const [query] = fake.on('geometry_figures');
		expect(called(query, 'eq', 'author_id', AUTHOR)).toBe(true);
		expect(called(query, 'contains', 'grades', ['6'])).toBe(true);
		expect(called(query, 'in', 'id', [FIGURE_ID])).toBe(true);
		expect(called(query, 'or', 'title.ilike.%carré%,description.ilike.%carré%')).toBe(true);
	});

	it('portée « publiques » : filtre is_public', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		await listGeometryFigures(fake.client, AUTHOR, { scope: 'public', tags: [] });
		expect(called(fake.on('geometry_figures')[0], 'eq', 'is_public', true)).toBe(true);
	});

	it('aucun tag demandé ne correspond : liste vide, sans lire la table', async () => {
		vi.mocked(fetchResourceIdsByAnyTag).mockResolvedValue([]);
		const fake = createFakeSupabase(() => ({ data: [figureRow()] }));

		expect(await listGeometryFigures(fake.client, AUTHOR, { tags: ['inconnu'] })).toEqual([]);
		expect(fake.on('geometry_figures')).toHaveLength(0);
	});

	it('une panne de lecture est une erreur 500, pas une liste vide', async () => {
		const fake = createFakeSupabase(() => ({ error: { message: 'panne' } }));
		await expect(listGeometryFigures(fake.client, AUTHOR, { tags: [] })).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('getOwnGeometryFigure', () => {
	it('rend la figure de l’auteur avec ses tags', async () => {
		vi.mocked(fetchResourceTagNames).mockResolvedValue(['fractales']);
		const fake = createFakeSupabase(() => ({ data: figureRow() }));

		const figure = await getOwnGeometryFigure(fake.client, FIGURE_ID, AUTHOR);
		expect(figure).toMatchObject({ id: FIGURE_ID, tags: ['fractales'] });
	});

	it('la figure publique d’un autre auteur rend null (pas modifiable)', async () => {
		const fake = createFakeSupabase(() => ({
			data: figureRow({ author_id: OTHER, is_public: true })
		}));
		expect(await getOwnGeometryFigure(fake.client, FIGURE_ID, AUTHOR)).toBeNull();
		expect(fetchResourceTagNames).not.toHaveBeenCalled();
	});

	it('figure inexistante ou illisible : null', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));
		expect(await getOwnGeometryFigure(fake.client, FIGURE_ID, AUTHOR)).toBeNull();
	});
});

describe('getPublicGeometryFigure', () => {
	it('filtre explicitement is_public et ne demande ni l’auteur ni les tags', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));

		expect(await getPublicGeometryFigure(fake.client, FIGURE_ID)).toBeNull();
		const [query] = fake.on('geometry_figures');
		expect(called(query, 'eq', 'is_public', true)).toBe(true);
		expect(String(query.calls[0].args[0])).not.toContain('author_id');
		expect(fake.on('resource_tags')).toHaveLength(0);
	});
});

describe('createGeometryFigure', () => {
	it('insère, relit la ligne, puis enregistre les tags', async () => {
		const fake = createFakeSupabase(() => ({ data: [figureRow()] }));

		const { figure, tagsSaved } = await createGeometryFigure(fake.client, INPUT, AUTHOR);

		const [query] = fake.on('geometry_figures');
		expect(methods(query)).toEqual(['insert', 'select']);
		expect(
			called(query, 'insert', {
				author_id: AUTHOR,
				title: 'Flocon',
				description: null,
				dsl_script: 'A = point(0, 0)',
				grades: ['T_SPE'],
				is_public: false
			})
		).toBe(true);
		expect(syncResourceTags).toHaveBeenCalledWith(fake.client, 'geometry_figure', FIGURE_ID, [
			'fractales'
		]);
		expect(figure.id).toBe(FIGURE_ID);
		expect(tagsSaved).toBe(true);
	});

	it('un refus de la RLS (élève) est un 403 en français', async () => {
		const fake = createFakeSupabase(() => ({ error: { code: '42501', message: 'rls' } }));
		await expect(createGeometryFigure(fake.client, INPUT, AUTHOR)).rejects.toMatchObject({
			status: 403,
			message: FIGURE_CREATE_FORBIDDEN_MESSAGE
		});
		expect(syncResourceTags).not.toHaveBeenCalled();
	});

	it('zéro ligne relue n’est pas un succès', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		await expect(createGeometryFigure(fake.client, INPUT, AUTHOR)).rejects.toMatchObject({
			status: 500
		});
	});

	it('tags non enregistrés : la figure créée est rendue (pas d’erreur, donc pas de doublon au réessai)', async () => {
		vi.mocked(syncResourceTags).mockRejectedValue(new Error('panne'));
		const fake = createFakeSupabase(() => ({ data: [figureRow()] }));
		const { figure, tagsSaved } = await createGeometryFigure(fake.client, INPUT, AUTHOR);
		expect(figure.id).toBe(FIGURE_ID);
		expect(tagsSaved).toBe(false);
	});
});

describe('updateGeometryFigure', () => {
	it('modifie les seules colonnes permises, relit, puis remplace les tags', async () => {
		const fake = createFakeSupabase(() => ({ data: [figureRow({ title: 'Nouveau' })] }));

		await updateGeometryFigure(fake.client, FIGURE_ID, { ...INPUT, title: 'Nouveau' });

		const [query] = fake.on('geometry_figures');
		const update = query.calls.find((c) => c.method === 'update')?.args[0];
		expect(Object.keys(update as object).sort()).toEqual([
			'description',
			'dsl_script',
			'grades',
			'is_public',
			'title'
		]);
		expect(called(query, 'eq', 'id', FIGURE_ID)).toBe(true);
		expect(methods(query)).toContain('select');
		expect(syncResourceTags).toHaveBeenCalled();
	});

	it('tags non enregistrés à la modification : erreur qui le dit', async () => {
		vi.mocked(syncResourceTags).mockRejectedValue(new Error('panne'));
		const fake = createFakeSupabase(() => ({ data: [figureRow()] }));
		await expect(updateGeometryFigure(fake.client, FIGURE_ID, INPUT)).rejects.toMatchObject({
			message: FIGURE_TAGS_NOT_SAVED_MESSAGE
		});
	});

	it('zéro ligne (pas à lui ou inexistante) : 404, et les tags ne sont pas touchés', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		await expect(updateGeometryFigure(fake.client, FIGURE_ID, INPUT)).rejects.toMatchObject({
			status: 404,
			message: FIGURE_NOT_FOUND_MESSAGE
		});
		expect(syncResourceTags).not.toHaveBeenCalled();
	});
});

describe('deleteGeometryFigure', () => {
	it('supprime et relit la ligne supprimée', async () => {
		const fake = createFakeSupabase(() => ({ data: [{ id: FIGURE_ID }] }));
		await deleteGeometryFigure(fake.client, FIGURE_ID);
		const [query] = fake.on('geometry_figures');
		expect(methods(query)).toEqual(['delete', 'eq', 'select']);
	});

	it('zéro ligne supprimée : 404, jamais un succès', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		await expect(deleteGeometryFigure(fake.client, FIGURE_ID)).rejects.toMatchObject({
			status: 404
		});
	});

	it('une panne est une erreur 500', async () => {
		const fake = createFakeSupabase(() => ({ error: { message: 'panne' } }));
		await expect(deleteGeometryFigure(fake.client, FIGURE_ID)).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('listGeometryFigureTagNames', () => {
	it('rend les noms des tags posés sur des figures, sans doublon, triés', async () => {
		const fake = createFakeSupabase(() => ({
			data: [
				{ tags: { name: 'suites' } },
				{ tags: { name: 'aires' } },
				{ tags: { name: 'aires' } },
				{ tags: null }
			]
		}));
		expect(await listGeometryFigureTagNames(fake.client)).toEqual(['aires', 'suites']);
		expect(called(fake.on('resource_tags')[0], 'eq', 'resource_kind', 'geometry_figure')).toBe(
			true
		);
	});

	it('une panne est une erreur 500', async () => {
		const fake = createFakeSupabase(() => ({ error: { message: 'panne' } }));
		await expect(listGeometryFigureTagNames(fake.client)).rejects.toMatchObject({ status: 500 });
	});
});
