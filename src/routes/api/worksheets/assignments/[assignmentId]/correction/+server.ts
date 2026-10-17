/**
 * Student Correction PDF API Endpoint
 * ====================================
 *
 * GET: Get correction PDF for a student's worksheet assignment
 *
 * Security:
 * - Verifies student is assigned this worksheet
 * - Checks if corrections are released based on assignment settings
 * - La copie est RECALCULÉE (ADR 0023), jamais lue dans `worksheet_instances` :
 *   le prof reçoit la copie de la classe (sans élève) — le même calcul que
 *   l'API élève et l'aperçu d'affectation. Un élève reçoit un 404, comme
 *   avant (il n'avait jamais d'instance).
 * - Affectation dont chaque élève a sa version (valeurs tirées ou ordre
 *   mélangé, `hasPerStudentCopies`, décision D6) : le corrigé de classe est la
 *   copie d'UN élève de l'affectation, choisi par le prof (`studentId`), avec
 *   un avertissement imprimé en tête ; son nom n'est pas imprimé. Sans
 *   `studentId`, la réponse demande l'élève (`needs_student`) au lieu d'un
 *   corrigé qui ne vaudrait pour personne. `per_student_copies` le dit.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { sanitizeForFileName } from '$lib/worksheets/pdf-file-name';
import { generateWorksheetTypst } from '$lib/typst/generators';
import { canAccessCorrections } from '$lib/server/worksheets/correction-release';
import {
	fetchAssignmentClasses,
	formatClassNames
} from '$lib/server/worksheets/assignment-classes';
import { worksheetLocale } from '$lib/types/worksheets';
import type { WorksheetAssignmentRow } from '$lib/types/worksheets';
import {
	assignmentCopyScope,
	buildWorksheetCopy,
	hasPerStudentCopies,
	type WorksheetForCopy
} from '$lib/worksheets/worksheet-copy';
import { isStudentOfAssignment } from '$lib/server/worksheets/assignment-recipients';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/assignments/[assignmentId]/correction/+server');

// Query parameter validation
// Note: 'pdf' format is not supported server-side (Typst.js requires browser)
// Use 'typst' to get the Typst source, then generate PDF client-side
const querySchema = z.object({
	format: z.enum(['typst', 'json']).optional().default('typst'),
	/** L'élève dont la copie sert de corrigé de classe (affectation individualisée) */
	studentId: z.string().uuid('Identifiant d’élève invalide').optional()
});

