/**
 * Un élève archivé perd le chapitre de sa classe (base locale requise)
 * ====================================================================
 *
 * `is_class_student()` ne testait que l'EXISTENCE de l'adhésion — ni son
 * `status`, ni rien d'autre. Elle garde neuf policies en production : le
 * chapitre, ses cinq contenus, deux policies INSERT, et la lecture des PDF dans
 * `storage.objects`. Un élève archivé continuait donc de lire tout le cours de
 * la classe qu'il a quittée, et d'y écrire dedans.
 *
 * ⚠️ CE QUE CE TEST NE COUVRE PAS : la policy storage. Elle existe en prod mais
 * **pas dans le baseline local** (relevé le 2026-09-14 : 4 policies chapitre en
 * local contre 6 en prod), donc aucun test local ne peut l'exercer. Ne pas lire
 * un vert ici comme une preuve sur le chemin des fichiers.
 *
 * Ce n'était pas un choix : `student_has_worksheet_access`, sa voisine, teste
 * bien `cm.status = 'active'`. Deux fonctions, deux comportements.
 *
 * Le trou ne s'est ouvert vraiment que le 2026-09-13, quand retirer un élève
 * est devenu « l'archiver » au lieu de le supprimer — pour qu'il relise ses
 * fiches. L'adhésion survit désormais au départ, donc la garde devait regarder
 * son statut.
 *
 * ⚠️ Ce que ce test NE retire PAS : la relecture rétroactive des fiches déjà
 * distribuées (`had_class_access_to_assignment`, borné par `left_at`). L'élève
 * perd la vitrine du chapitre, pas son classeur — c'est la décision du
 * 2026-09-13, et le dernier cas ci-dessous la protège.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien : la fonction sort par
 * `false` sans jamais lire `class_members`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Client de service : ensemencement et constats, jamais un appel testé. */
const service = createServiceRoleClient();

const PUBLIE = new Date(Date.now() - 3600_000).toISOString();

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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

