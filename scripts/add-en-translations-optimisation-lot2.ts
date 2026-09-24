#!/usr/bin/env tsx

/**
 * Traduction anglaise des exercices « Optimisation » du 23/09/2026 (lot 2)
 * =======================================================================
 *
 * Ajoute `variations[0].translations.en.statement_md` aux 6 exercices de
 * modélisation par le second degré ajoutés le 23/09 (javelot, basket, lob,
 * distance d'arrêt, jet d'eau, arche). Copie de add-en-translations-optimisation.ts. Le français n'est jamais touché :
 * l'anglais est une surcouche, et `resolveExerciseVariationWithShared()` retombe
 * sur le français pour tout ce que la traduction ne couvre pas.
 *
 * `solution_md` vaut « . » partout (placeholder) : rien à traduire, et
 * `untranslatedVariationIndices()` ne juge que l'énoncé.
 *
 * Garde-fous, dans cet ordre :
 *  1. la base visée doit être la prod (sinon on écrit dans le vide) ;
 *  2. chaque énoncé français doit avoir l'empreinte md5 relevée à la lecture —
 *     si David a retouché un énoncé entre-temps, le script s'arrête AVANT toute
 *     écriture plutôt que de traduire un texte qu'il n'a pas lu ;
 *  3. toute URL d'image de l'anglais doit exister mot pour mot dans le français ;
 *  4. la variation résultante doit passer `exerciseVariationSchema` — le schéma
 *     Zod que l'API applique réellement, pas une relecture à la main ;
 *  5. l'UPDATE renvoie ses lignes (`.select()`) et on les compte : un refus RLS
 *     rend zéro ligne SANS erreur.
 *
 * Idempotent : une variation déjà traduite à l'identique est laissée en place.
 *
 * Usage :
 *   pnpm tsx scripts/add-en-translations-optimisation-lot2.ts            # simulation
 *   pnpm tsx scripts/add-en-translations-optimisation-lot2.ts --publier  # écrit en prod
 *
 * Rollback : le script écrit une sauvegarde JSON des `variations` d'origine
 * avant toute écriture, et son chemin est affiché.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import { isFullyTranslated, untranslatedVariationIndices } from '$lib/exercises/translation-status';
import type { Database } from '$lib/types/database';

// .env = production (EU). .env.local pointe sur le Supabase local : surtout pas lui.
config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';

const PUBLIER = process.argv.includes('--publier');
const DIR_EN =
	process.argv.find((a) => a.startsWith('--dir='))?.slice('--dir='.length) ??
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/en2';

/** Empreintes relevées sur la prod le 2026-09-23, avant toute écriture. */
const ATTENDU = [
	{
		id: 'e363da04-d18c-43bb-b7ee-a79dea1bc808',
		titre: 'Lancer de javelot',
		idx: 0,
		label: 'guided',
		md5: '1bc801cb4c2f39afc54e07addf95f068'
	},
	{
		id: 'b3a78fec-b7aa-4ae6-8084-931812e25602',
		titre: 'Un tir au basket',
		idx: 0,
		label: 'guided',
		md5: '9dec1b8440e73930736d9fe58dc718fa'
	},
	{
		id: '2377a0bd-d962-4f14-a064-28e61195158a',
		titre: 'Un tir au but',
		idx: 0,
		label: 'guided',
		md5: '1b2291b8cf47eeb0f6b38aee72f7bd60'
	},
	{
		id: '761c1f98-f4bc-4d4c-b449-440e74359db7',
		titre: 'Distance d’arrêt d’une voiture',
		idx: 0,
		label: 'guided',
		md5: '1b5f3b65bc9ca7892e09d9bce3d9979b'
	},
	{
		id: '3230fa25-901a-41c6-816d-a2f5909684bd',
		titre: 'Un jet d’eau',
		idx: 0,
		label: 'guided',
		md5: 'd795cdc0184f3309b367bdbb13328992'
	},
	{
		id: '70636c59-9e46-4c27-998f-e3a1ad60c220',
		titre: 'Construction d’une arche',
		idx: 0,
		label: 'guided',
		md5: '23c330ddde8f4da698ced2fddeadc71a'
	}
] as const;

type Variation = Record<string, unknown>;

const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');

