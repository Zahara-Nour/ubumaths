#!/usr/bin/env tsx

/**
 * Corrigés des 28 variations d'exercices EXISTANTS sans corrigé (solution « a » ou
 * « pas de solution pour le moment ») des fiches second degré / suites / exponentielle (2026-09-24)
 * ==========================================================================
 *
 * Remplace la solution provisoire « . » de chaque variation et ajoute
 * `translations.en.solution_md`. Résultats vérifiés par calcul formel ; rendu
 * PDF compilé (FR et EN) sans erreur de formule.
 *
 * Garde-fous : base = prod ; énoncé identique à celui lu (sinon arrêt) ;
 * solution encore égale à « . » (on n'écrase jamais un corrigé rédigé) ;
 * schéma Zod de l'API ; sauvegarde ; l'UPDATE doit rendre sa ligne.
 *
 * Usage :
 *   pnpm tsx scripts/add-corriges-exercices-existants.ts            # simulation
 *   pnpm tsx scripts/add-corriges-exercices-existants.ts --publier  # écrit en prod
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
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/manq';

type Entree = { key: string; id: string; title: string; idx: number; solution: string };
type Variation = Record<string, unknown>;

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as Entree[];
	const ids = [...new Set(index.map((e) => e.id))];
	const { data: exercices, error } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.in('id', ids);
	if (error || exercices?.length !== ids.length)
		throw new Error(`Lecture impossible : ${error?.message ?? 'exercices manquants'}`);

	const sauvegarde = join(DIR, `backup-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	const aEcrire: { id: string; title: string; variations: Variation[] }[] = [];
	for (const ex of exercices) {
		const variations = structuredClone(ex.variations) as Variation[];
		for (const e of index.filter((i) => i.id === ex.id)) {
			const v = variations[e.idx];
			if (String(v.statement_md) !== readFileSync(join(DIR, 'md', `${e.key}.md`), 'utf8')) {
				throw new Error(`${ex.title} #${e.idx} : l'énoncé a changé depuis sa lecture`);
			}
			if (String(v.solution_md) !== e.solution)
				throw new Error(`${ex.title} #${e.idx} : une solution existe déjà`);
			const tr = (v.translations ?? {}) as Record<string, Record<string, unknown>>;
			variations[e.idx] = {
				...v,
				solution_md: readFileSync(join(DIR, 'sol', `${e.key}.md`), 'utf8').trim(),
				translations: {
					...tr,
					en: {
						...tr.en,
						solution_md: readFileSync(join(DIR, 'sol-en', `${e.key}.md`), 'utf8').trim()
					}
				}
			};
			const z = exerciseVariationSchema.safeParse(variations[e.idx]);
			if (!z.success)
				throw new Error(`${ex.title} #${e.idx} : Zod refuse — ${z.error.issues[0].message}`);
			console.log(`  ✓ ${ex.title} #${e.idx}`);
		}
		aEcrire.push({ id: ex.id, title: ex.title ?? '', variations });
	}

	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}
	for (const { id, title, variations } of aEcrire) {
		const { data, error: err } = await supabase
			.from('exercises')
			.update({ variations })
			.eq('id', id)
			.select('id');
		if (err || data?.length !== 1)
			throw new Error(
				`${title} : écriture refusée — ${err?.message ?? `${data?.length ?? 0} ligne`}`
			);
		console.log(`  ✍️  ${title}`);
	}
	console.log('\n✅ Corrigés écrits.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
