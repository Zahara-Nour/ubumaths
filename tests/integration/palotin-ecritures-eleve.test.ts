/**
 * Palotin : l'élève n'écrit plus lui-même sa ligne (migration 20261017090100)
 * ===========================================================================
 *
 * Question d'accès tranchée par David le 2026-10-18 : l'élève perd le droit de
 * créer ou modifier directement sa ligne `student_buddies` et ses séances
 * `srs_review_sessions` ; seul le serveur (client service) les écrit. Les
 * lectures ne changent pas.
 *
 * Vrais clients authentifiés, vraie RLS. La RLS échoue en SILENCE
 * (docs/pratiques/rls-echecs-silencieux.md) : une UPDATE refusée rend 0 ligne
 * sans erreur, donc chaque refus est prouvé par `.select()` vide ET par la
 * valeur relue hors RLS ; une INSERT refusée rend 42501.
 *
 * Témoins : les parcours réels (choix et changement de Palotin, séance de
 * révision) marchent toujours par les vraies routes ; les colonnes de la
 * Constance Royale existent, à leurs valeurs par défaut, bornées à 0..7.
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

// Les routes écrivent au client service : le brancher sur la base LOCALE.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { POST as chooseBuddyRoute } from '../../src/routes/api/student/buddy/+server';
import { POST as changeBuddyRoute } from '../../src/routes/api/student/buddy/change/+server';
import { POST as reviewSubmitRoute } from '../../src/routes/api/srs/review/submit/+server';

// Types
type Person = { id: string; client: SupabaseClient<Database> };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const RLS_VIOLATION = '42501';
const CHECK_VIOLATION = '23514';

// Variables
const service = createServiceRoleClient();
let teacher: Person;
/** Élève qui a déjà un Palotin et une séance du jour (posés au service). */
let student: Person;
/** Élève sans Palotin : tente de se le créer lui-même, puis passe par la route. */
let newcomer: Person;
let deckId: string;
let cardId: string;
let sessionId: string;

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

/** La ligne Palotin relue HORS RLS. */
async function buddyRow(studentId: string) {
	const { data, error } = await service
		.from('student_buddies')
		.select('*')
		.eq('student_id', studentId)
		.maybeSingle();
	expect(error).toBeNull();
	return data;
}

/** La séance relue HORS RLS. */
async function sessionRow(id: string) {
	const { data, error } = await service
		.from('srs_review_sessions')
		.select('*')
		.eq('id', id)
		.maybeSingle();
	expect(error).toBeNull();
	return data;
}

