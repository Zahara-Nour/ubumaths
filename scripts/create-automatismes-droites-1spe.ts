#!/usr/bin/env tsx

/**
 * Automatismes de 1re : droites — fiche de séries figées (2026-11-03, ADR 0011)
 * =============================================================================
 *
 * Fiche « Automatismes : droites (1) » : 2 séries de 8 questions, chacune un exercice
 * ordinaire fait d'instances de modèles de questions tirées avec une graine fixe (même
 * copie pour toute la classe). Capacités du programme de 1re (Automatismes, « Fonctions
 * et représentations ») : tracer une droite (équation réduite ; point et coefficient
 * directeur), lire graphiquement l'équation réduite, coefficient directeur par deux
 * points ; plus l'entretien des automatismes de seconde sur les droites. Modèles :
 *  - modèles de seconde et de 1re déjà en base, réutilisés tels quels ;
 *  - 1 modèle neuf (`scripts/questions/droites-1spe/`, créé par
 *    `scripts/create-questions.ts`), retrouvé par identifiant.
 * Une droite à tracer : repère vide à l'énoncé, droite dessinée au corrigé (`buildSerie`).
 * Changer une graine change la copie : les graines sont la fiche.
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-droites-1spe.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-droites-1spe.ts --publier  # écrit en prod
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
	/** 2de/1re — pente d'une droite passant par deux points */
	penteDeuxPoints: '7d6cf480-b062-4e45-a593-2e85fbeb28b3',
	/** 2de — lire la pente sur une équation */
	penteEquation: '49df6491-f424-4560-8fba-a9c302449e3d',
	/** 2de — lire la pente sur un graphique */
	penteGraphique: 'f381c646-80fa-4cd2-86c0-0c3d9ad934be',
	/** 2de — équation réduite (point sur la droite, équation réduite d'une cartésienne) */
	equationReduite: '7f308eb4-40f9-408e-9c71-012464d0f79d',
	/** 2de — équation par un point et la pente */
	pointPente: 'e6552232-b549-4966-8863-1cba6f945fcc',
	/** 2de — équation par deux points */
	deuxPoints: '6e074f0e-0c3a-41b8-b70a-82cb402494b3',
	/** 2de — deux droites par leurs équations : parallèles ou sécantes */
	paralleles: 'c23f5a94-269d-4f2d-915a-ca234cec67a6',
	/** 2de — tracer une droite donnée par son équation réduite */
	tracerReduite: '8d4bd94d-73f7-4589-8b3f-67c84edcf778',
	/** 1re — tracer une droite donnée par un point et sa pente */
	tracerPointPente: 'dc5d7cb6-5d9a-41ca-89c3-83f4d6750613',
	/** 1re, neuf — lire l'équation réduite sur un graphique (01-lire-equation-reduite.json) */
	lireEquation: 'f5585668-2ec1-45d1-a279-d82f45903926'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Droites — série 1',
		items: [
			q('penteDeuxPoints', 1),
			q('penteEquation', 1),
			q('tracerReduite', 1),
			q('penteGraphique', 5),
			q('lireEquation', 7),
			q('equationReduite', 1),
			q('tracerPointPente', 1),
			q('paralleles', 1)
		]
	},
	{
		title: 'Droites — série 2',
		items: [
			q('penteDeuxPoints', 12),
			q('lireEquation', 5),
			q('pointPente', 1),
			q('tracerPointPente', 2),
			q('deuxPoints', 1),
			q('tracerReduite', 2),
			q('paralleles', 4),
			q('lireEquation', 8)
		]
	}
];

const FICHE = {
	title: 'Automatismes : droites (1)',
	description: 'Répondre directement ; tracer à la règle dans le repère.',
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
