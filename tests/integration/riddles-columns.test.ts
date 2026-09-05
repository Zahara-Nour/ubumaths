/**
 * Énigmes — schéma réel des requêtes (nécessite une base locale)
 * ==============================================================
 *
 * Toute la fonctionnalité « énigme du jour » interrogeait un schéma qui n'a
 * jamais existé. Rien ne pouvait l'attraper : `src/app.d.ts` déclarait
 * `supabase: SupabaseClient` sans le générique `Database`.
 *
 * Trois défauts distincts, tous silencieux :
 *
 * 1. `get_riddle_of_the_day` renvoie un **UUID scalaire**, pas une table. Le
 *    code faisait `.length`, `[0]`, `.assignment_date` — sur une chaîne de 36
 *    caractères, `.length > 0` est toujours vrai et la date vaut `undefined`.
 * 2. `set_riddle_of_the_day` attend `(p_riddle_id, p_date, p_selected_by)` ;
 *    le code passait `p_assignment_date` et omettait `p_selected_by`, donc
 *    **le professeur n'a jamais pu programmer d'énigme** (table vide en prod).
 * 3. `riddle_of_the_day` porte `date`, pas `assignment_date` — la suppression
 *    filtrait sur une colonne inexistante.
 *
 * On n'assert pas sur les données : seule la résolution du schéma est en jeu.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe('get_riddle_of_the_day — un UUID, pas une table', () => {
	it("l'appel résout et ne renvoie pas un tableau de lignes", async () => {
		const { data, error } = await db.rpc('get_riddle_of_the_day');

		expect(error).toBeNull();
		// Soit null (aucune énigme programmée), soit un UUID — jamais un tableau.
		expect(Array.isArray(data)).toBe(false);
		if (data !== null) {
			expect(typeof data).toBe('string');
			expect(data).toMatch(/^[0-9a-f-]{36}$/i);
		}
	});
});

describe('set_riddle_of_the_day — noms de paramètres', () => {
	it('les anciens noms sont bien refusés', async () => {
		// Sans quoi la correction pourrait passer pour la mauvaise raison.
		const { error } = await db.rpc('set_riddle_of_the_day', {
			p_riddle_id: '00000000-0000-4000-8000-000000000000',
			// @ts-expect-error - paramètre volontairement inexistant
			p_assignment_date: '2026-01-01'
		});

		expect(error).not.toBeNull();
	});
});

describe('riddle_of_the_day — la colonne est `date`', () => {
	it('`date` résout', async () => {
		const { error } = await db.from('riddle_of_the_day').select('id, riddle_id, date').limit(1);

		expect(error).toBeNull();
	});

	it('`assignment_date` est bien refusée', async () => {
		// @ts-expect-error - colonne volontairement inexistante
		const { error } = await db.from('riddle_of_the_day').select('id, assignment_date').limit(1);

		expect(error).not.toBeNull();
	});
});

describe('riddle_student_history — colonnes agrégées', () => {
	it('les colonnes réellement présentes résolvent', async () => {
		const { error } = await db
			.from('riddle_student_history')
			.select('riddle_id, riddle_title, ever_succeeded, total_attempts, total_gidouilles_earned')
			.limit(1);

		expect(error).toBeNull();
	});

	it('les noms attendus par la page sont bien refusés', async () => {
		// La vue agrège `riddle_attempts` : pas de `is_correct`, pas de
		// `gidouilles_awarded`, et « nombre de tentatives pour réussir » n'existe
		// que sous la forme `total_attempts`.
		for (const colonne of ['is_correct', 'gidouilles_awarded', 'total_attempts_for_success']) {
			const { error } = await db
				.from('riddle_student_history')
				// @ts-expect-error - colonne volontairement inexistante
				.select(`riddle_id, ${colonne}`)
				.limit(1);

			expect(error, colonne).not.toBeNull();
		}
	});
});

describe('riddle_progress — colonne du classement', () => {
	it('`riddles_gidouilles` résout', async () => {
		const { error } = await db
			.from('riddle_progress')
			.select('student_id, rank, riddles_completed, riddles_gidouilles')
			.limit(1);

		expect(error).toBeNull();
	});

	it('`total_gidouilles_from_riddles` est bien refusée', async () => {
		const { error } = await db
			.from('riddle_progress')
			// @ts-expect-error - colonne volontairement inexistante
			.select('student_id, total_gidouilles_from_riddles')
			.limit(1);

		expect(error).not.toBeNull();
	});
});
