#!/usr/bin/env tsx

/**
 * Création des 13 exercices « Entraînement technique — second degré » (1ʳᵉ spé)
 * =============================================================================
 *
 * Source : ~/Downloads/entrainement_technique_second_degre.tex, découpé par
 * `\section*` et transpilé par `transpileLatexToMarkdown` (le module de la page
 * admin/debug/latex-transpiler), après nettoyage du LaTeX d'entrée. Décisions
 * de David (2026-09-23) : 13 exercices séparés, thème « Second degré » (nouveau),
 * catégorie `automatisme`. Anglais fourni pour chaque énoncé.
 *
 * Passe par `createExercise()` de l'application : slug `second-degre-xxxxxxxx`
 * et valeurs par défaut identiques à l'éditeur.
 *
 * Garde-fous : base = prod ; chaque charge passe `createExerciseSchema` (le
 * schéma de l'API) ; images : aucune ; idempotent (un titre déjà présent dans le
 * thème n'est pas recréé) ; chaque insertion doit rendre sa ligne.
 *
 * Usage :
 *   pnpm tsx scripts/create-exercices-technique-second-degre.ts            # simulation
 *   pnpm tsx scripts/create-exercices-technique-second-degre.ts --publier  # écrit en prod
 *   pnpm tsx scripts/create-exercices-technique-second-degre.ts --verifier # état en prod
 *
 * Rollback : `delete from exercises where topic = 'Second degré' and id in (…)`
 * avec les id affichés à la création.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import { createExercise } from '$lib/server/exercises';
import { isFullyTranslated } from '$lib/exercises/translation-status';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const TOPIC = 'Second degré';
const PUBLIER = process.argv.includes('--publier');
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/technique';

const TITRES = [
	'Identifier les coefficients',
	"Passer d'une forme à une autre",
	'Calculer un discriminant',
	'Résoudre des équations',
	'Factoriser un trinôme',
	'Étudier le signe',
	'Résoudre des inéquations',
	'Déterminer la forme canonique',
	'Extremum et variations',
	'Choisir la bonne forme',
	'Retrouver un trinôme',
	'Vrai ou faux ?',
	'Bilan technique'
];

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);

	const { data: existants, error: errLecture } = await supabase
		.from('exercises')
		.select('id, title, slug, grades, category, shared, variations')
		.eq('topic', TOPIC);
	if (errLecture) throw new Error(`Lecture impossible : ${errLecture.message}`);

	if (process.argv.includes('--verifier')) {
		for (const e of existants ?? []) {
			const ok = isFullyTranslated({
				id: e.id,
				title: e.title ?? '',
				shared: e.shared as never,
				variations: e.variations as never
			});
			console.log(
				`  ${ok ? '✅' : '⛔'} ${e.title} — ${e.slug} — ${e.grades?.join(',')} — ${e.category}`
			);
		}
		console.log(`\n${existants?.length ?? 0} exercice(s) dans « ${TOPIC} ».`);
		return;
	}

	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);
	const dejaLa = new Set((existants ?? []).map((e) => e.title));

	// Phase 1 : tout préparer et valider, ne rien écrire
	const charges = TITRES.map((title, i) => {
		const n = String(i + 1).padStart(2, '0');
		const fr = readFileSync(join(DIR, 'md', `${n}.md`), 'utf8').trim();
		const en = readFileSync(join(DIR, 'en', `${n}.md`), 'utf8').trim();
		if (!fr || !en) throw new Error(`${n} ${title} : énoncé vide`);
		const charge = {
			title,
			topic: TOPIC,
			category: 'automatisme' as const,
			grades: ['1_SPE'],
			is_public: false,
			variations: [
				{
					label: 'guided',
					statement_md: fr,
					solution_md: '.',
					hints: [],
					translations: { en: { statement_md: en } }
				}
			]
		};
		const verdict = createExerciseSchema.safeParse(charge);
		if (!verdict.success)
			throw new Error(`${n} ${title} : Zod refuse — ${verdict.error.issues[0].message}`);
		console.log(
			`  ✓ ${n} ${title}${dejaLa.has(title) ? ' — déjà présent, ignoré' : ''} (${fr.length} car. fr, ${en.length} en)`
		);
		return { n, charge };
	});

	const aCreer = charges.filter((c) => !dejaLa.has(c.charge.title));
	console.log(
		`\n${aCreer.length} exercice(s) à créer, ${charges.length - aCreer.length} déjà présent(s).`
	);
	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	// Phase 2 : écrire
	for (const { n, charge } of aCreer) {
		const { data, error } = await createExercise(supabase, charge as never, DAVID);
		if (error || !data)
			throw new Error(
				`${n} ${charge.title} : création refusée — ${error?.message ?? 'aucune ligne rendue'}`
			);
		console.log(`  ✍️  ${n} ${charge.title} → ${data.id} (${data.slug})`);
	}
	console.log('\n✅ Création terminée.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
