#!/usr/bin/env tsx

/**
 * Loi binomiale T_COMP : ajout de l'exercice « Les crêpes au plafond » (2026-10-16)
 * ================================================================================
 *
 * Ajoute un exercice d'application (variantes guidée et autonome) à la fiche
 * existante « Applications de la loi binomiale » (create-loi-binomiale-tcomp.ts),
 * en dernière position de la section « Espérance et décision ».
 * Espérance et écart type de deux lois de même espérance, puis seuil de 95 %.
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ;
 * fiche et section trouvées une fois et une seule ; idempotent (titre déjà
 * présent dans le thème → arrêt) ; chaque écriture doit rendre sa ligne ;
 * en cas d'échec, l'exercice créé est supprimé.
 *
 * Usage :
 *   pnpm tsx scripts/add-crepes-loi-binomiale-tcomp.ts            # simulation
 *   pnpm tsx scripts/add-crepes-loi-binomiale-tcomp.ts --publier  # écrit en prod
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import { validateCreateWorksheetExercise } from '$lib/server/validation/worksheets';
import { createExercise } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const TOPIC = 'Loi binomiale';
const GRADES = ['T_COMP'];
const FICHE = 'Applications de la loi binomiale';
const SECTION = 'Espérance et décision';
const TITRE = 'Les crêpes au plafond';
const CLE = 'CREPES';

const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/a45cd49e-4aa3-4c9d-9ad7-865c51e67149/scratchpad/crepes';

const lire = (p: string) => readFileSync(p, 'utf8').trim();

function variation(fichier: string, label: string) {
	return {
		label,
		statement_md: lire(join(DIR, 'md', fichier)),
		solution_md: lire(join(DIR, 'sol', fichier)),
		hints: [] as [],
		translations: {
			en: {
				statement_md: lire(join(DIR, 'en', fichier)),
				solution_md: lire(join(DIR, 'sol-en', fichier))
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

	// --- Phase 1a : l'exercice -----------------------------------------------
	const variations = [variation(`${CLE}-guided.md`, 'guided')];
	if (existsSync(join(DIR, 'md', `${CLE}-autonomous.md`)))
		variations.push(variation(`${CLE}-autonomous.md`, 'autonomous'));
	const exercice = {
		title: TITRE,
		topic: TOPIC,
		category: 'application' as const,
		grades: GRADES,
		is_public: false,
		variations
	};
	const v = createExerciseSchema.safeParse(exercice);
	if (!v.success)
		throw new Error(
			`« ${TITRE} » : Zod refuse — ${v.error.issues[0].path.join('.')} ${v.error.issues[0].message}`
		);
	const { data: dejaLa, error: e0 } = await supabase
		.from('exercises')
		.select('id')
		.eq('topic', TOPIC)
		.eq('title', TITRE);
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	if (dejaLa && dejaLa.length > 0) throw new Error(`« ${TITRE} » déjà présent dans le thème`);
	console.log(`  ✓ « ${TITRE} » validé (${variations.map((x) => x.label).join(', ')})`);

	// --- Phase 1b : la fiche, la section, la position ------------------------
	const { data: fiches, error: e1 } = await supabase
		.from('worksheets')
		.select('id')
		.eq('title', FICHE)
		.contains('grades', GRADES);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (fiches?.length !== 1)
		throw new Error(`Fiche « ${FICHE} » : ${fiches?.length ?? 0} trouvée(s), 1 attendue`);
	const ficheId = fiches[0].id;
	const { data: sections, error: e2 } = await supabase
		.from('worksheet_sections')
		.select('id')
		.eq('worksheet_id', ficheId)
		.eq('title', SECTION);
	if (e2) throw new Error(`Lecture des sections impossible : ${e2.message}`);
	if (sections?.length !== 1)
		throw new Error(`Section « ${SECTION} » : ${sections?.length ?? 0} trouvée(s), 1 attendue`);
	const sectionId = sections[0].id;
	const { data: lignes, error: e3 } = await supabase
		.from('worksheet_exercises')
		.select('position')
		.eq('worksheet_id', ficheId)
		.eq('section_id', sectionId);
	if (e3) throw new Error(`Lecture des exercices de la fiche impossible : ${e3.message}`);
	const position = Math.max(0, ...(lignes ?? []).map((l) => l.position)) + 1;
	const vl = validateCreateWorksheetExercise({
		exercise_id: '00000000-0000-4000-8000-000000000000',
		position,
		variant_mode: 'none',
		section_id: sectionId
	});
	if (!vl.success)
		throw new Error(`Exercice de fiche refusé par Zod : ${vl.error.issues[0].message}`);
	console.log(
		`  ✓ Fiche « ${FICHE} » (${ficheId}), section « ${SECTION} » : ${lignes?.length ?? 0} exercice(s), ajout en position ${position}`
	);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire ----------------
	let creeId: string | null = null;
	try {
		const { data, error } = await createExercise(supabase, exercice as never, DAVID);
		if (error || !data) throw new Error(`Création refusée — ${error?.message ?? 'aucune ligne'}`);
		creeId = data.id;
		const { data: ligne, error: ew } = await supabase
			.from('worksheet_exercises')
			.insert({
				worksheet_id: ficheId,
				exercise_id: data.id,
				section_id: sectionId,
				position,
				points: null,
				variant_mode: 'none',
				variant_config: {},
				custom_instructions: null,
				translations: null
			})
			.select('id');
		if (ew || ligne?.length !== 1)
			throw new Error(`Ajout à la fiche refusé : ${ew?.message ?? 'aucune ligne'}`);
		console.log(`  ✍️  Exercice ${data.id} ajouté à la fiche, position ${position}`);
		console.log('\n✅ Terminé.');
	} catch (err) {
		if (creeId) await supabase.from('exercises').delete().eq('id', creeId);
		throw new Error(`${err instanceof Error ? err.message : String(err)} — tout a été défait`);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
