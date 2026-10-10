/**
 * Colonnes de `profiles` — les requêtes doivent résoudre (nécessite une base locale)
 * ==================================================================================
 *
 * Trois routes `worksheets` demandaient `first_name`, `last_name` et
 * `class_id` sur `profiles`. Aucune de ces colonnes n'existe : la table porte
 * `firstname`, `lastname` (sans underscore) et `class_ids` — un **tableau**,
 * l'élève pouvant appartenir à plusieurs classes.
 *
 * Conséquence : l'aperçu d'une fiche, la génération d'instances par classe et
 * le nom de l'élève sur une correction échouaient silencieusement.
 *
 * Rien ne pouvait l'attraper : `src/app.d.ts` déclare `supabase: SupabaseClient`
 * sans le générique `Database`, donc aucune requête serveur n'est typée. Ces
 * tests sont le seul filet tant que ce n'est pas corrigé.
 *
 * On n'assert pas sur les données : seule la résolution du schéma est en jeu.
 *
 * @vitest-environment node
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import type { Tables } from '$lib/types/database';

const db = createServiceRoleClient();

describe('profiles — les requêtes des fiches résolvent', () => {
	it('le nom de l’élève se lit via firstname / lastname', async () => {
		const { error } = await db.from('profiles').select('id, firstname, lastname').limit(1);

		expect(error).toBeNull();
	});

	it('l’appartenance à une classe se teste sur class_ids, un tableau', async () => {
		const { error } = await db
			.from('profiles')
			.select('id')
			.contains('class_ids', ['00000000-0000-4000-8000-000000000000'])
			.eq('role', 'student')
			.limit(1);

		expect(error).toBeNull();
	});

	it('l’embed des instances de fiche résout', async () => {
		const { error } = await db
			.from('worksheet_instances')
			.select(
				`
				id,
				student:profiles!worksheet_instances_student_id_fkey (
					id, firstname, lastname, class_ids
				)
				`
			)
			.limit(1);

		expect(error).toBeNull();
	});

	it('les anciens noms sont bien refusés', async () => {
		// Sans quoi les tests ci-dessus pourraient passer pour la mauvaise raison.
		// postgrest-js ne refuse pas à la compilation un select sur une colonne inconnue
		// (il type `data` en erreur) : l'absence dans les types se prouve ici.
		expectTypeOf<Tables<'profiles'>>().not.toHaveProperty('first_name');
		expectTypeOf<Tables<'profiles'>>().not.toHaveProperty('last_name');
		const parNom = await db.from('profiles').select('first_name, last_name').limit(1);
		expect(parNom.error).not.toBeNull();

		// @ts-expect-error - colonne volontairement inexistante
		const parClasse = await db.from('profiles').select('id').eq('class_id', 'x').limit(1);
		expect(parClasse.error).not.toBeNull();
	});
});

/**
 * `marketplace_trades` et `message_templates` ont chacune PLUSIEURS clés
 * étrangères vers `profiles` (initiator/partner/last_offer_by, created_by/
 * reviewed_by). Un embed qui ne nomme pas sa contrainte est ambigu : PostgREST
 * refuse la requête plutôt que de deviner.
 */
describe('profiles — embeds désambiguïsés par nom de contrainte', () => {
	it('les deux parties d’un échange se résolvent', async () => {
		const { error } = await db
			.from('marketplace_trades')
			.select(
				`
				id,
				initiator:profiles!marketplace_trades_initiator_id_fkey(id, firstname, lastname),
				partner:profiles!marketplace_trades_partner_id_fkey(id, firstname, lastname)
				`
			)
			.limit(1);

		expect(error).toBeNull();
	});

	it('le créateur d’un modèle de message se résout', async () => {
		const { error } = await db
			.from('message_templates')
			.select('id, creator:profiles!message_templates_created_by_fkey (full_name)')
			.limit(1);

		expect(error).toBeNull();
	});

	it('un embed non désambiguïsé est bien refusé', async () => {
		const { error } = await db
			.from('marketplace_trades')
			// embed volontairement ambigu (postgrest-js ne le refuse pas à la compilation)
			.select('id, profiles(id)')
			.limit(1);

		expect(error).not.toBeNull();
	});
});
