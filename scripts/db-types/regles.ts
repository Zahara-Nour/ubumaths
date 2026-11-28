/**
 * `pnpm db:types` : les règles (pures, testées dans scripts/__tests__/db-types.test.ts)
 * ===================================================================================
 *
 * Les types de la base (`src/lib/types/database.ts`) sont générés depuis une base LOCALE qui
 * porte exactement les migrations de la branche : la pile de test (scripts/pile-de-test.sh),
 * ou la base du workflow en CI. Jamais la prod, jamais la base de dev (partagée par tous les
 * worktrees, elle porte les migrations d'autres branches).
 */

// ============================================================================
// Types
// ============================================================================

export type Sortie = { ok: true; source: string } | { ok: false; raison: string };

// ============================================================================
// Constantes
// ============================================================================

const HOTES_LOCAUX = new Set(['127.0.0.1', 'localhost', '::1']);
/** Port de la base du workflow de CI (`supabase db start`, ports de `supabase/config.toml`). */
const PORT_DE_LA_CI = '54322';
/** Nombre d'écarts montrés par la garde : assez pour voir quoi, pas un fichier entier. */
const ECARTS_MONTRES = 5;

// ============================================================================
// Fonctions
// ============================================================================

/**
 * Adresse de la base à lire. Le lanceur de la pile de test donne `SUPABASE_DB_*` ; en CI, la base
 * est celle du workflow. Sans l'un ni l'autre, on refuse : rien ne dit quelle base lire.
 */
export function adresseDeLaBase(env: Readonly<Record<string, string | undefined>>): string {
	const enCI = Boolean(env.GITHUB_ACTIONS);
	const hote = env.SUPABASE_DB_HOST ?? (enCI ? '127.0.0.1' : undefined);
	const port = env.SUPABASE_DB_PORT ?? (enCI ? PORT_DE_LA_CI : undefined);
	if (!hote || !port) {
		throw new Error(
			'Base à lire inconnue : ce script se lance par `pnpm db:types` (ou `pnpm db:types:verifier`), ' +
				'qui prépare la pile de test avec les migrations de la branche.'
		);
	}
	if (!HOTES_LOCAUX.has(hote)) {
		throw new Error(`Les types se génèrent depuis une base locale, pas depuis « ${hote} ».`);
	}
	const utilisateur = env.SUPABASE_DB_USER ?? 'postgres';
	const motDePasse = env.SUPABASE_DB_PASSWORD ?? 'postgres';
	const base = env.SUPABASE_DB_NAME ?? 'postgres';
	// `sslmode=disable` : la base locale ne parle pas TLS, et la CLI l'exige par défaut.
	return `postgresql://${utilisateur}:${motDePasse}@${hote}:${port}/${base}?sslmode=disable`;
}

/**
 * Ce que la CLI a rendu est-il un fichier de types utilisable ? La CLI écrit ses erreurs de
 * connexion sur la sortie standard (un objet JSON) : sans ce contrôle, elles finiraient dans
 * `database.ts`.
 */
export function lireLaSortie(code: number | null, stdout: string): Sortie {
	const debut = stdout.trim().slice(0, 300);
	if (code !== 0) {
		return { ok: false, raison: `la CLI Supabase a échoué (code ${code}) : ${debut || '(rien)'}` };
	}
	if (!debut) return { ok: false, raison: 'la CLI Supabase n’a rien rendu' };
	if (!/export type Database\b/.test(stdout)) {
		return { ok: false, raison: `la CLI Supabase n’a pas rendu de types : ${debut}` };
	}
	// Une table réelle ouvre par `nom: {` puis `Row: {` ; une base sans migrations n'en a aucune.
	if (!/\bRow:\s*\{/.test(stdout)) {
		return { ok: false, raison: 'les types ne contiennent aucune table (base sans migrations ?)' };
	}
	return { ok: true, source: stdout };
}

/**
 * Écarts entre le fichier commité et celui qu'on vient de régénérer, lisibles dans un journal de
 * CI. Comparaison ligne à ligne : une ligne ajoutée décale la suite, les premiers écarts suffisent
 * à dire quoi. Tableau vide = identiques.
 */
export function ecarts(depot: string, base: string): string[] {
	if (depot === base) return [];
	const a = depot.split('\n');
	const b = base.split('\n');
	const lignes: string[] = [];
	let vus = 0;
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		if (a[i] === b[i]) continue;
		if (vus === ECARTS_MONTRES) {
			lignes.push('… (d’autres écarts suivent)');
			break;
		}
		vus++;
		lignes.push(
			`ligne ${i + 1}`,
			`  dépôt : ${a[i] ?? '(fin du fichier)'}`,
			`  base  : ${b[i] ?? '(fin du fichier)'}`
		);
	}
	return lignes;
}
