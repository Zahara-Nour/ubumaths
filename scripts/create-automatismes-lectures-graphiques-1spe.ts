#!/usr/bin/env tsx

/**
 * Automatismes de 1re : lectures graphiques — fiche de séries figées (2026-11-03, ADR 0011)
 * =========================================================================================
 *
 * Fiche « Automatismes : lectures graphiques (1) » : 2 séries de 8 questions, chacune un
 * exercice ordinaire fait d'instances de modèles de questions tirées avec une graine fixe
 * (même copie pour toute la classe). Capacités du programme de 1re (Automatismes,
 * « Fonctions et représentations ») : résoudre graphiquement f(x) = k, f(x) < k ; signe
 * d'une fonction et tableau de variations lus sur la courbe ; plus l'entretien des
 * automatismes de seconde (images, antécédents, f = g, f < g). Modèles :
 *  - modèles de seconde et de 1re déjà en base, réutilisés tels quels ;
 *  - 3 modèles neufs (`scripts/questions/lectures-graphiques-1spe/`, créés par
 *    `scripts/create-questions.ts`), retrouvés par identifiant.
 * Un tableau de signes à compléter : cases vides à l'énoncé, tableau rempli au corrigé
 * (`buildSerie`). Changer une graine change la copie : les graines sont la fiche.
 * Graines choisies hors cas limites (S = ∅ ou ℝ) ; f(x) < k une fois avec la droite y = k
 * tracée, une fois sans ; tableau de signes une fois sur une cubique, une fois sur une parabole.
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-lectures-graphiques-1spe.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-lectures-graphiques-1spe.ts --publier  # écrit en prod
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import {
	validateCreateWorksheet,
	validateCreateWorksheetExercise
} from '$lib/server/validation/worksheets';
import { createExercise } from '$lib/server/exercises';
import { toQuestionTemplate } from '$lib/types/question-template';
import { buildSerie, type SerieItem } from '$lib/worksheets/serie-automatismes';
import type { QuestionTemplate } from '$lib/questions/types';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const ECOLE = '05668b78-e4d2-4d85-85b6-183e75d24204';
const MODELE_FICHE_ELEVE = '00000000-0000-4000-8000-000000000012';
const TOPIC = 'Automatismes';

/** Modèles en base (ADR 0011 : pas de niveau 1re ajouté aux modèles de seconde) */
const MODELES = {
	/** 2de — image lue sur une courbe */
	images: 'cc88ebd3-411a-4a86-80f9-084b9840f863',
	/** 2de — antécédents lus sur une courbe, f(x) = k */
	antecedents: '17809937-5109-4af9-87a6-988f33bb33fc',
	/** 2de — f(x) = g(x) lu sur deux courbes */
	egaliteFG: '406fd9a8-ad71-4c24-ab35-5029ddc1b18b',
	/** 2de — f(x) < g(x) lu sur deux courbes */
	inegaliteFG: '7efd2e76-f27c-4b9c-b8f0-71dfa86265e2',
	/** 2de — x² < k lu sur la parabole */
	carreInferieurK: '08c059b8-2efc-483e-9a7d-cdb9d146c9f9',
	/** 2de — croissante ou décroissante sur un intervalle */
	sensDeVariation: '93bc8b5e-b2a5-4793-b64e-271601504498',
	/** 2de — extremums lus sur une courbe */
	extremums: '39154ac5-b4b2-4995-a953-ab980156bce1',
	/** 1re — signe d'une fonction lu sur sa courbe */
	signe: '33dffa7a-8523-440e-99fe-304df3ced8b3',
	/** 1re, neuf — f(x) < k sur une courbe quelconque (01-inequation-f-inferieur-k.json) */
	inferieurK: '95ee57c8-4e16-4554-add5-cb8f72ee6f28',
	/** 1re, neuf — tableau de signes à compléter (02-tableau-signes-sur-courbe.json) */
	tableauSignes: '5397c20f-7b3a-4d56-b441-644607e0138a',
	/** 1re, neuf — tableau de variations, choix multiple (03-tableau-variations-sur-courbe.json) */
	tableauVariations: '7f82d15a-1c46-4bd5-81bc-a9f5e21048ed'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Lectures graphiques — série 1',
		items: [
			q('images', 1),
			q('antecedents', 1),
			q('inferieurK', 3),
			q('signe', 1),
			q('tableauSignes', 7),
			q('extremums', 1),
			q('tableauVariations', 1),
			q('egaliteFG', 1)
		]
	},
	{
		title: 'Lectures graphiques — série 2',
		items: [
			q('images', 2),
			q('antecedents', 15),
			q('sensDeVariation', 1),
			q('inferieurK', 12),
			q('tableauSignes', 5),
			q('inegaliteFG', 1),
			q('tableauVariations', 2),
			q('carreInferieurK', 7)
		]
	}
];

const FICHE = {
	title: 'Automatismes : lectures graphiques (1)',
	description: 'Répondre directement en lisant les courbes ; compléter les tableaux.',
	translations: null
};

