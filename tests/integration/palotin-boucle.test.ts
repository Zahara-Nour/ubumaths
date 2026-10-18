/**
 * La boucle du Palotin tourne (étape 1, docs/wip/mathoux-conception.md § 8)
 * ==========================================================================
 *
 * Vrais clients, vraie RLS, vraie fonction `add_buddy_xp`, par les vraies
 * routes. Chaque gain est relu dans `student_buddies` au client service :
 *
 * - un Entraînement fait grossir le Palotin, et le thème du programme de la
 *   question rejoint `themes_explored` (bonus « nouveau thème ») ;
 * - une séance flash ne rapporte rien (auto-évaluée) ;
 * - un élève sans Palotin enregistre sa séance, aucune ligne Palotin n'est créée ;
 * - une séance de révision espacée rapporte son forfait quand la DERNIÈRE carte
 *   due est passée, et une seule fois dans la journée.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { XP_SOURCES } from '$lib/utils/buddy-xp';

// `add_buddy_xp` et la lecture des cartes de cours partent au client service :
// le brancher sur la base LOCALE.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { POST as testsSaveRoute } from '../../src/routes/api/tests/save/+server';
import { POST as reviewSubmitRoute } from '../../src/routes/api/srs/review/submit/+server';

// Types
type Person = { id: string; client: SupabaseClient<Database> };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
/** Modèle du décor (identifiant fixe, supprimé avant et après). */
const TEMPLATE_ID = 'a0c0e5e0-0000-4000-8000-0000000b0dd1';
const THEME_NAME = 'TEST Palotin boucle';

// Variables
const service = createServiceRoleClient();
let teacher: Person;
let withBuddy: Person;
let withoutBuddy: Person;
let themeId: string;
let deckId: string;
let cardIds: string[];

// Functions
async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function person(role: 'student' | 'teacher'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await clientFor(profile.email) };
}

