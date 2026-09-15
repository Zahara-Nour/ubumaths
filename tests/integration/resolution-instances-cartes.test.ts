/**
 * Traduire une instance de carte sans lire de profil (base locale requise)
 * ========================================================================
 *
 * La place de marché doit traduire les identifiants d'INSTANCE offerts par un
 * vendeur en identifiants de MODÈLE. La correspondance vit dans
 * `profiles.vip_cards` DU VENDEUR — que l'acheteur ne pourra plus lire une fois
 * `Anyone can view profiles for leaderboard` retirée.
 *
 * ⚠️ Et le mode de panne est muet : une lecture filtrée par la RLS ne rend
 * AUCUNE erreur, elle rend zéro ligne. L'offre s'afficherait vide, et l'élève
 * accepterait un échange sans voir ce qu'on lui propose.
 *
 * ⚠️ Le test le plus important de ce fichier est celui qui vérifie que la
 * fonction ne rend AUCUNE colonne de profil. Elle est `SECURITY DEFINER` :
 * y ajouter le propriétaire ferait d'elle un annuaire « qui possède quoi »
 * lisible par tout compte connecté.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Pas encore dans `database.ts` : la fonction est générée après sa mise en prod. */
const RESOUDRE = 'resolve_card_instances' as never;

type LigneResolue = { instance_id: string; card_id: string };

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

describe('résoudre une instance de carte', () => {
	let acheteur: SupabaseClient<Database>;
	let modeleId: string;
	const INSTANCE_VENDEUR = 'inst-vendeur-MM';
	const INSTANCE_INCONNUE = 'inst-jamais-vue-MM';

	beforeAll(async () => {
		await cleanupAllTestData();

		const service = (
			await import('../helpers/database/trigger-test-helpers')
		).createServiceRoleClient();
		await TestData.profile().withRole('teacher').create();

		// `vip_card_templates.id` n'a pas de valeur par défaut : on la fournit.
		modeleId = crypto.randomUUID();
		const { error: modeleError } = await service.from('vip_card_templates').insert({
			id: modeleId,
			name: 'Carte marché MM',
			description: 'pour le test',
			image_path: 'test/mm.png',
			rarity: 'common',
			// `category` est contraint à bonus/privilege/social/power.
			category: 'bonus'
		});
		expect(modeleError).toBeNull();

		// Le VENDEUR détient l'instance. L'acheteur n'a aucun lien avec lui :
		// ni classe, ni amitié, ni tournoi.
		const vendeur = await TestData.profile().withRole('student').create();
		const { error: inventaireError } = await service
			.from('profiles')
			.update({
				vip_cards: {
					[INSTANCE_VENDEUR]: { cardId: modeleId, earnedAt: new Date().toISOString() }
				}
			})
			.eq('id', vendeur.id);
		expect(inventaireError).toBeNull();

		const profil = await TestData.profile().withRole('student').create();
		acheteur = await clientFor(profil.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/**
	 * ⚠️ LE cas. L'acheteur ne partage RIEN avec le vendeur : sans la fonction,
	 * il ne peut pas traduire l'instance, et l'annonce s'affiche vide.
	 */
	it('un acheteur traduit l’instance d’un vendeur qu’il ne connaît pas', async () => {
		const { data, error } = await acheteur.rpc(RESOUDRE, {
			p_instance_ids: [INSTANCE_VENDEUR]
		});
		expect(error).toBeNull();

		const lignes = (data ?? []) as LigneResolue[];
		expect(lignes, 'l’instance du vendeur n’a pas été résolue').toHaveLength(1);
		expect(lignes[0].instance_id).toBe(INSTANCE_VENDEUR);
		expect(lignes[0].card_id).toBe(modeleId);
	});

	/**
	 * ⚠️ La garde qui empêche la fonction de devenir un annuaire « qui possède
	 * quoi ». Liste BLANCHE : toute colonne ajoutée fait tomber ce test, connue
	 * ou non — une liste noire laisserait passer celle qu'on n'aurait pas prévue.
	 */
	it('elle ne rend AUCUNE colonne de profil', async () => {
		const { data } = await acheteur.rpc(RESOUDRE, { p_instance_ids: [INSTANCE_VENDEUR] });
		const ligne = ((data ?? []) as LigneResolue[])[0];

		expect(ligne).toBeDefined();
		expect(
			Object.keys(ligne).sort(),
			'une colonne a été ajoutée : la fonction dirait désormais à QUI appartient la carte'
		).toEqual(['card_id', 'instance_id']);
	});

	it('une instance inconnue ne rend rien, sans erreur', async () => {
		const { data, error } = await acheteur.rpc(RESOUDRE, {
			p_instance_ids: [INSTANCE_INCONNUE]
		});
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	/**
	 * Le plafond borne le coût ET l'énumération : sans lui, un appel unique
	 * déverserait la correspondance de toute la base.
	 */
	it('au-delà du plafond, elle ne rend rien', async () => {
		const trop = Array.from({ length: 501 }, (_, i) => `inst-${i}-MM`);
		trop[0] = INSTANCE_VENDEUR;

		const { data, error } = await acheteur.rpc(RESOUDRE, { p_instance_ids: trop });
		expect(error).toBeNull();
		expect(data, 'le plafond de 500 instances ne s’applique plus').toEqual([]);
	});

	/**
	 * Sans session, rien. ⚠️ Le refus seul ne prouverait pas grand-chose — il
	 * serait aussi vert si la fonction n'existait pas — d'où l'appel authentifié
	 * qui doit réussir.
	 */
	it('un visiteur non connecté ne peut pas l’appeler', async () => {
		const anonyme = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		const { error: refus } = await anonyme.rpc(RESOUDRE, { p_instance_ids: [INSTANCE_VENDEUR] });
		expect(refus, 'anon a pu résoudre une instance').not.toBeNull();

		const { error: autorise } = await acheteur.rpc(RESOUDRE, {
			p_instance_ids: [INSTANCE_VENDEUR]
		});
		expect(autorise, 'la fonction est absente : le refus d’anon ne prouve rien').toBeNull();
	});
});
