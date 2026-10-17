/**
 * Teacher Chapter Content Editor Server
 * ======================================
 *
 * Manages chapter content:
 * - Documents (add/remove/reorder)
 * - Checklist items (CRUD/reorder)
 * - Exercises (link/unlink/reorder)
 * - View student progress
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import {
	addChapterDocument,
	deleteChapterDocument,
	addChecklistItem,
	updateChecklistItem,
	deleteChecklistItem,
	linkExercise,
	unlinkExercise,
	linkWorksheet,
	unlinkWorksheet,
	getStudentChecklistProgress
} from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';
import { placeInSection } from '$lib/server/chapter-sections';
import {
	findOngoingEvaluation,
	linkSeries,
	listAvailableSeries,
	listChapterSeries,
	setSeriesForm,
	unlinkSeries,
	type ChapterSeriesError
} from '$lib/server/chapter-series';
import {
	linkSeriesSchema,
	setSeriesFormSchema,
	unlinkSeriesSchema
} from '$lib/server/validation/chapter-series';
import {
	targetSectionFieldSchema,
	type SectionContentKind
} from '$lib/server/validation/chapter-sections';
import {
	setContentPublication,
	setLinkedElementHidden,
	setChapterSectionHidden,
	listDistributedWorksheetIds,
	CHAPTER_CONTENT_TYPES
} from '$lib/server/chapters-publication';
import { z } from 'zod';
import {
	getInstantiationWithStatus,
	createTemplateFromChapter,
	detachChapterFromTemplate
} from '$lib/server/chapter-templates';
import { createTemplateFromChapterSchema } from '$lib/server/validation/chapter-templates';
import {
	createChecklistItemSchema,
	updateChecklistItemSchema
} from '$lib/server/validation/chapters';
import type {
	ChapterSection,
	ChapterDocument,
	ChapterChecklistItem,
	ChapterExercise
} from '$lib/types/chapters';
import type { ChapterWorksheet } from '$lib/types/chapters';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server'
);

/**
 * Une fiche rattachée, avec le peu qu'il faut pour l'afficher.
 *
 * Le titre est nullable parce que la jointure peut ne rien rendre — une fiche
 * supprimée emporte son lien par cascade, mais une panne de lecture, non. Un
 * titre vide se voit ; une ligne manquante passerait inaperçue.
 */
/** Le type de contenu est borné à la liste fermée du module de publication. */
const setPublicationSchema = z.object({
	contentType: z.enum(CHAPTER_CONTENT_TYPES),
	itemId: uuidSchema,
	published: z.boolean()
});

/** Masquer ou réafficher une section du chapitre (décision du 2026-10-14). */
const setSectionHiddenSchema = z.object({
	sectionId: uuidSchema,
	hidden: z.boolean()
});

/** Masquer ou démasquer un élément du modèle dans ce chapitre (ADR 0029, Q4). */
const setHiddenSchema = z.object({
	contentType: z.enum(CHAPTER_CONTENT_TYPES),
	itemId: uuidSchema,
	hidden: z.boolean()
});

/**
 * Une ligne de LIEN (élément du modèle) ne se supprime pas du chapitre : elle se
 * masque (ADR 0029, Q2/Q4). Sa suppression ferait perdre aux élèves ce qui était
 * publié et, pour un document, son fichier appartient au modèle.
 */
const LINKED_ELEMENT_MESSAGE =
	'Élément du modèle : masquez-le plutôt que de le supprimer, ou corrigez-le dans le modèle.';

