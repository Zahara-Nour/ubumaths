/**
 * Palotin : question longtemps ratée enfin réussie, sur la base locale
 * (chantier `regularite`, PR B3)
 * ====================================================================
 *
 * `loadLongStruggleWon` lit les vraies traces avec le client de l'ÉLÈVE (RLS) :
 *   1. 3 échecs depuis 8 jours, réussite dans la série → fêtée ;
 *   2. échecs déclarés (`student_self`, révision) : ne comptent pas ;
 *   3. contrôles ratés (`place = evaluation`) : comptent ;
 *   4. traces d'un autre élève : jamais lues (filtre + RLS).
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
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';
import { loadLongStruggleWon } from '$lib/server/buddy-struggle';
import type { Database } from '$lib/types/database';

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DAY_MS = 24 * 3600 * 1000;
const NOW = Date.now();
/** Début de la série : il y a 10 minutes */
const SERIE = new Date(NOW - 10 * 60 * 1000);
const service = createServiceRoleClient();

// Variables
let teacherId: string;

// Functions
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

async function newStudent(): Promise<{ id: string; client: SupabaseClient<Database> }> {
	const student = await TestData.profile().withRole('student').create();
	return { id: student.id, client: await clientFor(student.email!) };
}

interface Trace {
	daysAgo: number;
	success: boolean;
	source?: string;
	place?: string;
}

async function addTraces(studentId: string, templateId: string, traces: Trace[]) {
	const rows = traces.map((t) => ({
		student_id: studentId,
		template_id: templateId,
		success: t.success,
		source: t.source ?? 'auto',
		place: t.place ?? 'typing',
		created_at: new Date(NOW - t.daysAgo * DAY_MS).toISOString()
	}));
	const { error } = await service.from('skill_attempts').insert(rows);
	if (error) throw new Error(error.message);
}

/** 3 échecs (il y a 8, 5 et 2 jours) puis la réussite de la série */
const LONG_STRUGGLE: Trace[] = [
	{ daysAgo: 8, success: false },
	{ daysAgo: 5, success: false },
	{ daysAgo: 2, success: false },
	{ daysAgo: 1 / (24 * 60), success: true }
];

// Tests
describe('Palotin : question longtemps ratée enfin réussie (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('3 échecs depuis 8 jours, réussite dans la série : fêtée, lue par le client de l’élève', async () => {
		const student = await newStudent();
		const templateId = await createFakeTemplate(service, teacherId);
		await addTraces(student.id, templateId, LONG_STRUGGLE);

		expect(await loadLongStruggleWon(student.client, student.id, [templateId], SERIE)).toBe(true);
	});

	it('échecs déclarés (révision, flash-cards) : ne comptent pas', async () => {
		const student = await newStudent();
		const templateId = await createFakeTemplate(service, teacherId);
		await addTraces(
			student.id,
			templateId,
			LONG_STRUGGLE.map((t) => (t.success ? t : { ...t, source: 'student_self', place: 'review' }))
		);

		expect(await loadLongStruggleWon(student.client, student.id, [templateId], SERIE)).toBe(false);
	});

	it('contrôles ratés : comptent parmi les échecs', async () => {
		const student = await newStudent();
		const templateId = await createFakeTemplate(service, teacherId);
		await addTraces(
			student.id,
			templateId,
			LONG_STRUGGLE.map((t) => (t.success ? t : { ...t, place: 'evaluation' }))
		);

		expect(await loadLongStruggleWon(student.client, student.id, [templateId], SERIE)).toBe(true);
	});

	it('traces d’un autre élève : jamais lues, même en demandant son id', async () => {
		const other = await newStudent();
		const student = await newStudent();
		const templateId = await createFakeTemplate(service, teacherId);
		await addTraces(other.id, templateId, LONG_STRUGGLE);

		// Son propre id : aucune trace à lui
		expect(await loadLongStruggleWon(student.client, student.id, [templateId], SERIE)).toBe(false);
		// L'id de l'autre avec son propre client : la RLS cache tout
		expect(await loadLongStruggleWon(student.client, other.id, [templateId], SERIE)).toBe(false);
	});
});
