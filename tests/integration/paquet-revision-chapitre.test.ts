/**
 * Paquet de révision CALCULÉ d'un chapitre (questions de cours, étape 3)
 * =====================================================================
 *
 * Vrais clients, vraie RLS : les routes `GET /api/srs/chapters/[id]/due` et
 * `POST /api/srs/chapters/[id]/submit` sont appelées avec le client de l'élève.
 * Aucune lecture nouvelle n'est ouverte : chapitres visibles de sa classe,
 * rattachements publiés, séries rattachées et modèles publiés lui étaient déjà
 * lisibles (Q123, Q164).
 *
 * Couvre : N2/N6 (contenu), N4 (mémoire unique `srs_card_stats`, échéance du
 * Programme avancée), E1 (autre classe / masqué → 404), E2 (question hors
 * paquet refusée, rien ne bouge), E3 (401), E4 (Zod), L1 (série retirée → sort,
 * mémoire gardée), L2 (brouillon → sort), L6 (question de cours : jamais
 * ajoutée au Programme par ce circuit), N5 (entrées de « Mes révisions »).
 *
 * ⚠️ La RLS échoue en silence : chaque « rien ne bouge » est vérifié en relisant
 * la base avec le client service, jamais par l'absence d'erreur.
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

// Le Programme est écrit par le client service : le brancher sur la base LOCALE.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { GET as dueRoute } from '../../src/routes/api/srs/chapters/[chapterId]/due/+server';
import { POST as submitRoute } from '../../src/routes/api/srs/chapters/[chapterId]/submit/+server';
import { summarizeChapterDecks } from '$lib/server/srs/chapter-deck';

// Types
type Person = { id: string; client: SupabaseClient<Database> };
type DuePayload = { chapter: { id: string; title: string }; cards: { templateId: string }[] };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PAST = new Date(Date.now() - 3600_000).toISOString();

const CAT_A = { theme: 'Thème PRC', domain: 'Domaine A PRC', subdomain: 'Méthode', level: 1 };
/** Une seule question PUBLIÉE par catégorie (index unique partiel) : A2 porte la seconde. */
const CAT_A2 = { theme: 'Thème PRC', domain: 'Domaine A PRC', subdomain: 'Méthode', level: 2 };
const CAT_B = { theme: 'Thème PRC', domain: 'Domaine B PRC', subdomain: null, level: 2 };
const CAT_C = { theme: 'Thème PRC', domain: 'Domaine C PRC', subdomain: null, level: 1 };
const CAT_D = { theme: 'Thème PRC', domain: 'Domaine D PRC', subdomain: null, level: 1 };
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

/** Modèles du décor (identifiants fixes, supprimés avant et après). */
const T = {
	course: 'a0c0e5e0-0000-4000-8000-0000000000a1', // A, publié, question de cours
	regular: 'a0c0e5e0-0000-4000-8000-0000000000a2', // A2, publié
	draft: 'a0c0e5e0-0000-4000-8000-0000000000a3', // A, brouillon
	other: 'a0c0e5e0-0000-4000-8000-0000000000b1', // B, publié (série 2)
	outside: 'a0c0e5e0-0000-4000-8000-0000000000c1', // C, publié, dans AUCUNE série du chapitre
	future: 'a0c0e5e0-0000-4000-8000-0000000000d1' // D, publié, série à publication FUTURE
};
const UNKNOWN_CHAPTER = 'a0c0e5e0-0000-4000-8000-00000000ffff';

// Variables
const service = createServiceRoleClient();

let teacherId: string;
let teacher: Person;
let admin: Person;
let student: Person;
let elsewhere: Person;
/** Ancien membre de K1 (archivé) */
let archived: Person;
/** Membre de K1 qui passera en K2 (L5) */
let mover: Person;
let k1Id: string;
let k2Id: string;
let chapterVisible: string;
let chapterHidden: string;
let chapterOther: string;
let linkB: string;
let programmeDeck: string;

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

async function studentPerson(role: 'student' | 'teacher' | 'admin' = 'student'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await clientFor(profile.email) };
}

