/**
 * Versions d'un exercice : la fiche choisit la sienne — (Supabase local requis)
 * =============================================================================
 *
 * Migration `20261125153651_versions_exercices` (ADR 0044, chantier versions-exercices, PR 1).
 *
 * Ce que le test prouve :
 * 1. Reprise : dans une transaction annulée, le rollback écrit en commentaire remet l'état d'avant,
 *    puis la migration rejouée DEPUIS SON FICHIER donne à chaque exercice une version 1 identique à
 *    son contenu, et fait pointer chaque ligne de fiche vers elle.
 * 2. Accès (mono-professeur : un seul compte prof) : une version se lit exactement quand son exercice se lit (question d'accès tranchée par
 *    David : personne ne gagne de lecture) ; seul l'auteur écrit.
 * 3. Suppression : une version utilisée par une fiche ne se supprime pas ; supprimer l'exercice
 *    emporte ses versions et ses lignes de fiche ; une ligne ne pointe pas la version d'un AUTRE
 *    exercice.
 * 4. Lecture : une fiche restée en v1 rend la v1 par les liens de partage (cahier, cours) ; hors
 *    fiche (lien de partage d'un exercice, exercices d'un élève), c'est la dernière version.
 *
 * Le décor est posé en superutilisateur (`pg`), hors RLS. Les acteurs lisent et écrivent avec leur
 * client CONNECTÉ (la RLS échoue en silence : chaque refus est vérifié sur les lignes rendues).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Client } from 'pg';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';

// ============================================================================
// TYPES
// ============================================================================

interface Contenu {
	variations: unknown;
	shared: unknown;
	generic_functions: string[] | null;
}

interface LigneRendue {
	exercise_id: string;
	exercise: { variations: unknown; shared: unknown; generic_functions: string[] | null };
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261125153651_versions_exercices.sql';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `itest-versions-${Date.now().toString(36)}`;
const JOURNAL_TOKEN = `versionscahier${Date.now().toString(36)}abcdefghij`.slice(0, 32);
const COURSE_TOKEN = `versionscours${Date.now().toString(36)}abcdefghijk`.slice(0, 32);
const EXERCISE_TOKEN = `versionsexo${Date.now().toString(36)}abcdefghijklm`.slice(0, 32);

const V1: Contenu = {
	variations: [{ label: 'guidé', statement_md: 'Énoncé v1', solution_md: 'Corrigé v1' }],
	shared: { statement_md: 'Commun v1' },
	generic_functions: ['f']
};
const V2: Contenu = {
	variations: [{ label: 'guidé', statement_md: 'Énoncé v2', solution_md: 'Corrigé v2' }],
	shared: { statement_md: 'Commun v2' },
	generic_functions: ['g']
};

// ============================================================================
// VARIABLES
// ============================================================================

let pg: Client;
let auteurId: string;
let auteur: SupabaseClient;
let eleveA: SupabaseClient;
let eleveB: SupabaseClient;
let eleveDirect: SupabaseClient;
let eleveDirectId: string;
let visiteur: SupabaseClient;

/** Exercice privé, dans une fiche distribuée à la classe A, puis passé en v2 */
let exoPrive: string;
let exoPriveV1: string;
let exoPriveV2: string;
/** Exercice public, hors de toute fiche */
let exoPublic: string;
let ficheId: string;
let ligneId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql<T = Record<string, unknown>>(
	query: string,
	params: unknown[] = []
): Promise<T[]> {
	return (await pg.query(query, params)).rows as T[];
}

