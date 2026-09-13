/**
 * Un élève qui a quitté la classe ne reçoit plus (base locale requise)
 * ====================================================================
 *
 * La relecture rétroactive existe exprès : un élève parti en cours d'année doit
 * pouvoir relire ce qu'on lui avait donné. Mais elle n'était bornée que par le
 * bas — « distribué après son arrivée » — et pas par le haut, faute de savoir
 * QUAND il était parti.
 *
 * Conséquence : un élève archivé en décembre continuait de recevoir les fiches
 * distribuées en mars. Tranché par David le 2026-09-13 : **non**.
 *
 * COMMENT ON SAIT QUE CE TEST PROUVE QUELQUE CHOSE. Deux observations, pas une :
 *
 * 1. avant que la migration n'existe, l'assertion « ne reçoit PAS après son
 *    départ » a été vue ÉCHOUER contre la vraie base — l'élève archivé voyait
 *    bien la fiche distribuée après son départ. Le défaut est constaté, pas
 *    supposé ;
 * 2. le cas « une date de départ inconnue conserve la relecture d'avant »
 *    REPRODUIT ce comportement à volonté, sur la base migrée : mettre `left_at`
 *    à NULL suffit à faire réapparaître la fiche. C'est donc bien la borne, et
 *    elle seule, qui fait le travail.
 *
 * La seconde vaut mieux que de retirer la migration pour voir rougir : depuis
 * que l'ensemencement lit `left_at`, son absence ferait échouer la mise en
 * place et non l'assertion — un rouge qui n'apprendrait rien.
 *
 * `left_at` est posé par un TRIGGER, pas par les appelants : l'archivage se
 * fait depuis plusieurs endroits (admin, synchronisation Google, composition de
 * classe), et une colonne que chacun doit penser à écrire finit par être fausse.
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
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('un élève archivé ne reçoit plus les distributions suivantes', () => {
	let enseignantId: string;
	let classe: string;
	let membreId: string;
	let ficheAvant: string;
	let ficheApres: string;
	let dateDepart: string;
	let eleve: SupabaseClient<Database>;

	/**
	 * Distribue une fiche à la classe, à une date EXPLICITE.
	 *
	 * ⚠️ La date ne doit pas venir de l'horloge de Node : `left_at` et le garde
	 * `available_from <= now()` sont sur l'horloge de Postgres, et la dérive
	 * entre les deux se compte en centaines de millisecondes sous Docker. Un
	 * `new Date()` ferait passer le test « ne reçoit pas après son départ » pour
	 * la mauvaise raison — fiche invisible parce que pas encore ouverte, et non
	 * parce qu'elle est postérieure au départ.
	 */
	async function distribuer(titre: string, availableFrom: string): Promise<string> {
		const fiche = await insert('worksheets', {
			title: titre,
			type: 'worksheet',
			status: 'published',
			created_by: enseignantId
		});
		const affectation = await insert('worksheet_assignments', {
			worksheet_id: fiche,
			status: 'active',
			available_from: availableFrom,
			created_by: enseignantId
		});
		const { error } = await service
			.from('worksheet_assignment_classes')
			.insert({ assignment_id: affectation, class_id: classe });
		expect(error).toBeNull();
		return fiche;
	}

	/** Les fiches que l'élève peut réellement lire. */
	async function fichesLuesPar(client: SupabaseClient<Database>): Promise<string[]> {
		const { data, error } = await client.from('worksheets').select('id');
		expect(error, 'lecture élève en erreur').toBeNull();
		return ((data ?? []) as { id: string }[]).map((r) => r.id);
	}

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;

		const ecole = await insert('schools', {
			name: 'Lycée départ WW',
			city: 'Testville',
			country: 'France'
		});
		// Année EN COURS : c'est la fenêtre où le défaut se manifeste.
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année départ WW',
			start_date: new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE départ WW',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'WWDE01',
			is_active: true
		});

		const profil = await TestData.profile().withRole('student').create();
		membreId = await insert('class_members', {
			class_id: classe,
			student_id: profil.id,
			status: 'active',
			joined_at: new Date(Date.now() - 50 * 86_400_000).toISOString()
		});
		eleve = await clientFor(profil.email);

		// Il quitte la classe. Le trigger doit poser `left_at`.
		{
			const { error } = await service
				.from('class_members')
				.update({ status: 'archived' })
				.eq('id', membreId);
			expect(error).toBeNull();
		}

		// On relit la date posée par la BASE : c'est elle, et non l'horloge de
		// Node, qui sert de repère aux deux fiches.
		{
			const { data } = await service
				.from('class_members')
				.select('left_at')
				.eq('id', membreId)
				.single();
			dateDepart = data!.left_at!;
		}
		const depart = new Date(dateDepart).getTime();

		// Une veille du départ, une milliseconde après. Les deux sont déjà
		// ouvertes au moment de la lecture, donc seul `left_at` les départage.
		ficheAvant = await distribuer(
			'Fiche avant le départ WW',
			new Date(depart - 86_400_000).toISOString()
		);
		ficheApres = await distribuer('Fiche après le départ WW', new Date(depart + 1).toISOString());
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le trigger horodate le départ', async () => {
		const { data, error } = await service
			.from('class_members')
			.select('left_at')
			.eq('id', membreId)
			.single();

		expect(error).toBeNull();
		expect(data?.left_at).not.toBeNull();
	});

	it('il relit ce qu’on lui avait donné pendant qu’il était là', async () => {
		expect(await fichesLuesPar(eleve)).toContain(ficheAvant);
	});

	it('il ne reçoit PAS ce qui est distribué après son départ', async () => {
		expect(await fichesLuesPar(eleve)).not.toContain(ficheApres);
	});

	/**
	 * L'invariant dont la violation « rouvrirait l'accès » : une date de départ
	 * ne se repousse pas, quel que soit l'UPDATE ultérieur.
	 */
	it('une date de départ ne se repousse pas', async () => {
		const { error } = await service
			.from('class_members')
			.update({ left_at: new Date(Date.now() + 365 * 86_400_000).toISOString() })
			.eq('id', membreId);
		expect(error).toBeNull();

		const { data } = await service
			.from('class_members')
			.select('left_at')
			.eq('id', membreId)
			.single();
		expect(data?.left_at).toBe(dateDepart);
	});

	/**
	 * La promesse qui protège 77 adhésions réelles en production : `left_at`
	 * NULL veut dire « date de départ inconnue », donc comportement d'avant la
	 * migration. Si quelqu'un « améliorait » ça en `coalesce(left_at, joined_at)`,
	 * ces 77 élèves perdraient leur relecture en silence.
	 */
	it('une date de départ inconnue conserve la relecture d’avant', async () => {
		const { error } = await service
			.from('class_members')
			.update({ left_at: null })
			.eq('id', membreId);
		expect(error).toBeNull();

		const vues = await fichesLuesPar(eleve);
		expect(vues).toContain(ficheAvant);
		expect(vues).toContain(ficheApres);

		// On remet la date pour ne pas dépendre de l'ordre des tests.
		const { error: remiseError } = await service
			.from('class_members')
			.update({ left_at: dateDepart })
			.eq('id', membreId);
		expect(remiseError).toBeNull();
	});

	it('revenir dans la classe efface la date de départ', async () => {
		{
			const { error } = await service
				.from('class_members')
				.update({ status: 'active' })
				.eq('id', membreId);
			expect(error).toBeNull();
		}

		const { data } = await service
			.from('class_members')
			.select('left_at')
			.eq('id', membreId)
			.single();
		// Sinon un élève réintégré resterait bloqué sur son ancienne date de
		// départ et ne recevrait plus rien.
		expect(data?.left_at).toBeNull();

		expect(await fichesLuesPar(eleve)).toContain(ficheApres);
	});
});

