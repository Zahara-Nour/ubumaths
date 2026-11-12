/**
 * Semaines actives du Palotin (chantier `regularite`, PR B2, décisions de
 * David du 2026-11-12 : docs/wip/regularite-progress.md § PR B2)
 * ====================================================================
 *
 * Le Palotin fête, une fois par semaine, la semaine qui devient active :
 *   - au palier 3, 5 ou 10 semaines actives d'affilée, ce palier ;
 *   - sinon, la 1re activité de la semaine.
 * Les deux moments tombent au même instant (le compte monte quand la semaine
 * devient active) : un seul « déjà dit », `student_last_visits.week_celebrated_on`
 * (lundi de la semaine fêtée), lisible par le serveur seul.
 *
 * Mêmes règles que la grille du prof (`stats/class-regularity.ts`) :
 *   - jour actif = 5 traces autonomes le même jour de Paris ;
 *   - semaine active = au moins un jour actif (R4) ;
 *   - une semaine de vacances (des écoles des classes de l'élève) sans activité
 *     est sautée, avec activité elle compte (T5) ; hors classe, aucune vacance ;
 *   - le compte part de la rentrée : l'été le remet à zéro (T6) ; compte coupé
 *     = remis à zéro en silence.
 * Fête seulement si AUJOURD'HUI est un jour actif : jamais à l'arrivée un autre
 * jour (T3).
 */

import { readAllRows } from '$lib/server/read-all-rows';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { schoolDay } from '$lib/server/course-card-attempts';
import {
	AUTONOMOUS_SOURCES,
	MIN_TRACES_PER_ACTIVE_DAY,
	isAutonomousTrace,
	readSchoolYear,
	regularityFirstDay,
	weekStartOf,
	type RegularityTrace
} from '$lib/server/stats/class-regularity';
import { createServerLogger } from '$lib/utils/logger';
import type { WeekMoment } from '$lib/types/buddy';

// Types
export type { WeekMoment };

interface Holiday {
	start_date: string;
	end_date: string;
}

type TraceInput = Pick<RegularityTrace, 'created_at' | 'source' | 'place'>;

// Constantes
const logger = createServerLogger('buddy-weeks');
const DAY_MS = 24 * 3600 * 1000;
/** Paliers de semaines actives d'affilée fêtés (R4) */
const STREAK_MOMENTS: Partial<Record<number, WeekMoment>> = {
	3: 'active_weeks_3',
	5: 'active_weeks_5',
	10: 'active_weeks_10'
};

