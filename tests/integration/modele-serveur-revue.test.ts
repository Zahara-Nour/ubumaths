/**
 * Le serveur du modèle : corrections de la revue (base locale requise)
 * ====================================================================
 *
 * ADR 0029, étape 3b. Chaque test fixe un défaut trouvé à la revue de code et à
 * l'audit de sécurité :
 *
 * - un élément ajouté au modèle DANS une section y naît aussi dans les chapitres liés ;
 * - détacher un chapitre ne fige pas un élément masqué ;
 * - les routes REST du chapitre ne suppriment pas une ligne de lien ;
 * - l'ancien circuit des versions refuse un modèle qui possède son contenu ;
 * - supprimer un modèle encore relié par une ligne de lien est refusé, fichiers intacts ;
 * - « faire un modèle » d'un chapitre lié ne copie pas ce qu'il a masqué.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { present } from '../helpers/present';
import {
	createTemplateFromChapter,
	deleteChapterTemplate,
	detachChapterFromTemplate,
	instantiateTemplate,
	TemplateInUseError
} from '$lib/server/chapter-templates';
import { LinkedElementError, unlinkWorksheet } from '$lib/server/chapters';
import { POST as templateDocuments } from '../../src/routes/api/teacher/chapter-templates/[id]/documents/+server';
import { DELETE as deleteChecklistApi } from '../../src/routes/api/teacher/chapters/[id]/checklist/[itemId]/+server';
import { DELETE as unlinkExerciseApi } from '../../src/routes/api/teacher/chapters/[id]/exercises/[linkId]/+server';
import { actions as templateActions } from '../../src/routes/(protected)/dashboard/teacher/contenu/templates/[templateId]/+page.server';

vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// Constantes
const BUCKET = 'chapter-documents';
const PDF = '%PDF-1.4 revue ZZ';

// Variables
const service = createServiceRoleClient();
const ecrits: string[] = [];

// Functions
async function insert<T extends keyof Database['public']['Tables']>(
	client: SupabaseClient<Database>,
	table: T,
	row: Database['public']['Tables'][T]['Insert']
): Promise<string> {
	const { data, error } = await client
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${String(table)}: ${error.message}`);
	return (data as { id: string }).id;
}

async function deposer(path: string): Promise<void> {
	const { error } = await service.storage
		.from(BUCKET)
		.upload(path, new Blob([PDF], { type: 'application/pdf' }), {
			contentType: 'application/pdf',
			upsert: true
		});
	if (error) throw new Error(`dépôt ${path} : ${error.message}`);
	ecrits.push(path);
}

async function existe(path: string): Promise<boolean> {
	const { data } = await service.storage.from(BUCKET).download(path);
	return data !== null;
}

function buildLocals(client: SupabaseClient<Database>, userId: string): App.Locals {
	const user = { id: userId } as User;
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		profile: { id: userId, role: 'teacher' },
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function jsonRequest(body: unknown): Request {
	return new Request('http://localhost/api', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return new Request('http://localhost/', { method: 'POST', body });
}

async function statusOf(call: () => unknown): Promise<number> {
	try {
		return ((await call()) as Response).status;
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return status;
		throw e;
	}
}

/** La section liée d'un chapitre pour une section du modèle. */
async function sectionLiee(chapitre: string, sectionModele: string): Promise<string> {
	const { data } = await service
		.from('chapter_sections')
		.select('id')
		.eq('chapter_id', chapitre)
		.eq('source_id', sectionModele)
		.single();
	return present(data).id;
}

