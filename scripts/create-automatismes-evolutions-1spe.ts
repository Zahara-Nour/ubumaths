#!/usr/bin/env tsx

/**
 * Automatismes de 1re : évolutions — fiche de séries figées (2026-09-28, ADR 0011)
 * ================================================================================
 *
 * Fiche « Automatismes : évolutions (1) » : 2 séries de 8 questions, chacune un
 * exercice ordinaire fait d'instances de modèles de questions tirées avec une
 * graine fixe (même copie pour toute la classe). Modèles utilisés :
 *  - 4 modèles de seconde déjà en base (coefficient multiplicateur d'une hausse /
 *    d'une baisse, taux d'augmentation / de diminution), réutilisés tels quels ;
 *  - 5 modèles neufs de 1re (`scripts/questions/evolutions-1spe/`, créés par
 *    `scripts/create-questions.ts`), retrouvés par titre et emplacement.
 * Changer une graine change la copie : les graines sont la fiche.
 *
 * Garde-fous : base = prod ; modèles tous retrouvés (un seul chacun) ; séries
 * construites et validées (Zod) AVANT la moindre écriture ; arrêt si un titre
 * d'exercice existe déjà dans le thème ou si la fiche existe ; chaque écriture doit
 * rendre sa ligne ; en cas d'échec, fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-evolutions-1spe.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-evolutions-1spe.ts --publier  # écrit en prod
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
const DOSSIER_QUESTIONS = 'scripts/questions/evolutions-1spe';

/** Modèles de seconde réutilisés (ADR 0011 : pas de niveau 1re ajouté) */
const SECONDE = {
	coefHausse: 'e12e58cb-1630-4bfe-bb43-5726c325a918',
	coefBaisse: 'd98aa53a-2a3f-4c2f-b702-9abbc5065e6a',
	tauxHausse: '2562438e-4ad7-4c95-b9a4-0b3534ceaed0',
	tauxBaisse: 'e05bb79b-f304-4bab-a856-ee73b5a20e6a'
};
/** Modèles neufs de 1re, par fichier */
const PREMIERE = {
	appliquer: '01-appliquer-evolution.json',
	initiale: '02-valeur-initiale.json',
	reciproque: '03-taux-reciproque.json',
	successives: '04-evolutions-successives.json',
	repetee: '05-evolution-repetee.json'
};

type Ref = { seconde: keyof typeof SECONDE } | { premiere: keyof typeof PREMIERE };
const s = (seconde: keyof typeof SECONDE, seed: number) => ({ ref: { seconde } as Ref, seed });
const p = (premiere: keyof typeof PREMIERE, seed: number) => ({ ref: { premiere } as Ref, seed });

const SERIES = [
	{
		title: 'Évolutions — série 1',
		items: [
			s('coefHausse', 1),
			s('coefBaisse', 2),
			p('appliquer', 3),
			s('tauxHausse', 4),
			p('initiale', 5),
			p('reciproque', 6),
			p('successives', 7),
			p('repetee', 8)
		]
	},
	{
		title: 'Évolutions — série 2',
		items: [
			s('coefBaisse', 11),
			p('appliquer', 12),
			s('tauxBaisse', 21),
			p('initiale', 14),
			s('coefHausse', 15),
			p('reciproque', 16),
			p('repetee', 17),
			p('successives', 18)
		]
	}
];

const FICHE = {
	title: 'Automatismes : évolutions (1)',
	description: 'Répondre directement, sans calculatrice si possible.',
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
	const cleDe = (ref: Ref) => ('seconde' in ref ? SECONDE[ref.seconde] : PREMIERE[ref.premiere]);
	const { data: secondes, error: e0 } = await supabase
		.from('question_templates')
		.select('*')
		.in('id', Object.values(SECONDE));
	if (e0) throw new Error(`Lecture des modèles de seconde impossible : ${e0.message}`);
	if (secondes?.length !== 4) throw new Error(`Modèles de seconde : ${secondes?.length ?? 0}/4`);
	for (const row of secondes) modeles.set(row.id, toQuestionTemplate(row));
	for (const fichier of Object.values(PREMIERE)) {
		const brut = JSON.parse(readFileSync(join(DOSSIER_QUESTIONS, fichier), 'utf8')) as {
			title: string;
			theme: string;
			domain: string;
			subdomain: string;
			level: number;
		};
		const { data, error } = await supabase
			.from('question_templates')
			.select('*')
			.eq('title', brut.title)
			.eq('theme', brut.theme)
			.eq('domain', brut.domain)
			.eq('subdomain', brut.subdomain)
			.eq('level', brut.level);
		if (error) throw new Error(`${fichier} : lecture impossible — ${error.message}`);
		if (data?.length !== 1)
			throw new Error(
				`${fichier} : ${data?.length ?? 0} modèle(s) en base (lancer create-questions.ts)`
			);
		modeles.set(fichier, toQuestionTemplate(data[0]));
	}
	console.log(`  ✓ ${modeles.size} modèles retrouvés`);

	// --- Phase 1b : construire et valider les séries ---------------------------
	const exercices = SERIES.map((serie) => {
		const items: SerieItem[] = serie.items.map((i) => ({
			templateId: cleDe(i.ref),
			seed: i.seed
		}));
		const { statement, solution, genericFunctions } = buildSerie(modeles, items);
		const donnees = {
			title: serie.title,
			topic: TOPIC,
			category: 'automatisme' as const,
			grades: ['1_SPE'],
			is_public: false,
			// Fonctions déclarées par les modèles (`P`, `C`) : l'exercice figé les lit aussi
			...(genericFunctions && { generic_functions: genericFunctions }),
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
				template_id: MODELE_FICHE_ELEVE,
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
