/**
 * L'heure de publication est celle de la BASE (base locale requise)
 * =================================================================
 *
 * Les policies élève comparent `published_at <= now()` — l'horloge de Postgres.
 * `setContentPublication` écrivait la date de Node. Dès que Node avance sur la
 * base (~35 ms suffisent), le contenu « publié » restait invisible à l'élève
 * tant que durait l'avance : c'est ce qui rendait instable
 * `chapter-worksheet-publish-distributes.test.ts`.
 *
 * Ici, l'avance est FORCÉE (2 s, `vi.setSystemTime`) : sans le trigger
 * `published_at_horloge_base`, chaque cas « visible » rend `[]`.
 *
 * Même famille : `listDistributedWorksheetIds` comparait `available_from` à
 * l'horloge de Node, alors que `student_has_worksheet_access` compare à celle
 * de la base. Les deux doivent dire la même chose.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	setContentPublication,
	listDistributedWorksheetIds,
	type ChapterContentType
} from '$lib/server/chapters-publication';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** L'avance de Node sur la base, très au-dessus du seuil mesuré (~35 ms). */
const AVANCE_NODE_MS = 2000;

type TableContenu =
	| 'chapter_documents'
	| 'chapter_exercises'
	| 'chapter_checklist_items'
	| 'chapter_worksheets'
	| 'chapter_series'
	| 'chapter_decks';

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

