/**
 * « Mon cours » partageable par lien (nécessite une base locale)
 * ==============================================================
 *
 * Migration : 20261016100300_class_course_share_tokens.sql
 *
 * Le lien rend le cours d'une classe lisible SANS COMPTE. Comme pour le cahier
 * de texte (class-journal-share-token.test.ts), ces tests portent surtout sur
 * « qu'est-ce que ça n'ouvre pas » :
 *
 *  - un jeton valide donne le plan et les contenus PUBLIÉS (date passée) des
 *    chapitres VISIBLES — ni contenu préparé ou programmé, ni chapitre masqué,
 *    ni fiche publiée mais non distribuée, ni exercice, ni progression, ni
 *    `join_code`, ni `storage_path` ;
 *  - révoqué, expiré, inexistant, classe archivée : la MÊME réponse (null) ;
 *  - le jeton du CAHIER n'ouvre rien ici ; le jeton d'une classe n'ouvre pas
 *    les contenus d'une autre ;
 *  - `anon` ne lit ni la table des jetons ni les tables de chapitre ;
 *  - un élève connecté ne crée ni ne désactive de jeton (relu en service role :
 *    la RLS échoue en silence).
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null`.
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

/** Un client anon sans session — exactement ce dont dispose une famille avec le lien. */
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

// Jetons en dur, 16 à 64 caractères. Supprimés avant ET après : un run
// interrompu laisserait sinon une ligne qui ferait échouer le suivant.
const COURSE_A = 'CoursClasseAaaaaaaaa';
const COURSE_B = 'CoursClasseBbbbbbbbb';
const COURSE_C_EXPIRE = 'CoursClasseCexpireee';
const COURSE_A_REVOQUE = 'CoursClasseArevoquee';
const COURSE_PROF = 'CoursCreeParLeProfff';
const COURSE_ELEVE = 'CoursTenteParEleveee';
const JOURNAL_A = 'CahierClasseAaaaaaaa';
const TOUS_LES_JETONS_COURS = [
	COURSE_A,
	COURSE_B,
	COURSE_C_EXPIRE,
	COURSE_A_REVOQUE,
	COURSE_PROF,
	COURSE_ELEVE
];

const STORAGE_PATH = 'chapters/cours-partage/polycopie.pdf';

