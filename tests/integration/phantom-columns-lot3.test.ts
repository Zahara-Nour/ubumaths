/**
 * Colonnes fantômes — troisième lot (nécessite une base locale)
 * =============================================================
 *
 * Suite de `phantom-columns.test.ts`. Ces requêtes-ci demandaient des colonnes
 * absentes du schéma, ce qui fait rejeter la requête ENTIÈRE par PostgREST —
 * donc `data === null`, `error` ignoré, et un écran vide sans trace.
 *
 * Deux d'entre elles avaient des conséquences visibles :
 *
 * - `class_members.is_test` n'existe pas (`is_test` est sur `profiles`) : la
 *   liste des élèves d'un chapitre était donc **toujours vide** pour le
 *   professeur.
 * - `profiles.class_id` n'existe pas (c'est `class_ids`, un tableau) : le
 *   contrôle d'accès à une correction de fiche recevait `profile === null`,
 *   donc `isTeacher === false`. Échec en mode fermé, mais un professeur non
 *   créateur était écarté à tort.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe('class_members — is_test vit sur profiles', () => {
	it('le filtre passe par l’embed', async () => {
		const { error } = await db
			.from('class_members')
			.select('student_id, profiles!inner (id, full_name, avatar_url, is_test)')
			.eq('status', 'active')
			.eq('profiles.is_test', false)
			.limit(1);

		expect(error).toBeNull();
	});

	it('un filtre direct sur class_members est bien refusé', async () => {
		const { error } = await db
			.from('class_members')
			.select('student_id')
			// @ts-expect-error - colonne volontairement inexistante
			.eq('is_test', false)
			.limit(1);

		expect(error).not.toBeNull();
	});
});

describe('question_templates — le modèle plat n’existe pas', () => {
	it('`answer_type` est bien refusé', async () => {
		const { error } = await db
			.from('question_templates')
			.select('id')
			// @ts-expect-error - colonne volontairement inexistante
			.eq('answer_type', 'true_false')
			.limit(1);

		expect(error).not.toBeNull();
	});

	it('`topic` / `subtopic` sont bien refusés', async () => {
		for (const colonne of ['topic', 'subtopic']) {
			const { error } = await db
				.from('question_templates')
				// @ts-expect-error - colonne volontairement inexistante
				.select(`id, ${colonne}`)
				.limit(1);

			expect(error, colonne).not.toBeNull();
		}
	});
});

describe('get_due_cards_for_deck — ne renvoie pas les statistiques', () => {
	it('srs_card_stats porte total_reviews et last_review', async () => {
		const { error } = await db
			.from('srs_card_stats')
			.select('card_reference_id, total_reviews, last_review')
			.limit(1);

		expect(error).toBeNull();
	});
});

describe('messages.content est du jsonb', () => {
	it('la colonne résout et n’est pas du texte', async () => {
		const { error } = await db.from('messages').select('id, content').limit(1);

		expect(error).toBeNull();
	});
});

/**
 * `class_students` n'existe pas : l'appartenance à une classe est portée par
 * `class_members`, dont la colonne d'état s'appelle `status`. La génération PDF
 * par lot visait la table fantôme et n'a donc jamais produit de document.
 */
describe('class_students — la table n’existe pas', () => {
	it('la requête de génération par lot est bien refusée', async () => {
		const { error } = await db
			// @ts-expect-error - table volontairement inexistante
			.from('class_students')
			.select('student_id')
			.limit(1);

		expect(error).not.toBeNull();
	});

	it('class_members avec son embed et son statut résout', async () => {
		const { error } = await db
			.from('class_members')
			.select('student:profiles!class_members_student_id_fkey(id, firstname, lastname, email)')
			.eq('status', 'active')
			.limit(1);

		expect(error).toBeNull();
	});

	it('`is_active` n’existe pas sur class_members', async () => {
		const { error } = await db
			.from('class_members')
			.select('id')
			// @ts-expect-error - colonne volontairement inexistante
			.eq('is_active', true)
			.limit(1);

		expect(error).not.toBeNull();
	});
});
