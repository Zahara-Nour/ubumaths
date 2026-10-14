#!/usr/bin/env tsx

/**
 * Second degré, 1ʳᵉ spé : exercice d'évaluation « Le parc aquatique » (2026-10-14)
 * ================================================================================
 *
 * À la demande de David : un exercice pour une évaluation qui mélange les types de
 * questions de la fiche « Applications des fonctions polynôme du second degré »
 * (`d6c03510`) — sommet → forme canonique, racine à écarter, inéquation → intervalle,
 * domaine imposé par la situation, variable entière, regard critique sur le modèle.
 * Trois parties indépendantes dans un même contexte ; une seule variante (guidée).
 *
 * L'exercice est créé en brouillon (non public), rangé dans aucune fiche : David
 * l'ajoute lui-même à son évaluation.
 *
 * Garde-fous : base = prod ; Zod validé et titre libre AVANT l'écriture ; la ligne
 * créée doit être rendue, puis relue.
 *
 * Usage :
 *   pnpm tsx scripts/create-evaluation-second-degre-1spe.ts            # simulation
 *   pnpm tsx scripts/create-evaluation-second-degre-1spe.ts --publier  # écrit en prod
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
// Topic des exercices de la fiche d'applications du second degré
const TOPIC = 'Optimisation';
const TITRE = 'Le parc aquatique';

const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/f2116999-53aa-43b1-b92b-02d696355328/scratchpad/eval-sd';

const lire = (fichier: string) => readFileSync(join(DIR, fichier), 'utf8').trim();

const exercice = {
	title: TITRE,
	topic: TOPIC,
	category: 'application' as const,
	grades: ['1_SPE'],
	is_public: false,
	variations: [
		{
			label: 'guided',
			statement_md: lire('enonce-fr.md'),
			solution_md: lire('corrige-fr.md'),
			answers_md: lire('reponses-fr.md'),
			hints: [],
			translations: {
				en: {
					statement_md: lire('enonce-en.md'),
					solution_md: lire('corrige-en.md'),
					answers_md: lire('reponses-en.md')
				}
			}
		}
	]
};

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const v = createExerciseSchema.safeParse(exercice);
	if (!v.success)
		throw new Error(
			`Zod refuse — ${v.error.issues[0].path.join('.')} ${v.error.issues[0].message}`
		);
	const { data: collisions, error: ec } = await supabase
		.from('exercises')
		.select('id')
		.eq('topic', TOPIC)
		.eq('title', TITRE);
	if (ec) throw new Error(`Lecture impossible : ${ec.message}`);
	if (collisions && collisions.length > 0) throw new Error(`« ${TITRE} » existe déjà`);
	console.log(`  ✓ « ${TITRE} » validé (Zod, titre libre)`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée : relancer avec --publier pour écrire.');
		return;
	}

	const { data, error } = await createExercise(supabase, exercice as never, DAVID);
	if (error || !data) throw new Error(`Création refusée — ${error?.message ?? 'aucune ligne'}`);

	const { data: relu, error: er } = await supabase
		.from('exercises')
		.select('id, slug, variations')
		.eq('id', data.id)
		.single();
	if (er || !relu) throw new Error(`Relecture impossible : ${er?.message ?? 'aucune ligne'}`);
	const [variation] = relu.variations as { answers_md?: string }[];
	if (variation?.answers_md !== exercice.variations[0].answers_md)
		throw new Error('Relecture : les réponses enregistrées diffèrent');
	console.log(`  ✍️  créé et relu : ${relu.id} (slug ${relu.slug})`);
}

main().catch((e: unknown) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
