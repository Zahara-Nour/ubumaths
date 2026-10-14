/**
 * Template Detail Page - Server Load & Actions
 * =============================================
 *
 * View and manage a specific chapter template.
 * Supports: update, publish, archive, instantiate.
 *
 * Depuis l'ADR 0029, le modèle POSSÈDE son contenu et s'édite ici, avec le même
 * éditeur que le chapitre : les actions de contenu portent les MÊMES noms que
 * celles de la page du chapitre (`addChecklistItem`, `deleteDocument`…), pour que
 * l'éditeur partagé poste au même `?/nom` quel que soit le propriétaire. Ici,
 * « supprimer » veut dire RETIRER du modèle : l'élément reste chez les élèves qui
 * l'avaient reçu, disparaît des chapitres où il n'était pas publié.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import {
	listTemplateContent,
	retireTemplateElement,
	templateHasContent
} from '$lib/server/template-content';
import {
	insertChecklistItem,
	insertDocument,
	insertExercise,
	insertWorksheet,
	updateChecklistItem,
	type SectionPlacement
} from '$lib/server/chapters';
import { nextSectionOrder } from '$lib/server/chapter-sections';
import {
	linkSeries,
	listAvailableSeries,
	setSeriesForm,
	type AvailableSeries
} from '$lib/server/chapter-series';
import {
	createChecklistItemSchema,
	updateChecklistItemSchema
} from '$lib/server/validation/chapters';
import { linkSeriesSchema, setSeriesFormSchema } from '$lib/server/validation/chapter-series';
import {
	targetSectionFieldSchema,
	type SectionContentKind
} from '$lib/server/validation/chapter-sections';
import { uuidSchema } from '$lib/server/validation/common';
import {
	getChapterTemplate,
	updateChapterTemplate,
	publishTemplate,
	archiveTemplate,
	createTemplateVersion,
	deleteChapterTemplate,
	extractContentSnapshotFromChapter,
	instantiateTemplate,
	refuseLegacyVersioning,
	TemplateInUseError,
	TemplateLinkedContentError,
	TemplateUnusableError
} from '$lib/server/chapter-templates';
import {
	updateChapterTemplateSchema,
	instantiateTemplateSchema
} from '$lib/server/validation/chapter-templates';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	TemplateContent,
	TemplateSeries,
	TemplateWorksheet
} from '$lib/types/chapter-templates';
import { createServerLogger } from '$lib/utils/logger';

// Types
/** Ce que l'éditeur partagé lit en plus du contenu brut du modèle. */
interface TemplateEditorData {
	worksheets: (TemplateWorksheet & { title: string | null; status: string | null })[];
	series: (TemplateSeries & { title: string | null })[];
	exerciseDetails: Record<string, { title: string | null }>;
	availableExercises: { id: string; title: string | null }[];
	availableWorksheets: { id: string; title: string | null }[];
	availableSeries: AvailableSeries[];
}

const logger = createServerLogger('routes/teacher/contenu/templates/[templateId]');

// Constantes
/** Un objectif du modèle : le propriétaire vient de l'URL, jamais du formulaire. */
const createTemplateChecklistItemSchema = createChecklistItemSchema.omit({ chapterId: true });

/** Un lien Google Drive ajouté au modèle. */
const googleDriveDocumentSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200),
	description: z.string().trim().max(1000).nullable(),
	googleDriveUrl: z
		.string()
		.trim()
		.url('URL Google Drive invalide')
		.max(2000)
		.refine((u) => {
			const host = new URL(u).hostname;
			return host === 'drive.google.com' || host === 'docs.google.com';
		}, 'URL Google Drive invalide')
});

/**
 * Retirer un élément : le champ d'identifiant est celui du formulaire du
 * chapitre (l'éditeur est partagé), le type vient du nom de l'action.
 */