function buildLocals(person: Person | null): App.Locals {
	const user = person ? ({ id: person.id } as User) : null;
	return {
		supabase: (person?.client ??
			createClient<Database>(SUPABASE_URL, ANON_KEY)) as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user, session: null }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

/** Statut HTTP d'une route : `error()` de SvelteKit est levé, pas rendu. */
async function call(run: () => Promise<Response>): Promise<{ status: number; body: unknown }> {
	try {
		const response = await run();
		return { status: response.status, body: await response.json() };
	} catch (thrown) {
		const httpError = thrown as { status?: number };
		if (typeof httpError.status === 'number') return { status: httpError.status, body: null };
		throw thrown;
	}
}

function due(person: Person | null, chapterId: string) {
	return call(() => dueRoute({ locals: buildLocals(person), params: { chapterId } } as never));
}

function submit(person: Person | null, chapterId: string, body: unknown) {
	return call(() =>
		submitRoute({
			locals: buildLocals(person),
			params: { chapterId },
			request: new Request('http://localhost/x', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})
		} as never)
	);
}

async function dueTemplateIds(person: Person, chapterId: string): Promise<string[]> {
	const { status, body } = await due(person, chapterId);
	expect(status).toBe(200);
	return (body as DuePayload).cards.map((c) => c.templateId).sort();
}

