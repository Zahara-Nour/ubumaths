/**
 * La SECONDE classe d'une affectation de fiche (nécessite une base locale)
 * =======================================================================
 *
 * Une affectation peut viser plusieurs classes. La jonction
 * `worksheet_assignment_classes` les porte toutes ; la colonne historique
 * `worksheet_assignments.class_id` n'en retient que la PREMIÈRE
 * (`class_id: classIds[0] || null` à la création).
 *
 * Tout code qui lit encore la colonne traite donc la seconde classe comme si
 * elle n'était pas visée. Ces tests fixent le comportement attendu AVANT que la
 * colonne ne soit supprimée, sur les deux lectures qui décident vraiment de
 * quelque chose :
 *
 *   1. `GET /api/student/worksheets?class_id=…` — la liste des fiches d'une
 *      classe, celle qu'interroge la page « Mon cours » d'un chapitre. Filtrée
 *      sur la colonne, elle renvoie une liste VIDE à l'élève de la seconde
 *      classe : la page lui annonce qu'il n'y a aucune fiche, alors qu'il y a
 *      accès. Un écran vide accuse la base, pas le filtre.
 *
 *   2. La page de suivi du professeur — son périmètre d'élèves est construit
 *      sur la colonne. Les élèves de la seconde classe en sont absents : le
 *      professeur croit lire l'avancement de tout le monde.
 *
 * Et la classe RAPPORTÉE à l'élève doit être la SIENNE. La colonne lui faisait
 * afficher le nom d'une classe dont il n'est pas membre.
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
import { GET as listerFichesEleve } from '../../src/routes/api/student/worksheets/+server';
import { load as chargerSuivi } from '../../src/routes/(protected)/dashboard/teacher/contenu/worksheets/[id]/assignments/[assignmentId]/progress/+page.server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Le client service : SEULEMENT pour semer les données. */
const service = createServiceRoleClient();

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

/**
 * ⚠️ Client AUTHENTIFIÉ, jamais `service_role` : avec ce dernier `auth.uid()`
 * vaut NULL, la RLS ne filtre plus rien et le test prouverait un chemin que la
 * production n'emprunte jamais.
 */
function buildLocals(userId: string, client: SupabaseClient<Database>): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

