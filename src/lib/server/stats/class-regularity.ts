/**
 * Grille de régularité d'une classe (chantier `regularite`, besoin P5) :
 * élève × semaine (lundi → dimanche, heure de Paris), de la rentrée à la
 * semaine en cours. Une case dit un PALIER de jours actifs (0, 1, 2-3, 4+),
 * jamais le nombre exact ni lesquels : le serveur n'envoie que le palier.
 *
 * Jour actif = au moins 5 traces de travail autonome le même jour de Paris.
 * Travail autonome = traces écrites par l'élève (sources auto/srs/student_self),
 * hors contrôle (lieu `evaluation`) ; une trace sans lieu (antérieure à
 * `formes-de-serie`) compte (décision R6, 2026-11-12).
 *
 * Remplace l'ancien widget C (élève × jour, nombres de traces), jugé trop
 * précis (décision R3). Cf. `docs/systeme/analytique-prof.md`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { readAllRows } from '$lib/server/read-all-rows';
import { schoolDay } from '$lib/server/course-card-attempts';
import { createServerLogger } from '$lib/utils/logger';

// Types

type SB = SupabaseClient<Database>;

/** 0 = aucun jour actif · 1 = un · 2 = deux ou trois · 3 = quatre ou plus */
export type RegularityTier = 0 | 1 | 2 | 3;

export interface RegularityWeek {
	/** Lundi de la semaine, AAAA-MM-JJ */
	start: string;
	/** La semaine touche au moins un jour de vacances de l'école */
	holiday: boolean;
}

export interface RegularityStudent {
	id: string;
	display_name: string;
	/** Un palier par semaine, dans l'ordre de `weeks` */
	tiers: RegularityTier[];
}

export interface ClassRegularityGrid {
	weeks: RegularityWeek[];
	students: RegularityStudent[];
}

export interface RegularityTrace {
	student_id: string;
	created_at: string;
	source: string;
	place: string | null;
}

interface Holiday {
	start_date: string;
	end_date: string;
}

// Constantes

const logger = createServerLogger('server/stats/class-regularity');

/** Traces qu'un jour doit compter pour être actif */
export const MIN_TRACES_PER_ACTIVE_DAY = 5;

/** Sources des traces écrites par l'élève lui-même (policy `skill_attempts_insert_own_student`) */
export const AUTONOMOUS_SOURCES = ['auto', 'srs', 'student_self'] as const;

const DAY_MS = 24 * 3600 * 1000;

// Functions

/** Date civile AAAA-MM-JJ → minuit UTC de ce jour (pour l'arithmétique des jours) */
function civilToUtc(day: string): Date {
	return new Date(`${day}T00:00:00Z`);
}

function utcToCivil(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
	return utcToCivil(new Date(civilToUtc(day).getTime() + n * DAY_MS));
}

/** Lundi de la semaine du jour donné */
export function weekStartOf(day: string): string {
	// getUTCDay : 0 = dimanche ; on recule jusqu'au lundi
	const weekday = civilToUtc(day).getUTCDay();
	return addDays(day, -((weekday + 6) % 7));
}

export function activeDaysTier(activeDays: number): RegularityTier {
	if (activeDays <= 0) return 0;
	if (activeDays === 1) return 1;
	if (activeDays <= 3) return 2;
	return 3;
}

export function isAutonomousTrace(trace: Pick<RegularityTrace, 'source' | 'place'>): boolean {
	if (!(AUTONOMOUS_SOURCES as readonly string[]).includes(trace.source)) return false;
	return trace.place !== 'evaluation';
}

/**
 * Premier jour de la grille : la rentrée de l'année scolaire active, ou, sans
 * année (ou avec une rentrée encore à venir), le 1er septembre écoulé.
 */
export function regularityFirstDay(yearStart: string | null, now: Date): string {
	const today = schoolDay(now);
	if (yearStart && yearStart <= today) return yearStart;
	const year = Number(today.slice(0, 4));
	const septemberFirst = `${year}-09-01`;
	return septemberFirst <= today ? septemberFirst : `${year - 1}-09-01`;
}

