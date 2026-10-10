/**
 * Inscription sans code de classe : en attente (constat B7)
 * ==========================================================
 *
 * `handle_new_user` approuvait d'office un compte créé sans code de classe ni
 * pré-inscription (signUp GoTrue direct, hors des limites de débit de l'app, ou première
 * connexion Google), sauf adresse @voltairedoha.com.
 *
 * Décision de David (2026-10-10) : un tel compte est « en attente » — le prof approuve.
 *
 * Ce que le fichier prouve :
 *   1. compte sans métadonnée, adresse quelconque → en attente ;
 *   2. compte avec un simple `class_id` (sans code) → en attente ;
 *   3. non-régression : code de classe valide → approuvé et inscrit ;
 *   4. non-régression : élève pré-inscrit par le prof (`pending_students`) → approuvé.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// HELPERS
// ============================================================================

const service = createServiceRoleClient();
const creees: string[] = [];

async function creer(email: string, metadonnees: Record<string, unknown> = {}): Promise<string> {
	const { data, error } = await service.auth.admin.createUser({
		email,
		password: 'password123',
		email_confirm: true,
		user_metadata: metadonnees
	});
	if (error || !data.user) throw new Error(`createUser : ${error?.message}`);
	creees.push(data.user.id);
	return data.user.id;
}

async function statut(id: string): Promise<string | null> {
	const { data } = await service.from('profiles').select('status').eq('id', id).maybeSingle();
	return data?.status ?? null;
}

async function classeOuverte(svc: SupabaseClient<Database>) {
	const { data: school } = await svc
		.from('schools')
		.insert({ name: `zz-B7 ${crypto.randomUUID()}`, city: 'zz', country: 'zz' })
		.select('id')
		.single();
	const { data: cls, error } = await svc
		.from('classes')
		.insert({
			name: 'zz-B7',
			join_code: `B7${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
			is_active: true,
			registration_open: true,
			school_id: school!.id,
			grade: '6'
		} as Database['public']['Tables']['classes']['Insert'])
		.select('id, join_code, school_id')
		.single();
	if (error) throw new Error(`classe : ${error.message}`);
	return cls!;
}

// ============================================================================
// TESTS
// ============================================================================

describe('inscription sans code de classe : en attente', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		// L'insertion d'une classe crée sa conversation, qui exige le prof.
		await TestData.profile().withRole('teacher').create();
	});

	afterAll(async () => {
		for (const id of creees) await service.auth.admin.deleteUser(id);
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query(`delete from schools where name like 'zz-B7 %'`);
	});

	it('compte sans métadonnée, adresse quelconque : en attente', async () => {
		const id = await creer(`zz-b7-${crypto.randomUUID()}@gmail.test`);
		expect(await statut(id)).toBe('pending');
	});

	it('compte avec un simple class_id, sans code : en attente', async () => {
		const cls = await classeOuverte(service);
		const id = await creer(`zz-b7-${crypto.randomUUID()}@gmail.test`, { class_id: cls.id });
		expect(await statut(id)).toBe('pending');
	});

	it('code de classe valide : approuvé (non-régression)', async () => {
		const cls = await classeOuverte(service);
		const id = await creer(`zz-b7-${crypto.randomUUID()}@gmail.test`, {
			class_code: cls.join_code,
			firstname: 'zz',
			lastname: 'zz'
		});
		expect(await statut(id)).toBe('approved');
	});

	it('élève pré-inscrit par le prof : approuvé (non-régression)', async () => {
		const email = `zz-b7-pre-${crypto.randomUUID()}@gmail.test`;
		const pg = await getPostgresClient();
		await pg.query(
			`insert into pending_students (email, firstname, lastname) values ($1, 'zz', 'zz')`,
			[email]
		);
		const id = await creer(email);
		expect(await statut(id)).toBe('approved');
	});
});
