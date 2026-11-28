/**
 * Enregistrer catégorie, notions et titre d'une fiche (ADR 0041, PR 2b)
 * =====================================================================
 *
 * Ce que fait la route `PUT /api/worksheets/[id]` quand le prof change la
 * catégorie, les notions, la case « titre libre » ou le type, par
 * `worksheet-classification.ts`, avec le client CONNECTÉ du prof (la RLS
 * échoue en silence : chaque écriture est relue en superutilisateur).
 *
 * Décisions de David (2026-11-19) :
 * - `title` toujours rempli : sans titre libre, le titre composé
 *   (« Suites · Entraînement technique ») y est écrit et tenu à jour ;
 * - autant de notions qu'on veut, quel que soit le type ou la catégorie
 *   (règle « une notion sauf Révisions et Automatismes » retirée le
 *   2026-11-19, ADR 0041 amendé) ; pas de catégorie hors fiche d'exercices.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { isHttpError } from '@sveltejs/kit';
import { GET, PUT } from '../../src/routes/api/worksheets/[id]/+server';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	applyClassification,
	loadWorksheetClassifications,
	prepareClassification,
	type ClassificationRequest
} from '#lib/server/worksheets/worksheet-classification.ts';
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// Majuscule en tête : le titre composé met une majuscule à chaque notion
const RUN = `Itest-enreg-cat-${Date.now().toString(36)}`;

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let teacherClient: SupabaseClient<Database>;

let branchId: string;
/** Seconde branche : Dérivation n'est pas de la branche des suites */
let analyseId: string;
let suitesId: string;
let derivationId: string;
let probabilitesId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql(query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
	const pg = await getPostgresClient();
	return (await pg.query(query, params)).rows;
}

async function signedIn(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function node(kind: string, parentId: string | null, name: string): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.classification_nodes (kind, parent_id, name) values ($1, $2, $3) returning id`,
		[kind, parentId, name]
	);
	return id as string;
}

/** Une fiche du prof, posée en superutilisateur, avec ses notions */
async function worksheet(
	type: string,
	category: string | null,
	nodeIds: string[] = [],
	customTitle = true
): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by, category, custom_title)
		 values ($1, $2, 'draft', $3, $4, $5) returning id`,
		[RUN, type, teacherId, category, customTitle]
	);
	for (const [position, nodeId] of nodeIds.entries()) {
		await sql(
			`insert into public.worksheet_classifications (worksheet_id, node_id, position)
			 values ($1, $2, $3)`,
			[id, nodeId, position]
		);
	}
	return id as string;
}

interface Stored {
	title: string;
	type: string;
	category: string | null;
	custom_title: boolean;
	notions: string[];
}

/** La fiche relue en superutilisateur */
async function stored(id: string): Promise<Stored> {
	const [row] = await sql(
		'select title, type, category, custom_title from public.worksheets where id = $1',
		[id]
	);
	const notions = await sql(
		`select node_id from public.worksheet_classifications
		 where worksheet_id = $1 order by position`,
		[id]
	);
	return { ...(row as Omit<Stored, 'notions'>), notions: notions.map((n) => n.node_id as string) };
}

/**
 * Ce que fait la route PUT : préparer (lecture, règle, titre composé), puis
 * appliquer en une transaction (notions en trop retirées, fiche mise à jour,
 * notions écrites).
 * Rend le message d'erreur 400, ou null.
 */
async function save(
	id: string,
	request: ClassificationRequest,
	title?: string
): Promise<string | null> {
	const [row] = await sql(
		'select id, type, category, custom_title from public.worksheets where id = $1',
		[id]
	);
	const plan = await prepareClassification(
		teacherClient,
		row as { id: string; type: string; category: string | null; custom_title: boolean },
		{ ...request, ...(title !== undefined ? { title } : {}) }
	);
	if (!plan.ok) return plan.message;
	// Comme la route : le titre et le type demandés, puis ce que décide le plan
	const update = {
		...(title !== undefined ? { title } : {}),
		...(request.type ? { type: request.type } : {}),
		...plan.update
	};
	const saved = await applyClassification(teacherClient, id, plan, update);
	expect(saved.id).toBe(id);
	return null;
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	teacherId = teacher.id;
	teacherClient = await signedIn(teacher.email);

	branchId = await node('branch', null, `${RUN} branche`);
	suitesId = await node('notion', branchId, `${RUN} Suites`);
	analyseId = await node('branch', null, `${RUN} Analyse`);
	derivationId = await node('notion', analyseId, `${RUN} Dérivation`);
	probabilitesId = await node('notion', branchId, `${RUN} Probabilités`);
});

