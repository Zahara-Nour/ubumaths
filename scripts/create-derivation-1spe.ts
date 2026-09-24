#!/usr/bin/env tsx

/**
 * Dérivation, 1ʳᵉ spé : 21 exercices neufs, 17 corrigés, 2 fiches (2026-09-24)
 * ============================================================================
 *
 * Sur le modèle des fiches « suites » et « exponentielle » (create-exponentielle-1spe.ts) :
 *  - « Entraînement technique — Dérivation » : 12 exercices `automatisme` neufs,
 *    entrelacés par thème avec les 17 exercices de dérivation existants de David
 *    (fiches « Automatismes : dérivation » et « (2) », qu'on ne modifie pas) ;
 *  - « Applications de la dérivation » : 9 exercices `application` neufs en 3
 *    sections, plus l'exercice existant « Optimisation du coût de fabrication
 *    d'une boîte » (décision de David : sa place est dans les fiches de dérivation).
 * Les 17 exercices existants n'avaient pour corrigé que le texte « a » : ils
 * reçoivent un corrigé FR + EN (et l'énoncé anglais manquant de « Dérivée d'un
 * quotient (4) »). Leurs énoncés ne sont pas touchés.
 *
 * Contenu vérifié : calcul formel (sympy, assertions), rendu écran de chaque
 * formule, PDF fiche + corrigé FR/EN compilés sans erreur de formule.
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ;
 * idempotent (titres déjà présents dans le thème, ou fiches de même titre →
 * arrêt) ; corrigé existant réécrit SEULEMENT s'il vaut exactement « a » ;
 * chaque écriture doit rendre sa ligne ; en cas d'échec, fiches et exercices
 * créés supprimés et corrigés existants restaurés depuis la sauvegarde.
 *
 * Usage :
 *   pnpm tsx scripts/create-derivation-1spe.ts            # simulation
 *   pnpm tsx scripts/create-derivation-1spe.ts --publier  # écrit en prod
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema, exerciseVariationSchema } from '$lib/server/validation/exercises';
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
const TOPIC = 'Dérivation';
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad/deriv';

/** Corrigé fictif des exercices existants : seul texte qu'on accepte de remplacer */
const CORRIGE_FICTIF = 'a';

/** Exercice existant « Optimisation du coût de fabrication d'une boîte » */
const BOITE = 'aeb4ce54-1a17-4a95-a293-87336704bea4';

/**
 * Exercices existants (préfixe d'id → id complet relu en base), dans l'ordre où
 * ils s'insèrent APRÈS l'exercice neuf de même numéro (00 = avant le premier).
 */
const EXISTANTS_APRES: Record<string, string[]> = {
	'01': ['3fcc5eed', 'd8d9ccea'], // nombre dérivé → lectures graphiques
	'03': ['af79e6bf', 'a8e02c82'], // dérivées usuelles → polynômes
	'04': [
		'4a5ef75a',
		'88649ddb',
		'2aa39b93',
		'63f4f12f',
		'a9703028',
		'06c55f48',
		'3a6a0c94',
		'6ab302da'
	], // produit → inverse, quotient, factoriser
	'05': ['5f0eb1d7'], // g(ax+b) → expressions formelles
	'06': ['8e32a6ba', '05fa7419', 'e9f2323f', '69d2c764'] // tangentes → signe de f', f' et variations
};

