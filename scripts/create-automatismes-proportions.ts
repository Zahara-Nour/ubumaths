#!/usr/bin/env tsx

/**
 * Automatismes de 2de entretenus en 1re : proportions et pourcentages — fiche de séries figées
 * (2026-11-08, ADR 0011)
 * ==========================================================================================
 *
 * Fiche « Automatismes : proportions et pourcentages (1) » : 2 séries de 8 questions, chacune un
 * exercice ordinaire fait d'instances de modèles de questions tirées avec une graine fixe (même
 * copie pour toute la classe). Capacités des automatismes de 2de (« Proportions et
 * pourcentages », à entretenir en 1re) : calculer, appliquer, exprimer une proportion sous
 * différentes formes (décimale, fractionnaire, pourcentage) ; utiliser une proportion pour
 * calculer une partie connaissant le tout, ou le tout connaissant une partie. Modèles du collège
 * et de 2de déjà en base, réutilisés tels quels, et UN modèle neuf : « Écrire une proportion sous
 * une autre forme » (scripts/questions/automatismes-2de-proportions/, créé par
 * `create-questions.ts --dir scripts/questions/automatismes-2de-proportions --publier`).
 * Tant que son fichier n'a pas d'`id`, la simulation le lit dans le fichier et l'écriture
 * refuse. Fiche et séries attachées à la 2de ET à la 1re (décision de David, 2026-11-06).
 * Changer une graine change la copie : les graines sont la fiche ; choisies pour éviter les
 * cas triviaux (10 % de 50), les fractions supérieures à 1 présentées comme des proportions,
 * et pour la mise en page du PDF (aucune formule en ligne coupée).
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-proportions.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-proportions.ts --publier  # écrit en prod
 *   … --publier --mettre-a-jour   réécrit les deux séries d'une fiche déjà créée, si elle est
 *                                 encore en brouillon (graines ou modèles corrigés)
 *   … --sortie <dossier>          simulation : écrit aussi les séries en md/ sol/ titles.txt,
 *                                 pour `pnpm fiche:verifier <dossier>`
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
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
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const ECOLE = '05668b78-e4d2-4d85-85b6-183e75d24204';
const MODELE_FICHE_ELEVE = '00000000-0000-4000-8000-000000000012';
const TOPIC = 'Automatismes';
const iSortie = process.argv.indexOf('--sortie');
const SORTIE = iSortie > 0 ? process.argv[iSortie + 1] : null;
if (iSortie > 0 && (!SORTIE || SORTIE.startsWith('--')))
	throw new Error('--sortie demande un dossier : --sortie <dossier>');

/** Niveaux de la fiche et des séries : automatismes de 2de, entretenus en 1re */
const NIVEAUX = ['2', '1_SPE'];

/** Modèle neuf de ce lot : lu dans son fichier tant qu'il n'est pas en base (simulation) */
const FICHIER_NEUF =
	'scripts/questions/automatismes-2de-proportions/01-proportion-autre-forme.json';
const ID_PROVISOIRE_NEUF = '00000000-0000-4000-8000-0000000000f2';
const fichierNeuf = JSON.parse(readFileSync(FICHIER_NEUF, 'utf8')) as Record<string, unknown>;
const ID_NEUF = typeof fichierNeuf.id === 'string' ? fichierNeuf.id : null;

/** Modèles (ADR 0011 : pas de niveau ajouté aux modèles d'autres niveaux) */
const MODELES = {
	/** 5e — exprimer une proportion en pourcentage (tout quelconque) */
	proportionPourcentage: 'ade95ae4-5374-4bb3-b31b-02b61e3c1ccc',
	/** 6e — exprimer une proportion en pourcentage (tout multiple de 100) */
	proportionSurCent: '5c8a6da6-f99b-4d61-94cc-7147605ec7c6',
	/** 2de — effectifs, proportions et pourcentages (pourcentage, partie, écriture décimale) */
	effectifs: '5b3bef9f-f2b0-49e0-8b15-9ef7d19c9c4b',
	/** 2de, neuf — écrire une proportion sous une autre forme */
	autreForme: ID_NEUF ?? ID_PROVISOIRE_NEUF,
	/** 2de — pourcentage d'un pourcentage */
	pourcentageDePourcentage: '11f91d46-82c7-4dca-8812-e85b7bd93ae2',
	/** 2de — pourcentages de pourcentages : effectifs */
	pourcentagesSuccessifs: 'afbfa8c6-ad87-40ed-83e9-2e29cec24480',
	/** 4e — fraction d'une fraction */
	fractionDeFraction: 'a635df43-313d-47f7-a445-2020867ed2e4',
	/** 5e — probabilité en décimal ou en pourcentage */
	probabilite: 'f4f0d076-e95e-4662-b0a4-d04b0b5416c9',
	/** 4e — calculer avec des pourcentages (t % de c, le tout connaissant t %) */
	pourcentages: '4f599434-9927-4420-bf62-f8047ca65bec',
	/** 5e — calculer 1 % d'une quantité (et p % en passant par 1 %) */
	unPourcent: '950cfa36-7eb8-44ba-9912-21c5e42d3bd9',
	/** 6e — calculer une fraction d'une quantité */
	fractionQuantite: '0be55013-6c7d-447b-98f4-bdfa574ad506',
	/** 2de — calculer le tout connaissant une partie */
	tout: '39b4823d-0241-408b-b04e-1fb6620b1951'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Proportions et pourcentages — série 1',
		items: [
			q('proportionPourcentage', 10),
			q('proportionSurCent', 8),
			q('effectifs', 17),
			q('autreForme', 12),
			q('pourcentageDePourcentage', 8),
			q('pourcentagesSuccessifs', 10),
			q('fractionDeFraction', 2),
			q('probabilite', 8)
		]
	},
	{
		title: 'Proportions et pourcentages — série 2',
		items: [
			q('pourcentages', 10),
			q('unPourcent', 5),
			q('effectifs', 14),
			q('fractionQuantite', 10),
			q('pourcentagesSuccessifs', 14),
			q('tout', 18),
			q('tout', 5),
			q('pourcentages', 2)
		]
	}
];

const FICHE = {
	title: 'Automatismes : proportions et pourcentages (1)',
	description:
		'Exprimer une proportion en écriture décimale, fractionnaire ou en pourcentage ; proportion de proportion ; calculer une partie connaissant le tout, ou le tout connaissant une partie.',
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
	const attendus = Object.values(MODELES).length;
	for (const row of lignes ?? []) modeles.set(row.id, toQuestionTemplate(row));
	if (!ID_NEUF) {
		// Modèle neuf pas encore créé : la simulation le lit dans son fichier, l'écriture refuse
		if (PUBLIER)
			throw new Error(`${FICHIER_NEUF} sans id : le créer d'abord (create-questions.ts)`);
		modeles.set(ID_PROVISOIRE_NEUF, {
			...(fichierNeuf as unknown as QuestionTemplate),
			id: ID_PROVISOIRE_NEUF
		});
		console.log(`  ⚠️  ${FICHIER_NEUF} lu dans le fichier (pas encore en base)`);
	}
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
			grades: NIVEAUX,
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
		grades: NIVEAUX
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
				grades: NIVEAUX,
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
