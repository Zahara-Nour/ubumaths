/**
 * Sections d'un chapitre (base locale requise)
 * ============================================
 *
 * L'axe de rangement d'un chapitre passe du TYPE de ressource au MOMENT du
 * cours. Trois invariants tiennent cette bascule, et aucun n'est visible depuis
 * l'interface :
 *
 * 1. un chapitre naît avec ses six sections — par TRIGGER, parce qu'il naît par
 *    plusieurs chemins (création manuelle, instanciation d'un modèle) ;
 * 2. une ressource ne peut pointer que vers une section de SON chapitre — clé
 *    étrangère COMPOSITE, donc garanti par la base et non par une validation
 *    applicative qu'une nouvelle route contournerait ;
 * 3. supprimer une section ne supprime AUCUNE ressource.
 *
 * Le troisième est le plus important : `on delete cascade` à la place de
 * `set null` effacerait le travail du professeur d'un clic, et ça ne se verrait
 * qu'après. D'où un cas dédié.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien sur les cas RLS : le
 * garde du chapitre sort avant.
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

/** Les six sections semées par le trigger, dans l'ordre voulu. */
const SECTIONS_PAR_DEFAUT = [
	'Préparation',
	'Le cours',
	'Les exercices',
	'Méthodes',
	'Résumé',
	'Bilan'
];

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

async function sectionsDe(chapitre: string): Promise<{ title: string; id: string }[]> {
	const { data, error } = await service
		.from('chapter_sections')
		.select('id, title')
		.eq('chapter_id', chapitre)
		.order('display_order');
	expect(error).toBeNull();
	return data ?? [];
}

