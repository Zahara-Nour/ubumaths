#!/usr/bin/env tsx

/**
 * Automatismes de 1re : calcul numérique et algébrique — fiche de séries figées (2026-11-05, ADR 0011)
 * ==================================================================================================
 *
 * Fiche « Automatismes : calcul algébrique (1) » : 2 séries de 8 questions, chacune un exercice
 * ordinaire fait d'instances de modèles de questions tirées avec une graine fixe (même copie pour
 * toute la classe). Capacités du programme de 1re (Automatismes, « Calcul numérique et
 * algébrique ») : équation produit nul, signe d'une expression du premier degré ou factorisée du
 * second degré (série 1) ; développer, factoriser, réduire (série 2). Modèles de 3e, de 2de et de
 * 1re déjà en base, réutilisés tels quels, plus 1 modèle neuf
 * (`scripts/questions/calcul-1spe/01-tableau-signes-affine.json`, créé par
 * `create-questions.ts --dir scripts/questions/calcul-1spe --publier`). Tant que son fichier n'a
 * pas d'`id`, la SIMULATION le lit dans le fichier ; `--publier` exige qu'il soit en base.
 * Changer une graine change la copie : les graines sont la fiche.
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-calcul-1spe.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-calcul-1spe.ts --publier  # écrit en prod
 *   … --sortie <dossier>          simulation : écrit aussi les séries en md/ sol/ titles.txt,
 *                                 pour `pnpm fiche:verifier <dossier>` AVANT toute écriture
 *   … --publier --mettre-a-jour   réécrit les deux séries d'une fiche déjà créée, si elle est
 *                                 encore en brouillon (graines ou modèles corrigés)
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const METTRE_A_JOUR = process.argv.includes('--mettre-a-jour');
const iSortie = process.argv.indexOf('--sortie');
const SORTIE = iSortie > 0 ? process.argv[iSortie + 1] : null;
if (iSortie > 0 && (!SORTIE || SORTIE.startsWith('--')))
	throw new Error('--sortie demande un dossier : --sortie <dossier>');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const ECOLE = '05668b78-e4d2-4d85-85b6-183e75d24204';
const MODELE_FICHE_ELEVE = '00000000-0000-4000-8000-000000000012';
const TOPIC = 'Automatismes';

/** Modèle neuf de ce lot : lu dans son fichier tant qu'il n'est pas en base (simulation) */
const FICHIER_AFFINE = 'scripts/questions/calcul-1spe/01-tableau-signes-affine.json';
const ID_PROVISOIRE_AFFINE = '00000000-0000-4000-8000-0000000000af';
const fichierAffine = JSON.parse(readFileSync(FICHIER_AFFINE, 'utf8')) as Record<string, unknown>;
const ID_AFFINE = typeof fichierAffine.id === 'string' ? fichierAffine.id : null;

