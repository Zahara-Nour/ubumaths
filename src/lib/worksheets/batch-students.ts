/**
 * Les élèves de l'onglet « Lot » de l'aperçu PDF d'une fiche
 * ==========================================================
 *
 * Le lot fabrique un PDF par élève, à son nom. Ses élèves sont ceux des
 * affectations de la fiche : pour chacune, la liste que le serveur résout déjà
 * (`GET /api/worksheets/assignments/[id]/students` : membres actifs des classes
 * visées, plus les élèves visés nommément), réservée au prof créateur et à
 * l'admin. Un élève visé par deux affectations n'a qu'un PDF.
 *
 * @module worksheets/batch-students
 */

import { z } from 'zod';
import { sortCopyRecipients, type CopyRecipient } from './student-copies';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchStudents {
	/** Les élèves du lot, dans l'ordre d'impression (nom puis prénom) */
	students: CopyRecipient[];
	/** Affectations dont la liste n'a pas pu être lue : le lot est alors incomplet */
	failedAssignments: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Un nom imprimé : borné (un nom démesuré est coupé, le PDF sort quand même) */
const boundedText = z
	.string()
	.nullable()
	.transform((value) => (value === null ? null : value.slice(0, 100)));

/** Ce que le lot lit de la liste d'une affectation ; le reste est ignoré */
const studentsResponseSchema = z.object({
	students: z
		.array(
			z.object({
				id: z.string().uuid(),
				first_name: boundedText,
				last_name: boundedText,
				class_name: boundedText
			})
		)
		.max(2000)
});

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Les élèves des affectations données, sans doublon, triés. Une affectation
 * illisible (refus, panne, réponse inattendue) est comptée, pas masquée : le
 * prof doit savoir que son lot n'a pas tout le monde.
 */
export async function fetchBatchStudents(
	fetcher: typeof fetch,
	assignmentIds: readonly string[]
): Promise<BatchStudents> {
	const lists = await Promise.all(
		[...new Set(assignmentIds)].map(async (assignmentId) => {
			try {
				const response = await fetcher(
					`/api/worksheets/assignments/${encodeURIComponent(assignmentId)}/students`
				);
				if (!response.ok) return null;
				const body = studentsResponseSchema.safeParse(await response.json());
				return body.success ? body.data.students : null;
			} catch {
				return null;
			}
		})
	);
	return {
		students: sortCopyRecipients(lists.flatMap((list) => list ?? [])),
		failedAssignments: lists.filter((list) => list === null).length
	};
}
