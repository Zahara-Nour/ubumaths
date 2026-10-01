/**
 * Consentement parental décidé par le niveau
 * ==========================================
 *
 * Migration `20261001190000_consentement_par_niveau` (décisions Q69-Q73).
 *
 * Ce que le fichier prouve (spécification validée par David le 2026-10-01) :
 *   A1. un élève créé sans niveau (ou en 6e-2nde) est soumis, 30 jours de grâce ;
 *   A2. 1re / terminale : non soumis ;
 *   A3. changement de niveau : la règle est recalculée, la réponse d'âge remise à zéro ;
 *   A4. un consentement accordé n'est jamais effacé ;
 *   A5. une autre modification du profil ne touche pas au consentement ;
 *   A6. professeur et admin : jamais soumis ;
 *   B13. l'élève ne peut pas écrire sa réponse d'âge directement, ni changer son
 *        niveau pour échapper au consentement ;
 *   C16. le professeur peut annuler une déclaration (réponse à null, re-soumis).
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

const JOUR = 86_400_000;

/** Client de service : ensemencement et constats. */
const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Colonnes lues ; age_* n'existent dans les types générés qu'après db:types. */
interface EtatConsentement {
	grade: string | null;
	consent_required: boolean;
	consent_granted_at: string | null;
	consent_grace_period_ends: string | null;
	age_declaration: string | null;
	age_declared_at: string | null;
}

async function lire(id: string): Promise<EtatConsentement> {
	const { data, error } = await (service as unknown as SupabaseClient)
		.from('profiles')
		.select(
			'grade, consent_required, consent_granted_at, consent_grace_period_ends, age_declaration, age_declared_at'
		)
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data as EtatConsentement;
}

async function modifier(id: string, champs: Record<string, unknown>): Promise<void> {
	const { error } = await service
		.from('profiles')
		.update(champs as never)
		.eq('id', id);
	if (error) throw new Error(error.message);
}

/** Le délai de grâce tombe-t-il à environ 30 jours d'ici ? */
function graceDansTrenteJours(fin: string | null): boolean {
	if (!fin) return false;
	const ecart = new Date(fin).getTime() - Date.now();
	return ecart > 29 * JOUR && ecart <= 30 * JOUR + 60_000;
}

// ============================================================================
// TESTS
// ============================================================================

