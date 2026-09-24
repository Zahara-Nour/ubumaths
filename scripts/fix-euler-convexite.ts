#!/usr/bin/env tsx

/**
 * « Convexité de la fonction exponentielle » : `\euler` dans une formule `~…~`
 * ============================================================================
 *
 * La notation `~…~` écrit la constante e `e` ; `\euler` n'y existe pas et la
 * formule s'affichait en rouge (« Invalid backslash sequence ») dans les
 * solutions des variations 2 et 3, en français et en anglais (relevé le
 * 2026-09-24 en passant les 4 847 formules `~…~` de la prod au parseur).
 *
 * Garde-fous : base de prod vérifiée, chaque remplacement trouvé exactement une
 * fois par champ, plus aucun `\euler` ensuite, sauvegarde JSON, validation Zod,
 * relecture des lignes réellement écrites.
 *
 * Usage :
 *   pnpm tsx scripts/fix-euler-convexite.ts            # simulation
 *   pnpm tsx scripts/fix-euler-convexite.ts --publier  # écrit en prod
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

const CONVEXITE = '47730c10-fad8-4b5e-956c-f1ddb54f496e';
const AVANT = '~{\\euler^a+\\euler^b}/2>=\\euler^{{a+b}/2}~';
const APRES = '~{e^a+e^b}/2>=e^{{a+b}/2}~';

/** Variations (index 0) et champs concernés, relevés sur la prod */
const CIBLES: { variation: number; champ: 'solution_md' | 'en.solution_md' }[] = [
	{ variation: 1, champ: 'solution_md' },
	{ variation: 1, champ: 'en.solution_md' },
	{ variation: 2, champ: 'solution_md' },
	{ variation: 2, champ: 'en.solution_md' }
];

type Variation = Record<string, unknown> & {
	translations?: { en?: Record<string, unknown> } & Record<string, unknown>;
};

function lire(v: Variation, champ: string): string {
	if (champ.startsWith('en.')) return String(v.translations?.en?.[champ.slice(3)] ?? '');
	return String(v[champ] ?? '');
}

function ecrire(v: Variation, champ: string, valeur: string): void {
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

	const { data: exercice, error } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.eq('id', CONVEXITE)
		.single();
	if (error) throw new Error(`Lecture impossible : ${error.message}`);

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-convexite-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercice, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	const variations = structuredClone(exercice.variations) as Variation[];
	for (const { variation, champ } of CIBLES) {
		const v = variations[variation];
		const texte = lire(v, champ);
		const trouvees = texte.split(AVANT).length - 1;
		if (trouvees !== 1)
			throw new Error(
				`Variation ${variation + 1} [${champ}] : ${trouvees} occurrence(s), 1 attendue`
			);
		const corrige = texte.replace(AVANT, APRES);
		if (corrige.includes('\\euler'))
			throw new Error(`Variation ${variation + 1} [${champ}] : \\euler subsiste`);
		ecrire(v, champ, corrige);
		console.log(`  variation ${variation + 1} [${champ}] : corrigée`);
	}
	for (const [i, v] of variations.entries()) {
		const validation = exerciseVariationSchema.safeParse(v);
		if (!validation.success)
			throw new Error(`Variation ${i + 1} : ${validation.error.issues[0].message}`);
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	const { data, error: erreurEcriture } = await supabase
		.from('exercises')
		.update({
			variations:
				variations as unknown as Database['public']['Tables']['exercises']['Update']['variations']
		})
		.eq('id', CONVEXITE)
		.select('id, variations');
	if (erreurEcriture) throw new Error(`Écriture : ${erreurEcriture.message}`);
	if (!data || data.length !== 1)
		throw new Error(`Écriture : ${data?.length ?? 0} ligne(s), 1 attendue`);
	if (JSON.stringify(data[0].variations) !== JSON.stringify(variations)) {
		throw new Error('Le contenu relu diffère du contenu envoyé');
	}
	console.log(`✅ ${exercice.title} écrit et relu`);
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
