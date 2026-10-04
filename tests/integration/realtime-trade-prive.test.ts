/**
 * Canal temps réel PRIVÉ des échanges de cartes : seuls les deux élèves
 * =====================================================================
 *
 * Migration `20261004120000_realtime_trade_prive.sql`. Décision de David
 * (2026-10-04) : « Seuls les deux élèves de l'échange peuvent écouter et écrire
 * sur son canal temps réel. Ni le prof, ni l'admin, ni les autres élèves. »
 *
 * Les policies de `realtime.messages` ne s'appliquent qu'aux canaux PRIVÉS.
 * Sans policy, la RLS refuse tout canal privé : les TÉMOINS positifs (les deux
 * élèves s'abonnent et se reçoivent) sont ceux qui échouent sans la migration ;
 * les refus prouvent que la migration n'ouvre pas plus que voulu. Chaque refus
 * s'asserte CÔTÉ RÉCEPTION : un témoin abonné ne reçoit rien.
 *
 * Bout en bout, contre le serveur Realtime local :
 *   1. A (initiateur) et B (partenaire) : chacun reçoit le broadcast de l'autre.
 *   2. O (3ᵉ élève), le prof et l'admin (qui LISENT la ligne de l'échange) :
 *      abonnement refusé, diffusion REST non reçue.
 *   3. anon : idem.
 *   4. A sur `trade:<t2>` (échange dont il n'est pas) : refusé.
 *   5. Topics mal formés : refusés, sans erreur SQL.
 *   6. Présence : refusée même aux deux élèves (clause `extension`).
 *   7. Non-croisement avec les policies `chat-*` (conversation de même uuid).
 *   8. Non-régression : le canal PUBLIC actuel fonctionne toujours.
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

/** Canal public sans rapport avec les échanges, ouvert tout le long du fichier. */
const TOPIC_GARDE_SOCKET = 'test-garde-socket-trade';

/** Délai d'attente d'un broadcast : au-delà, on conclut qu'il n'arrivera pas. */
const ATTENTE_MS = 2_500;

/** Événement réellement émis par le client des échanges. */
const EVENEMENT = 'offer_updated';

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
				// Un canal refusé retente sa jonction en boucle : on le ferme aussitôt.
				if (status !== 'SUBSCRIBED') void channel.unsubscribe();
				resolve({ status, message: err?.message ?? '' });
			}
		});
	});
}

function canalPrive(client: Client, topic: string): RealtimeChannel {
	return client.channel(topic, { config: { private: true, broadcast: { self: false } } });
}

