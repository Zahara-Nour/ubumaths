/**
 * Vue `resources` + recherche globale (nécessite une base locale)
 * ===============================================================
 *
 * Migration : 20260908120000_resources_view_and_search.sql
 *
 * L'enjeu de ces tests n'est pas « la vue renvoie-t-elle des lignes » mais
 * « la vue OUVRE-T-ELLE un accès ». Une vue Postgres s'exécute par défaut avec
 * les droits de son propriétaire : sans `security_invoker = true`, agréger cinq
 * tables protégées par RLS les déprotégerait toutes d'un coup, et un élève
 * lirait par la vue les brouillons et les exercices privés du prof.
 *
 * Le test décisif est donc `la vue n'ouvre aucun accès nouveau` : on compare ce
 * qu'un élève voit par la vue à ce qu'il voit par les tables sources. Il échoue
 * si l'option est retirée de la migration.
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null` : chaque cas vérifie
 * des identifiants précis. Une requête qui « ne plante pas » ne prouve rien sur
 * ce qu'elle a le droit de lire.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Un client anon sans session — exactement ce dont dispose un inconnu. */
function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

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

// Identifiants fixes : le nettoyage doit pouvoir viser exactement ces lignes.
const EX_PUBLIC = 'c0ffee00-0000-4000-8000-00000000e001';
const EX_PRIVATE = 'c0ffee00-0000-4000-8000-00000000e002';
const EX_NO_TITLE = 'c0ffee00-0000-4000-8000-00000000e003';
const EX_PERCENT = 'c0ffee00-0000-4000-8000-00000000e004';
const Q_PUBLISHED = 'c0ffee00-0000-4000-8000-0000000000a1';
const Q_DRAFT = 'c0ffee00-0000-4000-8000-0000000000a2';
/** Fiche d'exercices + la jonction qui y place EX_PUBLIC (migration 20260908190000). */
const WORKSHEET = 'c0ffee00-0000-4000-8000-0000000000f1';
const WS_EXERCISE = 'c0ffee00-0000-4000-8000-0000000000f2';
const WORKSHEET_TITLE = 'Dérivées ZZ';

const EXERCISE_IDS = [EX_PUBLIC, EX_PRIVATE, EX_NO_TITLE, EX_PERCENT];
/** Tag posé sur EX_PUBLIC pour éprouver la recherche par étiquette (phase 4). */
const TAG_NAME = 'Géométrie ZZ';
const QUESTION_IDS = [Q_PUBLISHED, Q_DRAFT];

function exercise(id: string, title: string | null, isPublic: boolean, createdBy: string) {
	return {
		id,
		title,
		slug: title === null ? 'exo-sans-titre-zz1' : null,
		topic: 'Nombres et calculs',
		category: 'automatisme',
		is_public: isPublic,
		created_by: createdBy,
		grades: ['6'],
		variables: [],
		variations: [{ label: 'default', statement_md: 'Combien font 2+2 ?', solution_md: '4' }]
	};
}

