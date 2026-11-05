#!/usr/bin/env tsx

/**
 * Évaluation écrite « Fonctions », seconde — retouches de David (2026-11-05)
 * ==========================================================================
 *
 * Après la création par create-evaluation-fonctions-2nde.ts, sur les deux fiches A et B :
 * - titres d'exercices sans « Évaluation A : » / « Évaluation B : » (« Lecture graphique »,
 *   « Fonction quotient ») ;
 * - exercice 2 sans la fonction h (énoncé et corrigé relus depuis le dossier de travail) ;
 * - exercice 3 retiré de la fiche, puis supprimé (créé par le script, sur aucune autre fiche) ;
 * - ni points ni barème (`show_points: false`, `total_points` et points des exercices vides).
 *
 * Garde-fous : base = prod ; chaque exercice retrouvé par sa position ET son titre ; Zod
 * avant la moindre écriture ; chaque écriture doit rendre sa ligne.
 *
 * Usage :
 *   pnpm tsx scripts/maj-evaluation-fonctions-2nde.ts            # simulation
 *   pnpm tsx scripts/maj-evaluation-fonctions-2nde.ts --publier  # écrit en prod
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { updateExerciseSchema } from '$lib/server/validation/exercises';
import { deleteExercise, updateExercise } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const RACINE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/09504a5e-be34-4b17-8259-781b6ddf0116/scratchpad/eval-fonctions';

const SUJETS = [
	{ lettre: 'A', fiche: '403e458b-0f40-462d-8d08-efe7daa5f63f' },
	{ lettre: 'B', fiche: '4693b28c-f408-4a7d-85d7-e135b341a557' }
] as const;

const lire = (p: string) => readFileSync(p, 'utf8').trim();

function variationE2(lettre: string) {
	const dir = join(RACINE, lettre);
	const f = 'E2-guided.md';
	return {
		label: 'guided',
		statement_md: lire(join(dir, 'md', f)),
		solution_md: lire(join(dir, 'sol', f)),
		hints: [],
		translations: {
			en: {
				statement_md: lire(join(dir, 'en', f)),
				solution_md: lire(join(dir, 'sol-en', f))
			}
		}
	};
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	// --- Phase 1 : tout retrouver et valider -----------------------------------
	const plans = [];
	for (const s of SUJETS) {
		const { data: lignes, error } = await supabase
			.from('worksheet_exercises')
			.select('id, position, exercise_id, exercises(title)')
			.eq('worksheet_id', s.fiche)
			.order('position');
		if (error) throw new Error(`Sujet ${s.lettre} : lecture impossible — ${error.message}`);
		const attendus = [
			`Évaluation ${s.lettre} : lecture graphique`,
			`Évaluation ${s.lettre} : fonctions quotients`,
			`Évaluation ${s.lettre} : étude par le calcul`
		];
		if (lignes?.length !== 3)
			throw new Error(`Sujet ${s.lettre} : ${lignes?.length ?? 0} exercices au lieu de 3`);
		lignes.forEach((l, i) => {
			if (l.position !== i + 1 || l.exercises?.title !== attendus[i])
				throw new Error(
					`Sujet ${s.lettre}, position ${i + 1} : « ${l.exercises?.title} », attendu « ${attendus[i]} »`
				);
		});
		const e3 = lignes[2].exercise_id;
		const { data: ailleurs, error: ea } = await supabase
			.from('worksheet_exercises')
			.select('id')
			.eq('exercise_id', e3)
			.neq('worksheet_id', s.fiche);
		if (ea) throw new Error(`Sujet ${s.lettre} : lecture impossible — ${ea.message}`);
		if (ailleurs && ailleurs.length > 0)
			throw new Error(`Sujet ${s.lettre} : l'exercice 3 est sur une autre fiche`);

		const majE1 = { title: 'Lecture graphique' };
		const majE2 = { title: 'Fonction quotient', variations: [variationE2(s.lettre)] };
		for (const m of [majE1, majE2]) {
			const v = updateExerciseSchema.safeParse(m);
			if (!v.success)
				throw new Error(
					`Sujet ${s.lettre} « ${m.title} » : Zod refuse — ${v.error.issues[0].path.join('.')} ${v.error.issues[0].message}`
				);
		}
		if (/~h|h\(x\)/.test(JSON.stringify(majE2.variations)))
			throw new Error(`Sujet ${s.lettre} : la fonction h est encore dans l'exercice 2`);
		plans.push({ ...s, lignes, e3, majE1, majE2 });
		console.log(`  📄 Sujet ${s.lettre}`);
		console.log(`     1. ${attendus[0]} → ${majE1.title}`);
		console.log(`     2. ${attendus[1]} → ${majE2.title} (sans h)`);
		console.log(`     3. ${attendus[2]} → retiré et supprimé`);
		console.log(`     points et barème retirés`);
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire -------------------------------------------------------
	for (const p of plans) {
		for (const [ligne, maj] of [
			[p.lignes[0], p.majE1],
			[p.lignes[1], p.majE2]
		] as const) {
			const { data, error } = await updateExercise(supabase, ligne.exercise_id, maj, DAVID);
			if (error || !data)
				throw new Error(`« ${maj.title} » : mise à jour refusée — ${error?.message ?? '0 ligne'}`);
		}

		const { data: retiree, error: er } = await supabase
			.from('worksheet_exercises')
			.delete()
			.eq('id', p.lignes[2].id)
			.select('id');
		if (er || retiree?.length !== 1)
			throw new Error(
				`Sujet ${p.lettre} : retrait de l'exercice 3 refusé — ${er?.message ?? '0 ligne'}`
			);
		const { error: ed } = await deleteExercise(supabase, p.e3, DAVID);
		if (ed)
			throw new Error(`Sujet ${p.lettre} : suppression de l'exercice 3 refusée — ${ed.message}`);

		const { data: sansPoints, error: ep } = await supabase
			.from('worksheet_exercises')
			.update({ points: null })
			.eq('worksheet_id', p.fiche)
			.select('id');
		if (ep || sansPoints?.length !== 2)
			throw new Error(`Sujet ${p.lettre} : points non retirés — ${ep?.message ?? ''}`);

		const { data: fiche, error: ef } = await supabase
			.from('worksheets')
			.select('config')
			.eq('id', p.fiche)
			.single();
		if (ef || !fiche) throw new Error(`Sujet ${p.lettre} : fiche illisible — ${ef?.message ?? ''}`);
		const { data: majFiche, error: eu } = await supabase
			.from('worksheets')
			.update({
				config: { ...(fiche.config as Record<string, unknown>), show_points: false },
				total_points: null
			})
			.eq('id', p.fiche)
			.select('id');
		if (eu || majFiche?.length !== 1)
			throw new Error(`Sujet ${p.lettre} : fiche non mise à jour — ${eu?.message ?? '0 ligne'}`);
		console.log(`  ✍️  Sujet ${p.lettre} mis à jour`);
	}
	console.log('\n✅ Terminé.');
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
