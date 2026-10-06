#!/usr/bin/env tsx

/**
 * Fonctions : généralités, seconde — exercices neufs + un existant, 1 fiche (2026-10-06)
 * =====================================================================================
 *
 * Sur le modèle de la géométrie repérée (create-geometrie-reperee-1spe.ts), programme de
 * seconde (partie Fonctions) : images, antécédents, appartenance d'un point à une courbe,
 * lectures graphiques (images, antécédents, équations et inéquations, variations, signe,
 * extremums). Une seule fiche, 3 sections ; l'exercice existant de David « Calcul
 * d'images » est placé à la fin de la section A, sans être modifié.
 *
 * Contenu vérifié : calcul et lectures sur la grille (sympy), rendu écran de chaque formule
 * (`pnpm check:ubumark`), PDF fiche + corrigé FR/EN compilés avec le compilateur de prod
 * (typst.ts 0.6.1-rc5), sans débord de colonne.
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ; idempotent
 * (titres déjà présents dans le thème, ou fiche de même titre → arrêt) ; existant retrouvé
 * par préfixe d'id (un seul résultat) et titre vérifié ; chaque écriture doit rendre sa
 * ligne ; en cas d'échec, fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-fonctions-generalites-2nde.ts            # simulation
 *   pnpm tsx scripts/create-fonctions-generalites-2nde.ts --publier  # écrit en prod
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema } from '$lib/server/validation/exercises';
import {
	validateCreateWorksheet,
	validateCreateWorksheetExercise,
	validateCreateWorksheetSection
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

/** Exercices existants de David placés à la fin de chaque section (préfixe d'id, titre). */
const EXISTANTS_SECTION: Record<string, [string, string][]> = {
	A: [['5b233301', "Calcul d'images"]]
};
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/ec83f84a-f674-4ead-b041-77b5bdc544a3/scratchpad/fct2';

const FICHE = {
	title: 'Fonctions : généralités',
	description:
		'Rédiger les calculs et justifier les réponses sur une copie. Pour les lectures graphiques, expliquer ce que l’on lit.',
	translations: {
		en: {
			title: 'Functions: the basics',
			description:
				'Show your working and justify your answers on paper. When reading a graph, explain what you read.'
		}
	}
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

const lire = (p: string) => readFileSync(p, 'utf8').trim();

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	hints: [];
	translations: { en: { statement_md: string; solution_md: string } };
};
type Categorie = 'automatisme' | 'application';
type Exo = {
	title: string;
	category: Categorie;
	section: string;
	key: string;
	generic: string[];
	variations: Variation[];
};
type Plan = {
	sections: { id: string; title: string; position: number; en: string }[];
	exercises: {
		key: string;
		section: string;
		title: string;
		en_title: string;
		category: Categorie;
	}[];
};

function variation(fichier: string, label: string): Variation {
	return {
		label,
		statement_md: lire(join(DIR, 'md', fichier)),
		solution_md: lire(join(DIR, 'sol', fichier)),
		hints: [],
		translations: {
			en: {
				statement_md: lire(join(DIR, 'en', fichier)),
				solution_md: lire(join(DIR, 'sol-en', fichier))
			}
		}
	};
}