export function buildRegularityGrid(input: {
	students: { id: string; display_name: string }[];
	traces: RegularityTrace[];
	firstDay: string;
	today: string;
	holidays: Holiday[];
}): ClassRegularityGrid {
	const { students, traces, firstDay, today, holidays } = input;

	const weeks: RegularityWeek[] = [];
	const lastWeek = weekStartOf(today);
	for (let start = weekStartOf(firstDay); start <= lastWeek; start = addDays(start, 7)) {
		const end = addDays(start, 6);
		weeks.push({
			start,
			holiday: holidays.some((h) => h.start_date <= end && h.end_date >= start)
		});
	}
	const weekIndex = new Map(weeks.map((w, i) => [w.start, i]));

	// Traces par élève et par jour de Paris
	const known = new Set(students.map((s) => s.id));
	const perDay = new Map<string, number>();
	for (const t of traces) {
		if (!known.has(t.student_id) || !isAutonomousTrace(t)) continue;
		const day = schoolDay(new Date(t.created_at));
		if (day < firstDay || day > today) continue;
		const key = `${t.student_id}|${day}`;
		perDay.set(key, (perDay.get(key) ?? 0) + 1);
	}

	// Jours actifs par élève et par semaine
	const activeDays = new Map<string, number[]>();
	for (const [key, count] of perDay) {
		if (count < MIN_TRACES_PER_ACTIVE_DAY) continue;
		const [studentId, day] = key.split('|');
		const index = weekIndex.get(weekStartOf(day));
		if (index === undefined) continue;
		const row = activeDays.get(studentId) ?? Array.from({ length: weeks.length }, () => 0);
		row[index] += 1;
		activeDays.set(studentId, row);
	}

	return {
		weeks,
		students: students.map((s) => ({
			id: s.id,
			display_name: s.display_name,
			tiers: (activeDays.get(s.id) ?? Array.from({ length: weeks.length }, () => 0)).map(
				activeDaysTier
			)
		}))
	};
}

function formatName(first: string | null, last: string | null): string {
	return (
		[first, last]
			.map((x) => (x ?? '').trim())
			.filter(Boolean)
			.join(' ') || 'Élève sans nom'
	);
}

/** Rentrée et vacances de l'année scolaire active de l'école de la classe */
export async function readSchoolYear(
	supabase: SB,
	classId: string,
	now: Date
): Promise<{ start: string | null; holidays: Holiday[] }> {
	const { data: classRow, error: classError } = await supabase
		.from('classes')
		.select('school_id')
		.eq('id', classId)
		.maybeSingle();
	if (classError) throw new Error(`classe illisible — ${classError.message}`);
	if (!classRow?.school_id) return { start: null, holidays: [] };

	const { data: years, error: yearsError } = await supabase
		.from('school_years')
		.select('id, start_date')
		.eq('school_id', classRow.school_id)
		.eq('is_active', true)
		.order('start_date', { ascending: false });
	if (yearsError) throw new Error(`années scolaires illisibles — ${yearsError.message}`);

	// La plus récente déjà commencée
	const today = schoolDay(now);
	const year = (years ?? []).find((y) => y.start_date <= today);
	if (!year) return { start: null, holidays: [] };

	const { data: holidays, error: holidaysError } = await supabase
		.from('school_holidays')
		.select('start_date, end_date')
		.eq('school_year_id', year.id);
	if (holidaysError) throw new Error(`vacances illisibles — ${holidaysError.message}`);

	return { start: year.start_date, holidays: holidays ?? [] };
}

/**
 * @throws si une lecture échoue : une grille vide dirait « personne n'a
 * travaillé », un jugement et non une absence de donnée (E1).
 */
export async function getClassRegularityGrid(
	supabase: SB,
	classId: string,
	now = new Date()
): Promise<ClassRegularityGrid> {
	const { start, holidays } = await readSchoolYear(supabase, classId, now);
	const firstDay = regularityFirstDay(start, now);
	const today = schoolDay(now);

	const { data: members, error: membersError } = await supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, firstname, lastname)')
		.eq('class_id', classId)
		.eq('status', 'active');
	if (membersError) {
		logger.error('[getClassRegularityGrid] Élèves illisibles :', membersError);
		throw new Error(membersError.message);
	}

	type MemberRow = {
		student_id: string;
		profiles: { id: string; firstname: string | null; lastname: string | null } | null;
	};
	const students = ((members ?? []) as unknown as MemberRow[])
		.filter((m) => m.profiles)
		.map((m) => ({
			id: m.student_id,
			display_name: formatName(m.profiles!.firstname, m.profiles!.lastname)
		}))
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	if (students.length === 0) {
		return buildRegularityGrid({ students, traces: [], firstDay, today, holidays });
	}

	// Un jour de marge avant le lundi : minuit à Paris tombe la veille en UTC
	const since = new Date(civilToUtc(weekStartOf(firstDay)).getTime() - DAY_MS).toISOString();
	const studentIds = (members as unknown as MemberRow[]).map((m) => m.student_id);
	let traces: RegularityTrace[];
	try {
		traces = await readAllRows<RegularityTrace>(
			(fromRow, toRow) =>
				supabase
					.from('skill_attempts')
					.select('student_id, created_at, source, place')
					.in('student_id', studentIds)
					.in('source', [...AUTONOMOUS_SOURCES])
					.gte('created_at', since)
					.order('id')
					.range(fromRow, toRow),
			'des traces de la classe'
		);
	} catch (e) {
		logger.error('[getClassRegularityGrid] Traces illisibles :', e);
		throw e;
	}

	return buildRegularityGrid({ students, traces, firstDay, today, holidays });
}