/** URLs d'images du markdown, pour vérifier qu'aucune n'a été réécrite. */
function urlsImages(markdown: string): string[] {
	return [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);

	const supabase = createClient<Database>(url, cle);
	const ids = [...new Set(ATTENDU.map((a) => a.id))];

	// --verifier : on interroge le module qui décide ce qui est « non traduit »
	// dans l'UI des fiches, plutôt que de rejouer sa règle à la main.
	if (process.argv.includes('--verifier')) {
		const { data, error: err } = await supabase
			.from('exercises')
			.select('id, title, shared, variations')
			.in('id', ids);
		if (err) throw new Error(`Lecture impossible : ${err.message}`);

		let complets = 0;
		for (const exercice of data ?? []) {
			const traduisible = {
				id: exercice.id,
				title: exercice.title ?? '',
				shared: exercice.shared as never,
				variations: exercice.variations as never
			};
			const manquantes = untranslatedVariationIndices(traduisible);
			const complet = isFullyTranslated(traduisible);
			if (complet) complets++;
			console.log(
				`  ${complet ? '✅' : '⛔'} ${exercice.title} — variations encore en français : ` +
					`${manquantes.length ? manquantes.join(', ') : 'aucune'}`
			);
		}
		console.log(`\n${complets}/${data?.length ?? 0} exercices entièrement traduits.`);
		return;
	}

	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: exercices, error } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.in('id', ids);
	if (error) throw new Error(`Lecture impossible : ${error.message}`);
	if (!exercices || exercices.length !== ids.length) {
		throw new Error(`${exercices?.length ?? 0} exercices lus sur ${ids.length} attendus`);
	}

	// Sauvegarde AVANT toute vérification : si le script casse en route, l'état
	// d'origine est déjà sur le disque.
	const sauvegarde = join(DIR_EN, `../backup-variations-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde des variations d'origine : ${sauvegarde}\n`);

	// --- Phase 1 : tout vérifier, ne rien écrire -----------------------------
	const aEcrire = new Map<string, Variation[]>();
	let inchangees = 0;

	for (const id of ids) {
		const exercice = exercices.find((e) => e.id === id)!;
		const variations = structuredClone(exercice.variations) as Variation[];
		if (!Array.isArray(variations)) throw new Error(`${id} : variations n'est pas un tableau`);

		const attendues = ATTENDU.filter((a) => a.id === id);
		if (variations.length !== attendues.length) {
			throw new Error(
				`${exercice.title} : ${variations.length} variations en base, ${attendues.length} attendues`
			);
		}

		for (const attendu of attendues) {
			const variation = variations[attendu.idx];
			const fr = String(variation.statement_md ?? '');

			if (variation.label !== attendu.label) {
				throw new Error(
					`${attendu.titre} #${attendu.idx} : label « ${String(variation.label)} », attendu « ${attendu.label} »`
				);
			}
			if (md5(fr) !== attendu.md5) {
				throw new Error(
					`${attendu.titre} #${attendu.idx} : l'énoncé français a changé depuis sa lecture ` +
						`(md5 ${md5(fr)} ≠ ${attendu.md5}). Traduction à refaire sur le nouveau texte.`
				);
			}

			const en = readFileSync(join(DIR_EN, `${attendu.id}__${attendu.idx}.md`), 'utf8').trim();
			if (!en) throw new Error(`${attendu.titre} #${attendu.idx} : traduction vide`);

			// Une image dont l'URL a bougé casse silencieusement la fiche anglaise.
			for (const lien of urlsImages(en)) {
				if (!fr.includes(lien)) {
					throw new Error(
						`${attendu.titre} #${attendu.idx} : l'URL d'image ${lien} n'existe pas dans le français`
					);
				}
			}
			if (urlsImages(en).length !== urlsImages(fr).length) {
				throw new Error(
					`${attendu.titre} #${attendu.idx} : ${urlsImages(en).length} image(s) en anglais contre ${urlsImages(fr).length} en français`
				);
			}

			const traductions = (variation.translations ?? {}) as Record<string, Record<string, unknown>>;
			if (traductions.en?.statement_md === en) {
				inchangees++;
				continue;
			}

			variations[attendu.idx] = {
				...variation,
				translations: { ...traductions, en: { ...traductions.en, statement_md: en } }
			};

			// Le schéma que l'API applique : si ça ne passe pas ici, l'éditeur le
			// refuserait aussi.
			const verdict = exerciseVariationSchema.safeParse(variations[attendu.idx]);
			if (!verdict.success) {
				throw new Error(
					`${attendu.titre} #${attendu.idx} : Zod refuse — ${verdict.error.issues[0].message}`
				);
			}

			console.log(
				`  ✓ ${attendu.titre} #${attendu.idx} (${attendu.label}) : ${en.length} caractères`
			);
		}

		aEcrire.set(id, variations);
	}

	console.log(`\n${ATTENDU.length - inchangees} variation(s) à écrire, ${inchangees} déjà à jour.`);

	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	// --- Phase 2 : écrire ----------------------------------------------------
	for (const [id, variations] of aEcrire) {
		const { data, error: err } = await supabase
			.from('exercises')
			.update({ variations })
			.eq('id', id)
			.select('id');
		if (err) throw new Error(`${id} : écriture refusée — ${err.message}`);
		// Un refus RLS rend zéro ligne sans erreur : on compte les lignes rendues.
		if (!data || data.length !== 1)
			throw new Error(`${id} : ${data?.length ?? 0} ligne mise à jour, 1 attendue`);
		console.log(`  ✍️  ${id} mis à jour`);
	}

	console.log('\n✅ Écriture terminée.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
