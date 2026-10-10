/**
 * Mode lecture seule (consentement parental) gardé par la base
 * =============================================================
 *
 * Constat A2 (docs/wip/rgpd-securite-constats.md) : la garde `requireConsent` n'existait
 * que dans certaines routes. La base laissait un élève en lecture seule (consentement
 * requis, ni accordé ni en période de grâce) écrire directement — insert du chat dans
 * `messages`, annonces et échanges du marché, démineur multijoueur.
 *
 * Décision de David (2026-10-10) : un trigger BEFORE INSERT par table, qui regarde
 * l'AUTEUR de la ligne (`has_full_access`, copie de `hasValidConsent`). Il bloque la
 * route, l'appel direct et les fonctions SECURITY DEFINER.
 *
 * Ce que le fichier prouve :
 *   1. un élève en lecture seule ne peut plus écrire directement : message, message
 *      privé, annonce, échange, partie de démineur, file multijoueur ;
 *   2. un échange dont le PARTENAIRE est en lecture seule est refusé aussi ;
 *   3. non-régression : le même élève en période de grâce écrit ; le prof écrit dans
 *      une conversation où se trouve un élève en lecture seule ;
 *   4. `has_full_access` n'est pas appelable par un compte (elle révélerait le statut
 *      de consentement de n'importe qui).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const DOC = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'zz-bonjour' }] }]
};

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

/** Élève en lecture seule : consentement requis, non accordé, grâce terminée. */
async function mettreEnLectureSeule(studentId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`update profiles set consent_required = true, consent_granted_at = null,
		   consent_grace_period_ends = now() - interval '1 day' where id = $1`,
		[studentId]
	);
}

/** Même élève, remis en période de grâce. */
async function mettreEnGrace(studentId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`update profiles set consent_required = true, consent_granted_at = null,
		   consent_grace_period_ends = now() + interval '10 days' where id = $1`,
		[studentId]
	);
}

/** Conversation de groupe du prof avec l'élève ; rend son identifiant. */
async function conversationAvec(teacherId: string, studentId: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into conversations (name, is_group, created_by) values ('zz-lecture-seule', true, $1)
		 returning id`,
		[teacherId]
	);
	await pg.query(
		`insert into conversation_participants (conversation_id, user_id) values ($1, $2), ($1, $3)`,
		[rows[0].id, teacherId, studentId]
	);
	return rows[0].id;
}

/** Rattache l'élève à une école (les annonces du marché en exigent une) ; rend son id. */
async function ecoleDe(studentId: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into schools (name, city, country) values ('zz-école lecture seule', 'zz', 'zz')
		 returning id`
	);
	await pg.query('update profiles set school_id = $1 where id = $2', [rows[0].id, studentId]);
	return rows[0].id;
}

// ============================================================================
// TESTS
// ============================================================================

