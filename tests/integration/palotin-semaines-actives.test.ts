/**
 * Palotin : semaine qui devient active, sur la base locale (chantier
 * `regularite`, PR B2)
 * ==================================================================
 *
 * `loadWeekMoment` lit les vraies traces, classes, rentrée et vacances ;
 * `markWeekCelebrated` écrit `student_last_visits.week_celebrated_on`.
 *   1. aujourd'hui sans jour actif (4 traces) → rien ;
 *   2. 5 traces aujourd'hui → 1re activité de la semaine ; une fois fêtée, plus rien ;
 *   3. 3 semaines actives, dont une de vacances sautée → palier 3 ;
 *   4. sans les vacances, la semaine vide coupe le compte → 1re activité ;
 *   5. traces de contrôle : ne comptent pas.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';

// Lectures et écriture du module au client service : le brancher sur la base LOCALE
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { loadWeekMoment, markWeekCelebrated } from '$lib/server/buddy-weeks';
import { schoolDay } from '$lib/server/course-card-attempts';

// Constantes
const DAY_MS = 24 * 3600 * 1000;
const NOW = new Date();
const service = createServiceRoleClient();

// Variables
let templateId: string;
let schoolId: string;
let yearId: string;
let classId: string;

// Functions
function daysAgo(n: number): Date {
	return new Date(NOW.getTime() - n * DAY_MS);
}

function day(date: Date): string {
	return schoolDay(date);
}

async function newStudent(): Promise<string> {
	const student = await TestData.profile().withRole('student').create();
	const { error: visitError } = await service.rpc('record_student_visit', {
		p_student_id: student.id,
		p_today: day(NOW)
	});
	if (visitError) throw new Error(visitError.message);
	const { error } = await service
		.from('class_members')
		.insert({ class_id: classId, student_id: student.id, status: 'active' });
	if (error) throw new Error(error.message);
	return student.id;
}

/** `count` traces au même instant ; lieu `evaluation` = contrôle */
async function addTraces(studentId: string, at: Date, count: number, place = 'typing') {
	const rows = Array.from({ length: count }, () => ({
		student_id: studentId,
		template_id: templateId,
		success: true,
		source: 'auto',
		place,
		created_at: at.toISOString()
	}));
	const { error } = await service.from('skill_attempts').insert(rows);
	if (error) throw new Error(error.message);
}

async function setHoliday(start: Date, end: Date | null) {
	await service.from('school_holidays').delete().eq('school_year_id', yearId);
	if (!end) return;
	const { error } = await service.from('school_holidays').insert({
		school_year_id: yearId,
		name: 'Vacances de test',
		start_date: day(start),
		end_date: day(end)
	});
	if (error) throw new Error(error.message);
}

// Tests
describe('Palotin : semaine qui devient active (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		templateId = await createFakeTemplate(service, teacher.id);

		const { data: school, error: schoolError } = await service
			.from('schools')
			.insert({ name: 'École de test semaines', city: 'Testville', country: 'FR' })
			.select('id')
			.single();
		if (schoolError) throw new Error(schoolError.message);
		schoolId = school.id;

		const { data: year, error: yearError } = await service
			.from('school_years')
			.insert({
				school_id: schoolId,
				name: 'Année de test',
				start_date: day(daysAgo(60)),
				end_date: day(daysAgo(-300)),
				is_active: true
			})
			.select('id')
			.single();
		if (yearError) throw new Error(yearError.message);
		yearId = year.id;

		const klass = await TestData.class().create();
		classId = klass.id;
		const { error } = await service
			.from('classes')
			.update({ school_id: schoolId })
			.eq('id', classId);
		if (error) throw new Error(error.message);
	});

	afterAll(async () => {
		await service.from('school_holidays').delete().eq('school_year_id', yearId);
		await service.from('school_years').delete().eq('id', yearId);
		await service.from('class_members').delete().eq('class_id', classId);
		await service.from('classes').delete().eq('id', classId);
		await service.from('schools').delete().eq('id', schoolId);
		await service.from('skill_attempts').delete().eq('template_id', templateId);
		await service.from('question_templates').delete().eq('id', templateId);
		await cleanupAllTestData();
	});

	it('4 traces aujourd’hui : pas de jour actif, rien à fêter', async () => {
		const student = await newStudent();
		await addTraces(student, NOW, 4);
		expect(await loadWeekMoment(student, NOW)).toBeNull();
	});

	it('5 traces aujourd’hui : 1re activité de la semaine ; une fois fêtée, plus rien', async () => {
		const student = await newStudent();
		await addTraces(student, NOW, 5);
		expect(await loadWeekMoment(student, NOW)).toBe('week_first_activity');

		expect(await markWeekCelebrated(student, NOW)).toBe(true);
		expect(await loadWeekMoment(student, NOW)).toBeNull();
	});

	it('semaines -3, -2 et en cours actives, -1 en vacances sans activité : palier 3', async () => {
		const student = await newStudent();
		await addTraces(student, NOW, 5);
		await addTraces(student, daysAgo(14), 5);
		await addTraces(student, daysAgo(21), 5);
		await setHoliday(daysAgo(7), daysAgo(6));
		try {
			expect(await loadWeekMoment(student, NOW)).toBe('active_weeks_3');
		} finally {
			await setHoliday(NOW, null);
		}
	});

	it('même décor sans vacances : la semaine vide coupe le compte', async () => {
		const student = await newStudent();
		await addTraces(student, NOW, 5);
		await addTraces(student, daysAgo(14), 5);
		await addTraces(student, daysAgo(21), 5);
		expect(await loadWeekMoment(student, NOW)).toBe('week_first_activity');
	});

	it('traces de contrôle : ne font pas un jour actif', async () => {
		const student = await newStudent();
		await addTraces(student, NOW, 5, 'evaluation');
		expect(await loadWeekMoment(student, NOW)).toBeNull();
	});
});