describe('consentement parental décidé par le niveau', () => {
	let eleveId: string;
	let eleve: SupabaseClient<Database>;
	let enseignant: SupabaseClient<Database>;
	let profId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const profilEleve = await TestData.profile().withRole('student').create();
		const profilProf = await TestData.profile().withRole('teacher').create();
		eleveId = profilEleve.id;
		profId = profilProf.id;
		eleve = await clientFor(profilEleve.email);
		enseignant = await clientFor(profilProf.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// A. Règle automatique
	// --------------------------------------------------------------------------

	it('A1 — un élève créé sans niveau est soumis, avec 30 jours de grâce', async () => {
		const nouveau = await TestData.profile().withRole('student').create();
		const p = await lire(nouveau.id);
		expect(p.grade).toBeNull();
		expect(p.consent_required).toBe(true);
		expect(graceDansTrenteJours(p.consent_grace_period_ends)).toBe(true);
	});

	it.each(['6', '5', '4', '3', '2'])(
		'A1 — passage en %s : soumis, 30 jours de grâce',
		async (g) => {
			await modifier(eleveId, { grade: 'T_SPE', consent_granted_at: null });
			await modifier(eleveId, { grade: g });
			const p = await lire(eleveId);
			expect(p.consent_required).toBe(true);
			expect(graceDansTrenteJours(p.consent_grace_period_ends)).toBe(true);
		}
	);

	it.each(['1_GEN', '1_SPE', '1_STMG', 'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_STMG'])(
		'A2 — passage en %s : non soumis',
		async (g) => {
			await modifier(eleveId, { grade: '6', consent_granted_at: null });
			await modifier(eleveId, { grade: g });
			expect((await lire(eleveId)).consent_required).toBe(false);
		}
	);

	it("A3 — passage de 3e en 2nde : réponse d'âge remise à zéro, nouveau délai", async () => {
		await modifier(eleveId, { grade: '3', consent_granted_at: null });
		await modifier(eleveId, {
			age_declaration: '15_plus',
			age_declared_at: new Date().toISOString(),
			consent_grace_period_ends: new Date(Date.now() - JOUR).toISOString()
		});
		await modifier(eleveId, { grade: '2' });
		const p = await lire(eleveId);
		expect(p.age_declaration).toBeNull();
		expect(p.age_declared_at).toBeNull();
		expect(p.consent_required).toBe(true);
		expect(graceDansTrenteJours(p.consent_grace_period_ends)).toBe(true);
	});

	it("A4 — un consentement accordé n'est jamais effacé par un changement de niveau", async () => {
		const accorde = new Date(Date.now() - 10 * JOUR).toISOString();
		const grace = new Date(Date.now() - 5 * JOUR).toISOString();
		await modifier(eleveId, { grade: '4' });
		await modifier(eleveId, { consent_granted_at: accorde, consent_grace_period_ends: grace });
		await modifier(eleveId, { grade: '3' });
		const p = await lire(eleveId);
		expect(new Date(p.consent_granted_at!).getTime()).toBe(new Date(accorde).getTime());
		expect(new Date(p.consent_grace_period_ends!).getTime()).toBe(new Date(grace).getTime());
	});

	it('A5 — modifier autre chose que le niveau ne touche pas au consentement', async () => {
		const grace = new Date(Date.now() + 3 * JOUR).toISOString();
		await modifier(eleveId, { grade: '6', consent_granted_at: null });
		await modifier(eleveId, { consent_grace_period_ends: grace });
		await modifier(eleveId, { firstname: 'Prénom ZZ' });
		const p = await lire(eleveId);
		expect(p.consent_required).toBe(true);
		expect(new Date(p.consent_grace_period_ends!).getTime()).toBe(new Date(grace).getTime());
	});

	it("A6 — un professeur n'est jamais soumis", async () => {
		const p = await lire(profId);
		expect(p.consent_required).toBe(false);
		expect(p.consent_grace_period_ends).toBeNull();
	});

	it('la réponse d’âge refuse toute autre valeur que 15_plus / under_15', async () => {
		const { error } = await service
			.from('profiles')
			.update({ age_declaration: 'peut-être' } as never)
			.eq('id', eleveId);
		expect(error?.code).toBe('23514');
	});

	// --------------------------------------------------------------------------
	// B13. L'élève ne contourne pas la règle
	// --------------------------------------------------------------------------

	it("B13 — l'élève ne peut pas écrire sa réponse d'âge directement", async () => {
		await modifier(eleveId, { grade: '2', consent_granted_at: null });
		const { error } = await eleve
			.from('profiles')
			.update({ age_declaration: '15_plus', age_declared_at: new Date().toISOString() } as never)
			.eq('id', eleveId);
		expect(error?.code).toBe('42501');
		expect((await lire(eleveId)).age_declaration).toBeNull();
	});

	it("B13 — l'élève ne peut pas changer son niveau pour échapper au consentement", async () => {
		await modifier(eleveId, { grade: '2', consent_granted_at: null });
		const { error } = await eleve.from('profiles').update({ grade: '1_GEN' }).eq('id', eleveId);
		expect(error?.code).toBe('42501');
		const p = await lire(eleveId);
		expect(p.grade).toBe('2');
		expect(p.consent_required).toBe(true);
	});

	it('B13 — un compte sans profil ne peut pas créer le sien avec un consentement forgé', async () => {
		const autre = await TestData.profile().withRole('student').create();
		const client = await clientFor(autre.email);
		// Simule un compte resté sans profil (handle_new_user avale ses erreurs).
		const { error: errSuppr } = await service.from('profiles').delete().eq('id', autre.id);
		expect(errSuppr).toBeNull();
		const { error } = await client.from('profiles').insert({
			id: autre.id,
			email: autre.email,
			role: 'student',
			grade: '6',
			consent_granted_at: new Date().toISOString(),
			age_declaration: '15_plus',
			age_declared_at: new Date().toISOString()
		} as never);
		expect(error).toBeNull();
		const p = await lire(autre.id);
		expect(p.consent_granted_at).toBeNull();
		expect(p.age_declaration).toBeNull();
		expect(p.consent_required).toBe(true);
	});

	// --------------------------------------------------------------------------
	// C16. Annulation par le professeur
	// --------------------------------------------------------------------------

	it('C16 — le professeur annule une déclaration : élève re-soumis, nouveau délai', async () => {
		await modifier(eleveId, { grade: '2', consent_granted_at: null });
		await modifier(eleveId, {
			age_declaration: '15_plus',
			age_declared_at: new Date().toISOString(),
			consent_required: false
		});
		const nouvelleGrace = new Date(Date.now() + 30 * JOUR).toISOString();
		const { error } = await enseignant
			.from('profiles')
			.update({
				age_declaration: null,
				age_declared_at: null,
				consent_required: true,
				consent_grace_period_ends: nouvelleGrace
			} as never)
			.eq('id', eleveId);
		expect(error).toBeNull();
		const p = await lire(eleveId);
		expect(p.age_declaration).toBeNull();
		expect(p.consent_required).toBe(true);
		expect(graceDansTrenteJours(p.consent_grace_period_ends)).toBe(true);
	});
});