describe('lecture seule gardée par la base', () => {
	let teacherId: string;
	let teacherEmail: string;
	let eleveId: string;
	let eleve: SupabaseClient<Database>;
	let amiId: string;
	let ami: SupabaseClient<Database>;
	let conversationId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		teacherId = prof.id;
		teacherEmail = prof.email;
		const e = await TestData.profile().withRole('student').create();
		eleveId = e.id;
		eleve = await clientFor(e.email);
		const a = await TestData.profile().withRole('student').create();
		amiId = a.id;
		ami = await clientFor(a.email);
		conversationId = await conversationAvec(teacherId, eleveId);
	});

	afterAll(async () => {
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query(`delete from schools where name = 'zz-école lecture seule'`);
	});

	// --------------------------------------------------------------------------
	// 1. Écritures directes refusées
	// --------------------------------------------------------------------------

	it('message dans une conversation : refusé', async () => {
		await mettreEnLectureSeule(eleveId);
		const { error } = await eleve
			.from('messages')
			.insert({ conversation_id: conversationId, sender_id: eleveId, content: DOC });
		expect(error?.code).toBe('42501');
	});

	it('message privé : refusé', async () => {
		await mettreEnLectureSeule(eleveId);
		const { error } = await eleve
			.from('private_messages')
			.insert({ sender_id: eleveId, subject: 'zz-objet', content: DOC });
		expect(error?.code).toBe('42501');
	});

	it('annonce du marché : refusée', async () => {
		await mettreEnLectureSeule(eleveId);
		const schoolId = await ecoleDe(eleveId);
		const { error } = await eleve.from('marketplace_listings').insert({
			creator_id: eleveId,
			school_id: schoolId,
			listing_type: 'sell',
			offered_gidouilles: 1,
			expires_at: new Date(Date.now() + 86_400_000).toISOString()
		});
		expect(error?.code).toBe('42501');
	});

	it('partie de démineur : refusée', async () => {
		await mettreEnLectureSeule(eleveId);
		const { error } = await eleve.from('minesweeper_games').insert({
			student_id: eleveId,
			difficulty: 'beginner',
			status: 'in_progress',
			grid_state: {},
			mines_count: 10
		});
		expect(error?.code).toBe('42501');
	});

	it('file du démineur multijoueur (fonction SECURITY DEFINER) : refusée', async () => {
		await mettreEnLectureSeule(eleveId);
		const { error } = await eleve.rpc('join_multiplayer_queue', {
			p_difficulty: 'beginner',
			p_match_type: 'quick'
		});
		expect(error?.code).toBe('42501');
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select 1 from minesweeper_multiplayer_queue where student_id = $1',
			[eleveId]
		);
		expect(rows).toEqual([]);
	});

	it('adversaire déjà en file : le match n’est pas créé non plus', async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from minesweeper_multiplayer_queue where student_id in ($1, $2)', [
			eleveId,
			amiId
		]);
		await mettreEnGrace(amiId);
		const { error: attente } = await ami.rpc('join_multiplayer_queue', {
			p_difficulty: 'intermediate',
			p_match_type: 'quick'
		});
		expect(attente).toBeNull();

		await mettreEnLectureSeule(eleveId);
		const { error } = await eleve.rpc('join_multiplayer_queue', {
			p_difficulty: 'intermediate',
			p_match_type: 'quick'
		});
		expect(error?.code).toBe('42501');
		const { rows } = await pg.query(
			'select 1 from minesweeper_multiplayer_matches where $1 in (player1_id, player2_id)',
			[eleveId]
		);
		expect(rows).toEqual([]);
		await pg.query('delete from minesweeper_multiplayer_queue where student_id = $1', [amiId]);
	});

	// --------------------------------------------------------------------------
	// 2. Échange avec un partenaire en lecture seule
	// --------------------------------------------------------------------------

	it('un échange dont le partenaire est en lecture seule est refusé', async () => {
		await mettreEnLectureSeule(eleveId);
		// Insert direct par le postgres (le décor d'amitié et d'école n'est pas l'objet) :
		// la garde doit tenir même hors RLS.
		const pg = await getPostgresClient();
		await expect(
			pg.query(
				`insert into marketplace_trades (trade_type, initiator_id, partner_id, status)
				 values ('friend', $1, $2, 'negotiating')`,
				[amiId, eleveId]
			)
		).rejects.toMatchObject({ code: '42501' });
	});

	// --------------------------------------------------------------------------
	// 3. Non-régression
	// --------------------------------------------------------------------------

	it('en période de grâce, le même élève écrit', async () => {
		await mettreEnGrace(eleveId);
		const { error } = await eleve
			.from('messages')
			.insert({ conversation_id: conversationId, sender_id: eleveId, content: DOC });
		expect(error).toBeNull();
	});

	it('le prof écrit dans une conversation où l’élève est en lecture seule', async () => {
		await mettreEnLectureSeule(eleveId);
		const prof = await clientFor(teacherEmail);
		const { error } = await prof
			.from('messages')
			.insert({ conversation_id: conversationId, sender_id: teacherId, content: DOC });
		expect(error).toBeNull();
	});

	it('un élève non soumis au consentement écrit', async () => {
		const pg = await getPostgresClient();
		await pg.query(
			`update profiles set consent_required = false, consent_grace_period_ends = null
			 where id = $1`,
			[amiId]
		);
		const { error } = await ami
			.from('private_messages')
			.insert({ sender_id: amiId, subject: 'zz-objet', content: DOC });
		expect(error).toBeNull();
	});

	// --------------------------------------------------------------------------
	// 4. Fonction non exposée
	// --------------------------------------------------------------------------

	it.each(['anon', 'authenticated', 'public'])(
		'%s ne peut pas appeler has_full_access',
		async (role) => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ granted: boolean }>(
				`select has_function_privilege($1, 'public.has_full_access(uuid)', 'EXECUTE') as granted`,
				[role]
			);
			expect(rows[0].granted).toBe(false);
		}
	);
});