/**
 * Le parcours réel, tel que David l'a tranché le 2026-09-13 :
 * « je veux garder la trace du passage ».
 *
 * Retirer un élève d'une classe l'ARCHIVE. Il relit ce qu'il a reçu pendant
 * son inscription — son classeur reste — mais ne reçoit rien de ce qui est
 * distribué ensuite. Et le ré-ajouter le réactive : sans ça, la contrainte
 * d'unicité (class_id, student_id) ferait échouer l'ajout et l'écran dirait
 * « déjà dans cette classe » d'un élève qui n'y est plus.
 */
describe('retirer un élève garde la trace de son passage', () => {
	let classe2: string;
	let membre2: string;
	let eleve2: SupabaseClient<Database>;
	let ficheRecue: string;
	let enseignant2: string;

	beforeAll(async () => {
		const prof = await TestData.profile().withRole('teacher').create();
		enseignant2 = prof.id;

		const ecole = await insert('schools', {
			name: 'Lycée retrait VV',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année retrait VV',
			start_date: new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe2 = await insert('classes', {
			name: '1SPE retrait VV',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'VVRE01',
			is_active: true
		});

		const profil = await TestData.profile().withRole('student').create();
		membre2 = await insert('class_members', {
			class_id: classe2,
			student_id: profil.id,
			status: 'active',
			joined_at: new Date(Date.now() - 50 * 86_400_000).toISOString()
		});
		eleve2 = await clientFor(profil.email);

		// Une fiche reçue pendant qu'il est inscrit.
		ficheRecue = await insert('worksheets', {
			title: 'Fiche reçue avant le retrait VV',
			type: 'worksheet',
			status: 'published',
			created_by: enseignant2
		});
		const affectation = await insert('worksheet_assignments', {
			worksheet_id: ficheRecue,
			status: 'active',
			available_from: new Date(Date.now() - 10 * 86_400_000).toISOString(),
			created_by: enseignant2
		});
		const { error } = await service
			.from('worksheet_assignment_classes')
			.insert({ assignment_id: affectation, class_id: classe2 });
		expect(error).toBeNull();
	}, 120_000);

	async function fiches(): Promise<string[]> {
		const { data, error } = await eleve2.from('worksheets').select('id');
		expect(error).toBeNull();
		return ((data ?? []) as { id: string }[]).map((r) => r.id);
	}

	it('inscrit, il voit la fiche', async () => {
		expect(await fiches()).toContain(ficheRecue);
	});

	it('retiré (archivé), il garde son classeur', async () => {
		const { error } = await service
			.from('class_members')
			.update({ status: 'archived' })
			.eq('id', membre2);
		expect(error).toBeNull();

		// Le cœur de la décision : il relit ce qu'on lui avait donné.
		expect(await fiches()).toContain(ficheRecue);
	});

	it('mais ne reçoit pas ce qui est distribué après son retrait', async () => {
		const { data: membre } = await service
			.from('class_members')
			.select('left_at')
			.eq('id', membre2)
			.single();

		const ficheApresRetrait = await insert('worksheets', {
			title: 'Fiche après le retrait VV',
			type: 'worksheet',
			status: 'published',
			created_by: enseignant2
		});
		const affectation = await insert('worksheet_assignments', {
			worksheet_id: ficheApresRetrait,
			status: 'active',
			available_from: new Date(new Date(membre!.left_at!).getTime() + 1).toISOString(),
			created_by: enseignant2
		});
		const { error } = await service
			.from('worksheet_assignment_classes')
			.insert({ assignment_id: affectation, class_id: classe2 });
		expect(error).toBeNull();

		expect(await fiches()).not.toContain(ficheApresRetrait);
	});

	it('le ré-ajouter le réactive, sans se heurter à l’unicité', async () => {
		const { error } = await service
			.from('class_members')
			.update({ status: 'active' })
			.eq('id', membre2);
		expect(error).toBeNull();

		const { data } = await service
			.from('class_members')
			.select('status, left_at')
			.eq('id', membre2)
			.single();
		expect(data?.status).toBe('active');
		expect(data?.left_at).toBeNull();
	});
});