afterAll(async () => {
	await sql('delete from public.worksheets where title like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await sql('delete from public.worksheets where title like $1', [`%${RUN}%`]).catch(
		() => undefined
	);
	await sql(`delete from public.classification_nodes where name like $1 and kind <> 'branch'`, [
		`${RUN}%`
	]).catch(() => undefined);
	await sql('delete from public.classification_nodes where name like $1', [`${RUN}%`]).catch(
		() => undefined
	);
});

describe('titre composé', () => {
	it('une notion et une catégorie, sans titre libre : « notion · catégorie » en base', async () => {
		const id = await worksheet('worksheet', null);
		expect(
			await save(id, {
				category: 'technical_practice',
				custom_title: false,
				notions: [suitesId]
			})
		).toBeNull();
		expect(await stored(id)).toEqual({
			title: `${RUN} Suites · Entraînement technique`,
			type: 'worksheet',
			category: 'technical_practice',
			custom_title: false,
			notions: [suitesId]
		});
	});

	it('le titre envoyé par le client est ignoré sans titre libre', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId], false);
		expect(await save(id, { custom_title: false }, 'Autre chose')).toBeNull();
		expect((await stored(id)).title).toBe(`${RUN} Suites · Applications`);
	});

	it('sans notion : la catégorie seule', async () => {
		const id = await worksheet('worksheet', null);
		expect(await save(id, { category: 'applications', custom_title: false })).toBeNull();
		expect((await stored(id)).title).toBe('Applications');
	});

	it('ni notion, ni catégorie, ni titre libre : refusé, rien d’écrit', async () => {
		const id = await worksheet('worksheet', null);
		expect(await save(id, { custom_title: false })).toMatch(/titre/i);
		expect(await stored(id)).toMatchObject({ title: RUN, custom_title: true });
	});

	it('Révisions : les notions dans l’ordre choisi', async () => {
		const id = await worksheet('worksheet', null);
		expect(
			await save(id, {
				category: 'review',
				custom_title: false,
				notions: [derivationId, suitesId]
			})
		).toBeNull();
		expect(await stored(id)).toMatchObject({
			title: `${RUN} Dérivation · ${RUN} Suites · Révisions`,
			notions: [derivationId, suitesId]
		});
	});
});

describe('titre libre', () => {
	it('le titre envoyé est gardé tel quel', async () => {
		const id = await worksheet('worksheet', 'review', [suitesId, derivationId], false);
		expect(await save(id, { custom_title: true }, `Bac blanc ${RUN}`)).toBeNull();
		expect(await stored(id)).toMatchObject({
			title: `Bac blanc ${RUN}`,
			custom_title: true,
			category: 'review',
			notions: [suitesId, derivationId]
		});
	});
});