async function vusPar(
	client: SupabaseClient<Database>,
	table: TableContenu,
	chapitre: string
): Promise<string[]> {
	const { data, error } = await client.from(table).select('id').eq('chapter_id', chapitre);
	expect(error, `lecture élève de ${table} en erreur`).toBeNull();
	return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

async function publishedAtStocke(table: TableContenu, id: string): Promise<string | null> {
	const { data, error } = await service.from(table).select('published_at').eq('id', id).single();
	expect(error).toBeNull();
	return (data as { published_at: string | null }).published_at;
}

/**
 * Le `now()` de la base, mesuré par une requête : une ligne sonde insérée, dont
 * `created_at` a pour défaut `now()`. Aucune RPC du schéma ne rend l'heure.
 */
async function maintenantBase(chapitre: string): Promise<number> {
	const { data, error } = await service
		.from('chapter_checklist_items')
		.insert({ chapter_id: chapitre, content: 'Sonde horloge HB', display_order: 99 })
		.select('id, created_at')
		.single();
	expect(error).toBeNull();
	const sonde = data as { id: string; created_at: string };
	await service.from('chapter_checklist_items').delete().eq('id', sonde.id).select('id');
	return new Date(sonde.created_at).getTime();
}

describe('publier pose l’heure de la base, pas celle de Node', () => {
	let enseignantId: string;
	let classe: string;
	let chapitre: string;
	let prof: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;

	// `Record<ChapterContentType, …>` complet : un type de contenu ajouté sans
	// cas ici casse le typage.
	const liens: Record<ChapterContentType, string> = {
		document: '',
		exercise: '',
		checklist: '',
		worksheet: '',
		series: ''
	};
	let lienDeck: string;
	let ficheId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée horloge HB',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année horloge HB',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE horloge HB',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'HBHO01',
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

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre horloge HB',
			display_order: 1,
			is_visible: true
		});

		// Tous les contenus naissent « préparés » (published_at NULL), comme dans
		// l'application.
		liens.document = await insert('chapter_documents', {
			chapter_id: chapitre,
			title: 'Document horloge HB',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/doc',
			display_order: 1,
			published_at: null
		});
		liens.checklist = await insert('chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif horloge HB',
			display_order: 1,
			published_at: null
		});
		const exercice = await insert('exercises', {
			title: 'Exercice horloge HB',
			created_by: enseignantId,
			grades: ['1_SPE'],
			topic: 'Horloge HB',
			category: 'application'
		});
		liens.exercise = await insert('chapter_exercises', {
			chapter_id: chapitre,
			exercise_id: exercice,
			display_order: 1,
			published_at: null
		});
		ficheId = await insert('worksheets', {
			title: 'Fiche horloge HB',
			type: 'worksheet',
			status: 'published',
			created_by: enseignantId
		});
		liens.worksheet = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheId,
			display_order: 1,
			published_at: null
		});

		// Série : la policy élève ne demande que chapitre visible + membre actif
		// + rattachement publié. Le professeur ne rattache que SES séries.
		const serie = await insert('series', {
			title: 'Série horloge HB',
			grade: '1_SPE',
			categories: [
				{
					category: {
						theme: 'Fonctions',
						domain: 'Étude de fonction',
						subdomain: 'Méthode',
						level: 1
					},
					quantity: 4,
					delay: 20
				}
			],
			created_by: enseignantId
		});
		liens.series = await insert('chapter_series', {
			chapter_id: chapitre,
			series_id: serie,
			published_at: null
		});

		// Deck : la policy élève exige aussi la copie ET l'assignation.
		const deck = await insert('srs_decks', {
			owner_id: enseignantId,
			name: 'Deck horloge HB',
			deck_type: 'official'
		});
		await insert('srs_decks', {
			owner_id: profil.id,
			name: 'Copie horloge HB',
			deck_type: 'official',
			is_assigned: true,
			source_deck_id: deck
		});
		await insert('srs_deck_assignments', {
			source_deck_id: deck,
			assigned_by: enseignantId,
			assigned_to: profil.id,
			assignment_type: 'student'
		});
		lienDeck = await insert('chapter_decks', {
			chapter_id: chapitre,
			deck_id: deck,
			published_at: null
		});
	}, 120_000);

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	const CAS: { type: ChapterContentType; table: TableContenu }[] = [
		{ type: 'document', table: 'chapter_documents' },
		{ type: 'exercise', table: 'chapter_exercises' },
		{ type: 'checklist', table: 'chapter_checklist_items' },
		{ type: 'worksheet', table: 'chapter_worksheets' },
		{ type: 'series', table: 'chapter_series' }
	];

	for (const { type, table } of CAS) {
		it(`${table} : publié avec Node en avance de 2 s, l’élève le voit tout de suite`, async () => {
			const avant = await maintenantBase(chapitre);

			vi.setSystemTime(new Date(Date.now() + AVANCE_NODE_MS));
			const { data, error } = await setContentPublication(
				{ contentType: type, itemId: liens[type], published: true, teacherId: enseignantId },
				prof
			);
			vi.useRealTimers();
			expect(error).toBeNull();

			// Le vrai verdict : la policy élève, juste après le clic.
			expect(await vusPar(eleve, table, chapitre)).toContain(liens[type]);

			// La date stockée est celle de la base : encadrée par deux mesures de
			// son `now()`, et non 2 s dans le futur.
			const apres = await maintenantBase(chapitre);
			const stocke = await publishedAtStocke(table, liens[type]);
			expect(stocke).not.toBeNull();
			const pose = new Date(stocke!).getTime();
			expect(pose).toBeGreaterThanOrEqual(avant);
			expect(pose).toBeLessThanOrEqual(apres);
			expect(apres - avant).toBeLessThan(1000);

			// Ce que renvoie la fonction est ce qui est en base, pas l'intention.
			expect(data?.publishedAt && new Date(data.publishedAt).getTime()).toBe(pose);
		});

		it(`${table} : dépublier écrit NULL et retire le contenu`, async () => {
			const { error } = await setContentPublication(
				{ contentType: type, itemId: liens[type], published: false, teacherId: enseignantId },
				prof
			);
			expect(error).toBeNull();
			expect(await publishedAtStocke(table, liens[type])).toBeNull();
			expect(await vusPar(eleve, table, chapitre)).not.toContain(liens[type]);
		});
	}

	it('republier repose l’heure de la base, encore une fois', async () => {
		await setContentPublication(
			{ contentType: 'document', itemId: liens.document, published: true, teacherId: enseignantId },
			prof
		);
		const premiere = new Date((await publishedAtStocke('chapter_documents', liens.document))!);

		vi.setSystemTime(new Date(Date.now() + AVANCE_NODE_MS));
		await setContentPublication(
			{ contentType: 'document', itemId: liens.document, published: true, teacherId: enseignantId },
			prof
		);
		vi.useRealTimers();

		const seconde = new Date((await publishedAtStocke('chapter_documents', liens.document))!);
		expect(seconde.getTime()).toBeGreaterThan(premiere.getTime());
		expect(seconde.getTime()).toBeLessThanOrEqual(await maintenantBase(chapitre));
		expect(await vusPar(eleve, 'chapter_documents', chapitre)).toContain(liens.document);
	});

	it('une mise à jour qui ne touche pas published_at ne le change pas', async () => {
		const avant = await publishedAtStocke('chapter_documents', liens.document);
		const { error } = await prof
			.from('chapter_documents')
			.update({ title: 'Document horloge HB renommé' })
			.eq('id', liens.document)
			.select('id')
			.single();
		expect(error).toBeNull();
		expect(await publishedAtStocke('chapter_documents', liens.document)).toBe(avant);
	});

	it('chapter_decks : une date de Node en avance est remplacée par celle de la base', async () => {
		// Aucun code ne publie encore un deck : on écrit comme le ferait le
		// professeur, avec SES droits et une date de Node en avance.
		const avance = new Date(Date.now() + AVANCE_NODE_MS).toISOString();
		const { data, error } = await prof
			.from('chapter_decks')
			.update({ published_at: avance })
			.eq('id', lienDeck)
			.select('id, published_at')
			.single();
		expect(error).toBeNull();
		expect(new Date(data!.published_at!).getTime()).toBeLessThan(new Date(avance).getTime());

		expect(await vusPar(eleve, 'chapter_decks', chapitre)).toContain(lienDeck);
	});
});

describe('listDistributedWorksheetIds suit l’horloge de la base', () => {
	let enseignantId: string;
	let classe: string;
	let prof: SupabaseClient<Database>;
	let ficheId: string;

	beforeAll(async () => {
		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée distribution HB',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année distribution HB',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE distribution HB',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'HBDI01',
			is_active: true
		});
		ficheId = await insert('worksheets', {
			title: 'Fiche programmée HB',
			type: 'worksheet',
			status: 'published',
			created_by: enseignantId
		});

		// Ouverte dans une minute selon la base (horloges locales alignées) :
		// pas encore distribuée pour `student_has_worksheet_access`.
		const affectation = await insert('worksheet_assignments', {
			worksheet_id: ficheId,
			status: 'active',
			created_by: enseignantId,
			available_from: new Date(Date.now() + 60_000).toISOString()
		});
		await insert('worksheet_assignment_classes', { assignment_id: affectation, class_id: classe });
	}, 120_000);

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('Node en avance de 2 min ne fait pas passer une fiche programmée pour distribuée', async () => {
		vi.setSystemTime(new Date(Date.now() + 120_000));
		const { data, error } = await listDistributedWorksheetIds([ficheId], classe, prof);
		vi.useRealTimers();

		expect(error).toBeNull();
		expect(data?.has(ficheId)).toBe(false);
	});
});