/** Modèles (ADR 0011 : pas de niveau 1re ajouté aux modèles d'autres niveaux) */
const MODELES = {
	/** 2de — résoudre (ax + b)(cx + d) = 0 */
	produitNul: 'bb3b8e76-e6de-4987-94c4-207e4f5acec0',
	/** 3e — résoudre x(ax + b) = 0 */
	produitNulX: '2ab49a6f-2fc4-4583-9cbb-46ace580c019',
	/** 1re, neuf — tableau de signes de ax + b */
	signeAffine: ID_AFFINE ?? ID_PROVISOIRE_AFFINE,
	/** 2de — tableau de signes d'un produit */
	tableauProduit: 'f0163416-0610-49cc-bf2d-83db744dbf43',
	/** 2de — signe d'un produit, sans tableau */
	signeProduit: '6bb5ff09-34ba-401b-a7d5-8edb76d9dee0',
	/** 2de — résoudre A(x) > 0 avec un tableau de signes */
	inequationTableau: '71174c9c-2ab7-4829-9f0f-d8e81e2eb7a8',
	/** 1re — signe d'un trinôme sous forme factorisée (inéquation) */
	trinomeFactorise: 'afe51ac4-8552-454e-b45e-46f0edbd9416',
	/** 1re — signe d'une expression du second degré k(x − a)² */
	signeCarre: 'b48d72dd-e93b-4f5c-ac81-117ff1c2c79c',
	/** 2de — réduire une expression */
	reduire: '33eb676e-e3d7-4710-a1c1-50133a060125',
	/** 3e — développer un double produit */
	doubleProduit: '9fefb94c-283f-44aa-9adf-203221a2edc0',
	/** 2de — développer (a + b)² */
	carreSomme: '288c2bf0-2442-4e2d-ad4b-afcc1d23b6b2',
	/** 3e — développer (a + b)(a − b) */
	sommeDifference: '32cf5766-85eb-46c0-8885-4b6a00ee8a97',
	/** 1re — développer une forme canonique ou factorisée */
	formeCanonique: '45e47034-959d-4996-a5d6-ea22fd0ac316',
	/**
	 * 4e — factoriser le plus possible (facteur commun). `dcaabf69` (3e, facteur commun
	 * expression) écartait : sa correction tient sur une ligne qui déborde de la colonne
	 */
	facteurCommun: '11607586-7b7b-404f-8e62-91ddefa75efa',
	/** 3e — factoriser a² − b² */
	differenceCarres: 'ff9bb2fb-9104-43af-98a8-344df090f716',
	/** 2de — factoriser une expression du second degré (carré parfait) */
	carreParfait: 'd1648508-035e-4a2f-abce-87592365038f'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Calcul algébrique — série 1',
		items: [
			q('produitNul', 1),
			q('produitNulX', 1),
			q('signeAffine', 1),
			q('tableauProduit', 2),
			q('signeProduit', 1),
			q('inequationTableau', 1),
			q('trinomeFactorise', 1),
			q('signeCarre', 1)
		]
	},
	{
		title: 'Calcul algébrique — série 2',
		items: [
			q('reduire', 1),
			q('doubleProduit', 1),
			q('carreSomme', 1),
			q('sommeDifference', 1),
			q('formeCanonique', 1),
			q('facteurCommun', 1),
			q('differenceCarres', 1),
			q('carreParfait', 2)
		]
	}
];

