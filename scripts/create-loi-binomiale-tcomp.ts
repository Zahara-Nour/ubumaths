#!/usr/bin/env tsx

/**
 * Loi binomiale, Terminale maths complémentaires : 2 fiches neuves (2026-10-16)
 * =============================================================================
 *
 * Sur le modèle des variables aléatoires 1re spé
 * (create-variables-aleatoires-1spe.ts) :
 *  - « Entraînement technique — Loi binomiale » : exercices `automatisme`,
 *    rangés en sections ;
 *  - « Applications de la loi binomiale » : exercices `application`, rangés
 *    en sections.
 * Les deux fiches sont lues depuis un `plan.json` (sections + exercices).
 * Aucun exercice existant sur le thème : nouveau thème « Loi binomiale ».
 * Les images des applications (`applications/images/binom-*.png`) sont
 * envoyées au bucket `exercise-images` ; les textes les citent par leur URL.
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ;
 * toute image citée doit exister en local ; idempotent (titres déjà présents
 * dans le thème, fiches de même titre, images déjà stockées → arrêt) ; chaque
 * écriture doit rendre sa ligne ; en cas d'échec, exercices, sections, fiches
 * et images envoyées sont supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-loi-binomiale-tcomp.ts            # simulation
 *   pnpm tsx scripts/create-loi-binomiale-tcomp.ts --publier  # écrit en prod
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
const TOPIC = 'Loi binomiale';
const GRADES = ['T_COMP'];
const BUCKET = 'exercise-images';
const PREFIXE_IMAGES = 'binom-';

const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/22d784b7-1a80-45b7-82ae-2ea268351835/scratchpad/binom';

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
	section: string;
	key: string;
	generic: string[];
	variations: Variation[];
};
type Plan = {
	sections: { id: string; title: string; position: number; en: string }[];
	exercises: { key: string; section: string; title: string; en_title: string }[];
};
type Image = { fichier: string; nom: string };

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

/** `generic.txt` (facultatif) : lignes « CLÉ: A,B » → lettres déclarées comme fonctions */
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

