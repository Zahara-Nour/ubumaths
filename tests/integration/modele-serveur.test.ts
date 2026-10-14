/**
 * Le modèle possède son contenu : la logique serveur (base locale requise)
 * =========================================================================
 *
 * ADR 0029, étape 3b (docs/wip/refonte-modeles-chapitre-progress.md). Ce que le
 * SERVEUR fait par-dessus les gardes de la base (étape 2, `modele-possede-son-contenu`) :
 * éditer le contenu d'un modèle, l'instancier par un lien, retirer un élément,
 * détacher un chapitre en copiant ses fichiers, refuser la suppression d'un
 * modèle relié, faire un modèle d'un chapitre en ADOPTANT ses éléments, servir
 * un fichier de modèle à l'élève après la garde de publication.
 *
 * Tout passe par les droits RÉELS du professeur et des élèves (RLS, règles de
 * stockage, déclencheurs) ; le service ne sert qu'au décor et aux constats.
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
	createSection,
	listSections,
	renameSection,
	placeInSection
} from '$lib/server/chapter-sections';
import { listTemplateContent, retireTemplateElement } from '$lib/server/template-content';
import {
	createTemplateFromChapter,
	deleteChapterTemplate,
	detachChapterFromTemplate,
	instantiateTemplate,
	TemplateInUseError,
	TemplateUnusableError
} from '$lib/server/chapter-templates';
import { POST as templateUploadUrl } from '../../src/routes/api/teacher/chapter-templates/[id]/document-upload-url/+server';
import { POST as templateDocuments } from '../../src/routes/api/teacher/chapter-templates/[id]/documents/+server';
import { GET as serveDocument } from '../../src/routes/api/documents/[id]/+server';
import { DELETE as deleteChapterDocumentApi } from '../../src/routes/api/teacher/chapters/[id]/documents/[docId]/+server';
import { actions as chapterActions } from '../../src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server';

// Le client service des modules serveur lit process.env (qui peut viser la prod
// via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// Constantes
const BUCKET = 'chapter-documents';
const PUBLIE = new Date(Date.now() - 3600_000).toISOString();
const PDF = '%PDF-1.4 modèle serveur ZZ';

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

function buildLocals(
	client: SupabaseClient<Database>,
	userId: string,
	role: 'teacher' | 'student'
): App.Locals {
	const user = { id: userId } as User;
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		profile: { id: userId, role },
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

/** Le statut d'une route, qu'elle réponde ou qu'elle lève `error()`. */
async function statusOf(call: () => unknown): Promise<number> {
	try {
		return ((await call()) as Response).status;
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return status;
		throw e;
	}
}

/** La ligne de lien d'un chapitre vers un élément du modèle. */
async function lienDocument(chapitre: string, source: string) {
	const { data, error } = await service
		.from('chapter_documents')
		.select('*')
		.eq('chapter_id', chapitre)
		.eq('source_id', source)
		.maybeSingle();
	expect(error).toBeNull();
	return data;
}