type ChapterWorksheetRow = ChapterWorksheet & {
	title: string | null;
	status: string | null;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { classId, chapterId } = params;

	// Verify chapter exists
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('*')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapitre introuvable');
	}

	// Verify class matches
	if (chapter.class_id !== classId) {
		throw error(404, 'Chapitre introuvable dans cette classe');
	}

	// Get class info
	const { data: classData, error: classDataError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', classId)
		.single();

	// PGRST116 = la classe n'existe pas ; le repli d'affichage existe déjà.
	if (classDataError && classDataError.code !== 'PGRST116') {
		logger.error('Classe illisible :', classDataError);
		throw error(500, 'Impossible de charger la classe');
	}

	// Get chapter content in parallel
	const [documentsResult, checklistResult, exercisesResult, worksheetsResult, sectionsResult] =
		await Promise.all([
			locals.supabase
				.from('chapter_documents')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order'),
			locals.supabase
				.from('chapter_checklist_items')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order'),
			locals.supabase
				.from('chapter_exercises')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order'),
			// Les fiches rattachées, avec leur titre : le professeur voit tout ce
			// qu'il a rangé, distribué ou non.
			locals.supabase
				.from('chapter_worksheets')
				.select('*, worksheet:worksheets(id, title, status)')
				.eq('chapter_id', chapterId)
				.order('display_order'),
			// Le plan du chapitre. Un chapitre en a toujours au moins zéro : le
			// professeur peut avoir supprimé les six, et la vue retombe alors sur
			// « Non classé » seul.
			locals.supabase
				.from('chapter_sections')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order')
		]);

	if (sectionsResult.error) {
		logger.error('Sections illisibles :', sectionsResult.error);
	}

	const sections: ChapterSection[] = (sectionsResult.data || []).map((s) => ({
		id: s.id,
		chapterId,
		sourceId: s.source_id,
		hidden: s.hidden,
		title: s.title,
		displayOrder: s.display_order,
		createdAt: s.created_at,
		updatedAt: s.updated_at
	}));

	// Transform to app types
	const documents: ChapterDocument[] = (documentsResult.data || []).map((d) => ({
		id: d.id,
		chapterId,
		title: d.title,
		description: d.description,
		sourceType: d.source_type as ChapterDocument['sourceType'],
		storagePath: d.storage_path,
		fileName: d.file_name,
		mimeType: d.mime_type,
		fileSize: d.file_size,
		googleFileId: d.google_file_id,
		googleDriveUrl: d.google_drive_url,
		thumbnailUrl: d.thumbnail_url,
		displayOrder: d.display_order,
		sectionId: d.section_id,
		sectionOrder: d.section_order,
		createdAt: d.created_at,
		updatedAt: d.updated_at,
		publishedAt: d.published_at,
		sourceId: d.source_id,
		hidden: d.hidden
	}));

	const checklistItems: ChapterChecklistItem[] = (checklistResult.data || []).map((c) => ({
		id: c.id,
		chapterId,
		content: c.content,
		description: c.description,
		displayOrder: c.display_order,
		sectionId: c.section_id,
		sectionOrder: c.section_order,
		createdAt: c.created_at,
		updatedAt: c.updated_at,
		publishedAt: c.published_at,
		sourceId: c.source_id,
		hidden: c.hidden
	}));

	const worksheets: ChapterWorksheetRow[] = (worksheetsResult.data || []).map((w) => {
		// PostgREST type une jointure « vers un » en tableau quand il ne peut pas
		// prouver l'unicité ; à l'exécution c'est un objet. L'idiome du dépôt.
		const fiche = Array.isArray(w.worksheet) ? w.worksheet[0] : w.worksheet;
		return {
			id: w.id,
			chapterId,
			worksheetId: w.worksheet_id,
			displayOrder: w.display_order,
			sectionId: w.section_id,
			sectionOrder: w.section_order,
			createdAt: w.created_at,
			publishedAt: w.published_at,
			sourceId: w.source_id,
			hidden: w.hidden,
			title: fiche?.title ?? null,
			status: fiche?.status ?? null
		};
	});

	const exercises: ChapterExercise[] = (exercisesResult.data || []).map((e) => ({
		id: e.id,
		chapterId,
		exerciseId: e.exercise_id,
		displayOrder: e.display_order,
		sectionId: e.section_id,
		sectionOrder: e.section_order,
		createdAt: e.created_at,
		publishedAt: e.published_at,
		sourceId: e.source_id,
		hidden: e.hidden
	}));

	// Get exercise details
	// `exercises.title` est nullable en base : un exercice sans titre reste
	// listable, il s'affiche sous un libellé de repli.
	const exerciseDetails: Record<string, { id: string; title: string }> = {};
	if (exercises.length > 0) {
		const exerciseIds = exercises.map((e) => e.exerciseId);
		const { data: exerciseData, error: exerciseDataError } = await locals.supabase
			.from('exercises')
			.select('id, title')
			.in('id', exerciseIds);

		// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
		// laisse une trace.
		if (exerciseDataError) {
			logger.error('Enrichissement illisible :', exerciseDataError);
		}

		for (const e of exerciseData || []) {
			exerciseDetails[e.id] = {
				id: e.id,
				title: e.title ?? 'Exercice sans titre'
			};
		}
	}

	// Quelles fiches du chapitre sont RÉELLEMENT distribuées à cette classe ?
	//
	// La définition de « distribuée » vit dans `listDistributedWorksheetIds`, et
	// nulle part ailleurs : elle doit coller à `student_has_worksheet_access`
	// (statut actif, ouverture échue, lien de classe). La recopier ici l'aurait
	// fait diverger — et le badge aurait annoncé « visible par les élèves » pour
	// une fiche programmée pour lundi prochain.
	let distributedWorksheetIds: string[] = [];

	if (worksheets.length > 0) {
		const { data: distribuees, error: distribueesError } = await listDistributedWorksheetIds(
			[...new Set(worksheets.map((w) => w.worksheetId))],
			classId,
			locals.supabase
		);

		// Enrichissement d'affichage : son absence ne ferme pas l'écran. Mais elle
		// ne doit pas se lire « non distribuée », donc on en laisse une trace.
		if (distribueesError) {
			logger.error('Distribution des fiches illisible :', distribueesError);
		}

		distributedWorksheetIds = [...(distribuees ?? [])];
	}

	// Les fiches publiées du professeur, pour le sélecteur de rattachement.
	// Une fiche en brouillon n'a rien à faire dans un chapitre : elle n'est pas
	// distribuable, donc l'élève ne la verrait jamais.
	const { data: availableWorksheets, error: availableWorksheetsError } = await locals.supabase
		.from('worksheets')
		.select('id, title')
		.eq('created_by', user.id)
		.eq('status', 'published')
		.order('created_at', { ascending: false })
		.limit(100);

	if (availableWorksheetsError) {
		logger.error('Fiches disponibles illisibles :', availableWorksheetsError);
		throw error(500, 'Impossible de charger les données');
	}

	// Les séries du chapitre (toutes : préparées, programmées, publiées) et les
	// séries enregistrées du professeur, pour le sélecteur de rattachement.
	const [chapterSeriesResult, availableSeriesResult] = await Promise.all([
		listChapterSeries(chapterId, locals.supabase),
		listAvailableSeries(user.id, locals.supabase)
	]);

	// Une panne ne doit pas se lire « aucune série » : le professeur en
	// rattacherait une seconde fois.
	if (chapterSeriesResult.error || availableSeriesResult.error) {
		throw error(500, 'Impossible de charger les séries');
	}

	// Get available exercises for linking
	const { data: availableExercises, error: availableExercisesError } = await locals.supabase
		.from('exercises')
		.select('id, title')
		.eq('created_by', user.id)
		.order('created_at', { ascending: false })
		.limit(100);

	if (availableExercisesError) {
		logger.error('Lecture impossible :', availableExercisesError);
		throw error(500, 'Impossible de charger les données');
	}

	// Get student progress
	const { data: checklistProgress, error: checklistProgressError } =
		await getStudentChecklistProgress(chapterId, locals.supabase);

	// L'avancement des élèves : une panne le montrerait entièrement à zéro, ce
	// que le professeur lirait comme « personne n'a rien fait ».
	if (checklistProgressError) {
		logger.error('Avancement illisible :', checklistProgressError);
		throw error(500, 'Impossible de charger l’avancement');
	}

	// Get students in class
	// `is_test` est une colonne de `profiles`, pas de `class_members` : le filtre
	// rendait la requête ENTIÈRE invalide, donc `students` valait toujours `null`
	// et le professeur ne voyait aucun élève sur la page de chapitre.
	// L'embed passe en `!inner` pour que le filtre sur la table liée s'applique.
	const { data: students, error: studentsError } = await locals.supabase
		.from('class_members')
		.select('student_id, profiles!inner (id, full_name, avatar_url, is_test)')
		.eq('class_id', classId)
		.eq('status', 'active')
		.eq('profiles.is_test', false);

	// ⚠️ C'est la liste des élèves du chapitre. Vide par accident, elle dit au
	// professeur que personne n'est inscrit — le même symptôme que le filtre
	// `is_test` mal placé corrigé plus haut.
	if (studentsError) {
		logger.error('Élèves illisibles :', studentsError);
		throw error(500, 'Impossible de charger les élèves');
	}

	const studentList = (students || [])
		.map((s) => {
			const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
			return profile
				? {
						id: profile.id,
						name: profile.full_name || 'Etudiant',
						avatar: profile.avatar_url
					}
				: null;
		})
		.filter((s): s is { id: string; name: string; avatar: string | null } => s !== null);

	// Le modèle dont ce chapitre est issu — `null` s'il n'en a aucun.
	//
	// ⚠️ Jamais un objet « rien à signaler » à la place de `null` : l'écran
	// affichait alors « Template supprimé » sur tous les chapitres créés à la
	// main — puis plantait sur le premier tooltip.
	const { data: templateInstantiation, error: templateInstantiationError } =
		await getInstantiationWithStatus(chapterId, locals.supabase);

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (templateInstantiationError) {
		logger.error('Enrichissement illisible :', templateInstantiationError);
	}

	return {
		chapter: {
			id: chapter.id,
			classId: chapter.class_id,
			title: chapter.title,
			description: chapter.description,
			displayOrder: chapter.display_order,
			isVisible: chapter.is_visible,
			color: chapter.color,
			icon: chapter.icon,
			createdAt: chapter.created_at,
			updatedAt: chapter.updated_at
		},
		classData,
		sections,
		documents,
		checklistItems,
		exercises,
		exerciseDetails,
		availableExercises: availableExercises || [],
		worksheets,
		distributedWorksheetIds,
		availableWorksheets: availableWorksheets || [],
		chapterSeries: chapterSeriesResult.data ?? [],
		availableSeries: availableSeriesResult.data ?? [],
		checklistProgress: checklistProgress || [],
		students: studentList,
		templateInstantiation
	};
};