describe('affectation visant une seconde classe', () => {
	let profId: string;
	let profClient: SupabaseClient<Database>;
	let eleveSecondeId: string;
	let eleveSecondeClient: SupabaseClient<Database>;
	let elevePremiereId: string;
	let elevePremiereClient: SupabaseClient<Database>;
	let worksheetId: string;
	let assignmentId: string;
	let classePremiere: string;
	let classeSeconde: string;
	const NOM_SECONDE = '1re B seconde-classe ZZ';

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();
		profId = prof.id;
		profClient = await clientFor(prof.email);

		const c1 = await TestData.class().withName('1re A seconde-classe ZZ').create();
		const c2 = await TestData.class().withName(NOM_SECONDE).create();
		classePremiere = c1.id;
		classeSeconde = c2.id;

		// Un élève par classe : celui de la seconde est le sujet du test, celui de
		// la première sert de témoin (le comportement ne doit pas régresser pour lui).
		const e2 = await TestData.profile().withRole('student').create();
		eleveSecondeId = e2.id;
		eleveSecondeClient = await clientFor(e2.email);

		const e1 = await TestData.profile().withRole('student').create();
		elevePremiereId = e1.id;
		elevePremiereClient = await clientFor(e1.email);

		const { error: membresError } = await service.from('class_members').insert([
			{ class_id: classeSeconde, student_id: eleveSecondeId, status: 'active' },
			{ class_id: classePremiere, student_id: elevePremiereId, status: 'active' }
		]);
		expect(membresError).toBeNull();

		const exercise = (await TestData.exercise(profId).create()) as { id: string };

		worksheetId = await insert('worksheets', {
			title: 'Fiche à deux classes',
			type: 'worksheet',
			status: 'published',
			created_by: profId
		});

		await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exercise.id,
			position: 1
		});

		// Exactement ce que crée l'API : la colonne porte `classIds[0]`, la jonction
		// porte les deux classes.
		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: profId
		});

		const { error: jonctionError } = await service.from('worksheet_assignment_classes').insert([
			{ assignment_id: assignmentId, class_id: classePremiere },
			{ assignment_id: assignmentId, class_id: classeSeconde }
		]);
		expect(jonctionError).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function fichesDe(
		studentId: string,
		client: SupabaseClient<Database>,
		classId?: string
	): Promise<{ assignment_id: string; class_id: string | null; class_name: string | null }[]> {
		const url = new URL('http://localhost/api/student/worksheets');
		if (classId) url.searchParams.set('class_id', classId);
		const response = await listerFichesEleve({
			locals: buildLocals(studentId, client),
			url
		} as never);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			worksheets: { assignment_id: string; class_id: string | null; class_name: string | null }[];
		};
		return body.worksheets;
	}

	it('la fiche apparaît dans la liste de l’élève de la seconde classe', async () => {
		const fiches = await fichesDe(eleveSecondeId, eleveSecondeClient);
		expect(fiches.map((f) => f.assignment_id)).toContain(assignmentId);
	});

	it('filtrée sur SA classe, la liste n’est pas vide — c’est ce que demande « Mon cours »', async () => {
		// Le filtre portait sur la colonne historique, qui vaut la PREMIÈRE classe :
		// la page de chapitre de l'élève affichait « aucune fiche ».
		const fiches = await fichesDe(eleveSecondeId, eleveSecondeClient, classeSeconde);
		expect(fiches.map((f) => f.assignment_id)).toContain(assignmentId);
	});

	it('la classe rapportée à l’élève est la SIENNE, pas la première de l’affectation', async () => {
		// Lui afficher « 1re A » alors qu'il est en « 1re B » nomme devant lui une
		// classe dont il n'est pas membre, et désigne le mauvais groupe.
		const fiche = (await fichesDe(eleveSecondeId, eleveSecondeClient)).find(
			(f) => f.assignment_id === assignmentId
		);
		expect(fiche?.class_id).toBe(classeSeconde);
		expect(fiche?.class_name).toBe(NOM_SECONDE);
	});

	it('filtrée sur une classe qui n’est pas la sienne, la liste est VIDE', async () => {
		// Le filtre passe par la jonction, lue SOUS LA RLS de l'élève : celle-ci ne
		// lui montre que les lignes de ses propres classes. Demander la classe
		// voisine ne rend donc rien — le filtre ne peut que retrancher à une
		// requête déjà bornée, jamais ouvrir.
		const fiches = await fichesDe(eleveSecondeId, eleveSecondeClient, classePremiere);
		expect(fiches).toHaveLength(0);
	});

	it('l’élève de la première classe n’est pas affecté par la correction', async () => {
		const fiches = await fichesDe(elevePremiereId, elevePremiereClient, classePremiere);
		expect(fiches.map((f) => f.assignment_id)).toContain(assignmentId);
	});

	it('le suivi du professeur inclut les élèves de la seconde classe', async () => {
		// Le périmètre était bâti sur la colonne : le professeur lisait l'avancement
		// d'une partie de ses élèves en croyant les voir tous.
		const data = (await chargerSuivi({
			locals: buildLocals(profId, profClient),
			params: { id: worksheetId, assignmentId }
		} as never)) as { students: { studentId: string }[]; className: string | null };

		const ids = data.students.map((s) => s.studentId);
		expect(ids).toContain(eleveSecondeId);
		expect(ids).toContain(elevePremiereId);
	});

	it('le suivi nomme les DEUX classes visées', async () => {
		// « 1re A » seul laissait croire que l'affectation ne visait qu'une classe.
		const data = (await chargerSuivi({
			locals: buildLocals(profId, profClient),
			params: { id: worksheetId, assignmentId }
		} as never)) as { className: string | null };

		expect(data.className).toContain('1re A seconde-classe ZZ');
		expect(data.className).toContain(NOM_SECONDE);
	});
});