const RETIRE_FIELDS = {
	deleteDocument: { kind: 'document', field: 'documentId' },
	deleteChecklistItem: { kind: 'checklistItem', field: 'itemId' },
	unlinkExercise: { kind: 'exercise', field: 'chapterExerciseId' },
	unlinkWorksheet: { kind: 'worksheet', field: 'chapterWorksheetId' },
	unlinkSeries: { kind: 'series', field: 'chapterSeriesId' }
} as const satisfies Record<string, { kind: SectionContentKind; field: string }>;

type RetireAction = keyof typeof RETIRE_FIELDS;

// Functions
/**
 * La section demandée par le formulaire, et le rang à sa fin — à passer À
 * L'INSERTION : la base crée les lignes de lien des chapitres liés à l'insertion
 * même, avec la section de l'élément à ce moment-là (ranger après coup les
 * laisserait en « Non classé »). Un rang illisible ne fait pas échouer la
 * création : l'élément naît non classé, `placed: false` le dit.
 */
async function placementDemande(
	templateId: string,
	formData: FormData,
	supabase: SupabaseClient<Database>,
	action: string
): Promise<{ placement?: SectionPlacement; placed: boolean }> {
	const cible = targetSectionFieldSchema.safeParse(formData.get('sectionId'));
	if (!cible.success || !cible.data) return { placed: true };

	const { data: rang, error } = await nextSectionOrder(
		{ kind: 'template', id: templateId },
		cible.data,
		supabase
	);
	if (error || rang === null) {
		logger.error(`[${action}] Rang illisible :`, error);
		return { placed: false };
	}
	return { placement: { sectionId: cible.data, sectionOrder: rang }, placed: true };
}

/**
 * Titres des exercices, fiches et séries du modèle, et ce que le professeur peut
 * y rattacher — les mêmes listes que la page du chapitre. Une panne rend une
 * erreur : un sélecteur vide se lirait « rien à rattacher ».
 */
async function enrichTemplateContent(
	content: TemplateContent,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: TemplateEditorData | null; error: Error | null }> {
	const exerciseIds = [...new Set(content.exercises.map((e) => e.exerciseId))];
	const worksheetIds = [...new Set(content.worksheets.map((w) => w.worksheetId))];
	const seriesIds = [...new Set(content.series.map((s) => s.seriesId))];

	const [exercices, fiches, series, exercicesDispo, fichesDispo, seriesDispo] = await Promise.all([
		exerciseIds.length > 0
			? supabase.from('exercises').select('id, title').in('id', exerciseIds)
			: Promise.resolve({ data: [], error: null }),
		worksheetIds.length > 0
			? supabase.from('worksheets').select('id, title, status').in('id', worksheetIds)
			: Promise.resolve({ data: [], error: null }),
		seriesIds.length > 0
			? supabase.from('series').select('id, title').in('id', seriesIds)
			: Promise.resolve({ data: [], error: null }),
		supabase
			.from('exercises')
			.select('id, title')
			.eq('created_by', userId)
			.order('created_at', { ascending: false })
			.limit(100),
		// Une fiche en brouillon n'est pas distribuable : même règle que le chapitre.
		supabase
			.from('worksheets')
			.select('id, title')
			.eq('created_by', userId)
			.eq('status', 'published')
			.order('created_at', { ascending: false })
			.limit(100),
		listAvailableSeries(userId, supabase)
	]);

	const enEchec = [exercices, fiches, series, exercicesDispo, fichesDispo, seriesDispo].find(
		(r) => r.error
	);
	if (enEchec?.error) {
		logger.error('[enrichTemplateContent] Lecture impossible :', enEchec.error);
		return { data: null, error: new Error(enEchec.error.message) };
	}

	const ficheParId = new Map((fiches.data ?? []).map((f) => [f.id, f]));
	const serieParId = new Map((series.data ?? []).map((s) => [s.id, s]));

	return {
		data: {
			worksheets: content.worksheets.map((w) => ({
				...w,
				title: ficheParId.get(w.worksheetId)?.title ?? null,
				status: ficheParId.get(w.worksheetId)?.status ?? null
			})),
			series: content.series.map((s) => ({
				...s,
				title: serieParId.get(s.seriesId)?.title ?? null
			})),
			exerciseDetails: Object.fromEntries(
				(exercices.data ?? []).map((e) => [e.id, { title: e.title }])
			),
			availableExercises: exercicesDispo.data ?? [],
			availableWorksheets: fichesDispo.data ?? [],
			availableSeries: seriesDispo.data ?? []
		},
		error: null
	};
}