describe('nombre de notions', () => {
	it('Révisions à trois notions → Applications à une : les notions en trop partent d’abord', async () => {
		const id = await worksheet('worksheet', 'review', [suitesId, derivationId, probabilitesId]);
		expect(await save(id, { category: 'applications', notions: [derivationId] })).toBeNull();
		expect(await stored(id)).toMatchObject({
			category: 'applications',
			notions: [derivationId]
		});
	});

	it('Applications à une notion → Automatismes à deux : la catégorie change avant l’ajout', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId]);
		expect(
			await save(id, { category: 'automatisms', notions: [suitesId, derivationId] })
		).toBeNull();
		expect(await stored(id)).toMatchObject({
			category: 'automatisms',
			notions: [suitesId, derivationId]
		});
	});

	it('deux notions en Applications : acceptées, titre composé des deux', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId], false);
		expect(await save(id, { notions: [suitesId, derivationId] })).toBeNull();
		expect(await stored(id)).toMatchObject({
			notions: [suitesId, derivationId],
			title: `${RUN} Suites · ${RUN} Dérivation · Applications`
		});
	});

	it('passer en Applications en gardant deux notions : accepté', async () => {
		const id = await worksheet('worksheet', 'review', [suitesId, derivationId]);
		expect(await save(id, { category: 'applications' })).toBeNull();
		expect(await stored(id)).toMatchObject({
			category: 'applications',
			notions: [suitesId, derivationId]
		});
	});

	it('deux notions d’une même branche : la branche en titre (David, 2026-11-20)', async () => {
		const id = await worksheet('worksheet', 'technical_practice', [suitesId], false);
		expect(await save(id, { notions: [suitesId, probabilitesId] })).toBeNull();
		expect(await stored(id)).toMatchObject({
			notions: [suitesId, probabilitesId],
			title: `${RUN} branche · Entraînement technique`
		});
	});

	it('une seule notion : son nom en titre, pas la branche', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId, probabilitesId], false);
		expect(await save(id, { notions: [probabilitesId] })).toBeNull();
		expect((await stored(id)).title).toBe(`${RUN} Probabilités · Applications`);
	});

	it('titre composé de plus de 255 caractères : refusé, rien d’écrit', async () => {
		const longIds: string[] = [];
		for (let i = 0; i < 6; i++) {
			// Deux branches : des notions d'une seule se titreraient par la branche
			longIds.push(
				await node(
					'notion',
					i % 2 ? branchId : analyseId,
					`${RUN} ${'notion longue '.repeat(3)}${i}`
				)
			);
		}
		const id = await worksheet('worksheet', 'technical_practice', [suitesId], false);
		expect(await save(id, { notions: longIds })).toMatch(/trop long/i);
		expect((await stored(id)).notions).toEqual([suitesId]);
	});

	it('une branche n’est pas une notion : refusé', async () => {
		const id = await worksheet('worksheet', null);
		expect(await save(id, { notions: [branchId] })).toMatch(/notion/i);
		expect((await stored(id)).notions).toEqual([]);
	});

	it('nœud inconnu : refusé', async () => {
		const id = await worksheet('worksheet', null);
		expect(await save(id, { notions: ['00000000-0000-4000-8000-00000000abcd'] })).toMatch(
			/notion/i
		);
	});
});

describe('type de la fiche', () => {
	it('fiche d’exercices → évaluation : la catégorie s’efface, plusieurs notions possibles', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId], false);
		expect(
			await save(id, { type: 'assessment', notions: [suitesId, derivationId] }, `Contrôle ${RUN}`)
		).toBeNull();
		expect(await stored(id)).toMatchObject({
			type: 'assessment',
			category: null,
			title: `Contrôle ${RUN}`,
			notions: [suitesId, derivationId]
		});
	});

	it('fiche d’exercices au titre composé → évaluation, sans titre envoyé : titre libre, sans la catégorie', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId], false);
		expect(await save(id, { type: 'assessment' })).toBeNull();
		expect(await stored(id)).toMatchObject({
			type: 'assessment',
			category: null,
			custom_title: true,
			title: `${RUN} Suites`
		});
	});

	it('→ évaluation avec deux notions d’une même branche : les notions en toutes lettres, pas la branche', async () => {
		const id = await worksheet('worksheet', 'applications', [suitesId, probabilitesId], false);
		expect(await save(id, { type: 'assessment' })).toBeNull();
		expect((await stored(id)).title).toBe(`${RUN} Suites · ${RUN} Probabilités`);
	});

	it('évaluation : une catégorie demandée est refusée', async () => {
		const id = await worksheet('assessment', null);
		expect(await save(id, { category: 'review' })).toMatch(/catégorie/i);
	});

	it('évaluation à deux notions → fiche d’exercices sans catégorie : accepté', async () => {
		const id = await worksheet('assessment', null, [suitesId, derivationId]);
		expect(await save(id, { type: 'worksheet' })).toBeNull();
		expect(await stored(id)).toMatchObject({
			type: 'worksheet',
			notions: [suitesId, derivationId]
		});
	});
});