describe('ADR 0029, étape 3b — le serveur du modèle', () => {
	let prof: SupabaseClient<Database>;
	let profId: string;
	let eleveA: SupabaseClient<Database>;
	let eleveAId: string;
	let eleveB: SupabaseClient<Database>;
	let eleveBId: string;
	let classeA: string;
	let classeB: string;
	let localsProf: App.Locals;

	/** Modèle publié, instancié en A et en B. */
	let modele: string;
	let sectionCours: string;
	let docCours: string;
	let objectif: string;
	let chapA: string;
	let chapB: string;
	const cheminCours = () => `templates/${modele}/cours.pdf`;

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.storage.createBucket(BUCKET, { public: false }).catch(() => {});

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		prof = await createAuthenticatedClient(p.email);
		localsProf = buildLocals(prof, profId, 'teacher');

		const ecole = await insert(service, 'schools', {
			name: 'Lycée serveur ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert(service, 'school_years', {
			school_id: ecole,
			name: 'Année serveur ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = (nom: string, code: string) =>
			insert(service, 'classes', {
				name: nom,
				school_id: ecole,
				school_year_id: annee,
				join_code: code,
				is_active: true
			});
		classeA = await classe('1SPE serveur A ZZ', 'ZZSRA1');
		classeB = await classe('1SPE serveur B ZZ', 'ZZSRB1');

		const eleve = async (classeId: string) => {
			const e = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classeId, student_id: e.id, status: 'active' });
			expect(error).toBeNull();
			return { id: e.id, client: await createAuthenticatedClient(e.email) };
		};
		({ id: eleveAId, client: eleveA } = await eleve(classeA));
		({ id: eleveBId, client: eleveB } = await eleve(classeB));

		// Le modèle et son contenu, posés avec les droits du professeur.
		modele = await insert(prof, 'chapter_templates', {
			created_by: profId,
			title: 'Second degré ZZ',
			status: 'published'
		});
		sectionCours = await insert(prof, 'chapter_sections', {
			template_id: modele,
			title: 'Cours',
			display_order: 1
		});
		await deposer(cheminCours());
		docCours = await insert(prof, 'chapter_documents', {
			template_id: modele,
			title: 'Cours du second degré',
			source_type: 'upload',
			storage_path: cheminCours(),
			file_name: 'cours.pdf',
			mime_type: 'application/pdf',
			file_size: PDF.length,
			section_id: sectionCours,
			display_order: 0
		});
		objectif = await insert(prof, 'chapter_checklist_items', {
			template_id: modele,
			content: 'Je sais factoriser',
			display_order: 0
		});
	}, 120_000);

	afterAll(async () => {
		if (ecrits.length > 0) await service.storage.from(BUCKET).remove(ecrits);
		await cleanupAllTestData();
	});

	describe('instancier : le chapitre RELIE le modèle', () => {
		it('refuse un brouillon', async () => {
			const brouillon = await insert(prof, 'chapter_templates', {
				created_by: profId,
				title: 'Brouillon ZZ'
			});
			const { error } = await instantiateTemplate(
				{ templateId: brouillon, classId: classeA, isVisible: true },
				profId,
				prof
			);
			expect(error).toBeInstanceOf(TemplateUnusableError);
		});

		it('crée le chapitre lié : contenu du modèle, rien de publié, aucun fichier copié', async () => {
			const a = await instantiateTemplate(
				{ templateId: modele, classId: classeA, isVisible: true },
				profId,
				prof
			);
			expect(a.error).toBeNull();
			chapA = present(a.data).chapterId;
			const b = await instantiateTemplate(
				{ templateId: modele, classId: classeB, isVisible: true },
				profId,
				prof
			);
			expect(b.error).toBeNull();
			chapB = present(b.data).chapterId;

			const d = present(await lienDocument(chapA, docCours));
			expect(d).toMatchObject({ storage_path: cheminCours(), published_at: null });

			// Le plan du chapitre est celui du modèle : pas de sections par défaut en double.
			const { data: sections } = await service
				.from('chapter_sections')
				.select('title, source_id')
				.eq('chapter_id', chapA);
			expect(sections).toEqual([{ title: 'Cours', source_id: sectionCours }]);
			expect(d.section_id).not.toBeNull();
		});
	});

	describe('éditer le contenu du modèle', () => {
		it('crée, renomme et range des sections du modèle ; les chapitres liés suivent', async () => {
			const owner = { kind: 'template', id: modele } as const;
			const creee = await createSection(owner, 'Exercices', undefined, prof);
			expect(creee.error).toBeNull();
			const sectionId = present(creee.data).id;

			const renommee = await renameSection(owner, sectionId, 'Entraînement', prof);
			expect(renommee.data?.title).toBe('Entraînement');

			const { data: liste } = await listSections(owner, prof);
			expect(liste.map((s) => s.title)).toEqual(['Cours', 'Entraînement']);

			const { data: lienSection } = await service
				.from('chapter_sections')
				.select('title')
				.eq('chapter_id', chapA)
				.eq('source_id', sectionId)
				.single();
			expect(lienSection?.title).toBe('Entraînement');

			const range = await placeInSection(owner, sectionId, 'checklistItem', objectif, prof);
			expect(range.error).toBeNull();
		});

		it('téléverse un PDF chez le modèle, puis l’enregistre', async () => {
			const r = (await templateUploadUrl({
				locals: localsProf,
				params: { id: modele },
				request: jsonRequest({ fileName: 'Fiche.pdf', fileType: 'application/pdf' })
			} as never)) as Response;
			expect(r.status).toBe(201);
			const { storagePath, token } = (await r.json()) as { storagePath: string; token: string };
			expect(storagePath.startsWith(`templates/${modele}/`)).toBe(true);

			const envoi = await prof.storage
				.from(BUCKET)
				.uploadToSignedUrl(storagePath, token, new Blob([PDF], { type: 'application/pdf' }));
			expect(envoi.error).toBeNull();
			ecrits.push(storagePath);

			const enregistre = (await templateDocuments({
				locals: localsProf,
				params: { id: modele },
				request: jsonRequest({
					title: 'Fiche',
					storagePath,
					fileName: 'Fiche.pdf',
					fileType: 'application/pdf',
					fileSize: PDF.length,
					sectionId: sectionCours
				})
			} as never)) as Response;
			expect(enregistre.status).toBe(201);

			const { data: ligne } = await service
				.from('chapter_documents')
				.select('id, chapter_id, section_id')
				.eq('template_id', modele)
				.eq('storage_path', storagePath)
				.single();
			expect(ligne).toMatchObject({ chapter_id: null, section_id: sectionCours });
			expect(await lienDocument(chapA, present(ligne).id)).not.toBeNull();
		});

		it('refuse d’enregistrer un fichier qui n’est pas chez ce modèle', async () => {
			const status = await statusOf(() =>
				templateDocuments({
					locals: localsProf,
					params: { id: modele },
					request: jsonRequest({
						title: 'Intrus',
						storagePath: `chapters/${chapA}/intrus.pdf`,
						fileName: 'intrus.pdf',
						fileType: 'application/pdf',
						fileSize: 10
					})
				} as never)
			);
			expect(status).toBe(400);
		});

		it('liste le contenu non retiré, trié', async () => {
			const { data, error } = await listTemplateContent(modele, prof);
			expect(error).toBeNull();
			const contenu = present(data);
			expect(contenu.sections.map((s) => s.title)).toEqual(['Cours', 'Entraînement']);
			expect(contenu.documents.map((d) => d.title)).toEqual(['Cours du second degré', 'Fiche']);
			expect(contenu.checklistItems.map((c) => c.content)).toEqual(['Je sais factoriser']);
		});
	});

	describe('retirer un élément du modèle', () => {
		it('publié en A : reste en A (retiré, non supprimé), disparaît de B, fichier gardé', async () => {
			const a = present(await lienDocument(chapA, docCours));
			await service.from('chapter_documents').update({ published_at: PUBLIE }).eq('id', a.id);

			const { data, error } = await retireTemplateElement(modele, 'document', docCours, prof);
			expect(error).toBeNull();
			expect(data).toMatchObject({ deleted: false });

			const { data: element } = await service
				.from('chapter_documents')
				.select('retired_at')
				.eq('id', docCours)
				.single();
			expect(element?.retired_at).not.toBeNull();
			expect(await lienDocument(chapA, docCours)).not.toBeNull();
			expect(await lienDocument(chapB, docCours)).toBeNull();
			expect(await existe(cheminCours())).toBe(true);

			const { data: contenu } = await listTemplateContent(modele, prof);
			expect(present(contenu).documents.map((d) => d.id)).not.toContain(docCours);
		});

		it('publié nulle part : la ligne et son fichier sont supprimés', async () => {
			const chemin = `templates/${modele}/seul.pdf`;
			await deposer(chemin);
			const seul = await insert(prof, 'chapter_documents', {
				template_id: modele,
				title: 'Seul',
				source_type: 'upload',
				storage_path: chemin,
				file_name: 'seul.pdf',
				mime_type: 'application/pdf'
			});
			expect(await lienDocument(chapA, seul)).not.toBeNull();

			const { data, error } = await retireTemplateElement(modele, 'document', seul, prof);
			expect(error).toBeNull();
			expect(data).toMatchObject({ deleted: true });
			const { data: reste } = await service.from('chapter_documents').select('id').eq('id', seul);
			expect(reste).toEqual([]);
			expect(await lienDocument(chapA, seul)).toBeNull();
			expect(await existe(chemin)).toBe(false);
		});

		it('garde le fichier qu’une autre ligne désigne encore', async () => {
			const chemin = `templates/${modele}/partage.pdf`;
			await deposer(chemin);
			const ligne = () =>
				insert(prof, 'chapter_documents', {
					template_id: modele,
					title: 'Partagé',
					source_type: 'upload',
					storage_path: chemin,
					file_name: 'partage.pdf',
					mime_type: 'application/pdf'
				});
			const premier = await ligne();
			await ligne();

			const { data } = await retireTemplateElement(modele, 'document', premier, prof);
			expect(data).toMatchObject({ deleted: true });
			expect(await existe(chemin)).toBe(true);
		});
	});

	describe('servir un fichier du modèle à l’élève', () => {
		it('l’élève de A lit le PDF publié dans son chapitre', async () => {
			const a = present(await lienDocument(chapA, docCours));
			const r = (await serveDocument({
				locals: buildLocals(eleveA, eleveAId, 'student'),
				params: { id: a.id },
				url: new URL(`http://localhost/api/documents/${a.id}`)
			} as never)) as Response;
			expect(r.status).toBe(200);
			// Un document dépublié ne doit pas rester dans le cache du navigateur.
			expect(r.headers.get('Cache-Control')).toBe('private, no-store');
			expect(await r.text()).toBe(PDF);
		});

		it('refus : autre classe, document non publié, ligne du modèle', async () => {
			const a = present(await lienDocument(chapA, docCours));
			const appel = (client: SupabaseClient<Database>, id: string, eleveId: string) =>
				statusOf(() =>
					serveDocument({
						locals: buildLocals(client, eleveId, 'student'),
						params: { id },
						url: new URL(`http://localhost/api/documents/${id}`)
					} as never)
				);

			expect(await appel(eleveB, a.id, eleveBId)).toBe(404);

			const chemin = `templates/${modele}/prepare.pdf`;
			await deposer(chemin);
			const prepare = await insert(prof, 'chapter_documents', {
				template_id: modele,
				title: 'Préparé',
				source_type: 'upload',
				storage_path: chemin,
				file_name: 'prepare.pdf',
				mime_type: 'application/pdf'
			});
			const lienPrepare = present(await lienDocument(chapA, prepare));
			expect(await appel(eleveA, lienPrepare.id, eleveAId)).toBe(404);
			expect(await appel(eleveA, prepare, eleveAId)).toBe(404);
		});
	});

	describe('dans le chapitre, un élément du modèle se masque', () => {
		it('refuse de supprimer une ligne de lien, et ne touche pas au fichier', async () => {
			const a = present(await lienDocument(chapA, docCours));

			const viaPage = (await chapterActions.deleteDocument({
				locals: localsProf,
				params: { classId: classeA, chapterId: chapA },
				request: formRequest({ documentId: a.id })
			} as never)) as { status?: number; data?: { error?: string } };
			expect(viaPage.status).toBe(409);
			expect(viaPage.data?.error).toMatch(/masquez/i);

			const viaApi = await statusOf(() =>
				deleteChapterDocumentApi({
					locals: localsProf,
					params: { id: chapA, docId: a.id }
				} as never)
			);
			expect(viaApi).toBe(409);

			expect(await lienDocument(chapA, docCours)).not.toBeNull();
			expect(await existe(cheminCours())).toBe(true);
		});

		it('masque (et dépublie) une ligne de lien, pas un élément propre', async () => {
			const { data: lienObjectif } = await service
				.from('chapter_checklist_items')
				.select('id')
				.eq('chapter_id', chapA)
				.eq('source_id', objectif)
				.single();
			const id = present(lienObjectif).id;
			await service.from('chapter_checklist_items').update({ published_at: PUBLIE }).eq('id', id);

			const r = (await chapterActions.setHidden({
				locals: localsProf,
				params: { classId: classeA, chapterId: chapA },
				request: formRequest({ contentType: 'checklist', itemId: id, hidden: 'true' })
			} as never)) as { success?: boolean };
			expect(r.success).toBe(true);
			const { data: masque } = await service
				.from('chapter_checklist_items')
				.select('hidden, published_at')
				.eq('id', id)
				.single();
			expect(masque).toEqual({ hidden: true, published_at: null });

			const propre = await insert(prof, 'chapter_checklist_items', {
				chapter_id: chapA,
				content: 'Objectif propre ZZ'
			});
			const refus = (await chapterActions.setHidden({
				locals: localsProf,
				params: { classId: classeA, chapterId: chapA },
				request: formRequest({ contentType: 'checklist', itemId: propre, hidden: 'true' })
			} as never)) as { status?: number };
			expect(refus.status).toBe(404);
		});
	});

	describe('détacher un chapitre', () => {
		it('copie les fichiers chez le chapitre, garde la publication, puis délie', async () => {
			const chemin = `templates/${modele}/methodes.pdf`;
			await deposer(chemin);
			const methodes = await insert(prof, 'chapter_documents', {
				template_id: modele,
				title: 'Méthodes',
				source_type: 'upload',
				storage_path: chemin,
				file_name: 'methodes.pdf',
				mime_type: 'application/pdf'
			});
			const lienB = present(await lienDocument(chapB, methodes));
			await service.from('chapter_documents').update({ published_at: PUBLIE }).eq('id', lienB.id);

			const { error } = await detachChapterFromTemplate(chapB, prof);
			expect(error).toBeNull();

			const { data: d } = await service
				.from('chapter_documents')
				.select('source_id, storage_path, published_at')
				.eq('id', lienB.id)
				.single();
			const copie = present(d);
			expect(copie.source_id).toBeNull();
			expect(copie.published_at).not.toBeNull();
			expect(copie.storage_path?.startsWith(`chapters/${chapB}/`)).toBe(true);
			ecrits.push(present(copie.storage_path));
			expect(await existe(present(copie.storage_path))).toBe(true);
			expect(await existe(chemin)).toBe(true);

			for (const table of [
				'chapter_sections',
				'chapter_documents',
				'chapter_checklist_items',
				'chapter_exercises',
				'chapter_worksheets',
				'chapter_series'
			] as const) {
				const { data: liens } = await service
					.from(table)
					.select('id')
					.eq('chapter_id', chapB)
					.not('source_id', 'is', null);
				expect(liens, table).toEqual([]);
			}
			const { data: inst } = await service
				.from('chapter_template_instantiations')
				.select('is_detached')
				.eq('chapter_id', chapB)
				.single();
			expect(inst?.is_detached).toBe(true);
		});
	});

	describe('supprimer un modèle', () => {
		it('refuse un modèle encore relié : « archivez-le »', async () => {
			const { error } = await deleteChapterTemplate(modele, prof);
			expect(error).toBeInstanceOf(TemplateInUseError);
			expect(error?.message).toMatch(/archivez/i);
			const { data } = await service.from('chapter_templates').select('id').eq('id', modele);
			expect(data).toHaveLength(1);
		});

		it('supprime un modèle relié à aucun chapitre, avec ses fichiers', async () => {
			const libre = await insert(prof, 'chapter_templates', {
				created_by: profId,
				title: 'Modèle libre ZZ'
			});
			const chemin = `templates/${libre}/a.pdf`;
			await deposer(chemin);
			await insert(prof, 'chapter_documents', {
				template_id: libre,
				title: 'A',
				source_type: 'upload',
				storage_path: chemin,
				file_name: 'a.pdf'
			});

			const { error } = await deleteChapterTemplate(libre, prof);
			expect(error).toBeNull();
			const { data } = await service.from('chapter_templates').select('id').eq('id', libre);
			expect(data).toEqual([]);
			expect(await existe(chemin)).toBe(false);
		});
	});

	describe('faire un modèle depuis un chapitre', () => {
		it('copie le contenu chez le modèle, puis le chapitre ADOPTE ses éléments', async () => {
			const chapD = await insert(service, 'class_chapters', {
				class_id: classeA,
				title: 'Chapitre source ZZ',
				display_order: 5,
				is_visible: true
			});
			const { data: sectionsD } = await service
				.from('chapter_sections')
				.select('id, title')
				.eq('chapter_id', chapD)
				.order('display_order');
			const leCours = present(sectionsD?.find((s) => s.title === 'Le cours')).id;

			const ancienChemin = `chapters/${chapD}/cours.pdf`;
			await deposer(ancienChemin);
			const doc = await insert(prof, 'chapter_documents', {
				chapter_id: chapD,
				title: 'Cours D',
				source_type: 'upload',
				storage_path: ancienChemin,
				file_name: 'cours.pdf',
				mime_type: 'application/pdf',
				section_id: leCours,
				section_order: 0,
				published_at: PUBLIE
			});
			const obj = await insert(prof, 'chapter_checklist_items', {
				chapter_id: chapD,
				content: 'Je sais dériver',
				published_at: PUBLIE
			});
			await service
				.from('student_checklist_progress')
				.insert({ student_id: eleveAId, checklist_item_id: obj, is_completed: true });
			const { data: avant } = await service
				.from('chapter_documents')
				.select('published_at')
				.eq('id', doc)
				.single();

			const { data: tpl, error } = await createTemplateFromChapter(
				{ chapterId: chapD, title: 'Modèle depuis D ZZ', grades: [] },
				profId,
				prof
			);
			expect(error).toBeNull();
			const t = present(tpl).id;

			// Le modèle a son propre contenu et son propre fichier.
			const { data: sectionsT } = await service
				.from('chapter_sections')
				.select('id')
				.eq('template_id', t);
			expect(sectionsT).toHaveLength(6);
			const { data: docT } = await service
				.from('chapter_documents')
				.select('id, storage_path, section_id')
				.eq('template_id', t)
				.single();
			const docModele = present(docT);
			expect(docModele.storage_path?.startsWith(`templates/${t}/`)).toBe(true);
			ecrits.push(present(docModele.storage_path));
			expect(await existe(present(docModele.storage_path))).toBe(true);

			// Le chapitre a ADOPTÉ : mêmes identifiants, publication et cases cochées gardées.
			const { data: docD } = await service
				.from('chapter_documents')
				.select('id, source_id, storage_path, published_at')
				.eq('chapter_id', chapD);
			expect(docD).toEqual([
				{
					id: doc,
					source_id: docModele.id,
					storage_path: docModele.storage_path,
					published_at: present(avant).published_at
				}
			]);
			const { data: objD } = await service
				.from('chapter_checklist_items')
				.select('id, source_id')
				.eq('chapter_id', chapD);
			expect(objD).toHaveLength(1);
			expect(objD?.[0]).toMatchObject({ id: obj });
			expect(objD?.[0].source_id).not.toBeNull();
			const { data: coche } = await service
				.from('student_checklist_progress')
				.select('is_completed')
				.eq('checklist_item_id', obj);
			expect(coche).toEqual([{ is_completed: true }]);
			const { data: secD } = await service
				.from('chapter_sections')
				.select('id, source_id')
				.eq('chapter_id', chapD);
			expect(secD).toHaveLength(6);
			expect(secD?.every((s) => s.source_id !== null)).toBe(true);

			const { data: inst } = await service
				.from('chapter_template_instantiations')
				.select('template_id, is_detached')
				.eq('chapter_id', chapD)
				.single();
			expect(inst).toEqual({ template_id: t, is_detached: false });

			// L'ancien fichier du chapitre n'est pas supprimé (nettoyage à l'étape 5).
			expect(await existe(ancienChemin)).toBe(true);
		});
	});
});