const CONFIG_FICHE = {
	language: 'fr',
	show_date: false,
	show_class: false,
	show_title: true,
	page_layout: 'A4',
	show_points: false,
	numbering_style: 'numeric',
	show_student_name: false,
	shuffle_exercises: false,
	shuffle_within_sections: false
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

	// --- Phase 1a : retrouver les modèles --------------------------------------
	const modeles = new Map<string, QuestionTemplate>();
	const { data: lignes, error: e0 } = await supabase
		.from('question_templates')
		.select('*')
		.in('id', Object.values(MODELES));
	if (e0) throw new Error(`Lecture des modèles impossible : ${e0.message}`);
	const attendus = Object.values(MODELES).length;
	if (lignes?.length !== attendus) throw new Error(`Modèles : ${lignes?.length ?? 0}/${attendus}`);
	for (const row of lignes) modeles.set(row.id, toQuestionTemplate(row));
	console.log(`  ✓ ${modeles.size} modèles retrouvés`);

	// --- Phase 1b : construire et valider les séries ---------------------------
	const exercices = SERIES.map((serie) => {
		const items: SerieItem[] = serie.items.map((i) => ({
			templateId: MODELES[i.cle],
			seed: i.seed
		}));
		const { statement, solution } = buildSerie(modeles, items);
		const donnees = {
			title: serie.title,
			topic: TOPIC,
			category: 'automatisme' as const,
			grades: ['1_SPE'],
			is_public: false,
			variations: [{ label: 'guided', statement_md: statement, solution_md: solution, hints: [] }]
		};
		const v = createExerciseSchema.safeParse(donnees);
		if (!v.success)
			throw new Error(`« ${serie.title} » : Zod refuse — ${v.error.issues[0].message}`);
		// Ce qui est écrit est ce que Zod a validé (défauts et transformations compris)
		return v.data;
	});
	const { data: dejaLa, error: e1 } = await supabase
		.from('exercises')
		.select('title')
		.eq('topic', TOPIC)
		.in(
			'title',
			exercices.map((e) => e.title)
		);
	if (e1) throw new Error(`Lecture impossible : ${e1.message}`);
	if (dejaLa && dejaLa.length > 0)
		throw new Error(`Déjà présents : ${dejaLa.map((e) => e.title).join(', ')}`);
	const { data: fiches, error: e2 } = await supabase
		.from('worksheets')
		.select('id')
		.eq('title', FICHE.title);
	if (e2) throw new Error(`Lecture des fiches impossible : ${e2.message}`);
	if (fiches && fiches.length > 0) throw new Error(`Fiche déjà présente : ${FICHE.title}`);
	const vf = validateCreateWorksheet({
		...FICHE,
		type: 'worksheet',
		config: CONFIG_FICHE,
		grades: ['1_SPE']
	});
	if (!vf.success) throw new Error(`Fiche : Zod refuse — ${vf.error.issues[0].message}`);
	console.log(`  ✓ ${exercices.length} séries construites et validées`);

	if (!PUBLIER) {
		for (const e of exercices) {
			console.log(`\n=== ${e.title} — énoncé\n${e.variations[0].statement_md}`);
			console.log(`\n=== ${e.title} — corrigé\n${e.variations[0].solution_md}`);
		}
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire ------------------
	const creesExercices: string[] = [];
	let ficheId: string | null = null;
	try {
		for (const e of exercices) {
			const { data, error } = await createExercise(supabase, e as never, DAVID);
			if (error || !data)
				throw new Error(`« ${e.title} » : création refusée — ${error?.message ?? 'aucune ligne'}`);
			creesExercices.push(data.id);
		}
		const { data: fiche, error: e3 } = await supabase
			.from('worksheets')
			.insert({
				title: FICHE.title,
				description: FICHE.description,
				type: 'worksheet',
				config: CONFIG_FICHE,
				translations: null,
				status: 'draft',
				version: 1,
				style_id: MODELE_FICHE_ELEVE,
				grades: ['1_SPE'],
				created_by: DAVID,
				school_id: ECOLE
			})
			.select('id')
			.single();
		if (e3 || !fiche) throw new Error(`Fiche refusée : ${e3?.message ?? 'aucune ligne'}`);
		ficheId = fiche.id;
		const lignes = creesExercices.map((exercise_id, i) => ({
			worksheet_id: fiche.id,
			exercise_id,
			section_id: null,
			position: i + 1
		}));
		for (const l of lignes) {
			const v = validateCreateWorksheetExercise({
				exercise_id: l.exercise_id,
				position: l.position,
				variant_mode: 'none'
			});
			if (!v.success)
				throw new Error(`Exercice de fiche refusé par Zod : ${v.error.issues[0].message}`);
		}
		const { data: ajoutees, error: e4 } = await supabase
			.from('worksheet_exercises')
			.insert(
				lignes.map((l) => ({
					...l,
					points: null,
					variant_mode: 'none',
					variant_config: {},
					custom_instructions: null,
					translations: null
				}))
			)
			.select('id');
		if (e4 || ajoutees?.length !== lignes.length)
			throw new Error(
				`Ajout refusé (${ajoutees?.length ?? 0}/${lignes.length}) : ${e4?.message ?? ''}`
			);
		console.log(`  ✍️  ${creesExercices.length} séries créées`);
		console.log(`  ✍️  Fiche « ${FICHE.title} » : ${fiche.id}`);
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiche (lignes en cascade), puis exercices
		// Chaque suppression est relue : un retour arrière qui échoue doit se dire
		const restes: string[] = [];
		if (ficheId) {
			const { data, error } = await supabase
				.from('worksheets')
				.delete()
				.eq('id', ficheId)
				.select('id');
			if (error || data?.length !== 1) restes.push(`fiche ${ficheId}`);
		}
		if (creesExercices.length) {
			const { data, error } = await supabase
				.from('exercises')
				.delete()
				.in('id', creesExercices)
				.select('id');
			if (error || data?.length !== creesExercices.length)
				restes.push(`exercices ${creesExercices.join(', ')}`);
		}
		const cause = err instanceof Error ? err.message : String(err);
		throw new Error(
			restes.length
				? `${cause} — ⚠️ RETOUR ARRIÈRE INCOMPLET, restent en base : ${restes.join(' ; ')}`
				: `${cause} — tout a été défait`
		);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