async function connecte(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Joue `query` dans un savepoint annulé ; rend le code d'erreur Postgres, ou « accepté » */
async function essayer(query: string, params: unknown[] = []): Promise<string> {
	await pg.query('savepoint essai');
	const issue = await pg.query(query, params).then(
		() => 'accepté',
		(e: unknown) => (e as { code?: string }).code ?? String(e)
	);
	await pg.query('rollback to savepoint essai');
	return issue;
}

async function versionsLues(client: SupabaseClient, exerciseId: string): Promise<number[]> {
	const { data, error } = await client
		.from('exercise_versions')
		.select('number')
		.eq('exercise_id', exerciseId)
		.order('number');
	expect(error).toBeNull();
	return (data ?? []).map((v: { number: number }) => v.number);
}

async function exerciceLu(client: SupabaseClient, exerciseId: string): Promise<boolean> {
	const { data, error } = await client.from('exercises').select('id').eq('id', exerciseId);
	expect(error).toBeNull();
	return (data ?? []).length === 1;
}

function contenuDe(e: LigneRendue['exercise']): Contenu {
	return { variations: e.variations, shared: e.shared, generic_functions: e.generic_functions };
}

// ============================================================================
// DÉCOR
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	pg = await getPostgresClient();
	visiteur = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

	const prof = await TestData.profile().withRole('teacher').create();
	const sA = await TestData.profile().withRole('student').create();
	const sB = await TestData.profile().withRole('student').create();
	const sDirect = await TestData.profile().withRole('student').create();
	auteurId = prof.id;
	eleveDirectId = sDirect.id;

	const classeA = ((await TestData.class().create()) as { id: string }).id;
	const classeB = ((await TestData.class().create()) as { id: string }).id;
	await sql('insert into public.class_members (class_id, student_id) values ($1, $2), ($3, $4)', [
		classeA,
		sA.id,
		classeB,
		sB.id
	]);

	// Exercice privé : v1 à la création (helper), v2 ajoutée ensuite
	exoPrive = (
		await sql<{ id: string }>(
			`insert into public.exercises (title, category, created_by, is_public)
			 values ($1, 'automatisme', $2, false) returning id`,
			[RUN, prof.id]
		)
	)[0].id;
	exoPriveV1 = (
		await sql<{ id: string }>(
			`insert into public.exercise_versions (exercise_id, number, variations, shared, generic_functions, created_by)
			 values ($1, 1, $2, $3, $4, $5) returning id`,
			[
				exoPrive,
				JSON.stringify(V1.variations),
				JSON.stringify(V1.shared),
				V1.generic_functions,
				prof.id
			]
		)
	)[0].id;

	exoPublic = (
		await sql<{ id: string }>(
			`insert into public.exercises (title, category, created_by, is_public)
			 values ($1, 'automatisme', $2, true) returning id`,
			[RUN, prof.id]
		)
	)[0].id;
	await sql(
		`insert into public.exercise_versions (exercise_id, number, variations, shared, generic_functions, created_by)
		 values ($1, 1, $2, $3, $4, $5)`,
		[
			exoPublic,
			JSON.stringify(V1.variations),
			JSON.stringify(V1.shared),
			V1.generic_functions,
			prof.id
		]
	);

	// Fiche publiée, distribuée à la classe A, pointant la v1
	ficheId = (
		await sql<{ id: string }>(
			`insert into public.worksheets (title, type, status, created_by)
			 values ($1, 'worksheet', 'published', $2) returning id`,
			[RUN, prof.id]
		)
	)[0].id;
	ligneId = (
		await sql<{ id: string }>(
			`insert into public.worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, position)
			 values ($1, $2, $3, 1) returning id`,
			[ficheId, exoPrive, exoPriveV1]
		)
	)[0].id;
	const affectation = (
		await sql<{ id: string }>(
			`insert into public.worksheet_assignments (worksheet_id, created_by, status)
			 values ($1, $2, 'active') returning id`,
			[ficheId, prof.id]
		)
	)[0].id;
	await sql(
		'insert into public.worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)',
		[affectation, classeA]
	);

	// Affectation directe (sans fiche) de l'exercice privé à un élève
	await sql(
		`insert into public.exercise_assignments (exercise_id, assigned_by, assigned_to_type, student_id, is_active)
		 values ($1, $2, 'student', $3, true)`,
		[exoPrive, prof.id, sDirect.id]
	);

	// Liens de partage : cahier et cours de la classe A, exercice privé
	await sql(
		`insert into public.class_journal_share_tokens (class_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[classeA, JOURNAL_TOKEN, prof.id]
	);
	await sql(
		`insert into public.class_course_share_tokens (class_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[classeA, COURSE_TOKEN, prof.id]
	);
	await sql(
		`insert into public.class_journal_entries (class_id, entry_date, is_published, lesson_content)
		 values ($1, current_date, true, $2)`,
		[classeA, `<p>[[worksheet:${ficheId}|${RUN}]]</p>`]
	);
	const chapitre = (
		await sql<{ id: string }>(
			`insert into public.class_chapters (class_id, title, is_visible) values ($1, $2, true) returning id`,
			[classeA, RUN]
		)
	)[0].id;
	await sql(
		`insert into public.chapter_worksheets (chapter_id, worksheet_id, published_at)
		 values ($1, $2, now() - interval '1 minute')`,
		[chapitre, ficheId]
	);
	await sql(
		`insert into public.exercise_share_tokens (exercise_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[exoPrive, EXERCISE_TOKEN, prof.id]
	);

	// v2 : la fiche reste en v1
	exoPriveV2 = (
		await sql<{ id: string }>(
			`insert into public.exercise_versions (exercise_id, number, note, variations, shared, generic_functions, created_by)
			 values ($1, 2, 'v2 : énoncé reformulé', $2, $3, $4, $5) returning id`,
			[
				exoPrive,
				JSON.stringify(V2.variations),
				JSON.stringify(V2.shared),
				V2.generic_functions,
				prof.id
			]
		)
	)[0].id;

	auteur = await connecte(prof.email);
	eleveA = await connecte(sA.email);
	eleveB = await connecte(sB.email);
	eleveDirect = await connecte(sDirect.email);
});

afterAll(async () => {
	for (const [table, colonne, valeur] of [
		['class_journal_share_tokens', 'token', JOURNAL_TOKEN],
		['class_course_share_tokens', 'token', COURSE_TOKEN],
		['exercise_share_tokens', 'token', EXERCISE_TOKEN],
		['class_chapters', 'title', RUN],
		['worksheets', 'title', RUN],
		['exercises', 'title', RUN]
	] as const) {
		await sql(`delete from public.${table} where ${colonne} = $1`, [valeur]).catch(() => undefined);
	}
	await cleanupAllTestData();
});

// ============================================================================
// 1. REPRISE
// ============================================================================

describe('reprise : rollback documenté, puis migration rejouée depuis son fichier', () => {
	it('chaque exercice a une v1 identique à son contenu ; chaque ligne de fiche pointe vers elle', async () => {
		const rollback = extractRollback(MIGRATION);
		const migration = readFileSync(MIGRATION, 'utf-8');

		await pg.query('begin');
		try {
			// Les autres suites tournent en parallèle : un profil effacé entre la lecture des exercices et
			// la vérification de la clé étrangère ferait échouer la reprise. Le verrou fige les deux
			// tables le temps de la transaction (lectures permises, écritures en attente).
			await pg.query('lock table public.profiles, public.exercises in share mode');
			// La base de TEST garde des exercices sans auteur : des nettoyages en mode `replica` effacent
			// des profils sans cascade. La prod n'en a aucun (mesuré le 2026-11-25 : 0 sur 428) ; ils sont
			// retirés ici, dans la transaction annulée, sinon la v1 de l'un d'eux heurte la clé de
			// `exercise_versions.created_by`.
			await pg.query(
				`delete from public.exercises e
				  where not exists (select 1 from public.profiles p where p.id = e.created_by)`
			);
			await pg.query(rollback);

			// L'état d'avant : plus de table des versions, plus de colonne de version
			const table = await sql(`select to_regclass('public.exercise_versions') as t`);
			expect(table[0].t).toBeNull();

			const exo = (
				await sql<{ id: string }>(
					`insert into public.exercises (title, category, created_by, variations, shared, generic_functions)
					 values ($1, 'automatisme', $2, $3, $4, $5) returning id`,
					[RUN, auteurId, JSON.stringify(V1.variations), JSON.stringify(V1.shared), ['h']]
				)
			)[0].id;
			const vide = (
				await sql<{ id: string }>(
					`insert into public.exercises (title, category, created_by)
					 values ($1, 'automatisme', $2) returning id`,
					[RUN, auteurId]
				)
			)[0].id;
			const fiche = (
				await sql<{ id: string }>(
					`insert into public.worksheets (title, type, status, created_by)
					 values ($1, 'worksheet', 'draft', $2) returning id`,
					[RUN, auteurId]
				)
			)[0].id;
			const lignes = await sql<{ id: string; updated_at: Date }>(
				`insert into public.worksheet_exercises (worksheet_id, exercise_id, position)
				 values ($1, $2, 1), ($1, $2, 2), ($1, $3, 3)
				 returning id, updated_at`,
				[fiche, exo, vide]
			);

			await pg.query(migration);

			const versions = await sql<Contenu & { exercise_id: string; number: number; id: string }>(
				`select v.id, v.exercise_id, v.number, v.variations, v.shared, v.generic_functions
				   from public.exercise_versions v where v.exercise_id = any($1)`,
				[[exo, vide]]
			);
			const vExo = versions.find((v) => v.exercise_id === exo);
			const vVide = versions.find((v) => v.exercise_id === vide);
			expect(versions).toHaveLength(2);
			expect(vExo).toMatchObject({
				number: 1,
				variations: V1.variations,
				shared: V1.shared,
				generic_functions: ['h']
			});
			expect(vVide).toMatchObject({
				number: 1,
				variations: null,
				shared: null,
				generic_functions: null
			});

			// Toute la base : aucun exercice sans v1, contenu identique
			const ecarts = await sql(
				`select e.id from public.exercises e
				   left join public.exercise_versions v on v.exercise_id = e.id and v.number = 1
				  where v.id is null
				     or v.variations is distinct from e.variations
				     or v.shared is distinct from e.shared
				     or v.generic_functions is distinct from e.generic_functions`
			);
			expect(ecarts).toEqual([]);

			const apres = await sql<{ id: string; exercise_version_id: string; updated_at: Date }>(
				`select id, exercise_version_id, updated_at from public.worksheet_exercises where worksheet_id = $1`,
				[fiche]
			);
			for (const ligne of apres) {
				const attendue = ligne.id === lignes[2].id ? vVide?.id : vExo?.id;
				expect(ligne.exercise_version_id).toBe(attendue);
				// La reprise ne date pas les lignes d'une modification qui n'a pas eu lieu
				const avant = lignes.find((l) => l.id === ligne.id);
				expect(ligne.updated_at.getTime()).toBe(avant?.updated_at.getTime());
			}
			const orphelines = await sql(
				`select id from public.worksheet_exercises where exercise_version_id is null`
			);
			expect(orphelines).toEqual([]);
		} finally {
			await pg.query('rollback');
		}
	});
});

// ============================================================================
// 2. STRUCTURE ET SUPPRESSION
// ============================================================================

describe('structure et suppression', () => {
	it('la colonne de version des lignes de fiche est obligatoire', async () => {
		await pg.query('begin');
		try {
			expect(
				await essayer(
					`insert into public.worksheet_exercises (worksheet_id, exercise_id, position) values ($1, $2, 9)`,
					[ficheId, exoPrive]
				)
			).toBe('23502');
		} finally {
			await pg.query('rollback');
		}
	});

	it("une ligne de fiche ne pointe pas la version d'un autre exercice", async () => {
		await pg.query('begin');
		try {
			const vPublic = (
				await sql<{ id: string }>(
					'select id from public.exercise_versions where exercise_id = $1',
					[exoPublic]
				)
			)[0].id;
			expect(
				await essayer(
					`insert into public.worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, position)
					 values ($1, $2, $3, 9)`,
					[ficheId, exoPrive, vPublic]
				)
			).toBe('23503');
		} finally {
			await pg.query('rollback');
		}
	});

	it('un numéro de version est unique par exercice et vaut au moins 1', async () => {
		await pg.query('begin');
		try {
			const inserer = `insert into public.exercise_versions (exercise_id, number, created_by) values ($1, $2, $3)`;
			expect(await essayer(inserer, [exoPrive, 2, auteurId])).toBe('23505');
			expect(await essayer(inserer, [exoPrive, 0, auteurId])).toBe('23514');
			expect(await essayer(inserer, [exoPrive, 3, auteurId])).toBe('accepté');
		} finally {
			await pg.query('rollback');
		}
	});

	it('variations = tableau, shared = objet, note bornée (mêmes règles que sur exercises)', async () => {
		await pg.query('begin');
		try {
			const inserer = `insert into public.exercise_versions (exercise_id, number, created_by, variations, shared, note)
			                 values ($1, 7, $2, $3, $4, $5)`;
			expect(await essayer(inserer, [exoPrive, auteurId, '{}', null, null])).toBe('23514');
			expect(await essayer(inserer, [exoPrive, auteurId, null, '[]', null])).toBe('23514');
			expect(await essayer(inserer, [exoPrive, auteurId, null, null, 'x'.repeat(501)])).toBe(
				'23514'
			);
			expect(await essayer(inserer, [exoPrive, auteurId, null, null, ''])).toBe('23514');
			expect(await essayer(inserer, [exoPrive, auteurId, '[]', '{}', 'v7'])).toBe('accepté');
		} finally {
			await pg.query('rollback');
		}
	});

	it('une version utilisée par une fiche ne se supprime pas ; une autre, si', async () => {
		await pg.query('begin');
		try {
			expect(
				await essayer('delete from public.exercise_versions where id = $1', [exoPriveV1])
			).toBe('23503');
			expect(
				await essayer('delete from public.exercise_versions where id = $1', [exoPriveV2])
			).toBe('accepté');
		} finally {
			await pg.query('rollback');
		}
	});

	it('supprimer un exercice utilisé dans une fiche emporte ses versions et ses lignes de fiche', async () => {
		await pg.query('begin');
		try {
			await pg.query('delete from public.exercises where id = $1', [exoPrive]);
			expect(
				await sql('select id from public.exercise_versions where exercise_id = $1', [exoPrive])
			).toEqual([]);
			expect(
				await sql('select id from public.worksheet_exercises where id = $1', [ligneId])
			).toEqual([]);
		} finally {
			await pg.query('rollback');
		}
	});
});

// ============================================================================
// 3. ACCÈS
// ============================================================================

describe('accès : une version se lit exactement quand son exercice se lit', () => {
	const acteurs = () =>
		[
			['l’auteur', auteur],
			['un élève de la classe qui a la fiche', eleveA],
			['un élève d’une autre classe', eleveB],
			['un élève à qui l’exercice est affecté sans fiche', eleveDirect],
			['un visiteur anonyme', visiteur]
		] as const;

	it('exercice privé : lisent l’auteur et l’élève qui a la fiche, personne d’autre', async () => {
		const lus: Record<string, number[]> = {};
		for (const [nom, client] of acteurs()) {
			lus[nom] = await versionsLues(client, exoPrive);
			// Parité : jamais une version sans son exercice, ni l'inverse
			expect(lus[nom].length > 0, nom).toBe(await exerciceLu(client, exoPrive));
		}
		expect(lus).toEqual({
			'l’auteur': [1, 2],
			'un élève de la classe qui a la fiche': [1, 2],
			'un élève d’une autre classe': [],
			// L'élève affecté sans fiche lit l'exercice par le serveur (API), pas par la RLS :
			// la version suit l'exercice, elle n'ouvre rien de plus
			'un élève à qui l’exercice est affecté sans fiche': [],
			'un visiteur anonyme': []
		});
	});

	it('exercice public : tout le monde le lit, versions comprises', async () => {
		for (const [nom, client] of acteurs()) {
			expect(await versionsLues(client, exoPublic), nom).toEqual([1]);
			expect(await exerciceLu(client, exoPublic), nom).toBe(true);
		}
	});

	it('seul l’auteur ajoute une version', async () => {
		const ajout = (client: SupabaseClient, number: number) =>
			client
				.from('exercise_versions')
				.insert({ exercise_id: exoPublic, number, created_by: auteurId, variations: [] } as never)
				.select('id');
		for (const [nom, client] of acteurs().slice(1)) {
			const { data } = await ajout(client, 5);
			expect(data ?? [], nom).toEqual([]);
		}
		const { data, error } = await ajout(auteur, 5);
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		await sql('delete from public.exercise_versions where exercise_id = $1 and number = 5', [
			exoPublic
		]);
	});

	it('l’auteur ne crée pas une version au nom d’un autre', async () => {
		const autreId = (
			await sql<{ id: string }>(`select id from public.profiles where id <> $1 limit 1`, [auteurId])
		)[0].id;
		const { data } = await auteur
			.from('exercise_versions')
			.insert({ exercise_id: exoPublic, number: 6, created_by: autreId, variations: [] } as never)
			.select('id');
		expect(data ?? []).toEqual([]);
	});

	it('seul l’auteur modifie ou supprime une version', async () => {
		for (const [nom, client] of acteurs().slice(1)) {
			const maj = await client
				.from('exercise_versions')
				.update({ note: 'piratée' } as never)
				.eq('id', exoPriveV2)
				.select('id');
			expect(maj.data ?? [], nom).toEqual([]);
			const sup = await client.from('exercise_versions').delete().eq('id', exoPriveV2).select('id');
			expect(sup.data ?? [], nom).toEqual([]);
		}
		const maj = await auteur
			.from('exercise_versions')
			.update({ note: 'v2 : retouchée' } as never)
			.eq('id', exoPriveV2)
			.select('note');
		expect(maj.error).toBeNull();
		expect(maj.data).toEqual([{ note: 'v2 : retouchée' }]);
		const note = await sql('select note from public.exercise_versions where id = $1', [exoPriveV2]);
		expect(note).toEqual([{ note: 'v2 : retouchée' }]);
	});
});

// ============================================================================
// 4. QUELLE VERSION EST LUE
// ============================================================================

describe('fiche restée en v1, exercice passé en v2', () => {
	it.each([
		['get_worksheet_by_share_token', JOURNAL_TOKEN],
		['get_course_worksheet_by_share_token', COURSE_TOKEN]
	])('%s rend la v1 de la fiche', async (fonction, token) => {
		const { data, error } = await visiteur.rpc(fonction, {
			p_token: token,
			p_worksheet_id: ficheId
		});
		expect(error).toBeNull();
		const lignes = (data as { exercises: LigneRendue[] }).exercises;
		expect(lignes).toHaveLength(1);
		expect(contenuDe(lignes[0].exercise)).toEqual(V1);
	});

	it('get_exercise_by_share_token (hors fiche) rend la dernière version', async () => {
		const { data, error } = await visiteur
			.rpc('get_exercise_by_share_token', { p_token: EXERCISE_TOKEN })
			.maybeSingle();
		expect(error).toBeNull();
		expect(contenuDe(data as LigneRendue['exercise'])).toEqual(V2);
	});

	it('get_student_exercises (hors fiche) rend la dernière version', async () => {
		const { data, error } = await eleveDirect.rpc('get_student_exercises', {
			p_student_id: eleveDirectId
		});
		expect(error).toBeNull();
		const ligne = (data as (Contenu & { exercise_id: string })[]).find(
			(e) => e.exercise_id === exoPrive
		);
		expect(ligne && { variations: ligne.variations, shared: ligne.shared }).toEqual({
			variations: V2.variations,
			shared: V2.shared
		});
	});
});
