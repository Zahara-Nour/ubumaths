/**
 * `pnpm db:types` — régénérer `src/lib/types/database.ts` depuis les migrations de la branche
 * ==========================================================================================
 *
 *   pnpm db:types            réécrit database.ts, puis la doc des tables (docs/systeme/)
 *   pnpm db:types:verifier   n'écrit rien : sortie 1 si le fichier commité n'est pas celui
 *                            que les migrations produisent (garde de la CI)
 *
 * Lancé par scripts/pile-de-test.sh : la pile de test est d'abord mise d'accord avec la branche
 * (elle porte exactement ses migrations), puis lue. En CI, la base est celle du workflow. La prod
 * n'est jamais lue : une fonction SQL et le code qui l'appelle tiennent dans la même PR.
 *
 * Le fichier dépend de la version de la CLI Supabase (son générateur) et de prettier, toutes
 * deux épinglées : le Mac et la CI écrivent le même fichier. Règles : ./regles.ts.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as prettier from 'prettier';
import { adresseDeLaBase, ecarts, lireLaSortie } from './regles';

// ============================================================================
// Constantes
// ============================================================================

const RACINE = process.cwd();
const CIBLE = resolve(RACINE, 'src/lib/types/database.ts');
const CLI = resolve(RACINE, 'node_modules/.bin/supabase');
const EN_TETE =
	'// Fichier GÉNÉRÉ par `pnpm db:types` depuis les migrations du dépôt (supabase/migrations).\n' +
	'// Ne pas le modifier à la main : la CI le régénère et compare (`pnpm db:types:verifier`).\n\n';

// ============================================================================
// Fonctions
// ============================================================================

class Echec extends Error {}

/** Les types de la base locale, mis en forme comme le fichier commité. */
async function generer(): Promise<string> {
	let adresse: string;
	try {
		adresse = adresseDeLaBase(process.env);
	} catch (e) {
		throw new Echec(e instanceof Error ? e.message : String(e));
	}
	const r = spawnSync(
		CLI,
		['gen', 'types', 'typescript', '--db-url', adresse, '--schema', 'public'],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
	);
	if (r.error) throw new Echec(`CLI Supabase non lancée : ${r.error.message}`);
	const sortie = lireLaSortie(r.status, r.stdout);
	if (!sortie.ok) {
		throw new Echec(
			`Types non générés : ${sortie.raison}\n${r.stderr.trim().split('\n').slice(-5).join('\n')}`
		);
	}
	// `database.ts` est dans .prettierignore (16 000 lignes que personne ne relit) : la mise en
	// forme se fait ici, avec les réglages du dépôt, pour que le fichier soit stable et lisible.
	const reglages = await prettier.resolveConfig(resolve(RACINE, 'scripts/db-types/index.ts'));
	return prettier.format(EN_TETE + sortie.source.trimStart(), {
		...reglages,
		parser: 'typescript',
		plugins: []
	});
}

async function main(): Promise<number> {
	const verifier = process.argv.includes('--verifier');
	const genere = await generer();
	if (verifier) {
		const lignes = ecarts(readFileSync(CIBLE, 'utf8'), genere);
		if (lignes.length === 0) {
			console.log('✅ database.ts est bien celui que les migrations du dépôt produisent.');
			return 0;
		}
		console.error(
			'⛔ src/lib/types/database.ts n’est pas celui que les migrations du dépôt produisent.'
		);
		console.error(lignes.join('\n'));
		console.error(
			'\nMigration ajoutée ou fichier retouché à la main ? Lance `pnpm db:types`, puis commite ' +
				'database.ts et docs/systeme/base-de-donnees-tables.md.'
		);
		return 1;
	}
	writeFileSync(CIBLE, genere);
	console.log('✅ src/lib/types/database.ts régénéré depuis les migrations de la branche.');
	const doc = spawnSync(resolve(RACINE, 'node_modules/.bin/tsx'), ['scripts/generate-db-doc.ts'], {
		stdio: 'inherit'
	});
	return doc.status ?? 1;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
