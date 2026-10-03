/**
 * Mémoire de révision écrite par le serveur seul (Q171)
 * =====================================================
 *
 * Décision de David : l'élève ne peut plus créer, modifier ni supprimer sa
 * mémoire de révision (`srs_card_stats`) par un appel direct ; il continue de
 * la LIRE ; toutes les révisions faites par les écrans continuent de
 * fonctionner ; le professeur garde sa lecture des stats des paquets assignés.
 *
 * Vrais clients, vraie RLS. Chaque refus est prouvé deux fois : l'erreur
 * renvoyée ET la ligne relue au client service, inchangée (la RLS échoue en
 * silence : une absence d'erreur ne prouve rien, cf. docs/ref/rls-echecs-silencieux.md).
 *
 * Témoins des circuits d'écriture (tous passent par `applyFsrsReview`) :
 *   - `POST /api/srs/review/submit` (route, client de l'élève) ;
 *   - `POST /api/skill-attempts` (route, client de l'élève) ;
 *   - `recordSeriesReviews` (client de l'élève) : chemin partagé par
 *     `POST /api/tests/save` et l'envoi d'une évaluation
 *     (`submitEvaluationAttempt`, `userClient`) — auto-évaluation comprise ;
 *   - `POST /api/srs/chapters/[id]/submit` : couvert par
 *     `paquet-revision-chapitre.test.ts` (relit `srs_card_stats` au service).
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

// L'écriture de la mémoire part au client service : le brancher sur la base LOCALE.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { POST as reviewSubmitRoute } from '../../src/routes/api/srs/review/submit/+server';
import { POST as skillAttemptsRoute } from '../../src/routes/api/skill-attempts/+server';
import { recordSeriesReviews } from '$lib/server/srs/record-series-reviews';

// Types
type Person = { id: string; client: SupabaseClient<Database> };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const NOW = new Date().toISOString();
const IN_ONE_YEAR = new Date(Date.now() + 365 * 86_400_000).toISOString();

/** Modèles du décor (identifiants fixes, supprimés avant et après). */
const T = {
	existing: 'a0c0e5e0-0000-4000-8000-00000000171a', // fiche posée au service (refus UPDATE/DELETE)
	fresh: 'a0c0e5e0-0000-4000-8000-00000000171b', // jamais révisé (refus INSERT)
	skill: 'a0c0e5e0-0000-4000-8000-00000000171c', // témoin skill-attempts
	seriesAuto: 'a0c0e5e0-0000-4000-8000-00000000171d', // témoin série, réponse corrigée
	seriesSelf: 'a0c0e5e0-0000-4000-8000-00000000171e' // témoin série, auto-évaluation
};

// Variables
const service = createServiceRoleClient();
let student: Person;
let teacher: Person;
let customCardId: string;
let studentDeckId: string;

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

/** La fiche de l'élève pour cette carte, relue HORS RLS. */
async function memory(type: 'template' | 'custom', refId: string) {
	const { data, error } = await service
		.from('srs_card_stats')
		.select('id, total_reviews, next_review, state')
		.eq('user_id', student.id)
		.eq('card_reference_type', type)
		.eq('card_reference_id', refId)
		.maybeSingle();
	expect(error).toBeNull();
	return data;
}

function template(id: string, domain: string) {
	return {
		id,
		type: 'numerical_exact',
		title: `Mémoire serveur ${id.slice(-4)}`,
		theme: 'Thème SRSMS',
		domain,
		subdomain: null,
		level: 1,
		grades: ['6'],
		status: 'published',
		variations: [{}],
		created_by: teacher.id
	};
}

async function removeDecor() {
	const ids = Object.values(T);
	await service.from('skill_attempts').delete().in('template_id', ids);
	await service.from('srs_card_stats').delete().in('card_reference_id', ids);
	await service.from('question_templates').delete().in('id', ids);
}

