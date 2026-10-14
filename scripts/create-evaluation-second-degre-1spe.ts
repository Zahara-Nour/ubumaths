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
 * l'ajoute lui-même à son évaluation. Trois schémas (FR + EN), dessinés pour
 * l'occasion (SVG → PNG), illustrent les trois parties.
 *
 * Relancé alors que l'exercice existe déjà, le script met à jour ses variations
 * (ajout des schémas, 2026-10-14) : l'état d'avant est sauvegardé en JSON.
 *
 * Garde-fous : base = prod ; Zod validé et images présentes AVANT l'écriture ; une
 * image déjà en ligne n'est pas remplacée ; chaque écriture doit rendre sa ligne,
 * puis est relue.
 *
 * Usage :
 *   pnpm tsx scripts/create-evaluation-second-degre-1spe.ts            # simulation
 *   pnpm tsx scripts/create-evaluation-second-degre-1spe.ts --publier  # écrit en prod
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import { createExercise } from '$lib/server/exercises';
import type { Database, Json } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
// Topic des exercices de la fiche d'applications du second degré
const TOPIC = 'Optimisation';
const TITRE = 'Le parc aquatique';
const BUCKET = 'exercise-images';
const IMAGES = ['parc-jet', 'parc-pique-nique', 'parc-billet'].flatMap((n) => [
	`${n}.png`,
	`${n}-en.png`
]);

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
	const { data: existants, error: ec } = await supabase
		.from('exercises')
		.select('id, variations')
		.eq('topic', TOPIC)
		.eq('title', TITRE);
	if (ec) throw new Error(`Lecture impossible : ${ec.message}`);
	if (existants && existants.length > 1) throw new Error(`« ${TITRE} » existe en double`);
	const existant = existants?.[0];
	const images = IMAGES.map((nom) => ({ nom, contenu: readFileSync(join(DIR, 'png', nom)) }));
	for (const nom of IMAGES)
		for (const v of exercice.variations)
			if (![v.statement_md, v.translations.en.statement_md].some((t) => t.includes(nom)))
				throw new Error(`Image « ${nom} » absente des énoncés`);
	console.log(
		`  ✓ « ${TITRE} » validé (Zod, ${images.length} images) — ${existant ? `mise à jour de ${existant.id}` : 'création'}`
	);

	if (!PUBLIER) {
		console.log('\nSimulation terminée : relancer avec --publier pour écrire.');
		return;
	}

	const prefixe = `${url}/storage/v1/object/public/${BUCKET}/${DAVID}/`;
	for (const i of images) {
		const deja = await fetch(prefixe + i.nom, { method: 'HEAD' });
		if (deja.ok) {
			console.log(`  · ${i.nom} déjà en ligne, laissé tel quel`);
			continue;
		}
		const { error } = await supabase.storage
			.from(BUCKET)
			.upload(`${DAVID}/${i.nom}`, i.contenu, { contentType: 'image/png', upsert: false });
		if (error) throw new Error(`Image « ${i.nom} » refusée — ${error.message}`);
		const r = await fetch(prefixe + i.nom, { method: 'HEAD' });
		if (!r.ok) throw new Error(`Image « ${i.nom} » envoyée mais illisible (${r.status})`);
		console.log(`  ✍️  ${i.nom} envoyée et relue`);
	}

	let id: string;
	if (existant) {
		const sauvegarde = join(DIR, `sauvegarde-${Date.now()}.json`);
		writeFileSync(sauvegarde, JSON.stringify(existant, null, 2));
		const { data, error } = await supabase
			.from('exercises')
			.update({ variations: exercice.variations as unknown as Json })
			.eq('id', existant.id)
			.select('id');
		if (error || !data || data.length !== 1)
			throw new Error(`Mise à jour refusée — ${error?.message ?? 'aucune ligne'}`);
		id = existant.id;
		console.log(`  ✍️  variations mises à jour (avant : ${sauvegarde})`);
	} else {
		const { data, error } = await createExercise(supabase, exercice as never, DAVID);
		if (error || !data) throw new Error(`Création refusée — ${error?.message ?? 'aucune ligne'}`);
		id = data.id;
	}

	const { data: relu, error: er } = await supabase
		.from('exercises')
		.select('id, slug, variations')
		.eq('id', id)
		.single();
	if (er || !relu) throw new Error(`Relecture impossible : ${er?.message ?? 'aucune ligne'}`);
	if (JSON.stringify(relu.variations) === JSON.stringify(exercice.variations))
		console.log(`  ✓ relu : ${relu.id} (slug ${relu.slug})`);
	else {
		const [v] = relu.variations as { statement_md?: string; answers_md?: string }[];
		if (
			v?.statement_md !== exercice.variations[0].statement_md ||
			v?.answers_md !== exercice.variations[0].answers_md
		)
			throw new Error('Relecture : les variations enregistrées diffèrent');
		console.log(`  ✓ relu : ${relu.id} (slug ${relu.slug})`);
	}
}

main().catch((e: unknown) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
