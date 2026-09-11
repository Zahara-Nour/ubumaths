/**
 * Les trois voies de distribution d'une fiche (nécessite une base locale)
 * ======================================================================
 *
 * Une fiche atteint un élève par trois chemins :
 *
 *   voie 1 — `worksheet_assignments.class_id`, la colonne HISTORIQUE. Elle
 *            duplique la première classe de la jonction, et n'existe plus que
 *            pour d'éventuelles affectations créées avant celle-ci ;
 *   voie 2 — `worksheet_assignment_classes`, la jonction, qui porte TOUTES les
 *            classes, première comprise ;
 *   voie 3 — `worksheet_assignment_students`, l'élève nommément désigné, sans
 *            condition de classe — c'est le cas de l'élève hors classe.
 *
 * CE QUE CES TESTS PROUVENT. La correction du 2026-09-08 a étendu
 * `student_has_worksheet_access` aux trois voies, mais a laissé de côté
 * `student_has_exercise_access(uuid)`, qui garde la policy « Students can view
 * assigned exercises » sur `exercises`. Résultat : par les voies 2 et 3, l'élève
 * ouvre la fiche et ses sections, mais **pas ses exercices** — une fiche vide.
 *
 * ⚠️ `student_has_exercise_access` est SURCHARGÉE (deux signatures). Le
 * générateur de types saute les fonctions surchargées : son absence de
 * `database.ts` ne dit rien de son existence en base.
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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

describe('les trois voies de distribution', () => {
	let worksheetId: string;
	let exerciseId: string;
	let assignmentId: string;
	let classePremiere: string;
	let classeSeconde: string;

	/** Élève membre de la première classe — couvert par la voie 1 ET la voie 2. */
	let elevePremiere: SupabaseClient<Database>;
	/** Élève membre de la SECONDE classe — couvert par la voie 2 seule. */
	let eleveSeconde: SupabaseClient<Database>;
	/** Élève d'aucune classe, nommément désigné — voie 3 seule. */
	let eleveDesigne: SupabaseClient<Database>;
	/** Élève sans aucun lien avec l'affectation — le témoin négatif. */
	let eleveEtranger: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();

		const c1 = await TestData.class().withName('1re A voies ZZ').create();
		const c2 = await TestData.class().withName('1re B voies ZZ').create();
		classePremiere = c1.id;
		classeSeconde = c2.id;

		const p1 = await TestData.profile().withRole('student').create();
		const p2 = await TestData.profile().withRole('student').create();
		const p3 = await TestData.profile().withRole('student').create();
		const p4 = await TestData.profile().withRole('student').create();

		const { error: membresError } = await service.from('class_members').insert([
			{ class_id: classePremiere, student_id: p1.id },
			{ class_id: classeSeconde, student_id: p2.id }
		]);
		expect(membresError).toBeNull();

		elevePremiere = await clientFor(p1.email);
		eleveSeconde = await clientFor(p2.email);
		eleveDesigne = await clientFor(p3.email);
		eleveEtranger = await clientFor(p4.email);

		// La fiche et son unique exercice.
		const exercise = (await TestData.exercise(prof.id).create()) as { id: string };
		exerciseId = exercise.id;

		worksheetId = await insert('worksheets', {
			title: 'Fiche des trois voies',
			type: 'worksheet',
			status: 'published',
			created_by: prof.id
		});

		await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exerciseId,
			position: 1
		});

		// UNE affectation, visant les deux classes ET un élève nommément désigné —
		// exactement ce que produit l'API de distribution aujourd'hui.
		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			class_id: classePremiere, // voie 1 : la première classe, dupliquée
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: prof.id
		});

		const { error: jonctionError } = await service.from('worksheet_assignment_classes').insert([
			{ assignment_id: assignmentId, class_id: classePremiere },
			{ assignment_id: assignmentId, class_id: classeSeconde }
		]);
		expect(jonctionError).toBeNull();

		const { error: designeError } = await service
			.from('worksheet_assignment_students')
			.insert({ assignment_id: assignmentId, student_id: p3.id });
		expect(designeError).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/** La fiche est-elle lisible par ce client ? */
	async function litLaFiche(client: SupabaseClient<Database>): Promise<boolean> {
		const { data } = await client.from('worksheets').select('id').eq('id', worksheetId);
		return (data ?? []).length > 0;
	}

	/** Et SES EXERCICES ? C'est là que le défaut se voit. */
	async function litLesExercices(client: SupabaseClient<Database>): Promise<boolean> {
		const { data } = await client.from('exercises').select('id').eq('id', exerciseId);
		return (data ?? []).length > 0;
	}

	// ========================================================================
	// Ce qui marchait déjà
	// ========================================================================

	it('voie 1+2 — l’élève de la première classe lit la fiche ET ses exercices', async () => {
		expect(await litLaFiche(elevePremiere)).toBe(true);
		expect(await litLesExercices(elevePremiere)).toBe(true);
	});

	// ========================================================================
	// Le défaut — ces deux-là doivent être ROUGES avant correction
	// ========================================================================

	it('voie 2 — l’élève de la SECONDE classe lit la fiche', async () => {
		// Déjà corrigé le 2026-09-08 : c'est le témoin qui montre que seule la
		// lecture des EXERCICES manque.
		expect(await litLaFiche(eleveSeconde)).toBe(true);
	});

	it('voie 2 — et il lit AUSSI ses exercices', async () => {
		// Sans cette correction, la fiche s'ouvre vide : l'élève voit un titre et
		// aucun énoncé, sans le moindre message.
		expect(await litLesExercices(eleveSeconde)).toBe(true);
	});

	it('voie 3 — l’élève nommément désigné lit la fiche', async () => {
		expect(await litLaFiche(eleveDesigne)).toBe(true);
	});

	it('voie 3 — et il lit AUSSI ses exercices', async () => {
		// Le cas de l'élève hors classe, que le modèle mono-professeur prévoit.
		expect(await litLesExercices(eleveDesigne)).toBe(true);
	});

	// ========================================================================
	// Ce que la correction ne doit surtout pas ouvrir
	// ========================================================================

	it('un élève étranger à l’affectation ne lit NI la fiche NI ses exercices', async () => {
		// Le témoin négatif : sans lui, une correction trop large passerait pour
		// un succès.
		expect(await litLaFiche(eleveEtranger)).toBe(false);
		expect(await litLesExercices(eleveEtranger)).toBe(false);
	});

	it('une affectation annulée ne donne rien, par aucune voie', async () => {
		const { error: desactiveeError } = await service
			.from('worksheet_assignments')
			.update({ status: 'cancelled' })
			.eq('id', assignmentId);
		expect(desactiveeError).toBeNull();

		expect(await litLaFiche(elevePremiere)).toBe(false);
		expect(await litLesExercices(elevePremiere)).toBe(false);
		expect(await litLaFiche(eleveSeconde)).toBe(false);
		expect(await litLaFiche(eleveDesigne)).toBe(false);

		const { error: retourError } = await service
			.from('worksheet_assignments')
			.update({ status: 'active' })
			.eq('id', assignmentId);
		expect(retourError).toBeNull();
	});

	it('une affectation pas encore ouverte ne donne rien non plus', async () => {
		const { error: futureError } = await service
			.from('worksheet_assignments')
			.update({ available_from: new Date(Date.now() + 7 * 86_400_000).toISOString() })
			.eq('id', assignmentId);
		expect(futureError).toBeNull();

		expect(await litLaFiche(elevePremiere)).toBe(false);
		expect(await litLesExercices(eleveSeconde)).toBe(false);

		const { error: retourError } = await service
			.from('worksheet_assignments')
			.update({ available_from: new Date(Date.now() - 86_400_000).toISOString() })
			.eq('id', assignmentId);
		expect(retourError).toBeNull();
	});

	it('une classe ARCHIVÉE ne donne plus accès, mais l’élève désigné garde le sien', async () => {
		// `classes.is_active` est une garde des deux voies de classe, et aucun test
		// ne la protégeait : une réécriture pourrait la perdre sans rougir.
		//
		// La voie 3 n'a, elle, aucune condition de classe — c'est le point de
		// l'élève hors classe, et il doit rester vrai quand les classes tombent.
		const { error: archiveError } = await service
			.from('classes')
			.update({ is_active: false })
			.in('id', [classePremiere, classeSeconde]);
		expect(archiveError).toBeNull();

		expect(await litLaFiche(elevePremiere)).toBe(false);
		expect(await litLesExercices(eleveSeconde)).toBe(false);
		expect(await litLaFiche(eleveDesigne)).toBe(true);
		expect(await litLesExercices(eleveDesigne)).toBe(true);

		const { error: retourError } = await service
			.from('classes')
			.update({ is_active: true })
			.in('id', [classePremiere, classeSeconde]);
		expect(retourError).toBeNull();
	});

	// ========================================================================
	// Le retrait de la voie 1 ne doit retirer aucun accès
	// ========================================================================

	it('la colonne historique vidée, l’élève de la première classe garde tout', async () => {
		// C'est la preuve que la voie 1 ne porte rien que la jonction n'ait déjà :
		// on la vide, et l'accès tient. Sans ce test, retirer la voie 1 serait un
		// pari.
		const { error: videError } = await service
			.from('worksheet_assignments')
			.update({ class_id: null })
			.eq('id', assignmentId);
		expect(videError).toBeNull();

		expect(await litLaFiche(elevePremiere)).toBe(true);
		expect(await litLesExercices(elevePremiere)).toBe(true);

		const { error: retourError } = await service
			.from('worksheet_assignments')
			.update({ class_id: classePremiere })
			.eq('id', assignmentId);
		expect(retourError).toBeNull();
	});
});
