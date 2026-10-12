#!/usr/bin/env tsx

/**
 * Variables aléatoires, 1ʳᵉ spé : refonte des 2 fiches en sections (2026-10-12)
 * ============================================================================
 *
 * Reprend les deux brouillons créés par create-variables-aleatoires-1spe.ts
 * (2026-09-26) et, à la demande de David :
 *  - « Entraînement technique — Variables aléatoires » : 8 sections (dont
 *    « Rappels de probabilités ») et 8 exercices neufs ;
 *  - « Applications des variables aléatoires » : 5 sections (3 renommées,
 *    2 neuves), 2 exercices neufs, des illustrations (images PNG dessinées
 *    pour l'occasion et blocs `stat-chart` / `courbe`) ;
 *  - un renvoi faux corrigé dans « La meilleure prévision ».
 *
 * Les exercices existants ne sont touchés QUE par les opérations listées dans
 * `ajouts.json` (insertion avant une ligne d'ancre unique, ou remplacement
 * exact d'un texte unique) : toute ancre absente ou répétée arrête tout.
 *
 * Garde-fous : base = prod ; tout validé (Zod, ancres, fichiers, titres, noms
 * d'images libres) AVANT la moindre écriture ; état d'avant sauvegardé en JSON ;
 * chaque écriture doit rendre sa ligne ; en cas d'échec, tout est défait
 * (exercices et sections créés supprimés, textes et rangements restaurés,
 * images retirées du stockage).
 *
 * Usage :
 *   pnpm tsx scripts/refonte-variables-aleatoires-1spe.ts            # simulation
 *   pnpm tsx scripts/refonte-variables-aleatoires-1spe.ts --publier  # écrit en prod
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createExerciseSchema, updateExerciseSchema } from '$lib/server/validation/exercises';
import {
	validateCreateWorksheetExercise,
	validateCreateWorksheetSection
} from '$lib/server/validation/worksheets';
import { createExercise } from '$lib/server/exercises';
import type { Database, Json } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const TOPIC = 'Variables aléatoires';
const BUCKET = 'exercise-images';

const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/f2116999-53aa-43b1-b92b-02d696355328/scratchpad/va';

const FICHE_TECH = {
	id: '0ef45afb-fc85-4871-956f-dc6b7f85a563',
	title: 'Entraînement technique — Variables aléatoires'
};
const FICHE_APP = {
	id: 'd720d039-d394-4f6b-bda2-a7aa82acf59b',
	title: 'Applications des variables aléatoires'
};

type SectionPlan = {
	title: string;
	en: string;
	/** Titre de la section actuelle reprise (renommée), sinon section neuve */
	ancienne?: string;
	exercices: string[];
};

const SECTIONS_TECH: SectionPlan[] = [
	{
		title: 'Rappels de probabilités',
		en: 'Probability review',
		exercices: ['Vocabulaire des probabilités', 'Équiprobabilité', 'Calculer avec les formules']
	},
	{
		title: 'Vocabulaire et notations',
		en: 'Vocabulary and notation',
		exercices: ['Notations et vocabulaire']
	},
	{
		title: 'Déterminer une loi',
		en: 'Finding a probability distribution',
		exercices: [
			'Déterminer une loi',
			'Loi à partir d’un arbre',
			'Compléter une loi',
			'Calculer avec une loi',
			'Deux dés : somme et produit'
		]
	},
	{ title: 'Espérance', en: 'Expected value', exercices: ['Espérance', 'Jeu équitable'] },
	{
		title: 'Variance et écart type',
		en: 'Variance and standard deviation',
		exercices: ['Variance et écart type', 'Comparer deux lois']
	},
	{
		title: "Linéarité de l'espérance",
		en: 'Linearity of expectation',
		exercices: ['Linéarité de l’espérance', 'Linéarité de l’espérance (2)']
	},
	{
		title: 'Python et simulation',
		en: 'Python and simulation',
		exercices: ['Python : espérance, variance, écart type', 'Simuler et estimer une espérance']
	},
	{ title: 'Bilan', en: 'Review', exercices: ['Bilan technique'] }
];

