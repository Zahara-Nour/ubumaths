#!/usr/bin/env tsx

/**
 * Renvois de numérotation des exercices, 2026-10-18
 * ==================================================
 *
 * La numérotation repasse en `1) a) i)` (#1468, #1470). 42 exercices écrits pour
 * l'ancien rendu `a) 1) i)` renvoient à « question b) 2) », « question c) » : ces
 * renvois deviennent « question 2) b) », « question 3) », en français et en anglais.
 * Propositions figées et validées par David (42/42) :
 * `data/corrections/renvois-numerotation/` (cf. son README).
 *
 * ⚠️ À lancer juste avant le `deploy:prod` qui livre #1468 : tant que la prod
 * affiche `a) 1)`, les anciens renvois y sont justes.
 *
 * Garde-fous : base de prod vérifiée ; exercice refusé s'il a changé depuis la
 * lecture (`updated_at`) ou si une seule de ses phrases n'est pas trouvée exactement
 * une fois (tout ou rien par exercice) ; sauvegarde JSON avant écriture ; validation
 * Zod de chaque variation ; `.update().select()` puis comparaison du contenu relu
 * (la RLS échoue en silence).
 *
 * Usage :
 *   pnpm tsx scripts/fix-renvois-numerotation.ts            # simulation
 *   pnpm tsx scripts/fix-renvois-numerotation.ts --publier  # écrit en prod
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { z } from 'zod';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import type { Database } from '$lib/types/database';
import { planExercise, sameContent, type Variation } from './lib/renvois-numerotation';

config({ path: '.env' });

// ============================================================================
// CONSTANTES
// ============================================================================

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DONNEES = 'data/corrections/renvois-numerotation/propositions.json';

const fileSchema = z.object({
	luLe: z.string(),
	exercices: z
		.array(z.object({ id: z.string().uuid(), titre: z.string(), updatedAt: z.string() }))
		.min(1)
		.max(100),
	propositions: z
		.array(
			z.object({
				exerciseId: z.string().uuid(),
				field: z.string().max(200),
				lang: z.string(),
				avant: z.string().min(1).max(5000),
				apres: z.string().min(1).max(5000)
			})
		)
		.min(1)
		.max(500)
});

// ============================================================================
// FONCTIONS
// ============================================================================

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);

	const donnees = fileSchema.parse(JSON.parse(readFileSync(DONNEES, 'utf8')));
	const ids = donnees.exercices.map((e) => e.id);
	const supabase = createClient<Database>(url, cle);

	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: lignes, error } = await supabase
		.from('exercises')
		.select('id, title, updated_at, variations')
		.in('id', ids);
	if (error) throw new Error(`Lecture impossible : ${error.message}`);
	if (!lignes || lignes.length !== ids.length) {
		throw new Error(`${lignes?.length ?? 0} exercices lus, ${ids.length} attendus`);
	}

	const dossier = join(tmpdir(), 'chiphre-sauvegardes');
	mkdirSync(dossier, { recursive: true });
	const sauvegarde = join(dossier, `renvois-numerotation-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(lignes, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	const aEcrire = new Map<string, Variation[]>();
	const refus: string[] = [];
	let remplacements = 0;

	for (const { id, titre, updatedAt } of donnees.exercices) {
		const ligne = lignes.find((l) => l.id === id)!;
		const plan = planExercise(
			ligne,
			updatedAt,
			donnees.propositions.filter((p) => p.exerciseId === id)
		);
		if (!plan.ok) {
			refus.push(`${titre} (${id.slice(0, 8)}) : ${plan.reason}`);
			continue;
		}
		const invalide = plan.variations
			.map((v) => exerciseVariationSchema.safeParse(v))
			.find((r) => !r.success);
		if (invalide && !invalide.success) {
			refus.push(`${titre} (${id.slice(0, 8)}) : ${invalide.error.issues[0].message}`);
			continue;
		}
		aEcrire.set(id, plan.variations);
		remplacements += plan.replacements;
		console.log(`  ${titre} : ${plan.replacements} phrase(s)`);
	}

	console.log(
		`\nBilan : ${aEcrire.size} exercice(s) prêts, ${remplacements} remplacement(s), ${refus.length} refus.`
	);
	for (const raison of refus) console.log(`  ⛔ ${raison}`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	let ecrits = 0;
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
		if (!sameContent(data[0].variations, variations)) {
			throw new Error(`Écriture ${id} : le contenu relu diffère du contenu envoyé`);
		}
		ecrits++;
	}
	console.log(`\n✅ ${ecrits} exercice(s) écrits et relus, ${refus.length} refusé(s).`);
	if (refus.length > 0) process.exit(1);
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