const FICHE = {
	title: 'Automatismes : calcul algébrique (1)',
	description:
		'Équation produit nul ; signe d’une expression du premier degré ou factorisée du second degré ; développer, factoriser, réduire.',
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

type Client = ReturnType<typeof createClient<Database>>;
type Exercice = { title: string; variations: unknown };

/** Réécrit les variantes des séries d'une fiche encore en brouillon ; chaque écriture relue */
async function mettreAJour(supabase: Client, exercices: Exercice[]) {
	const { data: fiches, error: e0 } = await supabase
		.from('worksheets')
		.select('id, status')
		.eq('title', FICHE.title);
	if (e0) throw new Error(`Lecture des fiches impossible : ${e0.message}`);
	if (fiches?.length !== 1)
		throw new Error(`Fiche « ${FICHE.title} » : ${fiches?.length ?? 0} trouvée(s)`);
	const fiche = fiches[0];
	if (fiche.status !== 'draft')
		throw new Error(`Fiche ${fiche.id} : ${fiche.status}, pas brouillon`);
	const { data: liens, error: e1 } = await supabase
		.from('worksheet_exercises')
		.select('exercise_id, exercises(title, topic)')
		.eq('worksheet_id', fiche.id);
	if (e1) throw new Error(`Lecture des séries impossible : ${e1.message}`);
	const ids = new Map<string, string>();
	for (const l of liens ?? []) {
		const ex = l.exercises as { title: string; topic: string } | null;
		if (ex?.topic === TOPIC) ids.set(ex.title, l.exercise_id);
	}
	for (const e of exercices) {
		if (!ids.has(e.title)) throw new Error(`Série « ${e.title} » absente de la fiche ${fiche.id}`);
	}
	console.log(`  ✓ fiche ${fiche.id} en brouillon, ${exercices.length} séries retrouvées`);
	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier --mettre-a-jour pour écrire.');
		return;
	}
	for (const e of exercices) {
		const { data, error } = await supabase
			.from('exercises')
			.update({ variations: e.variations as never, updated_at: new Date().toISOString() })
			.eq('id', ids.get(e.title)!)
			.select('id');
		if (error || data?.length !== 1)
			throw new Error(`« ${e.title} » : mise à jour refusée — ${error?.message ?? '0 ligne'}`);
		console.log(`  ✍️  « ${e.title} » réécrite`);
	}
	console.log('\n✅ Terminé.');
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

	// --- Phase 1a : retrouver les modèles --------------------------------------
	const modeles = new Map<string, QuestionTemplate>();
	const { data: lignes, error: e0 } = await supabase
		.from('question_templates')
		.select('*')
		.in('id', Object.values(MODELES));
	if (e0) throw new Error(`Lecture des modèles impossible : ${e0.message}`);
	for (const row of lignes ?? []) modeles.set(row.id, toQuestionTemplate(row));
	if (!ID_AFFINE) {
		// Modèle neuf pas encore créé : la simulation le lit dans son fichier, l'écriture refuse
		if (PUBLIER)
			throw new Error(`${FICHIER_AFFINE} sans id : le créer d'abord (create-questions.ts)`);
		modeles.set(ID_PROVISOIRE_AFFINE, {
			...(fichierAffine as unknown as QuestionTemplate),
			id: ID_PROVISOIRE_AFFINE
		});
		console.log(`  ⚠️  ${FICHIER_AFFINE} lu dans le fichier (pas encore en base)`);
	}
	const attendus = Object.values(MODELES).length;
	if (modeles.size !== attendus) throw new Error(`Modèles : ${modeles.size}/${attendus}`);
	console.log(`  ✓ ${modeles.size} modèles retrouvés`);

	// --- Phase 1b : construire et valider les séries ---------------------------
	const exercices = SERIES.map((serie) => {
		const items: SerieItem[] = serie.items.map((i) => ({
			templateId: MODELES[i.cle],
			seed: i.seed
		}));
		const { statement, solution } = buildSerie(modeles, items);
		const donnees = {
			title: serie.title,
			topic: TOPIC,
			category: 'automatisme' as const,
			grades: ['1_SPE'],
			is_public: false,
			variations: [{ label: 'guided', statement_md: statement, solution_md: solution, hints: [] }]
		};
		const v = createExerciseSchema.safeParse(donnees);
		if (!v.success)
			throw new Error(`« ${serie.title} » : Zod refuse — ${v.error.issues[0].message}`);
		// Ce qui est écrit est ce que Zod a validé (défauts et transformations compris)
		return v.data;
	});

	if (METTRE_A_JOUR) {
		await mettreAJour(supabase, exercices);
		return;
	}

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
		if (SORTIE) {
			mkdirSync(`${SORTIE}/md`, { recursive: true });
			mkdirSync(`${SORTIE}/sol`, { recursive: true });
			exercices.forEach((e, i) => {
				const n = String(i + 1).padStart(2, '0');
				writeFileSync(`${SORTIE}/md/${n}.md`, e.variations[0].statement_md);
				writeFileSync(`${SORTIE}/sol/${n}.md`, e.variations[0].solution_md);
			});
			writeFileSync(`${SORTIE}/titles.txt`, exercices.map((e) => e.title).join('\n') + '\n');
			console.log(`\n  ✓ séries écrites dans ${SORTIE} (pnpm fiche:verifier ${SORTIE})`);
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
				style_id: MODELE_FICHE_ELEVE,
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