// Tests
describe('Palotin : écritures réservées au serveur', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await person('teacher');
		student = await person('student');
		newcomer = await person('student');

		const { error: buddyError } = await service
			.from('student_buddies')
			.insert({ student_id: student.id, palotin_type: 'giron' });
		if (buddyError) throw new Error(`décor student_buddies : ${buddyError.message}`);

		deckId = await insertRow('srs_decks', {
			owner_id: student.id,
			name: `Paquet écritures ${crypto.randomUUID().slice(0, 8)}`,
			deck_type: 'personal'
		});
		cardId = await insertRow('srs_cards', {
			deck_id: deckId,
			card_type: 'custom',
			front_content: 'Recto',
			back_content: 'Verso'
		});
		sessionId = await insertRow('srs_review_sessions', {
			user_id: student.id,
			deck_id: deckId,
			cards_reviewed: 3,
			correct_count: 2,
			completed_at: new Date().toISOString()
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('student_buddies', () => {
		it('l’élève ne peut pas se créer lui-même un Palotin (42501, aucune ligne)', async () => {
			const { error } = await newcomer.client
				.from('student_buddies')
				.insert({ student_id: newcomer.id, palotin_type: 'pile' })
				.select('student_id');
			expect(error?.code).toBe(RLS_VIOLATION);
			expect(await buddyRow(newcomer.id)).toBeNull();
		});

		it('l’élève ne peut pas réécrire son XP ni son compteur de changements (0 ligne, valeurs intactes)', async () => {
			const before = await buddyRow(student.id);
			const { data, error } = await student.client
				.from('student_buddies')
				.update({ xp: 4999, level: 19, change_count: 0, palotin_type: 'cotice' })
				.eq('student_id', student.id)
				.select('student_id');
			expect(error).toBeNull();
			expect(data).toEqual([]);
			const after = await buddyRow(student.id);
			expect(after?.xp).toBe(before?.xp);
			expect(after?.level).toBe(before?.level);
			expect(after?.palotin_type).toBe('giron');
			expect(after?.change_count).toBe(before?.change_count);
		});

		it('l’élève lit toujours sa ligne', async () => {
			const { data, error } = await student.client
				.from('student_buddies')
				.select('student_id, palotin_type')
				.eq('student_id', student.id);
			expect(error).toBeNull();
			expect(data).toEqual([{ student_id: student.id, palotin_type: 'giron' }]);
		});

		// Mono-prof : `is_my_student` vaut `is_teacher_or_admin`, deux policies SELECT en OU.
		it('le prof lit toujours le Palotin de son élève', async () => {
			const { data, error } = await teacher.client
				.from('student_buddies')
				.select('student_id')
				.eq('student_id', student.id);
			expect(error).toBeNull();
			expect(data).toEqual([{ student_id: student.id }]);
		});
	});

	describe('srs_review_sessions', () => {
		it('l’élève ne peut pas se créer une séance (42501, aucune ligne)', async () => {
			const { error } = await student.client
				.from('srs_review_sessions')
				.insert({ user_id: student.id, deck_id: deckId, cards_reviewed: 50 })
				.select('id');
			expect(error?.code).toBe(RLS_VIOLATION);
			const { count } = await service
				.from('srs_review_sessions')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', student.id);
			expect(count).toBe(1);
		});

		it('l’élève ne peut pas remettre `completed_at` à vide (0 ligne, valeur intacte)', async () => {
			const before = await sessionRow(sessionId);
			expect(before?.completed_at).not.toBeNull();
			const { data, error } = await student.client
				.from('srs_review_sessions')
				.update({ completed_at: null, cards_reviewed: 99 })
				.eq('id', sessionId)
				.select('id');
			expect(error).toBeNull();
			expect(data).toEqual([]);
			const after = await sessionRow(sessionId);
			expect(after?.completed_at).toBe(before?.completed_at);
			expect(after?.cards_reviewed).toBe(3);
		});

		it('l’élève lit toujours ses séances', async () => {
			const { data, error } = await student.client
				.from('srs_review_sessions')
				.select('id')
				.eq('user_id', student.id);
			expect(error).toBeNull();
			expect(data).toEqual([{ id: sessionId }]);
		});
	});

	describe('les parcours réels passent par le serveur', () => {
		it('choix du Palotin par la route : 201, ligne créée', async () => {
			const response = await chooseBuddyRoute({
				locals: buildLocals(newcomer),
				request: postRequest({ palotinType: 'pile' })
			} as never);
			expect(response.status).toBe(201);
			expect((await buddyRow(newcomer.id))?.palotin_type).toBe('pile');
		});

		it('premier changement de Palotin par la route : gratuit, ligne modifiée', async () => {
			const response = await changeBuddyRoute({
				locals: buildLocals(newcomer),
				request: postRequest({ newPalotinType: 'cotice' })
			} as never);
			expect(response.status).toBe(200);
			const row = await buddyRow(newcomer.id);
			expect(row?.palotin_type).toBe('cotice');
			expect(row?.change_count).toBe(1);
		});

		it('révision d’une carte par la route : la séance du jour est écrite', async () => {
			const response = await reviewSubmitRoute({
				locals: buildLocals(student),
				request: postRequest({ cardId, deckId, grade: 4 })
			} as never);
			expect(response.status).toBe(200);
			expect((await sessionRow(sessionId))?.cards_reviewed).toBe(4);
		});
	});

	describe('Constance Royale hebdomadaire : colonnes', () => {
		it('valeurs par défaut : pas de semaine, 0 jour', async () => {
			const row = (await buddyRow(student.id)) as Record<string, unknown> | null;
			expect(row).toMatchObject({ constance_week_start: null, constance_days_this_week: 0 });
		});

		it('la contrainte refuse 8 jours et accepte 7', async () => {
			const refused = await service
				.from('student_buddies')
				.update({ constance_days_this_week: 8 } as never)
				.eq('student_id', student.id)
				.select('student_id');
			expect(refused.error?.code).toBe(CHECK_VIOLATION);

			const accepted = await service
				.from('student_buddies')
				.update({ constance_week_start: '2026-10-12', constance_days_this_week: 7 } as never)
				.eq('student_id', student.id)
				.select('student_id');
			expect(accepted.error).toBeNull();
			expect(accepted.data).toHaveLength(1);
		});
	});
});
