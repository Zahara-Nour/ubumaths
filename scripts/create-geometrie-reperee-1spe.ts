#!/usr/bin/env tsx

/**
 * Géométrie repérée, 1ʳᵉ spé : exercices neufs + existants, 2 fiches (2026-09-26)
 * ==============================================================================
 *
 * Sur le modèle du produit scalaire (create-produit-scalaire-1spe.ts), programme de
 * 1re de 2026 (vecteur normal, équation cartésienne de droite, projeté orthogonal,
 * équation de cercle ; approfondissements : points équidistants d'un point et d'une
 * droite, intersections avec une droite parallèle à un axe) :
 *  - « Entraînement technique — Géométrie repérée » : 10 exercices `automatisme`
 *    neufs, entrelacés avec deux exercices existants de David (« Projeté
 *    orthogonal », « Forme canonique et équation de cercle »), qu'on ne modifie
 *    pas — ils restent aussi dans leurs fiches d'origine ;
 *  - « Applications de la géométrie repérée » : 8 exercices `application` neufs
 *    en 3 sections.
 * Nouveau thème « Géométrie repérée » (« Bilan technique » existe déjà dans
 * « Géométrie »).
 *
 * Contenu vérifié : calcul (sympy, 297 assertions), rendu écran de chaque formule
 * (`pnpm check:ubumark`), PDF fiche + corrigé FR/EN compilés avec le compilateur de
 * prod (typst.ts 0.6.1-rc5), sans débord de colonne (texte et tracés).
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ;
 * idempotent (titres déjà présents dans le thème, ou fiches de même titre →
 * arrêt) ; existants retrouvés par préfixe d'id (un seul résultat) et titre
 * vérifié ; chaque écriture doit rendre sa ligne ; en cas d'échec, fiches et
 * exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-geometrie-reperee-1spe.ts            # simulation
 *   pnpm tsx scripts/create-geometrie-reperee-1spe.ts --publier  # écrit en prod
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
const TOPIC = 'Géométrie repérée';

/**
 * Exercices existants de David (préfixe d'id → titre attendu), insérés APRÈS
 * l'exercice neuf de même numéro dans la fiche technique.
 */
const EXISTANTS_APRES: Record<string, [string, string][]> = {
	'05': [['96c54dc9', 'Projeté orthogonal']],
	'07': [['5b2ac4dd', 'Forme canonique et équation de cercle']]
};

/** Exercices existants de David placés à la fin de chaque section d'application. */
const EXISTANTS_SECTION: Record<string, [string, string | null][]> = {};
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/gr';

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
	key: string;
	generic: string[];
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

