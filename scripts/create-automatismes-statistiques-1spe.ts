#!/usr/bin/env tsx

/**
 * Automatismes de 1re : statistiques — fiche de séries figées (2026-11-04, ADR 0011)
 * =================================================================================
 *
 * Fiche « Automatismes : statistiques (1) » : 2 séries de 8 questions, chacune un
 * exercice ordinaire fait d'instances de modèles de questions tirées avec une graine fixe
 * (même copie pour toute la classe). Capacités du programme de 1re (Automatismes,
 * « Statistiques ») : lire un graphique (histogramme, circulaire, boîte à moustaches,
 * échelle d'un axe qui ne part pas de 0), passer du graphique aux données et des données
 * au graphique (boîte à construire, angle d'un secteur), calculer et interpréter des
 * indicateurs ; plus l'entretien de seconde (moyenne, médiane, quartiles, écart type,
 * fréquences conditionnelles et marginales). Modèles :
 *  - modèles de 3e et de seconde déjà en base, réutilisés tels quels (deux brouillons de
 *    3e, `1bd7378d` et `9a9026fc`, à publier avec la fiche) ;
 *  - 2 modèles neufs (`scripts/questions/statistiques-1spe/`, créés par
 *    `scripts/create-questions.ts`), retrouvés par identifiant.
 * Une boîte à construire : axe seul à l'énoncé, boîte dessinée au corrigé (`buildSerie`).
 * Changer une graine change la copie : les graines sont la fiche. Graines changées :
 * fréquence conditionnelle 1 → 5 (4/5 plutôt que 8/67) ; axe tronqué 1 → 7 (variante en
 * choix : la comparaison trompeuse) ; angle d’un secteur 1 → 12 (données → angle).
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-statistiques-1spe.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-statistiques-1spe.ts --publier  # écrit en prod
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

/** Modèles en base (ADR 0011 : pas de niveau 1re ajouté aux modèles d'autres niveaux) */
const MODELES = {
	/** 2de — lire un histogramme */
	histogramme: '7ca1d2da-5519-4968-b903-5003ed4b1502',
	/** 5e — interpréter un diagramme circulaire */
	circulaire: '86e43598-c030-41bb-8f06-3db0bbc51d1b',
	/** 3e, brouillon — lire une boîte à moustaches */
	boiteALire: '1bd7378d-e2e3-4c28-af26-16fa904e58dd',
	/** 3e, brouillon — construire une boîte à moustaches */
	boiteAConstruire: '9a9026fc-8baf-4d1f-b1ff-0d6758de63fe',
	/** 2de — comparer deux séries sur leurs boîtes à moustaches */
	deuxBoites: 'b73677c8-0bb9-4e8d-af79-3a45d30a6a11',
	/** 2de — lire un polygone des fréquences cumulées */
	frequencesCumulees: '7a56029d-3c3b-4dcd-a7fc-c94912d9d80f',
	/** 2de — moyenne d'une série regroupée en classes */
	moyenneRegroupee: '90e2e7d8-4c6a-4ce9-b870-79e300381d14',
	/** 2de — linéarité de la moyenne */
	lineariteMoyenne: 'ba0925ce-e338-4a87-91f5-270c55329e0b',
	/** 3e — médiane d'une série à effectifs */
	mediane: '96992ea8-a78f-433d-90e4-5824ed7afb45',
	/** 3e — quartiles d'une série à effectifs */
	quartiles: 'acaa7317-3003-4b1a-bde4-ac95bcd3016c',
	/** 2de — écart type d'une série */
	ecartType: 'ef92701a-a752-42b5-9873-7aa9f2035166',
	/** 2de — comparer deux séries : moyenne et écart type */
	comparerSeries: '893eb3cd-4c8e-4957-b739-844bcb4caaa7',
	/** 2de — calculer une fréquence conditionnelle */
	frequenceConditionnelle: 'ed96107e-a0ba-49a2-afad-e5c75d5c4c3e',
	/** 2de — calculer une fréquence marginale */
	frequenceMarginale: '62105594-17b0-4a0e-91e1-f5be360db13f',
	/** 1re, neuf — graphique à axe tronqué (01-graphique-axe-tronque.json) */
	axeTronque: '1c86d122-92f8-4bee-a566-b023ffb79dda',
	/** 1re, neuf — angle d'un secteur circulaire (02-angle-secteur-circulaire.json) */
	angleSecteur: '9852d62c-4109-4155-aa56-afef8c72d923'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Statistiques — série 1',
		items: [
			q('histogramme', 1),
			q('circulaire', 1),
			q('boiteALire', 1),
			q('moyenneRegroupee', 1),
			q('mediane', 1),
			q('ecartType', 1),
			q('frequenceConditionnelle', 5),
			q('axeTronque', 7)
		]
	},
	{
		title: 'Statistiques — série 2',
		items: [
			q('frequencesCumulees', 1),
			q('deuxBoites', 1),
			q('boiteAConstruire', 1),
			q('lineariteMoyenne', 1),
			q('quartiles', 1),
			q('comparerSeries', 1),
			q('frequenceMarginale', 1),
			q('angleSecteur', 12)
		]
	}
];

const FICHE = {
	title: 'Automatismes : statistiques (1)',
	description:
		'Lire les graphiques, calculer et interpréter les indicateurs ; construire la boîte.',
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
