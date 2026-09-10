/**
 * Teacher Class Journal Entry Editor Page Server
 * ===============================================
 *
 * Handles CRUD operations for a specific journal entry.
 * Supports create, update, delete, and publish toggle actions.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '$lib/server/journal';
import {
	parseHomeworkItems,
	validateCreateJournalEntry,
	validateUpdateJournalEntry
} from '$lib/server/validation/journal';
import { getCurriculumTree } from '$lib/server/curriculum';
import { reconcileAutoCoverage, type ReconcileReport } from '$lib/server/curriculum-coverage';
import { parsePendingActivities } from '$lib/server/journal-activities';
import {
	getHomeworkForEntry,
	prepareHomeworkForEntry,
	setHomeworkForEntry,
	type HomeworkItemInput
} from '$lib/server/journal-homework';
import { getUpcomingSessionDates } from '$lib/server/class-sessions';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('ID invalide');

// Date validation schema (YYYY-MM-DD)
const dateParamSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
	.refine(
		(date) => {
			const parsed = new Date(date);
			return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
		},
		{ message: 'Date invalide' }
	);

export const load: PageServerLoad = async ({ locals, params }) => {
	// Only teachers can view this page
	await requireRole(locals, 'teacher');

	const { classId, date } = params;

	// Validate URL parameters
	const classIdResult = uuidSchema.safeParse(classId);
	if (!classIdResult.success) {
		throw error(400, 'ID de classe invalide');
	}

	const dateResult = dateParamSchema.safeParse(date);
	if (!dateResult.success) {
		throw error(400, 'Format de date invalide');
	}

	// Verify the class exists (mono-teacher: RLS scopes access to teacher/admin)
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name, grade')
		.eq('id', classId)
		.single();

	if (classError || !classData) {
		throw error(404, 'Classe non trouvee');
	}

	// Try to load existing entry for this class and date
	const { data: existingEntry, error: entryError } = await locals.supabase
		.from('class_journal_entries')
		.select('*')
		.eq('class_id', classId)
		.eq('entry_date', date)
		.single();

	// PGRST116 = no rows returned, which is fine (creating new entry)
	if (entryError && entryError.code !== 'PGRST116') {
		console.error('[Journal Entry] Error fetching entry:', entryError);
	}

	// Convert database format to application format if entry exists
	const entry = existingEntry
		? {
				id: existingEntry.id,
				classId: existingEntry.class_id,
				entryDate: existingEntry.entry_date,
				lessonContent: existingEntry.lesson_content,
				isPublished: existingEntry.is_published,
				createdAt: existingEntry.created_at,
				updatedAt: existingEntry.updated_at
			}
		: null;

	// Programme travaillé — curriculum tree (class grade) + this entry's coverage.
	const curriculumTree = classData.grade
		? await getCurriculumTree(locals.supabase, classData.grade)
		: [];

	let coveredPoints: { point_id: string; source: string }[] = [];
	let activities: {
		id: string;
		kind: string;
		exercise_id: string | null;
		question_template_id: string | null;
		assessment_id: string | null;
		chapter_id: string | null;
		textbook_ref: unknown;
		label: string | null;
		display_order: number;
	}[] = [];
	if (entry) {
		const { data: cov, error: covError } = await locals.supabase
			.from('journal_entry_points')
			.select('point_id, source')
			.eq('entry_id', entry.id);

		if (covError) {
			console.error('Lecture impossible :', covError);
			throw error(500, 'Impossible de charger les données');
		}
		coveredPoints = (cov ?? []) as { point_id: string; source: string }[];

		const { data: acts, error: actsError } = await locals.supabase
			.from('journal_entry_activities')
			.select(
				'id, kind, exercise_id, question_template_id, assessment_id, chapter_id, textbook_ref, label, display_order'
			)
			.eq('entry_id', entry.id)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });

		if (actsError) {
			console.error('Lecture impossible :', actsError);
			throw error(500, 'Impossible de charger les données');
		}
		activities = (acts ?? []) as typeof activities;
	}

	// Exercises selectable for this class's grade (for the activity picker).
	let exerciseOptions: { value: string; label: string }[] = [];
	if (classData.grade) {
		const { data: exs, error: exsError } = await locals.supabase
			.from('exercises')
			.select('id, title, slug, topic')
			.contains('grades', [classData.grade])
			.order('title', { ascending: true })
			.limit(500);

		// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
		// laisse une trace.
		if (exsError) {
			console.error('Enrichissement illisible :', exsError);
		}
		exerciseOptions = (exs ?? []).map((e) => ({
			value: e.id,
			label: e.title || e.topic || e.slug || 'Exercice sans titre'
		}));
	}

	// Questions and assessments selectable for this class's grade. Drafts are
	// listed too: a session records what was worked on, and a question can be
	// worked on before it is published.
	let questionOptions: { value: string; label: string }[] = [];
	let assessmentOptions: { value: string; label: string }[] = [];
	if (classData.grade) {
		const [{ data: qs }, { data: assess }] = await Promise.all([
			locals.supabase
				.from('question_templates')
				.select('id, title, theme, domain, level')
				.contains('grades', [classData.grade])
				.order('title', { ascending: true })
				.limit(500),
			locals.supabase
				.from('assessments')
				.select('id, title')
				.eq('grade', classData.grade)
				.neq('status', 'archived')
				.order('title', { ascending: true })
				.limit(200)
		]);
		questionOptions = (qs ?? []).map((q) => ({
			value: q.id,
			// Le titre seul se répète beaucoup d'une question à l'autre ; la
			// catégorie est ce qui les distingue dans la liste.
			label: `${q.title} — ${q.theme} / ${q.domain} (niv. ${q.level})`
		}));
		assessmentOptions = (assess ?? []).map((a) => ({ value: a.id, label: a.title }));
	}

	// Travaux à faire de la séance, et les dates qu'on pourra leur donner.
	//
	// `hasSchedule` distingue « plus aucune séance cette année » (liste close)
	// de « emploi du temps jamais renseigné » (rien pour en construire une). Le
	// second cas concerne trois des quatre classes actives : la page y bascule
	// sur un champ date libre au lieu d'un menu vide qui bloquerait la saisie.
	const homework = entry ? await getHomeworkForEntry(locals.supabase, entry.id) : [];
	const { dates: sessionDates, hasSchedule } = await getUpcomingSessionDates(
		locals.supabase,
		classId,
		date
	);

	return {
		classData,
		entry,
		entryDate: date,
		homework,
		sessionDates,
		hasSchedule,
		curriculumTree,
		coveredPoints,
		activities,
		exerciseOptions,
		questionOptions,
		assessmentOptions
	};
};

/**
 * Relit et valide les travaux à faire AVANT toute écriture.
 *
 * Séparé de l'écriture à dessein : une échéance invalide doit faire échouer
 * l'enregistrement sans que rien n'ait été touché. Valider après avoir créé la
 * séance laisserait le professeur avec une séance à moitié enregistrée.
 *
 * `null` veut dire « le formulaire ne porte pas ce champ » — et alors on n'y
 * touche pas du tout : `set_journal_entry_homework` remplace la liste entière,
 * donc l'appeler par précaution effacerait tous les travaux.
 */
