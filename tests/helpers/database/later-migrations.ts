/**
 * Défaire, dans la transaction d'un test, les migrations de données POSTÉRIEURES à celle qu'il rejoue
 * ===================================================================================================
 *
 * Le test d'une ancienne migration rejoue son rollback sur la base locale, qui porte aussi les
 * migrations venues après elle. Quand l'une d'elles s'appuie sur ce que l'ancienne a créé (un point
 * rangé sur une sous-notion créée par le nettoyage de l'arbre, par exemple), l'ancien rollback refuse,
 * à juste titre. Le test joue donc d'abord le rollback documenté de ces migrations postérieures, dans
 * la même transaction (qu'il annule ensuite) : il retrouve l'état que son rollback attend.
 */
import type { Client } from 'pg';
import { extractRollback } from './migration-rollback';

/** La passe des points du lycée (étape a). */
export const PASSE_LYCEE = 'supabase/migrations/20261022180000_passe_points_lycee.sql';
/** Libellés et points neufs de la passe lycée (étape e, PR 2), venus après l'étape a. */
export const PASSE_LYCEE_LIBELLES =
	'supabase/migrations/20261023220000_passe_lycee_libelles_points.sql';
/** Sous-notion « reconnaître et nommer des formes » (CP-054, CP-055) et niveaux de 19 brouillons CP. */
export const QUESTIONS_CP_FORMES =
	'supabase/migrations/20261026170000_questions_cp_formes_et_niveaux.sql';
/** Sous-notion « Statistiques > Représenter des données > choisir une représentation » (5-079) et lot 6 de la 5e. */
export const QUESTIONS_5_LOT6 =
	'supabase/migrations/20261101180100_questions_5_lot6_rangement_tags.sql';
/** Du plus récent au plus ancien. */
const LATER = [QUESTIONS_5_LOT6, QUESTIONS_CP_FORMES, PASSE_LYCEE_LIBELLES, PASSE_LYCEE];

/** Défait les migrations postérieures à `after` (toutes si absent), de la plus récente à la plus ancienne. */
export async function undoLaterMigrations(pg: Client, after?: string): Promise<void> {
	const end = after ? LATER.indexOf(after) : LATER.length;
	if (end < 0) throw new Error(`migration inconnue de LATER : ${after}`);
	for (const migration of LATER.slice(0, end)) {
		await pg.query(extractRollback(migration));
	}
}
