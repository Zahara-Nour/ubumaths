/**
 * L'élève archivé relit ses anciennes fiches, sans pouvoir y écrire (base locale requise)
 * =======================================================================================
 *
 * La série « élève archivé » a fermé, en septembre, tout ce que la classe
 * quittée distribuait. C'était le bon défaut, mais il emporte un cas légitime :
 * en septembre, l'élève ne peut plus relire ce qu'il a travaillé en juin.
 *
 * On rouvre la LECTURE, et elle seule. Trois chemins la gardaient :
 *   - la policy « Students can view their assignments » → la liste ;
 *   - `student_has_worksheet_access`                    → fiches, sections, exercices ;
 *   - `can_access_assignment`                           → la route de détail ET
 *     l'INSERT des signalements d'erreur.
 *
 * Le troisième ne bouge PAS : c'est lui qui garde les écritures. Un pendant
 * lecture, `can_read_assignment`, lui est ajouté à côté.
 *
 * LA BORNE. `class_members` ne date pas l'archivage — pas de colonne
 * `archived_at`. Sans borne, une fiche distribuée à la classe APRÈS le départ
 * de l'élève lui deviendrait lisible. On se sert donc du rattachement posé en
 * Phase 1 : la fiche doit avoir été distribuée dans la fenêtre de l'année
 * scolaire de la classe. Une classe sans année n'ouvre rien — la jointure
 * échoue, et refuser est le bon repli.
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

/** Client de service : ensemencement uniquement, jamais une assertion d'accès. */
const service = createServiceRoleClient();

/** L'année de la classe quittée : close, et bien dans le passé. */
const ANNEE_DEBUT = '2025-09-01';
const ANNEE_FIN = '2026-06-30';

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