describe('sections d’un chapitre', () => {
	let classe: string;
	let chapitre: string;
	let autreChapitre: string;
	let eleve: SupabaseClient<Database>;
	let eleveArchive: SupabaseClient<Database>;
	/** Élève actif d'une AUTRE classe : la frontière de safeguarding. */
	let eleveAilleurs: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;
	let enseignantId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		// ⚠️ Un seul compte teacher est autorisé (invariant mono-professeur) :
		// tous les cas réutilisent celui-ci, aucun n'en crée un second.
		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée sections VV',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année sections VV',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE sections VV',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'VVSE01',
			is_active: true
		});

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre sections VV',
			display_order: 1,
			is_visible: true
		});
		autreChapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Autre chapitre sections VV',
			display_order: 2,
			is_visible: true
		});

		const ARRIVEE = new Date(Date.now() - 30 * 86_400_000).toISOString();

		const profilEleve = await TestData.profile().withRole('student').create();
		{
			const { error } = await service.from('class_members').insert({
				class_id: classe,
				student_id: profilEleve.id,
				status: 'active',
				joined_at: ARRIVEE
			});
			expect(error).toBeNull();
		}
		eleve = await clientFor(profilEleve.email);

		const profilArchive = await TestData.profile().withRole('student').create();
		{
			const { error: entree } = await service.from('class_members').insert({
				class_id: classe,
				student_id: profilArchive.id,
				status: 'active',
				joined_at: ARRIVEE
			});
			expect(entree).toBeNull();
			const { error: sortie } = await service
				.from('class_members')
				.update({ status: 'archived' })
				.eq('class_id', classe)
				.eq('student_id', profilArchive.id);
			expect(sortie).toBeNull();
		}
		eleveArchive = await clientFor(profilArchive.email);

		// Une SECONDE classe, dans la même école : sans elle, la suite ne
		// prouverait rien sur la frontière entre classes — elle ne jouerait que
		// « membre » contre « ancien membre ».
		const autreClasse = await insert('classes', {
			name: '2DE sections VV',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'VVSE02',
			is_active: true
		});
		const profilAilleurs = await TestData.profile().withRole('student').create();
		{
			const { error } = await service.from('class_members').insert({
				class_id: autreClasse,
				student_id: profilAilleurs.id,
				status: 'active',
				joined_at: ARRIVEE
			});
			expect(error).toBeNull();
		}
		eleveAilleurs = await clientFor(profilAilleurs.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un chapitre naît avec ses six sections, dans l’ordre', async () => {
		const sections = await sectionsDe(chapitre);
		expect(sections.map((s) => s.title)).toEqual(SECTIONS_PAR_DEFAUT);
	});

	it('chaque chapitre a les siennes, pas celles du voisin', async () => {
		const a = await sectionsDe(chapitre);
		const b = await sectionsDe(autreChapitre);

		expect(b.map((s) => s.title)).toEqual(SECTIONS_PAR_DEFAUT);
		// Sans ça, un `a` vide ferait passer le `.some()` ci-dessous sans rien
		// prouver : `[].some(...)` vaut `false`.
		expect(a).toHaveLength(6);
		// Six titres identiques, six identifiants distincts : renommer une
		// section d'un chapitre ne doit rien changer à l'autre.
		expect(a.map((s) => s.id).some((id) => b.map((s) => s.id).includes(id))).toBe(false);
	});

	it('une ressource se range dans une section de son chapitre', async () => {
		const [preparation] = await sectionsDe(chapitre);

		const document = await insert('chapter_documents', {
			chapter_id: chapitre,
			title: 'Document sections VV',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/doc',
			display_order: 1
		});

		const { error } = await service
			.from('chapter_documents')
			.update({ section_id: preparation.id, section_order: 1 })
			.eq('id', document);

		expect(error).toBeNull();
	});

	/**
	 * L'invariant que seule une clé étrangère COMPOSITE peut tenir : une
	 * validation applicative se contourne dès qu'on ajoute une route.
	 */
	it('refuse une section qui appartient à un AUTRE chapitre', async () => {
		const [sectionDAilleurs] = await sectionsDe(autreChapitre);

		const document = await insert('chapter_documents', {
			chapter_id: chapitre,
			title: 'Document mal rangé VV',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/doc',
			display_order: 2
		});

		const { error } = await service
			.from('chapter_documents')
			.update({ section_id: sectionDAilleurs.id })
			.eq('id', document);

		expect(error, 'la base aurait dû refuser').not.toBeNull();
		expect(error?.code).toBe('23503');
	});

	/**
	 * LE cas qui compte. `on delete cascade` à la place de `set null`
	 * effacerait le travail du professeur d'un clic, et ça ne se verrait
	 * qu'après.
	 */
	it('supprimer une section ne supprime AUCUNE ressource', async () => {
		const sections = await sectionsDe(chapitre);
		const methodes = sections.find((s) => s.title === 'Méthodes')!;

		const document = await insert('chapter_documents', {
			chapter_id: chapitre,
			title: 'Document de Méthodes VV',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/doc',
			display_order: 3,
			section_id: methodes.id,
			section_order: 1
		});

		{
			const { error } = await service.from('chapter_sections').delete().eq('id', methodes.id);
			expect(error).toBeNull();
		}

		const { data, error } = await service
			.from('chapter_documents')
			.select('id, section_id, chapter_id')
			.eq('id', document)
			.single();

		expect(error, 'la ressource ne doit pas avoir été supprimée').toBeNull();
		expect(data?.section_id, '« Non classé »').toBeNull();
		// `on delete set null` SANS liste de colonnes aurait aussi vidé
		// `chapter_id` — qui est `not null`, donc la suppression aurait échoué.
		expect(data?.chapter_id).toBe(chapitre);
	});

	it('le professeur peut réordonner les sections', async () => {
		const sections = await sectionsDe(chapitre);
		const bilan = sections.find((s) => s.title === 'Bilan')!;

		const { error } = await prof
			.from('chapter_sections')
			.update({ display_order: 0 })
			.eq('id', bilan.id);
		expect(error).toBeNull();

		const apres = await sectionsDe(chapitre);
		expect(apres[0].title).toBe('Bilan');

		// Remis en place : les cas suivants ne doivent pas hériter de l'ordre.
		const { error: retour } = await service
			.from('chapter_sections')
			.update({ display_order: 6 })
			.eq('id', bilan.id);
		expect(retour).toBeNull();
	});

	it('l’élève actif voit les sections de son chapitre visible', async () => {
		const { data, error } = await eleve
			.from('chapter_sections')
			.select('title')
			.eq('chapter_id', chapitre);

		expect(error).toBeNull();
		expect(data?.map((s) => s.title)).toContain('Le cours');
	});

	it('l’élève archivé ne voit plus les sections', async () => {
		const { data, error } = await eleveArchive
			.from('chapter_sections')
			.select('title')
			.eq('chapter_id', chapitre);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	/**
	 * La frontière de safeguarding du produit : l'école, pas la classe — mais
	 * un chapitre appartient à UNE classe, et son plan ne doit pas fuiter aux
	 * autres. Non testé, ce cas ne se verrait jamais depuis l'interface.
	 */
	it('un élève d’une AUTRE classe ne voit aucune section', async () => {
		const { data, error } = await eleveAilleurs
			.from('chapter_sections')
			.select('title')
			.eq('chapter_id', chapitre);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	/**
	 * Les policies permissives se combinent en OU : celle qui s'ajouterait un
	 * jour « pour simplifier » ouvrirait l'écriture sans que rien ne l'annonce.
	 * Leçon déjà payée sur le grapheur.
	 */
	it('un élève ne peut ni créer, ni renommer, ni supprimer une section', async () => {
		const sections = await sectionsDe(chapitre);
		const cours = sections.find((s) => s.title === 'Le cours')!;

		const { error: erreurInsert } = await eleve
			.from('chapter_sections')
			.insert({ chapter_id: chapitre, title: 'Section pirate VV', display_order: 99 });
		expect(erreurInsert, 'la création aurait dû être refusée').not.toBeNull();
		expect(erreurInsert?.code).toBe('42501');

		// ⚠️ Un UPDATE refusé par la RLS ne lève pas : il ne touche aucune ligne.
		const { data: renommees, error: erreurUpdate } = await eleve
			.from('chapter_sections')
			.update({ title: 'Renommée par un élève VV' })
			.eq('id', cours.id)
			.select('id');
		expect(erreurUpdate).toBeNull();
		expect(renommees, 'aucune section ne doit être renommable').toEqual([]);

		const { data: supprimees, error: erreurDelete } = await eleve
			.from('chapter_sections')
			.delete()
			.eq('id', cours.id)
			.select('id');
		expect(erreurDelete).toBeNull();
		expect(supprimees, 'aucune section ne doit être supprimable').toEqual([]);

		// Et elle est toujours là, sous son vrai nom.
		expect((await sectionsDe(chapitre)).map((s) => s.title)).toContain('Le cours');
	});

	/**
	 * Les cinq clés étrangères sont posées par une boucle : retirer un nom du
	 * tableau ne serait rattrapé par aucun test si une seule table est exercée.
	 */
	it('la garde composite vaut aussi pour les fiches', async () => {
		const [sectionDAilleurs] = await sectionsDe(autreChapitre);

		const fiche = await insert('worksheets', {
			title: 'Fiche sections VV',
			type: 'worksheet',
			status: 'published',
			created_by: enseignantId
		});
		const lien = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: fiche,
			display_order: 1
		});

		const { error } = await service
			.from('chapter_worksheets')
			.update({ section_id: sectionDAilleurs.id })
			.eq('id', lien);

		expect(error, 'la base aurait dû refuser').not.toBeNull();
		expect(error?.code).toBe('23503');
	});

	it('`section_order` range les ressources dans une section', async () => {
		const sections = await sectionsDe(chapitre);
		const cours = sections.find((s) => s.title === 'Le cours')!;

		const document = async (titre: string, ordre: number) =>
			insert('chapter_documents', {
				chapter_id: chapitre,
				title: titre,
				source_type: 'google_drive',
				google_drive_url: 'https://example.invalid/doc',
				display_order: 50,
				section_id: cours.id,
				section_order: ordre
			});

		// Insérés à l'envers : c'est `section_order` qui doit commander, pas
		// l'ordre d'insertion ni `display_order`, identique pour les deux.
		await document('Deuxième VV', 2);
		await document('Premier VV', 1);

		const { data, error } = await service
			.from('chapter_documents')
			.select('title')
			.eq('section_id', cours.id)
			.order('section_order');

		expect(error).toBeNull();
		expect(data?.map((d) => d.title)).toEqual(['Premier VV', 'Deuxième VV']);
	});

	it('renommer une section met `updated_at` à jour', async () => {
		const sections = await sectionsDe(chapitre);
		const resume = sections.find((s) => s.title === 'Résumé')!;

		const { data, error } = await service
			.from('chapter_sections')
			.update({ title: 'Résumé du chapitre VV' })
			.eq('id', resume.id)
			.select('created_at, updated_at')
			.single();

		expect(error).toBeNull();
		// Une colonne d'audit qui ne bouge pas est pire qu'une colonne absente.
		expect(new Date(data!.updated_at).getTime()).toBeGreaterThan(
			new Date(data!.created_at).getTime()
		);
	});

	it('un chapitre masqué ne montre aucune section', async () => {
		{
			const { error } = await service
				.from('class_chapters')
				.update({ is_visible: false })
				.eq('id', autreChapitre);
			expect(error).toBeNull();
		}

		try {
			const { data, error } = await eleve
				.from('chapter_sections')
				.select('title')
				.eq('chapter_id', autreChapitre);
			expect(error).toBeNull();
			expect(data).toEqual([]);
		} finally {
			const { error } = await service
				.from('class_chapters')
				.update({ is_visible: true })
				.eq('id', autreChapitre);
			expect(error).toBeNull();
		}
	});
});
