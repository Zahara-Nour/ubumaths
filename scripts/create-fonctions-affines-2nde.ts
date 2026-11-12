#!/usr/bin/env tsx

/**
 * Fonctions affines, seconde : 2 fiches neuves + un exercice existant (2026-11-12)
 * ================================================================================
 *
 * Sur le modèle de create-fonctions-generalites-2nde.ts (seconde, existant placé en fin de
 * section) et de create-loi-binomiale-tcomp.ts (deux fiches, chacune lue depuis son
 * `plan.json`, images envoyées au bucket `exercise-images`) :
 *  - « Fonctions affines : entraînement technique » : exercices `automatisme`, variante
 *    unique `guided` ; l'exercice existant « Antécédents par une fonction affine » est
 *    placé à la fin de la section S2, sans être modifié ;
 *  - « Fonctions affines : applications » : exercices `application`, variantes `guided` et
 *    `autonomous` (quand le fichier `-autonomous.md` existe).
 * La catégorie de chaque exercice vient du champ `category` de son `plan.json`.
 * Les images (`applications/images/affine-*.png`) sont envoyées sous
 * `<DAVID>/affine-*.png` ; les textes les citent par leur URL.
 *
 * Racine : `data/fiches/fonctions-affines-2nde/` (relative à la racine du dépôt, résolue depuis
 * l'emplacement du script), ou `--racine <dossier>` ; sous-dossiers `technique/` et
 * `applications/` (plan.json, md/, sol/, en/, sol-en/, images/).
 *
 * Garde-fous : base = prod ; tout validé (Zod) AVANT la moindre écriture ; dossier ou
 * fichier manquant → erreur nommant le fichier ; toute image citée doit exister en local ;
 * idempotent (titres déjà présents dans le thème, fiches de même titre, images déjà
 * stockées → arrêt) ; existant retrouvé par préfixe d'id ET par titre ; chaque écriture
 * doit rendre ses lignes ; en cas d'échec, exercices, sections, fiches et images envoyées
 * sont supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-fonctions-affines-2nde.ts                      # simulation
 *   pnpm tsx scripts/create-fonctions-affines-2nde.ts --racine <dossier>   # autre racine
 *   pnpm tsx scripts/create-fonctions-affines-2nde.ts --publier            # écrit en prod
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { z } from 'zod';
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
const TOPIC = 'Fonctions affines';
const GRADES = ['2'];
const BUCKET = 'exercise-images';
const PREFIXE_IMAGES = 'affine-';

/** Racine par défaut : relative à la racine du dépôt, pas à l'emplacement des brouillons */
function racine(): string {
	const i = process.argv.indexOf('--racine');
	if (i !== -1) {
		const valeur = process.argv[i + 1];
		if (!valeur || valeur.startsWith('--')) throw new Error('--racine demande un dossier');
		return resolve(valeur);
	}
	return resolve(import.meta.dirname, '..', 'data', 'fiches', 'fonctions-affines-2nde');
}

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

type Categorie = 'automatisme' | 'application';
type FicheDef = {
	cle: 'technique' | 'applications';
	dossier: string;
	category: Categorie;
	title: string;
	description: string | null;
	translations: { en: { title: string; description?: string } };
	/** Exercices existants de David placés à la fin d'une section (id de section → [préfixe d'id, titre]) */
	existants: Record<string, [string, string][]>;
};

const FICHES: FicheDef[] = [
	{
		cle: 'technique',
		dossier: 'technique',
		category: 'automatisme',
		title: 'Fonctions affines : entraînement technique',
		description:
			'Rédiger les calculs et justifier les réponses sur une copie. Pour les lectures graphiques, expliquer ce que l’on lit.',
		translations: {
			en: {
				title: 'Affine functions: skills practice',
				description:
					'Show your working and justify your answers on paper. When reading a graph, explain what you read.'
			}
		},
		existants: { S2: [['b5390946', 'Antécédents par une fonction affine']] }
	},
	{
		cle: 'applications',
		dossier: 'applications',
		category: 'application',
		title: 'Fonctions affines : applications',
		description:
			'Rédiger les calculs et justifier les réponses sur une copie. Pour les lectures graphiques, expliquer ce que l’on lit.',
		translations: {
			en: {
				title: 'Affine functions: applications',
				description:
					'Show your working and justify your answers on paper. When reading a graph, explain what you read.'
			}
		},
		existants: {}
	}
];

