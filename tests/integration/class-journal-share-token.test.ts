/**
 * Cahier de texte partageable par lien (nécessite une base locale)
 * ================================================================
 *
 * Migration : 20260908150000_class_journal_share_tokens.sql
 *
 * Le lien rend un cahier lisible SANS COMPTE. Ces tests portent donc moins sur
 * « est-ce que ça marche » que sur « qu'est-ce que ça n'ouvre pas » :
 *
 *  - un token valide donne les entrées publiées, et RIEN d'autre — ni brouillon,
 *    ni séance future, ni élève, ni le `join_code` de la classe ;
 *  - un token révoqué, expiré ou inexistant renvoient tous la MÊME réponse, pour
 *    ne pas confirmer qu'un token a existé ;
 *  - `anon` ne peut pas lire la table des tokens, sans quoi il obtiendrait la
 *    liste des liens vivants (c'est l'erreur corrigée par le finding H8 sur les
 *    exercices).
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Un client anon sans session — exactement ce dont dispose un parent avec le lien. */
function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

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

const VALID_TOKEN = 'AbCdEfGhJkLmNpQr';
const REVOKED_TOKEN = 'ZzYyXxWwVvUuTtSs';
const EXPIRED_TOKEN = 'MmNnBbVvCcXxZzAa';

const PUBLISHED_ID = 'ca41e400-0000-4000-8000-00000000c001';
const DRAFT_ID = 'ca41e400-0000-4000-8000-00000000c002';
const FUTURE_ID = 'ca41e400-0000-4000-8000-00000000c003';

