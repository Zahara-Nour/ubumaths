/**
 * Séries de chapitre (questions de cours, étape 2) — tests d'intégration
 * =====================================================================
 *
 * Question d'accès tranchée par David (Q123 corrigée, 2026-10-02) : un élève
 * d'une classe lit les rattachements PUBLIÉS des chapitres VISIBLES de sa
 * classe, ET les séries elles-mêmes (titre, niveau, catégories). Rien d'autre :
 * ni rattachement programmé ou masqué, ni chapitre masqué, ni autre classe, ni
 * série non rattachée du professeur. Anon : rien. Personne ne perd d'accès
 * (non-régression : la série d'une évaluation assignée reste lisible).
 *
 * ⚠️ La RLS échoue en silence : chaque refus d'écriture est vérifié par le
 * nombre de lignes rendues PUIS en relisant la base (service_role), jamais par
 * l'absence d'erreur.
 *
 * DOIVENT échouer sans la migration `*_series_de_chapitre.sql`.
 *
 * `chapter_series` n'est pas encore dans `database.ts` (généré depuis la prod) :
 * clients non typés.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Person = { id: string; client: SupabaseClient };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CATEGORIES = [
	{
		category: { theme: 'Fonctions', domain: 'Étude de fonction', subdomain: 'Méthode', level: 1 },
		quantity: 4,
		delay: 20
	}
];
const PAST = new Date(Date.now() - 3600_000).toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

// Variables
/** Pose le décor et relit la vérité, hors RLS. */
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let admin: Person;
/** Membre actif de K1. */
let student: Person;
/** Ancien membre de K1 (archivé). */
let archived: Person;
/** Membre actif de K2 seulement. */
let elsewhere: Person;

let chapterVisible: string; // K1, visible
let chapterHidden: string; // K1, masqué
let chapterOther: string; // K2, visible
let otherChapterK1: string; // K1, visible, sert à la garde de section

/** Séries et rattachements, par cas. */
const s: Record<string, string> = {};
const link: Record<string, string> = {};

// Functions
async function signIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function person(role: 'student' | 'teacher' | 'admin'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email) };
}

async function insertRow(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`décor ${table} : ${error.message}`);
	return (data as { id: string }).id;
}

async function createSeries(title: string): Promise<string> {
	return insertRow('series', {
		title,
		grade: '1_SPE',
		categories: CATEGORIES,
		created_by: teacher.id
	});
}

async function attach(
	chapterId: string,
	seriesId: string,
	publishedAt: string | null
): Promise<string> {
	return insertRow('chapter_series', {
		chapter_id: chapterId,
		series_id: seriesId,
		published_at: publishedAt
	});
}

async function linksSeenBy(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client.from('chapter_series').select('id');
	expect(error).toBeNull();
	return (data ?? []).map((row: { id: string }) => row.id);
}

async function seriesSeenBy(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client.from('series').select('id');
	expect(error).toBeNull();
	return (data ?? []).map((row: { id: string }) => row.id);
}

async function linkTruth(id: string) {
	const { data, error } = await service
		.from('chapter_series')
		.select('id, form, published_at')
		.eq('id', id)
		.maybeSingle();
	expect(error).toBeNull();
	return data as { id: string; form: string; published_at: string | null } | null;
}