/** Accès non typé : la table et les RPC ne sont pas encore dans les types générés. */
type Loose = {
	from: (t: string) => {
		insert: (rows: unknown) => PromiseLike<{ error: { message: string } | null }>;
		delete: () => {
			in: (c: string, v: string[]) => PromiseLike<{ error: unknown }>;
		};
		select: (c: string) => {
			limit: (n: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
			eq: (c: string, v: string) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
		};
		update: (row: Record<string, unknown>) => {
			eq: (
				c: string,
				v: string
			) => {
				select: (c: string) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
			};
		};
	};
	rpc: (
		fn: string,
		args: Record<string, unknown>
	) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
};

const loose = (client: unknown) => client as unknown as Loose;

interface CoursePayload {
	class_name: string;
	class_grade: string | null;
	chapters: {
		id: string;
		title: string;
		sections: { id: string; title: string }[];
		documents: { id: string; title: string }[];
		worksheets: { id: string; worksheet_id: string; title: string }[];
		checklist_items: { id: string; content: string }[];
		series: { id: string; series_id: string; title: string; form: string }[];
	}[];
}

describe('« Mon cours » partageable par lien', () => {
	const service = createServiceRoleClient();
	let teacherId: string;
	let teacher: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let classA: string;
	let classB: string;
	let classC: string;
	/** Classe sans jeton : le prof peut y activer un lien sans heurter l'unicité. */
	let classD: string;

	// Identifiants des contenus, remplis au setup.
	const ids = {
		chapitreVisible: '',
		chapitreMasque: '',
		sectionPleine: '',
		sectionVide: '',
		docPublie: '',
		docDemain: '',
		docNull: '',
		docMasque: '',
		docB: '',
		ficheDistribuee: '',
		ficheNonDistribuee: '',
		ficheHorsChapitre: '',
		ficheMasquee: '',
		// Une fiche par garde : chacune ne viole QU'UNE condition.
		fichePreparee: '',
		ficheProgrammee: '',
		ficheAffectationBrouillon: '',
		ficheOuverteDemain: '',
		ficheDistribueeAuxB: '',
		ficheB: '',
		itemPublie: '',
		itemNull: '',
		seriePubliee: '',
		serieDemain: '',
		exercice: ''
	};
	const fiches: string[] = [];

	async function insert(table: string, row: Record<string, unknown>): Promise<string> {
		const { data, error } = await service
			.from(table as never)
			.insert(row as never)
			.select('id')
			.single();
		if (error) throw new Error(`${table} : ${error.message}`);
		return (data as { id: string }).id;
	}

	async function fiche(titre: string): Promise<string> {
		const id = await insert('worksheets', {
			title: titre,
			type: 'worksheet',
			status: 'published',
			created_by: teacherId
		});
		fiches.push(id);
		return id;
	}

	async function distribuer(
		ficheId: string,
		classe: string,
		affectation: { status?: string; available_from?: string } = {}
	): Promise<void> {
		const affectationId = await insert('worksheet_assignments', {
			worksheet_id: ficheId,
			status: affectation.status ?? 'active',
			available_from: affectation.available_from ?? null,
			created_by: teacherId
		});
		await insert('worksheet_assignment_classes', {
			assignment_id: affectationId,
			class_id: classe
		});
	}

	async function purgerJetons(): Promise<void> {
		await loose(service)
			.from('class_course_share_tokens')
			.delete()
			.in('token', TOUS_LES_JETONS_COURS);
		await loose(service).from('class_journal_share_tokens').delete().in('token', [JOURNAL_A]);
	}

	async function lireCours(token: string | null): Promise<CoursePayload | null> {
		const { data, error } = await loose(anonClient()).rpc('get_class_course_by_share_token', {
			p_token: token
		});
		if (error) throw new Error(`get_class_course_by_share_token : ${error.message}`);
		return data as CoursePayload | null;
	}

	async function ouvrirFiche(
		token: string | null,
		ficheId: string
	): Promise<{ id: string } | null> {
		const { data, error } = await loose(anonClient()).rpc('get_course_worksheet_by_share_token', {
			p_token: token,
			p_worksheet_id: ficheId
		});
		if (error) throw new Error(`get_course_worksheet_by_share_token : ${error.message}`);
		return data as { id: string } | null;
	}

	/** Réservée au service role : c'est le serveur qui l'appelle, jamais le navigateur. */
	async function ouvrirDocument(
		token: string | null,
		documentId: string
	): Promise<{ storage_path: string | null; file_name: string | null } | null> {
		const { data, error } = await loose(service).rpc('get_course_document_by_share_token', {
			p_token: token,
			p_document_id: documentId
		});
		if (error) throw new Error(`get_course_document_by_share_token : ${error.message}`);
		return data as { storage_path: string | null; file_name: string | null } | null;
	}

	function chapitreVisible(payload: CoursePayload | null) {
		const chapitre = payload?.chapters.find((c) => c.id === ids.chapitreVisible);
		if (!chapitre) throw new Error('chapitre visible absent de la réponse');
		return chapitre;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		await purgerJetons();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		teacherId = teacherProfile.id;
		teacher = await clientFor(teacherProfile.email);
		const eleveProfile = await TestData.profile().withRole('student').create();
		eleve = await clientFor(eleveProfile.email);

		classA = (await TestData.class().withName('5e Cours partagé A').create()).id;
		classB = (await TestData.class().withName('5e Cours partagé B').create()).id;
		classC = (await TestData.class().withName('5e Cours partagé C').create()).id;
		classD = (await TestData.class().withName('5e Cours partagé D').create()).id;

		const passe = new Date(Date.now() - 3_600_000).toISOString();
		const demain = new Date(Date.now() + 86_400_000).toISOString();

		// ── Classe A : un chapitre visible, un chapitre masqué ────────────────
		ids.chapitreVisible = await insert('class_chapters', {
			class_id: classA,
			title: 'Les fractions',
			description: 'Chapitre 1',
			color: '#336699',
			icon: 'book',
			display_order: 1,
			is_visible: true
		});
		ids.chapitreMasque = await insert('class_chapters', {
			class_id: classA,
			title: 'Chapitre en préparation',
			display_order: 2,
			is_visible: false
		});
		ids.sectionPleine = await insert('chapter_sections', {
			chapter_id: ids.chapitreVisible,
			title: 'Cours',
			display_order: 1
		});
		// Ne porte qu'un document préparé : doit disparaître du plan.
		ids.sectionVide = await insert('chapter_sections', {
			chapter_id: ids.chapitreVisible,
			title: 'Section sans contenu publié',
			display_order: 2
		});

		ids.docPublie = await insert('chapter_documents', {
			chapter_id: ids.chapitreVisible,
			section_id: ids.sectionPleine,
			title: 'Polycopié publié',
			source_type: 'upload',
			storage_path: STORAGE_PATH,
			file_name: 'polycopie.pdf',
			mime_type: 'application/pdf',
			file_size: 1024,
			display_order: 1,
			published_at: passe
		});
		ids.docDemain = await insert('chapter_documents', {
			chapter_id: ids.chapitreVisible,
			title: 'Document programmé',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/demain',
			display_order: 2,
			published_at: demain
		});
		ids.docNull = await insert('chapter_documents', {
			chapter_id: ids.chapitreVisible,
			section_id: ids.sectionVide,
			title: 'Document préparé',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/prepare',
			display_order: 3,
			published_at: null
		});
		ids.docMasque = await insert('chapter_documents', {
			chapter_id: ids.chapitreMasque,
			title: 'Document du chapitre masqué',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/masque',
			display_order: 1,
			published_at: passe
		});

		ids.ficheDistribuee = await fiche('Fiche distribuée');
		ids.ficheNonDistribuee = await fiche('Fiche publiée non distribuée');
		ids.ficheHorsChapitre = await fiche('Fiche distribuée hors chapitre');
		ids.ficheMasquee = await fiche('Fiche du chapitre masqué');
		await distribuer(ids.ficheDistribuee, classA);
		await distribuer(ids.ficheHorsChapitre, classA);
		await distribuer(ids.ficheMasquee, classA);

		// Gardes de fiche, une par fiche, toutes rangées dans le chapitre VISIBLE.
		ids.fichePreparee = await fiche('Fiche préparée (published_at NULL)');
		ids.ficheProgrammee = await fiche('Fiche programmée (published_at demain)');
		ids.ficheAffectationBrouillon = await fiche('Fiche à affectation brouillon');
		ids.ficheOuverteDemain = await fiche('Fiche ouverte demain');
		ids.ficheDistribueeAuxB = await fiche('Fiche distribuée seulement aux B');
		await distribuer(ids.fichePreparee, classA);
		await distribuer(ids.ficheProgrammee, classA);
		await distribuer(ids.ficheAffectationBrouillon, classA, { status: 'draft' });
		await distribuer(ids.ficheOuverteDemain, classA, { available_from: demain });
		await distribuer(ids.ficheDistribueeAuxB, classB);
		const gardes: [string, string | null][] = [
			[ids.fichePreparee, null],
			[ids.ficheProgrammee, demain],
			[ids.ficheAffectationBrouillon, passe],
			[ids.ficheOuverteDemain, passe],
			[ids.ficheDistribueeAuxB, passe]
		];
		for (const [ficheId, publication] of gardes) {
			await insert('chapter_worksheets', {
				chapter_id: ids.chapitreVisible,
				worksheet_id: ficheId,
				display_order: 10,
				published_at: publication
			});
		}
		await insert('chapter_worksheets', {
			chapter_id: ids.chapitreVisible,
			worksheet_id: ids.ficheDistribuee,
			display_order: 1,
			published_at: passe
		});
		await insert('chapter_worksheets', {
			chapter_id: ids.chapitreVisible,
			worksheet_id: ids.ficheNonDistribuee,
			display_order: 2,
			published_at: passe
		});
		await insert('chapter_worksheets', {
			chapter_id: ids.chapitreMasque,
			worksheet_id: ids.ficheMasquee,
			display_order: 1,
			published_at: passe
		});

		ids.itemPublie = await insert('chapter_checklist_items', {
			chapter_id: ids.chapitreVisible,
			content: 'Je sais simplifier une fraction',
			description: 'Objectif',
			display_order: 1,
			published_at: passe
		});
		ids.itemNull = await insert('chapter_checklist_items', {
			chapter_id: ids.chapitreVisible,
			content: 'Objectif préparé',
			display_order: 2,
			published_at: null
		});

		const categories = [
			{
				category: { theme: 'Nombres', domain: 'Fractions', subdomain: 'Simplifier', level: 1 },
				quantity: 4,
				delay: 20
			}
		];
		const serie = await insert('series', {
			title: 'Série fractions',
			description: 'Révisions',
			grade: '1_SPE',
			categories,
			created_by: teacherId
		});
		const serieDemain = await insert('series', {
			title: 'Série programmée',
			grade: '1_SPE',
			categories,
			created_by: teacherId
		});
		ids.seriePubliee = await insert('chapter_series', {
			chapter_id: ids.chapitreVisible,
			series_id: serie,
			form: 'interactive',
			published_at: passe
		});
		ids.serieDemain = await insert('chapter_series', {
			chapter_id: ids.chapitreVisible,
			series_id: serieDemain,
			published_at: demain
		});

		// Un exercice publié dans le chapitre : JAMAIS renvoyé par le lien.
		const exercice = (await TestData.exercise(teacherId).create()) as { id: string };
		ids.exercice = await insert('chapter_exercises', {
			chapter_id: ids.chapitreVisible,
			exercise_id: exercice.id,
			display_order: 1,
			published_at: passe
		});

		// ── Classe B : ses propres contenus publiés ───────────────────────────
		const chapitreB = await insert('class_chapters', {
			class_id: classB,
			title: 'Chapitre de B',
			display_order: 1,
			is_visible: true
		});
		ids.docB = await insert('chapter_documents', {
			chapter_id: chapitreB,
			title: 'Document de B',
			source_type: 'upload',
			storage_path: 'chapters/cours-partage/b.pdf',
			file_name: 'b.pdf',
			display_order: 1,
			published_at: passe
		});
		ids.ficheB = await fiche('Fiche de B');
		await distribuer(ids.ficheB, classB);
		await insert('chapter_worksheets', {
			chapter_id: chapitreB,
			worksheet_id: ids.ficheB,
			display_order: 1,
			published_at: passe
		});

		// ── Jetons ────────────────────────────────────────────────────────────
		const { error: tokenError } = await loose(service)
			.from('class_course_share_tokens')
			.insert([
				{ class_id: classA, token: COURSE_A, is_active: true, created_by: teacherId },
				{ class_id: classA, token: COURSE_A_REVOQUE, is_active: false },
				{ class_id: classB, token: COURSE_B, is_active: true },
				// ACTIF mais expiré : c'est bien l'expiration qui est testée.
				{
					class_id: classC,
					token: COURSE_C_EXPIRE,
					is_active: true,
					expires_at: new Date(Date.now() - 86_400_000).toISOString()
				}
			]);
		if (tokenError) throw new Error(`jetons du cours : ${tokenError.message}`);

		// Le jeton du CAHIER de la classe A : il ne doit rien ouvrir ici.
		const { error: journalError } = await loose(service)
			.from('class_journal_share_tokens')
			.insert({ class_id: classA, token: JOURNAL_A, is_active: true });
		if (journalError) throw new Error(`jeton du cahier : ${journalError.message}`);
	}, 120_000);

	afterAll(async () => {
		await purgerJetons();
		if (fiches.length > 0) {
			await service.from('worksheet_assignments').delete().in('worksheet_id', fiches);
			await service.from('worksheets').delete().in('id', fiches);
		}
		await cleanupAllTestData();
	});

	// ========================================================================
	// 1-2. Ce que le lien donne
	// ========================================================================

	it('lien actif : plan et contenus publiés (document, fiche distribuée, checklist, série)', async () => {
		const payload = await lireCours(COURSE_A);

		expect(payload?.class_name).toBe('5e Cours partagé A');
		const chapitre = chapitreVisible(payload);
		expect(chapitre.title).toBe('Les fractions');
		expect(chapitre.documents.map((d) => d.id)).toEqual([ids.docPublie]);
		expect(chapitre.worksheets.map((f) => [f.worksheet_id, f.title])).toEqual([
			[ids.ficheDistribuee, 'Fiche distribuée']
		]);
		expect(chapitre.checklist_items.map((i) => i.id)).toEqual([ids.itemPublie]);
		expect(chapitre.series.map((s) => [s.id, s.title, s.form])).toEqual([
			[ids.seriePubliee, 'Série fractions', 'interactive']
		]);
	});

	it('le plan ne garde que les sections qui portent un contenu renvoyé', async () => {
		const chapitre = chapitreVisible(await lireCours(COURSE_A));

		expect(chapitre.sections.map((s) => s.id)).toEqual([ids.sectionPleine]);
	});

	it('la fiche et le document publiés dans un chapitre visible s’ouvrent', async () => {
		expect((await ouvrirFiche(COURSE_A, ids.ficheDistribuee))?.id).toBe(ids.ficheDistribuee);

		const document = await ouvrirDocument(COURSE_A, ids.docPublie);
		expect(document?.storage_path).toBe(STORAGE_PATH);
		expect(document?.file_name).toBe('polycopie.pdf');
	});

	it('chaque lecture du cours est comptée', async () => {
		const avant = await loose(service)
			.from('class_course_share_tokens')
			.select('access_count')
			.eq('token', COURSE_A);
		await lireCours(COURSE_A);
		const apres = await loose(service)
			.from('class_course_share_tokens')
			.select('access_count')
			.eq('token', COURSE_A);

		const compte = (r: { data: unknown[] | null }) =>
			(r.data?.[0] as { access_count: number } | undefined)?.access_count ?? -1;
		expect(compte(apres)).toBe(compte(avant) + 1);
	});

	// ========================================================================
	// 3-4. Ce qui n'est pas publié
	// ========================================================================

	it('chapitre masqué : absent, et sa fiche comme son document sont refusés', async () => {
		const payload = await lireCours(COURSE_A);

		expect(payload?.chapters.map((c) => c.id)).toEqual([ids.chapitreVisible]);
		expect(await ouvrirFiche(COURSE_A, ids.ficheMasquee)).toBeNull();
		expect(await ouvrirDocument(COURSE_A, ids.docMasque)).toBeNull();
	});

	it('contenu programmé (demain) ou préparé (NULL) : absent et refusé', async () => {
		const chapitre = chapitreVisible(await lireCours(COURSE_A));

		const documents = chapitre.documents.map((d) => d.id);
		expect(documents).not.toContain(ids.docDemain);
		expect(documents).not.toContain(ids.docNull);
		expect(chapitre.checklist_items.map((i) => i.id)).not.toContain(ids.itemNull);
		expect(chapitre.series.map((s) => s.id)).not.toContain(ids.serieDemain);
		expect(await ouvrirDocument(COURSE_A, ids.docDemain)).toBeNull();
		expect(await ouvrirDocument(COURSE_A, ids.docNull)).toBeNull();
	});

	// ========================================================================
	// 5, 9. Les jetons qui ne valent rien
	// ========================================================================

	it('révoqué, expiré et inexistant donnent la MÊME réponse (null), sur les 3 RPC', async () => {
		for (const token of [COURSE_A_REVOQUE, COURSE_C_EXPIRE, 'QqQqQqQqQqQqQqQqQq']) {
			expect(await lireCours(token)).toBeNull();
			expect(await ouvrirFiche(token, ids.ficheDistribuee)).toBeNull();
			expect(await ouvrirDocument(token, ids.docPublie)).toBeNull();
		}
	});

	it('classe archivée : null, même avec un jeton valide', async () => {
		// Archiver une classe doit valoir révocation de son lien.
		await service.from('classes').update({ is_active: false }).eq('id', classA);
		try {
			expect(await lireCours(COURSE_A)).toBeNull();
			expect(await ouvrirFiche(COURSE_A, ids.ficheDistribuee)).toBeNull();
			expect(await ouvrirDocument(COURSE_A, ids.docPublie)).toBeNull();
		} finally {
			await service.from('classes').update({ is_active: true }).eq('id', classA);
		}
		expect(await lireCours(COURSE_A)).not.toBeNull();
	});

	it('jeton de forme aberrante (null, vide, court, trop long) : null', async () => {
		for (const token of [null, '', 'court', 'x'.repeat(200)]) {
			expect(await lireCours(token)).toBeNull();
			expect(await ouvrirFiche(token, ids.ficheDistribuee)).toBeNull();
			expect(await ouvrirDocument(token, ids.docPublie)).toBeNull();
		}
	});

	// ========================================================================
	// 6-8. Les cloisons
	// ========================================================================

	it('le jeton du CAHIER est refusé par les 3 RPC du cours', async () => {
		expect(await lireCours(JOURNAL_A)).toBeNull();
		expect(await ouvrirFiche(JOURNAL_A, ids.ficheDistribuee)).toBeNull();
		expect(await ouvrirDocument(JOURNAL_A, ids.docPublie)).toBeNull();
	});

	it('jeton de la classe A + fiche ou document de la classe B : null', async () => {
		// Témoin : avec son propre jeton, B les ouvre.
		expect((await ouvrirFiche(COURSE_B, ids.ficheB))?.id).toBe(ids.ficheB);
		expect(await ouvrirDocument(COURSE_B, ids.docB)).not.toBeNull();

		expect(await ouvrirFiche(COURSE_A, ids.ficheB)).toBeNull();
		expect(await ouvrirDocument(COURSE_A, ids.docB)).toBeNull();
	});

	it('fiche publiée dans le chapitre mais NON distribuée : absente et refusée', async () => {
		const chapitre = chapitreVisible(await lireCours(COURSE_A));

		expect(chapitre.worksheets.map((f) => f.worksheet_id)).not.toContain(ids.ficheNonDistribuee);
		expect(await ouvrirFiche(COURSE_A, ids.ficheNonDistribuee)).toBeNull();
	});

	it('fiche distribuée mais dans aucun chapitre visible : refusée', async () => {
		expect(await ouvrirFiche(COURSE_A, ids.ficheHorsChapitre)).toBeNull();
	});

	// Une garde par test : chacun tombe si la ligne correspondante disparaît,
	// dans le plan OU dans la RPC de la fiche.
	it.each([
		['rattachement préparé (published_at NULL)', 'fichePreparee'],
		['rattachement programmé (published_at demain)', 'ficheProgrammee'],
		["affectation au statut ≠ 'active' (draft)", 'ficheAffectationBrouillon'],
		['affectation ouverte demain (available_from)', 'ficheOuverteDemain'],
		['fiche publiée chez A mais distribuée SEULEMENT aux B', 'ficheDistribueeAuxB']
	] as const)('%s : absente du plan et refusée', async (_cas, cle) => {
		const ficheId = ids[cle];
		const chapitre = chapitreVisible(await lireCours(COURSE_A));

		expect(chapitre.worksheets.map((f) => f.worksheet_id)).not.toContain(ficheId);
		expect(await ouvrirFiche(COURSE_A, ficheId)).toBeNull();
	});

	// ========================================================================
	// 10. Ce que le lien n'ouvre jamais
	// ========================================================================

	it('ni exercice, ni progression, ni join_code, ni storage_path dans la réponse', async () => {
		const payload = await lireCours(COURSE_A);
		const texte = JSON.stringify(payload);

		expect(Object.keys(payload as object).sort()).toEqual([
			'chapters',
			'class_grade',
			'class_name'
		]);
		expect(Object.keys(chapitreVisible(payload)).sort()).toEqual([
			'checklist_items',
			'color',
			'description',
			'display_order',
			'documents',
			'icon',
			'id',
			'sections',
			'series',
			'title',
			'worksheets'
		]);
		expect(texte).not.toMatch(/join_code/i);
		expect(texte).not.toMatch(/storage_path/i);
		expect(texte).not.toContain(STORAGE_PATH);
		expect(texte).not.toMatch(/progress|completed/i);
		expect(texte).not.toContain(ids.exercice);
	});

	it('anon et un élève connecté ne peuvent pas appeler la RPC du document (42501)', async () => {
		// Le chemin de stockage ne sort que par le serveur (service role).
		for (const client of [anonClient(), eleve]) {
			const { data, error } = await loose(client).rpc('get_course_document_by_share_token', {
				p_token: COURSE_A,
				p_document_id: ids.docPublie
			});
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		}
	});

	it('anon ne lit pas la table des jetons du cours', async () => {
		const { data, error } = await loose(anonClient())
			.from('class_course_share_tokens')
			.select('token')
			.limit(5);

		expect(data ?? []).toEqual([]);
		expect(error).not.toBeNull();
	});

	it.each([
		'class_chapters',
		'chapter_sections',
		'chapter_documents',
		'chapter_worksheets',
		'chapter_checklist_items',
		'chapter_series',
		'chapter_exercises'
	])('anon ne lit rien directement dans %s', async (table) => {
		const { data } = await loose(anonClient()).from(table).select('id').limit(5);

		expect(data ?? []).toEqual([]);
	});

	// ========================================================================
	// 11. Qui gère les jetons
	// ========================================================================

	it('un élève connecté ne crée pas de jeton (relu en service role)', async () => {
		const { error } = await loose(eleve)
			.from('class_course_share_tokens')
			.insert({ class_id: classC, token: COURSE_ELEVE, is_active: true });
		expect(error).not.toBeNull();

		const { data } = await loose(service)
			.from('class_course_share_tokens')
			.select('id')
			.eq('token', COURSE_ELEVE);
		expect(data ?? []).toEqual([]);
	});

	it('un élève connecté ne désactive pas un jeton (relu en service role)', async () => {
		const { data: modifiees } = await loose(eleve)
			.from('class_course_share_tokens')
			.update({ is_active: false })
			.eq('token', COURSE_A)
			.select('id');
		expect(modifiees ?? []).toEqual([]);

		const { data } = await loose(service)
			.from('class_course_share_tokens')
			.select('is_active')
			.eq('token', COURSE_A);
		expect(data).toEqual([{ is_active: true }]);
	});

	it('le prof crée puis désactive un jeton (relu en service role)', async () => {
		const { error } = await loose(teacher)
			.from('class_course_share_tokens')
			.insert({ class_id: classD, token: COURSE_PROF, is_active: false, created_by: teacherId });
		expect(error).toBeNull();

		const { data: modifiees } = await loose(teacher)
			.from('class_course_share_tokens')
			.update({ is_active: true })
			.eq('token', COURSE_PROF)
			.select('id');
		expect(modifiees).toHaveLength(1);

		const { data: relu } = await loose(service)
			.from('class_course_share_tokens')
			.select('is_active')
			.eq('token', COURSE_PROF);
		expect(relu).toEqual([{ is_active: true }]);

		const { data: desactivees } = await loose(teacher)
			.from('class_course_share_tokens')
			.update({ is_active: false })
			.eq('token', COURSE_PROF)
			.select('id');
		expect(desactivees).toHaveLength(1);

		const { data: reluFin } = await loose(service)
			.from('class_course_share_tokens')
			.select('is_active')
			.eq('token', COURSE_PROF);
		expect(reluFin).toEqual([{ is_active: false }]);
	});
});
