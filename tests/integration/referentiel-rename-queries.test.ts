/**
 * Renommage du référentiel — les requêtes doivent résoudre (nécessite une base locale)
 * ====================================================================================
 *
 * La migration `20260829100000_refonte_referentiel_fusion.sql` a renommé
 * `skill_id` → `observable_id` (sur `skill_attempts` et
 * `evaluation_task_perimeter`) et supprimé la table `skills` au profit de
 * `observables`. Cinq fichiers avaient été oubliés : ils interrogeaient des
 * colonnes et une table qui n'existent plus, ce qui cassait l'export RGPD, la
 * page des compétences élève, la saisie d'évaluation et le périmètre de tâche.
 *
 * Rien ne pouvait l'attraper : `locals.supabase` est déclaré sans le générique
 * `Database` (`src/app.d.ts`), donc aucune requête serveur n'est typée.
 *
 * Ces tests exécutent les requêtes réellement émises par ces pages et
 * vérifient qu'elles **résolvent**. Ils échouent si un renommage futur les
 * périme à nouveau — c'est le seul filet tant que le typage n'est pas branché.
 *
 * On n'assert pas sur les données : seule la résolution du schéma est en jeu.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe('Référentiel — les requêtes des pages résolvent bien', () => {
	it('export RGPD : tentatives évaluées (skill_attempts)', async () => {
		const { error } = await db
			.from('skill_attempts')
			.select(
				'observable_id, success, with_help, phase_blocage, grade, template_id, task_id, source, created_at'
			)
			.limit(1);

		expect(error).toBeNull();
	});

	it('export RGPD : état des observables (student_observable_state)', async () => {
		const { error } = await db
			.from('student_observable_state')
			.select('observable_id, count_plus, count_minus, is_acquis, last_attempt_at')
			.limit(1);

		expect(error).toBeNull();
	});

	it('compétences élève : arbre compétence → sous-dimensions → observables', async () => {
		const { error } = await db
			.from('math_competences')
			.select(
				`
				id, code, name, gloss_for_student,
				subdimensions:math_competence_subdimensions (
					letter, name, display_order,
					observables (id, observable_code, name, display_order)
				)
			`
			)
			.limit(1);

		expect(error).toBeNull();
	});

	it('périmètre de tâche : liste des observables retenus', async () => {
		const { error } = await db.from('evaluation_task_perimeter').select('observable_id').limit(1);

		expect(error).toBeNull();
	});

	it('saisie : périmètre avec son observable et ses parents', async () => {
		const { error } = await db
			.from('evaluation_task_perimeter')
			.select(
				`
				skill:observables (
					id,
					name,
					observable_code,
					teacher_grid_text,
					display_order,
					subdimension:math_competence_subdimensions (
						letter,
						display_order
					)
				)
			`
			)
			.limit(1);

		expect(error).toBeNull();
	});

	it('liste des tâches : compte du périmètre par tâche', async () => {
		const { error } = await db
			.from('evaluation_tasks')
			.select('id, perimeter:evaluation_task_perimeter (observable_id)')
			.limit(1);

		expect(error).toBeNull();
	});

	it('la table `skills` a bien disparu — le renommage est effectif', async () => {
		// Garde-fou : si `skills` réapparaissait, les tests ci-dessus pourraient
		// passer pour la mauvaise raison.
		// @ts-expect-error - table volontairement inexistante
		const { error } = await db.from('skills').select('id').limit(1);

		expect(error).not.toBeNull();
	});
});
