/**
 * Figures géométriques stockées — fonctions serveur contre la base (Supabase local)
 * ================================================================================
 *
 * `figures-geometriques.test.ts` prouve la RLS table par table ; ce fichier prouve
 * que `src/lib/server/geometry-figures.ts` s'en sert correctement : filtres
 * combinés (niveau, tag, texte échappé, portée), tags par `resource_tags`, et
 * écritures relues — un refus ne se fait jamais passer pour un succès.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	createGeometryFigure,
	deleteGeometryFigure,
	getOwnGeometryFigure,
	getPublicGeometryFigure,
	listGeometryFigures,
	updateGeometryFigure
} from '$lib/server/geometry-figures';
import type { FigureInput } from '$lib/server/validation/geometry-figures';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

/** Préfixe unique à ce run : figures et tags créés le portent (nettoyage ciblé). */
const RUN = `itest-figsrv-${Date.now().toString(36)}`;
const TAG = `${RUN}-aires`;
const OTHER_TAG = `${RUN}-angles`;

function input(overrides: Partial<FigureInput> = {}): FigureInput {
	return {
		title: `${RUN} carré`,
		description: 'Un carré de côté 3',
		dsl_script: 'A = point(0, 0)\nB = point(3, 0)',
		grades: ['6'],
		is_public: false,
		tags: [TAG],
		...overrides
	};
}

// ============================================================================
// VARIABLES
// ============================================================================

let anonClient: SupabaseClient<Database>;
let studentClient: SupabaseClient<Database>;
let studentId: string;
let teacherClient: SupabaseClient<Database>;
let teacherId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function signedIn(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Titres rendus par la liste, restreints aux figures de ce run */
async function listedTitles(filters: Parameters<typeof listGeometryFigures>[2]): Promise<string[]> {
	const figures = await listGeometryFigures(teacherClient, teacherId, filters);
	return figures
		.map((figure) => figure.title)
		.filter((title) => title.startsWith(RUN))
		.sort();
}

// ============================================================================
// SUITE
// ============================================================================

describe('Figures géométriques : fonctions serveur contre la base', () => {
	let squareId: string;
	let triangleId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		teacherId = teacher.id;
		studentId = student.id;
		anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		teacherClient = await signedIn(teacher.email);
		studentClient = await signedIn(student.email);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.geometry_figures where title like $1', [`${RUN}%`])
			.catch(() => undefined);
		await pg
			.query('delete from public.tags where name like $1', [`${RUN}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	it('1. le prof crée deux figures, tags compris', async () => {
		const { figure: square } = await createGeometryFigure(teacherClient, input(), teacherId);
		const { figure: triangle } = await createGeometryFigure(
			teacherClient,
			input({
				title: `${RUN} triangle à 50%`,
				description: null,
				grades: ['5'],
				is_public: true,
				tags: [OTHER_TAG]
			}),
			teacherId
		);
		squareId = square.id;
		triangleId = triangle.id;

		const own = await getOwnGeometryFigure(teacherClient, squareId, teacherId);
		expect(own?.tags).toEqual([TAG]);
	});

	it('2. la liste filtre par niveau, par tag, par texte et par portée', async () => {
		expect(await listedTitles({ tags: [] })).toEqual([`${RUN} carré`, `${RUN} triangle à 50%`]);
		expect(await listedTitles({ grade: '6', tags: [] })).toEqual([`${RUN} carré`]);
		expect(await listedTitles({ tags: [OTHER_TAG] })).toEqual([`${RUN} triangle à 50%`]);
		// Au moins un des tags
		expect(await listedTitles({ tags: [TAG, OTHER_TAG] })).toHaveLength(2);
		// Filtres combinés : niveau 6 ET tag du triangle → rien
		expect(await listedTitles({ grade: '6', tags: [OTHER_TAG] })).toEqual([]);
		// Texte : titre ou description
		expect(await listedTitles({ q: 'côté 3', tags: [] })).toEqual([`${RUN} carré`]);
		expect(await listedTitles({ scope: 'public', tags: [] })).toEqual([`${RUN} triangle à 50%`]);
		expect(await listedTitles({ scope: 'mine', tags: [] })).toHaveLength(2);
	});

	it('3. le texte cherché est littéral : % et _ ne sont pas des jokers', async () => {
		expect(await listedTitles({ q: '50%', tags: [] })).toEqual([`${RUN} triangle à 50%`]);
		// « c_rré » ne doit pas trouver « carré » : _ n'est pas un joker
		expect(await listedTitles({ q: 'c_rré', tags: [] })).toEqual([]);
		// Les caractères de la grammaire de .or() ne cassent pas la requête
		expect(await listedTitles({ q: 'carré),title.ilike.(*', tags: [] })).toEqual([]);
		// Tentative d'ajouter une branche au filtre : ni erreur, ni figure ajoutée
		expect(
			await listedTitles({ q: 'x),is_public.eq.false,title.ilike.(*', scope: 'public', tags: [] })
		).toEqual([]);
	});

	it('4. la modification relit sa ligne et remplace les tags', async () => {
		const updated = await updateGeometryFigure(
			teacherClient,
			squareId,
			input({ title: `${RUN} carré modifié`, tags: [OTHER_TAG] })
		);
		expect(updated.title).toBe(`${RUN} carré modifié`);
		expect(await listedTitles({ tags: [TAG] })).toEqual([]);
		expect(await listedTitles({ tags: [OTHER_TAG] })).toHaveLength(2);
	});

	it('5. la page publique : publique lisible sans compte, privée introuvable', async () => {
		expect((await getPublicGeometryFigure(anonClient, triangleId))?.title).toBe(
			`${RUN} triangle à 50%`
		);
		expect(await getPublicGeometryFigure(anonClient, squareId)).toBeNull();
		// Même l'auteur : la page publique ne montre pas une figure privée
		expect(await getPublicGeometryFigure(teacherClient, squareId)).toBeNull();
	});

	it('6. un élève ne crée pas de figure : refus 403, rien en base', async () => {
		await expect(
			createGeometryFigure(studentClient, input({ title: `${RUN} élève` }), studentId)
		).rejects.toMatchObject({ status: 403 });
		const pg = await getPostgresClient();
		const { rows } = await pg.query('select id from public.geometry_figures where title = $1', [
			`${RUN} élève`
		]);
		expect(rows).toHaveLength(0);
	});

	it('7. un élève ne modifie ni ne supprime la figure publique : 404, rien changé', async () => {
		await expect(
			updateGeometryFigure(studentClient, triangleId, input({ title: `${RUN} piraté` }))
		).rejects.toMatchObject({ status: 404 });
		await expect(deleteGeometryFigure(studentClient, triangleId)).rejects.toMatchObject({
			status: 404
		});
		expect(await getPublicGeometryFigure(anonClient, triangleId)).not.toBeNull();
	});

	it('8. le prof supprime ses figures ; une seconde suppression rend 404', async () => {
		await deleteGeometryFigure(teacherClient, squareId);
		await deleteGeometryFigure(teacherClient, triangleId);
		expect(await listedTitles({ tags: [] })).toEqual([]);
		await expect(deleteGeometryFigure(teacherClient, squareId)).rejects.toMatchObject({
			status: 404
		});
	});
});