/** La fiche FSRS de l'élève pour ce modèle, relue hors RLS. */
async function memory(studentId: string, templateId: string) {
	const { data, error } = await service
		.from('srs_card_stats')
		.select('total_reviews, next_review')
		.eq('user_id', studentId)
		.eq('card_reference_type', 'template')
		.eq('card_reference_id', templateId)
		.maybeSingle();
	expect(error).toBeNull();
	return data;
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

function templateRow(id: string, category: typeof CAT_A, status: string, options = {}) {
	return {
		id,
		type: 'fill_in_blanks',
		title: `Paquet chapitre PRC ${id.slice(-2)}`,
		...category,
		grades: ['1_SPE'],
		status,
		options,
		variations: [{ statement: 'Combien font $2+2$ ? $?$', blanks: [{ expectedAnswer: '4' }] }]
	};
}

/** Traces `skill_attempts` de l'élève pour ce modèle, relues hors RLS. */
async function attempts(studentId: string, templateId: string) {
	const { data, error } = await service
		.from('skill_attempts')
		.select('success, grade, source, with_help')
		.eq('student_id', studentId)
		.eq('template_id', templateId);
	expect(error).toBeNull();
	return data ?? [];
}

async function removeTemplates() {
	await service.from('skill_attempts').delete().in('template_id', Object.values(T));
	await service.from('srs_card_stats').delete().in('card_reference_id', Object.values(T));
	await service.from('question_templates').delete().in('id', Object.values(T));
}

describe('paquet de révision calculé du chapitre', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await removeTemplates();

		teacher = await studentPerson('teacher');
		teacherId = teacher.id;
		admin = await studentPerson('admin');
		student = await studentPerson();
		elsewhere = await studentPerson();
		archived = await studentPerson();
		mover = await studentPerson();

		const k1 = await TestData.class().withName('1SPE paquet chapitre PRC').create();
		const k2 = await TestData.class().withName('2DE paquet chapitre PRC').create();
		const { error: membersError } = await service.from('class_members').insert([
			{ class_id: k1.id, student_id: student.id, status: 'active' },
			{ class_id: k2.id, student_id: elsewhere.id, status: 'active' },
			{ class_id: k1.id, student_id: archived.id, status: 'archived' },
			{ class_id: k1.id, student_id: mover.id, status: 'active' }
		]);
		k1Id = k1.id;
		k2Id = k2.id;
		expect(membersError, 'décor : inscriptions').toBeNull();

		const { error: templatesError } = await service
			.from('question_templates')
			.insert([
				templateRow(T.course, CAT_A, 'published', { courseQuestion: true }),
				templateRow(T.regular, CAT_A2, 'published'),
				templateRow(T.draft, CAT_A, 'draft'),
				templateRow(T.other, CAT_B, 'published'),
				templateRow(T.outside, CAT_C, 'published'),
				templateRow(T.future, CAT_D, 'published')
			] as never);
		expect(templatesError, 'décor : modèles').toBeNull();

		const chapter = (classId: string, title: string, isVisible: boolean) =>
			insertRow('class_chapters', {
				class_id: classId,
				title,
				display_order: 1,
				is_visible: isVisible
			});
		chapterVisible = await chapter(k1.id, 'Fonctions PRC', true);
		chapterHidden = await chapter(k1.id, 'Masqué PRC', false);
		chapterOther = await chapter(k2.id, 'Autre classe PRC', true);

		const series = (title: string, categories: (typeof CAT_A)[]) =>
			insertRow('series', {
				title,
				grade: '1_SPE',
				categories: categories.map((category) => ({ category, quantity: 2, delay: 20 })),
				created_by: teacherId
			});
		const seriesA = await series('Série A PRC', [CAT_A, CAT_A2]);
		// N6 : la catégorie A revient dans la seconde série
		const seriesB = await series('Série B PRC', [CAT_B, CAT_A]);
		const seriesC = await series('Série C PRC', [CAT_C]);
		const seriesD = await series('Série D PRC', [CAT_D]);

		await insertRow('chapter_series', {
			chapter_id: chapterVisible,
			series_id: seriesA,
			published_at: PAST
		});
		linkB = await insertRow('chapter_series', {
			chapter_id: chapterVisible,
			series_id: seriesB,
			published_at: PAST
		});
		// Publication programmée (dans le futur) : pas encore dans le paquet
		await insertRow('chapter_series', {
			chapter_id: chapterVisible,
			series_id: seriesD,
			published_at: FUTURE
		});
		await insertRow('chapter_series', {
			chapter_id: chapterHidden,
			series_id: seriesC,
			published_at: PAST
		});
		await insertRow('chapter_series', {
			chapter_id: chapterOther,
			series_id: seriesC,
			published_at: PAST
		});

		// Programme de l'élève, avec la question ordinaire : témoin de N4
		programmeDeck = await insertRow('srs_decks', {
			owner_id: student.id,
			name: 'Programme',
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: true
		});
		await insertRow('srs_cards', {
			deck_id: programmeDeck,
			card_type: 'template',
			template_id: T.regular
		});
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await removeTemplates();
	});

	describe('contenu et accès', () => {
		it('N2/N6/L2 : questions publiées des séries publiées, union sans doublon, brouillon exclu', async () => {
			const { status, body } = await due(student, chapterVisible);
			expect(status).toBe(200);
			expect((body as DuePayload).chapter).toEqual({ id: chapterVisible, title: 'Fonctions PRC' });
			expect(await dueTemplateIds(student, chapterVisible)).toEqual(
				[T.course, T.regular, T.other].sort()
			);
		});

		it('série à publication future : absente du paquet', async () => {
			expect(await dueTemplateIds(student, chapterVisible)).not.toContain(T.future);
		});

		it('E1 : prof ou admin → 403 sur /due et /submit, aucune mémoire ni trace', async () => {
			for (const person of [teacher, admin]) {
				expect((await due(person, chapterVisible)).status).toBe(403);
				expect(
					(await submit(person, chapterVisible, { templateId: T.regular, grade: 3 })).status
				).toBe(403);
				expect(await memory(person.id, T.regular)).toBeNull();
				expect(await attempts(person.id, T.regular)).toEqual([]);
			}
		});

		it('E1 : élève qui a quitté la classe (archivé) → 404', async () => {
			expect((await due(archived, chapterVisible)).status).toBe(404);
			expect(
				(await submit(archived, chapterVisible, { templateId: T.regular, grade: 3 })).status
			).toBe(404);
			expect(await memory(archived.id, T.regular)).toBeNull();
		});

		it('N3 : deux appels → instances tirées avec des graines différentes', async () => {
			const seeds = async () => {
				const { body } = await due(student, chapterVisible);
				return (body as { cards: { templateId: string; instance: { seed?: number } }[] }).cards
					.map((c) => `${c.templateId}:${c.instance.seed}`)
					.sort();
			};
			const first = await seeds();
			const second = await seeds();
			expect(first.every((entry) => !entry.endsWith(':undefined'))).toBe(true);
			expect(second).not.toEqual(first);
		});

		it('E1 : chapitre masqué de sa classe → 404', async () => {
			expect((await due(student, chapterHidden)).status).toBe(404);
		});

		it('E1 : chapitre d’une autre classe → 404, pour l’un comme pour l’autre', async () => {
			expect((await due(student, chapterOther)).status).toBe(404);
			expect((await due(elsewhere, chapterVisible)).status).toBe(404);
			expect((await due(student, UNKNOWN_CHAPTER)).status).toBe(404);
		});

		it('E3 : sans connexion → 401', async () => {
			expect((await due(null, chapterVisible)).status).toBe(401);
			expect((await submit(null, chapterVisible, { templateId: T.regular, grade: 3 })).status).toBe(
				401
			);
		});

		it('E4 : entrées validées (UUID, note bornée)', async () => {
			expect((await due(student, 'pas-un-uuid')).status).toBe(400);
			expect(
				(await submit(student, chapterVisible, { templateId: T.regular, grade: 5 })).status
			).toBe(400);
			expect((await submit(student, chapterVisible, { templateId: 'x', grade: 3 })).status).toBe(
				400
			);
			expect(await memory(student.id, T.regular)).toBeNull();
		});

		it('N5 : « Mes révisions » liste le chapitre visible ayant des séries, rien d’autre', async () => {
			const summaries = await summarizeChapterDecks(student.client, student.id);
			expect(summaries.map((s) => s.chapterId)).toEqual([chapterVisible]);
			expect(summaries[0]).toMatchObject({ title: 'Fonctions PRC', deckSize: 3, toReview: 3 });
		});
	});

	describe('réponses', () => {
		it('E2 : question hors du paquet (autre catégorie, brouillon) → refusée, aucune mémoire', async () => {
			for (const templateId of [T.outside, T.draft]) {
				const { status } = await submit(student, chapterVisible, { templateId, grade: 3 });
				expect(status, templateId).toBe(403);
				expect(await memory(student.id, templateId), templateId).toBeNull();
				expect(await attempts(student.id, templateId), templateId).toEqual([]);
			}
		});

		it('E2 : chapitre masqué ou d’une autre classe → 404, aucune mémoire', async () => {
			expect(
				(await submit(student, chapterHidden, { templateId: T.outside, grade: 3 })).status
			).toBe(404);
			expect(
				(await submit(elsewhere, chapterVisible, { templateId: T.regular, grade: 3 })).status
			).toBe(404);
			expect(await memory(student.id, T.outside)).toBeNull();
			expect(await memory(elsewhere.id, T.regular)).toBeNull();
		});

		it('N4 : la réponse met à jour la mémoire unique, l’échéance du Programme avance', async () => {
			const { data: before } = await student.client.rpc('get_due_cards_for_deck', {
				p_user_id: student.id,
				p_deck_id: programmeDeck
			});
			expect((before ?? []).map((c) => c.template_id)).toContain(T.regular);

			const { status } = await submit(student, chapterVisible, { templateId: T.regular, grade: 3 });
			expect(status).toBe(200);

			const stats = await memory(student.id, T.regular);
			expect(stats?.total_reviews).toBe(1);
			// Q169 (a) : la même trace que le Programme, exactement une
			expect(await attempts(student.id, T.regular)).toEqual([
				{ success: true, grade: 3, source: 'srs', with_help: false }
			]);
			expect(new Date(stats!.next_review).getTime()).toBeGreaterThan(Date.now());

			const { data: after } = await student.client.rpc('get_due_cards_for_deck', {
				p_user_id: student.id,
				p_deck_id: programmeDeck
			});
			expect((after ?? []).map((c) => c.template_id)).not.toContain(T.regular);
			// Revue : elle n'est plus due dans le chapitre non plus
			expect(await dueTemplateIds(student, chapterVisible)).not.toContain(T.regular);
		});

		it('L6 : question de cours révisée dans le chapitre, jamais ajoutée au Programme', async () => {
			const { status } = await submit(student, chapterVisible, { templateId: T.course, grade: 4 });
			expect(status).toBe(200);
			expect((await memory(student.id, T.course))?.total_reviews).toBe(1);
			// Trace comme au Programme (Q113 ne porte que sur l'entrée dans le paquet)
			expect(await attempts(student.id, T.course)).toEqual([
				{ success: true, grade: 4, source: 'srs', with_help: false }
			]);

			const { data: cards, error } = await service
				.from('srs_cards')
				.select('template_id')
				.eq('deck_id', programmeDeck);
			expect(error).toBeNull();
			expect((cards ?? []).map((c) => c.template_id)).toEqual([T.regular]);
		});
	});

	describe('L5 — l’élève change de classe', () => {
		it('voit les chapitres de sa nouvelle classe, sa mémoire est conservée', async () => {
			expect(
				(await submit(mover, chapterVisible, { templateId: T.regular, grade: 3 })).status
			).toBe(200);
			expect((await summarizeChapterDecks(mover.client, mover.id)).map((s) => s.chapterId)).toEqual(
				[chapterVisible]
			);

			const { error: leaveError } = await service
				.from('class_members')
				.update({ status: 'archived' })
				.eq('class_id', k1Id)
				.eq('student_id', mover.id);
			expect(leaveError).toBeNull();
			const { error: joinError } = await service
				.from('class_members')
				.insert({ class_id: k2Id, student_id: mover.id, status: 'active' });
			expect(joinError).toBeNull();

			expect((await summarizeChapterDecks(mover.client, mover.id)).map((s) => s.chapterId)).toEqual(
				[chapterOther]
			);
			expect((await due(mover, chapterVisible)).status).toBe(404);
			expect(await dueTemplateIds(mover, chapterOther)).toEqual([T.outside]);
			expect((await memory(mover.id, T.regular))?.total_reviews).toBe(1);
		});
	});

	describe('le paquet suit le chapitre', () => {
		it('L1 : série retirée → ses questions sortent, la mémoire reste', async () => {
			const { status } = await submit(student, chapterVisible, { templateId: T.other, grade: 3 });
			expect(status).toBe(200);
			expect(await memory(student.id, T.other)).not.toBeNull();

			const { error } = await service
				.from('chapter_series')
				.update({ published_at: null })
				.eq('id', linkB);
			expect(error).toBeNull();

			const { status: refused } = await submit(student, chapterVisible, {
				templateId: T.other,
				grade: 3
			});
			expect(refused).toBe(403);
			expect((await memory(student.id, T.other))?.total_reviews).toBe(1);

			const summaries = await summarizeChapterDecks(student.client, student.id);
			expect(summaries[0].deckSize).toBe(2);
		});

		it('L2 : modèle repassé en brouillon → sort du paquet', async () => {
			const { error } = await service
				.from('question_templates')
				.update({ status: 'draft' })
				.eq('id', T.course);
			expect(error).toBeNull();
			const summaries = await summarizeChapterDecks(student.client, student.id);
			expect(summaries[0].deckSize).toBe(1);
			expect(
				(await submit(student, chapterVisible, { templateId: T.course, grade: 3 })).status
			).toBe(403);
		});

		it('L1 : chapitre masqué → plus d’entrée, plus de paquet, la mémoire reste', async () => {
			const { error } = await service
				.from('class_chapters')
				.update({ is_visible: false })
				.eq('id', chapterVisible);
			expect(error).toBeNull();
			expect(await summarizeChapterDecks(student.client, student.id)).toEqual([]);
			expect((await due(student, chapterVisible)).status).toBe(404);
			expect((await memory(student.id, T.regular))?.total_reviews).toBe(1);
		});
	});
});