/** `generic.txt` : lignes « CLÉ: A,B » → lettres déclarées comme fonctions */
function lettresDeclarees(base: string): Map<string, string[]> {
	const fichier = join(base, 'generic.txt');
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

function exercicesTechniques(): Exo[] {
	const base = join(DIR, 'tech');
	const lettres = lettresDeclarees(base);
	return lire(join(base, 'titles.txt'))
		.split('\n')
		.map((title, i) => {
			const key = String(i + 1).padStart(2, '0');
			return {
				title,
				key,
				generic: lettres.get(key) ?? [],
				category: 'automatisme' as const,
				variations: [variation(base, `${key}.md`, 'guided')]
			};
		});
}

type Plan = {
	sections: { id: string; title: string; position: number; en: string }[];
	exercises: { key: string; section: string; title: string; en_title: string }[];
};

function exercicesApplication(plan: Plan): Exo[] {
	const base = join(DIR, 'app');
	const lettres = lettresDeclarees(base);
	return plan.exercises.map((e) => {
		const variations = [variation(base, `${e.key}-guided.md`, 'guided')];
		if (existsSync(join(base, 'md', `${e.key}-autonomous.md`))) {
			variations.push(variation(base, `${e.key}-autonomous.md`, 'autonomous'));
		}
		return {
			title: e.title,
			key: e.key,
			generic: lettres.get(e.key) ?? [],
			category: 'application' as const,
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

	const plan = JSON.parse(readFileSync(join(DIR, 'app', 'plan.json'), 'utf8')) as Plan;
	const tech = exercicesTechniques();
	const app = exercicesApplication(plan);

	// --- Phase 1a : exercices neufs ------------------------------------------
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
	const { data: dejaLa, error: e0 } = await supabase
		.from('exercises')
		.select('title')
		.eq('topic', TOPIC)
		.in('title', titres);
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	if (dejaLa && dejaLa.length > 0)
		throw new Error(`Déjà présents : ${dejaLa.map((e) => e.title).join(', ')}`);
	console.log(`  ✓ ${tech.length} exercices techniques et ${app.length} d'application validés`);

	// --- Phase 1b : exercices existants (retrouvés, jamais modifiés) --------
	const { data: lus, error: e2 } = await supabase.from('exercises').select('id, title, variations');
	if (e2) throw new Error(`Lecture des existants impossible : ${e2.message}`);
	const existant = (prefixe: string, titre: string | null): string => {
		const trouves = (lus ?? []).filter((e) => e.id.startsWith(prefixe));
		if (trouves.length !== 1)
			throw new Error(`Exercice existant ${prefixe} : ${trouves.length} trouvé(s)`);
		if (trouves[0].title !== titre)
			throw new Error(
				`Exercice existant ${prefixe} : titre « ${trouves[0].title} », attendu « ${titre} »`
			);
		const corrige = String(
			(trouves[0].variations as { solution_md?: string }[])[0]?.solution_md ?? ''
		);
		if (corrige.trim().length < 10)
			throw new Error(`Exercice existant ${prefixe} : pas de corrigé`);
		return trouves[0].id;
	};
	const existantsApres = new Map(
		Object.entries(EXISTANTS_APRES).map(([cle, liste]) => [
			cle,
			liste.map(([p, t]) => existant(p, t))
		])
	);
	const existantsSection = new Map(
		Object.entries(EXISTANTS_SECTION).map(([cle, liste]) => [
			cle,
			liste.map(([p, t]) => existant(p, t))
		])
	);
	const nbExistants = [...existantsApres.values(), ...existantsSection.values()].flat().length;
	console.log(`  ✓ ${nbExistants} exercices existants retrouvés (corrigés présents)`);

	// --- Phase 1c : fiches et sections ---------------------------------------
	const FICHES = {
		tech: {
			title: 'Entraînement technique — Géométrie repérée',
			description:
				'Rédiger les calculs et justifier les réponses sur une copie. Donner les valeurs exactes, sauf indication contraire.',
			translations: {
				en: {
					title: 'Technical practice — Coordinate geometry',
					description:
						'Show your working and justify your answers on paper. Give exact values unless stated otherwise.'
				}
			}
		},
		app: {
			title: 'Applications de la géométrie repérée',
			description: null,
			translations: { en: { title: 'Coordinate geometry in context' } }
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
	console.log('  ✓ 2 fiches et 3 sections validées');

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
					grades: ['1_SPE'],
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

		// Fiche technique : sans sections, neufs et existants entrelacés par thème
		const ficheTech = await creerFiche(FICHES.tech);
		const ordreTech = tech.flatMap((e) => [ids.get(e.key)!, ...(existantsApres.get(e.key) ?? [])]);
		await ajouter(
			ordreTech.map((id, i) => ({
				worksheet_id: ficheTech,
				exercise_id: id,
				section_id: null,
				position: i + 1
			}))
		);
		console.log(
			`  ✍️  Fiche « ${FICHES.tech.title} » (${ordreTech.length} exercices) : ${ficheTech}`
		);

		// Fiche d'application : 3 sections, neufs dans l'ordre du plan puis existants
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
		const lignesApp: {
			worksheet_id: string;
			exercise_id: string;
			section_id: string | null;
			position: number;
		}[] = [];
		const rang = new Map<string, number>();
		const placer = (section: string, exerciseId: string) => {
			const pos = (rang.get(section) ?? 0) + 1;
			rang.set(section, pos);
			lignesApp.push({
				worksheet_id: ficheApp,
				exercise_id: exerciseId,
				section_id: sectionIds.get(section)!,
				position: pos
			});
		};
		for (const e of app) {
			placer(e.section!, ids.get(e.key)!);
		}
		for (const [section, existants] of existantsSection) {
			for (const id of existants) placer(section, id);
		}
		await ajouter(lignesApp);
		console.log(
			`  ✍️  Fiche « ${FICHES.app.title} » (${lignesApp.length} exercices) : ${ficheApp}`
		);
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