const SECTIONS_APP: SectionPlan[] = [
	{
		title: 'Jeux de hasard',
		en: 'Games of chance',
		ancienne: 'Jeux et paris',
		exercices: ['La roue de loterie', 'Le stand de la fête foraine', 'Le jeu du produit']
	},
	{
		title: 'Choisir en tenant compte du risque',
		en: 'Choosing with risk in mind',
		exercices: ['Même espérance, risques différents', 'Deux placements']
	},
	{
		title: 'Assurance et commerce',
		en: 'Insurance and business',
		ancienne: 'Assurance et économie',
		exercices: ['Contrat d’assurance', 'Combien de croissants commander ?', 'La garantie prolongée']
	},
	{
		title: 'Simulation et échantillonnage',
		en: 'Simulation and sampling',
		exercices: ['Échantillons et règle des 2σ/√n', 'Fréquence des lettres']
	},
	{
		title: 'Recherche',
		en: 'Investigation',
		ancienne: 'Recherche',
		exercices: ['La meilleure prévision']
	}
];

// ---------------------------------------------------------------------------

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	hints: unknown[];
	translations?: { en?: { statement_md?: string; solution_md?: string } };
	[cle: string]: unknown;
};

type Neuf = {
	title: string;
	category: 'automatisme' | 'application';
	variations: Variation[];
	generic: string[];
};

/** Opération sur un exercice existant (ajouts.json) */
type Operation = {
	exercice: string;
	variation: string;
	langue: 'fr' | 'en';
	champ: 'statement_md' | 'solution_md';
	/** Insère `inserer` avant la ligne exactement égale à `avant` (unique) */
	avant?: string;
	inserer?: string;
	/** Remplace le texte exact `ancien` (unique) par `nouveau` */
	ancien?: string;
	nouveau?: string;
};

type Image = { fichier: string; nom: string };

const lire = (p: string) => readFileSync(p, 'utf8').trim();
// Les titres en base ont des apostrophes droites ; le plan s'écrit avec ’ par confort.
const titre = (t: string) => t.replaceAll('’', "'");