async function preparerTravaux(
	locals: App.Locals,
	formData: FormData,
	classId: string,
	entryDate: string
): Promise<{ items: HomeworkItemInput[] } | { error: string } | null> {
	const brut = formData.get('homeworkItems');
	if (brut === null) return null;

	const parsed = parseHomeworkItems(brut);
	if (!parsed.success) return { error: parsed.message };

	const { items, refusees } = await prepareHomeworkForEntry(
		locals.supabase,
		classId,
		entryDate,
		parsed.data
	);

	// Le menu ne propose que des jours de cours, mais une requête forgée porte ce
	// qu'elle veut : la règle se rejoue ici, côté serveur.
	if (refusees.length > 0) {
		const liste = refusees.join(', ');
		return {
			error:
				refusees.length === 1
					? `L'échéance du ${liste} ne tombe pas un jour où la classe a cours.`
					: `Ces échéances ne tombent pas un jour où la classe a cours : ${liste}.`
		};
	}

	return { items };
}

/**
 * Message d'alerte quand une référence cite un exercice qui n'existe pas.
 *
 * `#7` sur une fiche de six exercices ne casse rien — les autres numéros sont
 * pris en compte — mais c'est une faute de frappe, et le professeur doit
 * l'apprendre en enregistrant plutôt qu'en constatant plus tard qu'un point
 * manque à sa couverture.
 */
function decrireNumerosIntrouvables(rapport: ReconcileReport): string | undefined {
	const numeros = rapport.numerosIntrouvables.flatMap((entree) => entree.numeros);
	if (numeros.length === 0) return undefined;

	const liste = numeros.join(', ');
	return numeros.length === 1
		? `L'exercice n° ${liste} n'existe pas dans la fiche citée : il a été ignoré.`
		: `Les exercices n° ${liste} n'existent pas dans les fiches citées : ils ont été ignorés.`;
}

