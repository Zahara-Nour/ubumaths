/**
 * Une section masquée se garde aussi côté serveur (base locale requise)
 * =====================================================================
 *
 * Décision de David du 2026-10-14 : masquer une section masque — donc dépublie —
 * tout ce qu'elle contient. L'interface empêchait déjà d'y ranger un élément ou
 * d'y réafficher un élément seul ; le serveur, lui, le laissait faire : un élément
 * visible pouvait naître dans une section masquée, et devenir publiable.
 *
 *  - ranger un élément VISIBLE dans une section masquée : refusé ;
 *  - réordonner les éléments déjà masqués d'une section masquée : permis ;
 *  - réafficher seul un élément du modèle dont la section est masquée : refusé ;
 *    réafficher la section d'abord, puis l'élément : permis.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { assignToSection, placeInSection } from '$lib/server/chapter-sections';
import { setLinkedElementHidden } from '$lib/server/chapters-publication';

/** Sans le schéma généré pour les insertions de décor. */
const service = createServiceRoleClient() as unknown as SupabaseClient;

async function insert(
	client: SupabaseClient,
	table: string,
	row: Record<string, unknown>
): Promise<string> {
	const { data, error } = await client.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

async function lien(table: string, chapitre: string, source: string): Promise<string> {
	const { data } = await service
		.from(table)
		.select('id')
		.eq('chapter_id', chapitre)
		.eq('source_id', source)
		.single();
	return (data as { id: string }).id;
}

describe('sections masquées : gardes du serveur', () => {
	let prof: SupabaseClient<Database>;
	let chapitre: string;
	let sectionMasquee: string;
	let sectionVisible: string;
	/** Élément propre au chapitre, visible, dans la section visible. */
	let objectifVisible: string;
	/** Lien vers un élément du modèle, rangé dans la section du modèle (masquée). */
	let docLie: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const p = await TestData.profile().withRole('teacher').create();
		prof = await createAuthenticatedClient(p.email);
		const profBrut = prof as unknown as SupabaseClient;

		const ecole = await insert(service, 'schools', {
			name: 'Lycée sections YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert(service, 'school_years', {
			school_id: ecole,
			name: 'Année sections YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert(service, 'classes', {
			name: '1SPE sections YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYSMS1',
			is_active: true
		});
		chapitre = await insert(service, 'class_chapters', {
			class_id: classe,
			title: 'Chapitre sections YY',
			display_order: 1,
			is_visible: true
		});

		const modele = await insert(profBrut, 'chapter_templates', {
			created_by: p.id,
			title: 'Modèle sections YY',
			status: 'published'
		});
		const sectionModele = await insert(profBrut, 'chapter_sections', {
			template_id: modele,
			title: 'Approfondissement',
			display_order: 0
		});
		const docModele = await insert(profBrut, 'chapter_documents', {
			template_id: modele,
			title: 'Pour aller plus loin',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/loin',
			section_id: sectionModele,
			display_order: 0
		});
		const { error } = await profBrut.rpc('link_chapter_to_template', {
			p_chapter_id: chapitre,
			p_template_id: modele
		});
		expect(error).toBeNull();

		sectionMasquee = await lien('chapter_sections', chapitre, sectionModele);
		docLie = await lien('chapter_documents', chapitre, docModele);
		sectionVisible = await insert(profBrut, 'chapter_sections', {
			chapter_id: chapitre,
			title: 'Exercices',
			display_order: 1
		});
		objectifVisible = await insert(profBrut, 'chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Je sais factoriser',
			section_id: sectionVisible
		});

		// La section du modèle est masquée : son document lié l'est aussi.
		const masque = await profBrut
			.from('chapter_sections')
			.update({ hidden: true })
			.eq('id', sectionMasquee)
			.select('id');
		expect(masque.data).toHaveLength(1);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('refuse de ranger un élément visible dans une section masquée', async () => {
		const r = await assignToSection(
			chapitre,
			sectionMasquee,
			[{ kind: 'checklistItem', id: objectifVisible, sectionOrder: 0 }],
			prof
		);
		expect(r.error).not.toBeNull();
		expect(r.hiddenSection).toBe(true);
		const { data } = await service
			.from('chapter_checklist_items')
			.select('section_id')
			.eq('id', objectifVisible)
			.single();
		expect((data as { section_id: string }).section_id).toBe(sectionVisible);
	});

	it('placeInSection refuse aussi une section masquée', async () => {
		const r = await placeInSection(
			chapitre,
			sectionMasquee,
			'checklistItem',
			objectifVisible,
			prof
		);
		expect(r.error).not.toBeNull();
	});

	it('réordonner un élément déjà masqué dans sa section masquée reste permis', async () => {
		const r = await assignToSection(
			chapitre,
			sectionMasquee,
			[{ kind: 'document', id: docLie, sectionOrder: 3 }],
			prof
		);
		expect(r.error).toBeNull();
	});

	it('refuse de réafficher seul un élément dont la section est masquée', async () => {
		const r = await setLinkedElementHidden(
			{ chapterId: chapitre, contentType: 'document', itemId: docLie, hidden: false },
			prof
		);
		expect(r.error).not.toBeNull();
		expect(r.sectionHidden).toBe(true);
		const { data } = await service
			.from('chapter_documents')
			.select('hidden')
			.eq('id', docLie)
			.single();
		expect((data as { hidden: boolean }).hidden).toBe(true);
	});

	it('section réaffichée : l’élément se masque et se réaffiche à nouveau', async () => {
		const r1 = await (prof as unknown as SupabaseClient)
			.from('chapter_sections')
			.update({ hidden: false })
			.eq('id', sectionMasquee)
			.select('id');
		expect(r1.data).toHaveLength(1);

		const masquer = await setLinkedElementHidden(
			{ chapterId: chapitre, contentType: 'document', itemId: docLie, hidden: true },
			prof
		);
		expect(masquer.error).toBeNull();
		const reafficher = await setLinkedElementHidden(
			{ chapterId: chapitre, contentType: 'document', itemId: docLie, hidden: false },
			prof
		);
		expect(reafficher.error).toBeNull();
	});
});
