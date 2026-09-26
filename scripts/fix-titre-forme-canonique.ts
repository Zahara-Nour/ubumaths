#!/usr/bin/env tsx

/**
 * Coquille du titre « Forme canonique et et équation de cercle » (5b2ac4dd), 2026-09-26
 * ====================================================================================
 *
 * Relevée en incluant l'exercice dans « Entraînement technique — Géométrie repérée »
 * (décision de David : la corriger) : « et et » → « et ». Seul le titre est touché ;
 * le contenu ne contient pas la coquille.
 *
 * Garde-fous : base de prod vérifiée, titre actuel EXACTEMENT celui attendu (sinon
 * arrêt, ou rien à faire s'il est déjà corrigé), aucun autre exercice du thème ne porte
 * déjà le nouveau titre, validation Zod, sauvegarde JSON avant écriture, relecture de
 * la ligne écrite.
 *
 * Usage :
 *   pnpm tsx scripts/fix-titre-forme-canonique.ts            # simulation
 *   pnpm tsx scripts/fix-titre-forme-canonique.ts --publier  # écrit en prod
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { z } from 'zod';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DIR_SAUVEGARDE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad';

const PREFIXE = '5b2ac4dd';
const AVANT = 'Forme canonique et et équation de cercle';
const APRES = 'Forme canonique et équation de cercle';
// Même règle que le titre d'un exercice (src/lib/server/validation/exercises.ts)
const titreSchema = z.string().trim().min(1).max(200);

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: tous, error: e0 } = await supabase.from('exercises').select('id, title, topic');
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	const trouves = (tous ?? []).filter((e) => e.id.startsWith(PREFIXE));
	if (trouves.length !== 1) throw new Error(`Exercice ${PREFIXE} : ${trouves.length} trouvé(s)`);
	const exercice = trouves[0];
	if (exercice.title === APRES) {
		console.log('Déjà corrigé — rien à faire.');
		return;
	}
	if (exercice.title !== AVANT)
		throw new Error(`Titre inattendu : « ${exercice.title} » (attendu « ${AVANT} »)`);
	const homonymes = (tous ?? []).filter((e) => e.title === APRES && e.topic === exercice.topic);
	if (homonymes.length > 0) throw new Error(`« ${APRES} » existe déjà dans « ${exercice.topic} »`);
	titreSchema.parse(APRES);
	console.log(`  ✓ « ${AVANT} » → « ${APRES} » (${exercice.id})`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-titre-forme-canonique-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercice, null, 2));
	console.log(`  💾 Sauvegarde : ${sauvegarde}`);

	const { data: ecrit, error } = await supabase
		.from('exercises')
		.update({ title: APRES })
		.eq('id', exercice.id)
		.eq('title', AVANT)
		.select('id, title');
	// La RLS (ou une écriture concurrente) échoue en silence : exiger la ligne relue
	if (error || ecrit?.length !== 1 || ecrit[0].title !== APRES)
		throw new Error(`Écriture non confirmée : ${error?.message ?? JSON.stringify(ecrit)}`);
	console.log('\n✅ Titre corrigé.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
