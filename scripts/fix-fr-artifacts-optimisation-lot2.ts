#!/usr/bin/env tsx

/**
 * Scories d'écriture dans les énoncés français « Optimisation » du 23/09/2026 (lot 2)
 * =================================================================================
 *
 * Copie de fix-fr-artifacts-optimisation.ts, mêmes garde-fous. Deux défauts
 * repérés à la traduction anglaise :
 *
 *  1. « Construction d'une arche » : `**3 m de large **et` et `**3,20 m de haut **doit` —
 *     l'espace avant le `**` fermant empêche le gras de se fermer, les `**`
 *     s'affichent littéralement.
 *  2. « Un tir au but » : `un lob.Au moment` — espace manquant après le point.
 *
 * L'anglais n'est pas concerné et le script vérifie qu'il ressort intact.
 *
 * Usage :
 *   pnpm tsx scripts/fix-fr-artifacts-optimisation-lot2.ts            # simulation
 *   pnpm tsx scripts/fix-fr-artifacts-optimisation-lot2.ts --publier  # écrit en prod
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { marked } from 'marked';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DIR_SAUVEGARDE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad';

const ARCHE = '70636c59-9e46-4c27-998f-e3a1ad60c220';
const TIR_AU_BUT = '2377a0bd-d962-4f14-a064-28e61195158a';

/** md5 de l'énoncé français AVANT correction, relevé sur la prod le 2026-09-23. */
const CORRECTIONS = [
	{
		id: ARCHE,
		titre: 'Construction d’une arche',
		idx: 0,
		md5: '23c330ddde8f4da698ced2fddeadc71a',
		remplacements: [
			{ de: '**3 m de large **et', vers: '**3 m de large** et', fois: 1 },
			{ de: '**3,20 m de haut **doit', vers: '**3,20 m de haut** doit', fois: 1 }
		]
	},
	{
		id: TIR_AU_BUT,
		titre: 'Un tir au but',
		idx: 0,
		md5: '1b2291b8cf47eeb0f6b38aee72f7bd60',
		remplacements: [{ de: 'un lob.Au moment', vers: 'un lob. Au moment', fois: 1 }]
	}
] as const;

type Variation = Record<string, unknown>;

const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');
const occurrences = (texte: string, motif: string) => texte.split(motif).length - 1;

/** Nombre de `**` que marked n'a pas su transformer en gras. */
function etoilesResiduelles(markdown: string): number {
	return (marked.parse(markdown, { async: false }).match(/\*\*/g) ?? []).length;
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);

	const supabase = createClient<Database>(url, cle);
	const ids = [...new Set(CORRECTIONS.map((c) => c.id))];

	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: exercices, error } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.in('id', ids);
	if (error) throw new Error(`Lecture impossible : ${error.message}`);
	if (!exercices || exercices.length !== ids.length) throw new Error('Exercices manquants');

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-fr-avant-correction-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde avant correction : ${sauvegarde}\n`);

	const aEcrire = new Map<string, Variation[]>();

	for (const id of ids) {
		const exercice = exercices.find((e) => e.id === id)!;
		const variations = structuredClone(exercice.variations) as Variation[];

		for (const correction of CORRECTIONS.filter((c) => c.id === id)) {
			const variation = variations[correction.idx];
			const avant = String(variation.statement_md ?? '');

			if (md5(avant) !== correction.md5) {
				throw new Error(
					`${correction.titre} #${correction.idx} : l'énoncé a changé depuis sa lecture (md5 ${md5(avant)}).`
				);
			}

			let apres = avant;
			for (const { de, vers, fois } of correction.remplacements) {
				const trouvees = occurrences(apres, de);
				if (trouvees !== fois) {
					throw new Error(
						`${correction.titre} #${correction.idx} : « ${de} » trouvé ${trouvees} fois, ${fois} attendue(s).`
					);
				}
				apres = apres.split(de).join(vers);
			}

			// Preuve positive : plus aucun `**` ne survit au rendu.
			const avantEtoiles = etoilesResiduelles(avant);
			const apresEtoiles = etoilesResiduelles(apres);
			if (apresEtoiles !== 0) {
				throw new Error(
					`${correction.titre} #${correction.idx} : ${apresEtoiles} « ** » survivent encore au rendu.`
				);
			}

			// L'anglais ne doit pas bouger d'un octet.
			const enAvant =
				(variation.translations as { en?: { statement_md?: string } })?.en?.statement_md ?? '';

			variations[correction.idx] = { ...variation, statement_md: apres };

			const enApres =
				(variations[correction.idx].translations as { en?: { statement_md?: string } })?.en
					?.statement_md ?? '';
			if (enAvant !== enApres)
				throw new Error(`${correction.titre} #${correction.idx} : la traduction anglaise a bougé.`);

			const verdict = exerciseVariationSchema.safeParse(variations[correction.idx]);
			if (!verdict.success) {
				throw new Error(
					`${correction.titre} #${correction.idx} : Zod refuse — ${verdict.error.issues[0].message}`
				);
			}

			console.log(
				`  ✓ ${correction.titre} #${correction.idx} : ${correction.remplacements.length} correction(s), ` +
					`« ** » résiduels ${avantEtoiles} → ${apresEtoiles}`
			);
		}

		aEcrire.set(id, variations);
	}

	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	for (const [id, variations] of aEcrire) {
		const { data, error: err } = await supabase
			.from('exercises')
			.update({ variations })
			.eq('id', id)
			.select('id');
		if (err) throw new Error(`${id} : écriture refusée — ${err.message}`);
		if (!data || data.length !== 1)
			throw new Error(`${id} : ${data?.length ?? 0} ligne mise à jour, 1 attendue`);
		console.log(`  ✍️  ${id} mis à jour`);
	}

	console.log('\n✅ Correction terminée.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
