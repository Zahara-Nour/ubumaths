/**
 * « … contre rien » : le résumé d'un échange déjà accepté (base locale requise)
 * ============================================================================
 *
 * `GET /api/marketplace/listings/[id]/proposals` affiche, pour le propriétaire
 * de l'annonce, un résumé de la forme « ce que j'ai reçu **contre** ce que j'ai
 * donné ».
 *
 * La seconde moitié se calcule à partir des `offered_card_ids` de l'annonce —
 * des identifiants d'INSTANCE, qu'il faut traduire en modèles pour les nommer.
 * La route lisait pour cela `profiles.vip_cards` des proposants.
 *
 * ⚠️ Deux raisons pour lesquelles ça ne pouvait pas marcher :
 * 1. une fois l'échange ACCEPTÉ, la carte a changé de main — elle est dans
 *    l'inventaire du proposant, que la RLS ferme au propriétaire depuis
 *    `20260915580000` ;
 * 2. une lecture refusée par la RLS ne rend **aucune erreur**, elle rend zéro
 *    ligne. La traduction échouait donc en silence.
 *
 * Résultat vu par l'élève : « 5 gidouilles contre **rien** », comme s'il avait
 * reçu quelque chose sans rien donner.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { GET as listProposals } from '../../src/routes/api/marketplace/listings/[id]/proposals/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

const NOM_DE_CARTE = 'Chandelier de Mère Ubu ZZ';
const TEMPLATE_ID = 'carte-test-zz';
const INSTANCE_ID = 'instance-test-zz';

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

function buildLocals(userId: string, client: SupabaseClient<Database>): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

describe('le résumé d’un échange dont la carte a déjà changé de main', () => {
	let listingId: string;
	let proprietaireId: string;
	let proprietaire: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		await TestData.profile().withRole('teacher').create();

		const { data: ecole, error: ecoleError } = await service
			.from('schools')
			.insert({ name: 'Lycée résumé ZZ', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		expect(ecoleError, 'le décor n’a pas pu être posé').toBeNull();

		const eleve = async () => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('profiles')
				.update({ school_id: ecole!.id })
				.eq('id', profil.id);
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return profil;
		};

		// ⚠️ `upsert`, pas `insert` : `cleanupAllTestData` ne purge pas le
		// catalogue de cartes, et un run précédent laisse donc ce modèle derrière
		// lui. Un `insert` échouerait en 23505 au second passage.
		const { error: templateError } = await service.from('vip_card_templates').upsert({
			id: TEMPLATE_ID,
			name: NOM_DE_CARTE,
			description: 'Une carte de test.',
			image_path: 'cartes/test-zz.webp',
			rarity: 'common'
		});
		expect(templateError, 'le décor n’a pas pu être posé').toBeNull();

		const proprietaireProfil = await eleve();
		proprietaireId = proprietaireProfil.id;
		proprietaire = await clientFor(proprietaireProfil.email);

		// LE PROPOSANT détient déjà la carte : l'échange a eu lieu. Aucun lien de
		// classe ni d'amitié avec le propriétaire — son profil lui est donc fermé.
		const proposant = await eleve();
		const { error: cartesError } = await service
			.from('profiles')
			.update({
				vip_cards: { [INSTANCE_ID]: { cardId: TEMPLATE_ID, earnedAt: new Date().toISOString() } }
			})
			.eq('id', proposant.id);
		expect(cartesError, 'le décor n’a pas pu être posé').toBeNull();

		// L'annonce offrait cette carte ; elle n'est plus dans l'inventaire du
		// propriétaire, justement parce qu'elle a été cédée.
		const { data: annonce, error: annonceError } = await service
			.from('marketplace_listings')
			.insert({
				creator_id: proprietaireId,
				school_id: ecole!.id,
				listing_type: 'sell',
				status: 'active',
				offered_card_ids: [INSTANCE_ID],
				offered_gidouilles: 0,
				wanted_card_template_ids: [],
				wanted_gidouilles: 5,
				expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
			})
			.select('id')
			.single();
		expect(annonceError, 'le décor n’a pas pu être posé').toBeNull();
		listingId = annonce!.id;

		const { error: propositionError } = await service.from('marketplace_proposals').insert({
			listing_id: listingId,
			proposer_id: proposant.id,
			offered_card_ids: [],
			offered_gidouilles: 5
		});
		expect(propositionError, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
		// Le catalogue de cartes survit au nettoyage générique : on range le nôtre.
		await service.from('vip_card_templates').delete().eq('id', TEMPLATE_ID);
	});

	async function resume(): Promise<string> {
		const response = await listProposals({
			locals: buildLocals(proprietaireId, proprietaire),
			params: { id: listingId }
		} as never);
		expect(response.status).toBe(200);

		const body = (await response.json()) as Array<{ summary: string }>;
		expect(body, 'la proposition est introuvable').toHaveLength(1);
		return body[0].summary;
	}

	/** ⚠️ LE cas. Avant la RPC, la moitié droite du résumé valait « rien ». */
	it('nomme la carte cédée, que le propriétaire ne détient plus', async () => {
		const texte = await resume();

		expect(texte, `l’élève lit « ${texte} » : il ignore ce qu’il a donné`).toContain(NOM_DE_CARTE);
		expect(texte).not.toMatch(/contre rien$/);
	});

	/** Le témoin : la moitié gauche, elle, n'a jamais dépendu d'un profil. */
	it('et dit toujours ce qu’il a reçu', async () => {
		expect(await resume()).toContain('5 gidouilles');
	});

	/**
	 * ⚠️ L'inventaire complet d'un proposant n'a plus à être chargé du tout : il
	 * l'était pour cette seule traduction, puis effacé à la main de la réponse
	 * (finding M12). Un retrait manuel est une garde qu'on oublie ; ne pas
	 * demander la colonne n'en est pas une.
	 */
	it('ne renvoie aucun inventaire de proposant', async () => {
		const response = await listProposals({
			locals: buildLocals(proprietaireId, proprietaire),
			params: { id: listingId }
		} as never);
		const body = (await response.json()) as Array<{ proposer?: Record<string, unknown> }>;

		expect(Object.keys(body[0].proposer ?? {})).not.toContain('vip_cards');
	});
});
