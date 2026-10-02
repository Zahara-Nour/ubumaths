/**
 * Séries de chapitre — le CODE serveur sous la RLS réelle (livraison B)
 * ====================================================================
 *
 * La base seule est testée par `series-de-chapitre.test.ts` (livraison A).
 * Ici : les fonctions de `$lib/server/chapter-series`, la publication et le
 * rangement, appelées avec le client d'un élève ou du professeur. Ce que les
 * tests unitaires simulent (zéro ligne → `not_found`, doublon, propriété,
 * évaluation non terminée) est vérifié contre Postgres.
 *
 * `chapter_series` n'est pas encore dans `database.ts` : clients transtypés.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import {
	findOngoingEvaluation,
	linkSeries,
	listChapterSeries,
	setSeriesForm,
	unlinkSeries
} from '$lib/server/chapter-series';
import { setContentPublication } from '$lib/server/chapters-publication';
import { assignToSection } from '$lib/server/chapter-sections';

// Types
type Person = { id: string; client: SupabaseClient<Database> };

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

// Variables
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let admin: Person;
let student: Person;
let chapter: string;
let otherChapter: string;
let published: { series: string; link: string };
let free: string;
let adminSeries: string;

// Functions
async function person(role: 'student' | 'teacher' | 'admin'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email: profile.email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible : ${error.message}`);
	return { id: profile.id, client };
}

async function insertRow(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`décor ${table} : ${error.message}`);
	return (data as { id: string }).id;
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

async function firstSection(chapterId: string): Promise<string> {
	const { data, error } = await service
		.from('chapter_sections')
		.select('id')
		.eq('chapter_id', chapterId)
		.limit(1)
		.single();
	expect(error).toBeNull();
	return (data as { id: string }).id;
}

describe('séries de chapitre — code serveur', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await person('teacher');
		admin = await person('admin');
		student = await person('student');

		const k1 = await TestData.class().withName('1SPE code séries SD').create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: k1.id, student_id: student.id, status: 'active' });
		expect(error).toBeNull();

		const newChapter = (title: string) =>
			insertRow('class_chapters', { class_id: k1.id, title, display_order: 1, is_visible: true });
		chapter = await newChapter('Fonctions SD');
		otherChapter = await newChapter('Second SD');

		const series = (title: string, owner = teacher.id) =>
			insertRow('series', { title, grade: '1_SPE', categories: CATEGORIES, created_by: owner });
		published = { series: await series('Publiée SD'), link: '' };
		published.link = await insertRow('chapter_series', {
			chapter_id: chapter,
			series_id: published.series,
			published_at: PAST
		});
		free = await series('Libre SD');
		adminSeries = await series('De l’admin SD', admin.id);
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('élève : listChapterSeries rend la série publiée, titre et lien de lancement', async () => {
		const { data, error } = await listChapterSeries(chapter, student.client);
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data![0]).toMatchObject({ id: published.link, title: 'Publiée SD', form: 'flash' });
		expect(data![0].questionCount).toBe(4);
		const href = new URL(data![0].launchHref!, 'http://x');
		expect(href.pathname).toBe('/automaths/test');
		expect(href.searchParams.get('mode')).toBe('flash');
	});

	it('élève : retirer, changer la forme, ranger → not_found, rien ne change', async () => {
		expect((await unlinkSeries(chapter, published.link, student.client)).error?.kind).toBe(
			'not_found'
		);
		expect(
			(await setSeriesForm(chapter, published.link, 'interactive', student.client)).error?.kind
		).toBe('not_found');
		const placed = await assignToSection(
			chapter,
			await firstSection(chapter),
			[{ kind: 'series', id: published.link, sectionOrder: 9 }],
			student.client
		);
		expect(placed.notFound).toBe(true);
		expect((await linkTruth(published.link))?.form).toBe('flash');
	});

	it('prof : la série de l’admin → not_found, aucune ligne créée', async () => {
		const r = await linkSeries(chapter, adminSeries, 'flash', teacher.id, teacher.client);
		expect(r.error?.kind).toBe('not_found');
		const { data } = await service.from('chapter_series').select('id').eq('series_id', adminSeries);
		expect(data).toEqual([]);
	});

	it('prof : rattacher, doublon, forme, publier, ranger, retirer', async () => {
		const client = teacher.client;
		const created = await linkSeries(otherChapter, free, 'flash', teacher.id, client);
		expect(created.error).toBeNull();
		const id = created.data!.id;

		const again = await linkSeries(otherChapter, free, 'flash', teacher.id, client);
		expect(again.error?.kind).toBe('duplicate');

		expect((await setSeriesForm(otherChapter, id, 'interactive', client)).error).toBeNull();
		expect((await linkTruth(id))?.form).toBe('interactive');

		const pub = await setContentPublication(
			{ contentType: 'series', itemId: id, published: true, teacherId: teacher.id },
			client
		);
		expect(pub.error).toBeNull();
		expect((await linkTruth(id))?.published_at).not.toBeNull();

		const placed = await assignToSection(
			otherChapter,
			await firstSection(otherChapter),
			[{ kind: 'series', id, sectionOrder: 2 }],
			client
		);
		expect(placed.error).toBeNull();

		// Le mauvais chapitre : zéro ligne, et c'est dit.
		expect((await unlinkSeries(chapter, id, client)).error?.kind).toBe('not_found');
		expect(await linkTruth(id)).not.toBeNull();

		expect((await unlinkSeries(otherChapter, id, client)).error).toBeNull();
		expect(await linkTruth(id)).toBeNull();
	});

	describe('Q129 (b) : évaluation non terminée', () => {
		async function evaluation(status: string, deadline: string | null): Promise<string> {
			const s = await insertRow('series', {
				title: `Éval ${status} SD`,
				grade: '1_SPE',
				categories: CATEGORIES,
				created_by: teacher.id
			});
			await insertRow('evaluations', {
				series_id: s,
				form: 'interactive',
				status,
				deadline,
				created_by: teacher.id
			});
			return s;
		}

		it.each([
			['brouillon (à venir)', 'draft', null, true],
			['publiée (en cours)', 'published', null, true],
			['publiée, date limite passée', 'published', PAST, false],
			['archivée (clôturée)', 'archived', null, false]
		])('%s → %s', async (_nom, status, deadline, attendu) => {
			const s = await evaluation(status, deadline);
			const r = await findOngoingEvaluation(s, teacher.client);
			expect(r.error).toBeNull();
			expect(r.data).toBe(attendu);
		});

		it('une série sans évaluation → false', async () => {
			expect((await findOngoingEvaluation(free, teacher.client)).data).toBe(false);
		});
	});
});
