/**
 * Adopter : un élément propre au chapitre devient un lien vers le modèle (base locale requise)
 * ============================================================================================
 *
 * ADR 0029, étape 3a. Quand un chapitre devient la source d'un modèle (« Faire un modèle », et la
 * reprise du chapitre de 1SPE du 2026-09-13), ses éléments deviennent des lignes de lien SANS
 * CHANGER D'IDENTIFIANT : les cases cochées des élèves (`student_checklist_progress`) et les dates
 * de publication restent. Le contenu est alors celui du modèle.
 *
 * L'adoption n'est permise que vers un élément d'un modèle auquel le chapitre est lié (non
 * détaché) ; ailleurs, la garde de l'étape 2 tient toujours.
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

const PUBLIE = new Date(Date.now() - 3600_000).toISOString();

const service = createServiceRoleClient();
/** Sans le schéma généré : tables désignées par leur nom. */
const serviceBrut = service as unknown as SupabaseClient;

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

async function ligne(table: string, id: string): Promise<Record<string, unknown> | null> {
	const { data } = await serviceBrut.from(table).select('*').eq('id', id).maybeSingle();
	return data as Record<string, unknown> | null;
}

describe('ADR 0029 — adopter un élément du chapitre dans le modèle', () => {
	let prof: SupabaseClient;
	let eleveId: string;
	let modele: string;
	let autreModele: string;
	let chapitre: string;
	let chapitreLibre: string;

	/** Élément propre au chapitre, publié, coché par un élève. */
	let objectifPropre: string;
	let objectifModele: string;
	let documentPropre: string;
	let documentModele: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const p = await TestData.profile().withRole('teacher').create();
		prof = await signIn(p.email);

		const ecole = await insertAs(serviceBrut, 'schools', {
			name: 'Lycée adoption YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insertAs(serviceBrut, 'school_years', {
			school_id: ecole,
			name: 'Année adoption YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insertAs(serviceBrut, 'classes', {
			name: '1SPE adoption YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYADO1',
			is_active: true
		});
		const eleve = await TestData.profile().withRole('student').create();
		eleveId = eleve.id;
		await serviceBrut
			.from('class_members')
			.insert({ class_id: classe, student_id: eleveId, status: 'active' });

		const chap = (titre: string) =>
			insertAs(serviceBrut, 'class_chapters', {
				class_id: classe,
				title: titre,
				display_order: 1,
				is_visible: true
			});
		chapitre = await chap('Chapitre source YY');
		chapitreLibre = await chap('Chapitre sans modèle YY');

		// Le chapitre tel qu'il vit aujourd'hui : du contenu propre, publié, coché.
		objectifPropre = await insertAs(prof, 'chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Je sais résoudre',
			display_order: 3,
			published_at: PUBLIE
		});
		await serviceBrut.from('student_checklist_progress').insert({
			student_id: eleveId,
			checklist_item_id: objectifPropre,
			is_completed: true
		});
		documentPropre = await insertAs(prof, 'chapter_documents', {
			chapter_id: chapitre,
			title: 'Cours',
			source_type: 'upload',
			storage_path: `chapters/${chapitre}/cours.pdf`,
			file_name: 'cours.pdf',
			display_order: 1,
			published_at: PUBLIE
		});

		// Le modèle, fait de ce contenu (copie, fichier chez le modèle), AVANT le lien :
		// aucune ligne de lien n'est diffusée tant que le chapitre n'est pas lié.
		modele = await insertAs(prof, 'chapter_templates', {
			created_by: p.id,
			title: 'Modèle adoption YY'
		});
		autreModele = await insertAs(prof, 'chapter_templates', {
			created_by: p.id,
			title: 'Autre modèle YY'
		});
		objectifModele = await insertAs(prof, 'chapter_checklist_items', {
			template_id: modele,
			content: 'Je sais résoudre',
			display_order: 0
		});
		documentModele = await insertAs(prof, 'chapter_documents', {
			template_id: modele,
			title: 'Cours',
			source_type: 'upload',
			storage_path: `templates/${modele}/cours.pdf`,
			file_name: 'cours.pdf',
			display_order: 0
		});

		await insertAs(prof, 'chapter_template_instantiations', {
			template_id: modele,
			chapter_id: chapitre
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('refuse d’adopter vers un modèle auquel le chapitre n’est pas lié', async () => {
		const autre = await insertAs(prof, 'chapter_checklist_items', {
			template_id: autreModele,
			content: 'Autre objectif'
		});
		const r = await prof
			.from('chapter_checklist_items')
			.update({ source_id: autre })
			.eq('id', objectifPropre);
		expect(r.error).not.toBeNull();
	});

	it('refuse d’adopter dans un chapitre sans modèle', async () => {
		const propre = await insertAs(prof, 'chapter_checklist_items', {
			chapter_id: chapitreLibre,
			content: 'Objectif libre'
		});
		const r = await prof
			.from('chapter_checklist_items')
			.update({ source_id: objectifModele })
			.eq('id', propre);
		expect(r.error).not.toBeNull();
	});

	it('refuse d’adopter vers un élément qui n’est pas de modèle', async () => {
		const r = await prof
			.from('chapter_documents')
			.update({ source_id: objectifPropre })
			.eq('id', documentPropre);
		expect(r.error).not.toBeNull();
	});

	it('refuse d’adopter un élément retiré du modèle', async () => {
		const retire = await insertAs(prof, 'chapter_checklist_items', {
			template_id: modele,
			content: 'Objectif retiré'
		});
		await prof
			.from('chapter_checklist_items')
			.update({ retired_at: new Date().toISOString() })
			.eq('id', retire);
		const propre = await insertAs(prof, 'chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif propre'
		});
		const r = await prof
			.from('chapter_checklist_items')
			.update({ source_id: retire })
			.eq('id', propre);
		expect(r.error).not.toBeNull();
	});

	it('une ligne du modèle ne se transforme pas en lien', async () => {
		const r = await prof
			.from('chapter_checklist_items')
			.update({ template_id: null, chapter_id: chapitre, source_id: objectifModele })
			.eq('id', objectifModele);
		expect(r.error).not.toBeNull();
		expect((await ligne('chapter_checklist_items', objectifModele))?.template_id).toBe(modele);
	});

	it('adopte : même identifiant, publication et ordre gardés, contenu du modèle', async () => {
		const r = await prof
			.from('chapter_documents')
			.update({ source_id: documentModele })
			.eq('id', documentPropre)
			.select('id');
		expect(r.error).toBeNull();
		expect(r.data).toHaveLength(1);

		const d = await ligne('chapter_documents', documentPropre);
		expect(d).toMatchObject({
			source_id: documentModele,
			storage_path: `templates/${modele}/cours.pdf`,
			display_order: 1
		});
		expect(d?.published_at).not.toBeNull();
	});

	it('adopte un objectif sans perdre la case cochée de l’élève', async () => {
		const r = await prof
			.from('chapter_checklist_items')
			.update({ source_id: objectifModele })
			.eq('id', objectifPropre)
			.select('id');
		expect(r.error).toBeNull();
		expect(r.data).toHaveLength(1);

		const { data } = await service
			.from('student_checklist_progress')
			.select('is_completed')
			.eq('checklist_item_id', objectifPropre)
			.eq('student_id', eleveId);
		expect(data).toEqual([{ is_completed: true }]);
	});

	it('une fois adopté, l’élément suit le modèle et ne se retouche plus', async () => {
		await prof
			.from('chapter_checklist_items')
			.update({ content: 'Je sais résoudre une équation' })
			.eq('id', objectifModele);
		expect((await ligne('chapter_checklist_items', objectifPropre))?.content).toBe(
			'Je sais résoudre une équation'
		);

		const r = await prof
			.from('chapter_checklist_items')
			.update({ content: 'Retouché' })
			.eq('id', objectifPropre);
		expect(r.error).not.toBeNull();
	});

	it('un second élément ne peut pas adopter le même élément du modèle', async () => {
		const doublon = await insertAs(prof, 'chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Doublon'
		});
		const r = await prof
			.from('chapter_checklist_items')
			.update({ source_id: objectifModele })
			.eq('id', doublon);
		expect(r.error).not.toBeNull();
	});
});