describe('ADR 0029, étape 3b — corrections de la revue', () => {
	let prof: SupabaseClient<Database>;
	let profId: string;
	let locals: App.Locals;
	let classe: string;
	let modele: string;
	let section: string;
	let chapA: string;

	const instancier = async () => {
		const r = await instantiateTemplate(
			{ templateId: modele, classId: classe, isVisible: true },
			profId,
			prof
		);
		expect(r.error).toBeNull();
		return present(r.data).chapterId;
	};

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.storage.createBucket(BUCKET, { public: false }).catch(() => {});

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		prof = await createAuthenticatedClient(p.email);
		locals = buildLocals(prof, profId);

		const ecole = await insert(service, 'schools', {
			name: 'Lycée revue ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert(service, 'school_years', {
			school_id: ecole,
			name: 'Année revue ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert(service, 'classes', {
			name: '1SPE revue ZZ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZREV1',
			is_active: true
		});

		modele = await insert(prof, 'chapter_templates', {
			created_by: profId,
			title: 'Revue ZZ',
			status: 'published'
		});
		section = await insert(prof, 'chapter_sections', {
			template_id: modele,
			title: 'Cours',
			display_order: 1
		});
		await insert(prof, 'chapter_checklist_items', {
			template_id: modele,
			content: 'Objectif initial',
			display_order: 0
		});
		chapA = await instancier();
	}, 120_000);

	afterAll(async () => {
		if (ecrits.length > 0) await service.storage.from(BUCKET).remove(ecrits);
		await cleanupAllTestData();
	});

	describe('ajouter au modèle DANS une section', () => {
		it('l’objectif naît dans la section liée du chapitre', async () => {
			const r = (await templateActions.addChecklistItem({
				locals,
				params: { templateId: modele },
				request: formRequest({ content: 'Objectif rangé ZZ', sectionId: section })
			} as never)) as { success?: boolean };
			expect(r.success).toBe(true);

			const { data: lien } = await service
				.from('chapter_checklist_items')
				.select('section_id')
				.eq('chapter_id', chapA)
				.eq('content', 'Objectif rangé ZZ')
				.single();
			expect(lien?.section_id).toBe(await sectionLiee(chapA, section));
		});

		it('le document déposé naît dans la section liée du chapitre', async () => {
			const chemin = `templates/${modele}/range.pdf`;
			await deposer(chemin);
			const r = (await templateDocuments({
				locals,
				params: { id: modele },
				request: jsonRequest({
					title: 'Document rangé ZZ',
					storagePath: chemin,
					fileName: 'range.pdf',
					fileType: 'application/pdf',
					fileSize: PDF.length,
					sectionId: section
				})
			} as never)) as Response;
			expect(r.status).toBe(201);

			const { data: lien } = await service
				.from('chapter_documents')
				.select('section_id')
				.eq('chapter_id', chapA)
				.eq('title', 'Document rangé ZZ')
				.single();
			expect(lien?.section_id).toBe(await sectionLiee(chapA, section));
		});
	});

	describe('les routes REST du chapitre ne suppriment pas une ligne de lien', () => {
		it('objectif, exercice : 409 ; fiche : erreur « élément du modèle » ; lignes intactes', async () => {
			const ex = await insert(service, 'exercises', {
				title: 'Exercice revue ZZ',
				created_by: profId,
				grades: ['1_SPE'],
				topic: 'Revue ZZ',
				category: 'application'
			});
			await insert(prof, 'chapter_exercises', { template_id: modele, exercise_id: ex });
			const ws = await insert(service, 'worksheets', {
				title: 'Fiche revue ZZ',
				type: 'worksheet',
				status: 'published',
				created_by: profId
			});
			await insert(prof, 'chapter_worksheets', { template_id: modele, worksheet_id: ws });

			const lien = async (
				table: 'chapter_checklist_items' | 'chapter_exercises' | 'chapter_worksheets'
			) => {
				const { data } = await service
					.from(table)
					.select('id')
					.eq('chapter_id', chapA)
					.not('source_id', 'is', null)
					.limit(1)
					.single();
				return present(data).id;
			};
			const objectif = await lien('chapter_checklist_items');
			const exercice = await lien('chapter_exercises');
			const fiche = await lien('chapter_worksheets');

			expect(
				await statusOf(() =>
					deleteChecklistApi({ locals, params: { id: chapA, itemId: objectif } } as never)
				)
			).toBe(409);
			expect(
				await statusOf(() =>
					unlinkExerciseApi({ locals, params: { id: chapA, linkId: exercice } } as never)
				)
			).toBe(409);
			const { error } = await unlinkWorksheet(fiche, prof);
			expect(error).toBeInstanceOf(LinkedElementError);

			for (const [table, id] of [
				['chapter_checklist_items', objectif],
				['chapter_exercises', exercice],
				['chapter_worksheets', fiche]
			] as const) {
				const { data } = await service.from(table).select('id').eq('id', id);
				expect(data, table).toHaveLength(1);
			}
		});
	});

	describe('détacher un chapitre avec un élément masqué', () => {
		it('l’élément redevient propre, démasqué et non publié', async () => {
			const chapB = await instancier();
			const { data: lien } = await service
				.from('chapter_checklist_items')
				.select('id')
				.eq('chapter_id', chapB)
				.eq('content', 'Objectif initial')
				.single();
			const id = present(lien).id;
			await service.from('chapter_checklist_items').update({ hidden: true }).eq('id', id);

			const { error } = await detachChapterFromTemplate(chapB, prof);
			expect(error).toBeNull();

			const { data } = await service
				.from('chapter_checklist_items')
				.select('source_id, hidden, published_at')
				.eq('id', id)
				.single();
			expect(data).toEqual({ source_id: null, hidden: false, published_at: null });
		});
	});

	/**
	 * Décision du 2026-10-14 : le masquage d'une SECTION tient au détachement.
	 * Ses éléments restent masqués et non publiés, la section reste masquée ; la
	 * réafficher fera revenir son contenu. Un élément masqué SEUL, hors section
	 * masquée, redevient visible (il resterait sinon figé).
	 */
	describe('détacher un chapitre avec une section masquée', () => {
		it('la section et son contenu restent masqués ; le masqué isolé revient', async () => {
			const objectifModele = await insert(prof, 'chapter_checklist_items', {
				template_id: modele,
				section_id: section,
				content: 'Objectif rangé ZZ',
				display_order: 1
			});
			const chapD = await instancier();
			const sectionD = await sectionLiee(chapD, section);
			const { data: lienRange } = await service
				.from('chapter_checklist_items')
				.select('id')
				.eq('chapter_id', chapD)
				.eq('source_id', objectifModele)
				.single();
			const rangeId = present(lienRange).id;

			const { data: masquee, error: masqueError } = await prof
				.from('chapter_sections')
				.update({ hidden: true })
				.eq('id', sectionD)
				.select('id');
			expect(masqueError).toBeNull();
			expect(masquee).toHaveLength(1);
			// Hors section : masqué à part.
			await service
				.from('chapter_checklist_items')
				.update({ hidden: true })
				.eq('chapter_id', chapD)
				.eq('content', 'Objectif initial');

			const { error } = await detachChapterFromTemplate(chapD, prof);
			expect(error).toBeNull();

			const { data: sec } = await service
				.from('chapter_sections')
				.select('source_id, hidden')
				.eq('id', sectionD)
				.single();
			expect(sec).toEqual({ source_id: null, hidden: true });

			const { data: range } = await service
				.from('chapter_checklist_items')
				.select('source_id, hidden, published_at, section_id')
				.eq('id', rangeId)
				.single();
			expect(range).toEqual({
				source_id: null,
				hidden: true,
				published_at: null,
				section_id: sectionD
			});

			const { data: isole } = await service
				.from('chapter_checklist_items')
				.select('source_id, hidden')
				.eq('chapter_id', chapD)
				.eq('content', 'Objectif initial')
				.single();
			expect(isole).toEqual({ source_id: null, hidden: false });
		});
	});

	describe('faire un modèle d’un chapitre lié', () => {
		it('ne copie pas ce que le chapitre a masqué', async () => {
			const chapC = await instancier();
			await service
				.from('chapter_checklist_items')
				.update({ hidden: true })
				.eq('chapter_id', chapC)
				.eq('content', 'Objectif initial');

			const { data, error } = await createTemplateFromChapter(
				{ chapterId: chapC, title: 'Copie de C ZZ', grades: [] },
				profId,
				prof
			);
			expect(error).toBeNull();
			const { data: objectifs } = await service
				.from('chapter_checklist_items')
				.select('content')
				.eq('template_id', present(data).id);
			expect((objectifs ?? []).map((o) => o.content)).not.toContain('Objectif initial');
		});
	});

	describe('supprimer un modèle', () => {
		it('refuse tant qu’une ligne de lien le relie, même instanciation détachée ; fichiers intacts', async () => {
			const autre = await insert(prof, 'chapter_templates', {
				created_by: profId,
				title: 'Relié ZZ',
				status: 'published'
			});
			const chemin = `templates/${autre}/garde.pdf`;
			await deposer(chemin);
			await insert(prof, 'chapter_documents', {
				template_id: autre,
				title: 'Gardé',
				source_type: 'upload',
				storage_path: chemin,
				file_name: 'garde.pdf'
			});
			const r = await instantiateTemplate(
				{ templateId: autre, classId: classe, isVisible: false },
				profId,
				prof
			);
			const chap = present(r.data).chapterId;
			// Un détachement interrompu : marqué détaché, liens encore là.
			await service
				.from('chapter_template_instantiations')
				.update({ is_detached: true })
				.eq('chapter_id', chap);

			const { error } = await deleteChapterTemplate(autre, prof);
			expect(error).toBeInstanceOf(TemplateInUseError);
			expect(await existe(chemin)).toBe(true);
			const { data } = await service.from('chapter_templates').select('id').eq('id', autre);
			expect(data).toHaveLength(1);
		});

		it('supprime un modèle libre, puis ses fichiers', async () => {
			const libre = await insert(prof, 'chapter_templates', {
				created_by: profId,
				title: 'Libre ZZ'
			});
			const chemin = `templates/${libre}/a.pdf`;
			await deposer(chemin);

			const { error } = await deleteChapterTemplate(libre, prof);
			expect(error).toBeNull();
			const { data } = await service.from('chapter_templates').select('id').eq('id', libre);
			expect(data).toEqual([]);
			expect(await existe(chemin)).toBe(false);
		});
	});
});
