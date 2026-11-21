/**
 * Tests de migration de données : mention, migrations citées, migration qui touche le schéma
 * =========================================================================================
 *
 * Un test d'intégration qui porte la mention `@migration-de-donnees` ne tourne pas sur les PR
 * (scripts/ci-integration-exclusions.sh), seulement la nuit : il rejoue une migration qui ne fait
 * que ranger, taguer ou corriger du contenu, et ne prouve quelque chose qu'avant son `db:migrate`.
 *
 * La garde (scripts/check-migrations-de-donnees.ts) refuse la mention sur un test dont une
 * migration citée touche le schéma ou les règles d'accès : ce test-là doit tourner sur chaque PR.
 */

// ============================================================================
// Constantes
// ============================================================================

export const MENTION = '@migration-de-donnees';

/** Chemin d'une migration horodatée, cité tel quel ou relativement (`../../supabase/…`). */
const MIGRATION_CITEE = /supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql/g;

/** Instructions qui changent le schéma ou les règles d'accès (texte sans commentaires). */
const SCHEMA_OU_REGLES: RegExp[] = [
	/\bcreate\s+(or\s+replace\s+)?(unique\s+)?(function|procedure|policy|trigger|view|materialized\s+view|index|table|type|schema|extension|sequence|rule|domain)\b/i,
	/\balter\s+(table|function|procedure|policy|view|materialized\s+view|type|sequence|schema|default\s+privileges|index|domain)\b/i,
	/\bdrop\s+(function|procedure|policy|trigger|view|materialized\s+view|index|table|type|schema|extension|sequence|rule|domain|column|constraint)\b/i,
	/\b(grant|revoke)\b/i,
	/\bsecurity\s+definer\b/i,
	/\b(enable|disable|force)\s+row\s+level\s+security\b/i,
	/\bstorage\.(buckets|objects)\b/i
];

/** Exceptions : tables temporaires, triggers coupés le temps d'un UPDATE. */
const SANS_EFFET: RegExp[] = [
	/\bcreate\s+(temp|temporary)\s+table\b/i,
	/\b(alter|drop)\s+table\s+(if\s+exists\s+)?(pg_temp\.)?_\w+/i,
	/\balter\s+table\s+[\w."]+\s+(disable|enable)\s+trigger\s+\w+\s*;?\s*$/i
];

// ============================================================================
// Fonctions
// ============================================================================

export function porteLaMention(source: string): boolean {
	return source.includes(MENTION);
}

/** Migrations citées par un test, sous la forme `supabase/migrations/<nom>.sql`, sans doublon. */
export function migrationsCitees(source: string): string[] {
	return [...new Set(source.match(MIGRATION_CITEE) ?? [])].sort();
}

function sansCommentaires(sql: string): string {
	return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

/**
 * Première instruction d'une migration qui touche le schéma ou les règles d'accès, ou `null`
 * si la migration ne fait que lire et écrire des données (tables temporaires comprises).
 */
export function instructionDeSchema(sql: string): string | null {
	for (const ligne of sansCommentaires(sql).split('\n')) {
		const texte = ligne.trim();
		if (!texte) continue;
		if (SANS_EFFET.some((motif) => motif.test(texte))) continue;
		if (SCHEMA_OU_REGLES.some((motif) => motif.test(texte))) return texte;
	}
	return null;
}