/** `generic.txt` : lignes « CLÉ: A,B » → lettres déclarées comme fonctions */
function lettresDeclarees(): Map<string, string[]> {
	const fichier = join(DIR, 'generic.txt');
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

function exercices(plan: Plan): Exo[] {
	const lettres = lettresDeclarees();
	return plan.exercises.map((e) => {
		if (e.category !== 'automatisme' && e.category !== 'application')
			throw new Error(`${e.key} : catégorie inattendue « ${e.category} »`);
		const variations = [variation(`${e.key}-guided.md`, 'guided')];
		if (existsSync(join(DIR, 'md', `${e.key}-autonomous.md`))) {
			variations.push(variation(`${e.key}-autonomous.md`, 'autonomous'));
		}
		return {
			title: e.title,
			key: e.key,
			generic: lettres.get(e.key) ?? [],
			category: e.category,
			section: e.section,
			variations
		};
	});
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

	const plan = JSON.parse(readFileSync(join(DIR, 'plan.json'), 'utf8')) as Plan;
	const tous = exercices(plan);
	const sectionsConnues = new Set(plan.sections.map((s) => s.id));
	for (const e of tous) {
		if (!sectionsConnues.has(e.section))
			throw new Error(`${e.key} : section « ${e.section} » inconnue`);
	}

	// --- Phase 1a : exercices neufs ------------------------------------------
	for (const e of tous) {
		const v = createExerciseSchema.safeParse({
			title: e.title,
			topic: TOPIC,
			category: e.category,
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

	// --- Phase 1b : exercices existants (retrouvés, jamais modifiés) --------
	const { data: lus, error: e2 } = await supabase.from('exercises').select('id, title, variations');
	if (e2) throw new Error(`Lecture des existants impossible : ${e2.message}`);
	const existant = (prefixe: string, titre: string): string => {
		const trouves = (lus ?? []).filter((e) => e.id.startsWith(prefixe));
		if (trouves.length !== 1)
			throw new Error(`Exercice existant ${prefixe} : ${trouves.length} trouvé(s)`);
		if (trouves[0].title !== titre)
			throw new Error(
				`Exercice existant ${prefixe} : titre « ${trouves[0].title} », attendu « ${titre} »`
			);
		return trouves[0].id;
	};
	const existantsSection = new Map(
		Object.entries(EXISTANTS_SECTION).map(([s, liste]) => [
			s,
			liste.map(([p, t]) => existant(p, t))
		])
	);
	console.log(
		`  ✓ ${[...existantsSection.values()].flat().length} exercice(s) existant(s) retrouvé(s)`
	);

	// --- Phase 1c : fiche et sections ----------------------------------------
	const { data: fichesExistantes, error: e1 } = await supabase
		.from('worksheets')
		.select('id, title')
		.eq('title', FICHE.title);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (fichesExistantes && fichesExistantes.length > 0)
		throw new Error(`Fiche déjà présente : ${FICHE.title}`);
	const vf = validateCreateWorksheet({
		...FICHE,
		type: 'worksheet',
		config: CONFIG_FICHE,
		grades: GRADES
	});
	if (!vf.success) throw new Error(`Fiche : Zod refuse — ${vf.error.issues[0].message}`);
	for (const s of plan.sections) {
		const v = validateCreateWorksheetSection({
			title: s.title,
			position: s.position,
			translations: { en: { title: s.en } }
		});
		if (!v.success)
			throw new Error(`Section « ${s.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}
	console.log(`  ✓ 1 fiche et ${plan.sections.length} sections validées`);
	for (const s of plan.sections) {
		console.log(`\n  § ${s.title}`);
		for (const e of tous.filter((x) => x.section === s.id))
			console.log(`     - ${e.title} (${e.category})`);
		for (const p of EXISTANTS_SECTION[s.id] ?? []) console.log(`     - ${p[1]} (existant ${p[0]})`);
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire ----------------
	const creesExercices: string[] = [];
	const creesFiches: string[] = [];
	try {
		const ids = new Map<string, string>();
		for (const e of tous) {
			const { data, error } = await createExercise(
				supabase,
				{
					title: e.title,
					topic: TOPIC,
					category: e.category,
					grades: GRADES,
					is_public: false,
					variations: e.variations
				} as never,
				DAVID
			);
			if (error || !data)
				throw new Error(`« ${e.title} » : création refusée — ${error?.message ?? 'aucune ligne'}`);
			creesExercices.push(data.id);
			ids.set(e.key, data.id);
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
		console.log(`  ✍️  ${creesExercices.length} exercices créés`);

		const { data: fiche, error: ef } = await supabase
			.from('worksheets')
			.insert({
				title: FICHE.title,
				description: FICHE.description,
				type: 'worksheet',
				config: CONFIG_FICHE,
				translations: FICHE.translations,
				status: 'draft',
				version: 1,
				template_id: MODELE_FICHE_ELEVE,
				grades: GRADES,
				created_by: DAVID,
				school_id: ECOLE
			})
			.select('id')
			.single();
		if (ef || !fiche) throw new Error(`Fiche refusée : ${ef?.message ?? 'aucune ligne'}`);
		creesFiches.push(fiche.id);

		const sectionIds = new Map<string, string>();
		for (const s of plan.sections) {
			const { data, error } = await supabase
				.from('worksheet_sections')
				.insert({
					worksheet_id: fiche.id,
					title: s.title,
					instructions: null,
					translations: { en: { title: s.en } },
					position: s.position
				})
				.select('id')
				.single();
			if (error || !data)
				throw new Error(`Section « ${s.title} » refusée : ${error?.message ?? 'aucune ligne'}`);
			sectionIds.set(s.id, data.id);
		}

		const lignes: {
			worksheet_id: string;
			exercise_id: string;
			section_id: string;
			position: number;
		}[] = [];
		const rang = new Map<string, number>();
		const placer = (section: string, exerciseId: string) => {
			const pos = (rang.get(section) ?? 0) + 1;
			rang.set(section, pos);
			lignes.push({
				worksheet_id: fiche.id,
				exercise_id: exerciseId,
				section_id: sectionIds.get(section)!,
				position: pos
			});
		};
		for (const s of plan.sections) {
			for (const e of tous.filter((x) => x.section === s.id)) placer(s.id, ids.get(e.key)!);
			for (const id of existantsSection.get(s.id) ?? []) placer(s.id, id);
		}
		for (const l of lignes) {
			const v = validateCreateWorksheetExercise({
				exercise_id: l.exercise_id,
				position: l.position,
				variant_mode: 'none',
				section_id: l.section_id
			});
			if (!v.success)
				throw new Error(`Exercice de fiche refusé par Zod : ${v.error.issues[0].message}`);
		}
		const { data: ajoutees, error: ea } = await supabase
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
		if (ea || ajoutees?.length !== lignes.length)
			throw new Error(
				`Ajout d'exercices refusé (${ajoutees?.length ?? 0}/${lignes.length}) : ${ea?.message ?? ''}`
			);
		console.log(`  ✍️  Fiche « ${FICHE.title} » (${lignes.length} exercices) : ${fiche.id}`);
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiche (lignes en cascade), puis exercices neufs
		if (creesFiches.length) await supabase.from('worksheets').delete().in('id', creesFiches);
		if (creesExercices.length) await supabase.from('exercises').delete().in('id', creesExercices);
		throw new Error(`${err instanceof Error ? err.message : String(err)} — tout a été défait`);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
