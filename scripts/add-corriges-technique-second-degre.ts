#!/usr/bin/env tsx

/**
 * Corrigés des 13 exercices « Entraînement technique — second degré » (1ʳᵉ spé)
 * ============================================================================
 *
 * Remplace la solution provisoire « . » de `variations[0]` par le corrigé
 * français, et ajoute `translations.en.solution_md`. Résultats vérifiés par
 * calcul formel (sympy) ; rendu PDF compilé en français et en anglais.
 *
 * Garde-fous : base = prod ; l'énoncé en base doit être celui créé par
 * create-exercices-technique-second-degre.ts (sinon arrêt) ; la solution en
 * base doit encore valoir « . » (on n'écrase jamais un corrigé rédigé entre-temps) ;
 * schéma Zod de l'API ; sauvegarde des variations d'origine ; l'UPDATE doit
 * rendre sa ligne (un refus RLS rend zéro ligne sans erreur).
 *
 * Usage :
 *   pnpm tsx scripts/add-corriges-technique-second-degre.ts            # simulation
 *   pnpm tsx scripts/add-corriges-technique-second-degre.ts --publier  # écrit en prod
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/technique';

/** Identifiants rendus par la création du 2026-09-23, dans l'ordre du .tex. */
const IDS = [
	'870701ff-2f8b-47fa-9987-711e0e8c4ded',
	'ec591bf4-d99a-46c7-871e-7dcea1de6108',
	'2fc02476-8006-4668-8dec-e0def88db7c5',
	'7b18366a-c627-4b99-98cf-01079685a2de',
	'13a27a9a-25b2-452c-85fe-0d2e605a3d34',
	'fc86df6e-c5cb-4aca-8b02-732ff4ce5955',
	'550deff7-e22d-4016-906b-159733132082',
	'8ab20683-a86f-46ee-a3af-b530572520cd',
	'cfba77e1-a9f6-40fa-989b-727fcd63a949',
	'a6c50f8c-c3c6-444a-88e9-7bdc0fa2a076',
	'a10faa1d-74a3-4639-92e1-e632d36ae84a',
	'faa2a6f8-877d-446e-9049-8c6af9839f86',
	'53026bc7-d9af-40da-848c-f0adaf84a6aa'
];

type Variation = Record<string, unknown>;

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);

	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: exercices, error } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.in('id', IDS);
	if (error) throw new Error(`Lecture impossible : ${error.message}`);
	if (!exercices || exercices.length !== IDS.length)
		throw new Error(`${exercices?.length ?? 0} exercices lus sur ${IDS.length}`);

	const sauvegarde = join(DIR, `backup-corriges-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	// Phase 1 : tout vérifier
	const aEcrire: { id: string; title: string; variations: Variation[] }[] = [];
	IDS.forEach((id, i) => {
		const n = String(i + 1).padStart(2, '0');
		const exercice = exercices.find((e) => e.id === id)!;
		const variations = structuredClone(exercice.variations) as Variation[];
		if (!Array.isArray(variations) || variations.length !== 1)
			throw new Error(`${exercice.title} : 1 variation attendue`);
		const v = variations[0];

		const enonce = readFileSync(join(DIR, 'md', `${n}.md`), 'utf8').trim();
		if (String(v.statement_md).trim() !== enonce)
			throw new Error(`${exercice.title} : l'énoncé a changé depuis sa création`);
		if (String(v.solution_md).trim() !== '.')
			throw new Error(`${exercice.title} : une solution existe déjà, rien n'est écrasé`);

		const fr = readFileSync(join(DIR, 'sol', `${n}.md`), 'utf8').trim();
		const en = readFileSync(join(DIR, 'sol-en', `${n}.md`), 'utf8').trim();
		const traductions = (v.translations ?? {}) as Record<string, Record<string, unknown>>;
		variations[0] = {
			...v,
			solution_md: fr,
			translations: { ...traductions, en: { ...traductions.en, solution_md: en } }
		};
		const verdict = exerciseVariationSchema.safeParse(variations[0]);
		if (!verdict.success)
			throw new Error(`${exercice.title} : Zod refuse — ${verdict.error.issues[0].message}`);
		console.log(`  ✓ ${n} ${exercice.title} : ${fr.length} car. fr, ${en.length} en`);
		aEcrire.push({ id, title: exercice.title ?? '', variations });
	});

	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	// Phase 2 : écrire
	for (const { id, title, variations } of aEcrire) {
		const { data, error: err } = await supabase
			.from('exercises')
			.update({ variations })
			.eq('id', id)
			.select('id');
		if (err) throw new Error(`${title} : écriture refusée — ${err.message}`);
		if (!data || data.length !== 1)
			throw new Error(`${title} : ${data?.length ?? 0} ligne mise à jour, 1 attendue`);
		console.log(`  ✍️  ${title}`);
	}
	console.log('\n✅ Corrigés écrits.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
