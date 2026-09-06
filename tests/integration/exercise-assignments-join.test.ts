/**
 * Affectations d'exercices — la jointure doit résoudre (nécessite une base locale)
 * ================================================================================
 *
 * `getAssignmentsForExercise` interrogeait la vue `assigned_exercises_with_details`,
 * annoncée « Phase 4 » dans l'en-tête du module mais **jamais créée** : aucune
 * migration ne la définit, baseline comprise. La fonction échouait donc depuis
 * toujours — le compteur d'affectations restait à 0 et la liste vide, sans
 * erreur visible côté professeur. Seuls les logs serveur la trahissaient, à
 * raison de 48 occurrences par semaine (l'erreur la plus fréquente en prod).
 *
 * Rien ne pouvait l'attraper : le module définit son propre `fromUnknownTable()`,
 * qui caste le client en `any` pour interroger des tables absentes du schéma
 * généré. Le typage était donc explicitement désactivé sur ce chemin.
 *
 * Ces tests exécutent la jointure de remplacement et vérifient qu'elle résout.
 * On n'assert pas sur les données : seule la résolution du schéma est en jeu —
 * noms de colonnes, relations, et surtout la désambiguïsation des DEUX clés
 * étrangères vers `profiles` (`assigned_by` et `student_id`), que PostgREST
 * refuse sans nom de contrainte explicite.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe("Affectations d'exercices — la jointure résout", () => {
	it('la requête de getAssignmentsForExercise aboutit', async () => {
		const { error } = await db
			.from('exercise_assignments')
			.select(
				`
				id, exercise_id, assigned_by, assigned_to_type, student_id, class_id,
				assigned_at, optional_deadline, notes, is_active,
				exercise:exercises!exercise_assignments_exercise_id_fkey (
					title, distribution_mode, is_public, category, grades
				),
				assigner:profiles!exercise_assignments_assigned_by_fkey ( full_name ),
				student:profiles!exercise_assignments_student_id_fkey ( full_name ),
				class:classes!exercise_assignments_class_id_fkey ( name )
				`,
				{ count: 'exact' }
			)
			.limit(1);

		expect(error).toBeNull();
	});

	it('les deux clés étrangères vers profiles restent désambiguïsées', async () => {
		// Sans le nom de contrainte, PostgREST ne sait pas laquelle suivre et
		// répond PGRST201. C'est le piège principal de cette jointure.
		const { error } = await db
			.from('exercise_assignments')
			// @ts-expect-error - embed volontairement ambigu
			.select('id, profiles ( full_name )')
			.limit(1);

		expect(error).not.toBeNull();
	});

	it("la vue `assigned_exercises_with_details` n'existe toujours pas", async () => {
		// Garde-fou : si quelqu'un la créait un jour, ce test le signalerait et
		// on pourrait alors décider de revenir à la vue en connaissance de cause.
		// @ts-expect-error - vue volontairement inexistante
		const { error } = await db.from('assigned_exercises_with_details').select('id').limit(1);

		expect(error).not.toBeNull();
	});
});
