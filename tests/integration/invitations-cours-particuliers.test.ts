/**
 * Invitations de cours particulier (nécessite une base locale)
 * ============================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 1 : la table des invitations, le réglage « école de cours particuliers » et la lecture
 * d'une invitation par son lien.
 *
 * Question d'accès (décision 7 de David, 2026-11-24) : seuls l'admin et le prof lisent les
 * invitations (prénom, adresse du parent) ; la page du parent ne voit que l'invitation de son
 * propre lien. Ces tests portent surtout sur « qu'est-ce que ça n'ouvre pas » :
 *
 *  - ni `anon` ni un élève ne lisent la table ; personne d'autre que le serveur n'y écrit ;
 *  - le prof et l'admin lisent les invitations, jamais l'empreinte du lien ;
 *  - la lecture par le lien n'est appelable que par le service role (le serveur) ;
 *  - un lien valide rend le prénom, le niveau, l'école et l'échéance — jamais l'adresse du
 *    parent ; utilisé, annulé, expiré, inconnu ou mal formé : la MÊME réponse (null) ;
 *  - une seule école de cours particuliers, réglage faux par défaut.
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
interface InvitationPayload {
	firstname: string;
	grade: string;
	school_name: string;
	expires_at: string;
}

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const TABLE = 'private_lesson_invitations';
const PARENT_EMAIL = 'parent.jade@example.test';
const COLONNES_LISIBLES =
	'id, school_id, firstname, parent_email, grade, expires_at, email_sent_at, sent_count, cancelled_at, used_at, student_id, class_id, created_by, created_at';
const JOUR = 86_400_000;
// Client non typé : la table entre dans `database.ts` avec `pnpm db:types`, après la migration.
const service = createServiceRoleClient() as unknown as SupabaseClient;

// Variables
let ecoleId: string;
let autreEcoleId: string;
let prof: SupabaseClient;
let admin: SupabaseClient;
let eleve: SupabaseClient;
let invitationId: string;
let jetonValide: string;
let jetonExpire: string;
let jetonAnnule: string;
let jetonUtilise: string;

// Functions
function sha256(texte: string): string {
	return createHash('sha256').update(texte).digest('hex');
}

function nouveauJeton(): string {
	return randomBytes(32).toString('base64url');
}

function anonClient(): SupabaseClient {
	return createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function nouvelleEcole(nom: string): Promise<string> {
	const { data, error } = await service
		.from('schools')
		.insert({ name: nom, city: 'Testville', country: 'France' })
		.select('id')
		.single();
	if (error) throw new Error(`schools : ${error.message}`);
	return (data as { id: string }).id;
}

/** Invitation écrite par le serveur ; rend son id et le jeton en clair */
async function inviter(
	champs: Record<string, unknown> = {}
): Promise<{ id: string; jeton: string }> {
	const jeton = nouveauJeton();
	const { data, error } = await service
		.from(TABLE)
		.insert({
			school_id: ecoleId,
			firstname: 'Jade',
			parent_email: PARENT_EMAIL,
			grade: '5e',
			token_hash: sha256(jeton),
			expires_at: new Date(Date.now() + 7 * JOUR).toISOString(),
			...champs
		})
		.select('id')
		.single();
	if (error) throw new Error(`${TABLE} : ${error.message}`);
	return { id: (data as { id: string }).id, jeton };
}

async function lireParLien(jeton: string | null): Promise<InvitationPayload | null> {
	const { data, error } = await service.rpc('get_private_lesson_invitation', { p_token: jeton });
	if (error) throw new Error(`get_private_lesson_invitation : ${error.message}`);
	return data as InvitationPayload | null;
}

async function nombreDInvitations(): Promise<number> {
	const { count, error } = await service
		.from(TABLE)
		.select('id', { count: 'exact', head: true })
		.eq('school_id', ecoleId);
	if (error) throw new Error(error.message);
	return count ?? -1;
}

