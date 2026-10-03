/**
 * RPC urgente : classes du prof (base locale requise)
 * ============================================================================
 *
 * Migration 20261003120000_rpc_urgent_classes_eleves.
 *
 * Q139 — `get_teacher_classes_with_students` (SECURITY DEFINER) ne contrôlait
 * pas l'appelant : un élève lisait toutes les classes, codes d'accès,
 * gidouilles et cartes de tous les élèves compris.
 *
 * Appels faits avec de vrais clients authentifiés (`auth.uid()` réel).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

type Client = SupabaseClient<Database>;

describe('RPC urgente — classes du prof réservées au prof', () => {
	let classId: string;
	let teacher: Client;
	let eleve: Client;

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();
		teacher = await createAuthenticatedClient(prof.email);

		const cls = await TestData.class().withName('Classe RPC urgent').create();
		classId = cls.id;

		const curieux = await TestData.profile().withRole('student').create();
		eleve = await createAuthenticatedClient(curieux.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('(a) un élève ne lit plus les classes du prof : 42501', async () => {
		const { data, error } = await eleve.rpc('get_teacher_classes_with_students', {
			p_is_test_mode: false
		});
		expect(data ?? [], 'l’élève a reçu des classes').toEqual([]);
		expect(error?.code).toBe('42501');
	});

	it('(b) témoin : le prof reçoit ses classes', async () => {
		const { data, error } = await teacher.rpc('get_teacher_classes_with_students', {
			p_is_test_mode: false
		});
		expect(error).toBeNull();
		expect((data ?? []).map((c) => c.id)).toContain(classId);
	});
});
