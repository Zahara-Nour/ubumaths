/**
 * Règle de consentement : la base fait foi, le code la suit (constat A3)
 * ======================================================================
 *
 * Décision de David (2026-10-10) :
 *   1. la règle de la base fait foi — tout niveau est soumis au consentement parental
 *      SAUF 1re et terminale (primaire et niveau inconnu compris). Le code disait
 *      6e → 2nde : un élève de primaire passait en lecture seule sans que la page du
 *      prof le montre ;
 *   2. les comptes créés AVANT la règle (20261001190000) et jamais soumis — 30 élèves
 *      de 6e et 3 sans niveau en prod, tous archivés — sont soumis à leur RETOUR en
 *      classe (marque `consent_rule_pending`), pas tout de suite. Une dispense du prof
 *      (consent_required = false posé par lui) ne doit pas être écrasée.
 *
 * Ce que le fichier prouve :
 *   1. la liste d'exemptions du code est exactement celle de la base ;
 *   2. un compte ancien marqué, qui rejoint une classe (ou y redevient actif), est soumis :
 *      consentement requis, 30 jours de grâce, marque retirée ;
 *   3. un élève dispensé (non marqué) qui rejoint une classe reste dispensé ;
 *   4. le prof qui change le consentement d'un compte marqué retire la marque ;
 *   5. un élève ne peut pas retirer sa propre marque ;
 *   6. un nouveau compte n'est jamais marqué.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { GRADES_EXEMPT_FROM_CONSENT } from '$lib/utils/consent';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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

interface EtatConsentement {
	consent_required: boolean;
	consent_rule_pending: boolean;
	grace_jours: number | null;
}

async function etat(studentId: string): Promise<EtatConsentement> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<EtatConsentement>(
		`select consent_required, consent_rule_pending,
		   round(extract(epoch from consent_grace_period_ends - now()) / 86400)::int as grace_jours
		 from profiles where id = $1`,
		[studentId]
	);
	return rows[0];
}

/** Élève de 6e créé « avant la règle » : non soumis, marqué. */
async function compteAncien(): Promise<string> {
	const e = await TestData.profile().withRole('student').create();
	const pg = await getPostgresClient();
	await pg.query(
		`update profiles set grade = '6', consent_required = false,
		   consent_grace_period_ends = null where id = $1`,
		[e.id]
	);
	// Séparément : un changement de niveau retire la marque (la règle s'est appliquée).
	await pg.query('update profiles set consent_rule_pending = true where id = $1', [e.id]);
	return e.id;
}

// ============================================================================
// TESTS
// ============================================================================

describe('règle de consentement : la base fait foi', () => {
	let classId: string;
	let teacherEmail: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		teacherEmail = prof.email;
		classId = (await TestData.class(prof.id).create()).id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('la liste d’exemptions du code est celle de la base', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ def: string }>(
			`select pg_get_functiondef('public.apply_consent_rule_by_grade'::regproc) as def`
		);
		const liste = rows[0].def.match(/v_lycee text\[\] := array\[([^\]]*)\]/);
		expect(liste).not.toBeNull();
		const base = [...liste![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
		expect([...GRADES_EXEMPT_FROM_CONSENT].sort()).toEqual(base);
	});

	it('un compte ancien qui rejoint une classe est soumis, avec 30 jours de grâce', async () => {
		const id = await compteAncien();
		const pg = await getPostgresClient();
		await pg.query(
			`insert into class_members (class_id, student_id, status) values ($1, $2, 'active')`,
			[classId, id]
		);
		expect(await etat(id)).toEqual({
			consent_required: true,
			consent_rule_pending: false,
			grace_jours: 30
		});
	});

	it('un compte ancien archivé qui redevient actif est soumis', async () => {
		const id = await compteAncien();
		const pg = await getPostgresClient();
		// Archivé avant la marque (comme en prod) : on pose la marque après l'archivage.
		await pg.query(
			`insert into class_members (class_id, student_id, status) values ($1, $2, 'archived')`,
			[classId, id]
		);
		await pg.query('update profiles set consent_rule_pending = true where id = $1', [id]);
		expect((await etat(id)).consent_required).toBe(false);

		await pg.query(
			`update class_members set status = 'active' where class_id = $1 and student_id = $2`,
			[classId, id]
		);
		expect(await etat(id)).toMatchObject({ consent_required: true, consent_rule_pending: false });
	});

	it('un élève dispensé (non marqué) qui rejoint une classe reste dispensé', async () => {
		const e = await TestData.profile().withRole('student').create();
		const pg = await getPostgresClient();
		await pg.query(
			`update profiles set grade = '6', consent_required = false,
			   consent_grace_period_ends = null where id = $1`,
			[e.id]
		);
		await pg.query(
			`insert into class_members (class_id, student_id, status) values ($1, $2, 'active')`,
			[classId, e.id]
		);
		expect(await etat(e.id)).toMatchObject({
			consent_required: false,
			consent_rule_pending: false
		});
	});

	it('le prof qui change le consentement d’un compte marqué retire la marque', async () => {
		const id = await compteAncien();
		const prof = await clientFor(teacherEmail);
		const { error } = await prof
			.from('profiles')
			.update({ consent_required: true })
			.eq('id', id)
			.select('id');
		expect(error).toBeNull();
		expect((await etat(id)).consent_rule_pending).toBe(false);
	});

	it('un élève ne peut pas retirer sa propre marque', async () => {
		const e = await TestData.profile().withRole('student').create();
		const pg = await getPostgresClient();
		await pg.query('update profiles set consent_rule_pending = true where id = $1', [e.id]);
		const eleve = await clientFor(e.email);
		const { error } = await eleve
			.from('profiles')
			// Colonne ajoutée par cette PR : absente de database.ts tant qu'elle n'est pas en
			// prod (db:types génère depuis la prod).
			.update({ consent_rule_pending: false } as never)
			.eq('id', e.id);
		expect(error?.code).toBe('42501');
		expect((await etat(e.id)).consent_rule_pending).toBe(true);
	});

	it('un nouveau compte n’est jamais marqué', async () => {
		const e = await TestData.profile().withRole('student').create();
		expect((await etat(e.id)).consent_rule_pending).toBe(false);
	});
});
