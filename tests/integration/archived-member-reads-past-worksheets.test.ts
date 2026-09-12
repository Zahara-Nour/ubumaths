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
 * CORRECTIF (20260914180000). L'audit a trouvé deux trous :
 *
 *   - `can_read_assignment` ne vérifiait ni le statut de l'affectation ni sa
 *     disponibilité, alors que les deux autres chemins de lecture le font. Un
 *     ancien membre pouvait donc relire un BROUILLON ou une fiche programmée
 *     pour plus tard — que personne n'a jamais reçue ;
 *   - la borne BASSE manquait. `class_members` ne date pas l'archivage, mais
 *     porte bien `joined_at` : un élève arrivé en mai relisait ce que la classe
 *     avait reçu depuis septembre.
 *
 * SUITE (20260914200000), deux décisions de David :
 *   - « ancien membre » = adhésion archivée OU classe fermée. L'égalité sur
 *     `status = 'archived'` rendait le membre resté ACTIF d'une classe fermée
 *     plus mal loti que l'archivé de la même classe ;
 *   - la relecture s'éteint douze mois après la fin de l'année. Sans borne
 *     haute, la conservation jusqu'à la purge (2031) devenait un accès
 *     permanent.
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

/**
 * TOUTES les dates sont relatives à aujourd'hui, et c'est délibéré.
 *
 * Avec des littérales, cette suite vieillissait mal dans les deux sens : les
 * tests nominaux seraient devenus rouges le jour où l'année de référence
 * sortirait de la fenêtre de douze mois, et — bien pire — le test « pas encore
 * disponible » serait devenu VERT POUR LA MAUVAISE RAISON le jour où
 * « demain » sortirait de l'année dite en cours, la borne d'année refusant
 * alors à la place de la borne de disponibilité.
 */
const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const instant = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

