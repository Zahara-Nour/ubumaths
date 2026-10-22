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

/** La passe des points du lycée (étape a), du plus récent au plus ancien. */
export const PASSE_LYCEE = 'supabase/migrations/20261022180000_passe_points_lycee.sql';
const LATER = [PASSE_LYCEE];

export async function undoLaterMigrations(pg: Client): Promise<void> {
	for (const migration of LATER) {
		await pg.query(extractRollback(migration));
	}
}
