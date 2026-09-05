/**
 * Colonnes fantômes — les requêtes doivent résoudre (nécessite une base locale)
 * ============================================================================
 *
 * Même cause que `profiles-columns.test.ts` : `src/app.d.ts` déclare
 * `supabase: SupabaseClient` sans le générique `Database`, donc aucune requête
 * serveur n'est typée. Des colonnes ont été demandées pendant des mois sans
 * exister nulle part — PostgREST renvoyait une erreur, le code ignorait
 * `error` et servait une page vide.
 *
 * Recensé ici, table par table, ce que le code demandait à tort. On n'assert
 * pas sur les données : seule la résolution du schéma est en jeu.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe('exercises — ni description, ni tags, ni difficulty', () => {
	it('les colonnes réellement présentes résolvent', async () => {
		const { error } = await db.from('exercises').select('id, title, distribution_mode').limit(1);

		expect(error).toBeNull();
	});

	it('les colonnes inventées sont bien refusées', async () => {
		// Sans quoi le test ci-dessus passerait pour la mauvaise raison.
		for (const colonne of ['description', 'tags', 'difficulty']) {
			const { error } = await db
				.from('exercises')
				// @ts-expect-error - colonne volontairement inexistante
				.select(`id, ${colonne}`)
				.limit(1);

			expect(error, colonne).not.toBeNull();
		}
	});
});

describe('question_templates — le contenu vit dans variations', () => {
	it('title / description / variations résolvent', async () => {
		const { error } = await db
			.from('question_templates')
			.select('id, title, description, variations')
			.limit(1);

		expect(error).toBeNull();
	});

	it('le modèle plat question / answer / explanation n’existe pas', async () => {
		// Ce que lisait le quiz de chapitre : trois colonnes absentes depuis
		// toujours, d'où un quiz qui n'a jamais rien affiché.
		for (const colonne of ['question', 'answer', 'explanation']) {
			const { error } = await db
				.from('question_templates')
				// @ts-expect-error - colonne volontairement inexistante
				.select(`id, ${colonne}`)
				.limit(1);

			expect(error, colonne).not.toBeNull();
		}
	});
});

describe('marketplace — noms de colonnes effectifs', () => {
	it('une offre porte offered_by, pas offer_by', async () => {
		const { error } = await db.from('marketplace_trade_offers').select('id, offered_by').limit(1);

		expect(error).toBeNull();

		// @ts-expect-error - colonne volontairement inexistante
		const ancien = await db.from('marketplace_trade_offers').select('id, offer_by').limit(1);
		expect(ancien.error).not.toBeNull();
	});

	it('une proposition porte responded_at, pas updated_at', async () => {
		// `marketplace_trades`, elle, a bien un `updated_at` : c'est la table des
		// propositions qui date sa réponse autrement. Confondre les deux est
		// précisément l'erreur que ce test attrape.
		const { error } = await db.from('marketplace_proposals').select('id, responded_at').limit(1);

		expect(error).toBeNull();

		// @ts-expect-error - colonne volontairement inexistante
		const ancien = await db.from('marketplace_proposals').select('id, updated_at').limit(1);
		expect(ancien.error).not.toBeNull();
	});
});

describe('worksheet_instances — pas de suivi de temps', () => {
	it('les colonnes réellement présentes résolvent', async () => {
		const { error } = await db
			.from('worksheet_instances')
			.select('id, student_id, status')
			.limit(1);

		expect(error).toBeNull();
	});

	it('accessed_at / submitted_at / time_spent_seconds n’existent pas', async () => {
		for (const colonne of ['accessed_at', 'submitted_at', 'time_spent_seconds']) {
			const { error } = await db
				.from('worksheet_instances')
				// @ts-expect-error - colonne volontairement inexistante
				.select(`id, ${colonne}`)
				.limit(1);

			expect(error, colonne).not.toBeNull();
		}
	});
});

describe('tables absentes du schéma', () => {
	it('vip_activation_requests n’existe pas', async () => {
		// Une page de gamification comptait ses lignes « en attente ».
		// @ts-expect-error - table volontairement inexistante
		const { error } = await db.from('vip_activation_requests').select('id').limit(1);

		expect(error).not.toBeNull();
	});
});