/** Une action « retirer du modèle », pour l'un des cinq types. */
function retireAction(action: RetireAction) {
	return async ({
		request,
		locals,
		params
	}: {
		request: Request;
		locals: App.Locals;
		params: { templateId: string };
	}) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);
		const { kind, field } = RETIRE_FIELDS[action];

		const formData = await request.formData();
		const itemId = uuidSchema.safeParse(formData.get(field));
		if (!itemId.success) {
			return fail(400, { error: 'Élément invalide', action });
		}

		const { data, error: retireError } = await retireTemplateElement(
			templateId,
			kind,
			itemId.data,
			locals.supabase
		);

		if (retireError?.kind === 'not_found') {
			return fail(404, { error: 'Élément introuvable dans ce modèle', action });
		}
		if (retireError || !data) {
			logger.error(`[${action}] Retrait impossible :`, retireError);
			return fail(500, { error: 'Impossible de retirer cet élément', action });
		}

		// `deleted: false` : encore publié dans un chapitre, il y reste ; le modèle,
		// lui, ne le montre plus.
		return { success: true, action, deleted: data.deleted };
	};
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const idCheck = uuidSchema.safeParse(params.templateId);
	if (!idCheck.success) {
		throw error(404, 'Modèle introuvable');
	}
	const templateId = idCheck.data;

	// Fetch template
	const { data: template, error: templateError } = await getChapterTemplate(
		templateId,
		locals.supabase
	);

	if (templateError || !template) {
		throw error(404, 'Modèle introuvable');
	}

	// Check access: owner only (no inter-teacher sharing)
	const isOwner = template.createdBy === user.id;
	if (!isOwner) {
		throw error(403, 'Accès refusé');
	}

	// Le contenu POSSÉDÉ par le modèle (ADR 0029), pour l'éditeur partagé. Une
	// lecture en échec ne doit pas s'afficher « modèle vide ».
	const { data: content, error: contentError } = await listTemplateContent(
		templateId,
		locals.supabase
	);

	if (contentError || !content) {
		logger.error('Contenu du modèle illisible :', contentError);
		throw error(500, 'Impossible de charger le contenu du modèle');
	}

	// Ce que l'éditeur partagé affiche à côté des identifiants : titres des
	// exercices, des fiches et des séries du modèle, et ce qui peut s'y ajouter.
	const enrichissement = await enrichTemplateContent(content, user.id, locals.supabase);
	if (enrichissement.error || !enrichissement.data) {
		throw error(500, 'Impossible de charger le contenu du modèle');
	}

	// Chapitres liés à ce modèle (non détachés) : ils reçoivent aussitôt chaque
	// correction faite ici, la page les nomme.
	const { data: linkedChapters, error: linkedError } = await locals.supabase
		.from('chapter_template_instantiations')
		.select('chapter_id, is_detached, class_chapters(id, title, classes(name))')
		.eq('template_id', templateId)
		.eq('is_detached', false);

	if (linkedError) {
		logger.error('Chapitres rattachés illisibles :', linkedError);
	}

	// Fetch teacher's classes for instantiation
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, grade, is_active')
		.eq('is_active', true)
		.order('name');

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (classesError) {
		logger.error('Enrichissement illisible :', classesError);
	}

	return {
		template,
		content,
		...enrichissement.data,
		classes: classes || [],
		linkedChapters: (linkedChapters ?? []).flatMap((row) => {
			const chapter = row.class_chapters;
			if (!chapter) return [];

			return [
				{
					id: chapter.id,
					title: chapter.title,
					className: chapter.classes?.name ?? null
				}
			];
		}),
		isOwner
	};
};