describe('lecture seule rétroactive des fiches', () => {
	let ecole: string;
	let annee: string;
	let enseignantId: string;

	/** La classe quittée, rattachée à son année. */
	let classeQuittee: string;
	/** Une classe sans année rattachée : le repli fermé. */
	let classeSansAnnee: string;
	/** Une classe dont l'élève n'a jamais été membre. */
	let classeEtrangere: string;

	let ficheId: string;
	let exerciceId: string;
	/** Distribuée pendant l'année : c'est celle qu'on rouvre. */
	let affectationDansAnnee: string;
	/** Distribuée après la fin de l'année : elle doit rester fermée. */
	let ficheHorsAnnee: string;
	let affectationHorsAnnee: string;
	/** Distribuée à la classe sans année. */
	let ficheSansAnnee: string;
	/** Distribuée à une classe étrangère à l'élève. */
	let ficheEtrangere: string;

	let archive: SupabaseClient<Database>;
	let archiveId: string;
	let actif: SupabaseClient<Database>;
	let etranger: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;

		ecole = await insert('schools', {
			name: 'Lycée rétroactif ZZ',
			city: 'Ville ZZ',
			country: 'France'
		});
		annee = await insert('school_years', {
			school_id: ecole,
			name: '2025-2026 rétroactif ZZ',
			start_date: ANNEE_DEBUT,
			end_date: ANNEE_FIN,
			is_active: false
		});

		let codeSuivant = 0;
		const classe = async (nom: string, avecAnnee: boolean) =>
			insert('classes', {
				name: nom,
				school_id: ecole,
				join_code: `ZZR${(codeSuivant++).toString().padStart(3, '0')}`,
				school_year_id: avecAnnee ? annee : null,
				// La classe est close : c'est exactement l'état d'après la bascule.
				is_active: false
			});

		classeQuittee = await classe('2DE quittée ZZ', true);
		classeSansAnnee = await classe('2DE sans année ZZ', false);
		classeEtrangere = await classe('2DE étrangère ZZ', true);

		const eleve = async (adhesions: { class_id: string; status: string }[]) => {
			const profil = await TestData.profile().withRole('student').create();
			if (adhesions.length > 0) {
				const { error } = await service
					.from('class_members')
					.insert(adhesions.map((a) => ({ ...a, student_id: profil.id })));
				expect(error).toBeNull();
			}
			return { id: profil.id, client: await clientFor(profil.email) };
		};

		const a = await eleve([
			{ class_id: classeQuittee, status: 'archived' },
			{ class_id: classeSansAnnee, status: 'archived' }
		]);
		archiveId = a.id;
		archive = a.client;

		// Le témoin : membre ACTIF de la classe quittée. Rien ne doit changer pour
		// lui. On le garde actif alors que la classe est close — c'est ce que la
		// série « élève archivé » avait déjà tranché : `c.is_active` compte.
		const b = await eleve([{ class_id: classeQuittee, status: 'active' }]);
		actif = b.client;

		const c = await eleve([]);
		etranger = c.client;

		const exercice = (await TestData.exercise(enseignantId).create()) as { id: string };
		exerciceId = exercice.id;

		const fiche = async (titre: string) =>
			insert('worksheets', {
				title: titre,
				type: 'worksheet',
				status: 'published',
				created_by: enseignantId
			});

		ficheId = await fiche('Fiche de juin ZZ');
		await insert('worksheet_exercises', {
			worksheet_id: ficheId,
			exercise_id: exerciceId,
			position: 1
		});
		ficheHorsAnnee = await fiche('Fiche distribuée après la fin ZZ');
		ficheSansAnnee = await fiche('Fiche de la classe sans année ZZ');
		ficheEtrangere = await fiche('Fiche d’une classe étrangère ZZ');

		const affectation = async (worksheet: string, disponible: string, classeCible: string) => {
			const id = await insert('worksheet_assignments', {
				worksheet_id: worksheet,
				status: 'active',
				available_from: disponible,
				created_by: enseignantId
			});
			const { error } = await service
				.from('worksheet_assignment_classes')
				.insert({ assignment_id: id, class_id: classeCible });
			expect(error).toBeNull();
			return id;
		};

		affectationDansAnnee = await affectation(ficheId, '2026-03-15T08:00:00Z', classeQuittee);
		// Après le 30 juin : l'élève avait déjà quitté la classe.
		affectationHorsAnnee = await affectation(ficheHorsAnnee, '2026-07-20T08:00:00Z', classeQuittee);
		await affectation(ficheSansAnnee, '2026-03-15T08:00:00Z', classeSansAnnee);
		await affectation(ficheEtrangere, '2026-03-15T08:00:00Z', classeEtrangere);
	});

	afterAll(async () => {
		await service.from('schools').delete().eq('id', ecole);
		await cleanupAllTestData();
	});

	async function litLaFiche(client: SupabaseClient<Database>, worksheet: string): Promise<boolean> {
		const { data, error } = await client.rpc('student_has_worksheet_access', {
			p_worksheet_id: worksheet
		});
		expect(error).toBeNull();
		return data === true;
	}

	async function affectationsVisibles(client: SupabaseClient<Database>): Promise<string[]> {
		const { data, error } = await client.from('worksheet_assignments').select('id');
		expect(error).toBeNull();
		return (data ?? []).map((r) => r.id);
	}

	describe('le cas nominal : relire ce qui a été distribué', () => {
		it('l’ancien membre relit la fiche de son année', async () => {
			expect(await litLaFiche(archive, ficheId)).toBe(true);
		});

		it('il retrouve l’affectation dans sa liste', async () => {
			expect(await affectationsVisibles(archive)).toContain(affectationDansAnnee);
		});

		it('il atteint le contenu, pas seulement l’en-tête', async () => {
			// `student_has_exercise_access` délègue à la vérification de fiche : sans
			// lui, la page s'ouvrirait sur un énoncé vide.
			const { data, error } = await archive.rpc('student_has_exercise_access', {
				p_exercise_id: exerciceId
			});
			expect(error).toBeNull();
			expect(data).toBe(true);
		});

		it('le pendant lecture de can_access_assignment l’autorise', async () => {
			const { data, error } = await archive.rpc('can_read_assignment', {
				p_assignment_id: affectationDansAnnee
			});
			expect(error).toBeNull();
			expect(data).toBe(true);
		});
	});

	describe('la lecture n’ouvre aucune écriture', () => {
		it('can_access_assignment lui reste fermée', async () => {
			// C'est elle qui garde les écritures. Si elle s'ouvrait, le signalement
			// d'erreur et les corrections s'ouvriraient avec.
			const { data, error } = await archive.rpc('can_access_assignment', {
				p_assignment_id: affectationDansAnnee
			});
			expect(error).toBeNull();
			expect(data).toBe(false);
		});

		it('il ne peut pas déposer de signalement d’erreur', async () => {
			const { data: exercicesFiche } = await service
				.from('worksheet_exercises')
				.select('id')
				.eq('worksheet_id', ficheId)
				.limit(1);
			const worksheetExerciseId = (exercicesFiche ?? [])[0]?.id;
			expect(worksheetExerciseId).toBeTruthy();

			const { error } = await archive.from('worksheet_error_reports').insert({
				assignment_id: affectationDansAnnee,
				worksheet_exercise_id: worksheetExerciseId as string,
				student_id: archiveId,
				description: 'Tentative d’écriture depuis une adhésion archivée ZZ'
			});
			// Refus par la policy, pas par une panne : le code doit être celui d'une
			// violation de RLS.
			expect(error?.code).toBe('42501');
		});
	});

	describe('les bornes', () => {
		it('une fiche distribuée après la fin de l’année reste fermée', async () => {
			expect(await litLaFiche(archive, ficheHorsAnnee)).toBe(false);
			expect(await affectationsVisibles(archive)).not.toContain(affectationHorsAnnee);
		});

		it('une classe sans année rattachée n’ouvre rien', async () => {
			// Repli fermé : faute de fenêtre, on ne sait pas borner, donc on refuse.
			expect(await litLaFiche(archive, ficheSansAnnee)).toBe(false);
		});

		it('une classe dont il n’a jamais été membre ne lui ouvre rien', async () => {
			expect(await litLaFiche(archive, ficheEtrangere)).toBe(false);
		});

		it('un élève sans aucune adhésion ne lit rien', async () => {
			expect(await litLaFiche(etranger, ficheId)).toBe(false);
			expect(await affectationsVisibles(etranger)).toHaveLength(0);
		});
	});

	describe('le témoin : le membre actif d’une classe close', () => {
		it('reste fermé, comme la série « élève archivé » l’a tranché', async () => {
			// `c.is_active = false` : la classe est close. L'adhésion active ne suffit
			// pas. Ce test garde l'acquis — la lecture rétroactive ne doit pas
			// rouvrir ce chemin-là par un effet de bord.
			const { data, error } = await actif.rpc('can_access_assignment', {
				p_assignment_id: affectationDansAnnee
			});
			expect(error).toBeNull();
			expect(data).toBe(false);
		});
	});
});