/** Corrigés des existants : dossier `existants` (agent) ou `graph` (lectures graphiques) */
const DOSSIER_CORRIGE: Record<string, string> = {
	'3fcc5eed': 'graph',
	d8d9ccea: 'graph',
	'05fa7419': 'graph',
	e9f2323f: 'graph',
	'69d2c764': 'graph'
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

type VariationExistante = Record<string, unknown> & {
	solution_md?: string;
	translations?: { en?: Record<string, unknown> } & Record<string, unknown>;
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

	// --- Phase 1b : exercices existants (corrigés) ---------------------------
	const prefixes = Object.values(EXISTANTS_APRES).flat();
	const { data: lusExistants, error: e2 } = await supabase
		.from('exercises')
		.select('id, title, variations');
	if (e2) throw new Error(`Lecture des existants impossible : ${e2.message}`);
	const existants = new Map<
		string,
		{ id: string; title: string; variations: VariationExistante[] }
	>();
	for (const p of prefixes) {
		const trouves = (lusExistants ?? []).filter((e) => e.id.startsWith(p));
		if (trouves.length !== 1)
			throw new Error(`Exercice existant ${p} : ${trouves.length} trouvé(s)`);
		existants.set(p, {
			id: trouves[0].id,
			title: trouves[0].title,
			variations: structuredClone(trouves[0].variations) as unknown as VariationExistante[]
		});
	}
	const sauvegarde = join(DIR, `backup-existants-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify([...existants.values()], null, 2));
	console.log(`  💾 Sauvegarde des ${existants.size} existants : ${sauvegarde}`);

	const corriges = new Map<string, VariationExistante[]>();
	for (const [p, ex] of existants) {
		if (ex.variations.length !== 1)
			throw new Error(`« ${ex.title} » : ${ex.variations.length} variations, 1 attendue`);
		const v = structuredClone(ex.variations[0]);
		if ((v.solution_md ?? '').trim() !== CORRIGE_FICTIF)
			throw new Error(
				`« ${ex.title} » : corrigé actuel différent de « ${CORRIGE_FICTIF} », on n'y touche pas`
			);
		const dossier = DOSSIER_CORRIGE[p] ?? 'existants';
		v.solution_md = lire(join(DIR, dossier, 'sol', `${p}.md`));
		const en = { ...v.translations?.en };
		en.solution_md = lire(join(DIR, dossier, 'sol-en', `${p}.md`));
		const enonceEn = join(DIR, 'existants', `en-statement-${p}.md`);
		if (existsSync(enonceEn)) {
			if (en.statement_md) throw new Error(`« ${ex.title} » : énoncé anglais déjà présent`);
			en.statement_md = lire(enonceEn);
		}
		if (!en.statement_md) throw new Error(`« ${ex.title} » : énoncé anglais absent`);
		v.translations = { ...v.translations, en };
		const z = exerciseVariationSchema.safeParse(v);
		if (!z.success)
			throw new Error(`« ${ex.title} » : Zod refuse la variation — ${z.error.issues[0].message}`);
		corriges.set(p, [v]);
	}
	console.log(`  ✓ ${corriges.size} corrigés d'exercices existants prêts`);

	const { data: boite, error: e3 } = await supabase
		.from('exercises')
		.select('id, title')
		.eq('id', BOITE)
		.single();
	if (e3 || !boite) throw new Error('Exercice « boîte » introuvable');

	// --- Phase 1c : fiches et sections ---------------------------------------
	const FICHES = {
		tech: {
			title: 'Entraînement technique — Dérivation',
			description:
				'Rédiger les calculs et justifier les réponses sur une copie. Donner les valeurs exactes.',
			translations: {
				en: {
					title: 'Technical practice — Differentiation',
					description: 'Show your working and justify your answers on paper. Give exact values.'
				}
			}
		},
		app: {
			title: 'Applications de la dérivation',
			description: null,
			translations: { en: { title: 'Differentiation in context' } }
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
	const corrigesEcrits: string[] = [];
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

		for (const [p, variations] of corriges) {
			const ex = existants.get(p)!;
			const { data, error } = await supabase
				.from('exercises')
				.update({
					variations:
						variations as unknown as Database['public']['Tables']['exercises']['Update']['variations']
				})
				.eq('id', ex.id)
				.select('id');
			if (error || data?.length !== 1)
				throw new Error(`Corrigé de « ${ex.title} » refusé : ${error?.message ?? 'aucune ligne'}`);
			corrigesEcrits.push(p);
		}
		console.log(`  ✍️  ${corrigesEcrits.length} corrigés d'exercices existants écrits`);

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
		const ordreTech: string[] = [];
		for (const e of tech) {
			ordreTech.push(ids.get(e.key)!);
			for (const p of EXISTANTS_APRES[e.key] ?? []) ordreTech.push(existants.get(p)!.id);
		}
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

		// Fiche d'application : 3 sections ; la boîte après la canette (A2)
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
			if (e.key === 'A2') placer(e.section!, boite.id);
		}
		await ajouter(lignesApp);
		console.log(
			`  ✍️  Fiche « ${FICHES.app.title} » (${lignesApp.length} exercices) : ${ficheApp}`
		);
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiches (lignes en cascade), exercices neufs, puis corrigés restaurés
		if (creesFiches.length) await supabase.from('worksheets').delete().in('id', creesFiches);
		if (creesExercices.length) await supabase.from('exercises').delete().in('id', creesExercices);
		for (const p of corrigesEcrits) {
			const ex = existants.get(p)!;
			await supabase
				.from('exercises')
				.update({
					variations:
						ex.variations as unknown as Database['public']['Tables']['exercises']['Update']['variations']
				})
				.eq('id', ex.id)
				.select('id');
		}
		throw new Error(
			`${err instanceof Error ? err.message : String(err)} — tout a été défait (sauvegarde : ${sauvegarde})`
		);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
