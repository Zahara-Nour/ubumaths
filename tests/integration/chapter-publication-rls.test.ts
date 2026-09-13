/**
 * Publication au fur et à mesure : préparé ≠ donné (base locale requise)
 * =====================================================================
 *
 * Un chapitre visible ne montre plus tout son contenu : chaque document,
 * exercice, objectif, question de quiz et fiche porte sa propre date de mise à
 * disposition. Tant qu'elle est `null`, l'élève ne doit RIEN en voir.
 *
 * L'invariant est négatif, donc invérifiable par l'interface : un contenu non
 * publié qui fuiterait ne se verrait nulle part dans l'application du
 * professeur. Seule une lecture faite AVEC LES DROITS DE L'ÉLÈVE le prouve —
 * d'où ce test d'intégration, et non un test unitaire à mocks.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien ici : le garde du
 * chapitre sort avant la condition de publication, et le test passerait au vert
 * sans jamais exercer ce qu'il prétend.
 *
 * Les fiches cumulent DEUX gardes : publiée dans le chapitre ET distribuée à
 * l'élève. Les deux derniers cas le prouvent séparément.
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
/** Programmé pour plus tard : doit rester invisible jusqu'à l'échéance. */
const PLUS_TARD = new Date(Date.now() + 86_400_000).toISOString();

/**
 * `cleanupAllTestData()` ne purge que ce qu'il connaît (les écoles de
 * « Testville », les profils de test) : `question_templates` survit à un run
 * interrompu, et son index unique (thème, domaine, sous-domaine, niveau) fait
 * alors échouer le suivant. On ensemence donc sous un discriminant propre à
 * l'exécution plutôt que de parier sur une base vierge.
 */
const RUN = `YY${Date.now().toString(36)}`;

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

/** Ce que l'élève voit réellement dans une table, par identifiant. */
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

