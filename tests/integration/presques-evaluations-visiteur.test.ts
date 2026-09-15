/**
 * La page publique doit montrer ses documents à un VISITEUR (base locale requise)
 * ==============================================================================
 *
 * `/presques-evaluations` est ouverte à tous, sans connexion. Sa requête
 * joignait pourtant `profiles` pour afficher le nom de l'auteur :
 *
 *     .select('…, creator:created_by(firstname, lastname)')
 *
 * ⚠️ Une jointure porte ses propres droits. Depuis le durcissement d'août,
 * `profiles` est fermée aux visiteurs anonymes — et PostgREST refuse alors la
 * requête **entière** (`42501 permission denied for table profiles`) au lieu de
 * rendre un auteur vide.
 *
 * La page affichait donc « Aucune presque évaluation pour le moment. » à tout
 * visiteur non connecté, du 2026-09-05 au 2026-09-15. Un message qui accuse la
 * base d'être vide alors que le document existe.
 *
 * ⚠️ Ce test s'exécute avec un client ANONYME, jamais avec le service-role :
 * c'est tout l'objet. Un décor authentifié n'aurait rien vu, puisque
 * `authenticated` lit `profiles`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { load as chargerLaPage } from '../../src/routes/(public)/presques-evaluations/+page.server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

const TITRE = 'Le contrôle de mathématiques le plus injuste ZZ';

/** Un visiteur : pas de session, pas de jeton. */
function clientAnonyme(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

describe('la page publique des presques évaluations', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		const auteur = await TestData.profile().withRole('teacher').create();

		const { error } = await service.from('parody_evaluations').insert({
			title: TITRE,
			storage_path: 'presques/controle-zz.pdf',
			file_name: 'controle-zz.pdf',
			mime_type: 'application/pdf',
			file_size: 12_345,
			created_by: auteur.id
		});
		expect(error, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await service.from('parody_evaluations').delete().eq('title', TITRE);
		await cleanupAllTestData();
	});

	/**
	 * ⚠️ LE cas. Avant le retrait de la jointure, le visiteur recevait une liste
	 * VIDE — et la page lui annonçait qu'il n'y avait rien à voir.
	 */
	it('montre le document à un visiteur non connecté', async () => {
		const data = (await chargerLaPage({
			locals: { supabase: clientAnonyme() }
		} as never)) as { evaluations: Array<{ title: string; publicUrl: string | null }> };

		expect(
			data.evaluations,
			'le visiteur reçoit une liste vide : la page lui dira que la base est vide'
		).toHaveLength(1);
		expect(data.evaluations[0].title).toBe(TITRE);
	});

	/** Le lien de téléchargement est calculé côté serveur : il doit suivre. */
	it('et lui donne de quoi l’ouvrir', async () => {
		const data = (await chargerLaPage({
			locals: { supabase: clientAnonyme() }
		} as never)) as { evaluations: Array<{ publicUrl: string | null }> };

		expect(data.evaluations[0].publicUrl).toContain('controle-zz.pdf');
	});
});
