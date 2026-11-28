/**
 * Garde : un test marqué `@migration-de-donnees` ne rejoue QUE des migrations de données
 * =====================================================================================
 *
 * Les tests marqués ne tournent pas sur les PR (scripts/ci-integration-exclusions.sh). Marquer
 * par erreur un test dont la migration pose une règle d'accès, une fonction ou une colonne le
 * ferait sauter sur les PR qui pourraient le casser. Pour chaque test marqué de
 * tests/integration/ : au moins une migration citée, chacune présente, aucune qui touche le
 * schéma ou les règles d'accès (scripts/lib/migrations-de-donnees.ts).
 *
 * Un test NON marqué n'est jamais une erreur : il tourne sur les PR, c'est seulement plus lent.
 *
 * Usage : pnpm check:migrations-de-donnees   (job `paths-filter` de nightly-integration.yml)
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { instructionDeSchema, migrationsCitees, porteLaMention } from './lib/migrations-de-donnees';

// ============================================================================
// Constantes
// ============================================================================

const RACINE = resolve(import.meta.dirname, '..');
const DOSSIER = join(RACINE, 'tests/integration');

// ============================================================================
// Fonctions
// ============================================================================

function testsDe(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true, recursive: true })
		.filter((e) => e.isFile() && e.name.endsWith('.test.ts'))
		.map((e) => join(e.parentPath, e.name))
		.sort();
}

export function erreursDuTest(fichier: string, source: string, racine: string): string[] {
	if (!porteLaMention(source)) return [];
	const migrations = migrationsCitees(source);
	if (migrations.length === 0) return [`${fichier} : marqué, mais ne cite aucune migration`];
	const erreurs: string[] = [];
	for (const migration of migrations) {
		const chemin = join(racine, migration);
		if (!existsSync(chemin)) {
			erreurs.push(`${fichier} : ${migration} introuvable`);
			continue;
		}
		const instruction = instructionDeSchema(readFileSync(chemin, 'utf-8'));
		if (instruction) {
			erreurs.push(
				`${fichier} : ${migration} touche le schéma ou les règles d'accès (« ${instruction} ») — retirer la mention`
			);
		}
	}
	return erreurs;
}

function main(): void {
	const tests = testsDe(DOSSIER);
	let marques = 0;
	const erreurs: string[] = [];
	for (const chemin of tests) {
		const source = readFileSync(chemin, 'utf-8');
		if (porteLaMention(source)) marques++;
		erreurs.push(...erreursDuTest(relative(RACINE, chemin), source, RACINE));
	}
	if (erreurs.length > 0) {
		console.error(`❌ ${erreurs.length} erreur(s) sur les tests de migration de données :`);
		for (const e of erreurs) console.error(`  - ${e}`);
		process.exit(1);
	}
	console.log(`✅ ${marques} tests marqués @migration-de-donnees sur ${tests.length}, tous sûrs.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