describe('contenus de chapitre — préparé n’est pas donné', () => {
	let enseignantId: string;
	let classe: string;
	let chapitre: string;

	// Un exemplaire publié et un préparé pour chaque type de contenu.
	const publie: Record<string, string> = {};
	const prepare: Record<string, string> = {};
	/** Daté dans le futur : le cas que `is not null` aurait laissé passer. */
	const programme: Record<string, string> = {};

	/** Fiche publiée dans le chapitre ET distribuée : seul cas visible. */
	let lienFicheDonnee: string;
	/** Fiche publiée dans le chapitre mais JAMAIS distribuée. */
	let lienFicheNonDistribuee: string;
	/** Fiche distribuée mais pas encore publiée dans le chapitre. */
	let lienFicheNonPubliee: string;

	let eleve: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;

		const ecole = await insert('schools', {
			name: 'Lycée publication YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année publication YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE publication YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYPU01',
			is_active: true
		});

		const profil = await TestData.profile().withRole('student').create();
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: profil.id, status: 'active' });
			expect(error).toBeNull();
		}
		eleve = await clientFor(profil.email);

		// Le chapitre est VISIBLE : c'est bien la publication de chaque contenu
		// que le test exerce, et rien d'autre.
		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre visible publication YY',
			display_order: 1,
			is_visible: true
		});

		// --- Documents -------------------------------------------------------
		const document = async (titre: string, publishedAt: string | null) =>
			insert('chapter_documents', {
				chapter_id: chapitre,
				title: titre,
				source_type: 'google_drive',
				google_drive_url: 'https://example.invalid/doc',
				display_order: 1,
				published_at: publishedAt
			});
		publie.documents = await document('Document donné YY', PUBLIE);
		prepare.documents = await document('Document préparé YY', null);
		programme.documents = await document('Document programmé YY', PLUS_TARD);

		// --- Objectifs -------------------------------------------------------
		const objectif = async (contenu: string, publishedAt: string | null) =>
			insert('chapter_checklist_items', {
				chapter_id: chapitre,
				content: contenu,
				display_order: 1,
				published_at: publishedAt
			});
		publie.checklist = await objectif('Objectif donné YY', PUBLIE);
		prepare.checklist = await objectif('Objectif préparé YY', null);

		// --- Exercices -------------------------------------------------------
		const exercice = async (titre: string, publishedAt: string | null) => {
			const ex = await insert('exercises', {
				title: titre,
				created_by: enseignantId,
				grades: ['1_SPE'],
				topic: 'Publication YY',
				category: 'application'
			});
			return insert('chapter_exercises', {
				chapter_id: chapitre,
				exercise_id: ex,
				display_order: 1,
				published_at: publishedAt
			});
		};
		publie.exercises = await exercice('Exercice donné YY', PUBLIE);
		prepare.exercises = await exercice('Exercice préparé YY', null);

		// --- Questions de quiz ----------------------------------------------
		// `idx_question_templates_unique_category` interdit deux modèles sur le
		// même (thème, domaine, sous-domaine, niveau) : d'où un niveau par modèle.
		const question = async (titre: string, niveau: number, publishedAt: string | null) => {
			const modele = await insert('question_templates', {
				title: titre,
				type: 'multiple_choice',
				theme: `Publication ${RUN}`,
				domain: 'Publication',
				level: niveau,
				grades: ['1_SPE'],
				status: 'published',
				variations: [{ statement: 'Question de test YY [_]', blanks: [{ expectedAnswer: '1' }] }],
				created_by: enseignantId
			});
			return insert('chapter_quiz_questions', {
				chapter_id: chapitre,
				question_template_id: modele,
				display_order: 1,
				published_at: publishedAt
			});
		};
		publie.quiz = await question('Question donnée YY', 1, PUBLIE);
		prepare.quiz = await question('Question préparée YY', 2, null);

		// --- Fiches : deux gardes, donc trois cas ----------------------------
		const fiche = async (titre: string) =>
			insert('worksheets', {
				title: titre,
				type: 'worksheet',
				status: 'published',
				created_by: enseignantId
			});

		const distribuer = async (worksheetId: string) => {
			const affectation = await insert('worksheet_assignments', {
				worksheet_id: worksheetId,
				status: 'active',
				available_from: new Date(Date.now() - 86_400_000).toISOString(),
				created_by: enseignantId
			});
			const { error } = await service
				.from('worksheet_assignment_classes')
				.insert({ assignment_id: affectation, class_id: classe });
			expect(error).toBeNull();
		};

		const ficheDonnee = await fiche('Fiche publiée et distribuée YY');
		await distribuer(ficheDonnee);
		lienFicheDonnee = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheDonnee,
			display_order: 1,
			published_at: PUBLIE
		});

		const ficheNonDistribuee = await fiche('Fiche publiée, jamais distribuée YY');
		lienFicheNonDistribuee = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheNonDistribuee,
			display_order: 2,
			published_at: PUBLIE
		});

		const ficheNonPubliee = await fiche('Fiche distribuée, pas encore publiée YY');
		await distribuer(ficheNonPubliee);
		lienFicheNonPubliee = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheNonPubliee,
			display_order: 3,
			published_at: null
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it.each([
		['chapter_documents', 'documents'],
		['chapter_checklist_items', 'checklist'],
		['chapter_exercises', 'exercises'],
		['chapter_quiz_questions', 'quiz']
	])('%s : l’élève voit le publié et seulement lui', async (table, cle) => {
		const vus = await idsVusPar(eleve, table, chapitre);

		expect(vus).toContain(publie[cle]);
		expect(vus).not.toContain(prepare[cle]);
	});

	it('une fiche publiée ET distribuée est visible', async () => {
		const vus = await idsVusPar(eleve, 'chapter_worksheets', chapitre);
		expect(vus).toContain(lienFicheDonnee);
	});

	it('publier une fiche sans la distribuer ne la montre pas', async () => {
		const vus = await idsVusPar(eleve, 'chapter_worksheets', chapitre);
		expect(vus).not.toContain(lienFicheNonDistribuee);
	});

	it('distribuer une fiche sans la publier ne la montre pas dans le chapitre', async () => {
		const vus = await idsVusPar(eleve, 'chapter_worksheets', chapitre);
		expect(vus).not.toContain(lienFicheNonPubliee);
	});

	/**
	 * Le piège que `published_at is not null` aurait laissé ouvert : programmer
	 * une publication pour demain l'aurait rendue lisible AUJOURD'HUI. Sur des
	 * questions de quiz, c'est le sujet du contrôle qui fuit. D'où `<= now()`
	 * dans les policies, et ce test pour que personne ne le « simplifie ».
	 */
	it('une date de publication future ne montre rien', async () => {
		const vus = await idsVusPar(eleve, 'chapter_documents', chapitre);
		expect(vus).not.toContain(programme.documents);
	});

	it('dépublier retire immédiatement le contenu de la vue élève', async () => {
		{
			const { error } = await service
				.from('chapter_documents')
				.update({ published_at: null })
				.eq('id', publie.documents);
			expect(error).toBeNull();
		}

		try {
			const vus = await idsVusPar(eleve, 'chapter_documents', chapitre);
			expect(vus).not.toContain(publie.documents);
		} finally {
			// `finally` : une assertion en échec ne doit pas laisser le document
			// dépublié pour un test ajouté derrière celui-ci.
			const { error } = await service
				.from('chapter_documents')
				.update({ published_at: PUBLIE })
				.eq('id', publie.documents);
			expect(error).toBeNull();
		}
	});
});