// Tests
describe('invitations de cours particulier (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		ecoleId = await nouvelleEcole('École cours particuliers test');
		autreEcoleId = await nouvelleEcole('Autre école test');
		const { error: eReglage } = await service
			.from('schools')
			.update({ is_private_lessons: true })
			.eq('id', ecoleId);
		if (eReglage) throw new Error(`réglage d'école : ${eReglage.message}`);

		const p = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(p.email!);
		const a = await TestData.profile().withRole('admin').create();
		admin = await clientFor(a.email!);
		const e = await TestData.profile().withRole('student').create();
		eleve = await clientFor(e.email!);

		const valide = await inviter();
		invitationId = valide.id;
		jetonValide = valide.jeton;
		jetonExpire = (await inviter({ expires_at: new Date(Date.now() - JOUR).toISOString() })).jeton;
		jetonAnnule = (await inviter({ cancelled_at: new Date().toISOString() })).jeton;
		jetonUtilise = (await inviter({ used_at: new Date().toISOString() })).jeton;
	});

	afterAll(async () => {
		// Les invitations partent avec leur école (on delete cascade).
		await service.from('schools').delete().in('id', [ecoleId, autreEcoleId]);
		await cleanupAllTestData();
	});

	describe('réglage « école de cours particuliers »', () => {
		it('est faux par défaut sur une école neuve', async () => {
			const { data, error } = await service
				.from('schools')
				.select('is_private_lessons')
				.eq('id', autreEcoleId)
				.single();
			expect(error).toBeNull();
			expect((data as { is_private_lessons: boolean }).is_private_lessons).toBe(false);
		});

		it('ne peut être posé que sur une seule école', async () => {
			const { error } = await service
				.from('schools')
				.update({ is_private_lessons: true })
				.eq('id', autreEcoleId);
			expect(error?.code).toBe('23505');
			const { data } = await service.from('schools').select('id').eq('is_private_lessons', true);
			expect((data ?? []).map((r: { id: string }) => r.id)).toEqual([ecoleId]);
		});
	});

	describe('qui lit la table', () => {
		it('anon ne lit aucune invitation', async () => {
			const { data, error } = await anonClient().from(TABLE).select('id');
			expect(error?.code === '42501' || (data ?? []).length === 0).toBe(true);
		});

		it('un élève ne lit aucune invitation', async () => {
			const { data, error } = await eleve.from(TABLE).select('id');
			expect(error?.code === '42501' || (data ?? []).length === 0).toBe(true);
		});

		it('le prof lit les invitations : prénom et adresse du parent', async () => {
			const { data, error } = await prof
				.from(TABLE)
				.select(COLONNES_LISIBLES)
				.eq('id', invitationId)
				.single();
			expect(error).toBeNull();
			expect(data).toMatchObject({ firstname: 'Jade', parent_email: PARENT_EMAIL, grade: '5e' });
		});

		it("l'admin lit les invitations", async () => {
			const { data, error } = await admin.from(TABLE).select('id').eq('school_id', ecoleId);
			expect(error).toBeNull();
			expect((data ?? []).length).toBe(4);
		});

		it("ni le prof ni l'admin ne lisent l'empreinte du lien", async () => {
			for (const client of [prof, admin]) {
				const { error } = await client.from(TABLE).select('token_hash').limit(1);
				expect(error?.code).toBe('42501');
			}
		});
	});

	describe("personne d'autre que le serveur n'écrit", () => {
		it('aucun client ne crée une invitation', async () => {
			const avant = await nombreDInvitations();
			for (const client of [anonClient(), eleve, prof, admin]) {
				const { error } = await client.from(TABLE).insert({
					school_id: ecoleId,
					firstname: 'Intrus',
					parent_email: 'intrus@example.test',
					grade: '6e',
					token_hash: sha256(nouveauJeton()),
					expires_at: new Date(Date.now() + JOUR).toISOString()
				});
				expect(error?.code).toBe('42501');
			}
			expect(await nombreDInvitations()).toBe(avant);
		});

		it("aucun client ne modifie ni n'efface une invitation", async () => {
			for (const client of [eleve, prof, admin]) {
				const maj = await client
					.from(TABLE)
					.update({ parent_email: 'autre@example.test' })
					.eq('id', invitationId)
					.select('id');
				expect(maj.error?.code === '42501' || (maj.data ?? []).length === 0).toBe(true);
				const suppr = await client.from(TABLE).delete().eq('id', invitationId).select('id');
				expect(suppr.error?.code === '42501' || (suppr.data ?? []).length === 0).toBe(true);
			}
			// Relu en service role : la RLS échoue en silence.
			const { data } = await service
				.from(TABLE)
				.select('parent_email')
				.eq('id', invitationId)
				.single();
			expect((data as { parent_email: string }).parent_email).toBe(PARENT_EMAIL);
		});

		it('refuse une empreinte de lien mal formée et une adresse en majuscules', async () => {
			const mauvaiseEmpreinte = await service.from(TABLE).insert({
				school_id: ecoleId,
				firstname: 'Jade',
				parent_email: PARENT_EMAIL,
				grade: '5e',
				token_hash: 'pas-une-empreinte',
				expires_at: new Date(Date.now() + JOUR).toISOString()
			});
			expect(mauvaiseEmpreinte.error?.code).toBe('23514');
			const majuscules = await service.from(TABLE).insert({
				school_id: ecoleId,
				firstname: 'Jade',
				parent_email: 'Parent.Jade@example.test',
				grade: '5e',
				token_hash: sha256(nouveauJeton()),
				expires_at: new Date(Date.now() + JOUR).toISOString()
			});
			expect(majuscules.error?.code).toBe('23514');
		});

		it('refuse une invitation à la fois annulée et utilisée', async () => {
			const { error } = await service.from(TABLE).insert({
				school_id: ecoleId,
				firstname: 'Jade',
				parent_email: PARENT_EMAIL,
				grade: '5e',
				token_hash: sha256(nouveauJeton()),
				expires_at: new Date(Date.now() + JOUR).toISOString(),
				cancelled_at: new Date().toISOString(),
				used_at: new Date().toISOString()
			});
			expect(error?.code).toBe('23514');
		});
	});

	describe('lecture par le lien', () => {
		it("n'est appelable ni par anon ni par un compte connecté", async () => {
			for (const client of [anonClient(), eleve, prof, admin]) {
				const { data, error } = await client.rpc('get_private_lesson_invitation', {
					p_token: jetonValide
				});
				expect(error?.code).toBe('42501');
				expect(data).toBeNull();
			}
		});

		it("un lien valide rend prénom, niveau, école et échéance — jamais l'adresse du parent", async () => {
			const invitation = await lireParLien(jetonValide);
			expect(invitation).not.toBeNull();
			expect(Object.keys(invitation!).sort()).toEqual([
				'expires_at',
				'firstname',
				'grade',
				'school_name'
			]);
			expect(invitation).toMatchObject({
				firstname: 'Jade',
				grade: '5e',
				school_name: 'École cours particuliers test'
			});
			expect(JSON.stringify(invitation)).not.toContain(PARENT_EMAIL);
		});

		it('utilisé, annulé, expiré, inconnu ou mal formé : la même réponse, null', async () => {
			for (const jeton of [
				jetonUtilise,
				jetonAnnule,
				jetonExpire,
				nouveauJeton(),
				'court',
				'x'.repeat(200),
				null
			]) {
				expect(await lireParLien(jeton)).toBeNull();
			}
		});

		it("l'empreinte seule n'ouvre rien", async () => {
			expect(await lireParLien(sha256(jetonValide))).toBeNull();
		});
	});
});
