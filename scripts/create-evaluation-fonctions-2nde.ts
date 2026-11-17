#!/usr/bin/env tsx

/**
 * Évaluation écrite « Fonctions », seconde — deux sujets A et B (2026-11-05)
 * ==========================================================================
 *
 * Sur le modèle de create-fonctions-generalites-2nde.ts : deux fiches de type
 * `assessment` (« Évaluation : fonctions (sujet A) » / « (sujet B) »), 3 exercices
 * neufs chacune (lecture graphique 9 pts, quotients 5 pts, par le calcul 6 pts),
 * 55 min, calculatrice interdite, réponses sur copie, points imprimés, brouillon.
 * Pas de section : les exercices sont posés directement sur la fiche.
 *
 * Contenu vérifié : calculs et lectures sur la grille (sympy / Fraction, `verif/assert_all.py`),
 * rendu écran de chaque formule (`pnpm check:ubumark`), PDF sujet + corrigé FR/EN compilés
 * avec le compilateur de prod (`pnpm fiche:verifier`).
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ; idempotent
 * (titres déjà présents dans le thème, ou fiche de même titre → arrêt) ; chaque écriture
 * doit rendre sa ligne ; en cas d'échec, fiches et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-evaluation-fonctions-2nde.ts            # simulation
 *   pnpm tsx scripts/create-evaluation-fonctions-2nde.ts --publier  # écrit en prod
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import {
	validateCreateWorksheet,
	validateCreateWorksheetExercise
} from '$lib/server/validation/worksheets';
import { createExercise } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const ECOLE = '05668b78-e4d2-4d85-85b6-183e75d24204';
const MODELE_FICHE_ELEVE = '00000000-0000-4000-8000-000000000012';
const TOPIC = 'Fonctions';
const GRADES = ['2'];
const DUREE_MIN = 55;
const TOTAL_POINTS = 20;
const RACINE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/09504a5e-be34-4b17-8259-781b6ddf0116/scratchpad/eval-fonctions';

const DESCRIPTION = {
	fr: 'Calculatrice interdite. Rédiger les calculs et justifier les réponses sur la copie. Pour les lectures graphiques, expliquer ce que l’on lit.',
	en: 'No calculator. Show your working and justify your answers on paper. When reading a graph, explain what you read.'
};

const SUJETS = [
	{
		dossier: 'A',
		title: 'Évaluation : fonctions (sujet A)',
		en: 'Test: functions (version A)'
	},
	{
		dossier: 'B',
		title: 'Évaluation : fonctions (sujet B)',
		en: 'Test: functions (version B)'
	}
] as const;

const CONFIG_FICHE = {
	language: 'fr',
	show_points: true,
	calculator: 'forbidden',
	answers_on_sheet: false,
	shuffle_exercises: false
} as const;

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	hints: [];
	translations: { en: { statement_md: string; solution_md: string } };
};
type Exo = {
	title: string;
	key: string;
	points: number;
	generic: string[];
	variations: Variation[];
};
type Plan = {
	exercises: {
		key: string;
		title: string;
		en_title: string;
		category: string;
		points: number;
	}[];
};
type Sujet = (typeof SUJETS)[number] & { exos: Exo[] };

const lire = (p: string) => readFileSync(p, 'utf8').trim();

function variation(dir: string, fichier: string): Variation {
	return {
		label: 'guided',
		statement_md: lire(join(dir, 'md', fichier)),
		solution_md: lire(join(dir, 'sol', fichier)),
		hints: [],
		translations: {
			en: {
				statement_md: lire(join(dir, 'en', fichier)),
				solution_md: lire(join(dir, 'sol-en', fichier))
			}
		}
	};
}

/** `generic.txt` : lignes « CLÉ: f,g » → lettres déclarées comme fonctions */
function lettresDeclarees(dir: string): Map<string, string[]> {
	const fichier = join(dir, 'generic.txt');
	const map = new Map<string, string[]>();
	if (!existsSync(fichier)) return map;
	for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
		const [cle, lettres] = ligne.split(':');
		if (!cle || !lettres) continue;
		map.set(
			cle.trim(),
			lettres
				.split(',')
				.map((l) => l.trim())
				.filter(Boolean)
		);
	}
	return map;
}