export const actions: Actions = {
	/**
	 * Update template metadata (draft only)
	 */
	update: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const idCheck = uuidSchema.safeParse(params.templateId);
		if (!idCheck.success) {
			return fail(400, { error: 'Modèle invalide', action: 'update' });
		}
		const templateId = idCheck.data;

		// Check ownership
		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			logger.error('Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'update' });
		}

		const formData = await request.formData();

		// Parse grades
		const gradesString = formData.get('grades') as string | null;
		const grades = gradesString ? gradesString.split(',').filter(Boolean) : undefined;

		const data = {
			title: formData.get('title') as string | undefined,
			description: formData.get('description') as string | undefined,
			grades,
			color: formData.get('color') as string | undefined,
			icon: formData.get('icon') as string | undefined
		};

		// Remove undefined fields
		const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

		// Validate input
		const validation = updateChapterTemplateSchema.safeParse(cleanData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'update'
			});
		}

		// Update template
		const { error: updateError } = await updateChapterTemplate(
			templateId,
			validation.data,
			user.id,
			locals.supabase
		);

		if (updateError) {
			logger.error('[Update Template] Error:', updateError);
			return fail(500, { error: 'Erreur lors de la mise à jour', action: 'update' });
		}

		return { success: true, action: 'update' };
	},

	/**
	 * Publish template (validates content exists)
	 */
	publish: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const idCheck = uuidSchema.safeParse(params.templateId);
		if (!idCheck.success) {
			return fail(400, { error: 'Modèle invalide', action: 'publish' });
		}
		const templateId = idCheck.data;

		// Check ownership
		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			logger.error('Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'publish' });
		}

		if (templateCheck.status !== 'draft') {
			return fail(400, { error: 'Seuls les brouillons peuvent être publiés', action: 'publish' });
		}

		// Le contenu POSSÉDÉ par le modèle (ADR 0029), non retiré.
		const { data: aDuContenu, error: contentError } = await templateHasContent(
			templateId,
			locals.supabase
		);
		if (contentError) {
			logger.error('[Publish Template] Contenu illisible :', contentError);
			return fail(500, { error: 'Lecture impossible', action: 'publish' });
		}
		if (!aDuContenu) {
			return fail(400, {
				// Les cinq types que `hasContent` accepte, dans les mots de la
				// fiche : une fiche seule suffit à publier, et le message le disait
				// le contraire.
				error:
					'Un modèle doit contenir au moins un élément : document, question de quiz, tâche, corvée ou fiche',
				action: 'publish'
			});
		}

		// Publish template
		const { error: publishError } = await publishTemplate(templateId, locals.supabase);

		if (publishError) {
			logger.error('[Publish Template] Error:', publishError);
			return fail(500, { error: 'Erreur lors de la publication', action: 'publish' });
		}

		return { success: true, action: 'publish' };
	},

	/**
	 * Reprendre le contenu d'un chapitre dans le modèle.
	 *
	 * En brouillon, le contenu est remplacé ; sur un modèle publié, il devient
	 * une nouvelle version, ce qui permet aux chapitres qui en sont issus de se
	 * mettre à jour à leur tour.
	 */
	updateFromChapter: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const idCheck = uuidSchema.safeParse(params.templateId);
		if (!idCheck.success) {
			return fail(400, { error: 'Modèle invalide', action: 'updateFromChapter' });
		}
		const templateId = idCheck.data;

		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que le refus suivant traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			logger.error('[Update From Chapter] Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible', action: 'updateFromChapter' });
		}

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'updateFromChapter' });
		}

		if (templateCheck.status === 'archived') {
			return fail(400, {
				error: 'Un modèle archivé ne peut plus être modifié',
				action: 'updateFromChapter'
			});
		}

		const formData = await request.formData();
		const chapterCheck = uuidSchema.safeParse(formData.get('chapterId'));
		const changeSummary = (formData.get('changeSummary') as string | null)?.trim() || null;

		if (!chapterCheck.success) {
			return fail(400, { error: 'Chapitre requis', action: 'updateFromChapter' });
		}
		const chapterId = chapterCheck.data;

		// ADR 0029 : un modèle qui possède son contenu, ou un chapitre qui relie un
		// modèle, ne passent plus par une version figée.
		const refus = await refuseLegacyVersioning(templateId, chapterId, locals.supabase);
		if (refus instanceof TemplateLinkedContentError) {
			return fail(409, { error: refus.message, action: 'updateFromChapter' });
		}
		if (refus) {
			logger.error('[Update From Chapter] Vérification impossible :', refus);
			return fail(500, { error: 'Lecture impossible', action: 'updateFromChapter' });
		}

		const { data: snapshot, error: snapshotError } = await extractContentSnapshotFromChapter(
			chapterId,
			locals.supabase
		);

		if (snapshotError || !snapshot) {
			logger.error('[Update From Chapter] Extraction impossible :', snapshotError);
			return fail(500, { error: 'Lecture du chapitre impossible', action: 'updateFromChapter' });
		}

		// Un brouillon se réécrit ; un modèle publié gagne une version, sans quoi
		// les chapitres qui le suivent ne sauraient pas qu'il a changé.
		const { error: writeError } =
			templateCheck.status === 'draft'
				? await updateChapterTemplate(
						templateId,
						{ contentSnapshot: snapshot },
						user.id,
						locals.supabase
					)
				: await createTemplateVersion(
						templateId,
						snapshot,
						changeSummary,
						user.id,
						locals.supabase
					);

		if (writeError) {
			logger.error('[Update From Chapter] Écriture impossible :', writeError);
			return fail(500, {
				error: 'Erreur lors de la mise à jour du modèle',
				action: 'updateFromChapter'
			});
		}

		return { success: true, action: 'updateFromChapter' };
	},

	/**
	 * Supprimer définitivement un modèle, brouillon ou publié, relié à AUCUN
	 * chapitre (ADR 0029) : un modèle relié se refuse (« archivez-le »). Les
	 * chapitres détachés gardent leur copie. Un modèle archivé, lui, est une trace
	 * et n'est pas supprimable.
	 */
	delete: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const idCheck = uuidSchema.safeParse(params.templateId);
		if (!idCheck.success) {
			return fail(400, { error: 'Modèle invalide', action: 'delete' });
		}
		const templateId = idCheck.data;

		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que le refus suivant traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			logger.error('[Delete Template] Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible', action: 'delete' });
		}

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'delete' });
		}

		if (templateCheck.status === 'archived') {
			return fail(400, {
				error: 'Un modèle archivé ne peut pas être supprimé',
				action: 'delete'
			});
		}

		const { error: deleteError } = await deleteChapterTemplate(templateId, locals.supabase);

		// Encore relié à des chapitres : on l'archive, on ne le supprime pas.
		if (deleteError instanceof TemplateInUseError) {
			return fail(409, { error: deleteError.message, action: 'delete' });
		}

		if (deleteError) {
			logger.error('[Delete Template] Suppression impossible :', deleteError);
			return fail(500, { error: 'Erreur lors de la suppression du modèle', action: 'delete' });
		}

		throw redirect(303, '/dashboard/teacher/contenu/templates');
	},

	/**
	 * Archive template
	 */
	archive: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const idCheck = uuidSchema.safeParse(params.templateId);
		if (!idCheck.success) {
			return fail(400, { error: 'Modèle invalide', action: 'archive' });
		}
		const templateId = idCheck.data;

		// Check ownership
		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			logger.error('Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'archive' });
		}

		// Archive template
		const { error: archiveError } = await archiveTemplate(templateId, locals.supabase);

		if (archiveError) {
			logger.error('[Archive Template] Error:', archiveError);
			return fail(500, { error: "Erreur lors de l'archivage", action: 'archive' });
		}

		return { success: true, action: 'archive' };
	},

	/**
	 * Instantiate template into a chapter
	 */
	instantiate: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const idCheck = uuidSchema.safeParse(params.templateId);
		if (!idCheck.success) {
			return fail(400, { error: 'Modèle invalide', action: 'instantiate' });
		}
		const templateId = idCheck.data;

		const formData = await request.formData();

		const data = {
			templateId,
			classId: formData.get('classId') as string,
			// formData.get returns null when absent; instantiateTemplateSchema.title is
			// .optional() (rejects null) -> coerce to undefined
			title: formData.get('title') ?? undefined,
			isVisible: formData.get('isVisible') === 'true'
		};

		// Validate input
		const validation = instantiateTemplateSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'instantiate'
			});
		}

		// Verify class exists
		const { data: classCheck, error: classCheckError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', validation.data.classId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (classCheckError && classCheckError.code !== 'PGRST116') {
			logger.error('Lecture impossible :', classCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

		if (!classCheck) {
			return fail(403, { error: 'Accès refusé', action: 'instantiate' });
		}

		// Instantiate template
		const { data: result, error: instError } = await instantiateTemplate(
			validation.data,
			user.id,
			locals.supabase
		);

		// Archivé entre l'affichage et le clic : dire pourquoi, pas « erreur ».
		if (instError instanceof TemplateUnusableError) {
			return fail(409, { error: instError.message, action: 'instantiate' });
		}

		if (instError || !result) {
			logger.error('[Instantiate Template] Error:', instError);
			return fail(500, { error: "Erreur lors de l'instantiation", action: 'instantiate' });
		}

		return {
			success: true,
			action: 'instantiate',
			chapterId: result.chapterId
		};
	},
	// ============ CONTENU DU MODÈLE (ADR 0029) ============

	addChecklistItem: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const validation = createTemplateChecklistItemSchema.safeParse({
			content: formData.get('content'),
			description: (formData.get('description') as string | null) || undefined
		});
		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message, action: 'addChecklistItem' });
		}

		const { placement, placed } = await placementDemande(
			templateId,
			formData,
			locals.supabase,
			'addChecklistItem'
		);
		const { data: created, error: addError } = await insertChecklistItem(
			{ kind: 'template', id: templateId },
			validation.data,
			locals.supabase,
			placement
		);
		if (addError || !created) {
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addChecklistItem' });
		}

		return { success: true, action: 'addChecklistItem', placed };
	},

	updateChecklistItem: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const itemId = uuidSchema.safeParse(formData.get('itemId'));
		const validation = updateChecklistItemSchema.safeParse(
			Object.fromEntries(
				Object.entries({
					content: formData.get('content') ?? undefined,
					description: formData.get('description') ?? undefined
				}).filter(([, v]) => v !== undefined)
			)
		);
		if (!itemId.success || !validation.success) {
			return fail(400, { error: 'Objectif invalide', action: 'updateChecklistItem' });
		}

		// L'objectif doit être celui de CE modèle : la modification se fait par
		// identifiant seul.
		const { data: item, error: itemError } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id')
			.eq('id', itemId.data)
			.eq('template_id', templateId)
			.maybeSingle();
		if (itemError) {
			logger.error('[updateChecklistItem] Lecture impossible :', itemError);
			return fail(500, { error: 'Vérification impossible', action: 'updateChecklistItem' });
		}
		if (!item) {
			return fail(404, { error: 'Objectif introuvable', action: 'updateChecklistItem' });
		}

		// Corrigé ici, il l'est aussitôt dans chaque chapitre lié (la base recopie).
		const { error: updateError } = await updateChecklistItem(
			itemId.data,
			validation.data,
			locals.supabase
		);
		if (updateError) {
			return fail(500, { error: 'Erreur lors de la mise à jour', action: 'updateChecklistItem' });
		}

		return { success: true, action: 'updateChecklistItem' };
	},

	linkExercise: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const exerciseId = uuidSchema.safeParse(formData.get('exerciseId'));
		if (!exerciseId.success) {
			return fail(400, { error: 'Exercice requis', action: 'linkExercise' });
		}

		const { placement, placed } = await placementDemande(
			templateId,
			formData,
			locals.supabase,
			'linkExercise'
		);
		const { data: created, error: linkError } = await insertExercise(
			{ kind: 'template', id: templateId },
			exerciseId.data,
			locals.supabase,
			undefined,
			placement
		);
		if (linkError || !created) {
			return fail(500, { error: 'Erreur lors du lien', action: 'linkExercise' });
		}

		return { success: true, action: 'linkExercise', placed };
	},

	linkWorksheet: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const worksheetId = uuidSchema.safeParse(formData.get('worksheetId'));
		if (!worksheetId.success) {
			return fail(400, { error: 'Fiche requise', action: 'linkWorksheet' });
		}

		const { placement, placed } = await placementDemande(
			templateId,
			formData,
			locals.supabase,
			'linkWorksheet'
		);
		const { data: created, error: linkError } = await insertWorksheet(
			{ kind: 'template', id: templateId },
			worksheetId.data,
			locals.supabase,
			undefined,
			placement
		);
		if (linkError || !created) {
			return fail(500, { error: 'Erreur lors du lien', action: 'linkWorksheet' });
		}

		return { success: true, action: 'linkWorksheet', placed };
	},

	linkSeries: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const validation = linkSeriesSchema.safeParse({
			seriesId: formData.get('seriesId'),
			form: formData.get('form') || undefined
		});
		if (!validation.success) {
			return fail(400, { error: 'Série ou forme invalide', action: 'linkSeries' });
		}

		const { placement, placed } = await placementDemande(
			templateId,
			formData,
			locals.supabase,
			'linkSeries'
		);
		const { data: created, error: linkError } = await linkSeries(
			{ kind: 'template', id: templateId },
			validation.data.seriesId,
			validation.data.form,
			user.id,
			locals.supabase,
			placement
		);
		if (linkError?.kind === 'not_found') {
			return fail(404, { error: 'Série introuvable', action: 'linkSeries' });
		}
		if (linkError?.kind === 'duplicate') {
			return fail(409, { error: 'Cette série est déjà dans le modèle', action: 'linkSeries' });
		}
		if (linkError || !created) {
			return fail(500, { error: 'Erreur lors du rattachement', action: 'linkSeries' });
		}

		return { success: true, action: 'linkSeries', placed };
	},

	setSeriesForm: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const validation = setSeriesFormSchema.safeParse({
			chapterSeriesId: formData.get('chapterSeriesId'),
			form: formData.get('form')
		});
		if (!validation.success) {
			return fail(400, { error: 'Série ou forme invalide', action: 'setSeriesForm' });
		}

		const { error: formError } = await setSeriesForm(
			{ kind: 'template', id: templateId },
			validation.data.chapterSeriesId,
			validation.data.form,
			locals.supabase
		);
		if (formError?.kind === 'not_found') {
			return fail(404, { error: 'Série introuvable', action: 'setSeriesForm' });
		}
		if (formError) {
			return fail(500, { error: 'Impossible de changer la forme', action: 'setSeriesForm' });
		}

		return { success: true, action: 'setSeriesForm' };
	},

	addGoogleDriveDocument: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const templateId = await requireOwnedTemplate(params.templateId, user.id, locals.supabase);

		const formData = await request.formData();
		const validation = googleDriveDocumentSchema.safeParse({
			title: formData.get('title'),
			description: (formData.get('description') as string | null) || null,
			googleDriveUrl: formData.get('googleDriveUrl')
		});
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'addGoogleDriveDocument'
			});
		}

		const url = validation.data.googleDriveUrl;
		const { placement, placed } = await placementDemande(
			templateId,
			formData,
			locals.supabase,
			'addGoogleDriveDocument'
		);
		const created = await insertDocument(
			{ kind: 'template', id: templateId },
			{
				sourceType: 'google_drive',
				title: validation.data.title,
				description: validation.data.description,
				googleDriveUrl: url,
				googleFileId: url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? ''
			},
			locals.supabase,
			placement
		);
		if (created.error || !created.data) {
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addGoogleDriveDocument' });
		}

		return { success: true, action: 'addGoogleDriveDocument', placed };
	},

	deleteDocument: retireAction('deleteDocument'),
	deleteChecklistItem: retireAction('deleteChecklistItem'),
	unlinkExercise: retireAction('unlinkExercise'),
	unlinkWorksheet: retireAction('unlinkWorksheet'),
	unlinkSeries: retireAction('unlinkSeries')
};
