#!/usr/bin/env tsx

/**
 * Années sans espace et coquille de tableur (2026-09-24)
 * ======================================================
 *
 * 1. Une année écrite DANS une formule (`~2020~`, `$2020$`, `~2020+n~`) est groupée
 *    par milliers comme un nombre : « 2 020 ». Le groupement ne sait pas distinguer
 *    l'année 2000 de 2 000 €, donc la correction se fait dans le contenu : l'année
 *    passe en texte, seule la variable reste en formule (« en 2020 + ~n~ »), comme
 *    dans « Évolution d'un loyer ».
 * 2. « Evolution de la population d'une ville » : la formule du tableur
 *    `= 62501.08^A2 + 3750` a perdu son `*` → `= 6250*1,08^A2 + 3750`
 *    (`1.08` dans la version anglaise).
 *
 * Garde-fous : base de prod vérifiée, chaque remplacement doit être trouvé le
 * nombre EXACT de fois attendu, aucune formule contenant une année ne doit
 * subsister, sauvegarde JSON avant écriture, validation Zod, et relecture des
 * lignes réellement écrites (une écriture refusée rend zéro ligne, sans erreur).
 *
 * Usage :
 *   pnpm tsx scripts/fix-annees-et-coquille-population.ts            # simulation
 *   pnpm tsx scripts/fix-annees-et-coquille-population.ts --publier  # écrit en prod
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DIR_SAUVEGARDE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad';

const BAC_2021 = '0dbc7705-d47d-4708-9ff0-a1ce06940b63';
const POPULATION = 'ad62872f-3dbe-4544-a079-12bf94ba171e';

type Champ = 'statement_md' | 'solution_md' | 'en.statement_md' | 'en.solution_md';
type Remplacement = { de: string; vers: string; fois: number };

const CORRECTIONS: { id: string; titre: string; champ: Champ; remplacements: Remplacement[] }[] = [
	{
		id: BAC_2021,
		titre: 'BAC Mai 2021 Amérique du Nord Ex 2',
		champ: 'statement_md',
		remplacements: [
			{ de: '~2020~', vers: '2020', fois: 1 },
			{ de: '~2020+n~', vers: '2020 + ~n~', fois: 1 },
			{ de: '~2021~', vers: '2021', fois: 1 },
			{ de: '~2022~', vers: '2022', fois: 1 }
		]
	},
	{
		id: BAC_2021,
		titre: 'BAC Mai 2021 Amérique du Nord Ex 2',
		champ: 'solution_md',
		remplacements: [
			{ de: '~2021~', vers: '2021', fois: 1 },
			{ de: '~2022~', vers: '2022', fois: 1 },
			{ de: '~2031~', vers: '2031', fois: 1 }
		]
	},
	{
		id: POPULATION,
		titre: "Evolution de la population d'une ville",
		champ: 'statement_md',
		remplacements: [
			{ de: 'En $2020$', vers: 'En 2020', fois: 1 },
			{ de: '~2020+n~', vers: '2020 + ~n~', fois: 1 },
			{ de: '`= 62501.08^A2 + 3750`', vers: '`= 6250*1,08^A2 + 3750`', fois: 1 }
		]
	},
	{
		id: POPULATION,
		titre: "Evolution de la population d'une ville",
		champ: 'solution_md',
		remplacements: [{ de: '$2020+12=2032$', vers: '2020 + 12 = 2032', fois: 1 }]
	},
	{
		id: POPULATION,
		titre: "Evolution de la population d'une ville",
		champ: 'en.statement_md',
		remplacements: [
			{ de: 'In $2020$', vers: 'In 2020', fois: 1 },
			{ de: '~2020+n~', vers: '2020 + ~n~', fois: 1 },
			{ de: '`= 62501.08^A2 + 3750`', vers: '`= 6250*1.08^A2 + 3750`', fois: 1 }
		]
	},
	{
		id: POPULATION,
		titre: "Evolution de la population d'une ville",
		champ: 'en.solution_md',
		remplacements: [{ de: '$2020+12=2032$', vers: '2020 + 12 = 2032', fois: 1 }]
	}
];

/** Une année (19xx / 20xx) à l'intérieur d'une formule `~…~` ou `$…$`. */
const ANNEE_EN_FORMULE =
	/~[^~\n]{0,12}\b(?:19|20)\d\d\b[^~\n]{0,12}~|\$[^$\n]{0,12}\b(?:19|20)\d\d\b[^$\n]{0,12}\$/;

type Variation = Record<string, unknown> & {
	translations?: { en?: Record<string, unknown> } & Record<string, unknown>;
};

const occurrences = (texte: string, motif: string) => texte.split(motif).length - 1;

function lire(v: Variation, champ: Champ): string {
	if (champ.startsWith('en.')) return String(v.translations?.en?.[champ.slice(3)] ?? '');
	return String(v[champ] ?? '');
}

function ecrire(v: Variation, champ: Champ, valeur: string): void {
	if (champ.startsWith('en.')) {
		if (!v.translations?.en) throw new Error('Traduction anglaise absente');
		v.translations.en[champ.slice(3)] = valeur;
	} else {
		v[champ] = valeur;
	}
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

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-annees-population-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	const aEcrire = new Map<string, Variation[]>();

	for (const id of ids) {
		const exercice = exercices.find((e) => e.id === id)!;
		const variations = structuredClone(exercice.variations) as Variation[];
		if (variations.length !== 1)
			throw new Error(`${exercice.title} : ${variations.length} variations, 1 attendue`);
		const variation = variations[0];

		for (const correction of CORRECTIONS.filter((c) => c.id === id)) {
			let texte = lire(variation, correction.champ);
			for (const { de, vers, fois } of correction.remplacements) {
				const trouvees = occurrences(texte, de);
				if (trouvees !== fois) {
					throw new Error(
						`${correction.titre} [${correction.champ}] : « ${de} » trouvé ${trouvees} fois, ${fois} attendue(s).`
					);
				}
				texte = texte.split(de).join(vers);
				console.log(`  ${correction.titre} [${correction.champ}] : « ${de} » → « ${vers} »`);
			}
			const reste = texte.match(ANNEE_EN_FORMULE);
			if (reste)
				throw new Error(
					`${correction.titre} [${correction.champ}] : année encore en formule : ${reste[0]}`
				);
			ecrire(variation, correction.champ, texte);
		}

		const validation = exerciseVariationSchema.safeParse(variation);
		if (!validation.success)
			throw new Error(`${exercice.title} : ${validation.error.issues[0].message}`);
		aEcrire.set(id, variations);
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	for (const [id, variations] of aEcrire) {
		const { data, error: erreurEcriture } = await supabase
			.from('exercises')
			.update({
				variations:
					variations as unknown as Database['public']['Tables']['exercises']['Update']['variations']
			})
			.eq('id', id)
			.select('id, variations');
		if (erreurEcriture) throw new Error(`Écriture ${id} : ${erreurEcriture.message}`);
		if (!data || data.length !== 1)
			throw new Error(`Écriture ${id} : ${data?.length ?? 0} ligne(s) écrite(s), 1 attendue`);
		if (JSON.stringify(data[0].variations) !== JSON.stringify(variations)) {
			throw new Error(`Écriture ${id} : le contenu relu diffère du contenu envoyé`);
		}
		console.log(`✅ ${id} écrit et relu`);
	}
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
