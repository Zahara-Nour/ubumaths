/**
 * Séries (B11, B12, B13 — verrou et suppression).
 *
 * Le verrou est tenu par la BASE (trigger, SQLSTATE UBS01) ; ce module doit
 * traduire l'erreur en français, jamais la confondre avec une panne ni la
 * prendre pour un succès. Un refus RLS rend zéro ligne : 404, pas « modifié ».
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	copyTitle,
	createSeries,
	deleteSeries,
	duplicateSeries,
	getTeacherSeries,
	SERIES_IN_USE_MESSAGE,
	SERIES_LOCKED_DELETE_MESSAGE,
	SERIES_LOCKED_UPDATE_MESSAGE,
	SeriesError,
	updateSeries
} from '../series';
import { called, createFakeSupabase, type Call, type Result } from './helpers/fake-supabase';

const TEACHER = '1a2b3c4d-1111-4111-8111-111111111111';
const SERIES_ID = '2b3c4d5e-2222-4222-8222-222222222222';
const COPY_ID = '3c4d5e6f-3333-4333-8333-333333333333';
const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

function seriesRow(overrides: Record<string, unknown> = {}) {
	return {
		id: SERIES_ID,
		title: 'Tables de 7',
		description: null,
		grade: '6',
		categories: [ITEM],
		created_by: TEACHER,
		created_at: '2026-09-30T10:00:00Z',
		updated_at: '2026-09-30T10:00:00Z',
		...overrides
	};
}

const isInsert = (calls: Call[]) => calls.some((c) => c.method === 'insert');

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createSeries (B11)', () => {
	it('insère la composition du panier et rend la série', async () => {
		const fake = createFakeSupabase(() => ({ data: seriesRow() }));

		const series = await createSeries(
			fake.client,
			{ title: 'Tables de 7', grade: '6', description: null, categories: [ITEM] },
			TEACHER
		);

		const [insert] = fake.on('series');
		expect(
			called(insert, 'insert', {
				title: 'Tables de 7',
				grade: '6',
				description: null,
				categories: [ITEM],
				created_by: TEACHER
			})
		).toBe(true);
		expect(series).toMatchObject({ id: SERIES_ID, categories: [ITEM] });
	});

	it('une panne à l’insertion est une erreur 500, pas un succès', async () => {
		const fake = createFakeSupabase(() => ({ error: { code: '42501', message: 'rls' } }));
		await expect(
			createSeries(
				fake.client,
				{ title: 'T', grade: '6', description: null, categories: [ITEM] },
				TEACHER
			)
		).rejects.toMatchObject({ status: 500 });
	});
});

describe('duplicateSeries (B12)', () => {
	it('crée « Copie de <titre> », nouvelle ligne, même composition', async () => {
		const fake = createFakeSupabase((_table, calls) =>
			isInsert(calls)
				? { data: seriesRow({ id: COPY_ID, title: 'Copie de Tables de 7' }) }
				: { data: seriesRow() }
		);

		const copy = await duplicateSeries(fake.client, SERIES_ID, TEACHER);

		const insert = fake.on('series').find((q) => isInsert(q.calls))!;
		const payload = insert.calls.find((c) => c.method === 'insert')!.args[0] as Record<
			string,
			unknown
		>;
		expect(payload).toMatchObject({
			title: 'Copie de Tables de 7',
			categories: [ITEM],
			created_by: TEACHER
		});
		// Nouvelle ligne : jamais rattachée à une évaluation, donc jamais verrouillée
		expect(payload).not.toHaveProperty('id');
		expect(copy.id).toBe(COPY_ID);
	});

	it('duplique même une série verrouillée (une lecture seule suffit)', async () => {
		// La série d'origine est verrouillée : toute écriture sur ELLE lèverait UBS01
		const fake = createFakeSupabase((_table, calls) => {
			if (calls.some((c) => c.method === 'update' || c.method === 'delete')) {
				return { error: { code: 'UBS01', message: 'verrouillée' } };
			}
			return isInsert(calls)
				? { data: seriesRow({ id: COPY_ID, title: 'Copie de Tables de 7' }) }
				: { data: seriesRow() };
		});

		await expect(duplicateSeries(fake.client, SERIES_ID, TEACHER)).resolves.toMatchObject({
			id: COPY_ID
		});
		expect(fake.queries.every((q) => !q.calls.some((c) => c.method === 'update'))).toBe(true);
	});

	it('série introuvable : 404', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));
		await expect(duplicateSeries(fake.client, SERIES_ID, TEACHER)).rejects.toMatchObject({
			status: 404
		});
	});

	it('titre de copie tronqué à 200 caractères', () => {
		expect(copyTitle('x'.repeat(200))).toHaveLength(200);
		expect(copyTitle('x'.repeat(200)).startsWith('Copie de ')).toBe(true);
	});
});

describe('updateSeries (B13 — verrou)', () => {
	it('série verrouillée (UBS01) : 409 et message français clair', async () => {
		const fake = createFakeSupabase(() => ({
			error: { code: 'UBS01', message: 'Série verrouillée' }
		}));

		const promise = updateSeries(fake.client, SERIES_ID, { title: 'Nouveau', description: null });
		await expect(promise).rejects.toBeInstanceOf(SeriesError);
		await expect(promise).rejects.toMatchObject({
			status: 409,
			message: 'Cette série a déjà été commencée par un élève : duplique-la pour la modifier'
		});
		expect(SERIES_LOCKED_UPDATE_MESSAGE).toContain('duplique-la');
	});

	it('refus RLS silencieux (0 ligne) : 404, pas « enregistré »', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		await expect(
			updateSeries(fake.client, SERIES_ID, { title: 'Nouveau', description: null })
		).rejects.toMatchObject({ status: 404 });
	});

	it('demande les lignes modifiées (.select) pour détecter le refus', async () => {
		const fake = createFakeSupabase(() => ({ data: [seriesRow({ title: 'Nouveau' })] }));
		const updated = await updateSeries(fake.client, SERIES_ID, {
			title: 'Nouveau',
			description: null
		});
		expect(updated.title).toBe('Nouveau');
		expect(fake.on('series')[0].calls.map((c) => c.method)).toEqual(['update', 'eq', 'select']);
	});

	it('autre panne : 500', async () => {
		const fake = createFakeSupabase(() => ({ error: { code: '08006', message: 'réseau' } }));
		await expect(
			updateSeries(fake.client, SERIES_ID, { title: 'Nouveau', description: null })
		).rejects.toMatchObject({ status: 500 });
	});
});

describe('deleteSeries (Q31)', () => {
	it('série utilisée par une évaluation (23503) : 409 et message clair', async () => {
		const fake = createFakeSupabase(() => ({
			error: { code: '23503', message: 'violates foreign key constraint' }
		}));
		await expect(deleteSeries(fake.client, SERIES_ID)).rejects.toMatchObject({
			status: 409,
			message: SERIES_IN_USE_MESSAGE
		});
	});

	it('série verrouillée (UBS01) : 409, message de verrou', async () => {
		const fake = createFakeSupabase(() => ({ error: { code: 'UBS01', message: 'verrouillée' } }));
		await expect(deleteSeries(fake.client, SERIES_ID)).rejects.toMatchObject({
			status: 409,
			message: SERIES_LOCKED_DELETE_MESSAGE
		});
	});

	it('0 ligne supprimée : 404', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		await expect(deleteSeries(fake.client, SERIES_ID)).rejects.toMatchObject({ status: 404 });
	});

	it('suppression effective : aucune erreur', async () => {
		const fake = createFakeSupabase(() => ({ data: [{ id: SERIES_ID }] }));
		await expect(deleteSeries(fake.client, SERIES_ID)).resolves.toBeUndefined();
	});
});

describe('getTeacherSeries (C17)', () => {
	it('verrou = une séance est rattachée à une évaluation de la série', async () => {
		const OTHER = '4d5e6f70-4444-4444-8444-444444444444';
		const EVAL_A = '5e6f7081-5555-4555-8555-555555555555';
		const EVAL_B = '6f708192-6666-4666-8666-666666666666';
		const responses: Record<string, Result> = {
			series: { data: [seriesRow(), seriesRow({ id: OTHER, title: 'Autre' })] },
			evaluations: {
				data: [
					{ id: EVAL_A, series_id: SERIES_ID },
					{ id: EVAL_B, series_id: OTHER }
				]
			},
			test_sessions: { data: [{ evaluation_id: EVAL_A }] }
		};
		const fake = createFakeSupabase((table) => responses[table]);

		const list = await getTeacherSeries(fake.client, TEACHER);

		expect(list.map((s) => [s.id, s.locked, s.evaluations_count])).toEqual([
			[SERIES_ID, true, 1],
			[OTHER, false, 1]
		]);
		// Séances cherchées par evaluation_id
		expect(called(fake.on('test_sessions')[0], 'in', 'evaluation_id', [EVAL_A, EVAL_B])).toBe(true);
	});

	it('catégories illisibles en base : liste vide, pas de plantage', async () => {
		const fake = createFakeSupabase((table) =>
			table === 'series' ? { data: [seriesRow({ categories: { oups: true } })] } : { data: [] }
		);
		const [series] = await getTeacherSeries(fake.client, TEACHER);
		expect(series.categories).toEqual([]);
	});
});
