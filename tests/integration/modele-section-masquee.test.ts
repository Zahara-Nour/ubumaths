/**
 * Masquer une section dans un chapitre (base locale requise)
 * ==========================================================
 *
 * ADR 0029, décision de David du 2026-10-14 : une section se masque comme un élément
 * (« pas ce chapitre-là cette année »). Masquer une section masque — donc dépublie — tout
 * ce qu'elle contient ; la réafficher fait revenir son contenu, non publié. Un élément que
 * le modèle ajoute plus tard dans une section masquée arrive masqué.
 *
 * Une section du MODÈLE ne se masque pas (le masquage est une décision de classe).
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

const serviceBrut = createServiceRoleClient() as unknown as SupabaseClient;

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

async function lien(table: string, chapitre: string, source: string) {
	const { data } = await serviceBrut
		.from(table)
		.select('*')
		.eq('chapter_id', chapitre)
		.eq('source_id', source)
		.maybeSingle();
	return data as Record<string, unknown> | null;
}

describe('ADR 0029 — masquer une section dans un chapitre', () => {
	let prof: SupabaseClient;
	let modele: string;
	let chapitre: string;
	let sectionModele: string;
	let sectionLiee: string;
	let docModele: string;
	let docLie: string;
	let objectifPropre: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const p = await TestData.profile().withRole('teacher').create();
		prof = await signIn(p.email);

		const ecole = await insertAs(serviceBrut, 'schools', {
			name: 'Lycée section YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insertAs(serviceBrut, 'school_years', {
			school_id: ecole,
			name: 'Année section YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insertAs(serviceBrut, 'classes', {
			name: '1SPE section YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYSEC1',
			is_active: true
		});
		chapitre = await insertAs(serviceBrut, 'class_chapters', {
			class_id: classe,
			title: 'Chapitre section YY',
			display_order: 1,
			is_visible: true
		});

		modele = await insertAs(prof, 'chapter_templates', {
			created_by: p.id,
			title: 'Modèle section YY',
			status: 'published'
		});
		sectionModele = await insertAs(prof, 'chapter_sections', {
			template_id: modele,
			title: 'Approfondissement',
			display_order: 0
		});
		docModele = await insertAs(prof, 'chapter_documents', {
			template_id: modele,
			title: 'Pour aller plus loin',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/plus-loin',
			section_id: sectionModele,
			display_order: 0
		});

		const { error } = await prof.rpc('link_chapter_to_template', {
			p_chapter_id: chapitre,
			p_template_id: modele
		});
		expect(error).toBeNull();

		sectionLiee = (await lien('chapter_sections', chapitre, sectionModele))!.id as string;
		docLie = (await lien('chapter_documents', chapitre, docModele))!.id as string;
		await prof.from('chapter_documents').update({ published_at: PUBLIE }).eq('id', docLie);

		// Un élément PROPRE à la classe, rangé dans la section du modèle, publié.
		objectifPropre = await insertAs(prof, 'chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif de la classe',
			section_id: sectionLiee,
			published_at: PUBLIE
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('une section du modèle ne se masque pas', async () => {
		const r = await prof.from('chapter_sections').update({ hidden: true }).eq('id', sectionModele);
		expect(r.error).not.toBeNull();
	});

	it('masquer la section masque et dépublie tout ce qu’elle contient', async () => {
		const r = await prof
			.from('chapter_sections')
			.update({ hidden: true })
			.eq('id', sectionLiee)
			.select('id');
		expect(r.error).toBeNull();
		expect(r.data).toHaveLength(1);

		expect(await ligne('chapter_documents', docLie)).toMatchObject({
			hidden: true,
			published_at: null
		});
		expect(await ligne('chapter_checklist_items', objectifPropre)).toMatchObject({
			hidden: true,
			published_at: null
		});
	});

	it('un élément ajouté au modèle dans une section masquée arrive masqué', async () => {
		const nouveau = await insertAs(prof, 'chapter_documents', {
			template_id: modele,
			title: 'Exercices difficiles',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/difficiles',
			section_id: sectionModele,
			display_order: 1
		});
		expect(await lien('chapter_documents', chapitre, nouveau)).toMatchObject({
			section_id: sectionLiee,
			hidden: true,
			published_at: null
		});
	});

	it('réafficher la section fait revenir son contenu, non publié', async () => {
		const r = await prof
			.from('chapter_sections')
			.update({ hidden: false })
			.eq('id', sectionLiee)
			.select('id');
		expect(r.error).toBeNull();
		expect(r.data).toHaveLength(1);

		expect(await ligne('chapter_documents', docLie)).toMatchObject({
			hidden: false,
			published_at: null
		});
		expect(await ligne('chapter_checklist_items', objectifPropre)).toMatchObject({
			hidden: false,
			published_at: null
		});
	});
});
