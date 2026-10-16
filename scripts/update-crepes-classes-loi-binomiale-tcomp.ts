#!/usr/bin/env tsx

/**
 * Loi binomiale T_COMP : « Les crêpes au plafond », les deux classes nommées (2026-10-16)
 * ======================================================================================
 *
 * Lève une ambiguïté signalée par David : Mme Bougouin fait elle aussi des
 * crêpes pour 14 élèves, ceux de sa classe de Mathématiques expertes ; M. Le
 * Jolly a la classe de Mathématiques complémentaires. Les questions et
 * conclusions comparent les deux classes.
 *
 * Remplace les textes des deux variantes (énoncé et corrigé, FR et EN) par
 * les fichiers sources. Garde-fous : base = prod ; chaque texte en base doit
 * être identique à la version d'avant (`crepes-avant-classes/`) ; chaque
 * écriture doit rendre sa ligne ; en cas d'échec, l'ancien texte est remis.
 *
 * Usage :
 *   pnpm tsx scripts/update-crepes-classes-loi-binomiale-tcomp.ts            # simulation
 *   pnpm tsx scripts/update-crepes-classes-loi-binomiale-tcomp.ts --publier  # écrit en prod
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database, Json } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const EXERCICE = '7a0865c0-f194-4951-98d2-7ec6beb740b3';

const SCRATCH =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/a45cd49e-4aa3-4c9d-9ad7-865c51e67149/scratchpad';
const AVANT = join(SCRATCH, 'crepes-avant-classes');
const APRES = join(SCRATCH, 'crepes');

const lire = (base: string, dossier: string, label: string) =>
	readFileSync(join(base, dossier, `CREPES-${label}.md`), 'utf8').trim();

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	translations: { en: { statement_md: string; solution_md: string } };
};

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: ex, error: e0 } = await supabase
		.from('exercises')
		.select('title, variations')
		.eq('id', EXERCICE)
		.single();
	if (e0 || !ex) throw new Error(`Exercice introuvable : ${e0?.message ?? 'aucune ligne'}`);
	if (ex.title !== 'Les crêpes au plafond') throw new Error(`Exercice inattendu : ${ex.title}`);
	const anciennes = ex.variations as unknown as Variation[];
	const nouvelles = structuredClone(anciennes);
	if (nouvelles.map((v) => v.label).join(',') !== 'guided,autonomous')
		throw new Error(`Variantes inattendues : ${nouvelles.map((v) => v.label).join(',')}`);

	let changes = 0;
	for (const v of nouvelles) {
		const champs: [string, () => string, (t: string) => void, string][] = [
			['énoncé FR', () => v.statement_md, (t) => (v.statement_md = t), 'md'],
			['corrigé FR', () => v.solution_md, (t) => (v.solution_md = t), 'sol'],
			[
				'énoncé EN',
				() => v.translations.en.statement_md,
				(t) => (v.translations.en.statement_md = t),
				'en'
			],
			[
				'corrigé EN',
				() => v.translations.en.solution_md,
				(t) => (v.translations.en.solution_md = t),
				'sol-en'
			]
		];
		for (const [nom, get, set, dossier] of champs) {
			if (get() !== lire(AVANT, dossier, v.label))
				throw new Error(`${v.label}, ${nom} : le texte en base n'est pas la version attendue`);
			const neuf = lire(APRES, dossier, v.label);
			if (neuf !== get()) changes++;
			set(neuf);
		}
	}
	if (changes !== 8) throw new Error(`${changes} texte(s) modifié(s), 8 attendus`);
	console.log('  ✓ 8 textes en base identiques à la version d’avant, 8 textes neufs à écrire');

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	const { data: m, error: w } = await supabase
		.from('exercises')
		.update({ variations: nouvelles as unknown as Json })
		.eq('id', EXERCICE)
		.select('id');
	if (w || m?.length !== 1) {
		await supabase
			.from('exercises')
			.update({ variations: anciennes as unknown as Json })
			.eq('id', EXERCICE);
		throw new Error(`Texte refusé : ${w?.message ?? 'aucune ligne'} — ancien texte remis`);
	}
	console.log('  ✍️  Textes mis à jour\n\n✅ Terminé.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
