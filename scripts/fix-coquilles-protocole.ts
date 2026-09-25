#!/usr/bin/env tsx

/**
 * Coquilles de « Protocole de traitement » (b35c6751), 2026-09-25
 * ================================================================
 *
 * Relevées lors de la réécriture des questions hors programme (décision de David :
 * les corriger) :
 * 1. corrigé B.1 : `e^{\frac{3}{40}}` → `e^{-\frac{3}{40}x}` (signe et variable
 *    manquants ; dérivée vérifiée par sympy : f'(x) = 105/x² (−1 + e^(−3x/40) + (3x/40) e^(−3x/40))) ;
 * 2. corrigé B.1 : `\exponentialE` → `e`, comme partout ailleurs dans l'exercice ;
 * 3. énoncé B.2 : « On ne demande pas les limites de la fonction f » retiré — les
 *    limites de fonctions ne sont plus au programme de 1re, la remarque n'a plus lieu d'être.
 * FR et EN.
 *
 * Garde-fous : base de prod vérifiée, chaque remplacement doit être trouvé le nombre
 * EXACT de fois attendu, aucune trace de l'ancienne version ne doit subsister,
 * sauvegarde JSON avant écriture, validation Zod, relecture des lignes écrites.
 *
 * Usage :
 *   pnpm tsx scripts/fix-coquilles-protocole.ts            # simulation
 *   pnpm tsx scripts/fix-coquilles-protocole.ts --publier  # écrit en prod
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

const PROTOCOLE = 'b35c6751-449c-46df-9814-af2693769eda';

type Champ = 'statement_md' | 'solution_md' | 'en.statement_md' | 'en.solution_md';
type Remplacement = { de: string; vers: string; fois: number };
type Correction = {
	id: string;
	titre: string;
	champ: Champ;
	remplacements: Remplacement[];
	/** Traces de l'ancienne version qui ne doivent plus apparaître après remplacement. */
	interdits: string[];
};

const CORRIGE: Remplacement[] = [
	{
		de: '\\frac{3x}{40}e^{\\frac{3}{40}}\\right)',
		vers: '\\frac{3x}{40}e^{-\\frac{3}{40}x}\\right)',
		fois: 1
	},
	{ de: '\\exponentialE', vers: 'e', fois: 2 }
];

const CORRECTIONS: Correction[] = [
	{
		id: PROTOCOLE,
		titre: 'Protocole de traitement',
		champ: 'statement_md',
		remplacements: [
			{ de: '    *On ne demande pas les limites de la fonction *$f$*.*', vers: '', fois: 1 }
		],
		interdits: ['limites']
	},
	{
		id: PROTOCOLE,
		titre: 'Protocole de traitement',
		champ: 'en.statement_md',
		remplacements: [
			{ de: '    *You are not asked for the limits of the function *$f$*.*', vers: '', fois: 1 }
		],
		interdits: ['limits']
	},
	{
		id: PROTOCOLE,
		titre: 'Protocole de traitement',
		champ: 'solution_md',
		remplacements: CORRIGE,
		interdits: ['exponentialE', 'e^{\\frac{3}{40}}']
	},
	{
		id: PROTOCOLE,
		titre: 'Protocole de traitement',
		champ: 'en.solution_md',
		remplacements: CORRIGE,
		interdits: ['exponentialE', 'e^{\\frac{3}{40}}']
	}
];

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

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-coquilles-protocole-${Date.now()}.json`);
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
			const reste = correction.interdits.find((trace) => texte.includes(trace));
			if (reste)
				throw new Error(`${correction.titre} [${correction.champ}] : « ${reste} » subsiste`);
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
