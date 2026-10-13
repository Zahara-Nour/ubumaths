#!/usr/bin/env tsx

/**
 * Suites, terminale spé : exercice « Le flocon de Von Koch » (2026-10-13)
 * =====================================================================
 *
 * Un exercice seul (aucune fiche), catégorie `application`, en brouillon,
 * avec deux variations : guidée (11 questions, récurrence, seuil en Python)
 * et autonome (2 questions, somme géométrique). Notations : c_n côtés,
 * l_n longueur d'un côté, p_n périmètre, a_n aire. Figure des étapes 0 à 2
 * (bloc ```figure). Énoncés et corrigés FR + EN, résultats vérifiés par
 * sympy, rendu PDF compilé par le compilateur de la production, 0 débord.
 *
 * Passe par createExercise(), avec le schéma Zod de la route.
 *
 * Garde-fous : base = prod ; tout est validé AVANT l'écriture ; arrêt si un
 * exercice de même titre existe déjà dans le thème « Suites » ; l'insertion
 * doit rendre sa ligne.
 *
 * Usage :
 *   pnpm tsx scripts/create-flocon-von-koch-tspe.ts            # simulation
 *   pnpm tsx scripts/create-flocon-von-koch-tspe.ts --publier  # écrit en prod
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import { createExercise } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const TOPIC = 'Suites';
const TITRE = 'Le flocon de Von Koch';
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/42af618c-23e6-4765-a2f0-9404109c0d64/scratchpad/koch';

const lire = (p: string) => readFileSync(p, 'utf8').trim();

function variation(fichier: string, label: string) {
	return {
		label,
		statement_md: lire(join(DIR, 'md', fichier)),
		solution_md: lire(join(DIR, 'sol', fichier)),
		hints: [],
		translations: {
			en: {
				statement_md: lire(join(DIR, 'en', fichier)),
				solution_md: lire(join(DIR, 'sol-en', fichier))
			}
		}
	};
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	// --- Phase 1 : tout valider ---------------------------------------------
	const exercice = {
		title: TITRE,
		topic: TOPIC,
		category: 'application' as const,
		grades: ['T_SPE'],
		is_public: false,
		variations: [
			variation('koch-guided.md', 'guided'),
			variation('koch-autonomous.md', 'autonomous')
		]
	};
	const v = createExerciseSchema.safeParse(exercice);
	if (!v.success)
		throw new Error(
			`« ${TITRE} » : Zod refuse — ${v.error.issues[0].path.join('.')} ${v.error.issues[0].message}`
		);

	const { data: existants, error: e0 } = await supabase
		.from('exercises')
		.select('id')
		.eq('topic', TOPIC)
		.eq('title', TITRE);
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	if (existants && existants.length > 0) throw new Error(`« ${TITRE} » existe déjà`);

	for (const va of exercice.variations)
		console.log(
			`  ${va.label} : énoncé ${va.statement_md.length} car., corrigé ${va.solution_md.length} car. (EN ${va.translations.en.statement_md.length} / ${va.translations.en.solution_md.length})`
		);

	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	// --- Phase 2 : écrire ----------------------------------------------------
	const { data, error } = await createExercise(supabase, exercice as never, DAVID);
	if (error || !data)
		throw new Error(`« ${TITRE} » : création refusée — ${error?.message ?? 'aucune ligne'}`);
	console.log(`\n✅ « ${TITRE} » créé en brouillon : ${data.id}`);
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
