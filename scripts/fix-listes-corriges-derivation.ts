#!/usr/bin/env tsx

/**
 * Sous-listes des corrigés de dérivation (2026-09-25)
 * ===================================================
 *
 * Une ligne « 1. a. texte » n'ouvre pas de sous-liste : le « a. » reste du texte,
 * et les « b. », « c. » suivants forment une sous-liste. Le corrigé affichait donc
 * « a) a. texte » puis « 2) », « 3) ». On sépare : « 1. » seul sur sa ligne, puis
 * « a. texte » en retrait — l'item 1 contient alors toute la sous-liste.
 *
 * Portée : les corrigés (FR et EN) des exercices des fiches « Entraînement
 * technique — Dérivation » et « Applications de la dérivation ». Les énoncés n'ont
 * aucune occurrence (recensement du 2026-09-25 : 4 exercices, 6 + 6 occurrences).
 *
 * Garde-fous : base de prod vérifiée, nombre EXACT d'occurrences attendu par
 * exercice et par champ, aucune occurrence restante, sauvegarde JSON avant
 * écriture, validation Zod, relecture des lignes réellement écrites (une écriture
 * refusée rend zéro ligne, sans erreur).
 *
 * Usage :
 *   pnpm tsx scripts/fix-listes-corriges-derivation.ts            # simulation
 *   pnpm tsx scripts/fix-listes-corriges-derivation.ts --publier  # écrit en prod
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

/** Exercice → nombre d'occurrences attendu dans le corrigé (identique en FR et en EN). */
const ATTENDU: Record<string, { titre: string; fois: number }> = {
	'1d29f360': { titre: 'Dériver un produit', fois: 1 },
	'54aae8b9': { titre: 'Tangentes particulières', fois: 2 },
	e1355141: { titre: 'Extremum et inégalité', fois: 2 },
	a805deba: { titre: "Position d'une courbe par rapport à une tangente", fois: 1 }
};

/** « 1. a. texte » en début de ligne → « 1. » puis « a. texte » en retrait. */
const ITEM_ET_SOUS_ITEM = /^(\d+)\. ([a-z])\. /gm;

type Champ = 'solution_md' | 'en.solution_md';
const CHAMPS: Champ[] = ['solution_md', 'en.solution_md'];

type Variation = Record<string, unknown> & {
	translations?: { en?: Record<string, unknown> } & Record<string, unknown>;
};

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
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: tous, error } = await supabase.from('exercises').select('id, title, variations');
	if (error) throw new Error(`Lecture impossible : ${error.message}`);

	const exercices = Object.keys(ATTENDU).map((prefixe) => {
		const trouves = (tous ?? []).filter((e) => e.id.startsWith(prefixe));
		if (trouves.length !== 1) throw new Error(`Exercice ${prefixe} : ${trouves.length} trouvé(s)`);
		if (trouves[0].title !== ATTENDU[prefixe].titre)
			throw new Error(`Exercice ${prefixe} : titre inattendu « ${trouves[0].title} »`);
		return trouves[0];
	});

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-listes-derivation-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	const aEcrire = new Map<string, Variation[]>();
	for (const exercice of exercices) {
		const { fois } = ATTENDU[exercice.id.slice(0, 8)];
		const variations = structuredClone(exercice.variations) as Variation[];
		if (variations.length !== 1)
			throw new Error(`${exercice.title} : ${variations.length} variations, 1 attendue`);
		const variation = variations[0];

		for (const champ of CHAMPS) {
			const texte = lire(variation, champ);
			const trouvees = texte.match(ITEM_ET_SOUS_ITEM)?.length ?? 0;
			if (trouvees !== fois)
				throw new Error(
					`${exercice.title} [${champ}] : ${trouvees} occurrence(s), ${fois} attendue(s)`
				);
			const corrige = texte.replace(ITEM_ET_SOUS_ITEM, '$1.\n   $2. ');
			if (ITEM_ET_SOUS_ITEM.test(corrige))
				throw new Error(`${exercice.title} [${champ}] : occurrence restante`);
			ITEM_ET_SOUS_ITEM.lastIndex = 0;
			ecrire(variation, champ, corrige);
			console.log(`  ${exercice.title} [${champ}] : ${trouvees} sous-liste(s) séparée(s)`);
		}

		const validation = exerciseVariationSchema.safeParse(variation);
		if (!validation.success)
			throw new Error(`${exercice.title} : ${validation.error.issues[0].message}`);
		aEcrire.set(exercice.id, variations);
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
		if (JSON.stringify(data[0].variations) !== JSON.stringify(variations))
			throw new Error(`Écriture ${id} : le contenu relu diffère du contenu envoyé`);
		console.log(`✅ ${id} écrit et relu`);
	}
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
