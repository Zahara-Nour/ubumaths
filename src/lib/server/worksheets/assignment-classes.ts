/**
 * Les classes visées par une affectation de fiche
 * ==============================================
 *
 * La source unique est la table de jonction `worksheet_assignment_classes`.
 * La colonne historique `worksheet_assignments.class_id` ne portait que la
 * PREMIÈRE classe : tout ce qui la lisait traitait les suivantes comme si
 * elles n'étaient pas visées.
 *
 * ⚠️ Ces lectures sont filtrées par la RLS, et c'est voulu :
 *
 *   - un ÉLÈVE ne voit dans la jonction que les lignes correspondant à SES
 *     classes (policy « Students can view their assignment classes »). Le
 *     résultat est donc déjà « la classe par laquelle il est concerné », sans
 *     intersection à faire ici — et sans lui nommer les autres classes ;
 *   - le PROFESSEUR créateur voit toutes les lignes de ses affectations.
 *
 * Une panne de lecture n'est jamais traitée comme « aucune classe » : selon
 * l'appelant, cela réduirait un périmètre d'élèves ou viderait un écran en
 * accusant la base. Les fonctions lèvent.
 *
 * ⚠️ CE MODULE BORNE, IL N'AUTORISE PAS. Deux règles, dans les deux sens :
 *
 *   - ne jamais s'en servir comme test d'accès. La policy élève sur la jonction
 *     ne vérifie ni `status` ni `available_from` : une affectation en brouillon
 *     ou programmée y est visible alors que son contenu reste fermé. L'accès se
 *     décide dans `can_access_assignment` / `student_has_worksheet_access` ;
 *   - ne jamais l'appeler avec un client `service_role`. Tout ce qui précède
 *     repose sur la RLS du lecteur ; sans elle, ces fonctions rendraient les
 *     classes de n'importe qui.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

/** Une classe visée par une affectation. */
export interface AssignmentClass {
	id: string;
	name: string;
}

type Client = SupabaseClient<Database>;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Extract the embedded `classes` row, which PostgREST may return as an array. */
function firstOrSelf<T>(value: T | T[] | null): T | null {
	if (value === null) return null;
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Les classes visées par chacune des affectations demandées, ordonnées de
 * façon stable. Une affectation sans classe visible (individuelle, ou hors
 * portée du lecteur) est absente de la Map.
 *
 * @throws si la jonction est illisible — voir l'avertissement du module.
 */
export async function fetchClassesByAssignment(
	supabase: Client,
	assignmentIds: string[]
): Promise<Map<string, AssignmentClass[]>> {
	const byAssignment = new Map<string, AssignmentClass[]>();
	if (assignmentIds.length === 0) return byAssignment;

	const { data, error } = await supabase
		.from('worksheet_assignment_classes')
		.select('assignment_id, class_id, classes(id, name)')
		.in('assignment_id', assignmentIds)
		// Ordre stable : sans lui, « 1re A, 1re B » devient « 1re B, 1re A » d'un
		// rechargement à l'autre, et le premier élément retenu pour un élève membre
		// de deux classes visées désigne une classe au hasard.
		.order('class_id');

	if (error) {
		console.error('[assignment-classes] Classes de l’affectation illisibles :', error);
		throw new Error(error.message);
	}

	for (const row of data ?? []) {
		const klass = firstOrSelf(row.classes as unknown as AssignmentClass | AssignmentClass[] | null);
		// La classe peut être masquée par la RLS alors que la ligne de jonction est
		// visible : on garde l'identifiant, qui suffit à borner un périmètre.
		const entry = byAssignment.get(row.assignment_id) ?? [];
		entry.push({ id: row.class_id, name: klass?.name ?? '' });
		byAssignment.set(row.assignment_id, entry);
	}

	return byAssignment;
}

/**
 * Les classes visées par UNE affectation.
 *
 * @throws si la jonction est illisible — voir l'avertissement du module.
 */
export async function fetchAssignmentClasses(
	supabase: Client,
	assignmentId: string
): Promise<AssignmentClass[]> {
	const byAssignment = await fetchClassesByAssignment(supabase, [assignmentId]);
	return byAssignment.get(assignmentId) ?? [];
}

/**
 * Le libellé des classes visées, pour un en-tête ou une colonne : « 1re A,
 * 1re B ». `null` quand l'affectation ne vise aucune classe — elle est alors
 * purement individuelle, et prétendre le contraire tromperait le lecteur.
 */
export function formatClassNames(classes: AssignmentClass[]): string | null {
	const names = classes.map((c) => c.name).filter((name) => name.length > 0);
	return names.length > 0 ? names.join(', ') : null;
}
