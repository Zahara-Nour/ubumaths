/**
 * Fabriquer la migration de CONTENU des modèles PUBLIÉS d'un lot
 * ==============================================================
 *
 * `create-questions --mettre-a-jour` ne touche jamais un modèle publié : une variation ajoutée ou
 * corrigée sur un publié passe par une migration. Ce script la fabrique pour tout le lot :
 *  - relève en PROD (lecture seule) chaque modèle du dossier, apparié par l'id de son fichier
 *    (titre et niveau doivent concorder) ;
 *  - brouillon → ignoré ; publié identique au fichier → rien ; publié qui diffère → migré ;
 *  - refus de tout le lot (rien n'est écrit) : fichier sans id, id absent, titre ou niveau
 *    différents, variation retirée ou déplacée, autre champ que variations / specs / description /
 *    options différent de la prod, `checkTemplate` en échec (il rejoue toutes les specs, anciennes
 *    comprises : des options changées jugent aussi les variations déjà en prod) ;
 *  - écrit `supabase/migrations/<horodatage>_questions_<lot>_contenu.sql` et sa fixture
 *    `tests/integration/fixtures/contenu-publie/<même nom>.json`, rejouée par
 *    `tests/integration/migrations-contenu-publie.test.ts`.
 * Règles et SQL : `scripts/lib/migration-contenu.ts`. N'écrit jamais en base.
 *
 *   pnpm tsx scripts/questions/migration-contenu.ts --dir scripts/questions/<lot>
 *
 * Base lue : `.env` (la PROD) — exigée : la garde de la migration est le contenu de la prod.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkTemplate } from '#lib/questions/review/check-template.ts';
import { createScriptClient } from '../relecture/common';
import { apparierLot, idsDuLot, lireLot, valeurArgument } from '../lib/lot-questions';
import {
	examinerModele,
	genererMigration,
	nomMigration,
	type FixtureContenu,
	type LigneProd,
	type ModeleMigre
} from '../lib/migration-contenu';

const COLONNES =
	'id, title, level, status, grades, delay, options, shared, default_display_options, exercise_instruction, description, variations, test_specs';
const FIXTURES = 'tests/integration/fixtures/contenu-publie';

async function main(): Promise<number> {
	const dossier = valeurArgument(process.argv, '--dir');
	if (!dossier) {
		console.error('Usage : pnpm tsx scripts/questions/migration-contenu.ts --dir <dossier>');
		return 2;
	}
	const lot = lireLot(dossier);
	const { supabase, target } = createScriptClient(false);
	if (!target.startsWith('PRODUCTION')) {
		console.error(
			`⛔ base ${target} : le contenu à garder se relève en PROD (.env, sans .env.local)`
		);
		return 1;
	}
	console.log(`🔍 relevé — base ${target}\n`);

	const { data, error } = await supabase
		.from('question_templates')
		.select(COLONNES)
		.in('id', idsDuLot(lot));
	if (error) throw new Error(`lecture impossible — ${error.message}`);
	const appariement = apparierLot(lot, (data ?? []) as LigneProd[]);
	if (!appariement.ok) {
		for (const e of appariement.erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé, rien n'est écrit`);
		return 1;
	}

	const erreurs: string[] = [];
	const migres: ModeleMigre[] = [];
	for (const { fichier, modele, ligne } of appariement.paires) {
		const examen = examinerModele(fichier, modele, ligne);
		const id8 = ligne.id.slice(0, 8);
		if (examen.sorte === 'refuse') {
			erreurs.push(examen.erreur);
		} else if (examen.sorte === 'ignore') {
			console.log(`  ${id8} ignoré    ${fichier} — ${examen.raison}`);
		} else if (examen.sorte === 'inchange') {
			console.log(`  ${id8} inchangé  ${fichier}`);
		} else {
			const rapport = checkTemplate(modele);
			if (!rapport.passed) {
				erreurs.push(`${fichier} : checkTemplate — ${rapport.reasons.join(' ; ')}`);
				continue;
			}
			const c = examen.modele.changements;
			console.log(
				`  ${id8} migré     ${fichier} — +${c.ajoutees.length} variation(s), ${c.corrigees.length} corrigée(s)${c.corrigees.length > 0 ? ` (⚠️ n° ${c.corrigees.join(', ')} : relire leur diff, \`git diff\` du fichier)` : ''}${c.specs ? ', specs' : ''}${c.description ? ', description' : ''}${c.options ? ', ⚠️ options (jugent toutes les variations)' : ''}`
			);
			migres.push(examen.modele);
		}
	}
	if (erreurs.length > 0) {
		for (const e of erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé, rien n'est écrit`);
		return 1;
	}
	if (migres.length === 0) {
		console.log(`\nAucun modèle publié ne diffère de la prod : pas de migration.`);
		return 0;
	}

	const horodatage = execFileSync(
		'bash',
		['scripts/garde-migrations-horodatage.sh', '--prochain'],
		{
			encoding: 'utf8'
		}
	).trim();
	if (!/^\d{14}$/.test(horodatage)) throw new Error(`horodatage illisible : « ${horodatage} »`);
	const nom = nomMigration(horodatage, dossier);
	const migration = `supabase/migrations/${nom}.sql`;
	const date = new Date().toISOString().slice(0, 10);
	const lotNom = dossier.replace(/\/+$/, '').split('/').at(-1) ?? dossier;
	const sql = genererMigration({ lot: lotNom, source: dossier, date }, migres);
	const fixture: FixtureContenu = { migration, modeles: migres };
	// Fixture d'abord : une migration sans sa fixture ne serait jamais rejouée par le test
	mkdirSync(FIXTURES, { recursive: true });
	writeFileSync(join(FIXTURES, `${nom}.json`), `${JSON.stringify(fixture, null, '\t')}\n`);
	writeFileSync(migration, sql);
	console.log(`\n✓ ${migration}\n✓ ${join(FIXTURES, `${nom}.json`)}`);
	console.log(`  test : pnpm test:integration tests/integration/migrations-contenu-publie.test.ts`);
	return 0;
}

main().then(
	(code) => process.exit(code),
	(e: unknown) => {
		console.error(e);
		process.exit(1);
	}
);