export const actions: Actions = {
	/**
	 * Create a new journal entry
	 */
	create: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId, date } = params;

		// Validate URL parameters
		const classIdResult = uuidSchema.safeParse(classId);
		if (!classIdResult.success) {
			return fail(400, { error: 'ID de classe invalide', action: 'create' });
		}

		const dateResult = dateParamSchema.safeParse(date);
		if (!dateResult.success) {
			return fail(400, { error: 'Format de date invalide', action: 'create' });
		}

		const formData = await request.formData();

		// Build input data
		const inputData = {
			classId,
			entryDate: date,
			lessonContent: (formData.get('lessonContent') as string) || null,
			isPublished: formData.get('isPublished') === 'true'
		};

		// Validate input
		const validation = validateCreateJournalEntry(inputData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'create'
			});
		}

		// Travaux validés AVANT la création : une échéance impossible doit refuser
		// l'enregistrement sans laisser derrière elle une séance à moitié écrite.
		const travaux = await preparerTravaux(locals, formData, classId, date);
		if (travaux && 'error' in travaux) {
			return fail(400, { error: travaux.error, action: 'create' });
		}

		// Create the entry
		const { data: entry, error: createError } = await createJournalEntry(
			locals.supabase,
			user.id,
			validation.data
		);

		if (createError) {
			console.error('[Create Journal Entry] Error:', createError);
			return fail(500, { error: createError.message, action: 'create' });
		}

		// Couverture cochée AVANT enregistrement : sur une séance neuve, il n'y
		// avait pas encore d'entrée à référencer. La page a gardé la sélection et
		// l'envoie ici, pour l'écrire dans la foulée de la création.
		const rawPoints = (formData.get('coveredPointIds') as string) || '';
		const pointIds = [
			...new Set(
				rawPoints
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
			)
		];

		if (entry?.id && pointIds.length > 0) {
			const valid = pointIds.filter((id) => uuidSchema.safeParse(id).success).slice(0, 500);
			if (valid.length > 0) {
				const { error: covError } = await locals.supabase
					.from('journal_entry_points')
					.insert(valid.map((point_id) => ({ entry_id: entry.id, point_id, source: 'manual' })));
				// La séance, elle, est créée : un échec de couverture ne doit pas la
				// perdre. On le signale sans annuler.
				if (covError) {
					console.error('[Create Journal Entry] coverage failed:', covError);
					return {
						success: true,
						action: 'create',
						entryId: entry.id,
						warning: 'Séance créée, mais les points du programme n’ont pas pu être enregistrés.'
					};
				}
			}
		}

		// Activités choisies avant enregistrement, même raison que la couverture.
		// Elles arrivent en JSON parce qu'un type accompagne chaque référence.
		if (entry?.id) {
			const rows = parsePendingActivities(formData.get('pendingActivities'));
			if (rows.length > 0) {
				const { error: actError } = await locals.supabase
					.from('journal_entry_activities')
					.insert(rows.map((r) => ({ ...r, entry_id: entry.id })));
				if (actError) {
					console.error('[Create Journal Entry] activities failed:', actError);
					return {
						success: true,
						action: 'create',
						entryId: entry.id,
						warning: 'Séance créée, mais les activités n’ont pas pu être enregistrées.'
					};
				}
			}
		}

		// Travaux à faire, écrits une fois la séance créée — ils la référencent.
		if (entry?.id && travaux) {
			const { error: hwError } = await setHomeworkForEntry(
				locals.supabase,
				entry.id,
				travaux.items
			);
			if (hwError) {
				return {
					success: true,
					action: 'create',
					entryId: entry.id,
					warning: 'Séance créée, mais les travaux à faire n’ont pas pu être enregistrés.'
				};
			}
		}

		// La couverture `auto` vient des activités taguées ET des ressources citées
		// dans le contenu : on réconcilie donc même sans activité, puisqu'une séance
		// peut n'être qu'un texte contenant des [[exercice:…]].
		let avertissement: string | undefined;
		if (entry?.id) {
			try {
				const rapport = await reconcileAutoCoverage(locals.supabase, entry.id);
				avertissement = decrireNumerosIntrouvables(rapport);
			} catch (e) {
				console.error('[Create Journal Entry] reconcile failed:', e);
			}
		}

		return { success: true, action: 'create', entryId: entry?.id, warning: avertissement };
	},

	/**
	 * Update an existing journal entry
	 */
	update: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId, date } = params;

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;

		// Validate entry ID
		const entryIdResult = uuidSchema.safeParse(entryId);
		if (!entryIdResult.success) {
			return fail(400, { error: 'ID entree invalide', action: 'update' });
		}

		// Build update data
		const updateData: Record<string, unknown> = {};

		const lessonContent = formData.get('lessonContent');
		if (lessonContent !== null) {
			updateData.lessonContent = lessonContent || null;
		}

		const isPublished = formData.get('isPublished');
		if (isPublished !== null) {
			updateData.isPublished = isPublished === 'true';
		}

		// Validate input
		const validation = validateUpdateJournalEntry(updateData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'update'
			});
		}

		// L'`entryId` vient du FORMULAIRE, la classe et la date de l'URL : rien ne
		// garantit qu'ils désignent la même séance. Sans ce contrôle, une requête
		// forgée ferait juger les échéances sur le calendrier d'une classe et les
		// écrire sur une autre. Le professeur a le droit d'écrire partout — ce
		// n'est donc pas une frontière franchie, mais une garde qui ne garderait
		// rien.
		const { data: seance, error: seanceError } = await locals.supabase
			.from('class_journal_entries')
			.select('class_id, entry_date')
			.eq('id', entryId)
			.single();

		if (seanceError || !seance) {
			return fail(404, { error: 'Séance introuvable', action: 'update' });
		}
		if (seance.class_id !== classId || seance.entry_date !== date) {
			return fail(400, { error: 'Séance incohérente avec l’adresse', action: 'update' });
		}

		// Comme à la création : les échéances sont jugées avant toute écriture.
		const travaux = await preparerTravaux(locals, formData, classId, date);
		if (travaux && 'error' in travaux) {
			return fail(400, { error: travaux.error, action: 'update' });
		}

		// Update the entry
		const { error: updateError } = await updateJournalEntry(
			locals.supabase,
			entryId,
			user.id,
			validation.data
		);

		if (updateError) {
			console.error('[Update Journal Entry] Error:', updateError);
			return fail(500, { error: updateError.message, action: 'update' });
		}

		if (travaux) {
			const { error: hwError } = await setHomeworkForEntry(locals.supabase, entryId, travaux.items);
			if (hwError) {
				return fail(500, {
					error: 'Les travaux à faire n’ont pas pu être enregistrés.',
					action: 'update'
				});
			}
		}

		// La couverture suit désormais AUSSI les références citées dans le contenu :
		// elle doit donc être recalculée à chaque enregistrement, et non plus
		// seulement quand des activités changent. Retirer un `[[exercice]]` du texte
		// retire son point, ce que seule une réconciliation complète peut faire.
		let avertissement: string | undefined;
		try {
			const rapport = await reconcileAutoCoverage(locals.supabase, entryId);
			avertissement = decrireNumerosIntrouvables(rapport);
		} catch (e) {
			console.error('[Update Journal Entry] reconcile failed:', e);
		}

		return { success: true, action: 'update', warning: avertissement };
	},

	/**
	 * Delete a journal entry
	 */
	delete: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;

		// Validate entry ID
		const entryIdResult = uuidSchema.safeParse(entryId);
		if (!entryIdResult.success) {
			return fail(400, { error: 'ID entree invalide', action: 'delete' });
		}

		// Delete the entry
		const { error: deleteError } = await deleteJournalEntry(locals.supabase, entryId, user.id);

		if (deleteError) {
			console.error('[Delete Journal Entry] Error:', deleteError);
			return fail(500, { error: deleteError.message, action: 'delete' });
		}

		// Redirect back to main view
		throw redirect(303, `/dashboard/teacher/cahier-texte?class=${classId}`);
	},

	/**
	 * Toggle publication status
	 */
	publish: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;
		const isPublished = formData.get('isPublished') === 'true';

		// Validate entry ID
		const entryIdResult = uuidSchema.safeParse(entryId);
		if (!entryIdResult.success) {
			return fail(400, { error: 'ID entree invalide', action: 'publish' });
		}

		// Update publication status
		const { error: updateError } = await updateJournalEntry(locals.supabase, entryId, user.id, {
			isPublished
		});

		if (updateError) {
			console.error('[Publish Journal Entry] Error:', updateError);
			return fail(500, { error: updateError.message, action: 'publish' });
		}

		return { success: true, action: 'publish', isPublished };
	}
};
