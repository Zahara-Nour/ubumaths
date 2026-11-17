#!/usr/bin/env tsx

/**
 * Évaluation de rattrapage « second degré », 1ʳᵉ spé (2026-11-09)
 * ===============================================================
 *
 * À la demande de David : après « Le parc aquatique » (évaluation en trois parties, script
 * create-evaluation-second-degre-1spe.ts), un sujet de rattrapage. L'élève traite UN seul des
 * trois exercices ; sa note remplace celle de sa plus mauvaise partie. Mêmes thèmes, situations
 * et méthodes différentes de l'évaluation et de la fiche d'applications (`d6c03510`) :
 *  - trajectoire : le saut du dauphin (racines + un point → forme factorisée) ;
 *  - aire : le massif de fleurs (carré inscrit, MINIMUM avec a > 0) ;
 *  - bénéfice : l'atelier de bougies (fonction coût, tableau de signes).
 *
 * Écrit : 3 exercices neufs (brouillons, topic « Optimisation » comme la fiche d'applications)
 * et 1 fiche de type `assessment`, brouillon, 40 min, calculatrice interdite, SANS barème
 * (David le fixe lui-même : points nuls, non affichés).
 *
 * Contenu dans data/fiches/eval-rattrapage-second-degre-1spe/ : énoncés et corrigés FR/EN
 * (md/ sol/ en/ sol-en/), plan.json, generic.txt, figures (svg/ → png/), vérification des
 * calculs (verif/assert_all.py, sympy). Rendu vérifié par `pnpm check:ubumark` et
 * `pnpm fiche:verifier` (compilateur de prod).
 *
 * Garde-fous : base = prod ; tout validé (Zod) et images présentes dans les énoncés AVANT la
 * moindre écriture ; arrêt si un titre existe déjà dans le thème ou si la fiche existe ; une
 * image déjà en ligne n'est jamais remplacée ; chaque écriture doit rendre sa ligne ; en cas
 * d'échec, fiche et exercices créés sont supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-evaluation-rattrapage-second-degre-1spe.ts            # simulation
 *   pnpm tsx scripts/create-evaluation-rattrapage-second-degre-1spe.ts --publier  # écrit en prod
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
// Topic des exercices de la fiche d'applications du second degré
const TOPIC = 'Optimisation';
const GRADES = ['1_SPE'];
const DUREE_MIN = 40;
const DIR = join(import.meta.dirname, '..', 'data', 'fiches', 'eval-rattrapage-second-degre-1spe');
const BUCKET = 'exercise-images';
const IMAGES = ['rattrapage-dauphin.png', 'rattrapage-dauphin-en.png', 'rattrapage-massif.png'];

const FICHE = {
	title: 'Évaluation de rattrapage : second degré',
	en: 'Retake test: quadratic functions'
};
const DESCRIPTION = {
	fr: 'Traiter UN SEUL des trois exercices, au choix. Calculatrice interdite. Rédiger les calculs et justifier les réponses sur la copie.',
	en: 'Answer ONLY ONE of the three exercises, of your choice. No calculator. Show your working and justify your answers on paper.'
};
const CONFIG_FICHE = {
	language: 'fr',
	show_points: false,
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
type Exo = { title: string; key: string; generic: string[]; variations: Variation[] };
type Plan = {
	exercises: { key: string; title: string; en_title: string; category: string }[];
};

const lire = (p: string) => readFileSync(p, 'utf8').trim();

function variation(fichier: string): Variation {
	return {
		label: 'guided',
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

/** `generic.txt` : lignes « CLÉ: f,g » → lettres déclarées comme fonctions */
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

