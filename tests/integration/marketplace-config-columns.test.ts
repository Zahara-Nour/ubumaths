/**
 * Réglages du marché — l'activation ne s'appelle pas `is_enabled`
 * ==============================================================
 *
 * Le panneau `MarketplaceSettings` déclarait sa propre forme de configuration
 * avec un champ `is_enabled`. La table n'en a pas : l'activation par classe se
 * lit sur `enabled_for_class`, et l'activation globale sur `enabled_globally`.
 *
 * Conséquence visible : à l'ouverture du panneau, l'interrupteur repartait
 * toujours de « désactivé » — même sur un marché ouvert — et « Réinitialiser »
 * l'y renvoyait. Le composant écrivait pourtant déjà `enabled_for_class`, donc
 * lecture et écriture ne parlaient pas de la même colonne.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe('marketplace_config', () => {
	it('les deux colonnes d’activation existent', async () => {
		const { error } = await db
			.from('marketplace_config')
			.select('id, class_id, enabled_for_class, enabled_globally')
			.limit(1);

		expect(error).toBeNull();
	});

	it('`is_enabled` est bien refusée', async () => {
		const { error } = await db
			.from('marketplace_config')
			// @ts-expect-error - colonne volontairement inexistante
			.select('id, is_enabled')
			.limit(1);

		expect(error).not.toBeNull();
	});
});

/**
 * `worksheet_templates.template_content` est du Typst stocké en `text`, pas du
 * `jsonb` : le convertir en JSON à la copie d'un modèle par défaut aurait
 * enregistré une chaîne entre guillemets, illisible par le moteur de rendu.
 */
describe('worksheet_templates', () => {
	it('`template_content` accepte du texte brut', async () => {
		const { error } = await db
			.from('worksheet_templates')
			.select('id, template_content, placeholders')
			.limit(1);

		expect(error).toBeNull();
	});

	it('un filtre textuel sur `template_content` est accepté', async () => {
		// Un `jsonb` refuserait `like`.
		const { error } = await db
			.from('worksheet_templates')
			.select('id')
			.like('template_content', '%#set page%')
			.limit(1);

		expect(error).toBeNull();
	});
});