function question(id: string, title: string, status: 'published' | 'draft', createdBy: string) {
	return {
		id,
		type: 'fill_in_blanks',
		title,
		theme: 'Nombres',
		domain: 'Fractions',
		subdomain: 'Équivalence',
		level: 1,
		grades: ['6'],
		status,
		created_by: createdBy,
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

describe('vue resources + recherche globale', () => {
	const service = createServiceRoleClient();
	let teacher: SupabaseClient<Database>;
	let student: SupabaseClient<Database>;
	let teacherId: string;
	let tagId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		const studentProfile = await TestData.profile().withRole('student').create();
		teacherId = teacherProfile.id;

		await service.from('exercises').delete().in('id', EXERCISE_IDS);
		await service.from('question_templates').delete().in('id', QUESTION_IDS);

		const { error: exError } = await service.from('exercises').insert([
			// @ts-expect-error - fixture minimale : les colonnes non listées ont un défaut
			exercise(EX_PUBLIC, 'Algèbre — révisions publiques', true, teacherId),
			exercise(EX_PRIVATE, 'Algèbre — brouillon privé', false, teacherId),
			exercise(EX_NO_TITLE, null, true, teacherId),
			exercise(EX_PERCENT, 'Pourcentages 100 % de réussite', true, teacherId)
		]);
		expect(exError).toBeNull();

		const { error: qError } = await service.from('question_templates').insert([
			// @ts-expect-error - fixture minimale : les colonnes non listées ont un défaut
			question(Q_PUBLISHED, 'Fractions équivalentes', 'published', teacherId),
			question(Q_DRAFT, 'Fractions — brouillon', 'draft', teacherId)
		]);
		expect(qError).toBeNull();

		// Une fiche contenant l'exercice public : c'est l'objet du type
		// `worksheet_exercise`, dont l'identifiant est celui de la JONCTION.
		await service.from('worksheet_exercises').delete().eq('id', WS_EXERCISE);
		await service.from('worksheets').delete().eq('id', WORKSHEET);
		const { error: wsError } = await service.from('worksheets').insert({
			id: WORKSHEET,
			title: WORKSHEET_TITLE,
			type: 'worksheet',
			status: 'published',
			created_by: teacherId
		});
		expect(wsError).toBeNull();

		const { error: wsExError } = await service.from('worksheet_exercises').insert({
			id: WS_EXERCISE,
			worksheet_id: WORKSHEET,
			exercise_id: EX_PUBLIC,
			position: 3
		});
		expect(wsExError).toBeNull();

		// Étiquette posée sur l'exercice public, pour la recherche par tag.
		const looseService = service as unknown as {
			from: (t: string) => {
				delete: () => { eq: (c: string, v: string) => PromiseLike<unknown> };
				insert: (rows: unknown) => PromiseLike<{ error: unknown }>;
				select: (c: string) => {
					eq: (c: string, v: string) => PromiseLike<{ data: { id: string }[] | null }>;
				};
			};
		};
		await looseService.from('tags').delete().eq('name', TAG_NAME);
		await looseService.from('tags').insert({ name: TAG_NAME });
		const { data: tagRows } = await looseService.from('tags').select('id').eq('name', TAG_NAME);
		expect(tagRows).toHaveLength(1);
		tagId = tagRows![0].id;
		await looseService
			.from('resource_tags')
			.insert({ resource_kind: 'exercise', resource_id: EX_PUBLIC, tag_id: tagId });

		teacher = await clientFor(teacherProfile.email);
		student = await clientFor(studentProfile.email);
	});

	afterAll(async () => {
		await (
			service as unknown as {
				from: (t: string) => {
					delete: () => { eq: (c: string, v: string) => PromiseLike<unknown> };
				};
			}
		)
			.from('tags')
			.delete()
			.eq('name', TAG_NAME);
		await service.from('worksheet_exercises').delete().eq('id', WS_EXERCISE);
		await service.from('worksheets').delete().eq('id', WORKSHEET);
		await service.from('exercises').delete().in('id', EXERCISE_IDS);
		await service.from('question_templates').delete().in('id', QUESTION_IDS);
		await cleanupAllTestData();
	});

	// ========================================================================
	// La vue
	// ========================================================================

	it('expose les cinq types sous une forme commune', async () => {
		const { data, error } = await teacher
			.from('resources')
			.select('kind, id, title')
			.in('id', [EX_PUBLIC, Q_PUBLISHED]);

		expect(error).toBeNull();
		expect(data).toHaveLength(2);
		expect(data?.find((r) => r.id === EX_PUBLIC)?.kind).toBe('exercise');
		expect(data?.find((r) => r.id === Q_PUBLISHED)?.kind).toBe('question');
	});

	it('ne renvoie jamais un titre vide : repli sur le slug', async () => {
		const { data, error } = await teacher
			.from('resources')
			.select('title')
			.eq('id', EX_NO_TITLE)
			.single();

		expect(error).toBeNull();
		// `exercises.title` est nullable en base ; une ligne sans libellé serait
		// inexploitable dans une liste de résultats.
		expect(data?.title).toBe('exo-sans-titre-zz1');
	});

	it('inclut les brouillons pour le prof — les cacher rendrait la recherche inutile', async () => {
		const { data, error } = await teacher
			.from('resources')
			.select('id, status')
			.eq('id', Q_DRAFT)
			.maybeSingle();

		expect(error).toBeNull();
		expect(data?.status).toBe('draft');
	});

	it("LA VUE N'OUVRE AUCUN ACCÈS : un élève n'y voit ni brouillon ni exercice privé", async () => {
		const { data, error } = await student
			.from('resources')
			.select('id')
			.in('id', [EX_PRIVATE, Q_DRAFT]);

		// Pas une erreur : la RLS filtre, elle ne rejette pas.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('ce que l’élève voit par la vue est exactement ce qu’il voit par les tables', async () => {
		// Le cœur du test : si `security_invoker` disparaissait, la vue
		// renverrait les quatre exercices là où la table n'en renvoie que trois.
		const viaView = await student.from('resources').select('id').in('id', EXERCISE_IDS);
		const viaTable = await student.from('exercises').select('id').in('id', EXERCISE_IDS);

		expect(viaView.error).toBeNull();
		expect(viaTable.error).toBeNull();

		const fromView = (viaView.data ?? []).map((r) => r.id).sort();
		const fromTable = (viaTable.data ?? []).map((r) => r.id).sort();

		expect(fromView).toEqual(fromTable);
		// Et l'exercice privé n'est dans ni l'un ni l'autre.
		expect(fromView).not.toContain(EX_PRIVATE);
	});

	it("anon n'a AUCUN droit sur la vue (ACL, pas RLS)", async () => {
		// Finding F1 de l'audit : le baseline pose `ALTER DEFAULT PRIVILEGES ...
		// GRANT ALL ON TABLES TO anon`, jamais neutralisé. Une vue créée par
		// `postgres` reçoit donc une entrée ACL explicite pour `anon`, que
		// `revoke ... from public` ne retire pas. Sans le `revoke ... from anon`,
		// cette requête renverrait des lignes au lieu d'un refus.
		const { data, error } = await anonClient().from('resources').select('id').limit(1);

		expect(data ?? []).toEqual([]);
		expect(error).not.toBeNull();
	});

	it('anon ne peut pas non plus appeler la recherche', async () => {
		const { error } = await anonClient().rpc('search_resources', { p_query: 'algebre' });

		expect(error).not.toBeNull();
	});

	// ========================================================================
	// La recherche
	// ========================================================================

	it('est insensible aux accents et à la casse', async () => {
		const { data, error } = await teacher.rpc('search_resources', { p_query: 'ALGEBRE' });

		expect(error).toBeNull();
		const ids = (data ?? []).map((r: { id: string }) => r.id);
		// « ALGEBRE » doit trouver « Algèbre ».
		expect(ids).toContain(EX_PUBLIC);
	});

	it('cherche aussi dans les métadonnées, pas seulement le titre', async () => {
		// Le sous-titre d'une question est son quadruplet thème/domaine/sous-domaine.
		const { data, error } = await teacher.rpc('search_resources', { p_query: 'equivalence' });

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(Q_PUBLISHED);
	});

	it('filtre par type', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'fractions',
			p_kinds: ['question']
		});

		expect(error).toBeNull();
		const kinds = new Set((data ?? []).map((r: { kind: string }) => r.kind));
		expect(kinds.has('question')).toBe(true);
		expect(kinds.has('exercise')).toBe(false);
	});

	it('échappe les jokers LIKE : chercher « % » ne renvoie pas tout le catalogue', async () => {
		const { data, error } = await teacher.rpc('search_resources', { p_query: '100 %' });

		expect(error).toBeNull();
		const ids = (data ?? []).map((r: { id: string }) => r.id);
		// Seul le titre contenant littéralement « 100 % » remonte.
		expect(ids).toContain(EX_PERCENT);
		expect(ids).not.toContain(EX_PUBLIC);
		expect(ids).not.toContain(Q_PUBLISHED);
	});

	it('refuse une recherche de moins de deux caractères', async () => {
		const { data, error } = await teacher.rpc('search_resources', { p_query: 'a' });

		expect(error).toBeNull();
		// Ni erreur ni balayage complet : simplement rien.
		expect(data).toEqual([]);
	});

	it('plafonne la limite à 50 même si on demande plus', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'e',
			p_limit: 5000
		});

		expect(error).toBeNull();
		expect((data ?? []).length).toBeLessThanOrEqual(50);
	});

	it('borne la longueur de la requête côté base, pas seulement côté API', async () => {
		// Finding F2 : la RPC est appelable directement en POST /rest/v1/rpc/...,
		// donc le .max(100) du schéma Zod ne protège que la route /api/search.
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'a'.repeat(101)
		});

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('accepte TOUT le vocabulaire réel — le plafond ne doit pas le toucher', async () => {
		// Régression : le plafond valait 5, soit exactement la taille du vocabulaire
		// d'alors. L'éditeur envoie tous les types ; en ajouter un sixième rendait
		// donc la recherche vide, sans erreur ni trace. Le plafond borne un coût,
		// il ne valide pas un vocabulaire.
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'algebre',
			p_kinds: [
				'exercise',
				'worksheet',
				'question',
				'assessment',
				'chapter',
				'python_exercise',
				'python_notebook',
				'construction',
				'document'
			]
		});

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(EX_PUBLIC);
	});

	it('borne tout de même un tableau de types déraisonnable', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'algebre',
			p_kinds: Array.from({ length: 13 }, () => 'exercise')
		});

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it("la recherche d'un élève ne remonte pas ce qu'il ne peut pas lire", async () => {
		const { data, error } = await student.rpc('search_resources', { p_query: 'algebre' });

		expect(error).toBeNull();
		const ids = (data ?? []).map((r: { id: string }) => r.id);
		expect(ids).not.toContain(EX_PRIVATE);
	});

	// ========================================================================
	// Les types du catalogue (migrations 20260908190000 → 20260909020000)
	// ========================================================================

	it('expose LA FICHE elle-même, cherchable par son titre', async () => {
		const { data, error } = await teacher
			.from('resources')
			.select('kind, id, title')
			.eq('id', WORKSHEET)
			.maybeSingle();

		expect(error).toBeNull();
		expect(data?.kind).toBe('worksheet');
		expect(data?.title).toBe(WORKSHEET_TITLE);
	});

	it('n’inonde PLUS le catalogue avec les exercices de fiches', async () => {
		// 127 exercices de fiches en production contre 12 fiches : les lister
		// noyait tout le reste. On cherche la fiche, puis on désigne l'exercice
		// par son numéro. Le type reste valide comme RÉFÉRENCE — il n'est
		// simplement plus un résultat de recherche.
		const { data, error } = await teacher
			.from('resources')
			.select('id')
			.eq('kind', 'worksheet_exercise');

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('trouve la fiche en cherchant son titre', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'derivees',
			p_kinds: ['worksheet']
		});

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(WORKSHEET);
	});

	it("n'expose PAS la fiche à un élève à qui elle n'a pas été distribuée", async () => {
		// La branche lit `worksheets` sous l'identité de l'appelant, dont la RLS
		// exige un `student_has_worksheet_access`. Sans `security_invoker`, ce
		// test tombe.
		const { data, error } = await student.from('resources').select('id').eq('id', WORKSHEET);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('filtre la fiche par le niveau de LA FICHE', async () => {
		const { error: gradeError } = await service
			.from('worksheets')
			.update({ grades: ['1_SPE'] })
			.eq('id', WORKSHEET);
		expect(gradeError).toBeNull();

		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'derivees',
			p_grades: ['6']
		});

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).not.toContain(WORKSHEET);
	});

	it('filtre par niveau : la 6ᵉ ne remonte pas dans une recherche de 1ʳᵉ spé', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'algebre',
			p_grades: ['1_SPE']
		});

		expect(error).toBeNull();
		// EX_PUBLIC est en 6ᵉ : il sort. Sans le filtre, il remonterait (test
		// « est insensible aux accents et à la casse » ci-dessus).
		expect((data ?? []).map((r: { id: string }) => r.id)).not.toContain(EX_PUBLIC);
	});

	it('une ressource SANS niveau reste toujours visible', async () => {
		// La masquer la rendrait introuvable sans raison compréhensible. Un
		// chapitre n'a jamais de niveau ; certains exercices non plus.
		const { error: clearError } = await service
			.from('exercises')
			.update({ grades: null })
			.eq('id', EX_PERCENT);
		expect(clearError).toBeNull();

		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'pourcentages',
			p_grades: ['1_SPE']
		});

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(EX_PERCENT);

		await service
			.from('exercises')
			.update({ grades: ['6'] })
			.eq('id', EX_PERCENT);
	});

	it('sans p_grades, rien n’est filtré', async () => {
		const { data, error } = await teacher.rpc('search_resources', { p_query: 'algebre' });

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(EX_PUBLIC);
	});

	it("n'expose pas non plus l'exercice sous-jacent d'une fiche non distribuée", async () => {
		// Même démonstration que pour la vue entière : la branche lit
		// `worksheets` sous l'identité de l'appelant, dont la RLS exige un
		// `student_has_worksheet_access`. Sans `security_invoker`, ce test tombe.
		const { data, error } = await student.from('resources').select('id').eq('id', WS_EXERCISE);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// ========================================================================
	// Recherche par tag (phase 4)
	// ========================================================================

	it('trouve une ressource par son tag, sans aucun texte', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: '',
			p_tags: [TAG_NAME]
		});

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(EX_PUBLIC);
	});

	it('compare le tag sur sa forme canonique, pas sur le libellé', async () => {
		// « GEOMETRIE ZZ » doit retrouver ce qui est tagué « Géométrie ZZ ».
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: '',
			p_tags: ['GEOMETRIE ZZ']
		});

		expect(error).toBeNull();
		expect((data ?? []).map((r: { id: string }) => r.id)).toContain(EX_PUBLIC);
	});

	it('combine tag ET texte plutôt que de les additionner', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: 'pourcentages',
			p_tags: [TAG_NAME]
		});

		expect(error).toBeNull();
		// EX_PERCENT correspond au texte mais n'a pas le tag ; EX_PUBLIC a le tag
		// mais pas le texte. L'intersection est vide.
		expect(data).toEqual([]);
	});

	it('un tag inexistant ne renvoie rien plutôt que tout', async () => {
		const { data, error } = await teacher.rpc('search_resources', {
			p_query: '',
			p_tags: ['tag-qui-nexiste-pas-zz']
		});

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('sans texte exploitable ni tag, ne déverse pas le catalogue', async () => {
		const { data, error } = await teacher.rpc('search_resources', { p_query: '' });

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});
});