function buildLocals(p: Person): App.Locals {
	const user = { id: p.id } as User;
	return {
		supabase: p.client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user, session: null }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function postRequest(body: unknown): Request {
	return new Request('http://localhost/x', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function insertRow(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`décor ${table} : ${error.message}`);
	return (data as { id: string }).id;
}

/** Le Palotin de l'élève, relu HORS RLS. */
async function buddyOf(p: Person) {
	const { data, error } = await service
		.from('student_buddies')
		.select('xp, themes_explored')
		.eq('student_id', p.id)
		.maybeSingle();
	expect(error).toBeNull();
	return data;
}

/** Une séance d'une question (le modèle du décor), juste. */
function saveBody(mode: 'interactive' | 'flash') {
	return {
		result: {
			mode,
			score: 1,
			scorePercentage: 100,
			totalQuestions: 1,
			correctAnswers: 1,
			timeSpent: 20,
			averageTime: 20,
			completedAt: new Date().toISOString(),
			answers: [
				{
					index: 0,
					instance: {
						templateId: TEMPLATE_ID,
						statement: 'Combien font 2 + 2 ?',
						theme: 'Calcul',
						generatedAt: new Date().toISOString()
					},
					isCorrect: true,
					timeSpent: 20,
					attempts: 1
				}
			]
		},
		categories: [
			{
				category: { theme: 'Calcul', domain: 'Nombres', subdomain: null, level: 5 },
				quantity: 1,
				delay: 20
			}
		]
	};
}

async function save(p: Person, mode: 'interactive' | 'flash') {
	const response = await testsSaveRoute({
		locals: buildLocals(p),
		request: postRequest(saveBody(mode))
	} as never);
	expect(response.status, 'statut de /api/tests/save').toBe(201);
	return (await response.json()) as { sessionId: string; buddy_xp: unknown };
}

async function review(p: Person, cardId: string) {
	const response = await reviewSubmitRoute({
		locals: buildLocals(p),
		request: postRequest({ cardId, deckId, grade: 3 })
	} as never);
	expect(response.status, 'statut de /api/srs/review/submit').toBe(200);
	return (await response.json()) as {
		success: boolean;
		buddy_xp: { xpResult: { xp_gained: number } } | null;
	};
}

async function removeDecor() {
	await service.from('skill_attempts').delete().eq('template_id', TEMPLATE_ID);
	await service.from('srs_card_stats').delete().eq('card_reference_id', TEMPLATE_ID);
	await service.from('question_template_points').delete().eq('template_id', TEMPLATE_ID);
	await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
	const { data: themes } = await service
		.from('curriculum_themes')
		.select('id')
		.eq('name', THEME_NAME);
	const themeIds = (themes ?? []).map((t) => t.id);
	if (themeIds.length === 0) return;
	const { data: objectives } = await service
		.from('curriculum_objectives')
		.select('id')
		.in('theme_id', themeIds);
	const objectiveIds = (objectives ?? []).map((o) => o.id);
	if (objectiveIds.length > 0) {
		await service.from('curriculum_points').delete().in('objective_id', objectiveIds);
		await service.from('curriculum_objectives').delete().in('id', objectiveIds);
	}
	await service.from('curriculum_themes').delete().in('id', themeIds);
}

describe('la boucle du Palotin tourne', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await removeDecor();
		teacher = await person('teacher');
		withBuddy = await person('student');
		withoutBuddy = await person('student');

		// Programme : thème → objectif → point, validé par le modèle du décor
		themeId = await insertRow('curriculum_themes', { grade: '5', name: THEME_NAME });
		const objectiveId = await insertRow('curriculum_objectives', {
			theme_id: themeId,
			name: 'Objectif Palotin'
		});
		const pointId = await insertRow('curriculum_points', {
			objective_id: objectiveId,
			name: 'Point Palotin',
			kind: 'savoir_faire'
		});
		await insertRow('question_templates', {
			id: TEMPLATE_ID,
			type: 'numerical_exact',
			title: 'Palotin boucle',
			theme: 'Calcul',
			domain: 'Domaine Palotin boucle',
			subdomain: null,
			level: 1,
			grades: ['5'],
			status: 'published',
			variations: [{}],
			created_by: teacher.id
		});
		const { error: linkError } = await service
			.from('question_template_points')
			.insert({ template_id: TEMPLATE_ID, point_id: pointId });
		if (linkError) throw new Error(`décor question_template_points : ${linkError.message}`);

		// Le Palotin de l'élève (posé au service, comme après le quiz de choix)
		const { error: buddyError } = await service
			.from('student_buddies')
			.insert({ student_id: withBuddy.id, palotin_type: 'giron' });
		if (buddyError) throw new Error(`décor student_buddies : ${buddyError.message}`);

		// Paquet de révision de l'élève : deux cartes libres, jamais vues (donc dues)
		deckId = await insertRow('srs_decks', {
			owner_id: withBuddy.id,
			name: 'Paquet Palotin boucle',
			deck_type: 'personal'
		});
		cardIds = [];
		for (const recto of ['Recto 1', 'Recto 2']) {
			cardIds.push(
				await insertRow('srs_cards', {
					deck_id: deckId,
					card_type: 'custom',
					front_content: recto,
					back_content: 'Verso'
				})
			);
		}
	}, 120_000);

	afterAll(async () => {
		await removeDecor();
		await cleanupAllTestData();
	});

	it('un Entraînement fait grossir le Palotin et explore le thème du programme', async () => {
		const before = await buddyOf(withBuddy);
		expect(before?.xp).toBe(0);

		const body = await save(withBuddy, 'interactive');

		const after = await buddyOf(withBuddy);
		expect(after?.xp ?? 0).toBeGreaterThan(0);
		// Le bonus « nouveau thème » est dans le gain, et le thème est enregistré
		expect(after?.xp ?? 0).toBeGreaterThanOrEqual(XP_SOURCES.correct + XP_SOURCES.new_theme);
		expect(after?.themes_explored).toEqual([themeId]);
		expect(body.buddy_xp).not.toBeNull();
	});

	it('une séance flash ne rapporte rien', async () => {
		const before = await buddyOf(withBuddy);
		const body = await save(withBuddy, 'flash');
		expect(body.buddy_xp).toBeNull();
		expect((await buddyOf(withBuddy))?.xp).toBe(before?.xp);
	});

	it('élève sans Palotin : séance enregistrée, aucune ligne Palotin créée', async () => {
		const body = await save(withoutBuddy, 'interactive');
		expect(body.buddy_xp).toBeNull();

		const { data: session, error } = await service
			.from('test_sessions')
			.select('id, user_id')
			.eq('id', body.sessionId)
			.single();
		expect(error).toBeNull();
		expect(session?.user_id).toBe(withoutBuddy.id);
		expect(await buddyOf(withoutBuddy)).toBeNull();
	});

	it('révision : rien tant qu’il reste une carte due, le forfait à la dernière, une fois', async () => {
		const start = (await buddyOf(withBuddy))?.xp ?? 0;

		// Première carte : il en reste une due
		const first = await review(withBuddy, cardIds[0]);
		expect(first.buddy_xp).toBeNull();
		expect((await buddyOf(withBuddy))?.xp).toBe(start);

		// Dernière carte due : la séance est terminée → forfait
		const last = await review(withBuddy, cardIds[1]);
		expect(last.buddy_xp?.xpResult.xp_gained).toBe(XP_SOURCES.review_session);
		expect((await buddyOf(withBuddy))?.xp).toBe(start + XP_SOURCES.review_session);

		const { data: sessions } = await service
			.from('srs_review_sessions')
			.select('completed_at')
			.eq('user_id', withBuddy.id)
			.eq('deck_id', deckId);
		expect(sessions).toHaveLength(1);
		expect(sessions?.[0]?.completed_at).not.toBeNull();

		// Une nouvelle révision le même jour : plus de forfait
		const again = await review(withBuddy, cardIds[0]);
		expect(again.buddy_xp).toBeNull();
		expect((await buddyOf(withBuddy))?.xp).toBe(start + XP_SOURCES.review_session);
	});
});