function chargerSujet(s: (typeof SUJETS)[number]): Sujet {
	const dir = join(RACINE, s.dossier);
	const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8')) as Plan;
	const lettres = lettresDeclarees(dir);
	const exos = plan.exercises.map((e) => {
		if (e.category !== 'application')
			throw new Error(`${s.dossier}/${e.key} : catégorie inattendue « ${e.category} »`);
		if (!Number.isInteger(e.points) || e.points <= 0)
			throw new Error(`${s.dossier}/${e.key} : points invalides (${e.points})`);
		return {
			title: e.title,
			key: e.key,
			points: e.points,
			generic: lettres.get(e.key) ?? [],
			variations: [variation(dir, `${e.key}-guided.md`)]
		};
	});
	const total = exos.reduce((t, e) => t + e.points, 0);
	if (total !== TOTAL_POINTS) throw new Error(`Sujet ${s.dossier} : ${total} points au lieu de 20`);
	return { ...s, exos };
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

	const sujets = SUJETS.map(chargerSujet);
	const tous = sujets.flatMap((s) => s.exos);

	// --- Phase 1a : exercices neufs ------------------------------------------
	for (const e of tous) {
		const v = createExerciseSchema.safeParse({
			title: e.title,
			topic: TOPIC,
			category: 'application',
			grades: GRADES,
			is_public: false,
			variations: e.variations
		});
		if (!v.success)
			throw new Error(
				`« ${e.title} » : Zod refuse — ${v.error.issues[0].path.join('.')} ${v.error.issues[0].message}`
			);
	}
	const titres = tous.map((e) => e.title);
	if (new Set(titres).size !== titres.length)
		throw new Error('Deux exercices portent le même titre');
	const { data: dejaLa, error: e0 } = await supabase
		.from('exercises')
		.select('title')
		.eq('topic', TOPIC)
		.in('title', titres);
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	if (dejaLa && dejaLa.length > 0)
		throw new Error(`Déjà présents : ${dejaLa.map((e) => e.title).join(', ')}`);
	console.log(`  ✓ ${tous.length} exercices neufs validés`);

	// --- Phase 1b : fiches ------------------------------------------------------
	const { data: fichesExistantes, error: e1 } = await supabase
		.from('worksheets')
		.select('id, title')
		.in(
			'title',
			sujets.map((s) => s.title)
		);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (fichesExistantes && fichesExistantes.length > 0)
		throw new Error(`Fiche déjà présente : ${fichesExistantes.map((f) => f.title).join(', ')}`);
	for (const s of sujets) {
		const vf = validateCreateWorksheet({
			title: s.title,
			description: DESCRIPTION.fr,
			translations: { en: { title: s.en, description: DESCRIPTION.en } },
			type: 'assessment',
			config: CONFIG_FICHE,
			style_id: MODELE_FICHE_ELEVE,
			estimated_duration_minutes: DUREE_MIN,
			total_points: TOTAL_POINTS,
			grades: GRADES
		});
		if (!vf.success)
			throw new Error(
				`Fiche « ${s.title} » : Zod refuse — ${vf.error.issues[0].path.join('.')} ${vf.error.issues[0].message}`
			);
		console.log(`\n  📄 ${s.title} — ${DUREE_MIN} min, /${TOTAL_POINTS}`);
		for (const e of s.exos) console.log(`     - ${e.title} (${e.points} pts)`);
	}
	console.log(`\n  ✓ ${sujets.length} fiches validées`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire ----------------
	const creesExercices: string[] = [];
	const creesFiches: string[] = [];
	try {
		for (const s of sujets) {
			const ids: { id: string; points: number }[] = [];
			for (const e of s.exos) {
				const { data, error } = await createExercise(
					supabase,
					{
						title: e.title,
						topic: TOPIC,
						category: 'application',
						grades: GRADES,
						is_public: false,
						variations: e.variations
					} as never,
					DAVID
				);
				if (error || !data)
					throw new Error(
						`« ${e.title} » : création refusée — ${error?.message ?? 'aucune ligne'}`
					);
				creesExercices.push(data.id);
				ids.push({ id: data.id, points: e.points });
				if (e.generic.length > 0) {
					const { data: maj, error: eg } = await supabase
						.from('exercises')
						.update({ generic_functions: e.generic })
						.eq('id', data.id)
						.select('id');
					if (eg || maj?.length !== 1)
						throw new Error(
							`« ${e.title} » : fonctions déclarées refusées — ${eg?.message ?? 'aucune ligne'}`
						);
				}
			}

			const { data: fiche, error: ef } = await supabase
				.from('worksheets')
				.insert({
					title: s.title,
					description: DESCRIPTION.fr,
					type: 'assessment',
					config: CONFIG_FICHE,
					translations: { en: { title: s.en, description: DESCRIPTION.en } },
					status: 'draft',
					version: 1,
					style_id: MODELE_FICHE_ELEVE,
					estimated_duration_minutes: DUREE_MIN,
					total_points: TOTAL_POINTS,
					grades: GRADES,
					created_by: DAVID,
					school_id: ECOLE
				})
				.select('id')
				.single();
			if (ef || !fiche) throw new Error(`Fiche refusée : ${ef?.message ?? 'aucune ligne'}`);
			creesFiches.push(fiche.id);

			const lignes = ids.map((x, i) => ({
				worksheet_id: fiche.id,
				exercise_id: x.id,
				section_id: null,
				position: i + 1,
				points: x.points
			}));
			for (const l of lignes) {
				const v = validateCreateWorksheetExercise({
					exercise_id: l.exercise_id,
					position: l.position,
					variant_mode: 'none',
					section_id: null,
					points: l.points
				});
				if (!v.success)
					throw new Error(`Exercice de fiche refusé par Zod : ${v.error.issues[0].message}`);
			}
			const { data: ajoutees, error: ea } = await supabase
				.from('worksheet_exercises')
				.insert(
					lignes.map((l) => ({
						...l,
						variant_mode: 'none',
						variant_config: {},
						custom_instructions: null,
						translations: null
					}))
				)
				.select('id');
			if (ea || ajoutees?.length !== lignes.length)
				throw new Error(
					`Ajout d'exercices refusé (${ajoutees?.length ?? 0}/${lignes.length}) : ${ea?.message ?? ''}`
				);
			console.log(`  ✍️  Fiche « ${s.title} » (${lignes.length} exercices) : ${fiche.id}`);
		}
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiches (lignes en cascade), puis exercices neufs
		if (creesFiches.length) await supabase.from('worksheets').delete().in('id', creesFiches);
		if (creesExercices.length) await supabase.from('exercises').delete().in('id', creesExercices);
		throw new Error(`${err instanceof Error ? err.message : String(err)} — tout a été défait`);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
