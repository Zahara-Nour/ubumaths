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

/**
 * Instructions qui changent le schéma ou les règles d'accès. Elles sont testées sur une
 * instruction entière, espaces normalisés (une instruction coupée sur plusieurs lignes compte).
 */
const SCHEMA_OU_REGLES: RegExp[] = [
	/\bcreate (or replace )?(unique |unlogged |constraint |event |materialized )?(function|procedure|policy|trigger|view|index|table|type|schema|extension|sequence|rule|domain|publication|role|cast|operator|aggregate)\b/i,
	/\balter (table|function|procedure|policy|view|materialized view|type|sequence|schema|default privileges|index|domain|role|database|publication|event trigger|operator|aggregate)\b/i,
	/\bdrop (function|procedure|policy|trigger|view|materialized view|index|table|type|schema|extension|sequence|rule|domain|column|constraint|publication|role|cast|operator|aggregate|event trigger)\b/i,
	/\b(grant|revoke)\b/i,
	/\bsecurity definer\b/i,
	/\b(enable|disable|force) row level security\b/i,
	/\bstorage\.(buckets|objects)\b/i
];

/**
 * Exceptions, sur l'instruction entière : tables temporaires, trigger coupé ou rétabli le temps
 * d'un UPDATE (horodatage seulement). Ancrées au début ET à la fin : une seconde instruction collée ne passe pas.
 */
const SANS_EFFET: RegExp[] = [
	/^create (temp|temporary) table (if not exists )?(pg_temp\.)?_?\w+ \(.*\)$/i,
	/^create (temp|temporary) table (if not exists )?(pg_temp\.)?_?\w+ as .*$/i,
	/^drop table (if exists )?(pg_temp\.)?_\w+(, ?(pg_temp\.)?_\w+)*$/i,
	/^alter table (pg_temp\.)?_\w+ [^;]*$/i,
	/^create (unique )?index (\w+ )?on (pg_temp\.)?_\w+ [^;]*$/i,
	// seulement l'horodatage (`*_updated_at`) : couper un trigger de garde change les règles
	/^alter table [\w."]+ (disable|enable) trigger \w*updated_at$/i
];

/** Délimiteur d'un corps `$$` ou `$tag$`, cherché à une position précise. */
const DOLLAR = /\$[A-Za-z_]*\$/y;

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

/**
 * Retire les commentaires (`--` et bloc `/* … *` + `/`) hors des chaînes `'…'` et des corps `$tag$…$tag$`,
 * puis coupe en instructions sur les `;` hors chaînes, espaces normalisés. Le contenu d'un corps
 * `$$` (DO, execute) est gardé : une instruction de schéma qui s'y cache reste visible.
 */
export function instructions(sql: string): string[] {
	const sorties: string[] = [];
	const corpsInternes: string[] = [];
	let courante = '';
	let i = 0;
	while (i < sql.length) {
		if (sql.startsWith('--', i)) {
			const fin = sql.indexOf('\n', i);
			i = fin === -1 ? sql.length : fin;
			continue;
		}
		if (sql.startsWith('/*', i)) {
			const fin = sql.indexOf('*/', i + 2);
			i = fin === -1 ? sql.length : fin + 2;
			courante += ' ';
			continue;
		}
		if (sql[i] === "'") {
			let j = i + 1;
			while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : 1;
			courante += sql.slice(i, j + 1);
			i = j + 1;
			continue;
		}
		DOLLAR.lastIndex = i;
		const dollar = DOLLAR.exec(sql);
		if (dollar) {
			// Corps `$tag$…$tag$` : une chaîne pour l'instruction qui le porte (texte d'un modèle,
			// apostrophes comprises), mais ses propres instructions (DO, execute) comptent aussi.
			const fin = sql.indexOf(dollar[0], i + dollar[0].length);
			const corps = sql.slice(i + dollar[0].length, fin === -1 ? sql.length : fin);
			corpsInternes.push(...instructions(corps));
			courante += ' $corps$ ';
			i = fin === -1 ? sql.length : fin + dollar[0].length;
			continue;
		}
		if (sql[i] === ';') {
			sorties.push(courante);
			courante = '';
			i++;
			continue;
		}
		courante += sql[i];
		i++;
	}
	sorties.push(courante);
	return [...sorties, ...corpsInternes].map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * Première instruction d'une migration qui touche le schéma ou les règles d'accès, ou `null`
 * si la migration ne fait que lire et écrire des données (tables temporaires comprises).
 */
export function instructionDeSchema(sql: string): string | null {
	for (const texte of instructions(sql)) {
		if (SANS_EFFET.some((motif) => motif.test(texte))) continue;
		if (SCHEMA_OU_REGLES.some((motif) => motif.test(texte))) return texte.slice(0, 160);
	}
	return null;
}
