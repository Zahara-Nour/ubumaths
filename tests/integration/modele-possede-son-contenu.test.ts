/**
 * Le modèle de chapitre possède son contenu ; le chapitre lié le relie (base locale requise)
 * ==========================================================================================
 *
 * ADR 0029. Un élément (section, document, objectif, exercice, fiche, série) appartient SOIT à un
 * chapitre, SOIT à un modèle. Un chapitre lié porte une « ligne de lien » par élément du modèle :
 * sa publication, sa section, son ordre et son masquage lui sont propres ; son contenu est celui
 * du modèle, recopié par la base. Le fichier, lui, reste unique, chez le modèle.
 *
 * Tout passe par les DROITS RÉELS (professeur, élèves de deux classes, anonyme) : les gardes sont
 * dans la base, un test à mocks ne prouverait rien. Le service ne sert qu'à poser le décor.
 *
 * Journal : docs/archive/wip/refonte-modeles-chapitre-progress.md (comportements 1-19).
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

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const BUCKET = 'chapter-documents';
const PUBLIE = new Date(Date.now() - 3600_000).toISOString();

/** Client de service : décor et constats, jamais un appel testé. */
const service = createServiceRoleClient();
/** Le même, sans le schéma généré : les colonnes du lien n'y sont pas avant `db:types`. */
const serviceBrut = service as unknown as SupabaseClient;

type Row = Record<string, unknown> & { id: string };

