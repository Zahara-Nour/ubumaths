/**
 * Canal temps réel PRIVÉ du chat : seuls les participants (base locale requise)
 * ============================================================================
 *
 * Migration `20261004090000_realtime_chat_prive.sql`. Décision de David
 * (S3, 2026-10-03) : « Seuls les participants d'une conversation peuvent
 * écouter et diffuser sur son canal temps réel. »
 *
 * Les policies de `realtime.messages` ne s'appliquent qu'aux canaux PRIVÉS
 * (`config: { private: true }`). Sans policy, la RLS refuse tout canal privé :
 * c'est pourquoi les TÉMOINS positifs (un participant s'abonne et reçoit) sont
 * ceux qui échouent sans la migration ; les refus, eux, sont vrais avant comme
 * après — ils prouvent que la migration n'ouvre pas plus que voulu.
 *
 * Bout en bout, contre le serveur Realtime local (pas de simulation) :
 *   1. A et B (participants) s'abonnent à `chat-<conv1>` privé ; B reçoit le
 *      broadcast de A, par la socket ET par l'API REST.
 *   2. O (authentifié, non participant) : abonnement refusé ; sa diffusion
 *      REST n'arrive pas chez B.
 *   3. anon : idem.
 *   4. A sur `chat-<conv2>` (conversation dont il n'est pas membre) : refusé.
 *   5. Topic mal formé (`chat-pas-un-uuid`, majuscules, préfixe) : refusé,
 *      sans erreur SQL.
 *   6. Non-régression : le canal PUBLIC actuel du chat marche toujours (le
 *      client ne passe en privé qu'à la PR 2).
 * Plus, au niveau SQL (rôle `authenticated` simulé) : la policy ne lève
 * aucune erreur sur un topic mal formé ou absent.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;

interface ResultatAbonnement {
	status: string;
	message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const service = createServiceRoleClient();

const URL_LOCALE = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const CLE_ANON =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Canal public sans rapport avec le chat, ouvert tout le long du fichier. */
const TOPIC_GARDE_SOCKET = 'test-garde-socket';

/** Délai d'attente d'un broadcast : au-delà, on conclut qu'il n'arrivera pas. */
const ATTENTE_MS = 2_500;

// ============================================================================
// HELPERS
// ============================================================================

/** S'abonne et rend le statut final (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT…). */
function abonner(channel: RealtimeChannel): Promise<ResultatAbonnement> {
	return new Promise((resolve) => {
		const garde = setTimeout(() => resolve({ status: 'ATTENTE_DEPASSEE', message: '' }), 15_000);
		channel.subscribe((status, err) => {
			if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
				clearTimeout(garde);
				// Un canal refusé retente sa jonction en boucle et ralentit les suivants :
				// on le ferme aussitôt.
				if (status !== 'SUBSCRIBED') void channel.unsubscribe();
				resolve({ status, message: err?.message ?? '' });
			}
		});
	});
}

function canalPrive(client: Client, topic: string): RealtimeChannel {
	return client.channel(topic, { config: { private: true, broadcast: { self: false } } });
}

/** Ouvre un canal récepteur et collecte les broadcasts `new_message`. */
async function recepteur(
	client: Client,
	topic: string,
	prive = true
): Promise<{ channel: RealtimeChannel; recus: unknown[]; abonnement: ResultatAbonnement }> {
	const recus: unknown[] = [];
	const channel = prive
		? canalPrive(client, topic)
		: client.channel(topic, { config: { broadcast: { self: false } } });
	channel.on('broadcast', { event: 'new_message' }, ({ payload }) => recus.push(payload));
	const abonnement = await abonner(channel);
	return { channel, recus, abonnement };
}

async function attendre(ms: number): Promise<void> {
	await new Promise((r) => setTimeout(r, ms));
}

/** Attend qu'au moins `n` messages soient arrivés, ou que le délai expire. */
async function attendreReception(recus: unknown[], n = 1): Promise<void> {
	const fin = Date.now() + ATTENTE_MS;
	while (recus.length < n && Date.now() < fin) await attendre(50);
}

/**
 * Diffusion par l'API REST de Realtime (`/api/broadcast`), sans s'abonner :
 * la voie d'un attaquant qui n'a pas pu rejoindre le canal. Rend le statut HTTP.
 */