/** Accès non typé : la table et la RPC ne sont pas encore dans les types générés. */
type Loose = {
	from: (t: string) => {
		insert: (rows: unknown) => PromiseLike<{ error: { message: string } | null }>;
		delete: () => {
			in: (c: string, v: string[]) => PromiseLike<{ error: unknown }>;
			eq: (c: string, v: string) => PromiseLike<{ error: unknown }>;
		};
		select: (c: string) => {
			limit: (n: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
		};
		update: (row: Record<string, unknown>) => {
			eq: (c: string, v: string) => PromiseLike<{ error: unknown }>;
		};
	};
	rpc: (
		fn: string,
		args: Record<string, unknown>
	) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const loose = (client: unknown) => client as unknown as Loose;

interface JournalPayload {
	class_name: string;
	class_grade: string | null;
	entries: { id: string; entry_date: string; homework_content: string | null }[];
}

describe('cahier de texte partageable par lien', () => {
	const service = createServiceRoleClient();
	let classId: string;
	let teacher: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		teacher = await clientFor(teacherProfile.email);

		const klass = await TestData.class().withName('6e Partage ZZ').create();
		classId = klass.id;

		const today = new Date();
		const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
		// Dates distinctes : `unique_class_entry_date` impose une entrée par classe
		// et par jour. Deux fixtures à la même date feraient échouer le setup pour
		// une raison sans rapport avec ce qu'on teste.
		const twoDaysAgo = new Date(today.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
		const nextWeek = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

		const { error: entryError } = await loose(service)
			.from('class_journal_entries')
			.insert([
				{
					id: PUBLISHED_ID,
					class_id: classId,
					entry_date: yesterday,
					lesson_content: 'Les fractions équivalentes',
					homework_content: 'Exercices 12 à 15',
					is_published: true
				},
				{
					id: DRAFT_ID,
					class_id: classId,
					entry_date: twoDaysAgo,
					lesson_content: 'Brouillon non publié',
					is_published: false
				},
				{
					id: FUTURE_ID,
					class_id: classId,
					entry_date: nextWeek,
					lesson_content: 'Contrôle surprise',
					is_published: true
				}
			]);
		expect(entryError).toBeNull();

		const { error: tokenError } = await loose(service)
			.from('class_journal_share_tokens')
			.insert([
				{ class_id: classId, token: VALID_TOKEN, is_active: true },
				{ class_id: classId, token: REVOKED_TOKEN, is_active: false },
				{
					class_id: classId,
					token: EXPIRED_TOKEN,
					is_active: false,
					expires_at: new Date(today.getTime() - 86_400_000).toISOString()
				}
			]);
		expect(tokenError).toBeNull();
	});

	afterAll(async () => {
		await loose(service)
			.from('class_journal_share_tokens')
			.delete()
			.in('token', [VALID_TOKEN, REVOKED_TOKEN, EXPIRED_TOKEN]);
		await loose(service)
			.from('class_journal_entries')
			.delete()
			.in('id', [PUBLISHED_ID, DRAFT_ID, FUTURE_ID]);
		await cleanupAllTestData();
	});

	// ========================================================================
	// Ce que le lien donne
	// ========================================================================

	it('un visiteur SANS COMPTE lit le cahier avec le bon token', async () => {
		const { data, error } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: VALID_TOKEN
		});

		expect(error).toBeNull();
		const payload = data as JournalPayload;
		expect(payload.class_name).toBe('6e Partage ZZ');
		expect(payload.entries).toHaveLength(1);
		expect(payload.entries[0].id).toBe(PUBLISHED_ID);
		expect(payload.entries[0].homework_content).toBe('Exercices 12 à 15');
	});

	// ========================================================================
	// Ce que le lien n'ouvre PAS
	// ========================================================================

	it('ne montre pas les brouillons', async () => {
		const { data } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: VALID_TOKEN
		});

		const ids = (data as JournalPayload).entries.map((e) => e.id);
		expect(ids).not.toContain(DRAFT_ID);
	});

	it('ne montre pas une séance future, même publiée', async () => {
		// Publier à l'avance ne doit pas révéler le programme du prochain contrôle.
		const { data } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: VALID_TOKEN
		});

		const ids = (data as JournalPayload).entries.map((e) => e.id);
		expect(ids).not.toContain(FUTURE_ID);
	});

	it("ne fuite pas le join_code de la classe, qui lui INSCRIRAIT l'élève", async () => {
		const { data } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: VALID_TOKEN
		});

		expect(JSON.stringify(data)).not.toMatch(/join_code/i);
		expect(Object.keys(data as object).sort()).toEqual(['class_grade', 'class_name', 'entries']);
	});

	it('anon ne peut pas lister les tokens vivants', async () => {
		// Sans ça, un visiteur obtiendrait tous les liens de toutes les classes —
		// l'erreur exacte corrigée par le finding H8 sur les exercices.
		const { data, error } = await loose(anonClient())
			.from('class_journal_share_tokens')
			.select('token')
			.limit(5);

		expect(data ?? []).toEqual([]);
		expect(error).not.toBeNull();
	});

	it('anon ne peut pas lire les entrées directement', async () => {
		const { data } = await loose(anonClient()).from('class_journal_entries').select('id').limit(5);

		expect(data ?? []).toEqual([]);
	});

	// ========================================================================
	// Les tokens qui ne valent rien
	// ========================================================================

	it('révoqué, expiré et inexistant donnent la MÊME réponse', async () => {
		// Distinguer les cas confirmerait qu'un token a existé.
		const client = loose(anonClient());
		const results = await Promise.all(
			[REVOKED_TOKEN, EXPIRED_TOKEN, 'QqQqQqQqQqQqQqQq'].map((p_token) =>
				client.rpc('get_class_journal_by_share_token', { p_token })
			)
		);

		for (const { data, error } of results) {
			expect(error).toBeNull();
			expect(data).toBeNull();
		}
	});

	it('refuse un token de forme aberrante sans interroger la base', async () => {
		const client = loose(anonClient());

		for (const p_token of ['', 'court', 'x'.repeat(200)]) {
			const { data, error } = await client.rpc('get_class_journal_by_share_token', { p_token });
			expect(error).toBeNull();
			expect(data).toBeNull();
		}
	});

	// ========================================================================
	// Côté prof
	// ========================================================================

	it('le prof gère les tokens de sa classe', async () => {
		const { data, error } = await loose(teacher)
			.from('class_journal_share_tokens')
			.select('token')
			.limit(10);

		expect(error).toBeNull();
		expect((data ?? []).length).toBeGreaterThan(0);
	});

	it("une classe archivée n'est plus lisible, même avec un jeton valide", async () => {
		// Archiver une classe doit valoir révocation : sans ça le cahier de l'an
		// dernier resterait ouvert jusqu'à l'expiration du jeton.
		await loose(service).from('classes').update({ is_active: false }).eq('id', classId);

		const { data, error } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: VALID_TOKEN
		});

		expect(error).toBeNull();
		expect(data).toBeNull();

		await loose(service).from('classes').update({ is_active: true }).eq('id', classId);
	});

	it('un seul lien ACTIF par classe : un second insert actif est refusé', async () => {
		const { error } = await loose(service).from('class_journal_share_tokens').insert({
			class_id: classId,
			token: 'DdEeFfGgHhJjKkLl',
			is_active: true
		});

		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/duplicate key|unique/i);
	});
});