// ============================================================================
// GET HANDLER - Get student's correction PDF
// ============================================================================

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Connexion requise');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, 'Identifiant d’affectation requis');
	}

	// Validate query parameters
	const queryParams = querySchema.safeParse({
		format: url.searchParams.get('format') || 'pdf',
		studentId: url.searchParams.get('studentId') || undefined
	});

	if (!queryParams.success) {
		throw error(400, queryParams.error.issues[0].message);
	}

	const { format, studentId } = queryParams.data;

	try {
		// Fetch assignment with worksheet details
		const { data: assignment, error: assignmentError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
				worksheet:worksheets(
					*,
					worksheet_sections(*),
					worksheet_exercises(
						*,
						exercise:exercises(
							id,
							title,
							variables,
							shared,
							variations,
							generic_functions,
							topic
						)
					)
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !assignment) {
			throw error(404, 'Affectation introuvable');
		}

		// Check if user is a student with access to this assignment
		// `profiles` porte `class_ids`, un TABLEAU (un élève peut appartenir à
		// plusieurs classes) — il n'existe pas de `class_id`. La colonne inexistante
		// faisait rejeter la requête ENTIÈRE par PostgREST : `profile` valait donc
		// toujours `null`, `isTeacher` toujours `false`, et seul le créateur du
		// devoir pouvait ouvrir la correction. Échec en mode fermé, mais un
		// professeur non créateur et les élèves concernés étaient écartés à tort.
		const { data: profile, error: profileError } = await locals.supabase
			.from('profiles')
			.select('role, class_ids')
			.eq('id', user.id)
			.single();

		// PGRST116 = pas de profil, et le refus qui suit est légitime. Toute AUTRE
		// panne produisait le même refus, indiscernable d'un refus mérité.
		if (profileError && profileError.code !== 'PGRST116') {
			logger.error('Rôle illisible :', profileError);
			throw error(500, 'Impossible de vérifier les droits d’accès');
		}

		const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';
		const isAssignmentCreator = assignment.created_by === user.id;

		// L'accès élève est délégué à `can_access_assignment`, qui connaît les DEUX
		// voies de distribution — la jonction des classes et la désignation
		// nominale. Le test précédent ne regardait que `assignment.class_id`, la
		// colonne historique : un élève d'une seconde classe, ou un élève hors
		// classe nommément désigné, se voyait refuser la correction d'une fiche à
		// laquelle il a pourtant accès. Refus en mode fermé, donc sans fuite — mais
		// un refus injustifié, et le même défaut que celui réparé dans la migration
		// 20260911100000 un étage plus haut.
		const { data: hasAccess, error: accessError } = await locals.supabase.rpc(
			'can_access_assignment',
			{
				p_assignment_id: assignmentId
			}
		);

		if (accessError) {
			logger.error('Droits sur l’affectation illisibles :', accessError.message);
			throw error(500, 'Impossible de vérifier les droits d’accès');
		}

		const isStudentInClass = hasAccess === true;

		logger.info('[Correction API] Access check:', {
			userId: user.id,
			role: profile?.role,
			isTeacher,
			isAssignmentCreator,
			isStudentInClass,
			assignmentCreatedBy: assignment.created_by
		});

		// Teachers/admins/creators can always access, students need to be in the class
		if (!isTeacher && !isAssignmentCreator && !isStudentInClass) {
			throw error(403, 'Accès refusé à cette affectation');
		}

		// For students, check if corrections are released
		if (!isTeacher && !isAssignmentCreator) {
			const accessResult = canAccessCorrections(
				assignment as unknown as WorksheetAssignmentRow,
				user.id
			);

			if (!accessResult.canAccess) {
				throw error(403, accessResult.reason);
			}
		}

		// Le corrigé de la classe est réservé au prof. Un élève n'en recevait
		// jamais (il n'avait pas d'instance : `worksheet_instances` est vide) ; le
		// lui ouvrir montrerait aussi les corrigés que le prof a masqués exercice
		// par exercice, que cette route ne filtre pas. L'élève lit les siens par
		// l'API élève, qui respecte ces réglages.
		if (!isTeacher && !isAssignmentCreator) {
			throw error(404, 'Aucune correction disponible');
		}

		const worksheet = assignment.worksheet as unknown as WorksheetForCopy;

		// La copie de la classe, recalculée (ADR 0023) : la même que l'aperçu
		// d'affectation sans élève
		const classScope = assignmentCopyScope(assignment, {
			locale: worksheetLocale(worksheet.config)
		});

		// Chaque élève a sa version (valeurs ou ordre) : la copie de la classe
		// ne vaut pour personne. Le corrigé est celle d'un élève choisi par le
		// prof (D6), destinataire de l'affectation ; sans élève, on le demande.
		const perStudentCopies = hasPerStudentCopies(worksheet, classScope);
		if (perStudentCopies && !studentId) {
			return json({ success: true, needs_student: true, per_student_copies: true });
		}
		if (perStudentCopies && studentId) {
			if (!(await isStudentOfAssignment(locals.supabase, assignmentId, studentId))) {
				throw error(400, 'Cet élève n’a pas accès à cette affectation');
			}
		}
		const copyScope = perStudentCopies ? { ...classScope, studentId } : classScope;
		const instanceData = buildWorksheetCopy(worksheet, copyScope);
		const studentName = 'Aperçu professeur';

		// Les classes visées, lues dans la jonction : l'en-tête du PDF nomme celles
		// que le LECTEUR a le droit de voir — toutes pour le professeur, la sienne
		// pour l'élève, aucune pour l'élève nommément désigné hors classe.
		// `assignment.class` tenait à la colonne historique, qui n'en portait
		// qu'une — et la clé étrangère qui résolvait cette jointure disparaît avec
		// elle.
		const className =
			formatClassNames(await fetchAssignmentClasses(locals.supabase, assignmentId)) ?? undefined;

		// If JSON format requested, return correction data
		if (format === 'json') {
			return json({
				success: true,
				worksheet: {
					id: worksheet.id,
					title: worksheet.title,
					type: worksheet.type
				},
				assignment: {
					id: assignment.id,
					title: assignment.title,
					closes_at: assignment.closes_at,
					correction_release_mode: assignment.correction_release_mode
				},
				// Fiche mélangée : l'ordre de la copie (`exercise_order`), comme le PDF
				exercises: (
					instanceData.exercise_order?.map((index) => instanceData.exercises[index]) ??
					instanceData.exercises
				).map((ex) => ({
					exercise_id: ex.exercise_id,
					position: ex.position,
					statement: ex.statement,
					solution: ex.solution
				})),
				studentName,
				className,
				per_student_copies: perStudentCopies
			});
		}

		// Generate Typst content for correction
		const typstContent = generateWorksheetTypst({
			worksheet: worksheet,
			instance: instanceData,
			config: worksheet.config || {},
			mode: 'correction',
			studentName,
			className,
			// Copie d'un élève : l'avertissement imprimé en tête (D6)
			individualCopyNotice: perStudentCopies
		});

		// Return Typst source (PDF generation must be done client-side)
		const filename = `${sanitizeForFileName(worksheet.title)}_correction_${sanitizeForFileName(studentName)}.pdf`;

		return json({
			success: true,
			typst: typstContent,
			filename,
			studentName,
			worksheetTitle: worksheet.title,
			per_student_copies: perStudentCopies
		});
	} catch (err) {
		logger.error('[Correction API] Error:', err);
		if (err instanceof Error) {
			logger.error('[Correction API] Message:', err.message);
			logger.error('[Correction API] Stack:', err.stack);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Impossible de générer la correction');
	}
};
