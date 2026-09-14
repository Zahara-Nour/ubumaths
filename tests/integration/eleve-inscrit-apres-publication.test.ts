/**
 * Un élève qui s'inscrit APRÈS la publication (base locale requise)
 * =================================================================
 *
 * Question du professeur : quand de nouveaux élèves rejoindront la classe,
 * faudra-t-il « redéployer » les fiches déjà publiées dans le chapitre ?
 *
 * Non — et c'est un choix d'architecture, pas un hasard :
 * `student_has_worksheet_access` part de l'affectation et rejoint
 * `class_members`. L'accès est donc *dérivé* de l'appartenance à la classe, à
 * chaque lecture. Rien n'est distribué élève par élève, donc il n'y a rien à
 * redistribuer.
 *
 * Ce test ne protège pas une fonctionnalité nouvelle : il fige ce
 * comportement, pour que personne ne le remplace un jour par une distribution
 * matérialisée (une ligne par élève) sans voir ce qui casse — les élèves
 * arrivés après la publication perdraient silencieusement leurs fiches.
 *
 * Le point de bascule est mesuré des deux côtés : la MÊME session élève lit le
 * chapitre avant son inscription, puis après. Seule l'appartenance change.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien : la fonction sort par
 * `false` sans jamais exercer la jointure.
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

/** Les fiches du chapitre telles que l'élève les voit, par `worksheet_id`. */
async function fichesVuesPar(
	client: SupabaseClient<Database>,
	chapitre: string
): Promise<string[]> {
	const { data, error } = await client
		.from('chapter_worksheets')
		.select('worksheet_id')
		.eq('chapter_id', chapitre);
	expect(error, 'lecture élève de chapter_worksheets en erreur').toBeNull();
	return (data ?? []).map((r) => r.worksheet_id);
}

describe('fiches d’un chapitre — l’élève inscrit après la publication', () => {
	let classe: string;
	let chapitre: string;
	let ficheDistribuee: string;
	let ficheNonDistribuee: string;
	let affectation: string;

	let eleveId: string;
	let eleve: SupabaseClient<Database>;
	/** Relevé pris avant l'inscription : l'autre moitié de la preuve. */
	let vuesAvantInscription: string[];

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();

		const ecole = await insert('schools', {
			name: 'Lycée inscription YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année inscription YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE inscription YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYIN01',
			is_active: true
		});

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre inscription YY',
			display_order: 1,
			is_visible: true
		});

		const fiche = async (titre: string) =>
			insert('worksheets', {
				title: titre,
				type: 'worksheet',
				status: 'published',
				created_by: enseignant.id
			});

		// Une fiche distribuée à la classe, et une seulement rangée dans le
		// chapitre : le témoin. Sans lui, un test vert pourrait n'être qu'un
		// accès trop large accordé à tout membre de la classe.
		ficheDistribuee = await fiche('Fiche distribuée avant inscription YY');
		ficheNonDistribuee = await fiche('Fiche rangée, jamais distribuée YY');

		// L'affectation vise la CLASSE — c'est cette table que
		// `student_has_worksheet_access` rejoint à `class_members`.
		affectation = await insert('worksheet_assignments', {
			worksheet_id: ficheDistribuee,
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

		await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheDistribuee,
			display_order: 1,
			published_at: PUBLIE
		});
		await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheNonDistribuee,
			display_order: 2,
			published_at: PUBLIE
		});

		// Tout est publié et distribué AVANT que l'élève n'existe : c'est
		// exactement la situation du professeur.
		const profil = await TestData.profile().withRole('student').create();
		eleveId = profil.id;
		eleve = await clientFor(profil.email);

		vuesAvantInscription = await fichesVuesPar(eleve, chapitre);

		// L'inscription arrive ICI, après coup. Aucune autre écriture ne suit :
		// pas de recopie de l'affectation, pas d'instance pré-générée.
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classe, student_id: eleveId, status: 'active' });
		expect(error).toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('ne voyait rien tant qu’il n’était pas dans la classe', () => {
		expect(vuesAvantInscription).toEqual([]);
	});

	it('voit la fiche dès son inscription, sans rien redistribuer', async () => {
		expect(await fichesVuesPar(eleve, chapitre)).toContain(ficheDistribuee);
	});

	// La seconde garde tient malgré tout : être dans la classe ne donne pas
	// accès à ce qui n'a pas été distribué.
	it('ne voit pas la fiche seulement rangée dans le chapitre', async () => {
		expect(await fichesVuesPar(eleve, chapitre)).not.toContain(ficheNonDistribuee);
	});

	/**
	 * La fiche apparaît dans le chapitre, mais l'élève l'ouvre par son
	 * affectation (`/api/student/worksheets/[assignmentId]`) : si cette lecture
	 * échouait, la fiche serait visible et inaccessible.
	 */
	it('peut ouvrir l’affectation et la fiche elle-même', async () => {
		const { data: affectationVue, error: erreurAffectation } = await eleve
			.from('worksheet_assignments')
			.select('id')
			.eq('id', affectation);
		expect(erreurAffectation).toBeNull();
		expect(affectationVue?.map((r) => r.id)).toEqual([affectation]);

		const { data: ficheVue, error: erreurFiche } = await eleve
			.from('worksheets')
			.select('id')
			.eq('id', ficheDistribuee);
		expect(erreurFiche).toBeNull();
		expect(ficheVue?.map((r) => r.id)).toEqual([ficheDistribuee]);
	});

	/**
	 * Le cœur de la réponse : l'accès est *dérivé*, jamais matérialisé. Aucune
	 * ligne nominative, aucune instance pré-générée — et pourtant les tests
	 * ci-dessus passent. C'est ce qui rend le redéploiement inutile.
	 */
	it('n’a ni affectation nominative, ni instance pré-générée', async () => {
		const { count: nominatives, error: erreurNominatives } = await service
			.from('worksheet_assignment_students')
			.select('*', { count: 'exact', head: true })
			.eq('student_id', eleveId);
		expect(erreurNominatives).toBeNull();

		const { count: instances, error: erreurInstances } = await service
			.from('worksheet_instances')
			.select('*', { count: 'exact', head: true })
			.eq('student_id', eleveId);
		expect(erreurInstances).toBeNull();

		expect(nominatives).toBe(0);
		expect(instances).toBe(0);
	});
});