async function signIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insertAs(
	client: SupabaseClient,
	table: string,
	row: Record<string, unknown>
): Promise<string> {
	const { data, error } = await client.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

/** La ligne de lien d'un chapitre vers un élément du modèle, lue par le service. */
async function lien(table: string, chapitre: string, source: string): Promise<Row | null> {
	const { data, error } = await serviceBrut
		.from(table)
		.select('*')
		.eq('chapter_id', chapitre)
		.eq('source_id', source)
		.maybeSingle();
	expect(error, `${table} : lecture du lien`).toBeNull();
	return data as Row | null;
}

describe('ADR 0029 — le modèle possède son contenu, le chapitre le relie', () => {
	let prof: SupabaseClient;
	let profId: string;
	let eleveA: SupabaseClient;
	let eleveB: SupabaseClient;
	const anonyme = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	let modele: string;
	/** Chapitres liés : A (publiera), B (ne publiera pas), C (sera détaché). */
	let chapA: string;
	let chapB: string;
	let chapC: string;
	/** Chapitre jamais lié au modèle. */
	let chapLibre: string;

	// Éléments du modèle.
	let section: string;
	let docFichier: string;
	let docLien: string;
	let objectif: string;
	let exercice: string;
	let fiche: string;
	let serie: string;
	const cheminModele = () => `templates/${modele}/plan.pdf`;

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.storage.createBucket(BUCKET, { public: false }).catch(() => {});

		const profil = await TestData.profile().withRole('teacher').create();
		profId = profil.id;
		prof = await signIn(profil.email);

		const ecole = await insertAs(service, 'schools', {
			name: 'Lycée modèle YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insertAs(service, 'school_years', {
			school_id: ecole,
			name: 'Année modèle YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = async (nom: string, code: string) =>
			insertAs(service, 'classes', {
				name: nom,
				school_id: ecole,
				school_year_id: annee,
				join_code: code,
				is_active: true
			});
		const classeA = await classe('1SPE modèle A YY', 'YYMOA1');
		const classeB = await classe('1SPE modèle B YY', 'YYMOB1');

		const eleve = async (classeId: string) => {
			const p = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classeId, student_id: p.id, status: 'active' });
			expect(error).toBeNull();
			return signIn(p.email);
		};
		eleveA = await eleve(classeA);
		eleveB = await eleve(classeB);

		const chapitre = (classeId: string, titre: string) =>
			insertAs(service, 'class_chapters', {
				class_id: classeId,
				title: titre,
				display_order: 1,
				is_visible: true
			});
		chapA = await chapitre(classeA, 'Second degré A YY');
		chapB = await chapitre(classeB, 'Second degré B YY');
		chapC = await chapitre(classeB, 'Second degré C YY');
		chapLibre = await chapitre(classeA, 'Chapitre libre YY');

		// --- Le modèle et son contenu, posés AVEC LES DROITS DU PROFESSEUR ------------------
		modele = await insertAs(prof, 'chapter_templates', {
			created_by: profId,
			title: 'Second degré YY',
			status: 'published'
		});
		section = await insertAs(prof, 'chapter_sections', {
			template_id: modele,
			title: 'Cours',
			display_order: 0
		});
		docFichier = await insertAs(prof, 'chapter_documents', {
			template_id: modele,
			title: 'Cours du second degré',
			source_type: 'upload',
			storage_path: cheminModele(),
			file_name: 'plan.pdf',
			mime_type: 'application/pdf',
			section_id: section,
			display_order: 0
		});
		docLien = await insertAs(prof, 'chapter_documents', {
			template_id: modele,
			title: 'Vidéo',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/video',
			display_order: 1
		});
		objectif = await insertAs(prof, 'chapter_checklist_items', {
			template_id: modele,
			content: 'Je sais factoriser',
			display_order: 0
		});
		const ex = await insertAs(service, 'exercises', {
			title: 'Exercice modèle YY',
			created_by: profId,
			grades: ['1_SPE'],
			topic: 'Modèle YY',
			category: 'application'
		});
		exercice = await insertAs(prof, 'chapter_exercises', {
			template_id: modele,
			exercise_id: ex,
			display_order: 0
		});
		const ws = await insertAs(service, 'worksheets', {
			title: 'Fiche modèle YY',
			type: 'worksheet',
			status: 'published',
			created_by: profId
		});
		fiche = await insertAs(prof, 'chapter_worksheets', {
			template_id: modele,
			worksheet_id: ws,
			display_order: 0
		});
		const sr = await insertAs(service, 'series', {
			title: 'Série modèle YY',
			description: 'Série du modèle',
			grade: '1_SPE',
			categories: [{ category: 'entiers/1', quantity: 2, delay: 20 }],
			created_by: profId
		});
		serie = await insertAs(prof, 'chapter_series', {
			template_id: modele,
			series_id: sr,
			form: 'interactive',
			display_order: 0
		});

		for (const c of [chapA, chapB, chapC]) {
			const { error } = await prof.rpc('link_chapter_to_template', {
				p_chapter_id: c,
				p_template_id: modele
			});
			expect(error, 'lier un chapitre au modèle').toBeNull();
		}
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('propriété', () => {
		it('un élément a exactement un propriétaire : chapitre OU modèle', async () => {
			const deux = await prof.from('chapter_checklist_items').insert({
				chapter_id: chapLibre,
				template_id: modele,
				content: 'Deux propriétaires'
			});
			expect(deux.error).not.toBeNull();

			const aucun = await prof
				.from('chapter_checklist_items')
				.insert({ content: 'Aucun propriétaire' });
			expect(aucun.error).not.toBeNull();
		});

		it('le professeur lit le contenu de son modèle', async () => {
			const { data, error } = await prof
				.from('chapter_documents')
				.select('id')
				.eq('template_id', modele);
			expect(error).toBeNull();
			expect((data ?? []).map((r) => r.id)).toEqual(expect.arrayContaining([docFichier, docLien]));
		});
	});

	describe('lier un chapitre', () => {
		it('crée une ligne de lien par élément, non publiée, au contenu du modèle', async () => {
			const s = await lien('chapter_sections', chapA, section);
			expect(s).toMatchObject({ title: 'Cours', template_id: null });

			const d = await lien('chapter_documents', chapA, docFichier);
			expect(d).toMatchObject({
				title: 'Cours du second degré',
				source_type: 'upload',
				storage_path: cheminModele(),
				published_at: null,
				section_id: s!.id
			});

			expect(await lien('chapter_checklist_items', chapA, objectif)).toMatchObject({
				content: 'Je sais factoriser',
				published_at: null
			});
			expect(await lien('chapter_exercises', chapA, exercice)).not.toBeNull();
			expect(await lien('chapter_worksheets', chapA, fiche)).not.toBeNull();
			expect(await lien('chapter_series', chapA, serie)).toMatchObject({ form: 'interactive' });
		});

		it('ne copie aucun fichier : le lien pointe le fichier du modèle', async () => {
			const d = await lien('chapter_documents', chapB, docFichier);
			expect(d?.storage_path).toBe(cheminModele());
		});

		it('refuse une source qui n’est pas un élément de modèle', async () => {
			const propre = await insertAs(prof, 'chapter_checklist_items', {
				chapter_id: chapLibre,
				content: 'Objectif propre'
			});
			const r = await prof
				.from('chapter_checklist_items')
				.insert({ chapter_id: chapA, source_id: propre });
			expect(r.error).not.toBeNull();
		});

		it('refuse de relier un chapitre qui n’est pas lié au modèle', async () => {
			const r = await prof
				.from('chapter_checklist_items')
				.insert({ chapter_id: chapLibre, source_id: objectif });
			expect(r.error).not.toBeNull();
		});
	});

	describe('le chapitre décide pour sa classe', () => {
		it('publie et range son lien sans toucher l’autre classe', async () => {
			const d = await lien('chapter_documents', chapA, docFichier);
			const { data, error } = await prof
				.from('chapter_documents')
				.update({ published_at: PUBLIE, display_order: 7 })
				.eq('id', d!.id)
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);

			expect((await lien('chapter_documents', chapB, docFichier))?.published_at).toBeNull();
		});

		it('ne retouche pas le contenu d’une ligne de lien', async () => {
			const o = await lien('chapter_checklist_items', chapA, objectif);
			const r = await prof
				.from('chapter_checklist_items')
				.update({ content: 'Retouché pour la classe A' })
				.eq('id', o!.id);
			expect(r.error).not.toBeNull();
			expect((await lien('chapter_checklist_items', chapA, objectif))?.content).toBe(
				'Je sais factoriser'
			);
		});

		it('un élément masqué ne peut pas être publié', async () => {
			const o = await lien('chapter_checklist_items', chapB, objectif);
			const r = await prof
				.from('chapter_checklist_items')
				.update({ hidden: true, published_at: PUBLIE })
				.eq('id', o!.id);
			expect(r.error).not.toBeNull();

			const masque = await prof
				.from('chapter_checklist_items')
				.update({ hidden: true })
				.eq('id', o!.id)
				.select('id');
			expect(masque.error).toBeNull();
			expect(masque.data).toHaveLength(1);
		});
	});

	describe('corriger le modèle', () => {
		it('corrige aussitôt chaque chapitre lié, publication inchangée', async () => {
			const { error } = await prof
				.from('chapter_documents')
				.update({ title: 'Cours du second degré (corrigé)', file_name: 'plan-v2.pdf' })
				.eq('id', docFichier);
			expect(error).toBeNull();

			const a = await lien('chapter_documents', chapA, docFichier);
			const b = await lien('chapter_documents', chapB, docFichier);
			expect(a).toMatchObject({
				title: 'Cours du second degré (corrigé)',
				file_name: 'plan-v2.pdf'
			});
			expect(a?.published_at).not.toBeNull();
			expect(b).toMatchObject({ title: 'Cours du second degré (corrigé)', published_at: null });
		});
	});

	describe('détacher, puis ajouter au modèle', () => {
		it('un chapitre détaché ne reçoit plus les ajouts ; les liés les reçoivent non publiés', async () => {
			// Détacher C : ses lignes deviennent les siennes, l'instanciation est marquée.
			for (const table of [
				'chapter_documents',
				'chapter_checklist_items',
				'chapter_exercises',
				'chapter_worksheets',
				'chapter_series',
				'chapter_sections'
			]) {
				const r = await prof
					.from(table)
					.update({ source_id: null })
					.eq('chapter_id', chapC)
					.not('source_id', 'is', null);
				expect(r.error, `détacher ${table}`).toBeNull();
			}
			{
				const r = await prof
					.from('chapter_template_instantiations')
					.update({ is_detached: true })
					.eq('chapter_id', chapC)
					.select('id');
				expect(r.error).toBeNull();
				expect(r.data).toHaveLength(1);
			}

			const nouveau = await insertAs(prof, 'chapter_documents', {
				template_id: modele,
				title: 'Exercices corrigés',
				source_type: 'google_drive',
				google_drive_url: 'https://example.invalid/corriges',
				section_id: section,
				display_order: 2
			});

			const a = await lien('chapter_documents', chapA, nouveau);
			const sA = await lien('chapter_sections', chapA, section);
			expect(a).toMatchObject({
				title: 'Exercices corrigés',
				published_at: null,
				section_id: sA!.id
			});
			expect(await lien('chapter_documents', chapB, nouveau)).not.toBeNull();
			expect(await lien('chapter_documents', chapC, nouveau)).toBeNull();
		});

		it('une section ajoutée au modèle apparaît dans les chapitres liés', async () => {
			const s = await insertAs(prof, 'chapter_sections', {
				template_id: modele,
				title: 'Exercices',
				display_order: 1
			});
			expect(await lien('chapter_sections', chapA, s)).toMatchObject({ title: 'Exercices' });
			expect(await lien('chapter_sections', chapC, s)).toBeNull();
		});
	});

	describe('retirer, supprimer', () => {
		it('retirer : reste là où il était publié, disparaît ailleurs', async () => {
			const a = await lien('chapter_documents', chapA, docLien);
			await prof.from('chapter_documents').update({ published_at: PUBLIE }).eq('id', a!.id);

			const { error } = await prof
				.from('chapter_documents')
				.update({ retired_at: new Date().toISOString() })
				.eq('id', docLien);
			expect(error).toBeNull();

			expect(await lien('chapter_documents', chapA, docLien)).not.toBeNull();
			expect(await lien('chapter_documents', chapB, docLien)).toBeNull();
		});

		it('la base refuse de supprimer un élément relié par un chapitre', async () => {
			await prof.from('chapter_documents').delete().eq('id', docFichier);
			const { data } = await service.from('chapter_documents').select('id').eq('id', docFichier);
			expect(data).toHaveLength(1);
		});

		it('la base refuse de supprimer un modèle encore relié', async () => {
			await prof.from('chapter_templates').delete().eq('id', modele);
			const { data } = await service.from('chapter_templates').select('id').eq('id', modele);
			expect(data).toHaveLength(1);
		});
	});

	describe('accès', () => {
		it('l’élève lit le lien publié de sa classe, avec le contenu du modèle', async () => {
			const { data, error } = await eleveA
				.from('chapter_documents')
				.select('id, title, storage_path')
				.eq('chapter_id', chapA)
				.eq('source_id', docFichier);
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(data![0]).toMatchObject({ title: 'Cours du second degré (corrigé)' });
		});

		it('l’élève ne lit jamais le contenu du modèle lui-même', async () => {
			for (const eleve of [eleveA, eleveB]) {
				const { data, error } = await eleve
					.from('chapter_documents')
					.select('id')
					.eq('template_id', modele);
				expect(error).toBeNull();
				expect(data).toEqual([]);
			}
		});

		it('l’élève d’une classe qui n’a rien publié ne voit rien', async () => {
			const { data } = await eleveB.from('chapter_documents').select('id').eq('chapter_id', chapB);
			expect(data).toEqual([]);
		});

		it('l’anonyme ne voit ni le modèle ni les liens', async () => {
			const { data } = await anonyme
				.from('chapter_documents')
				.select('id')
				.or(`template_id.eq.${modele},chapter_id.eq.${chapA}`);
			expect(data ?? []).toEqual([]);
		});
	});

	describe('un élève n’écrit rien', () => {
		it('ne lie pas un chapitre à un modèle', async () => {
			const { error } = await eleveA.rpc('link_chapter_to_template', {
				p_chapter_id: chapLibre,
				p_template_id: modele
			});
			expect(error).not.toBeNull();
			const { data } = await service
				.from('chapter_template_instantiations')
				.select('id')
				.eq('chapter_id', chapLibre);
			expect(data).toEqual([]);
		});

		it('n’insère pas de ligne de lien ni d’élément de modèle', async () => {
			const lienEleve = await eleveA
				.from('chapter_checklist_items')
				.insert({ chapter_id: chapA, source_id: objectif });
			expect(lienEleve.error).not.toBeNull();
			const elementEleve = await eleveA
				.from('chapter_checklist_items')
				.insert({ template_id: modele, content: 'Ajout élève' });
			expect(elementEleve.error).not.toBeNull();
		});

		it('ne modifie ni une ligne de lien publiée ni le modèle', async () => {
			const d = await lien('chapter_documents', chapA, docFichier);
			const surLien = await eleveA
				.from('chapter_documents')
				.update({ published_at: null })
				.eq('id', d!.id)
				.select('id');
			expect(surLien.data ?? []).toEqual([]);
			const surModele = await eleveA
				.from('chapter_documents')
				.update({ title: 'Piraté' })
				.eq('id', docFichier)
				.select('id');
			expect(surModele.data ?? []).toEqual([]);
			expect((await lien('chapter_documents', chapA, docFichier))?.published_at).not.toBeNull();
		});

		it('ne liste ni ne téléverse sous templates/', async () => {
			for (const client of [eleveA, anonyme]) {
				const liste = await client.storage.from(BUCKET).list(`templates/${modele}`);
				expect(liste.data ?? []).toEqual([]);
				const envoi = await client.storage
					.from(BUCKET)
					.upload(`templates/${modele}/eleve.pdf`, new Blob(['%PDF'], { type: 'application/pdf' }));
				expect(envoi.error).not.toBeNull();
			}
		});
	});

	describe('fichiers du modèle', () => {
		it('le professeur téléverse et relit un fichier du modèle', async () => {
			const fichier = new Blob(['%PDF-1.4 modèle'], { type: 'application/pdf' });
			const up = await prof.storage.from(BUCKET).upload(cheminModele(), fichier, { upsert: true });
			expect(up.error).toBeNull();
			const down = await prof.storage.from(BUCKET).download(cheminModele());
			expect(down.error).toBeNull();
		});

		it('l’élève ne lit pas le stockage du modèle directement', async () => {
			const down = await eleveA.storage.from(BUCKET).download(cheminModele());
			expect(down.data).toBeNull();
		});

		it('supprimer un chapitre lié n’orpheline pas les fichiers du modèle', async () => {
			const { error } = await service.from('class_chapters').delete().eq('id', chapB);
			expect(error).toBeNull();
			const { data } = await service
				.from('orphaned_documents')
				.select('id')
				.eq('original_chapter_id', chapB);
			expect(data).toEqual([]);
		});
	});
});