/** Q129 (b) : le texte exact de l'avertissement, décidé par David. */
const ONGOING_EVALUATION_WARNING =
	'Cette série est aussi celle d’un contrôle en cours : tes élèves pourront s’entraîner dessus avant.';

/**
 * Le code HTTP d'un échec du module des séries de chapitre : introuvable ou
 * refusé (zéro ligne) → 404, doublon, série supprimée et élément du modèle → 409,
 * sinon 500.
 */
function seriesFailure(err: ChapterSeriesError, action: string, fallback: string) {
	switch (err.kind) {
		case 'not_found':
			return fail(404, { error: 'Série introuvable', action });
		case 'duplicate':
			return fail(409, { error: 'Cette série est déjà dans le chapitre', action });
		case 'series_gone':
			return fail(409, { error: 'Cette série n’existe plus.', action });
		case 'linked':
			return fail(409, { error: LINKED_ELEMENT_MESSAGE, action });
		default:
			return fail(500, { error: fallback, action });
	}
}

/**
 * Range la ressource qui vient d'être créée dans la section demandée.
 *
 * ⚠️ Un échec de rangement ne fait PAS échouer la création : la ressource
 * existe déjà, et rendre `fail()` ferait croire au professeur qu'elle n'a pas
 * été créée — il la recréerait, et se retrouverait avec un doublon. Elle
 * retombe simplement en « Non classé », où elle est visible et déplaçable.
 * `placed: false` laisse l'écran le dire au lieu de le taire.
 */