const planSchema = z.object({
	sections: z
		.array(
			z.object({
				id: z.string().min(1).max(40),
				title: z.string().min(1).max(200),
				position: z.number().int().min(0).max(1000),
				en: z.string().min(1).max(200)
			})
		)
		.min(1)
		.max(50),
	exercises: z
		.array(
			z.object({
				key: z.string().min(1).max(40),
				section: z.string().min(1).max(40),
				title: z.string().min(1).max(200),
				en_title: z.string().min(1).max(200),
				category: z.enum(['automatisme', 'application'])
			})
		)
		.min(1)
		.max(200)
});

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	hints: [];
	translations: { en: { statement_md: string; solution_md: string } };
};
type Exo = {
	title: string;
	category: Categorie;
	section: string;
	key: string;
	generic: string[];
	variations: Variation[];
};
type Plan = z.infer<typeof planSchema>;
type Image = { fichier: string; nom: string };
type Contenu = { def: FicheDef; plan: Plan; exos: Exo[]; base: string };

/** Lit un fichier texte ; un fichier absent est une erreur qui le nomme */
function lire(chemin: string): string {
	if (!existsSync(chemin)) throw new Error(`Fichier manquant : ${chemin}`);
	return readFileSync(chemin, 'utf8').trim();
}

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
function lireFiche(racineDossier: string, def: FicheDef): Contenu {
	const base = join(racineDossier, def.dossier);
	if (!existsSync(base) || !statSync(base).isDirectory())
		throw new Error(`Dossier manquant : ${base}`);
	const brut: unknown = JSON.parse(lire(join(base, 'plan.json')));
	const parse = planSchema.safeParse(brut);
	if (!parse.success) {
		const i = parse.error.issues[0];
		throw new Error(`${join(base, 'plan.json')} : ${i.path.join('.')} ${i.message}`);
	}
	const plan = parse.data;
	const sections = new Set(plan.sections.map((s) => s.id));
	if (sections.size !== plan.sections.length)
		throw new Error(`${def.cle} : deux sections portent le même id`);
	const lettres = lettresDeclarees(base);
	const exos: Exo[] = plan.exercises.map((e) => {
		if (e.category !== def.category)
			throw new Error(
				`${def.cle}/${e.key} : catégorie « ${e.category} », attendu « ${def.category} »`
			);
		if (!sections.has(e.section))
			throw new Error(`${def.cle}/${e.key} : section « ${e.section} » absente du plan`);
		const variations = [variation(base, `${e.key}-guided.md`, 'guided')];
		if (existsSync(join(base, 'md', `${e.key}-autonomous.md`)))
			variations.push(variation(base, `${e.key}-autonomous.md`, 'autonomous'));
		return {
			title: e.title,
			key: e.key,
			generic: lettres.get(e.key) ?? [],
			category: e.category,
			section: e.section,
			variations
		};
	});
	const cles = exos.map((e) => e.key);
	if (new Set(cles).size !== cles.length)
		throw new Error(`${def.cle} : deux exercices ont la même clé`);
	for (const s of Object.keys(def.existants))
		if (!sections.has(s))
			throw new Error(`${def.cle} : section « ${s} » (existant à y placer) absente du plan`);
	return { def, plan, exos, base };
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	const dossierRacine = racine();
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}`);
	console.log(`Racine : ${dossierRacine}\n`);
	if (!existsSync(dossierRacine)) throw new Error(`Dossier manquant : ${dossierRacine}`);

	const contenus = FICHES.map((d) => lireFiche(dossierRacine, d));
	const tous = contenus.flatMap((c) => c.exos);

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
	const { data: lus, error: e2 } = await supabase.from('exercises').select('id, title');
	if (e2) throw new Error(`Lecture des existants impossible : ${e2.message}`);
	const existant = (prefixe: string, titre: string): string => {
		const parPrefixe = (lus ?? []).filter((e) => e.id.startsWith(prefixe));
		if (parPrefixe.length !== 1)
			throw new Error(`Exercice existant ${prefixe} : ${parPrefixe.length} trouvé(s) par préfixe`);
		if (parPrefixe[0].title !== titre)
			throw new Error(
				`Exercice existant ${prefixe} : titre « ${parPrefixe[0].title} », attendu « ${titre} »`
			);
		const parTitre = (lus ?? []).filter((e) => e.title === titre);
		if (parTitre.length !== 1)
			throw new Error(`Exercice existant « ${titre} » : ${parTitre.length} trouvé(s) par titre`);
		return parPrefixe[0].id;
	};
	const existantsParFiche = new Map(
		contenus.map((c) => [
			c.def.cle,
			new Map(
				Object.entries(c.def.existants).map(([s, liste]) => [
					s,
					liste.map(([p, t]) => ({ prefixe: p, titre: t, id: existant(p, t) }))
				])
			)
		])
	);
	const nbExistants = [...existantsParFiche.values()].reduce(
		(n, m) => n + [...m.values()].flat().length,
		0
	);
	console.log(`  ✓ ${nbExistants} exercice(s) existant(s) retrouvé(s) (préfixe d'id et titre)`);

	// --- Phase 1c : fiches et sections ---------------------------------------
	const { data: fichesExistantes, error: e1 } = await supabase
		.from('worksheets')
		.select('id, title')
		.in(
			'title',
			FICHES.map((f) => f.title)
		);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (fichesExistantes && fichesExistantes.length > 0)
		throw new Error(`Fiche déjà présente : ${fichesExistantes.map((f) => f.title).join(', ')}`);
	for (const f of FICHES) {
		const v = validateCreateWorksheet({
			title: f.title,
			description: f.description,
			translations: f.translations,
			type: 'worksheet',
			config: CONFIG_FICHE,
			grades: GRADES
		});
		if (!v.success)
			throw new Error(`Fiche « ${f.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}
	for (const c of contenus)
		for (const s of c.plan.sections) {
			const v = validateCreateWorksheetSection({
				title: s.title,
				position: s.position,
				translations: { en: { title: s.en } }
			});
			if (!v.success)
				throw new Error(`Section « ${s.title} » : Zod refuse — ${v.error.issues[0].message}`);
		}
	console.log(
		`  ✓ ${FICHES.length} fiches et ${contenus.reduce((n, c) => n + c.plan.sections.length, 0)} sections validées`
	);

	// --- Phase 1d : images citées dans les textes ----------------------------
	// Chaque image citée existe en local (dossier images/ de sa fiche), et son nom est libre
	const prefixeUrl = `${url}/storage/v1/object/public/${BUCKET}/${DAVID}/`;
	const images: Image[] = [];
	const imagesLocales = new Map<string, string[]>();
	for (const c of contenus) {
		const dossierImages = join(c.base, 'images');
		const locales = existsSync(dossierImages)
			? readdirSync(dossierImages).filter((f) => f.toLowerCase().endsWith('.png'))
			: [];
		imagesLocales.set(c.def.cle, locales);
		const cites = new Set<string>();
		for (const t of c.exos.flatMap((e) => e.variations).map((v) => JSON.stringify(v)))
			for (const m of t.matchAll(
				/storage\/v1\/object\/public\/exercise-images\/[0-9a-f-]+\/([\w.-]+)/g
			))
				cites.add(m[1]);
		for (const nom of cites) {
			const fichier = join(dossierImages, nom);
			if (!existsSync(fichier)) throw new Error(`Image citée absente en local : ${fichier}`);
			if (!nom.startsWith(PREFIXE_IMAGES))
				throw new Error(`Image « ${nom} » : préfixe ${PREFIXE_IMAGES} attendu`);
			if (!images.some((i) => i.nom === nom)) images.push({ nom, fichier });
		}
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
	for (const c of contenus) {
		console.log(
			`\n  « ${c.def.title} » [${c.def.translations.en.title}] — ${c.plan.sections.length} sections, ${c.exos.length} exercices :`
		);
		for (const s of c.plan.sections) {
			console.log(`    ${s.position}. ${s.title}  [${s.en}]`);
			for (const e of c.exos.filter((x) => x.section === s.id)) {
				const longueurs = e.variations
					.map(
						(v) =>
							`${v.label} : FR ${v.statement_md.length}+${v.solution_md.length} / EN ${v.translations.en.statement_md.length}+${v.translations.en.solution_md.length}`
					)
					.join(' ; ');
				console.log(
					`       - ${e.key} « ${e.title} » (${e.variations.map((v) => v.label).join(', ')})${e.generic.length ? ` [fonctions : ${e.generic.join(',')}]` : ''}`
				);
				console.log(`           énoncé+corrigé, caractères — ${longueurs}`);
			}
			for (const x of existantsParFiche.get(c.def.cle)?.get(s.id) ?? [])
				console.log(`       - existant ${x.prefixe} « ${x.titre} » → ${x.id} (fin de section)`);
		}
		const locales = imagesLocales.get(c.def.cle) ?? [];
		console.log(`    Images trouvées (${locales.length}) : ${locales.join(', ') || 'aucune'}`);
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
			const { data: envoi, error } = await supabase.storage
				.from(BUCKET)
				.upload(`${DAVID}/${i.nom}`, readFileSync(i.fichier), {
					contentType: 'image/png',
					upsert: false
				});
			if (error || !envoi) throw new Error(`Image « ${i.nom} » refusée : ${error?.message ?? ''}`);
			imagesEnvoyees.push(`${DAVID}/${i.nom}`);
			const r = await fetch(prefixeUrl + i.nom, { method: 'HEAD' });
			if (!r.ok) throw new Error(`Image « ${i.nom} » envoyée mais illisible (${r.status})`);
		}
		console.log(`  ✍️  ${imagesEnvoyees.length} images envoyées et relues`);

		const ids = new Map<string, string>();
		for (const c of contenus) {
			for (const e of c.exos) {
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
					throw new Error(
						`« ${e.title} » : création refusée — ${error?.message ?? 'aucune ligne'}`
					);
				creesExercices.push(data.id);
				ids.set(`${c.def.cle}/${e.key}`, data.id);
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
		}
		console.log(`  ✍️  ${creesExercices.length} exercices créés`);

		// Une fiche = ses sections (dans l'ordre du plan), puis ses exercices rangés par section,
		// l'existant de la section venant après les exercices neufs
		for (const c of contenus) {
			const { data: fiche, error: ef } = await supabase
				.from('worksheets')
				.insert({
					title: c.def.title,
					description: c.def.description,
					type: 'worksheet',
					config: CONFIG_FICHE,
					translations: c.def.translations,
					status: 'draft',
					version: 1,
					style_id: MODELE_FICHE_ELEVE,
					grades: GRADES,
					created_by: DAVID,
					school_id: ECOLE
				})
				.select('id')
				.single();
			if (ef || !fiche)
				throw new Error(`Fiche « ${c.def.title} » refusée : ${ef?.message ?? 'aucune ligne'}`);
			creesFiches.push(fiche.id);

			const sectionIds = new Map<string, string>();
			for (const s of c.plan.sections) {
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
				const sectionId = sectionIds.get(section);
				if (!sectionId) throw new Error(`Section « ${section} » sans identifiant`);
				lignes.push({
					worksheet_id: fiche.id,
					exercise_id: exerciseId,
					section_id: sectionId,
					position: pos
				});
			};
			for (const s of c.plan.sections) {
				for (const e of c.exos.filter((x) => x.section === s.id)) {
					const id = ids.get(`${c.def.cle}/${e.key}`);
					if (!id) throw new Error(`« ${e.title} » : identifiant introuvable`);
					placer(s.id, id);
				}
				for (const x of existantsParFiche.get(c.def.cle)?.get(s.id) ?? []) placer(s.id, x.id);
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
			console.log(
				`  ✍️  Fiche « ${c.def.title} » (${c.plan.sections.length} sections, ${lignes.length} exercices) : ${fiche.id}`
			);
		}
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