function chargerExercices(): Exo[] {
	const plan = JSON.parse(readFileSync(join(DIR, 'plan.json'), 'utf8')) as Plan;
	const lettres = lettresDeclarees();
	return plan.exercises.map((e) => {
		if (e.category !== 'application')
			throw new Error(`${e.key} : catégorie inattendue « ${e.category} »`);
		return {
			title: e.title,
			key: e.key,
			generic: lettres.get(e.key) ?? [],
			variations: [variation(`${e.key}-guided.md`)]
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

	const exos = chargerExercices();

	// --- Phase 1a : exercices neufs ------------------------------------------
	for (const e of exos) {
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
	const titres = exos.map((e) => e.title);
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
	console.log(`  ✓ ${exos.length} exercices neufs validés`);

	// --- Phase 1b : images ------------------------------------------------------
	const textes = exos.flatMap((e) =>
		e.variations.flatMap((v) => [v.statement_md, v.translations.en.statement_md])
	);
	const images = IMAGES.map((nom) => {
		if (!textes.some((t) => t.includes(`/${nom}`)))
			throw new Error(`Image « ${nom} » absente des énoncés`);
		return { nom, contenu: readFileSync(join(DIR, 'png', nom)) };
	});
	console.log(`  ✓ ${images.length} images présentes et citées`);

	// --- Phase 1c : fiche -------------------------------------------------------
	const { data: ficheExistante, error: e1 } = await supabase
		.from('worksheets')
		.select('id')
		.eq('title', FICHE.title);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (ficheExistante && ficheExistante.length > 0)
		throw new Error(`Fiche déjà présente : ${FICHE.title}`);
	const vf = validateCreateWorksheet({
		title: FICHE.title,
		description: DESCRIPTION.fr,
		translations: { en: { title: FICHE.en, description: DESCRIPTION.en } },
		type: 'assessment',
		config: CONFIG_FICHE,
		style_id: MODELE_FICHE_ELEVE,
		estimated_duration_minutes: DUREE_MIN,
		total_points: null,
		grades: GRADES
	});
	if (!vf.success)
		throw new Error(
			`Fiche : Zod refuse — ${vf.error.issues[0].path.join('.')} ${vf.error.issues[0].message}`
		);
	console.log(`\n  📄 ${FICHE.title} — ${DUREE_MIN} min, sans barème`);
	for (const e of exos) console.log(`     - ${e.title}`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : images (jamais remplacées) ------------------------------------
	const prefixe = `${url}/storage/v1/object/public/${BUCKET}/${DAVID}/`;
	for (const i of images) {
		const deja = await fetch(prefixe + i.nom, { method: 'HEAD' });
		if (deja.ok) {
			console.log(`  · ${i.nom} déjà en ligne, laissée telle quelle`);
			continue;
		}
		const { error } = await supabase.storage
			.from(BUCKET)
			.upload(`${DAVID}/${i.nom}`, i.contenu, { contentType: 'image/png', upsert: false });
		if (error) throw new Error(`Image « ${i.nom} » refusée — ${error.message}`);
		const r = await fetch(prefixe + i.nom, { method: 'HEAD' });
		if (!r.ok) throw new Error(`Image « ${i.nom} » envoyée mais illisible (${r.status})`);
		console.log(`  ✍️  ${i.nom} envoyée et relue`);
	}

	// --- Phase 3 : exercices et fiche, en gardant trace pour tout défaire -------
	const creesExercices: string[] = [];
	let ficheId: string | null = null;
	try {
		const ids: string[] = [];
		for (const e of exos) {
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
				throw new Error(`« ${e.title} » : création refusée — ${error?.message ?? 'aucune ligne'}`);
			creesExercices.push(data.id);
			ids.push(data.id);
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
			console.log(`  ✍️  Exercice « ${e.title} » : ${data.id}`);
		}

		const { data: fiche, error: ef } = await supabase
			.from('worksheets')
			.insert({
				title: FICHE.title,
				description: DESCRIPTION.fr,
				type: 'assessment',
				config: CONFIG_FICHE,
				translations: { en: { title: FICHE.en, description: DESCRIPTION.en } },
				status: 'draft',
				version: 1,
				style_id: MODELE_FICHE_ELEVE,
				estimated_duration_minutes: DUREE_MIN,
				total_points: null,
				grades: GRADES,
				created_by: DAVID,
				school_id: ECOLE
			})
			.select('id')
			.single();
		if (ef || !fiche) throw new Error(`Fiche refusée : ${ef?.message ?? 'aucune ligne'}`);
		ficheId = fiche.id;

		const lignes = ids.map((id, i) => ({
			worksheet_id: fiche.id,
			exercise_id: id,
			section_id: null,
			position: i + 1,
			points: null
		}));
		for (const l of lignes) {
			const v = validateCreateWorksheetExercise({
				exercise_id: l.exercise_id,
				position: l.position,
				variant_mode: 'none',
				section_id: null,
				points: null
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
		console.log(`  ✍️  Fiche « ${FICHE.title} » (${lignes.length} exercices) : ${fiche.id}`);
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiche (lignes en cascade), puis exercices neufs. Les images restent.
		const restes: string[] = [];
		if (ficheId) {
			const { data } = await supabase.from('worksheets').delete().eq('id', ficheId).select('id');
			if (data?.length !== 1) restes.push(`fiche ${ficheId}`);
		}
		if (creesExercices.length) {
			const { data } = await supabase
				.from('exercises')
				.delete()
				.in('id', creesExercices)
				.select('id');
			const supprimes = new Set((data ?? []).map((l) => l.id));
			for (const id of creesExercices) if (!supprimes.has(id)) restes.push(`exercice ${id}`);
		}
		const bilan = restes.length
			? `⚠️ NON défait, à supprimer à la main : ${restes.join(', ')}`
			: 'tout a été défait';
		throw new Error(`${err instanceof Error ? err.message : String(err)} — ${bilan}`);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