describe('séries de chapitre', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		admin = await person('admin');
		student = await person('student');
		archived = await person('student');
		elsewhere = await person('student');

		const k1 = await TestData.class().withName('1SPE séries de chapitre SC').create();
		const k2 = await TestData.class().withName('2DE séries de chapitre SC').create();
		const { error } = await service.from('class_members').insert([
			{ class_id: k1.id, student_id: student.id, status: 'active' },
			{ class_id: k1.id, student_id: archived.id, status: 'archived' },
			{ class_id: k2.id, student_id: elsewhere.id, status: 'active' }
		]);
		expect(error, 'décor : inscriptions').toBeNull();

		const chapter = (classId: string, title: string, isVisible: boolean) =>
			insertRow('class_chapters', {
				class_id: classId,
				title,
				display_order: 1,
				is_visible: isVisible
			});
		chapterVisible = await chapter(k1.id, 'Fonctions SC', true);
		chapterHidden = await chapter(k1.id, 'Chapitre masqué SC', false);
		chapterOther = await chapter(k2.id, 'Autre classe SC', true);
		otherChapterK1 = await chapter(k1.id, 'Second chapitre SC', true);

		s.published = await createSeries('Publiée SC');
		s.scheduled = await createSeries('Programmée SC');
		s.prepared = await createSeries('Préparée SC');
		s.hiddenChapter = await createSeries('Chapitre masqué SC');
		s.otherClass = await createSeries('Autre classe SC');
		s.unattached = await createSeries('Non rattachée SC');
		s.foreign = await insertRow('series', {
			// Mono-professeur : le seul « autre » propriétaire possible est l'admin.
			title: 'Série d’un autre SC',
			grade: '1_SPE',
			categories: CATEGORIES,
			created_by: admin.id
		});

		link.published = await attach(chapterVisible, s.published, PAST);
		link.scheduled = await attach(chapterVisible, s.scheduled, FUTURE);
		link.prepared = await attach(chapterVisible, s.prepared, null);
		link.hiddenChapter = await attach(chapterHidden, s.hiddenChapter, PAST);
		link.otherClass = await attach(chapterOther, s.otherClass, PAST);

		// Non-régression : une série d'évaluation publiée, assignée à K1, rattachée
		// à aucun chapitre.
		s.evaluation = await createSeries('Évaluation SC');
		const evaluationId = await insertRow('evaluations', {
			series_id: s.evaluation,
			form: 'interactive',
			status: 'published',
			created_by: teacher.id
		});
		await insertRow('evaluation_assignments', {
			evaluation_id: evaluationId,
			assigned_by: teacher.id,
			class_id: k1.id
		});
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// ── S8 : lecture élève restreinte ───────────────────────────────────────
	describe('S8 — l’élève de la classe lit le rattachement publié et la série', () => {
		it('lit le rattachement publié d’un chapitre visible', async () => {
			expect(await linksSeenBy(student.client)).toEqual([link.published]);
		});

		it('lit la série rattachée (titre, niveau, catégories)', async () => {
			const { data, error } = await student.client
				.from('series')
				.select('id, title, grade, categories')
				.eq('id', s.published);
			expect(error).toBeNull();
			expect(data).toEqual([
				{ id: s.published, title: 'Publiée SC', grade: '1_SPE', categories: CATEGORIES }
			]);
		});

		it('lit la série à travers la jointure du rattachement', async () => {
			const { data, error } = await student.client
				.from('chapter_series')
				.select('id, series:series_id(id, title)')
				.eq('id', link.published);
			expect(error).toBeNull();
			expect(data).toEqual([
				{ id: link.published, series: { id: s.published, title: 'Publiée SC' } }
			]);
		});

		it('ne lit ni rattachement ni série : programmé, préparé, chapitre masqué, autre classe, non rattaché', async () => {
			const links = await linksSeenBy(student.client);
			for (const key of ['scheduled', 'prepared', 'hiddenChapter', 'otherClass']) {
				expect(links, `rattachement ${key}`).not.toContain(link[key]);
			}
			const series = await seriesSeenBy(student.client);
			for (const key of ['scheduled', 'prepared', 'hiddenChapter', 'otherClass', 'unattached']) {
				expect(series, `série ${key}`).not.toContain(s[key]);
			}
		});

		it('exactement : la série publiée et la série d’évaluation, rien d’autre', async () => {
			expect((await seriesSeenBy(student.client)).sort()).toEqual(
				[s.published, s.evaluation].sort()
			);
		});

		it('l’élève d’une autre classe lit la sienne, pas celles de K1', async () => {
			expect(await linksSeenBy(elsewhere.client)).toEqual([link.otherClass]);
			expect(await seriesSeenBy(elsewhere.client)).toEqual([s.otherClass]);
		});

		it('un ancien membre ne lit plus rien', async () => {
			expect(await linksSeenBy(archived.client)).toEqual([]);
			expect(await seriesSeenBy(archived.client)).toEqual([]);
		});

		it('masquer le chapitre retire le rattachement ET la série', async () => {
			{
				const { data } = await service
					.from('class_chapters')
					.update({ is_visible: false })
					.eq('id', chapterVisible)
					.select('id');
				expect(data).toHaveLength(1);
			}
			try {
				expect(await linksSeenBy(student.client)).toEqual([]);
				expect(await seriesSeenBy(student.client)).toEqual([s.evaluation]);
			} finally {
				const { data } = await service
					.from('class_chapters')
					.update({ is_visible: true })
					.eq('id', chapterVisible)
					.select('id');
				expect(data).toHaveLength(1);
			}
		});

		it('non-régression : la série d’une évaluation assignée reste lisible', async () => {
			expect(await seriesSeenBy(student.client)).toContain(s.evaluation);
		});
	});

	// ── S9 : élève sans écriture ────────────────────────────────────────────
	describe('S9 — l’élève n’écrit rien', () => {
		it('INSERT refusé, et aucune ligne créée', async () => {
			const { data, error } = await student.client
				.from('chapter_series')
				.insert({ chapter_id: chapterVisible, series_id: s.unattached, published_at: PAST })
				.select('id');
			expect(error, 'l’insertion aurait dû être refusée').not.toBeNull();
			expect(data ?? []).toHaveLength(0);
			const { data: truth } = await service
				.from('chapter_series')
				.select('id')
				.eq('series_id', s.unattached);
			expect(truth).toEqual([]);
		});

		it('UPDATE : zéro ligne, la base inchangée', async () => {
			const { data } = await student.client
				.from('chapter_series')
				.update({ form: 'interactive', published_at: null })
				.eq('id', link.published)
				.select('id');
			expect(data ?? []).toHaveLength(0);
			const truth = await linkTruth(link.published);
			expect(truth?.form).toBe('flash');
			expect(truth?.published_at).not.toBeNull();
		});

		it('DELETE : zéro ligne, le rattachement existe toujours', async () => {
			const { data } = await student.client
				.from('chapter_series')
				.delete()
				.eq('id', link.published)
				.select('id');
			expect(data ?? []).toHaveLength(0);
			expect(await linkTruth(link.published)).not.toBeNull();
		});

		it('lire la série ne donne pas le droit de la modifier', async () => {
			const { data } = await student.client
				.from('series')
				.update({ title: 'Piratée SC' })
				.eq('id', s.published)
				.select('id');
			expect(data ?? []).toHaveLength(0);
			const { data: truth } = await service.from('series').select('title').eq('id', s.published);
			expect(truth).toEqual([{ title: 'Publiée SC' }]);
		});
	});

	// ── S10 : prof et admin tout, anon rien ─────────────────────────────────
	describe('S10 — le prof et l’admin gèrent ; anon ne voit rien', () => {
		for (const who of ['prof', 'admin'] as const) {
			it(`${who} : rattacher, publier, déplacer, retirer`, async () => {
				const actor = who === 'prof' ? teacher : admin;
				const { client } = actor;

				const { data: created, error: e1 } = await client
					.from('chapter_series')
					.insert({ chapter_id: otherChapterK1, series_id: s.unattached, form: 'interactive' })
					.select('id, form, published_at');
				expect(e1).toBeNull();
				expect(created).toHaveLength(1);
				const id = created![0].id as string;
				expect(created![0]).toMatchObject({ form: 'interactive', published_at: null });

				const { data: section } = await service
					.from('chapter_sections')
					.select('id')
					.eq('chapter_id', otherChapterK1)
					.limit(1)
					.single();

				const { data: updated, error: e2 } = await client
					.from('chapter_series')
					.update({ published_at: PAST, section_id: section!.id, section_order: 3 })
					.eq('id', id)
					.select('id, published_at, section_id, section_order');
				expect(e2).toBeNull();
				expect(updated).toHaveLength(1);
				expect(updated![0].section_id).toBe(section!.id);

				const { data: read } = await client.from('chapter_series').select('id').eq('id', id);
				expect(read).toEqual([{ id }]);

				const { data: gone } = await client
					.from('chapter_series')
					.delete()
					.eq('id', id)
					.select('id');
				expect(gone).toEqual([{ id }]);
				expect(await linkTruth(id)).toBeNull();
				// Retirer = détacher : la série reste (S4).
				const { data: still } = await service.from('series').select('id').eq('id', s.unattached);
				expect(still).toEqual([{ id: s.unattached }]);
			});
		}

		it('anon ne lit ni rattachement ni série', async () => {
			const { data: links } = await anon.from('chapter_series').select('id');
			expect(links ?? []).toEqual([]);
			const { data: series } = await anon.from('series').select('id');
			expect(series ?? []).toEqual([]);
		});

		it('anon ne peut rien écrire', async () => {
			await anon
				.from('chapter_series')
				.insert({ chapter_id: chapterVisible, series_id: s.unattached, published_at: PAST });
			const { data: deleted } = await anon
				.from('chapter_series')
				.delete()
				.eq('id', link.published)
				.select('id');
			expect(deleted ?? []).toHaveLength(0);
			expect(await linkTruth(link.published)).not.toBeNull();
			const { data: truth } = await service
				.from('chapter_series')
				.select('id')
				.eq('series_id', s.unattached);
			expect(truth).toEqual([]);
		});
	});

	// ── Gardes de la base ───────────────────────────────────────────────────
	describe('gardes de la table', () => {
		it('forme par défaut : flash ; forme inconnue refusée', async () => {
			expect((await linkTruth(link.published))?.form).toBe('flash');
			const { error } = await service
				.from('chapter_series')
				.update({ form: 'evaluation' })
				.eq('id', link.published);
			expect(error?.code).toBe('23514');
		});

		it('publier pose l’heure de la BASE (trigger)', async () => {
			const { data, error } = await teacher.client
				.from('chapter_series')
				.update({ published_at: '2001-01-01T00:00:00Z' })
				.eq('id', link.prepared)
				.select('published_at');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(new Date(data![0].published_at as string).getFullYear()).toBeGreaterThan(2001);
			// Remettre le décor : préparé
			const { data: back } = await service
				.from('chapter_series')
				.update({ published_at: null })
				.eq('id', link.prepared)
				.select('id');
			expect(back).toHaveLength(1);
		});

		it('refuse une section d’un AUTRE chapitre', async () => {
			const { data: sections } = await service
				.from('chapter_sections')
				.select('id')
				.eq('chapter_id', otherChapterK1)
				.limit(1);
			const { error } = await service
				.from('chapter_series')
				.update({ section_id: sections![0].id })
				.eq('id', link.published);
			expect(error?.code).toBe('23503');
		});

		it('une série ne se rattache qu’une fois au même chapitre', async () => {
			const { error } = await service
				.from('chapter_series')
				.insert({ chapter_id: chapterVisible, series_id: s.published });
			expect(error?.code).toBe('23505');
		});

		it('supprimer la série retire son rattachement (cascade)', async () => {
			const tmp = await createSeries('Éphémère SC');
			const tmpLink = await attach(chapterVisible, tmp, PAST);
			const { data } = await service.from('series').delete().eq('id', tmp).select('id');
			expect(data).toHaveLength(1);
			expect(await linkTruth(tmpLink)).toBeNull();
		});
	});
	// ── Propriété de la série (correction d'audit) ─────────────────────────
	describe('propriété de la série rattachée', () => {
		it('un prof ne peut pas rattacher la série d’un autre utilisateur', async () => {
			const { data, error } = await teacher.client
				.from('chapter_series')
				.insert({ chapter_id: chapterVisible, series_id: s.foreign })
				.select('id');
			expect(error, 'l’insertion aurait dû être refusée').not.toBeNull();
			expect(data ?? []).toHaveLength(0);
			const { data: truth } = await service
				.from('chapter_series')
				.select('id')
				.eq('series_id', s.foreign);
			expect(truth).toEqual([]);
		});

		it('ni détourner un rattachement existant vers elle', async () => {
			// Décor indépendant du cas précédent : sans ce ménage, un rattachement
			// (chapitre, série étrangère) laissé par lui ferait refuser l'UPDATE par
			// l'unicité — vert pour une mauvaise raison.
			await service.from('chapter_series').delete().eq('series_id', s.foreign);
			const { data, error } = await teacher.client
				.from('chapter_series')
				.update({ series_id: s.foreign })
				.eq('id', link.prepared)
				.select('id');
			expect(error?.code, 'refus RLS, pas un doublon').not.toBe('23505');
			expect(data ?? []).toHaveLength(0);
			const { data: truth } = await service
				.from('chapter_series')
				.select('series_id')
				.eq('id', link.prepared);
			expect(truth).toEqual([{ series_id: s.prepared }]);
		});

		it('l’admin, lui, peut rattacher la série d’un autre (celle du prof)', async () => {
			const { data, error } = await admin.client
				.from('chapter_series')
				.insert({ chapter_id: otherChapterK1, series_id: s.unattached })
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			const { data: gone } = await service
				.from('chapter_series')
				.delete()
				.eq('id', (data as { id: string }[])[0].id)
				.select('id');
			expect(gone).toHaveLength(1);
		});
	});
});
