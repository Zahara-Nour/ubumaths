#!/usr/bin/env tsx

/**
 * Scories d'écriture dans les énoncés français « Optimisation » du 21/09/2026
 * ==========================================================================
 *
 * Trois défauts repérés après la traduction anglaise, tous invisibles au
 * typecheck et aux tests (ce sont des chaînes en base) :
 *
 *  1. `**8 euros **` / `**10 euros **` — l'espace avant le `**` fermant empêche
 *     le gras de se fermer : marked recrache les `**` littéralement. Vérifié sur
 *     le rendu, pas déduit de la spec.
 *  2. `~B(x)~de` — espace manquant après la maths inline, « B(x)de » collé.
 *  3. `$$p=70-0,5x$$` face à `$-0.5x^2+60x-800$` dans le MÊME énoncé. Unifié sur
 *     le point, décision de David du 2026-09-22 : c'est ce qu'il écrit partout
 *     ailleurs dans le balisage mathématique (~0.85~, $f(x)=5.9$, $[0~;~3.6]$).
 *
 * L'anglais n'est pas concerné (il a été écrit correct d'emblée) et le script
 * vérifie qu'il ressort intact.
 *
 * Garde-fous : empreinte md5 de l'énoncé avant correction, nombre d'occurrences
 * de chaque remplacement imposé, rendu sans `**` résiduel après coup, schéma Zod
 * de l'API, et comptage des lignes rendues par l'UPDATE (un refus RLS rend zéro
 * ligne sans erreur).
 *
 * Usage :
 *   pnpm tsx scripts/fix-fr-artifacts-optimisation.ts            # simulation
 *   pnpm tsx scripts/fix-fr-artifacts-optimisation.ts --publier  # écrit en prod
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
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/d6f3a971-bcc5-4e6d-bff5-fcadea824914/scratchpad';

const CINEMA = '14298907-6ac7-447a-baf6-a1199e06aefa';
const BENEFICE = '0b211ae1-d516-42c1-a43b-e63df77a55d7';

/** md5 de l'énoncé français AVANT correction, relevé sur la prod le 2026-09-22. */
const CORRECTIONS = [
	{
		id: CINEMA,
		titre: 'Prix des places de cinéma',
		idx: 0,
		md5: 'bea98c4516de58e86e92875379d2331e',
		remplacements: [{ de: '**8 euros **et', vers: '**8 euros** et', fois: 1 }]
	},
	{
		id: CINEMA,
		titre: 'Prix des places de cinéma',
		idx: 1,
		md5: 'a5e02403f7e288d94c5d90899ab37890',
		remplacements: [{ de: '**8 euros **et', vers: '**8 euros** et', fois: 1 }]
	},
	{
		id: CINEMA,
		titre: 'Prix des places de cinéma',
		idx: 2,
		md5: '37032202fdd71ea995194bf82118f13f',
		remplacements: [{ de: '**8 euros **et', vers: '**8 euros** et', fois: 1 }]
	},
	{
		id: BENEFICE,
		titre: 'Bénéfice d’une entreprise',
		idx: 0,
		md5: '21d2a037cac51df94c3a0f0e10edd864',
		remplacements: [
			{ de: '**10 euros **et', vers: '**10 euros** et', fois: 1 },
			{ de: '~B(x)~de', vers: '~B(x)~ de', fois: 1 },
			{ de: '$$p=70-0,5x$$', vers: '$$p=70-0.5x$$', fois: 1 }
		]
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
