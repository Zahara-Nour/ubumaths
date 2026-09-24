#!/usr/bin/env tsx

/**
 * Fonction exponentielle, 1ʳᵉ spé : 24 exercices et 2 fiches (2026-09-24)
 * ======================================================================
 *
 * Copie de create-suites-1spe.ts. Sur le modèle des fiches « second degré » :
 *  - « Entraînement technique — Fonction exponentielle » : 13 exercices `automatisme` ;
 *  - « Applications de la fonction exponentielle » : 11 exercices `application` en 3 sections
 *    (Exploiter un modèle / Construire un modèle, avec variations guidée et
 *    autonome / Recherche).
 * Énoncés et corrigés FR + EN rédigés à la main, résultats vérifiés par calcul
 * formel ; sans logarithme (hors programme de 1ʳᵉ) ; rendu PDF compilé (fiche + corrigé, FR et EN) sans erreur de formule.
 *
 * Passe par createExercise() et reproduit les insertions des routes
 * POST /api/worksheets, …/sections, …/exercises, avec leurs schémas Zod.
 *
 * Garde-fous : base = prod ; tout est validé AVANT la moindre écriture ;
 * idempotent (titres déjà présents dans le thème « Suites » ou fiche de même
 * titre → arrêt) ; chaque insertion doit rendre sa ligne ; en cas d'échec,
 * tout ce qui a été créé par ce passage est supprimé.
 *
 * Usage :
 *   pnpm tsx scripts/create-exponentielle-1spe.ts            # simulation
 *   pnpm tsx scripts/create-exponentielle-1spe.ts --publier  # écrit en prod
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
const TOPIC = 'Fonction exponentielle';
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/expo';

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
type Exo = {
	title: string;
	category: 'automatisme' | 'application';
	section?: string;
	variations: Variation[];
};

function variation(base: string, fichier: string, label: string): Variation {
	return {
		label,
		statement_md: lire(join(base, 'md', fichier)),
		solution_md: lire(join(base, 'sol', fichier)),
		hints: [],
		translations: {
			en: {
				statement_md: lire(join(base, 'en', fichier)),
				solution_md: lire(join(base, 'sol-en', fichier))
			}
		}
	};
}

function exercicesTechniques(): Exo[] {
	const base = join(DIR, 'tech');
	return lire(join(base, 'titles.txt'))
		.split('\n')
		.map((title, i) => {
			const f = `${String(i + 1).padStart(2, '0')}.md`;
			return {
				title,
				category: 'automatisme' as const,
				variations: [variation(base, f, 'guided')]
			};
		});
}

type Plan = {
	sections: { id: string; title: string; position: number; en: string }[];
	exercises: { key: string; section: string; title: string; en_title: string }[];
};

function exercicesApplication(plan: Plan): Exo[] {
	const base = join(DIR, 'app');
	return plan.exercises.map((e) => {
		const variations = [variation(base, `${e.key}-guided.md`, 'guided')];
		if (existsSync(join(base, 'md', `${e.key}-autonomous.md`))) {
			variations.push(variation(base, `${e.key}-autonomous.md`, 'autonomous'));
		}
		return { title: e.title, category: 'application' as const, section: e.section, variations };
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

	const plan = JSON.parse(readFileSync(join(DIR, 'app', 'plan.json'), 'utf8')) as Plan;
	const tech = exercicesTechniques();
	const app = exercicesApplication(plan);

	// --- Phase 1 : tout valider ---------------------------------------------
	const tous = [...tech, ...app];
	for (const e of tous) {
		const v = createExerciseSchema.safeParse({
			title: e.title,
			topic: TOPIC,
			category: e.category,
			grades: ['1_SPE'],
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

	const { data: existants, error: e0 } = await supabase
		.from('exercises')
		.select('title')
		.eq('topic', TOPIC)
		.in('title', titres);
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	if (existants && existants.length > 0)
		throw new Error(`Déjà présents : ${existants.map((e) => e.title).join(', ')}`);

	const FICHES = {
		tech: {
			title: 'Entraînement technique — Fonction exponentielle',
			description:
				'Rédiger les calculs et justifier les réponses sur une copie. Donner les valeurs exactes, et utiliser la calculatrice lorsque cela est demandé.',
			translations: {
				en: {
					title: 'Technical practice — The exponential function',
					description:
						'Show your working and justify your answers on paper. Give exact values, and use a calculator when asked.'
				}
			}
		},
		app: {
			title: 'Applications de la fonction exponentielle',
			description: null,
			translations: { en: { title: 'The exponential function in context' } }
		}
	};
	const { data: fichesExistantes, error: e1 } = await supabase
		.from('worksheets')
		.select('id, title')
		.in('title', [FICHES.tech.title, FICHES.app.title]);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (fichesExistantes && fichesExistantes.length > 0)
		throw new Error(`Fiche déjà présente : ${fichesExistantes.map((f) => f.title).join(', ')}`);

	for (const f of Object.values(FICHES)) {
		const v = validateCreateWorksheet({
			...f,
			type: 'worksheet',
			config: CONFIG_FICHE,
			template_id: MODELE_FICHE_ELEVE,
			grades: ['1_SPE']
		});
		if (!v.success)
			throw new Error(`Fiche « ${f.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}
	for (const s of plan.sections) {
		const v = validateCreateWorksheetSection({
			title: s.title,
			position: s.position,
			translations: { en: { title: s.en } }
		});
		if (!v.success)
			throw new Error(`Section « ${s.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}

	console.log(
		`  ✓ ${tech.length} exercices techniques, ${app.length} d'application (${app.reduce((n, e) => n + e.variations.length, 0)} variations)`
	);
	console.log('  ✓ 2 fiches et 3 sections validées');
	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire en cas d'échec --
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
					grades: ['1_SPE'],
					is_public: false,
					variations: e.variations
				} as never,
				DAVID
			);
			if (error || !data)
				throw new Error(`« ${e.title} » : création refusée — ${error?.message ?? 'aucune ligne'}`);
			creesExercices.push(data.id);
			ids.set(e.title, data.id);
		}
		console.log(`  ✍️  ${creesExercices.length} exercices créés`);

		const creerFiche = async (f: (typeof FICHES)['tech'] | (typeof FICHES)['app']) => {
			const { data, error } = await supabase
				.from('worksheets')
				.insert({
					title: f.title,
					description: f.description,
					type: 'worksheet',
					config: CONFIG_FICHE,
					translations: f.translations,
					status: 'draft',
					version: 1,
					template_id: MODELE_FICHE_ELEVE,
					grades: ['1_SPE'],
					created_by: DAVID,
					school_id: ECOLE
				})
				.select('id')
				.single();
			if (error || !data)
				throw new Error(`Fiche « ${f.title} » refusée : ${error?.message ?? 'aucune ligne'}`);
			creesFiches.push(data.id);
			return data.id;
		};

		const ajouter = async (
			lignes: {
				worksheet_id: string;
				exercise_id: string;
				section_id: string | null;
				position: number;
			}[]
		) => {
			for (const l of lignes) {
				const v = validateCreateWorksheetExercise({
					exercise_id: l.exercise_id,
					position: l.position,
					variant_mode: 'none',
					section_id: l.section_id ?? undefined
				});
				if (!v.success)
					throw new Error(`Exercice de fiche refusé par Zod : ${v.error.issues[0].message}`);
			}
			const { data, error } = await supabase
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
			if (error || data?.length !== lignes.length)
				throw new Error(
					`Ajout d'exercices refusé (${data?.length ?? 0}/${lignes.length}) : ${error?.message ?? ''}`
				);
		};

		// Fiche technique : sans sections, ordre des titres
		const ficheTech = await creerFiche(FICHES.tech);
		await ajouter(
			tech.map((e, i) => ({
				worksheet_id: ficheTech,
				exercise_id: ids.get(e.title)!,
				section_id: null,
				position: i + 1
			}))
		);
		console.log(`  ✍️  Fiche « ${FICHES.tech.title} » : ${ficheTech}`);

		// Fiche d'application : 3 sections, positions recommençant à 1 dans chacune
		const ficheApp = await creerFiche(FICHES.app);
		const sectionIds = new Map<string, string>();
		for (const s of plan.sections) {
			const { data, error } = await supabase
				.from('worksheet_sections')
				.insert({
					worksheet_id: ficheApp,
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
		const rang = new Map<string, number>();
		await ajouter(
			app.map((e) => {
				const pos = (rang.get(e.section!) ?? 0) + 1;
				rang.set(e.section!, pos);
				return {
					worksheet_id: ficheApp,
					exercise_id: ids.get(e.title)!,
					section_id: sectionIds.get(e.section!)!,
					position: pos
				};
			})
		);
		console.log(`  ✍️  Fiche « ${FICHES.app.title} » : ${ficheApp}`);
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiches (et leurs lignes, en cascade) puis exercices
		if (creesFiches.length) await supabase.from('worksheets').delete().in('id', creesFiches);
		if (creesExercices.length) await supabase.from('exercises').delete().in('id', creesExercices);
		throw new Error(
			`${err instanceof Error ? err.message : String(err)} — tout ce qui avait été créé a été supprimé`
		);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