async function rangerSiDemande(
	chapterId: string,
	formData: FormData,
	kind: SectionContentKind,
	itemId: string,
	supabase: App.Locals['supabase'],
	action: string
) {
	const cible = targetSectionFieldSchema.safeParse(formData.get('sectionId'));

	if (!cible.success || !cible.data) {
		return { success: true, action, placed: true };
	}

	const { error: placeError } = await placeInSection(chapterId, cible.data, kind, itemId, supabase);

	if (placeError) {
		logger.error(`[${action}] Rangement impossible :`, placeError);
		return { success: true, action, placed: false };
	}

	return { success: true, action, placed: true };
}

export const actions: Actions = {
	// ============ CHECKLIST ACTIONS ============

	addChecklistItem: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			logger.error('[addChecklistItem] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'addChecklistItem' });
		}

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'addChecklistItem' });
		}

		const formData = await request.formData();
		// Le chapitre vient de l'adresse, pas du formulaire : sans lui, le schéma
		// refusait chaque ajout (400, 2026-10-14).
		const data = {
			chapterId,
			content: formData.get('content') as string,
			description: (formData.get('description') as string) || undefined
		};

		const validation = createChecklistItemSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message, action: 'addChecklistItem' });
		}

		const { data: created, error: addError } = await addChecklistItem(
			chapterId,
			validation.data,
			locals.supabase
		);

		if (addError || !created) {
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addChecklistItem' });
		}

		return rangerSiDemande(
			chapterId,
			formData,
			'checklistItem',
			created.id,
			locals.supabase,
			'addChecklistItem'
		);
	},

	updateChecklistItem: async ({ request, locals, params: _params }) => {
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		// Verify item exists (RLS enforces ownership)
		const { data: item, error: itemError } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id')
			.eq('id', itemId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (itemError && itemError.code !== 'PGRST116') {
			logger.error('[updateChecklistItem] Lecture impossible :', itemError);
			return fail(500, { error: 'Verification impossible', action: 'updateChecklistItem' });
		}

		if (!item) {
			return fail(403, { error: 'Acces refuse', action: 'updateChecklistItem' });
		}

		const data = {
			content: formData.get('content') as string | undefined,
			description: formData.get('description') as string | undefined
		};

		const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

		const validation = updateChecklistItemSchema.safeParse(cleanData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'updateChecklistItem'
			});
		}

		const { error: updateError } = await updateChecklistItem(
			itemId,
			validation.data,
			locals.supabase
		);

		if (updateError) {
			return fail(500, { error: 'Erreur lors de la mise a jour', action: 'updateChecklistItem' });
		}

		return { success: true, action: 'updateChecklistItem' };
	},

	deleteChecklistItem: async ({ request, locals }) => {
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		// Verify item exists (RLS enforces ownership)
		const { data: item, error: itemError } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id, source_id')
			.eq('id', itemId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (itemError && itemError.code !== 'PGRST116') {
			logger.error('[deleteChecklistItem] Lecture impossible :', itemError);
			return fail(500, { error: 'Verification impossible', action: 'deleteChecklistItem' });
		}

		if (!item) {
			return fail(403, { error: 'Acces refuse', action: 'deleteChecklistItem' });
		}

		if (item.source_id !== null) {
			return fail(409, { error: LINKED_ELEMENT_MESSAGE, action: 'deleteChecklistItem' });
		}

		const { error: deleteError } = await deleteChecklistItem(itemId, locals.supabase);

		if (deleteError) {
			return fail(500, { error: 'Erreur lors de la suppression', action: 'deleteChecklistItem' });
		}

		return { success: true, action: 'deleteChecklistItem' };
	},

	// ============ QUIZ ACTIONS ============

	/**
	 * Publier ou dépublier un contenu du chapitre.
	 *
	 * Une seule action pour les cinq types : le type est validé contre une liste
	 * fermée, puis traduit en nom de table par `chapters-publication`. Il ne
	 * traverse jamais la frontière sous forme de nom de table.
	 */
	setPublication: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const validation = setPublicationSchema.safeParse({
			contentType: formData.get('contentType'),
			itemId: formData.get('itemId'),
			published: formData.get('published') === 'true'
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'setPublication'
			});
		}

		const { error: publicationError } = await setContentPublication(
			{ ...validation.data, teacherId: user.id },
			locals.supabase
		);

		if (publicationError) {
			logger.error('[setPublication] Écriture impossible :', publicationError);
			return fail(500, {
				error: "Impossible de changer l'état de publication",
				action: 'setPublication'
			});
		}

		return {
			success: true,
			action: validation.data.published ? 'publish' : 'unpublish'
		};
	},

	/**
	 * Masquer ou démasquer un élément du MODÈLE dans ce chapitre (ADR 0029, Q4).
	 * Masquer le dépublie ; un élément propre au chapitre ne se masque pas (404).
	 */
	setHidden: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');

		const chapterIdCheck = uuidSchema.safeParse(params.chapterId);
		const formData = await request.formData();
		const validation = setHiddenSchema.safeParse({
			contentType: formData.get('contentType'),
			itemId: formData.get('itemId'),
			hidden: formData.get('hidden') === 'true'
		});

		if (!chapterIdCheck.success || !validation.success) {
			return fail(400, { error: 'Élément invalide', action: 'setHidden' });
		}

		const {
			error: hideError,
			notFound,
			sectionHidden
		} = await setLinkedElementHidden(
			{ chapterId: chapterIdCheck.data, ...validation.data },
			locals.supabase
		);

		if (sectionHidden) {
			return fail(409, {
				error: 'Sa section est masquée : réaffichez la section d’abord',
				action: 'setHidden'
			});
		}
		if (notFound) {
			return fail(404, { error: 'Élément du modèle introuvable', action: 'setHidden' });
		}
		if (hideError) {
			return fail(500, { error: 'Impossible de masquer cet élément', action: 'setHidden' });
		}

		return { success: true, action: validation.data.hidden ? 'hide' : 'unhide' };
	},

	/**
	 * Masquer ou réafficher une SECTION de ce chapitre (du modèle ou propre). La
	 * base masque et dépublie alors tout son contenu, ou le fait revenir non
	 * publié.
	 */
	setSectionHidden: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');

		const chapterIdCheck = uuidSchema.safeParse(params.chapterId);
		const formData = await request.formData();
		const validation = setSectionHiddenSchema.safeParse({
			sectionId: formData.get('sectionId'),
			hidden: formData.get('hidden') === 'true'
		});

		if (!chapterIdCheck.success || !validation.success) {
			return fail(400, { error: 'Section invalide', action: 'setSectionHidden' });
		}

		const { error: hideError, notFound } = await setChapterSectionHidden(
			{ chapterId: chapterIdCheck.data, ...validation.data },
			locals.supabase
		);

		if (notFound) {
			return fail(404, { error: 'Section introuvable', action: 'setSectionHidden' });
		}
		if (hideError) {
			return fail(500, {
				error: validation.data.hidden
					? 'Impossible de masquer cette section'
					: 'Impossible de réafficher cette section',
				action: 'setSectionHidden'
			});
		}

		return { success: true, action: validation.data.hidden ? 'hideSection' : 'unhideSection' };
	},

	linkExercise: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			logger.error('[linkExercise] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'linkExercise' });
		}

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'linkExercise' });
		}

		const formData = await request.formData();
		const exerciseId = formData.get('exerciseId') as string;

		if (!exerciseId) {
			return fail(400, { error: 'Exercice requis', action: 'linkExercise' });
		}

		const { data: created, error: linkError } = await linkExercise(
			chapterId,
			exerciseId,
			locals.supabase
		);

		if (linkError || !created) {
			return fail(500, { error: 'Erreur lors du lien', action: 'linkExercise' });
		}

		return rangerSiDemande(
			chapterId,
			formData,
			'exercise',
			created.id,
			locals.supabase,
			'linkExercise'
		);
	},

	unlinkExercise: async ({ request, locals }) => {
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const chapterExerciseId = formData.get('chapterExerciseId') as string;

		// Verify link exists (RLS enforces ownership)
		const { data: link, error: linkError } = await locals.supabase
			.from('chapter_exercises')
			.select('id, source_id')
			.eq('id', chapterExerciseId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (linkError && linkError.code !== 'PGRST116') {
			logger.error('[unlinkExercise] Lecture impossible :', linkError);
			return fail(500, { error: 'Verification impossible', action: 'unlinkExercise' });
		}

		if (!link) {
			return fail(403, { error: 'Acces refuse', action: 'unlinkExercise' });
		}

		if (link.source_id !== null) {
			return fail(409, { error: LINKED_ELEMENT_MESSAGE, action: 'unlinkExercise' });
		}

		const { error: unlinkError } = await unlinkExercise(chapterExerciseId, locals.supabase);

		if (unlinkError) {
			return fail(500, { error: 'Erreur lors de la suppression', action: 'unlinkExercise' });
		}

		return { success: true, action: 'unlinkExercise' };
	},

	// ============ WORKSHEET ACTIONS ============
	//
	// Rattacher ne DISTRIBUE pas : la policy de l'élève sur `chapter_worksheets`
	// exige `student_has_worksheet_access`. Une fiche rangée ici avant d'être
	// affectée reste invisible pour lui — c'est ce qui permet de préparer un
	// chapitre à l'avance.

	linkWorksheet: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			logger.error('[linkWorksheet] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'linkWorksheet' });
		}

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'linkWorksheet' });
		}

		const formData = await request.formData();
		const worksheetId = formData.get('worksheetId') as string;

		if (!worksheetId) {
			return fail(400, { error: 'Fiche requise', action: 'linkWorksheet' });
		}

		const { data: created, error: linkError } = await linkWorksheet(
			chapterId,
			worksheetId,
			locals.supabase
		);

		if (linkError || !created) {
			return fail(500, { error: 'Erreur lors du lien', action: 'linkWorksheet' });
		}

		return rangerSiDemande(
			chapterId,
			formData,
			'worksheet',
			created.id,
			locals.supabase,
			'linkWorksheet'
		);
	},

	// ============ SÉRIES DU CHAPITRE ============

	/**
	 * Rattacher une série enregistrée (S1), dans la forme choisie (Q124 a).
	 * Le rattachement naît préparé : rien n'est visible avant la publication.
	 */
	linkSeries: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const chapterIdCheck = uuidSchema.safeParse(params.chapterId);
		if (!chapterIdCheck.success) {
			return fail(400, { error: 'Chapitre invalide', action: 'linkSeries' });
		}
		const chapterId = chapterIdCheck.data;

		const formData = await request.formData();
		const validation = linkSeriesSchema.safeParse({
			seriesId: formData.get('seriesId'),
			form: formData.get('form') || undefined
		});
		if (!validation.success) {
			return fail(400, { error: 'Série ou forme invalide', action: 'linkSeries' });
		}

		const { data: created, error: linkError } = await linkSeries(
			chapterId,
			validation.data.seriesId,
			validation.data.form,
			user.id,
			locals.supabase
		);

		if (linkError) {
			return seriesFailure(linkError, 'linkSeries', 'Erreur lors du rattachement');
		}
		if (!created) {
			return fail(500, { error: 'Erreur lors du rattachement', action: 'linkSeries' });
		}

		const rangement = await rangerSiDemande(
			chapterId,
			formData,
			'series',
			created.id,
			locals.supabase,
			'linkSeries'
		);

		// Q129 (b) : le rattachement est fait ; on prévient seulement. Une panne
		// de lecture n'invente pas d'avertissement (elle est journalisée).
		const { data: ongoing } = await findOngoingEvaluation(
			validation.data.seriesId,
			locals.supabase
		);
		return ongoing ? { ...rangement, warning: ONGOING_EVALUATION_WARNING } : rangement;
	},

	/** Changer la forme de lancement : flash-cards ou entraînement. */
	setSeriesForm: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const chapterIdCheck = uuidSchema.safeParse(params.chapterId);
		const formData = await request.formData();
		const validation = setSeriesFormSchema.safeParse({
			chapterSeriesId: formData.get('chapterSeriesId'),
			form: formData.get('form')
		});
		if (!chapterIdCheck.success || !validation.success) {
			return fail(400, { error: 'Série ou forme invalide', action: 'setSeriesForm' });
		}

		const { error: formError } = await setSeriesForm(
			chapterIdCheck.data,
			validation.data.chapterSeriesId,
			validation.data.form,
			locals.supabase
		);
		if (formError) {
			return seriesFailure(formError, 'setSeriesForm', 'Impossible de changer la forme');
		}

		return { success: true, action: 'setSeriesForm' };
	},

	/** Retirer la série du chapitre (S4) : la série elle-même reste. */
	unlinkSeries: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const chapterIdCheck = uuidSchema.safeParse(params.chapterId);
		const formData = await request.formData();
		const validation = unlinkSeriesSchema.safeParse({
			chapterSeriesId: formData.get('chapterSeriesId')
		});
		if (!chapterIdCheck.success || !validation.success) {
			return fail(400, { error: 'Série invalide', action: 'unlinkSeries' });
		}

		const { error: unlinkError } = await unlinkSeries(
			chapterIdCheck.data,
			validation.data.chapterSeriesId,
			locals.supabase
		);
		if (unlinkError) {
			return seriesFailure(unlinkError, 'unlinkSeries', 'Erreur lors du retrait');
		}

		return { success: true, action: 'unlinkSeries' };
	},

	/**
	 * Faire un modèle de ce chapitre (ADR 0029).
	 *
	 * Le modèle naît en brouillon avec une COPIE du contenu du chapitre (fichiers
	 * compris) ; le chapitre devient lié au modèle et adopte chacun de ses
	 * éléments — publications et cases cochées des élèves gardées.
	 */
	createTemplate: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas ; toute autre panne mérite son propre
		// message plutôt qu'un « accès refusé » trompeur.
		if (chapterError && chapterError.code !== 'PGRST116') {
			logger.error('[createTemplate] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'createTemplate' });
		}

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'createTemplate' });
		}

		const formData = await request.formData();
		const validation = createTemplateFromChapterSchema.safeParse({
			chapterId,
			title: formData.get('title'),
			description: (formData.get('description') as string | null) || undefined
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'createTemplate'
			});
		}

		const {
			data: template,
			error: createError,
			warning
		} = await createTemplateFromChapter(validation.data, user.id, locals.supabase);

		if (createError || !template) {
			logger.error('[createTemplate] Creation impossible :', createError);
			return fail(500, { error: 'Erreur lors de la creation du modele', action: 'createTemplate' });
		}

		// Modèle créé, mais une partie du chapitre n'a pas pu le relier : le dire.
		return warning
			? { success: true, action: 'createTemplate', templateId: template.id, warning }
			: { success: true, action: 'createTemplate', templateId: template.id };
	},

	unlinkWorksheet: async ({ request, locals }) => {
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const chapterWorksheetId = formData.get('chapterWorksheetId') as string;

		const { data: link, error: linkError } = await locals.supabase
			.from('chapter_worksheets')
			.select('id, source_id')
			.eq('id', chapterWorksheetId)
			.single();

		if (linkError && linkError.code !== 'PGRST116') {
			logger.error('[unlinkWorksheet] Lecture impossible :', linkError);
			return fail(500, { error: 'Verification impossible', action: 'unlinkWorksheet' });
		}

		if (!link) {
			return fail(403, { error: 'Acces refuse', action: 'unlinkWorksheet' });
		}

		if (link.source_id !== null) {
			return fail(409, { error: LINKED_ELEMENT_MESSAGE, action: 'unlinkWorksheet' });
		}

		const { error: unlinkError } = await unlinkWorksheet(chapterWorksheetId, locals.supabase);

		if (unlinkError) {
			return fail(500, { error: 'Erreur lors de la suppression', action: 'unlinkWorksheet' });
		}

		return { success: true, action: 'unlinkWorksheet' };
	},

	// ============ DOCUMENT ACTIONS ============

	addGoogleDriveDocument: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			logger.error('[addGoogleDriveDocument] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'addGoogleDriveDocument' });
		}

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'addGoogleDriveDocument' });
		}

		const formData = await request.formData();
		const googleDriveUrl = formData.get('googleDriveUrl') as string;
		const title = formData.get('title') as string;
		const description = (formData.get('description') as string) || null;

		if (!googleDriveUrl?.trim()) {
			return fail(400, { error: 'URL Google Drive requise', action: 'addGoogleDriveDocument' });
		}

		if (!title?.trim()) {
			return fail(400, { error: 'Titre requis', action: 'addGoogleDriveDocument' });
		}

		// Basic URL validation
		if (
			!googleDriveUrl.includes('drive.google.com') &&
			!googleDriveUrl.includes('docs.google.com')
		) {
			return fail(400, { error: 'URL Google Drive invalide', action: 'addGoogleDriveDocument' });
		}

		// Extract Google file ID from URL (optional - for API operations later)
		let googleFileId: string | null = null;
		const fileIdMatch = googleDriveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
		if (fileIdMatch) {
			googleFileId = fileIdMatch[1];
		}

		const { data: created, error: dbError } = await addChapterDocument(
			chapterId,
			{
				chapterId,
				sourceType: 'google_drive',
				title: title.trim(),
				description: description?.trim() || null,
				googleDriveUrl: googleDriveUrl.trim(),
				googleFileId: googleFileId ?? ''
			},
			locals.supabase
		);

		if (dbError || !created) {
			logger.error('[addGoogleDriveDocument] Error:', dbError);
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addGoogleDriveDocument' });
		}

		return rangerSiDemande(
			chapterId,
			formData,
			'document',
			created.id,
			locals.supabase,
			'addGoogleDriveDocument'
		);
	},

	deleteDocument: async ({ request, locals }) => {
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const documentId = formData.get('documentId') as string;

		if (!documentId) {
			return fail(400, { error: 'Document ID requis', action: 'deleteDocument' });
		}

		const idCheck = uuidSchema.safeParse(documentId);
		if (!idCheck.success) {
			return fail(400, { error: 'Document ID invalide', action: 'deleteDocument' });
		}

		// Get document info and verify it exists (RLS enforces ownership)
		const { data: document, error: documentError } = await locals.supabase
			.from('chapter_documents')
			.select('id, storage_path, source_type, source_id')
			.eq('id', idCheck.data)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (documentError && documentError.code !== 'PGRST116') {
			logger.error('[deleteDocument] Lecture impossible :', documentError);
			return fail(500, { error: 'Verification impossible', action: 'deleteDocument' });
		}

		if (!document) {
			return fail(403, { error: 'Acces refuse', action: 'deleteDocument' });
		}

		// Élément du modèle : il se masque, et son fichier — celui du modèle,
		// partagé par tous les chapitres liés — n'est JAMAIS supprimé d'ici.
		if (document.source_id !== null) {
			return fail(409, { error: LINKED_ELEMENT_MESSAGE, action: 'deleteDocument' });
		}

		// La ligne D'ABORD, vérifiée : un refus silencieux de la RLS laissait
		// sinon le document en place, privé de son fichier.
		const { error: dbError } = await deleteChapterDocument(idCheck.data, locals.supabase);

		if (dbError) {
			logger.error('[deleteDocument] Error:', dbError);
			return fail(500, { error: 'Erreur lors de la suppression', action: 'deleteDocument' });
		}

		// If it's an uploaded file, delete from storage
		if (document.source_type === 'upload' && document.storage_path) {
			const { error: storageError } = await locals.supabase.storage
				.from('chapter-documents')
				.remove([document.storage_path]);

			if (storageError) {
				logger.warn('[deleteDocument] Storage delete warning:', storageError);
				// Continue anyway - the document row is already gone
			}
		}

		return { success: true, action: 'deleteDocument' };
	},

	// ============ TEMPLATE ACTIONS ============

	detachFromTemplate: async ({ locals, params }) => {
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			logger.error('[detachFromTemplate] Lecture impossible :', chapterError);
			return fail(500, { error: 'Vérification impossible', action: 'detachFromTemplate' });
		}

		if (!chapter) {
			return fail(403, { error: 'Accès refusé', action: 'detachFromTemplate' });
		}

		const { error: detachError } = await detachChapterFromTemplate(chapterId, locals.supabase);

		if (detachError) {
			logger.error('[detachFromTemplate] Error:', detachError);
			return fail(500, { error: 'Erreur lors du détachement', action: 'detachFromTemplate' });
		}

		return { success: true, action: 'detachFromTemplate' };
	}
};
