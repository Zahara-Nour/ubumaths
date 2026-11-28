/**
 * Année scolaire : UNE règle pour tout le site (L38).
 *
 * Les dates que l'école a saisies (`school_years`) quand elles contiennent le
 * jour, lues par la fonction SQL `current_school_year` ; sinon du 1er septembre
 * au 31 août. La fonction SQL rend aussi une année FINIE (« la plus récente déjà
 * commencée ») : écartée ici, sinon une école qui n'a pas saisi sa nouvelle
 * année verrait l'année écoulée. Les liens envoyés aux familles (cahier de
 * texte, cours, carnet de liaison) expirent à la fin de cette même année
 * (`schoolYearExpiry`, décision de David du 2026-11-28).
 *
 * @module server/school-year
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types
/** Bornes d'une année scolaire, dates ISO incluses (AAAA-MM-JJ) */
export interface SchoolYearSpan {
	start: string;
	end: string;
}

// Constantes
const logger = createServerLogger('server/school-year');
/** Septembre, en mois de `Date` (0 = janvier) */
const SEPTEMBER = 8;

// Functions
/** Année de rentrée de l'année scolaire en cours (septembre et après → cette année) */
function startYearOf(now: Date): number {
	return now.getUTCMonth() >= SEPTEMBER ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** Règle par défaut : du 1er septembre au 31 août */
export function defaultSchoolYear(now: Date = new Date()): SchoolYearSpan {
	const startYear = startYearOf(now);
	return { start: `${startYear}-09-01`, end: `${startYear + 1}-08-31` };
}

/**
 * Année scolaire en cours pour une école : ses dates saisies (fonction SQL
 * `current_school_year`) si elles contiennent `now`, sinon la règle par défaut. Une lecture en panne lève : une année
 * inventée compterait des séances qui n'en sont pas.
 */
export async function currentSchoolYear(
	supabase: SupabaseClient<Database>,
	schoolId: string | null,
	now: Date = new Date()
): Promise<SchoolYearSpan> {
	if (!schoolId) return defaultSchoolYear(now);

	const { data, error } = await supabase
		.rpc('current_school_year', { p_school_id: schoolId })
		.maybeSingle();

	if (error) {
		logger.error('[school-year] Année scolaire illisible :', error);
		throw new Error(error.message);
	}
	// Année de l'école finie (nouvelle année pas encore saisie, ou été) : la
	// fonction SQL rendrait l'année écoulée, on retombe sur la règle par défaut
	const today = now.toISOString().slice(0, 10);
	if (!data || data.end_date < today) return defaultSchoolYear(now);
	return { start: data.start_date, end: data.end_date };
}

/**
 * Expiration d'un lien d'année scolaire : le dernier jour de l'année en cours
 * de l'école (`currentSchoolYear`), à 23:59:59 UTC. Un lien doit mourir de
 * lui-même à la fin de l'année plutôt que de survivre chez d'anciennes familles.
 */
export async function schoolYearExpiry(
	supabase: SupabaseClient<Database>,
	schoolId: string | null,
	now: Date = new Date()
): Promise<Date> {
	const { end } = await currentSchoolYear(supabase, schoolId, now);
	return new Date(`${end}T23:59:59Z`);
}

/** `schoolYearExpiry` de l'école d'une classe. Classe illisible ou introuvable : lève. */
export async function classSchoolYearExpiry(
	supabase: SupabaseClient<Database>,
	classId: string,
	now: Date = new Date()
): Promise<Date> {
	const { data, error } = await supabase
		.from('classes')
		.select('school_id')
		.eq('id', classId)
		.maybeSingle();
	if (error || !data) {
		logger.error('[school-year] Classe illisible :', error ?? 'introuvable');
		throw new Error(error?.message ?? 'Classe introuvable');
	}
	return schoolYearExpiry(supabase, data.school_id, now);
}
