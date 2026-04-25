/**
 * Import XML fixtures as DSL constructions into Supabase.
 *
 * Reads the XML fixtures from extern/instrumenpoche-main/devServer/fixtures/,
 * converts them to DSL using the new converter, and inserts them into the
 * constructions table with format='dsl'.
 *
 * Usage: npx tsx scripts/import-fixtures-to-dsl.ts [--dry-run]
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { convertXmlToDsl } from '../src/lib/constructions-v2/converter';
import 'dotenv/config';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'https://aqtijumsgfufoztohdua.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
	console.error('SUPABASE_SERVICE_ROLE_KEY is required in .env');
	process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

const FIXTURE_TITLES: Record<string, string> = {
	'0.xml': 'Calcul mental : Ajouter 19',
	'1.xml': 'Partage d\'un segment en 3 parts egales',
	'2.xml': 'Calcul mental : Soustraire 99',
	'3.xml': 'Construction d\'un carre',
	'4.xml': 'Texte MathJax',
	'5.xml': 'Points avec images',
	'6.xml': 'Parallelogramme par ses diagonales',
	'7.xml': 'Symetrique d\'un point par rapport a une droite',
	'8.xml': 'Marques sur segment'
};

async function main() {
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY!);
	const fixturesDir = resolve('extern/instrumenpoche-main/devServer/fixtures');
	const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.xml')).sort();

	console.log(`Mode: ${dryRun ? 'DRY RUN' : 'INSERTION'}`);
	console.log(`${files.length} fichiers XML a convertir\n`);

	// Get an author_id — use the first admin/teacher profile
	const { data: profiles } = await supabase
		.from('profiles')
		.select('id')
		.limit(1)
		.single();

	const authorId = profiles?.id;
	if (!authorId) {
		console.error('Aucun profil trouve en base. Impossible d\'assigner un auteur.');
		process.exit(1);
	}
	console.log(`Auteur: ${authorId}\n`);

	let successCount = 0;
	let errorCount = 0;

	for (const file of files) {
		const title = FIXTURE_TITLES[file] ?? file.replace('.xml', '');
		console.log(`--- ${file}: ${title} ---`);

		const xml = readFileSync(resolve(fixturesDir, file), 'utf-8');
		const result = await convertXmlToDsl(xml);

		if (!result.success || !result.dsl) {
			console.error(`  ERREUR conversion: ${result.errors.join(', ')}`);
			errorCount++;
			continue;
		}

		const lineCount = result.dsl.split('\n').length;
		console.log(`  ${lineCount} lignes DSL, ${result.warnings.length} warnings`);

		if (dryRun) {
			console.log('  (dry run — pas d\'insertion)');
			successCount++;
			continue;
		}

		const { data, error } = await supabase
			.from('constructions')
			.insert({
				title,
				description: `Converti depuis InstrumenPoche (${file})`,
				format: 'dsl',
				script: {},
				dsl_script: result.dsl,
				author_id: authorId,
				is_public: true,
				tags: ['instrumenpoche', 'import']
			})
			.select('id')
			.single();

		if (error) {
			console.error(`  ERREUR insertion: ${error.message}`);
			errorCount++;
		} else {
			console.log(`  OK — id: ${data.id}`);
			successCount++;
		}
	}

	console.log(`\nResultat: ${successCount} succes, ${errorCount} erreurs`);
}

main().catch(console.error);