async function idsVusPar(
	client: SupabaseClient<Database>,
	table: string,
	chapitre: string
): Promise<string[]> {
	const { data, error } = await client
		.from(table as never)
		.select('id')
		.eq('chapter_id', chapitre);
	expect(error, `${table} : lecture élève en erreur`).toBeNull();
	return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

describe('élève archivé — le chapitre de son ancienne classe', () => {
	let classe: string;
	let chapitre: string;
	let document: string;
	let objectif: string;
	let lienExercice: string;
	let lienFiche: string;
	let affectation: string;

	let actif: SupabaseClient<Database>;
	let archive: SupabaseClient<Database>;
	let archiveId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();

		const ecole = await insert('schools', {
			name: 'Lycée archivé ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année archivé ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE archivé ZZ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZAR01',
			is_active: true
		});

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre archivé ZZ',
			display_order: 1,
			is_visible: true
		});

		document = await insert('chapter_documents', {
			chapter_id: chapitre,
			title: 'Document archivé ZZ',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/doc',
			display_order: 1,
			published_at: PUBLIE
		});
		objectif = await insert('chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif archivé ZZ',
			display_order: 1,
			published_at: PUBLIE
		});

		const exercice = await insert('exercises', {
			title: 'Exercice archivé ZZ',
			created_by: enseignant.id,
			grades: ['1_SPE'],
			topic: 'Archivé ZZ',
			category: 'application'
		});
		lienExercice = await insert('chapter_exercises', {
			chapter_id: chapitre,
			exercise_id: exercice,
			display_order: 1,
			published_at: PUBLIE
		});

		// Une fiche publiée ET distribuée : le cas le plus favorable à l'élève.
		const fiche = await insert('worksheets', {
			title: 'Fiche archivé ZZ',
			type: 'worksheet',
			status: 'published',
			created_by: enseignant.id
		});
		affectation = await insert('worksheet_assignments', {
			worksheet_id: fiche,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: enseignant.id
		});
		{
			const { error } = await service
				.from('worksheet_assignment_classes')
				.insert({ assignment_id: affectation, class_id: classe });
			expect(error).toBeNull();
		}
		lienFiche = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: fiche,
			display_order: 1,
			published_at: PUBLIE
		});

		// Deux élèves, même classe, même chapitre : seul le statut les sépare.
		//
		// ⚠️ `joined_at` daté d'un mois, et non laissé à `now()` : la relecture
		// rétroactive exige que la distribution soit POSTÉRIEURE à l'arrivée de
		// l'élève. Un élève inscrit à l'instant n'aurait jamais « reçu » la
		// fiche distribuée hier, et le dernier cas échouerait pour une raison
		// qui n'a rien à voir avec ce qu'il teste.
		const ARRIVEE = new Date(Date.now() - 30 * 86_400_000).toISOString();

		const profilActif = await TestData.profile().withRole('student').create();
		{
			const { error } = await service.from('class_members').insert({
				class_id: classe,
				student_id: profilActif.id,
				status: 'active',
				joined_at: ARRIVEE
			});
			expect(error).toBeNull();
		}
		actif = await clientFor(profilActif.email);

		const profilArchive = await TestData.profile().withRole('student').create();
		archiveId = profilArchive.id;
		{
			// Inséré actif puis archivé : c'est le chemin réel (le trigger
			// `left_at` ne se pose qu'au passage en `archived`).
			const { error: entree } = await service.from('class_members').insert({
				class_id: classe,
				student_id: archiveId,
				status: 'active',
				joined_at: ARRIVEE
			});
			expect(entree).toBeNull();
			const { error: sortie } = await service
				.from('class_members')
				.update({ status: 'archived' })
				.eq('class_id', classe)
				.eq('student_id', archiveId);
			expect(sortie).toBeNull();
		}
		archive = await clientFor(profilArchive.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// Le témoin : sans lui, un test tout vert pourrait n'être qu'un chapitre
	// cassé pour tout le monde.
	it('l’élève ACTIF voit bien le chapitre et ses contenus', async () => {
		const { data, error } = await actif.from('class_chapters').select('id').eq('id', chapitre);
		expect(error).toBeNull();
		expect(data?.map((r) => r.id)).toEqual([chapitre]);

		expect(await idsVusPar(actif, 'chapter_documents', chapitre)).toContain(document);
		expect(await idsVusPar(actif, 'chapter_checklist_items', chapitre)).toContain(objectif);
		expect(await idsVusPar(actif, 'chapter_exercises', chapitre)).toContain(lienExercice);
		expect(await idsVusPar(actif, 'chapter_worksheets', chapitre)).toContain(lienFiche);
	});

	it('l’élève archivé ne voit plus le chapitre', async () => {
		const { data, error } = await archive.from('class_chapters').select('id').eq('id', chapitre);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// ⚠️ Toute table ajoutée ici doit l'être AUSSI au témoin actif ci-dessus :
	// `not.toContain` passe sur une liste vide, donc sur un seed raté.
	it.each([
		['chapter_documents', () => document],
		['chapter_checklist_items', () => objectif],
		['chapter_exercises', () => lienExercice],
		['chapter_worksheets', () => lienFiche]
	])('l’élève archivé ne voit plus %s', async (table, id) => {
		expect(await idsVusPar(archive, table, chapitre)).not.toContain(id());
	});

	it('l’élève archivé ne peut plus cocher un objectif', async () => {
		const { error } = await archive.from('student_checklist_progress').insert({
			checklist_item_id: objectif,
			student_id: archiveId,
			is_completed: true
		});

		expect(error, 'l’insertion aurait dû être refusée par la RLS').not.toBeNull();
		expect(error?.code).toBe('42501');
	});

	/**
	 * Le cas que la seule correction de `is_class_student` ne fermait PAS : les
	 * policies UPDATE et DELETE ne regardaient que `student_id = auth.uid()`.
	 * Un élève archivé ne pouvait plus créer de progression, mais pouvait
	 * indéfiniment cocher et décocher celle qu'il avait déjà.
	 *
	 * ⚠️ Un UPDATE refusé par la RLS ne LÈVE PAS : il ne touche aucune ligne.
	 * C'est `data` vide qu'il faut regarder, pas `error` — attendre un 42501
	 * ici rendrait le test faussement rouge, puis faussement « corrigé ».
	 */
	it('l’élève archivé ne peut plus décocher un objectif déjà coché', async () => {
		// Semé par le service : l'élève l'avait coché quand il était en classe.
		const progression = await insert('student_checklist_progress', {
			checklist_item_id: objectif,
			student_id: archiveId,
			is_completed: true
		});

		const { data: modifiees, error: erreurUpdate } = await archive
			.from('student_checklist_progress')
			.update({ is_completed: false })
			.eq('id', progression)
			.select('id');
		expect(erreurUpdate).toBeNull();
		expect(modifiees, 'aucune ligne ne doit être modifiable').toEqual([]);

		const { data: supprimees, error: erreurDelete } = await archive
			.from('student_checklist_progress')
			.delete()
			.eq('id', progression)
			.select('id');
		expect(erreurDelete).toBeNull();
		expect(supprimees, 'aucune ligne ne doit être supprimable').toEqual([]);

		// Figée, pas cachée : il la VOIT toujours, cochée comme il l'a laissée.
		const { data: vue, error: erreurSelect } = await archive
			.from('student_checklist_progress')
			.select('id, is_completed')
			.eq('id', progression);
		expect(erreurSelect).toBeNull();
		expect(vue).toEqual([{ id: progression, is_completed: true }]);
	});

	/**
	 * La contrepartie, et elle est essentielle : l'élève archivé garde son
	 * classeur. Retirer un élève l'archive PRÉCISÉMENT pour qu'il relise ce
	 * qu'on lui a donné — si ce cas tombe, la correction est allée trop loin.
	 */
	it('l’élève archivé garde la fiche qu’on lui avait distribuée', async () => {
		const { data, error } = await archive
			.from('worksheet_assignments')
			.select('id')
			.eq('id', affectation);

		expect(error).toBeNull();
		expect(data?.map((r) => r.id)).toEqual([affectation]);
	});
});
