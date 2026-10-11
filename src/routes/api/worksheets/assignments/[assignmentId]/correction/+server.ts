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
 * - Affectation individualisée avec des valeurs tirées : la réponse porte
 *   `per_student_values_notice`, que l'interface affiche.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
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
	hasPerStudentValues,
	type WorksheetForCopy
} from '$lib/worksheets/worksheet-copy';

// Query parameter validation
// Note: 'pdf' format is not supported server-side (Typst.js requires browser)
// Use 'typst' to get the Typst source, then generate PDF client-side
const querySchema = z.object({
	format: z.enum(['typst', 'json']).optional().default('typst')
});

/** Affiché par le gestionnaire de corrections quand les valeurs varient par élève */
const PER_STUDENT_VALUES_NOTICE =
	'Valeurs propres à chaque élève : ce corrigé montre la copie commune ; chaque élève voit le sien sur sa copie (écran et PDF).';

// ============================================================================
// GET HANDLER - Get student's correction PDF
// ============================================================================

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	// Validate query parameters
	const queryParams = querySchema.safeParse({
		format: url.searchParams.get('format') || 'pdf'
	});

	if (!queryParams.success) {
		throw error(400, queryParams.error.issues[0].message);
	}

	const { format } = queryParams.data;

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
							generic_functions
						)
					)
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !assignment) {
			throw error(404, 'Assignation non trouvee');
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
			console.error('Rôle illisible :', profileError);
			throw error(500, 'Impossible de vérifier vos droits');
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
			console.error('Droits sur l’affectation illisibles :', accessError.message);
			throw error(500, 'Impossible de vérifier vos droits');
		}

		const isStudentInClass = hasAccess === true;

		console.log('[Correction API] Access check:', {
			userId: user.id,
			role: profile?.role,
			isTeacher,
			isAssignmentCreator,
			isStudentInClass,
			assignmentCreatedBy: assignment.created_by
		});

		// Teachers/admins/creators can always access, students need to be in the class
		if (!isTeacher && !isAssignmentCreator && !isStudentInClass) {
			throw error(403, 'Acces non autorise a cette assignation');
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
		const copyScope = assignmentCopyScope(assignment, {
			locale: worksheetLocale(worksheet.config)
		});
		const instanceData = buildWorksheetCopy(worksheet, copyScope);
		const perStudentValuesNotice = hasPerStudentValues(worksheet, copyScope)
			? PER_STUDENT_VALUES_NOTICE
			: null;
		const studentName = 'Apercu enseignant';

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
				exercises: instanceData.exercises.map((ex) => ({
					exercise_id: ex.exercise_id,
					position: ex.position,
					statement: ex.statement,
					solution: ex.solution
				})),
				studentName,
				className,
				per_student_values_notice: perStudentValuesNotice
			});
		}

		// Generate Typst content for correction
		const typstContent = generateWorksheetTypst({
			worksheet: worksheet,
			instance: instanceData,
			config: worksheet.config || {},
			mode: 'correction',
			studentName,
			className
		});

		// Return Typst source (PDF generation must be done client-side)
		const filename = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_correction${studentName ? '_' + studentName.replace(/[^a-zA-Z0-9]/g, '_') : ''}.pdf`;

		return json({
			success: true,
			typst: typstContent,
			filename,
			studentName,
			worksheetTitle: worksheet.title,
			per_student_values_notice: perStudentValuesNotice
		});
	} catch (err) {
		console.error('[Correction API] Error:', err);
		if (err instanceof Error) {
			console.error('[Correction API] Message:', err.message);
			console.error('[Correction API] Stack:', err.stack);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la generation de la correction');
	}
};