/** Ouvre un canal récepteur et collecte les broadcasts de l'événement donné. */
async function recepteur(
	client: Client,
	topic: string,
	prive = true,
	evenement = EVENEMENT
): Promise<{ channel: RealtimeChannel; recus: unknown[]; abonnement: ResultatAbonnement }> {
	const recus: unknown[] = [];
	const channel = prive
		? canalPrive(client, topic)
		: client.channel(topic, { config: { broadcast: { self: false } } });
	channel.on('broadcast', { event: evenement }, ({ payload }) => recus.push(payload));
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
async function diffuserRest(
	jeton: string,
	topic: string,
	texte: string,
	evenement = EVENEMENT
): Promise<number> {
	const res = await fetch(`${URL_LOCALE}/realtime/v1/api/broadcast`, {
		method: 'POST',
		headers: {
			apikey: CLE_ANON,
			Authorization: `Bearer ${jeton}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			messages: [{ topic, event: evenement, payload: { texte }, private: true }]
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

describe('Échanges : canal temps réel privé réservé aux deux élèves', { timeout: 120_000 }, () => {
	let clientA: Client;
	let clientB: Client;
	let clientC: Client;
	let clientO: Client;
	let clientProf: Client;
	let clientAdmin: Client;
	let anon: Client;
	let trade1: string;
	let trade2: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await TestData.profile().withRole('student').create();
		const b = await TestData.profile().withRole('student').create();
		const c = await TestData.profile().withRole('student').create();
		const o = await TestData.profile().withRole('student').create();
		const prof = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();

		const { data: trades, error } = await service
			.from('marketplace_trades')
			.insert([
				{ trade_type: 'friend', initiator_id: a.id, partner_id: b.id },
				{ trade_type: 'friend', initiator_id: c.id, partner_id: b.id }
			])
			.select('id');
		expect(error).toBeNull();
		[trade1, trade2] = (trades as { id: string }[]).map((r) => r.id);

		// Conversation de MÊME uuid que trade1, dont ni A ni B ne sont membres :
		// sert au test de non-croisement avec les policies `chat-*`.
		const conv = await service.from('conversations').insert({ id: trade1, is_group: false });
		expect(conv.error).toBeNull();
		const membres = await service.from('conversation_participants').insert([
			{ conversation_id: trade1, user_id: c.id },
			{ conversation_id: trade1, user_id: o.id }
		]);
		expect(membres.error).toBeNull();

		clientA = await connecter(a.email);
		clientB = await connecter(b.email);
		clientC = await connecter(c.email);
		clientO = await connecter(o.email);
		clientProf = await connecter(prof.email);
		clientAdmin = await connecter(admin.email);
		anon = createClient<Database>(URL_LOCALE, CLE_ANON, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Canal public neutre, gardé ouvert : maintient la socket de chaque client.
		for (const cl of [clientA, clientB, clientC, clientO, clientProf, clientAdmin, anon]) {
			expect((await abonner(cl.channel(TOPIC_GARDE_SOCKET))).status).toBe('SUBSCRIBED');
		}
	}, 120_000);

	// Pas `removeAllChannels` : sans canal, la socket se ferme et sa reconnexion
	// retarde l'abonnement suivant jusqu'au TIMED_OUT.
	afterEach(async () => {
		for (const cl of [clientA, clientB, clientC, clientO, clientProf, clientAdmin, anon]) {
			for (const ch of cl?.getChannels() ?? []) {
				if (!ch.topic.endsWith(TOPIC_GARDE_SOCKET)) await cl.removeChannel(ch);
			}
		}
	});

	afterAll(async () => {
		for (const cl of [clientA, clientB, clientC, clientO, clientProf, clientAdmin, anon]) {
			cl?.realtime.disconnect();
		}
		await service.from('conversation_participants').delete().eq('conversation_id', trade1);
		await service.from('conversations').delete().eq('id', trade1);
		await service.from('marketplace_trades').delete().in('id', [trade1, trade2]);
		await cleanupAllTestData();
	});

	// ===========================================================================
	// 1. Témoins : les deux élèves de l'échange (ÉCHOUENT sans la migration)
	// ===========================================================================

	it('les deux élèves de l’échange se reçoivent l’un l’autre, dans les deux sens', async () => {
		const recA = await recepteur(clientA, `trade:${trade1}`);
		expect(recA.abonnement.status, `A refusé : ${recA.abonnement.message}`).toBe('SUBSCRIBED');
		const recB = await recepteur(clientB, `trade:${trade1}`);
		expect(recB.abonnement.status, `B refusé : ${recB.abonnement.message}`).toBe('SUBSCRIBED');

		// Par la socket, chacun sur son canal abonné.
		await recA.channel.send({ type: 'broadcast', event: EVENEMENT, payload: { texte: 'de A' } });
		await recB.channel.send({ type: 'broadcast', event: EVENEMENT, payload: { texte: 'de B' } });
		await attendreReception(recB.recus);
		await attendreReception(recA.recus);
		expect(recB.recus).toEqual([{ texte: 'de A' }]);
		expect(recA.recus).toEqual([{ texte: 'de B' }]);

		// Par l'API REST : la voie utilisée ensuite pour les refus. L'API REST n'a
		// pas de `self: false` : l'émetteur reçoit aussi sa propre diffusion.
		expect(await diffuserRest(await jetonDe(clientA), `trade:${trade1}`, 'rest A')).toBe(202);
		await attendreReception(recB.recus, 2);
		expect(recB.recus).toContainEqual({ texte: 'rest A' });
		expect(await diffuserRest(await jetonDe(clientB), `trade:${trade1}`, 'rest B')).toBe(202);
		await attendreReception(recA.recus, 3);
		expect(recA.recus).toContainEqual({ texte: 'rest B' });
	});

	// ===========================================================================
	// 2-3. 3ᵉ élève, prof, admin, anon : ni écouter, ni diffuser
	// ===========================================================================

	it('un 3ᵉ élève ne peut ni s’abonner ni diffuser', async () => {
		const o = await recepteur(clientO, `trade:${trade1}`);
		expect(o.abonnement.status).toBe('CHANNEL_ERROR');

		const b = await recepteur(clientB, `trade:${trade1}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');
		await diffuserRest(await jetonDe(clientO), `trade:${trade1}`, 'usurpation');
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	it('le prof et l’admin, qui lisent pourtant la ligne de l’échange, sont refusés', async () => {
		const b = await recepteur(clientB, `trade:${trade1}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');

		for (const [nom, cl] of [
			['prof', clientProf],
			['admin', clientAdmin]
		] as const) {
			// Précondition : la RLS de la table leur laisse voir la ligne. Le refus
			// ci-dessous vient donc bien de la policy Realtime, pas de l'invisibilité.
			const { data, error } = await cl.from('marketplace_trades').select('id').eq('id', trade1);
			expect(error).toBeNull();
			expect(data, `${nom} doit voir la ligne`).toHaveLength(1);

			const x = await recepteur(cl, `trade:${trade1}`);
			expect(x.abonnement.status, nom).toBe('CHANNEL_ERROR');
			await diffuserRest(await jetonDe(cl), `trade:${trade1}`, `intrus ${nom}`);
		}
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	it('anon ne peut ni s’abonner ni diffuser', async () => {
		const x = await recepteur(anon, `trade:${trade1}`);
		expect(x.abonnement.status).toBe('CHANNEL_ERROR');

		const b = await recepteur(clientB, `trade:${trade1}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');
		await diffuserRest(CLE_ANON, `trade:${trade1}`, 'anonyme');
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	// ===========================================================================
	// 4. Un autre échange
	// ===========================================================================

	it('un élève ne peut ni écouter ni diffuser sur un échange dont il n’est pas', async () => {
		const x = await recepteur(clientA, `trade:${trade2}`);
		expect(x.abonnement.status).toBe('CHANNEL_ERROR');

		// Témoin : B, partenaire de trade2, y entre ; la diffusion de A n'y arrive pas.
		const b = await recepteur(clientB, `trade:${trade2}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');
		await diffuserRest(await jetonDe(clientA), `trade:${trade2}`, 'intrus');
		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
	});

	// ===========================================================================
	// 5. Topics mal formés
	// ===========================================================================

	it('un topic mal formé est refusé (abonnement)', async () => {
		for (const topic of [
			'trade:pas-un-uuid',
			`trade:${trade1.toUpperCase()}`,
			`xtrade:${trade1}`,
			`trade:${trade1}-suffixe`,
			`trade-${trade1}`,
			`trade:${trade1} `
		]) {
			const x = await recepteur(clientA, topic);
			expect(x.abonnement.status, topic).toBe('CHANNEL_ERROR');
		}
	});

	it('au niveau SQL, la policy refuse sans erreur un topic mal formé ou absent', async () => {
		const pg = await getPostgresClient();
		const { rows: eleve } = await pg.query<{ initiator_id: string }>(
			`select initiator_id from marketplace_trades where id = $1`,
			[trade1]
		);
		const claims = JSON.stringify({ sub: eleve[0].initiator_id, role: 'authenticated' });

		// [topic posé par Realtime, topic de la ligne, autorisé ?]
		const cas: [string | null, string, boolean][] = [
			[`trade:${trade1}`, `trade:${trade1}`, true],
			['trade:pas-un-uuid', 'trade:pas-un-uuid', false],
			['trade:', 'trade:', false],
			[null, `trade:${trade1}`, false]
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
	// 6. Présence : hors de la décision, refusée même aux deux élèves
	// ===========================================================================

	it('la présence n’est pas ouverte : B ne voit pas le track() de A', async () => {
		// Le client des échanges n'utilise pas la Presence Realtime (son événement
		// « presence » est un broadcast). Ce test prouve la clause `extension`.
		const vusParB: unknown[] = [];
		const canalB = clientB.channel(`trade:${trade1}`, {
			config: { private: true, presence: { key: 'b' } }
		});
		canalB.on('presence', { event: 'sync' }, () => {
			vusParB.push(...Object.keys(canalB.presenceState()));
		});
		const abonnementB = await abonner(canalB);
		expect(abonnementB.status, `témoin B refusé : ${abonnementB.message}`).toBe('SUBSCRIBED');

		const canalA = clientA.channel(`trade:${trade1}`, {
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
	// 7. Non-croisement avec les policies du chat (policies permissives = OU)
	// ===========================================================================

	it('les policies chat-* n’ouvrent pas trade:*, et inversement (même uuid)', async () => {
		// La conversation `trade1` a pour membres C et O, pas A ni B.
		// Témoins : O entre sur `chat-<trade1>` (policies du chat actives),
		// B entre sur `trade:<trade1>`.
		const o = await recepteur(clientO, `chat-${trade1}`, true, 'new_message');
		expect(o.abonnement.status, `témoin O refusé : ${o.abonnement.message}`).toBe('SUBSCRIBED');
		const b = await recepteur(clientB, `trade:${trade1}`);
		expect(b.abonnement.status, `témoin B refusé : ${b.abonnement.message}`).toBe('SUBSCRIBED');

		// C, membre du chat de même uuid, n'entre pas dans l'échange.
		const c = await recepteur(clientC, `trade:${trade1}`);
		expect(c.abonnement.status).toBe('CHANNEL_ERROR');
		await diffuserRest(await jetonDe(clientC), `trade:${trade1}`, 'chat→trade');

		// A, élève de l'échange, n'entre pas dans le chat de même uuid.
		const a = await recepteur(clientA, `chat-${trade1}`, true, 'new_message');
		expect(a.abonnement.status).toBe('CHANNEL_ERROR');
		await diffuserRest(await jetonDe(clientA), `chat-${trade1}`, 'trade→chat', 'new_message');

		await attendre(ATTENTE_MS);
		expect(b.recus).toEqual([]);
		expect(o.recus).toEqual([]);
	});

	// ===========================================================================
	// 8. Non-régression : le canal PUBLIC actuel (avant la PR 2)
	// ===========================================================================

	it('le canal public actuel des échanges fonctionne toujours', async () => {
		const b = await recepteur(clientB, `trade:${trade1}`, false);
		expect(b.abonnement.status).toBe('SUBSCRIBED');

		const canalA = clientA.channel(`trade:${trade1}`, { config: { broadcast: { self: false } } });
		expect((await abonner(canalA)).status).toBe('SUBSCRIBED');
		await canalA.send({ type: 'broadcast', event: EVENEMENT, payload: { texte: 'public' } });
		await attendreReception(b.recus);
		expect(b.recus).toEqual([{ texte: 'public' }]);
	});
});
