/**
 * Sécurité : trois points mineurs (Q76, Q77, Q78)
 * ================================================
 *
 * Migration `20261001220000_securite_points_mineurs`.
 *
 * Ce que le fichier prouve :
 *   Q76. le professeur ne peut plus écrire la preuve du consentement ni l'accorder
 *        lui-même (ROUGE avant) ; il crée toujours une demande, change l'e-mail du
 *        parent ; le lien du parent accorde toujours le consentement ;
 *   Q77. le professeur ne peut plus créer une notification « système » ou au nom d'un
 *        autre, ni élargir ses destinataires après l'envoi (ROUGE avant) ; il crée et
 *        masque toujours les siennes ; l'admin n'est pas concerné ;
 *   Q78. l'élève ne peut plus modifier ses classes ni l'historique de statut de son
 *        profil (ROUGE avant) ; le professeur le peut toujours.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const MARQUE = 'ZZ-secu-mineurs';

/** Client de service : ensemencement et constats. */
const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

// ============================================================================
// TESTS
// ============================================================================

describe('sécurité : points mineurs Q76 / Q77 / Q78', () => {
	let eleve: SupabaseClient<Database>;
	let enseignant: SupabaseClient<Database>;
	let admin: SupabaseClient<Database>;
	let eleveId: string;
	let profId: string;
	let adminId: string;
	let classe: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const profilEleve = await TestData.profile().withRole('student').create();
		const profilProf = await TestData.profile().withRole('teacher').create();
		const profilAdmin = await TestData.profile().withRole('admin').create();
		eleveId = profilEleve.id;
		profId = profilProf.id;
		adminId = profilAdmin.id;

		const ecole = await insert('schools', {
			name: `Lycée ${MARQUE}`,
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: `Année ${MARQUE}`,
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: `6e ${MARQUE}`,
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZSM01',
			is_active: true
		});
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: eleveId, status: 'active' });
			expect(error).toBeNull();
		}

		eleve = await clientFor(profilEleve.email);
		enseignant = await clientFor(profilProf.email);
		admin = await clientFor(profilAdmin.email);
	});

	afterAll(async () => {
		await service.from('parental_consents').delete().eq('student_id', eleveId);
		await service.from('notifications').delete().like('title', `%${MARQUE}%`);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// Q76 — preuve du consentement
	// --------------------------------------------------------------------------

	describe('Q76 — preuve du consentement', () => {
		let demande: string;

		beforeAll(async () => {
			await service.from('parental_consents').delete().eq('student_id', eleveId);
			demande = await insert('parental_consents', {
				student_id: eleveId,
				parent_email: 'parent.zz-secu@example.com'
			});
		});

		it.each([
			['écrire l’IP', { consent_ip: '203.0.113.9' }],
			['écrire le navigateur', { consent_user_agent: 'Inventé' }],
			['écrire la date d’accord', { consent_given_at: new Date().toISOString() }],
			['passer la demande à « accordé »', { status: 'granted' }]
		])('le professeur ne peut pas %s', async (_cas, changement) => {
			const { error } = await enseignant
				.from('parental_consents')
				.update(changement as never)
				.eq('id', demande);
			expect(error?.code).toBe('42501');
			const { data } = await service
				.from('parental_consents')
				.select('status, consent_ip, consent_user_agent, consent_given_at')
				.eq('id', demande)
				.single();
			expect(data).toMatchObject({
				status: 'pending',
				consent_ip: null,
				consent_user_agent: null,
				consent_given_at: null
			});
		});

		it('le professeur ne peut pas créer une demande déjà accordée', async () => {
			const { error } = await enseignant.from('parental_consents').insert({
				student_id: eleveId,
				parent_email: 'autre.zz-secu@example.com',
				status: 'granted',
				consent_given_at: new Date().toISOString()
			});
			expect(error?.code).toBe('42501');
		});

		it("le professeur crée toujours une demande en attente et change l'e-mail du parent", async () => {
			const { data: cree, error: errCree } = await enseignant
				.from('parental_consents')
				.insert({ student_id: eleveId, parent_email: 'p2.zz-secu@example.com', status: 'pending' })
				.select('id');
			expect(errCree).toBeNull();
			expect(cree).toHaveLength(1);
			const { data, error } = await enseignant
				.from('parental_consents')
				.update({ parent_email: 'p3.zz-secu@example.com' })
				.eq('id', cree![0].id)
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
		});

		it('le lien du parent accorde toujours le consentement, avec sa preuve', async () => {
			const { data: ligne } = await service
				.from('parental_consents')
				.select('consent_token')
				.eq('id', demande)
				.single();
			const { data, error } = await service.rpc('grant_parental_consent', {
				p_token: ligne!.consent_token,
				p_ip: '198.51.100.20',
				p_user_agent: 'Firefox réel'
			});
			expect(error).toBeNull();
			expect(data).toMatchObject({ success: true });
			const { data: apres } = await service
				.from('parental_consents')
				.select('status, consent_ip')
				.eq('id', demande)
				.single();
			expect(apres).toMatchObject({ status: 'granted', consent_ip: '198.51.100.20' });
		});
	});

	// --------------------------------------------------------------------------
	// Q77 — notifications du professeur
	// --------------------------------------------------------------------------

	describe('Q77 — notifications du professeur', () => {
		const pourLaClasse = (titre: string) => ({
			title: `${titre} ${MARQUE}`,
			message: 'Message',
			type: 'info',
			target_type: 'classes',
			target_class_ids: [classe]
		});

		it('le professeur ne peut pas créer une notification « système »', async () => {
			const { error } = await enseignant.from('notifications').insert({
				...pourLaClasse('prof-systeme'),
				is_system: true,
				created_by: null,
				system_event_type: 'maintenance_scheduled'
			});
			expect(error?.code).toBe('42501');
		});

		it("le professeur ne peut pas créer une notification au nom d'un autre", async () => {
			const { error } = await enseignant.from('notifications').insert({
				...pourLaClasse('prof-usurpe'),
				created_by: adminId
			});
			expect(error?.code).toBe('42501');
		});

		it("le professeur ne peut pas élargir ses destinataires après l'envoi, mais peut masquer", async () => {
			const { data: cree, error: errCree } = await enseignant
				.from('notifications')
				.insert({ ...pourLaClasse('prof-ok'), created_by: profId })
				.select('id');
			expect(errCree).toBeNull();
			expect(cree).toHaveLength(1);
			const id = cree![0].id;

			const { error } = await enseignant
				.from('notifications')
				.update({ target_type: 'all' })
				.eq('id', id);
			expect(error?.code).toBe('42501');

			// Le masquage passe par le serveur (deleteNotification, client service) : la
			// policy SELECT (deleted_at is null) refuse au compte la ligne masquée.
			const { error: errMasque } = await service
				.from('notifications')
				.update({ deleted_at: new Date().toISOString() })
				.eq('id', id);
			expect(errMasque).toBeNull();
			const { data: apres } = await service
				.from('notifications')
				.select('deleted_at, target_type')
				.eq('id', id)
				.single();
			expect(apres?.deleted_at).not.toBeNull();
			expect(apres?.target_type).toBe('classes');
		});

		it("l'admin modifie toujours les destinataires d'une notification", async () => {
			const id = await insert('notifications', {
				...pourLaClasse('admin-cible'),
				created_by: adminId
			});
			const { data, error } = await admin
				.from('notifications')
				.update({ target_type: 'all', target_class_ids: null })
				.eq('id', id)
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
		});
	});

	// --------------------------------------------------------------------------
	// Q78 — traçabilité du profil
	// --------------------------------------------------------------------------

	describe('Q78 — traçabilité du profil', () => {
		// Valeurs construites dans le test : la table d'it.each est évaluée avant
		// beforeAll (profId, classe n'y existent pas encore).
		it.each([
			['ses classes', () => ({ class_ids: [classe, crypto.randomUUID()] })],
			['la date de changement de statut', () => ({ status_changed_at: new Date().toISOString() })],
			['l’auteur du changement de statut', () => ({ status_changed_by: profId })],
			['le motif de refus', () => ({ rejection_reason: 'Inventé' })]
		])("l'élève ne peut pas modifier %s", async (_cas, changement) => {
			const valeurs = changement();
			expect(Object.values(valeurs).every((v) => v !== undefined)).toBe(true);
			const { error } = await eleve
				.from('profiles')
				.update(valeurs as never)
				.eq('id', eleveId);
			expect(error?.code).toBe('42501');
		});

		it("le professeur modifie toujours l'historique de statut d'un élève", async () => {
			const { data, error } = await enseignant
				.from('profiles')
				.update({ status_changed_at: new Date().toISOString(), status_changed_by: profId })
				.eq('id', eleveId)
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
		});
	});
});
