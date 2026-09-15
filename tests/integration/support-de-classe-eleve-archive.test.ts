/**
 * Le support de classe se ferme, la trace de l'élève reste (base locale requise)
 * =============================================================================
 *
 * Dix-neuf policies « élève » testaient l'EXISTENCE d'une adhésion sans
 * regarder son statut. Depuis l'archivage (2026-09-13), un ancien élève lisait
 * donc encore ce que la classe porte : emploi du temps, cahier de texte,
 * documents, évaluations affectées, énigmes.
 *
 * Tranché par David le 2026-09-15 : **couper le support de classe, garder leurs
 * traces.** C'est le principe déjà retenu le 2026-09-12 pour les signalements
 * d'erreur — la fiche appartient à la classe, le signalement appartient à
 * l'élève.
 *
 * Ce fichier garde les DEUX moitiés. La seconde compte autant que la première :
 * une migration qui ferme trop emporterait le travail de 77 mineurs.
 *
 * ⚠️ Le témoin actif est indispensable : sans lui, un tableau vide côté archivé
 * prouverait seulement que le décor n'a pas été posé.
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

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Client service-role : pose le décor uniquement. */
const service = createServiceRoleClient();

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

describe('le support de classe et l’élève archivé', () => {
	let classId: string;
	let assessmentId: string;
	let riddleId: string;
	let actif: SupabaseClient<Database>;
	let archive: SupabaseClient<Database>;
	let archiveId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = await TestData.class().withName('4e C support ZZ').create();
		classId = klass.id;

		const membre = async (status: string) => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: profil.id, status });
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return { id: profil.id, client: await clientFor(profil.email) };
		};

		const a = await membre('active');
		actif = a.client;
		const b = await membre('archived');
		archiveId = b.id;
		archive = b.client;

		// Emploi du temps
		const { error: horaireError } = await service.from('class_schedules').insert({
			class_id: classId,
			day_of_week: 2,
			start_time: '08:00:00',
			end_time: '09:00:00'
		});
		expect(horaireError, 'le décor n’a pas pu être posé').toBeNull();

		// Cahier de texte, publié et daté d'hier
		const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
		const { error: journalError } = await service
			.from('class_journal_entries')
			.insert({ class_id: classId, entry_date: hier, is_published: true });
		expect(journalError, 'le décor n’a pas pu être posé').toBeNull();

		// Évaluation publiée, affectée À LA CLASSE
		const { data: assessment, error: assessmentError } = await service
			.from('assessments')
			.insert({
				title: 'Contrôle support ZZ',
				grade: '4',
				status: 'published',
				categories: [],
				settings: {},
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(assessmentError, 'le décor n’a pas pu être posé').toBeNull();
		assessmentId = assessment!.id;

		const { error: affectationError } = await service
			.from('assessment_assignments')
			.insert({ assessment_id: assessmentId, assigned_by: teacher.id, class_id: classId });
		expect(affectationError, 'le décor n’a pas pu être posé').toBeNull();

		// Énigme affectée à la classe
		const { data: riddle, error: riddleError } = await service
			.from('riddles')
			.insert({
				title: 'Énigme support ZZ',
				difficulty: 1,
				statement: 'Combien font deux et deux ?',
				correction: 'Quatre.',
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(riddleError, 'le décor n’a pas pu être posé').toBeNull();
		riddleId = riddle!.id;

		const { error: riddleAssignError } = await service
			.from('riddle_assignments')
			.insert({ riddle_id: riddleId, assigned_by: teacher.id, class_id: classId });
		expect(riddleAssignError, 'le décor n’a pas pu être posé').toBeNull();

		// LA TRACE : l'élève archivé a répondu, du temps où il était inscrit.
		const { error: attemptError } = await service.from('riddle_attempts').insert({
			riddle_id: riddleId,
			student_id: archiveId,
			attempt_number: 1,
			submitted_answer: { value: 'quatre' }
		});
		expect(attemptError, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function compte(
		client: SupabaseClient<Database>,
		table: 'class_schedules' | 'class_journal_entries' | 'assessment_assignments'
	): Promise<number> {
		const { data, error } = await client.from(table).select('id').eq('class_id', classId);
		expect(error, `lecture de ${table} en panne`).toBeNull();
		return (data ?? []).length;
	}

	describe('le témoin — l’élève actif voit tout', () => {
		it('l’emploi du temps', async () => {
			expect(await compte(actif, 'class_schedules')).toBe(1);
		});

		it('le cahier de texte', async () => {
			expect(await compte(actif, 'class_journal_entries')).toBe(1);
		});

		it('l’affectation de l’évaluation, et l’évaluation elle-même', async () => {
			expect(await compte(actif, 'assessment_assignments')).toBe(1);

			const { data } = await actif.from('assessments').select('id').eq('id', assessmentId);
			expect(data, 'student_has_assignment_for_assessment refuse l’élève actif').toHaveLength(1);
		});

		it('l’énigme affectée à sa classe', async () => {
			const { data } = await actif
				.from('riddle_assignments')
				.select('id')
				.eq('riddle_id', riddleId);
			expect(data).toHaveLength(1);
		});
	});

	describe('l’élève archivé ne voit plus le support de la classe', () => {
		it('plus l’emploi du temps', async () => {
			expect(await compte(archive, 'class_schedules')).toBe(0);
		});

		it('plus le cahier de texte', async () => {
			expect(await compte(archive, 'class_journal_entries')).toBe(0);
		});

		it('plus l’affectation, ni l’évaluation qu’elle désigne', async () => {
			expect(await compte(archive, 'assessment_assignments')).toBe(0);

			const { data } = await archive.from('assessments').select('id').eq('id', assessmentId);
			expect(data, 'l’évaluation de la classe quittée reste lisible').toEqual([]);
		});

		it('plus l’énigme de la classe quittée', async () => {
			const { data } = await archive
				.from('riddle_assignments')
				.select('id')
				.eq('riddle_id', riddleId);
			expect(data).toEqual([]);
		});
	});

	/**
	 * ⚠️ L'AUTRE MOITIÉ de la décision. Fermer le support ne doit pas emporter
	 * le travail de l'élève : sa réponse est à lui, pas à la classe.
	 */
	it('mais il garde SA réponse à l’énigme', async () => {
		const { data, error } = await archive
			.from('riddle_attempts')
			.select('id, submitted_answer')
			.eq('student_id', archiveId);

		expect(error).toBeNull();
		expect(data, 'la fermeture du support a emporté la trace de l’élève').toHaveLength(1);
	});
});