/** L'année de la classe quittée : close il y a 3 mois, donc encore relisible. */
const ANNEE_DEBUT = jour(-395);
const ANNEE_FIN = jour(-90);

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
	/**
	 * Une classe d'une année terminée depuis PLUS de douze mois : la relecture
	 * doit s'y être éteinte.
	 */
	let classeAnneeEteinte: string;
	/** Distribuée dans cette année-là, donc hors de portée aujourd'hui. */
	let ficheAnneeEteinte: string;
	/**
	 * Une classe d'une année EN COURS. Elle sert à éprouver la garde de
	 * disponibilité seule : dans l'année close, une fiche « pas encore
	 * disponible » sortirait déjà de la fenêtre, et le test passerait pour la
	 * mauvaise raison.
	 */
	let classeAnneeEnCours: string;
	/** Classe désactivée à la main, année encore en cours, adhésion ACTIVE. */
	let classeFermeeEnPleineAnnee: string;
	/** Distribuée à cette classe, pendant l'année qui court. */
	let ficheFermeeEnPleineAnnee: string;
	/** L'élève resté actif dans cette classe fermée. */
	let membreActifClasseFermee: SupabaseClient<Database>;

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
	/** En brouillon : personne ne l'a jamais reçue. */
	let affectationBrouillon: string;
	/** Programmée pour plus tard : personne ne l'a encore reçue. */
	let affectationFuture: string;

	/** Archivé, mais arrivé APRÈS la distribution : il ne l'a jamais reçue. */
	let tardif: SupabaseClient<Database>;

	let archive: SupabaseClient<Database>;
	let archiveId: string;
	let actif: SupabaseClient<Database>;
	let actifId: string;
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
			name: 'Année récemment close ZZ',
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

		// Une année révolue depuis plus de douze mois : la relecture s'y est éteinte.
		const anneeEteinte = await insert('school_years', {
			school_id: ecole,
			name: 'Année révolue ZZ',
			start_date: jour(-760),
			end_date: jour(-455),
			is_active: false
		});

		// Une année EN COURS, pour éprouver la disponibilité sans que la borne
		// d'année ne refuse à sa place.
		const anneeEnCours = await insert('school_years', {
			school_id: ecole,
			name: 'Année en cours ZZ',
			start_date: jour(-30),
			end_date: jour(300),
			is_active: true
		});

		classeQuittee = await classe('2DE quittée ZZ', true);
		classeSansAnnee = await classe('2DE sans année ZZ', false);
		classeEtrangere = await classe('2DE étrangère ZZ', true);
		classeAnneeEteinte = await insert('classes', {
			name: '3E année éteinte ZZ',
			school_id: ecole,
			school_year_id: anneeEteinte,
			join_code: 'ZZR901',
			is_active: false
		});
		classeAnneeEnCours = await insert('classes', {
			name: '1SPE année en cours ZZ',
			school_id: ecole,
			school_year_id: anneeEnCours,
			join_code: 'ZZR900',
			is_active: false
		});
		// Le scénario réellement observé à Voltaire : la classe a été désactivée
		// à la main, l'année court encore, et les adhésions n'ont PAS été
		// archivées — c'est précisément ce que `or not c.is_active` rattrape.
		classeFermeeEnPleineAnnee = await insert('classes', {
			name: '2DE fermée en pleine année ZZ',
			school_id: ecole,
			school_year_id: anneeEnCours,
			join_code: 'ZZR902',
			is_active: false
		});

		// `joined_at` par défaut vaut `now()`. En laisser le défaut daterait
		// l'arrivée d'aujourd'hui, donc APRÈS toutes les fiches de l'année
		// écoulée — la borne basse refuserait tout, et les tests nominaux
		// mentiraient. En production ce champ est renseigné : les adhésions de
		// Voltaire s'échelonnent d'octobre 2025 à février 2026.
		const eleve = async (adhesions: { class_id: string; status: string }[]) => {
			const profil = await TestData.profile().withRole('student').create();
			if (adhesions.length > 0) {
				const { error } = await service.from('class_members').insert(
					adhesions.map((a) => ({
						...a,
						student_id: profil.id,
						// Avant toute distribution des fixtures, année révolue comprise.
						joined_at: instant(-800)
					}))
				);
				expect(error).toBeNull();
			}
			return { id: profil.id, client: await clientFor(profil.email) };
		};

		const a = await eleve([
			{ class_id: classeQuittee, status: 'archived' },
			{ class_id: classeSansAnnee, status: 'archived' },
			{ class_id: classeAnneeEnCours, status: 'archived' },
			{ class_id: classeAnneeEteinte, status: 'archived' }
		]);
		archiveId = a.id;
		archive = a.client;

		// Le témoin : membre ACTIF de la classe quittée. Rien ne doit changer pour
		// lui. On le garde actif alors que la classe est close — c'est ce que la
		// série « élève archivé » avait déjà tranché : `c.is_active` compte.
		const b = await eleve([{ class_id: classeQuittee, status: 'active' }]);
		actifId = b.id;
		actif = b.client;

		// Le scénario Voltaire : adhésion restée ACTIVE dans une classe fermée
		// dont l'année court encore.
		const e = await TestData.profile().withRole('student').create();
		{
			const { error } = await service.from('class_members').insert({
				class_id: classeFermeeEnPleineAnnee,
				student_id: e.id,
				status: 'active',
				joined_at: instant(-25)
			});
			expect(error).toBeNull();
		}
		membreActifClasseFermee = await clientFor(e.email);

		const c = await eleve([]);
		etranger = c.client;

		// Arrivé APRÈS la fiche nominale : il ne l'a jamais reçue.
		const d = await TestData.profile().withRole('student').create();
		{
			const { error } = await service.from('class_members').insert({
				class_id: classeQuittee,
				student_id: d.id,
				status: 'archived',
				joined_at: instant(-150)
			});
			expect(error).toBeNull();
		}
		tardif = await clientFor(d.email);

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
		ficheAnneeEteinte = await fiche('Fiche d’une année révolue ZZ');
		ficheFermeeEnPleineAnnee = await fiche('Fiche d’une classe fermée en pleine année ZZ');

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

		affectationDansAnnee = await affectation(ficheId, instant(-200), classeQuittee);
		// Après la fin de l'année, mais déjà disponible : seule la borne d'année
		// peut la refuser.
		affectationHorsAnnee = await affectation(ficheHorsAnnee, instant(-30), classeQuittee);
		await affectation(ficheSansAnnee, instant(-200), classeSansAnnee);
		await affectation(ficheEtrangere, instant(-200), classeEtrangere);
		await affectation(ficheFermeeEnPleineAnnee, instant(-10), classeFermeeEnPleineAnnee);
		// Dans la fenêtre de son année, mais cette année s'est terminée il y a
		// plus de douze mois : seule la borne d'extinction peut la refuser.
		await affectation(ficheAnneeEteinte, instant(-500), classeAnneeEteinte);

		// Un brouillon et une fiche programmée, tous deux dans la fenêtre de
		// l'année : seul leur statut ou leur mise à disposition les distingue de
		// la fiche nominale.
		const brouillon = await fiche('Brouillon jamais distribué ZZ');
		affectationBrouillon = await insert('worksheet_assignments', {
			worksheet_id: brouillon,
			status: 'draft',
			available_from: instant(-200),
			created_by: enseignantId
		});
		{
			const { error } = await service
				.from('worksheet_assignment_classes')
				.insert({ assignment_id: affectationBrouillon, class_id: classeQuittee });
			expect(error).toBeNull();
		}

		// Demain tombe DANS l'année en cours : seule la garde de disponibilité
		// peut la refuser. Rattachée à l'année close, elle serait déjà hors
		// fenêtre, et le test ne prouverait rien.
		const future = await fiche('Fiche programmée plus tard ZZ');
		const demain = instant(1);
		affectationFuture = await insert('worksheet_assignments', {
			worksheet_id: future,
			status: 'active',
			available_from: demain,
			created_by: enseignantId
		});
		{
			const { error } = await service
				.from('worksheet_assignment_classes')
				.insert({ assignment_id: affectationFuture, class_id: classeAnneeEnCours });
			expect(error).toBeNull();
		}
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
			// Assertion RELATIVE aux fixtures : `toHaveLength(0)` affirmerait une
			// absence globale et virerait rouge dès qu'une autre suite laisse une
			// ligne derrière elle.
			expect(await litLaFiche(etranger, ficheId)).toBe(false);
			expect(await affectationsVisibles(etranger)).not.toContain(affectationDansAnnee);
		});
	});

	describe('les gardes de can_read_assignment', () => {
		async function relit(client: SupabaseClient<Database>, affectation: string) {
			const { data, error } = await client.rpc('can_read_assignment', {
				p_assignment_id: affectation
			});
			expect(error).toBeNull();
			return data === true;
		}

		it('relit bien l’affectation qui a été distribuée', async () => {
			expect(await relit(archive, affectationDansAnnee)).toBe(true);
		});

		it('ne relit pas une affectation en brouillon', async () => {
			// Personne ne l'a jamais reçue. `student_has_worksheet_access` le
			// vérifiait déjà ; `can_read_assignment` l'omettait.
			expect(await relit(archive, affectationBrouillon)).toBe(false);
		});

		it('ne relit pas une affectation pas encore disponible', async () => {
			expect(await relit(archive, affectationFuture)).toBe(false);
		});
	});

	describe('la borne basse : le séjour de l’élève dans la classe', () => {
		it('ne relit pas une fiche distribuée avant son arrivée', async () => {
			// Arrivé le 1er juin, la fiche date du 15 mars. « Relire ce qui lui
			// AVAIT ÉTÉ DISTRIBUÉ » ne peut pas vouloir dire « relire ce que la
			// classe avait reçu avant lui ».
			expect(await litLaFiche(tardif, ficheId)).toBe(false);
		});
	});

	describe('le membre ACTIF d’une classe close', () => {
		it('relit comme l’archivé : « ancien membre » couvre les deux', async () => {
			// L'asymétrie est levée. La clôture d'année archive les adhésions, mais
			// une classe désactivée à la main n'en archive aucune — et ces élèves
			// tombaient alors dans un trou : ni accès courant, ni accès rétroactif.
			expect(await litLaFiche(actif, ficheId)).toBe(true);
		});

		it('n’y gagne aucune écriture pour autant', async () => {
			// Une VRAIE tentative d'INSERT, comme pour l'archivé, et non un simple
			// `can_access_assignment` à false : cette fonction avale ses exceptions
			// (`when others then return false`), donc un `false` ne distingue pas
			// le refus de la panne. C'est cette population que la migration fait
			// entrer ; sa preuve doit être de même qualité.
			const { data: exercicesFiche } = await service
				.from('worksheet_exercises')
				.select('id')
				.eq('worksheet_id', ficheId)
				.limit(1);
			const worksheetExerciseId = (exercicesFiche ?? [])[0]?.id;
			expect(worksheetExerciseId).toBeTruthy();

			const { error } = await actif.from('worksheet_error_reports').insert({
				assignment_id: affectationDansAnnee,
				worksheet_exercise_id: worksheetExerciseId as string,
				student_id: actifId,
				description: 'Tentative d’écriture depuis une classe fermée ZZ'
			});
			expect(error?.code).toBe('42501');
		});
	});

	describe('le scénario observé à Voltaire', () => {
		it('classe désactivée à la main, année en cours, adhésion restée active : il relit', async () => {
			// C'est le cas qui a motivé `or not c.is_active`. Avant, cet élève
			// tombait dans un trou : pas d'accès courant (la classe est fermée),
			// pas d'accès rétroactif (son adhésion n'est pas archivée).
			expect(await litLaFiche(membreActifClasseFermee, ficheFermeeEnPleineAnnee)).toBe(true);
		});

		it('sans y gagner la moindre écriture', async () => {
			const { data, error } = await membreActifClasseFermee.rpc('can_access_assignment', {
				p_assignment_id: affectationDansAnnee
			});
			expect(error).toBeNull();
			expect(data).toBe(false);
		});
	});

	describe('l’extinction : douze mois après la fin de l’année', () => {
		it('ne relit plus une fiche d’une année révolue depuis plus d’un an', async () => {
			// Conserver et donner accès sont deux décisions distinctes : les
			// comptes vivent jusqu'en 2031, la relecture non.
			expect(await litLaFiche(archive, ficheAnneeEteinte)).toBe(false);
		});

		it('relit encore celle de l’année qui vient de s’achever', async () => {
			// Le contrôle de la borne : sans lui, le test ci-dessus passerait aussi
			// avec une extinction beaucoup trop agressive.
			expect(await litLaFiche(archive, ficheId)).toBe(true);
		});
	});
});
