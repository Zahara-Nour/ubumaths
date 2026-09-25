#!/usr/bin/env tsx

/**
 * Questions hors du NOUVEAU programme de 1re spé, réécrites (2026-09-25)
 * =====================================================================
 *
 * Confrontation au nouveau programme (PDF fourni par David) : dans 7 exercices, seules
 * quelques questions sortaient du programme (fonctions sin/cos et équations cos x = a ;
 * (fⁿ)′ et (√u)′ par composition ; limite en +∞ et théorème des valeurs intermédiaires ;
 * convexité). Décision de David : ne pas toucher aux fiches, réécrire ces questions
 * (énoncé, corrigé, FR et EN) avec des outils du programme de 1re.
 *
 * Entrées : `DIR/avant/<id>/<k>/<champ>.md` (texte lu en base avant réécriture) et
 * `DIR/apres/<id>/<k>/<champ>.md` (texte réécrit), pour les seuls champs modifiés.
 *
 * Garde-fous : base de prod ; chaque champ en base doit être EXACTEMENT le texte « avant »
 * (sinon quelqu'un l'a modifié entre-temps : arrêt) ; validation Zod de chaque variation ;
 * sauvegarde JSON ; chaque écriture relue (`.select()`) et comparée à l'envoi.
 *
 * Usage :
 *   pnpm tsx scripts/fix-questions-hors-programme-1spe.ts            # simulation
 *   pnpm tsx scripts/fix-questions-hors-programme-1spe.ts --publier  # écrit en prod
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const SCRATCH =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad';
const DIR = join(SCRATCH, 'hpq');

type Champ = 'statement_md' | 'solution_md' | 'en.statement_md' | 'en.solution_md';
const CHAMPS: Champ[] = ['statement_md', 'solution_md', 'en.statement_md', 'en.solution_md'];

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

/** JSON à clés triées : deux objets de même contenu donnent la même chaîne. */
function canonique(valeur: unknown): string {
	return JSON.stringify(valeur, (_cle, v) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
			: v
	);
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle) throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const prefixes = readdirSync(join(DIR, 'apres')).filter((p) => /^[0-9a-f]{8}$/.test(p));
	if (prefixes.length === 0) throw new Error('Aucune réécriture trouvée');

	const { data: tous, error } = await supabase.from('exercises').select('id, title, variations');
	if (error) throw new Error(`Lecture impossible : ${error.message}`);

	const aEcrire = new Map<string, { titre: string; variations: Variation[] }>();
	const originaux: unknown[] = [];
	for (const p of prefixes) {
		const trouves = (tous ?? []).filter((e) => e.id.startsWith(p));
		if (trouves.length !== 1) throw new Error(`Exercice ${p} : ${trouves.length} trouvé(s)`);
		const exercice = trouves[0];
		originaux.push(exercice);
		const variations = structuredClone(exercice.variations) as Variation[];
		let n = 0;
		for (const k of readdirSync(join(DIR, 'apres', p))) {
			const variation = variations[Number(k)];
			if (!variation) throw new Error(`${exercice.title} : variante ${k} absente`);
			for (const champ of CHAMPS) {
				const fichier = join(DIR, 'apres', p, k, `${champ}.md`);
				if (!existsSync(fichier)) continue;
				const avant = readFileSync(join(DIR, 'avant', p, k, `${champ}.md`), 'utf8');
				const apresDeja = readFileSync(fichier, 'utf8');
				// Rejouable : champ déjà réécrit lors d'une exécution précédente
				if (lire(variation, champ) === apresDeja) continue;
				if (lire(variation, champ) !== avant)
					throw new Error(
						`${exercice.title} [${k}/${champ}] : le texte en base a changé depuis l'extraction`
					);
				const apres = readFileSync(fichier, 'utf8');
				if (apres === avant)
					throw new Error(`${exercice.title} [${k}/${champ}] : réécriture identique`);
				ecrire(variation, champ, apres);
				n++;
			}
			const z = exerciseVariationSchema.safeParse(variation);
			if (!z.success)
				throw new Error(`${exercice.title} [${k}] : Zod refuse — ${z.error.issues[0].message}`);
		}
		if (n === 0) {
			console.log(`  ${exercice.title} (${p}) : déjà réécrit, sauté`);
			continue;
		}
		aEcrire.set(exercice.id, { titre: exercice.title, variations });
		console.log(`  ${exercice.title} (${p}) : ${n} champ(s) réécrit(s)`);
	}

	const sauvegarde = join(SCRATCH, `backup-questions-hors-programme-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(originaux, null, 2));
	console.log(`\n💾 Sauvegarde : ${sauvegarde}`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	for (const [id, { titre, variations }] of aEcrire) {
		const { data, error: e } = await supabase
			.from('exercises')
			.update({
				variations:
					variations as unknown as Database['public']['Tables']['exercises']['Update']['variations']
			})
			.eq('id', id)
			.select('id, variations');
		if (e) throw new Error(`Écriture « ${titre} » : ${e.message}`);
		if (!data || data.length !== 1)
			throw new Error(`Écriture « ${titre} » : ${data?.length ?? 0} ligne(s)`);
		// jsonb réordonne les clés : on compare le contenu, pas l'ordre
		if (canonique(data[0].variations) !== canonique(variations))
			throw new Error(`Écriture « ${titre} » : le contenu relu diffère de l'envoi`);
		console.log(`✅ ${titre} écrit et relu`);
	}
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