/** Lit un dossier de fiche : son plan et ses exercices (variante guidée, autonome si présente) */
function lireFiche(sousDossier: string, category: Exo['category']): { plan: Plan; exos: Exo[] } {
	const base = join(DIR, sousDossier);
	const plan = JSON.parse(readFileSync(join(base, 'plan.json'), 'utf8')) as Plan;
	const lettres = lettresDeclarees(base);
	const exos = plan.exercises.map((e) => {
		const variations = [variation(base, `${e.key}-guided.md`, 'guided')];
		if (existsSync(join(base, 'md', `${e.key}-autonomous.md`))) {
			variations.push(variation(base, `${e.key}-autonomous.md`, 'autonomous'));
		}
		return {
			title: e.title,
			key: e.key,
			generic: lettres.get(e.key) ?? [],
			category,
			section: e.section,
			variations
		};
	});
	return { plan, exos };
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

	const ficheTech = lireFiche('technique', 'automatisme');
	const ficheApp = lireFiche('applications', 'application');
	const tech = ficheTech.exos;
	const app = ficheApp.exos;
	for (const f of [ficheTech, ficheApp]) {
		const ids = new Set(f.plan.sections.map((s) => s.id));
		for (const e of f.exos)
			if (!ids.has(e.section))
				throw new Error(`« ${e.title} » : section « ${e.section} » absente du plan`);
	}

	// --- Phase 1a : exercices neufs ------------------------------------------
	const tous = [...tech, ...app];
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
	const cles = tous.map((e) => `${e.category}/${e.key}`);
	if (new Set(cles).size !== cles.length) throw new Error('Deux exercices portent la même clé');
	const { data: dejaLa, error: e0 } = await supabase
		.from('exercises')
		.select('title')
		.eq('topic', TOPIC)
		.in('title', titres);
	if (e0) throw new Error(`Lecture impossible : ${e0.message}`);
	if (dejaLa && dejaLa.length > 0)
		throw new Error(`Déjà présents : ${dejaLa.map((e) => e.title).join(', ')}`);
	console.log(`  ✓ ${tech.length} exercices techniques et ${app.length} d'application validés`);

	// --- Phase 1b : fiches et sections ---------------------------------------
	const FICHES = {
		tech: {
			title: 'Entraînement technique — Loi binomiale',
			description:
				'Rédiger les calculs et justifier les réponses sur une copie. Donner les valeurs exactes, sauf indication contraire.',
			translations: {
				en: {
					title: 'Technical practice — Binomial distribution',
					description:
						'Show your working and justify your answers on paper. Give exact values unless stated otherwise.'
				}
			}
		},
		app: {
			title: 'Applications de la loi binomiale',
			description: null,
			translations: { en: { title: 'Applications of the binomial distribution' } }
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
			grades: GRADES
		});
		if (!v.success)
			throw new Error(`Fiche « ${f.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}
	for (const s of [...ficheTech.plan.sections, ...ficheApp.plan.sections]) {
		const v = validateCreateWorksheetSection({
			title: s.title,
			position: s.position,
			translations: { en: { title: s.en } }
		});
		if (!v.success)
			throw new Error(`Section « ${s.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}
	console.log(
		`  ✓ 2 fiches et ${ficheTech.plan.sections.length + ficheApp.plan.sections.length} sections validées`
	);

	// --- Phase 1c : images citées dans les textes ----------------------------
	// Chaque image citée existe en local, et son nom est libre dans le bucket
	const textes = tous.flatMap((e) => e.variations).map((v) => JSON.stringify(v));
	const prefixe = `${url}/storage/v1/object/public/${BUCKET}/${DAVID}/`;
	const cites = new Set<string>();
	for (const t of textes)
		for (const m of t.matchAll(
			/storage\/v1\/object\/public\/exercise-images\/[0-9a-f-]+\/([\w.-]+)/g
		))
			cites.add(m[1]);
	const images: Image[] = [...cites].map((nom) => ({
		nom,
		fichier: join(DIR, 'applications', 'images', nom)
	}));
	for (const i of images) {
		if (!existsSync(i.fichier)) throw new Error(`Image citée absente en local : ${i.fichier}`);
		if (!i.nom.startsWith(PREFIXE_IMAGES))
			throw new Error(`Image « ${i.nom} » : préfixe ${PREFIXE_IMAGES} attendu`);
	}
	const { data: dejaStockees, error: es } = await supabase.storage
		.from(BUCKET)
		.list(DAVID, { search: PREFIXE_IMAGES, limit: 1000 });
	if (es) throw new Error(`Lecture du stockage impossible : ${es.message}`);
	const pris = images.filter((i) => dejaStockees?.some((o) => o.name === i.nom));
	if (pris.length > 0)
		throw new Error(`Images déjà stockées : ${pris.map((i) => i.nom).join(', ')}`);
	console.log(`  ✓ ${images.length} images citées, présentes en local, noms libres`);

	// --- Compte rendu de la simulation ---------------------------------------
	for (const [nom, f] of [
		['Technique', ficheTech],
		['Applications', ficheApp]
	] as const) {
		console.log(`\n  ${nom} — ${f.plan.sections.length} sections, ${f.exos.length} exercices :`);
		for (const s of f.plan.sections) {
			console.log(`    ${s.position}. ${s.title}  [${s.en}]`);
			for (const e of f.exos.filter((x) => x.section === s.id))
				console.log(
					`       - ${e.title}  (${e.variations.map((v) => v.label).join(', ')})${e.generic.length ? ` [fonctions : ${e.generic.join(',')}]` : ''}`
				);
		}
	}
	console.log(`\n  Images à envoyer (${images.length}) :`);
	for (const i of images) console.log(`    - ${i.nom}`);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire ----------------
	const imagesEnvoyees: string[] = [];
	const creesExercices: string[] = [];
	const creesFiches: string[] = [];
	try {
		for (const i of images) {
			const { error } = await supabase.storage
				.from(BUCKET)
				.upload(`${DAVID}/${i.nom}`, readFileSync(i.fichier), {
					contentType: 'image/png',
					upsert: false
				});
			if (error) throw new Error(`Image « ${i.nom} » refusée : ${error.message}`);
			imagesEnvoyees.push(`${DAVID}/${i.nom}`);
			const r = await fetch(prefixe + i.nom, { method: 'HEAD' });
			if (!r.ok) throw new Error(`Image « ${i.nom} » envoyée mais illisible (${r.status})`);
		}
		console.log(`  ✍️  ${imagesEnvoyees.length} images envoyées et relues`);

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
			ids.set(`${e.category}/${e.key}`, data.id);
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
					style_id: MODELE_FICHE_ELEVE,
					grades: GRADES,
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

		// Une fiche = ses sections (dans l'ordre du plan), puis ses exercices rangés par section
		const ecrireFiche = async (
			f: (typeof FICHES)['tech'] | (typeof FICHES)['app'],
			contenu: { plan: Plan; exos: Exo[] }
		) => {
			const ficheId = await creerFiche(f);
			const sectionIds = new Map<string, string>();
			for (const s of contenu.plan.sections) {
				const { data, error } = await supabase
					.from('worksheet_sections')
					.insert({
						worksheet_id: ficheId,
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
				section_id: string | null;
				position: number;
			}[] = [];
			const rang = new Map<string, number>();
			for (const e of contenu.exos) {
				const pos = (rang.get(e.section) ?? 0) + 1;
				rang.set(e.section, pos);
				lignes.push({
					worksheet_id: ficheId,
					exercise_id: ids.get(`${e.category}/${e.key}`)!,
					section_id: sectionIds.get(e.section)!,
					position: pos
				});
			}
			await ajouter(lignes);
			console.log(
				`  ✍️  Fiche « ${f.title} » (${contenu.plan.sections.length} sections, ${lignes.length} exercices) : ${ficheId}`
			);
		};

		await ecrireFiche(FICHES.tech, ficheTech);
		await ecrireFiche(FICHES.app, ficheApp);
		console.log('\n✅ Terminé.');
	} catch (err) {
		// Rien de partiel : fiches (sections et lignes en cascade), exercices neufs, images
		if (creesFiches.length) await supabase.from('worksheets').delete().in('id', creesFiches);
		if (creesExercices.length) await supabase.from('exercises').delete().in('id', creesExercices);
		if (imagesEnvoyees.length > 0) await supabase.storage.from(BUCKET).remove(imagesEnvoyees);
		throw new Error(`${err instanceof Error ? err.message : String(err)} — tout a été défait`);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
