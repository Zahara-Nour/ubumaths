/**
 * Liens courts des QR codes (nécessite une base locale)
 * =====================================================
 *
 * Migration : 20261019170000_liens_courts.sql
 * Phase 0 : docs/wip/liens-courts-phase0.md (tranchée par David le 2026-10-19).
 *
 * Un lien court `/l/<code>` redirige vers une adresse interne du site. Ce qui
 * compte, c'est ce que la table N'OUVRE PAS :
 *
 *  - seul un prof ou l'admin crée un lien (ni élève, ni anonyme) ;
 *  - la cible est un chemin INTERNE : jamais un autre domaine (redirection
 *    ouverte), jamais `//` ni `\` que les navigateurs lisent comme un domaine ;
 *  - celui qui a le code lit la cible, et rien d'autre : personne ne liste la
 *    table, pas même un prof ;
 *  - une même cible rend toujours le même code.
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

// Types

/** Accès non typé : la table et les RPC ne sont pas encore dans les types générés. */
type Loose = {
	from: (t: string) => {
		select: (c: string) => {
			limit: (n: number) => PromiseLike<{
				data: Record<string, unknown>[] | null;
				error: { code?: string; message: string } | null;
			}>;
			eq: (
				c: string,
				v: string
			) => PromiseLike<{
				data: Record<string, unknown>[] | null;
				error: { code?: string; message: string } | null;
			}>;
		};
		delete: () => {
			in: (c: string, v: string[]) => PromiseLike<{ error: unknown }>;
		};
	};
	rpc: (
		fn: string,
		args: Record<string, unknown>
	) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
};

// Constantes

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** 8 caractères, sans les ambigus 0 O o 1 l I */
const CODE_SHAPE = /^[a-km-np-zA-HJ-NP-Z2-9]{8}$/;

const SERIES_TARGET =
	'/automaths/test?categories=%255B%257B%2522category%2522%253A%257B%7D%257D%255D&mode=course&time=300';
const OTHER_TARGET = '/automaths/panier?categories=%255B%255D';

/** Cibles qui doivent toutes être refusées sans rien enregistrer */
const REFUSED_TARGETS = [
	'https://piege.example/chiph.re',
	'//piege.example/chemin',
	'/\\piege.example',
	'/a\\b',
	'javascript:alert(1)',
	'automaths/panier',
	'/a b',
	'/a\nb',
	'',
	'/' + 'a'.repeat(16_384)
];

// Variables

const loose = (client: unknown) => client as unknown as Loose;

// Functions

/** Un client anon sans session : celui qui scanne un QR sans être connecté. */
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

describe('liens courts des QR codes', () => {
	const service = createServiceRoleClient();
	let teacherId: string;
	let teacher: SupabaseClient<Database>;
	let student: SupabaseClient<Database>;

	async function targetsInTable(): Promise<string[]> {
		const { data, error } = await loose(service).from('short_links').select('target').limit(1000);
		expect(error).toBeNull();
		return (data ?? []).map((row) => String(row.target));
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacherProfile = await TestData.profile().withRole('teacher').create();
		teacherId = teacherProfile.id;
		teacher = await clientFor(teacherProfile.email);
		const studentProfile = await TestData.profile().withRole('student').create();
		student = await clientFor(studentProfile.email);
	});

	afterAll(async () => {
		await loose(service).from('short_links').delete().in('target', [SERIES_TARGET, OTHER_TARGET]);
		await cleanupAllTestData();
	});

	describe('création', () => {
		it('un prof crée un code de 8 caractères sans ambigus, et sa ligne garde son auteur', async () => {
			const { data, error } = await loose(teacher).rpc('create_short_link', {
				p_target: SERIES_TARGET
			});
			expect(error).toBeNull();
			expect(typeof data).toBe('string');
			expect(data).toMatch(CODE_SHAPE);

			const { data: rows } = await loose(service)
				.from('short_links')
				.select('code, target, created_by')
				.eq('code', String(data));
			expect(rows).toEqual([{ code: data, target: SERIES_TARGET, created_by: teacherId }]);
		});

		it('la même cible rend le même code, une autre cible un autre code', async () => {
			const first = await loose(teacher).rpc('create_short_link', { p_target: SERIES_TARGET });
			const again = await loose(teacher).rpc('create_short_link', { p_target: SERIES_TARGET });
			const other = await loose(teacher).rpc('create_short_link', { p_target: OTHER_TARGET });
			expect(first.data).toMatch(CODE_SHAPE);
			expect(again.data).toBe(first.data);
			expect(other.data).toMatch(CODE_SHAPE);
			expect(other.data).not.toBe(first.data);

			const targets = await targetsInTable();
			expect(targets.filter((t) => t === SERIES_TARGET)).toHaveLength(1);
		});

		it('un élève ne crée rien (42501)', async () => {
			const target = '/glossaire?eleve=1';
			const { data, error } = await loose(student).rpc('create_short_link', { p_target: target });
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
			expect(await targetsInTable()).not.toContain(target);
		});

		it('un anonyme ne peut pas appeler la création', async () => {
			const target = '/glossaire?anonyme=1';
			const { data, error } = await loose(anonClient()).rpc('create_short_link', {
				p_target: target
			});
			expect(data).toBeNull();
			expect(error).not.toBeNull();
			expect(await targetsInTable()).not.toContain(target);
		});

		it.each(REFUSED_TARGETS.map((t) => [JSON.stringify(t).slice(0, 40), t]))(
			'cible refusée (%s), rien enregistré',
			async (_label, target) => {
				const { data, error } = await loose(teacher).rpc('create_short_link', {
					p_target: target
				});
				expect(data).toBeNull();
				expect(error?.code).toBe('22023');
				expect(await targetsInTable()).not.toContain(target);
			}
		);
	});

	describe('lecture', () => {
		let code: string;

		beforeAll(async () => {
			const { data } = await loose(teacher).rpc('create_short_link', { p_target: SERIES_TARGET });
			code = String(data);
		});

		it('un anonyme qui a le code lit la cible', async () => {
			const { data, error } = await loose(anonClient()).rpc('resolve_short_link', {
				p_code: code
			});
			expect(error).toBeNull();
			expect(data).toBe(SERIES_TARGET);
		});

		it('un code inconnu ou mal formé rend null, sans erreur qui les distingue', async () => {
			for (const unknown of ['ZZZZZZZZ', code.slice(0, 7), code + 'a', '', "x' or '1'='1"]) {
				const { data, error } = await loose(anonClient()).rpc('resolve_short_link', {
					p_code: unknown
				});
				expect(error).toBeNull();
				expect(data).toBeNull();
			}
		});

		it.each([
			['anonyme', () => anonClient()],
			['élève', () => student],
			['prof', () => teacher]
		])('%s ne liste pas la table (42501)', async (_who, client) => {
			const { data, error } = await loose(client()).from('short_links').select('*').limit(10);
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});
	});
});