function variationDepuis(base: string, fichier: string, label: string): Variation {
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

function neufsTechniques(): Neuf[] {
	const base = join(DIR, 'technique');
	const lettres = lettresDeclarees(base);
	return lire(join(base, 'titles.txt'))
		.split('\n')
		.map((t, i) => {
			const key = String(i + 1).padStart(2, '0');
			return {
				title: titre(t.trim()),
				category: 'automatisme' as const,
				generic: lettres.get(key) ?? [],
				variations: [variationDepuis(base, `${key}.md`, 'guided')]
			};
		});
}

function neufsApplications(): Neuf[] {
	const base = join(DIR, 'applications');
	const lettres = lettresDeclarees(base);
	const plan = JSON.parse(readFileSync(join(base, 'plan.json'), 'utf8')) as {
		exercises: { key: string; title: string }[];
	};
	return plan.exercises.map((e) => {
		const variations = [variationDepuis(base, `${e.key}-guided.md`, 'guided')];
		if (existsSync(join(base, 'md', `${e.key}-autonomous.md`)))
			variations.push(variationDepuis(base, `${e.key}-autonomous.md`, 'autonomous'));
		return {
			title: titre(e.title),
			category: 'application' as const,
			generic: lettres.get(e.key) ?? [],
			variations
		};
	});
}

/** Applique une opération à un texte ; lève une erreur si l'ancre n'est pas unique */
function appliquer(texte: string, op: Operation): string {
	const ou = `« ${op.exercice} » ${op.variation} ${op.langue} ${op.champ}`;
	if (op.ancien !== undefined && op.nouveau !== undefined) {
		const n = texte.split(op.ancien).length - 1;
		if (n !== 1) throw new Error(`${ou} : texte à remplacer trouvé ${n} fois`);
		return texte.replace(op.ancien, () => op.nouveau!);
	}
	if (op.avant !== undefined && op.inserer !== undefined) {
		const lignes = texte.split('\n');
		const idx = lignes.flatMap((l, i) => (l === op.avant ? [i] : []));
		if (idx.length !== 1)
			throw new Error(`${ou} : ligne d'ancre « ${op.avant} » trouvée ${idx.length} fois`);
		// Le bloc inséré est entouré d'une ligne vide de chaque côté
		const avant = lignes.slice(0, idx[0]);
		while (avant.length > 0 && avant[avant.length - 1] === '') avant.pop();
		return [...avant, '', ...op.inserer.split('\n'), '', ...lignes.slice(idx[0])].join('\n');
	}
	throw new Error(`${ou} : opération incomplète`);
}

function modifierVariations(variations: Variation[], ops: Operation[]): Variation[] {
	const copie = structuredClone(variations);
	for (const op of ops) {
		const v = copie.find((x) => x.label === op.variation);
		if (!v) throw new Error(`« ${op.exercice} » : pas de variation ${op.variation}`);
		if (op.langue === 'fr') {
			v[op.champ] = appliquer(v[op.champ], op);
		} else {
			const en = v.translations?.en;
			const texte = en?.[op.champ];
			if (!en || texte === undefined)
				throw new Error(`« ${op.exercice} » ${op.variation} : pas de traduction anglaise`);
			en[op.champ] = appliquer(texte, op);
		}
	}
	return copie;
}

// ---------------------------------------------------------------------------

type Db = SupabaseClient<Database>;
type LigneFiche = {
	id: string;
	exercise_id: string;
	section_id: string | null;
	position: number;
};
type Section = { id: string; title: string; position: number; translations: Json | null };

async function lireFiche(supabase: Db, ficheId: string) {
	const { data: lignes, error: e1 } = await supabase
		.from('worksheet_exercises')
		.select('id, exercise_id, section_id, position, exercises(title)')
		.eq('worksheet_id', ficheId);
	if (e1) throw new Error(`Lecture de la fiche ${ficheId} impossible : ${e1.message}`);
	const { data: sections, error: e2 } = await supabase
		.from('worksheet_sections')
		.select('id, title, position, translations')
		.eq('worksheet_id', ficheId);
	if (e2) throw new Error(`Lecture des sections de ${ficheId} impossible : ${e2.message}`);
	const parTitre = new Map<string, LigneFiche>();
	for (const l of lignes ?? []) {
		const t = (l.exercises as { title: string } | null)?.title;
		if (!t) throw new Error(`Fiche ${ficheId} : exercice sans titre (${l.exercise_id})`);
		parTitre.set(t, {
			id: l.id,
			exercise_id: l.exercise_id,
			section_id: l.section_id,
			position: l.position
		});
	}
	return { parTitre, sections: (sections ?? []) as Section[] };
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

	// --- 1. Lire et valider tout ce qui sera écrit ---------------------------
	const neufs = [...neufsTechniques(), ...neufsApplications()];
	for (const e of neufs) {
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
	const titresNeufs = new Set(neufs.map((e) => e.title));
	if (titresNeufs.size !== neufs.length) throw new Error('Deux exercices neufs ont le même titre');
	const { data: collisions, error: ec } = await supabase
		.from('exercises')
		.select('title')
		.eq('topic', TOPIC)
		.in('title', [...titresNeufs]);
	if (ec) throw new Error(`Lecture impossible : ${ec.message}`);
	if (collisions && collisions.length > 0)
		throw new Error(`Titres déjà présents : ${collisions.map((e) => e.title).join(', ')}`);
	console.log(`  ✓ ${neufs.length} exercices neufs validés (Zod, titres libres)`);

	const tech = await lireFiche(supabase, FICHE_TECH.id);
	const app = await lireFiche(supabase, FICHE_APP.id);
	if (tech.sections.length !== 0) throw new Error('La fiche technique a déjà des sections');

	// Chaque exercice des plans existe : dans la fiche, ou parmi les neufs. Rien n'est oublié.
	for (const [nom, plan, fiche] of [
		['technique', SECTIONS_TECH, tech],
		['applications', SECTIONS_APP, app]
	] as const) {
		const prevus = plan.flatMap((s) => s.exercices.map(titre));
		if (new Set(prevus).size !== prevus.length) throw new Error(`Fiche ${nom} : titre en double`);
		for (const t of prevus)
			if (!fiche.parTitre.has(t) && !titresNeufs.has(t))
				throw new Error(`Fiche ${nom} : « ${t} » introuvable (ni dans la fiche, ni neuf)`);
		for (const t of fiche.parTitre.keys())
			if (!prevus.includes(t)) throw new Error(`Fiche ${nom} : « ${t} » absent du plan`);
		for (const s of plan) {
			if (s.ancienne && !fiche.sections.some((x) => x.title === s.ancienne))
				throw new Error(`Fiche ${nom} : section « ${s.ancienne} » introuvable`);
			const v = validateCreateWorksheetSection({
				title: s.title,
				position: 1,
				translations: { en: { title: s.en } }
			});
			if (!v.success) throw new Error(`Section « ${s.title} » : ${v.error.issues[0].message}`);
		}
		for (const s of fiche.sections)
			if (!plan.some((p) => p.ancienne === s.title))
				throw new Error(`Fiche ${nom} : section actuelle « ${s.title} » non reprise`);
	}
	const tousLesNeufs = new Set([
		...SECTIONS_TECH.flatMap((s) => s.exercices.map(titre)),
		...SECTIONS_APP.flatMap((s) => s.exercices.map(titre))
	]);
	for (const t of titresNeufs)
		if (!tousLesNeufs.has(t)) throw new Error(`Exercice neuf « ${t} » placé dans aucune section`);
	console.log('  ✓ Plans des deux fiches complets (chaque exercice placé une fois)');

	// Opérations sur les exercices existants
	const ops = JSON.parse(readFileSync(join(DIR, 'ajouts.json'), 'utf8')) as Operation[];
	const parExercice = new Map<string, Operation[]>();
	for (const op of ops) {
		const t = titre(op.exercice);
		parExercice.set(t, [...(parExercice.get(t) ?? []), op]);
	}
	const { data: existants, error: ee } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.eq('topic', TOPIC)
		.in('title', [...parExercice.keys()]);
	if (ee) throw new Error(`Lecture des exercices existants impossible : ${ee.message}`);
	const modifs: { id: string; title: string; avant: Variation[]; apres: Variation[] }[] = [];
	for (const [t, liste] of parExercice) {
		const ex = existants?.find((e) => e.title === t);
		if (!ex) throw new Error(`Exercice existant « ${t} » introuvable`);
		if (!app.parTitre.has(t) && !tech.parTitre.has(t))
			throw new Error(`« ${t} » n'est dans aucune des deux fiches`);
		const avant = ex.variations as unknown as Variation[];
		const apres = modifierVariations(avant, liste);
		const v = updateExerciseSchema.safeParse({ variations: apres });
		if (!v.success) throw new Error(`« ${t} » modifié : Zod refuse — ${v.error.issues[0].message}`);
		modifs.push({ id: ex.id, title: t, avant, apres });
	}
	console.log(
		`  ✓ ${ops.length} opérations sur ${modifs.length} exercices existants (ancres uniques)`
	);

	// Images : chaque image citée dans un texte écrit existe en local, et son nom est libre
	const textes = [...neufs.flatMap((e) => e.variations), ...modifs.flatMap((m) => m.apres)].map(
		(v) => JSON.stringify(v)
	);
	const prefixe = `${url}/storage/v1/object/public/${BUCKET}/${DAVID}/`;
	const cites = new Set<string>();
	for (const t of textes)
		for (const m of t.matchAll(
			/storage\/v1\/object\/public\/exercise-images\/[0-9a-f-]+\/([\w.-]+)/g
		))
			cites.add(m[1]);
	const images: Image[] = [...cites].map((nom) => ({ nom, fichier: join(DIR, 'images', nom) }));
	for (const i of images) {
		if (!existsSync(i.fichier)) throw new Error(`Image citée absente en local : ${i.fichier}`);
		if (!i.nom.startsWith('va-')) throw new Error(`Image « ${i.nom} » : préfixe va- attendu`);
	}
	const { data: dejaStockees, error: es } = await supabase.storage
		.from(BUCKET)
		.list(DAVID, { search: 'va-', limit: 1000 });
	if (es) throw new Error(`Lecture du stockage impossible : ${es.message}`);
	const pris = images.filter((i) => dejaStockees?.some((o) => o.name === i.nom));
	if (pris.length > 0)
		throw new Error(`Images déjà stockées : ${pris.map((i) => i.nom).join(', ')}`);
	console.log(`  ✓ ${images.length} images citées, présentes en local, noms libres (${prefixe})`);

	for (const [nom, plan] of [
		['Technique', SECTIONS_TECH],
		['Applications', SECTIONS_APP]
	] as const) {
		console.log(`\n  ${nom} :`);
		plan.forEach((s, i) => {
			console.log(`    ${i + 1}. ${s.title}${s.ancienne ? ` (ex « ${s.ancienne} »)` : ' (neuve)'}`);
			for (const t of s.exercices)
				console.log(`       - ${t}${titresNeufs.has(titre(t)) ? ' *' : ''}`);
		});
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- 2. Écrire, en gardant de quoi tout défaire --------------------------
	const sauvegarde = join(DIR, `sauvegarde-${Date.now()}.json`);
	writeFileSync(
		sauvegarde,
		JSON.stringify(
			{
				tech: { lignes: [...tech.parTitre.entries()], sections: tech.sections },
				app: { lignes: [...app.parTitre.entries()], sections: app.sections },
				exercices: modifs.map((m) => ({ id: m.id, title: m.title, variations: m.avant }))
			},
			null,
			1
		)
	);
	console.log(`\n  💾 État d'avant : ${sauvegarde}`);

	const imagesEnvoyees: string[] = [];
	const exercicesCrees: string[] = [];
	const sectionsCreees: string[] = [];
	const lignesCreees: string[] = [];
	const exercicesModifies: typeof modifs = [];
	let sectionsTouchees = false;

	const verifier = <T>(
		r: { data: T[] | null; error: { message: string } | null },
		quoi: string,
		n = 1
	) => {
		if (r.error || r.data?.length !== n)
			throw new Error(
				`${quoi} : ${r.error?.message ?? `${r.data?.length ?? 0} ligne(s) au lieu de ${n}`}`
			);
		return r.data;
	};

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
		for (const e of neufs) {
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
			exercicesCrees.push(data.id);
			ids.set(e.title, data.id);
			if (e.generic.length > 0)
				verifier(
					await supabase
						.from('exercises')
						.update({ generic_functions: e.generic })
						.eq('id', data.id)
						.select('id'),
					`« ${e.title} » : fonctions déclarées`
				);
		}
		console.log(`  ✍️  ${exercicesCrees.length} exercices créés`);

		for (const m of modifs) {
			verifier(
				await supabase
					.from('exercises')
					.update({ variations: m.apres as unknown as Json })
					.eq('id', m.id)
					.select('id'),
				`« ${m.title} » : mise à jour`
			);
			exercicesModifies.push(m);
		}
		console.log(`  ✍️  ${exercicesModifies.length} exercices existants complétés`);

		const ranger = async (
			ficheId: string,
			plan: SectionPlan[],
			fiche: Awaited<ReturnType<typeof lireFiche>>
		) => {
			// Positions uniques par (fiche, section) : les exercices déjà rangés passent
			// d'abord hors plage, sinon un ajout heurte un exercice qui n'a pas encore bougé
			for (const [k, l] of [...fiche.parTitre.values()].entries())
				verifier(
					await supabase
						.from('worksheet_exercises')
						.update({ position: 100 + k })
						.eq('id', l.id)
						.select('id'),
					`Exercice ${l.exercise_id} : position provisoire`
				);
			// Idem pour les sections (unicité par fiche) : les sections reprises passent d'abord hors plage
			for (const s of fiche.sections) {
				sectionsTouchees = true;
				verifier(
					await supabase
						.from('worksheet_sections')
						.update({ position: 50 + s.position })
						.eq('id', s.id)
						.select('id'),
					`Section « ${s.title} » : position provisoire`
				);
			}
			for (const [i, s] of plan.entries()) {
				let sectionId: string;
				if (s.ancienne) {
					const ancienne = fiche.sections.find((x) => x.title === s.ancienne)!;
					verifier(
						await supabase
							.from('worksheet_sections')
							.update({ title: s.title, position: i + 1, translations: { en: { title: s.en } } })
							.eq('id', ancienne.id)
							.select('id'),
						`Section « ${s.ancienne} » : renommage`
					);
					sectionId = ancienne.id;
				} else {
					const [cree] = verifier(
						await supabase
							.from('worksheet_sections')
							.insert({
								worksheet_id: ficheId,
								title: s.title,
								instructions: null,
								translations: { en: { title: s.en } },
								position: i + 1
							})
							.select('id'),
						`Section « ${s.title} » : création`
					);
					sectionId = cree.id;
					sectionsCreees.push(sectionId);
				}
				for (const [j, t] of s.exercices.map(titre).entries()) {
					const existante = fiche.parTitre.get(t);
					if (existante) {
						verifier(
							await supabase
								.from('worksheet_exercises')
								.update({ section_id: sectionId, position: j + 1 })
								.eq('id', existante.id)
								.select('id'),
							`« ${t} » : rangement`
						);
					} else {
						const exerciseId = ids.get(t)!;
						const v = validateCreateWorksheetExercise({
							exercise_id: exerciseId,
							position: j + 1,
							variant_mode: 'none',
							section_id: sectionId
						});
						if (!v.success) throw new Error(`« ${t} » : Zod refuse — ${v.error.issues[0].message}`);
						const [cree] = verifier(
							await supabase
								.from('worksheet_exercises')
								.insert({
									worksheet_id: ficheId,
									exercise_id: exerciseId,
									section_id: sectionId,
									position: j + 1,
									points: null,
									variant_mode: 'none',
									variant_config: {},
									custom_instructions: null,
									translations: null
								})
								.select('id'),
							`« ${t} » : ajout à la fiche`
						);
						lignesCreees.push(cree.id);
					}
				}
			}
		};
		await ranger(FICHE_TECH.id, SECTIONS_TECH, tech);
		await ranger(FICHE_APP.id, SECTIONS_APP, app);
		console.log(`  ✍️  ${sectionsCreees.length} sections créées, fiches rangées`);

		// Relecture : l'ordre lu en base est celui du plan
		for (const [ficheId, plan] of [
			[FICHE_TECH.id, SECTIONS_TECH],
			[FICHE_APP.id, SECTIONS_APP]
		] as const) {
			const relue = await lireFiche(supabase, ficheId);
			const ordre = [...relue.parTitre.entries()]
				.map(([t, l]) => {
					const s = relue.sections.find((x) => x.id === l.section_id);
					return { t, cle: (s?.position ?? 0) * 1000 + l.position };
				})
				.sort((a, b) => a.cle - b.cle)
				.map((x) => x.t);
			const attendu = plan.flatMap((s) => s.exercices.map(titre));
			if (JSON.stringify(ordre) !== JSON.stringify(attendu))
				throw new Error(`Relecture de ${ficheId} : ordre inattendu\n${ordre.join('\n')}`);
			if (relue.sections.length !== plan.length)
				throw new Error(`Relecture de ${ficheId} : ${relue.sections.length} sections`);
		}
		console.log('  ✓ Relecture : sections et ordre conformes au plan');
	} catch (err) {
		console.error(`\n⛔ ${(err as Error).message}\n   Retour à l'état d'avant…`);
		for (const id of lignesCreees) await supabase.from('worksheet_exercises').delete().eq('id', id);
		for (const fiche of [tech, app]) {
			for (const [k, l] of [...fiche.parTitre.values()].entries())
				await supabase
					.from('worksheet_exercises')
					.update({ position: 100 + k })
					.eq('id', l.id);
			for (const l of fiche.parTitre.values())
				await supabase
					.from('worksheet_exercises')
					.update({ section_id: l.section_id, position: l.position })
					.eq('id', l.id);
			if (sectionsTouchees) {
				for (const s of fiche.sections)
					await supabase
						.from('worksheet_sections')
						.update({ position: 50 + s.position })
						.eq('id', s.id);
				for (const s of fiche.sections)
					await supabase
						.from('worksheet_sections')
						.update({ title: s.title, position: s.position, translations: s.translations })
						.eq('id', s.id);
			}
		}
		for (const id of sectionsCreees)
			await supabase.from('worksheet_sections').delete().eq('id', id);
		for (const m of exercicesModifies)
			await supabase
				.from('exercises')
				.update({ variations: m.avant as unknown as Json })
				.eq('id', m.id);
		for (const id of exercicesCrees) await supabase.from('exercises').delete().eq('id', id);
		if (imagesEnvoyees.length > 0) await supabase.storage.from(BUCKET).remove(imagesEnvoyees);
		console.error(`   Défait. État d'avant gardé dans ${sauvegarde} pour contrôle.`);
		process.exit(1);
	}
	console.log('\n✅ Refonte écrite.');
}

main().catch((err) => {
	console.error(`⛔ ${(err as Error).message}`);
	process.exit(1);
});