describe('lecture', () => {
	it('les notions avec leur nom, dans l’ordre', async () => {
		const id = await worksheet('worksheet', 'review', [derivationId, suitesId]);
		expect(await loadWorksheetClassifications(teacherClient, id)).toEqual([
			{
				node_id: derivationId,
				name: `${RUN} Dérivation`,
				kind: 'notion',
				branch: `${RUN} Analyse`,
				name_en: null,
				branch_en: null,
				position: 0
			},
			{
				node_id: suitesId,
				name: `${RUN} Suites`,
				kind: 'notion',
				branch: `${RUN} branche`,
				name_en: null,
				branch_en: null,
				position: 1
			}
		]);
	});

	it('les noms anglais de la notion et de sa branche, pour le PDF anglais (ADR 0043)', async () => {
		const id = await worksheet('worksheet', 'review', [derivationId, suitesId]);
		const translated = (name: string) => JSON.stringify({ en: { name } });
		await sql('update public.classification_nodes set translations = $1 where id = $2', [
			translated('Derivatives'),
			derivationId
		]);
		await sql('update public.classification_nodes set translations = $1 where id = $2', [
			translated('Calculus'),
			analyseId
		]);
		try {
			expect(await loadWorksheetClassifications(teacherClient, id)).toMatchObject([
				{ node_id: derivationId, name_en: 'Derivatives', branch_en: 'Calculus' },
				{ node_id: suitesId, name_en: null, branch_en: null }
			]);
		} finally {
			await sql(
				`update public.classification_nodes set translations = '{}' where id = any($1::uuid[])`,
				[[derivationId, analyseId]]
			);
		}
	});

	it('une notion renommée : le titre composé se remet à jour au prochain enregistrement', async () => {
		const id = await worksheet('worksheet', 'applications', [probabilitesId], false);
		await sql('update public.classification_nodes set name = $1 where id = $2', [
			`${RUN} Probas`,
			probabilitesId
		]);
		expect(await save(id, {})).toBeNull();
		expect((await stored(id)).title).toBe(`${RUN} Probas · Applications`);
	});
});

describe('route PUT puis GET /api/worksheets/[id]', () => {
	/** Les `locals` de la route, avec le client CONNECTÉ du prof */
	function locals(): App.Locals {
		return {
			supabase: teacherClient,
			safeGetSession: vi.fn().mockResolvedValue({ user: { id: teacherId } as User }),
			requestId: crypto.randomUUID()
		} as unknown as App.Locals;
	}

	async function put(id: string, body: unknown): Promise<{ status: number; json: unknown }> {
		const request = new Request(`http://localhost/api/worksheets/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		});
		try {
			const response = await PUT({ locals: locals(), params: { id }, request } as never);
			return { status: response.status, json: await response.json() };
		} catch (cause) {
			if (isHttpError(cause)) return { status: cause.status, json: cause.body };
			throw cause;
		}
	}

	it('enregistre, puis relit catégorie, case et notions nommées (le schéma ne les retire pas)', async () => {
		const id = await worksheet('worksheet', null);
		const saved = await put(id, {
			category: 'technical_practice',
			custom_title: false,
			notions: [suitesId]
		});
		expect(saved.status).toBe(200);
		expect(saved.json).toMatchObject({
			worksheet: {
				title: `${RUN} Suites · Entraînement technique`,
				classifications: [{ node_id: suitesId, name: `${RUN} Suites`, position: 0 }]
			}
		});

		const response = await GET({ locals: locals(), params: { id } } as never);
		const { worksheet: read } = (await response.json()) as { worksheet: Record<string, unknown> };
		expect(read).toMatchObject({
			category: 'technical_practice',
			custom_title: false,
			classifications: [{ node_id: suitesId, name: `${RUN} Suites`, kind: 'notion', position: 0 }]
		});
	});

	it('deux notions en Entraînement technique : 200, enregistrées dans l’ordre', async () => {
		const id = await worksheet('worksheet', 'technical_practice', [suitesId]);
		const saved = await put(id, { notions: [derivationId, suitesId] });
		expect(saved.status).toBe(200);
		expect((await stored(id)).notions).toEqual([derivationId, suitesId]);
	});

	it('style refusé dans le même enregistrement : 403, aucune notion retirée', async () => {
		// Un seul prof par base (mono-professeur) : le style d'un admin
		const other = await TestData.profile().withRole('admin').create();
		const [{ id: styleId }] = await sql(
			'insert into public.worksheet_styles (owner_id, name) values ($1, $2) returning id',
			[other.id, `${RUN} style d’un autre`]
		);
		const id = await worksheet('worksheet', 'review', [suitesId, derivationId, probabilitesId]);
		const saved = await put(id, {
			category: 'applications',
			notions: [suitesId],
			style_id: styleId
		});
		expect(saved.status).toBe(403);
		expect(await stored(id)).toMatchObject({
			category: 'review',
			notions: [suitesId, derivationId, probabilitesId]
		});
	});

	it('notions seules, sans autre champ : acceptées', async () => {
		const id = await worksheet('assessment', null);
		const saved = await put(id, { notions: [derivationId, suitesId] });
		expect(saved.status).toBe(200);
		expect((await stored(id)).notions).toEqual([derivationId, suitesId]);
	});
});