async function diffuserRest(jeton: string, topic: string, texte: string): Promise<number> {
	const res = await fetch(`${URL_LOCALE}/realtime/v1/api/broadcast`, {
		method: 'POST',
		headers: {
			apikey: CLE_ANON,
			Authorization: `Bearer ${jeton}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			messages: [{ topic, event: 'new_message', payload: { texte }, private: true }]
		})
	});
	return res.status;
}

async function jetonDe(client: Client): Promise<string> {
	const { data } = await client.auth.getSession();
	const jeton = data.session?.access_token;
	expect(jeton, 'session absente').toBeTruthy();
	return jeton as string;
}

async function connecter(email: string): Promise<Client> {
	const client = await createAuthenticatedClient(email);
	// Le jeton de la session, pas la clé anon, doit porter l'identité côté Realtime.
	await client.realtime.setAuth(await jetonDe(client));
	return client;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Chat : canal temps réel privé réservé aux participants', { timeout: 120_000 }, () => {
	let clientA: Client;
	let clientB: Client;
	let clientO: Client;
	let anon: Client;
	let conv1: string;
	let conv2: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await TestData.profile().withRole('student').create();
		const b = await TestData.profile().withRole('student').create();
		const c = await TestData.profile().withRole('student').create();
		const o = await TestData.profile().withRole('student').create();

		const { data: convs, error } = await service
			.from('conversations')
			.insert([{ is_group: false }, { is_group: false }])
			.select('id');
		expect(error).toBeNull();
		[conv1, conv2] = (convs as { id: string }[]).map((r) => r.id);

		const participants = await service.from('conversation_participants').insert([
			{ conversation_id: conv1, user_id: a.id },
			{ conversation_id: conv1, user_id: b.id },
			{ conversation_id: conv2, user_id: b.id },
			{ conversation_id: conv2, user_id: c.id }
		]);
		expect(participants.error).toBeNull();

		clientA = await connecter(a.email);
		clientB = await connecter(b.email);
		clientO = await connecter(o.email);
		anon = createClient<Database>(URL_LOCALE, CLE_ANON, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Canal public neutre, gardé ouvert : maintient la socket de chaque client.
		for (const cl of [clientA, clientB, clientO, anon]) {
			expect((await abonner(cl.channel(TOPIC_GARDE_SOCKET))).status).toBe('SUBSCRIBED');
		}
	}, 120_000);

	// Un client ne rouvre pas un topic déjà ouvert : on ferme les canaux du test
	// entre deux tests. Pas `removeAllChannels` : sans canal, la socket se ferme et
	// sa reconnexion retarde l'abonnement suivant jusqu'au TIMED_OUT (10 s).
	afterEach(async () => {
		for (const cl of [clientA, clientB, clientO, anon]) {
			for (const ch of cl?.getChannels() ?? []) {
				if (!ch.topic.endsWith(TOPIC_GARDE_SOCKET)) await cl.removeChannel(ch);
			}
		}
	});

	afterAll(async () => {
		for (const cl of [clientA, clientB, clientO, anon]) cl?.realtime.disconnect();
		await service.from('conversation_participants').delete().in('conversation_id', [conv1, conv2]);
		await service.from('conversations').delete().in('id', [conv1, conv2]);
		await cleanupAllTestData();
	});

	// ===========================================================================
	// 1. Témoins : les participants (ÉCHOUENT sans la migration)
	// ===========================================================================

	it('un participant reçoit, sur le canal privé, le broadcast d’un autre participant', async () => {
		const b = await recepteur(clientB, `chat-${conv1}`);
		expect(b.abonnement.status, `B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');

		const canalA = canalPrive(clientA, `chat-${conv1}`);
		const abonnementA = await abonner(canalA);
		expect(abonnementA.status, `A refusé : ${abonnementA.message}`).toBe('SUBSCRIBED');

		await canalA.send({ type: 'broadcast', event: 'new_message', payload: { texte: 'socket' } });
		await attendreReception(b.recus);
		expect(b.recus).toEqual([{ texte: 'socket' }]);

		// Même chose par l'API REST : la voie testée ensuite pour les refus.
		expect(await diffuserRest(await jetonDe(clientA), `chat-${conv1}`, 'rest')).toBe(202);
		await attendreReception(b.recus, 2);
		expect(b.recus).toEqual([{ texte: 'socket' }, { texte: 'rest' }]);
		b.recus.length = 0;
	});

	// ===========================================================================
	// 2-3. Non-participant authentifié et anon : ni écouter, ni diffuser
	// ===========================================================================

	it('un non-participant authentifié ne peut ni s’abonner ni diffuser', async () => {
		const o = await recepteur(clientO, `chat-${conv1}`);
		expect(o.abonnement.status).toBe('CHANNEL_ERROR');

		const b = await recepteur(clientB, `chat-${conv1}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');

		await diffuserRest(await jetonDe(clientO), `chat-${conv1}`, 'usurpation');
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	it('anon ne peut ni s’abonner ni diffuser', async () => {
		const x = await recepteur(anon, `chat-${conv1}`);
		expect(x.abonnement.status).toBe('CHANNEL_ERROR');

		const b = await recepteur(clientB, `chat-${conv1}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');

		await diffuserRest(CLE_ANON, `chat-${conv1}`, 'anonyme');
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	// ===========================================================================
	// 4. Topic d'une autre conversation
	// ===========================================================================

	it('un participant de conv1 est refusé sur le canal de conv2', async () => {
		const x = await recepteur(clientA, `chat-${conv2}`);
		expect(x.abonnement.status).toBe('CHANNEL_ERROR');

		// Témoin : B, membre de conv2, y entre ; la diffusion de A n'y arrive pas.
		const b = await recepteur(clientB, `chat-${conv2}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');
		await diffuserRest(await jetonDe(clientA), `chat-${conv2}`, 'intrus');
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	// ===========================================================================
	// 5. Topics mal formés
	// ===========================================================================

	it('un topic mal formé est refusé (abonnement)', async () => {
		for (const topic of [
			'chat-pas-un-uuid',
			`chat-${conv1.toUpperCase()}`,
			`xchat-${conv1}`,
			`chat-${conv1}-suffixe`
		]) {
			const x = await recepteur(clientA, topic);
			expect(x.abonnement.status, topic).toBe('CHANNEL_ERROR');
		}
	});

	it('au niveau SQL, la policy refuse sans erreur un topic mal formé ou absent', async () => {
		const pg = await getPostgresClient();
		const { rows: membre } = await pg.query<{ user_id: string }>(
			`select user_id from conversation_participants where conversation_id = $1 limit 1`,
			[conv1]
		);
		const claims = JSON.stringify({ sub: membre[0].user_id, role: 'authenticated' });

		// [topic posé par Realtime, topic de la ligne, autorisé ?]
		const cas: [string | null, string, boolean][] = [
			[`chat-${conv1}`, `chat-${conv1}`, true],
			['chat-pas-un-uuid', 'chat-pas-un-uuid', false],
			['chat-', 'chat-', false],
			[null, `chat-${conv1}`, false]
		];
		for (const [topicSession, topicLigne, autorise] of cas) {
			await pg.query('begin');
			try {
				await pg.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
				await pg.query(`select set_config('realtime.topic', $1, true)`, [topicSession ?? '']);
				await pg.query('set local role authenticated');
				await pg.query('savepoint s');
				let refus: string | null = null;
				try {
					await pg.query(
						`insert into realtime.messages (topic, extension, payload, private)
						 values ($1, 'broadcast', '{}'::jsonb, true)`,
						[topicLigne]
					);
				} catch (e) {
					refus = (e as { code?: string }).code ?? 'inconnu';
					await pg.query('rollback to savepoint s');
				}
				// Refus = violation de RLS (42501), jamais une erreur de cast (22P02).
				expect(refus, `${topicSession}`).toBe(autorise ? null : '42501');

				const { rows } = await pg.query<{ n: number }>(
					`select count(*)::int as n from realtime.messages where topic = $1`,
					[topicLigne]
				);
				expect(rows[0].n > 0, `lecture ${topicSession}`).toBe(autorise);
			} finally {
				await pg.query('rollback');
			}
		}
	});

	// ===========================================================================
	// 5 bis. Présence : hors de la décision, refusée même aux participants
	// ===========================================================================

	it('la présence n’est pas ouverte : un participant ne voit pas le track() d’un autre', async () => {
		// Le chat n'utilise pas la présence ; les policies ne couvrent que
		// l'extension `broadcast`. Ce test prouve la clause `extension`.
		const vusParB: unknown[] = [];
		const canalB = clientB.channel(`chat-${conv1}`, {
			config: { private: true, presence: { key: 'b' } }
		});
		canalB.on('presence', { event: 'sync' }, () => {
			vusParB.push(...Object.keys(canalB.presenceState()));
		});
		const abonnementB = await abonner(canalB);
		expect(abonnementB.status, `témoin B refusé : ${abonnementB.message}`).toBe('SUBSCRIBED');

		const canalA = clientA.channel(`chat-${conv1}`, {
			config: { private: true, presence: { key: 'a' } }
		});
		canalA.on('presence', { event: 'sync' }, () => {});
		const abonnementA = await abonner(canalA);
		expect(abonnementA.status, `témoin A refusé : ${abonnementA.message}`).toBe('SUBSCRIBED');

		await canalA.track({ en_ligne: true }).catch(() => 'refus');
		await attendre(ATTENTE_MS);
		expect(vusParB).not.toContain('a');
		expect(Object.keys(canalB.presenceState())).not.toContain('a');
	});

	// ===========================================================================
	// 6. Non-régression : le canal PUBLIC actuel (avant la PR 2)
	// ===========================================================================

	it('le canal public actuel du chat fonctionne toujours entre participants', async () => {
		const b = await recepteur(clientB, `chat-${conv1}`, false);
		expect(b.abonnement.status).toBe('SUBSCRIBED');

		const canalA = clientA.channel(`chat-${conv1}`, { config: { broadcast: { self: false } } });
		expect((await abonner(canalA)).status).toBe('SUBSCRIBED');
		await canalA.send({ type: 'broadcast', event: 'new_message', payload: { texte: 'public' } });
		await attendreReception(b.recus);
		expect(b.recus).toEqual([{ texte: 'public' }]);
	});
});
