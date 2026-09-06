/**
 * Marketplace — contrats des RPC et tables réelles (nécessite une base locale)
 * ===========================================================================
 *
 * Deux familles de défauts, invisibles faute de typage sur `locals.supabase` :
 *
 * 1. Plusieurs RPC sont déclarées `RETURNS json` / `RETURNS jsonb`. Le type
 *    généré est `Json`, qui ne porte aucune clé : le code lisait
 *    `.can_create_trade`, `.success`, `.new_views`… sans qu'aucun contrôle ne
 *    soit possible. Pire, `check_daily_trade_limit` a un chemin d'exception de
 *    forme différente — `!undefined` y faisait passer une panne SQL pour un
 *    quota atteint.
 * 2. L'analytique admin interrogeait une table `vip_cards` **qui n'existe
 *    pas** : une carte est une entrée du jsonb `profiles.vip_cards`. La
 *    section « cartes les plus échangées » était donc toujours vide.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import {
	dailyTradeLimitSchema,
	executeTradeSchema
} from '../../src/lib/server/validation/marketplace-rpc';

const db = createServiceRoleClient();
const UUID_INEXISTANT = '00000000-0000-4000-8000-000000000000';

describe('check_daily_trade_limit — forme du résultat', () => {
	it('le résultat respecte le schéma déclaré', async () => {
		const { data, error } = await db.rpc('check_daily_trade_limit', {
			p_user_id: UUID_INEXISTANT
		});

		expect(error).toBeNull();
		// Le schéma est une union discriminée : il échoue si la forme change.
		expect(() => dailyTradeLimitSchema.parse(data)).not.toThrow();
	});
});

describe('execute_trade — un refus métier n’est pas une erreur', () => {
	it('un échange introuvable revient en success:false, sans erreur PostgREST', async () => {
		const { data, error } = await db.rpc('execute_trade', { p_trade_id: UUID_INEXISTANT });

		// Le point important : `error` est nul. Ignorer le corps du résultat
		// revenait donc à traiter un refus comme une réussite.
		expect(error).toBeNull();

		const resultat = executeTradeSchema.parse(data);
		expect(resultat.success).toBe(false);
	});
});

describe('vip_cards — la table n’existe pas', () => {
	it('la requête de l’analytique est bien refusée', async () => {
		// @ts-expect-error - table volontairement inexistante
		const { error } = await db.from('vip_cards').select('id, template_id').limit(1);

		expect(error).not.toBeNull();
	});

	it('vip_cards_activity relie bien instance et modèle', async () => {
		const { error } = await db
			.from('vip_cards_activity')
			.select('card_instance_id, card_template_id')
			.limit(1);

		expect(error).toBeNull();
	});

	it('vip_card_templates porte le nom affiché', async () => {
		const { error } = await db.from('vip_card_templates').select('id, name').limit(1);

		expect(error).toBeNull();
	});
});