describe('mémoire de révision écrite par le serveur seul (Q171)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await removeDecor();
		student = await person('student');
		teacher = await person('teacher');

		for (const [key, id] of Object.entries(T)) {
			await insertRow('question_templates', template(id, `Domaine ${key} SRSMS`));
		}

		// Fiche existante, posée au service : échue MAINTENANT
		await insertRow('srs_card_stats', {
			user_id: student.id,
			card_reference_type: 'template',
			card_reference_id: T.existing,
			difficulty: 5,
			stability: 1,
			state: 'review',
			next_review: NOW,
			total_reviews: 3,
			review_history: []
		});

		// Paquet personnel de l'élève, une carte libre (témoin review/submit)
		studentDeckId = await insertRow('srs_decks', {
			owner_id: student.id,
			name: 'Paquet mémoire serveur SRSMS',
			deck_type: 'personal'
		});
		customCardId = await insertRow('srs_cards', {
			deck_id: studentDeckId,
			card_type: 'custom',
			front_content: 'Recto SRSMS',
			back_content: 'Verso'
		});

		// Paquet du professeur assigné à l'élève (lecture du professeur)
		const teacherDeckId = await insertRow('srs_decks', {
			owner_id: teacher.id,
			name: 'Paquet assigné SRSMS',
			deck_type: 'personal'
		});
		await insertRow('srs_deck_assignments', {
			source_deck_id: teacherDeckId,
			assigned_by: teacher.id,
			assigned_to: student.id,
			assignment_type: 'student'
		});
	}, 120_000);

	afterAll(async () => {
		await removeDecor();
		await cleanupAllTestData();
	});

	// ------------------------------------------------------------------------
	// Refus : l'appel direct de l'élève (et d'anon) n'écrit plus rien
	// ------------------------------------------------------------------------

	it("l'élève ne peut plus CRÉER sa fiche par un appel direct", async () => {
		const { error } = await student.client.from('srs_card_stats').insert({
			user_id: student.id,
			card_reference_type: 'template',
			card_reference_id: T.fresh,
			difficulty: 5,
			stability: 0,
			state: 'review',
			next_review: IN_ONE_YEAR,
			total_reviews: 0,
			review_history: []
		});
		expect(error?.code).toBe('42501');
		expect(await memory('template', T.fresh)).toBeNull();
	});

	it("l'élève ne peut plus repousser sa carte d'un an (UPDATE direct)", async () => {
		const before = await memory('template', T.existing);
		const { data, error } = await student.client
			.from('srs_card_stats')
			.update({ next_review: IN_ONE_YEAR, total_reviews: 99 })
			.eq('user_id', student.id)
			.eq('card_reference_id', T.existing)
			.select('id');
		expect(error?.code).toBe('42501');
		expect(data ?? []).toEqual([]);
		expect(await memory('template', T.existing)).toEqual(before);
	});

	it("l'élève ne peut plus effacer sa fiche (DELETE direct)", async () => {
		const { error } = await student.client
			.from('srs_card_stats')
			.delete()
			.eq('user_id', student.id)
			.eq('card_reference_id', T.existing);
		expect(error?.code).toBe('42501');
		expect(await memory('template', T.existing)).not.toBeNull();
	});

	it("l'élève ne peut plus réécrire sa fiche par UPSERT direct", async () => {
		const before = await memory('template', T.existing);
		const { error } = await student.client.from('srs_card_stats').upsert(
			{
				user_id: student.id,
				card_reference_type: 'template',
				card_reference_id: T.existing,
				difficulty: 1,
				stability: 1000,
				state: 'review',
				next_review: IN_ONE_YEAR,
				total_reviews: 99,
				review_history: []
			},
			{ onConflict: 'user_id,card_reference_type,card_reference_id' }
		);
		expect(error?.code).toBe('42501');
		expect(await memory('template', T.existing)).toEqual(before);
	});

	it('un visiteur anonyme non plus', async () => {
		const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const before = await memory('template', T.existing);
		const { error } = await anon
			.from('srs_card_stats')
			.update({ next_review: IN_ONE_YEAR })
			.eq('card_reference_id', T.existing);
		expect(error?.code).toBe('42501');
		expect(await memory('template', T.existing)).toEqual(before);
	});

	// ------------------------------------------------------------------------
	// Lectures conservées
	// ------------------------------------------------------------------------

	it("l'élève lit toujours sa mémoire", async () => {
		const { data, error } = await student.client
			.from('srs_card_stats')
			.select('card_reference_id, total_reviews')
			.eq('card_reference_id', T.existing);
		expect(error).toBeNull();
		expect(data).toEqual([{ card_reference_id: T.existing, total_reviews: 3 }]);
	});

	it("le professeur lit toujours les stats d'un élève à qui il a assigné un paquet", async () => {
		const { data, error } = await teacher.client
			.from('srs_card_stats')
			.select('user_id, card_reference_id')
			.eq('user_id', student.id)
			.eq('card_reference_id', T.existing);
		expect(error).toBeNull();
		expect(data).toEqual([{ user_id: student.id, card_reference_id: T.existing }]);
	});

	// ------------------------------------------------------------------------
	// Témoins : les révisions faites par les écrans écrivent toujours
	// ------------------------------------------------------------------------

	// ⚠️ Statut HTTP non asserté : la route répond 500 APRÈS avoir écrit la fiche,
	// sur un bug antérieur et indépendant (elle lit `srs_review_sessions.created_at`,
	// colonne absente en local comme en prod). Seule l'écriture de la mémoire est
	// l'objet de ce témoin.
	it('POST /api/srs/review/submit écrit la fiche (carte libre)', async () => {
		await reviewSubmitRoute({
			locals: buildLocals(student),
			request: postRequest({ cardId: customCardId, deckId: studentDeckId, grade: 3 })
		} as never);
		const row = await memory('custom', customCardId);
		expect(row?.total_reviews).toBe(1);
	});

	it('POST /api/srs/review/submit fait avancer une fiche existante', async () => {
		await reviewSubmitRoute({
			locals: buildLocals(student),
			request: postRequest({ cardId: customCardId, deckId: studentDeckId, grade: 1 })
		} as never);
		expect((await memory('custom', customCardId))?.total_reviews).toBe(2);
	});

	it('POST /api/skill-attempts écrit la fiche', async () => {
		const response = await skillAttemptsRoute({
			locals: buildLocals(student),
			request: postRequest({ template_id: T.skill, success: true })
		} as never);
		expect(response.status).toBe(200);
		expect((await memory('template', T.skill))?.total_reviews).toBe(1);
	});

	it('recordSeriesReviews (séries et évaluations) écrit les fiches, auto-évaluation comprise', async () => {
		await recordSeriesReviews(
			student.client,
			student.id,
			[
				{ templateId: T.seriesAuto, success: true, selfAssessed: false },
				{ templateId: T.seriesSelf, success: false, selfAssessed: true }
			],
			{ logLabel: '[srs-memoire-serveur]' }
		);
		expect((await memory('template', T.seriesAuto))?.total_reviews).toBe(1);
		expect((await memory('template', T.seriesSelf))?.total_reviews).toBe(1);
	});
});