// Functions
function addDays(day: string, n: number): string {
	return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** Jours de Paris où l'élève a au moins 5 traces autonomes */
export function activeDaysOf(traces: TraceInput[]): Set<string> {
	const perDay = new Map<string, number>();
	for (const trace of traces) {
		if (!isAutonomousTrace(trace)) continue;
		const day = schoolDay(new Date(trace.created_at));
		perDay.set(day, (perDay.get(day) ?? 0) + 1);
	}
	return new Set(
		[...perDay].filter(([, count]) => count >= MIN_TRACES_PER_ACTIVE_DAY).map(([day]) => day)
	);
}

/**
 * Semaines actives d'affilée jusqu'à la semaine en cours comprise ; 0 si la
 * semaine en cours n'est pas active.
 */
export function activeWeekStreak(input: {
	activeDays: Set<string>;
	holidays: Holiday[];
	firstDay: string;
	today: string;
}): number {
	const { activeDays, holidays, firstDay, today } = input;
	const firstWeek = weekStartOf(firstDay);
	let streak = 0;
	for (let start = weekStartOf(today); start >= firstWeek; start = addDays(start, -7)) {
		const end = addDays(start, 6);
		let active = false;
		for (let day = start; day <= end; day = addDays(day, 1)) {
			if (day >= firstDay && day <= today && activeDays.has(day)) {
				active = true;
				break;
			}
		}
		if (active) {
			streak += 1;
			continue;
		}
		// Semaine en cours inactive : rien à fêter
		if (start === weekStartOf(today)) return 0;
		const holiday = holidays.some((h) => h.start_date <= end && h.end_date >= start);
		if (!holiday) break;
	}
	return streak;
}

/** Le moment à fêter pour un compte de semaines actives (0 → rien) */
export function weekMomentFor(streak: number): WeekMoment | null {
	if (streak <= 0) return null;
	return STREAK_MOMENTS[streak] ?? 'week_first_activity';
}

/** Vrai si la semaine `week` (lundi) n'a pas encore été fêtée */
export function isWeekToCelebrate(celebratedWeek: string | null, week: string): boolean {
	return celebratedWeek === null || celebratedWeek < week;
}

/** Lundi de la dernière semaine fêtée ; lecture en échec → lève */
async function readCelebratedWeek(studentId: string): Promise<string | null> {
	const { data, error } = await createServiceRoleClient()
		.from('student_last_visits')
		.select('week_celebrated_on')
		.eq('student_id', studentId)
		.maybeSingle();
	if (error) throw new Error(`semaine fêtée illisible — ${error.message}`);
	return data?.week_celebrated_on ?? null;
}

/** Traces autonomes de l'élève depuis `since` (instant ISO) */
async function readStudentTraces(studentId: string, since: string): Promise<TraceInput[]> {
	const service = createServiceRoleClient();
	return readAllRows<TraceInput>(
		(fromRow, toRow) =>
			service
				.from('skill_attempts')
				.select('created_at, source, place')
				.eq('student_id', studentId)
				.in('source', [...AUTONOMOUS_SOURCES])
				.gte('created_at', since)
				.order('id')
				.range(fromRow, toRow),
		"des traces de l'élève"
	);
}

/**
 * Rentrée et vacances des écoles des classes actives de l'élève : la rentrée
 * la plus ancienne, toutes les vacances. Hors classe : ni rentrée ni vacances.
 */
async function readStudentSchoolYear(
	studentId: string,
	now: Date
): Promise<{ start: string | null; holidays: Holiday[] }> {
	const service = createServiceRoleClient();
	const { data: memberships, error } = await service
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.eq('status', 'active');
	if (error) throw new Error(`classes illisibles — ${error.message}`);

	let start: string | null = null;
	const holidays: Holiday[] = [];
	for (const { class_id } of memberships ?? []) {
		const year = await readSchoolYear(service, class_id, now);
		if (year.start && (start === null || year.start < start)) start = year.start;
		holidays.push(...year.holidays);
	}
	return { start, holidays };
}

/**
 * Le moment de la semaine à fêter maintenant, ou `null`. Lecture seule : un
 * préchargement ne consomme rien ; le client acquitte après la bulle.
 * @throws si une lecture échoue (l'appelant rend alors `null`)
 */
export async function loadWeekMoment(
	studentId: string,
	now = new Date()
): Promise<WeekMoment | null> {
	const today = schoolDay(now);
	if (!isWeekToCelebrate(await readCelebratedWeek(studentId), weekStartOf(today))) return null;

	// Aujourd'hui actif ? (deux jours de marge : minuit à Paris tombe la veille en UTC)
	const recent = await readStudentTraces(
		studentId,
		new Date(now.getTime() - 2 * DAY_MS).toISOString()
	);
	if (!activeDaysOf(recent).has(today)) return null;

	const { start, holidays } = await readStudentSchoolYear(studentId, now);
	const firstDay = regularityFirstDay(start, now);
	const since = new Date(new Date(`${weekStartOf(firstDay)}T00:00:00Z`).getTime() - DAY_MS);
	const traces = await readStudentTraces(studentId, since.toISOString());
	const streak = activeWeekStreak({ activeDays: activeDaysOf(traces), holidays, firstDay, today });
	return weekMomentFor(streak);
}

/**
 * La semaine en cours est fêtée (moment de la semaine, ou retour après une
 * pause : T4). Rend vrai si la ligne a été écrite.
 */
export async function markWeekCelebrated(studentId: string, now = new Date()): Promise<boolean> {
	const { data, error } = await createServiceRoleClient()
		.from('student_last_visits')
		.update({ week_celebrated_on: weekStartOf(schoolDay(now)) })
		.eq('student_id', studentId)
		.select('student_id');
	if (error) {
		logger.error('❌ [buddy-weeks] Semaine fêtée non retenue :', error);
		throw new Error(`Semaine fêtée non retenue : ${error.message}`);
	}
	return (data?.length ?? 0) > 0;
}
