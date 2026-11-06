#!/usr/bin/env tsx

/**
 * Automatismes de 2de entretenus en 1re : nombres — fiche de séries figées (2026-11-06, ADR 0011)
 * ===========================================================================================
 *
 * Fiche « Automatismes : nombres (1) » : 2 séries de 8 questions, chacune un exercice
 * ordinaire fait d'instances de modèles de questions tirées avec une graine fixe (même copie
 * pour toute la classe). Capacités des automatismes de 2de (« Calcul numérique et
 * algébrique », à entretenir en 1re) : comparer deux nombres par leur différence ou leur
 * quotient, fractions, puissances, écritures décimale / fractionnaire / pourcentage, ordre de
 * grandeur, conversions d'unités. Modèles du collège et de 2de déjà en base, réutilisés tels
 * quels : aucun modèle neuf. Fiche et séries attachées à la 2de ET à la 1re (décision de
 * David, 2026-11-06). Changer une graine change la copie : les graines sont la fiche ;
 * choisies pour éviter les cas triviaux (« 1 dm² = … cm² ») et pour la mise en page du
 * PDF : fiche sur UNE page, aucune formule en ligne coupée (le générateur Typst laisse
 * couper les formules en ligne, cf. typst-generator.ts) — d'où différence 10 (piste),
 * interpréter une différence 1 (Léa et Tom), fractions par `259a0b26` (écrites en ligne,
 * pas en bloc) et vitesse moyenne `6b44d220` plutôt que la conversion `1dd4d0ea`.
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-nombres.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-nombres.ts --publier  # écrit en prod
 *   … --publier --mettre-a-jour   réécrit les deux séries d'une fiche déjà créée, si elle est
 *                                 encore en brouillon (graines ou modèles corrigés)
 */
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

/** Niveaux de la fiche et des séries : automatismes de 2de, entretenus en 1re */
const NIVEAUX = ['2', '1_SPE'];

/** Modèles en base (ADR 0011 : pas de niveau ajouté aux modèles d'autres niveaux) */
const MODELES = {
	/** 2de — comparer deux quantités par leur différence */
	difference: '5ffcde13-e2e7-43a6-8cfb-0004e7f2295d',
	/** 2de — comparer deux quantités par leur rapport */
	rapport: '313ae1a2-1bfb-4da6-bcdd-8487bc4a84a2',
	/** 2de — interpréter une différence */
	interpreterDifference: '52516a54-40e9-48e9-ac86-8a91d388dd46',
	/** 6e — comparer deux fractions avec un dénominateur commun */
	comparerFractions: '259a0b26-9b36-4662-b1fb-13ffd0748ab6',
	/** 6e — comparer deux fractions de dénominateurs multiples */
	fractionsDenominateursMultiples: '228b1620-640c-4570-9c8f-2f3e960aca7d',
	/** 4e — enchaîner des calculs de fractions */
	enchainerFractions: 'a270c7aa-6760-443e-bc1f-647486c33565',
	/** 3e — multiplier et diviser des puissances de 10 */
	puissancesDeDix: '8ac99be4-a6be-4c89-90c8-c7d8974313f4',
	/** 3e — multiplier deux puissances de 10 */
	produitPuissancesDeDix: '5b627bb7-201f-4482-91e7-58b98604a4f9',
	/** 3e — diviser deux puissances d'un même nombre */
	quotientPuissances: '18761148-ca6b-4c7f-ae72-506819de30bb',
	/** 6e — décimal → fraction la plus simple */
	decimalEnFraction: '81a64b0a-e6a2-45fc-90ce-c0aee11f539c',
	/** 6e — pourcentage → fraction simplifiée */
	pourcentageEnFraction: '5d7726eb-edd4-4ae0-891a-3069d4694d06',
	/** 6e — contrôler par un ordre de grandeur */
	ordreDeGrandeur: '7deff4e0-61c6-42bd-8cfb-ddcad1c94b35',
	/** 6e — convertir des aires */
	aires: '82748db8-01fe-4c2e-86b6-4ef8c1dde805',
	/** 5e — contenances et volumes */
	contenances: '355bd41a-1589-4c25-be09-5f062bada81a',
	/** 6e — durée décimale → minutes */
	dureeDecimale: '65c32979-d51b-4c65-9759-f1e8fa9c676e',
	/** 4e — calculer une vitesse moyenne (grandeur quotient) ; la conversion de vitesses
	 *  `1dd4d0ea` est écartée : son corrigé, une seule chaîne d'égalités en ligne, se coupe au PDF */
	vitesses: '6b44d220-2485-4d2c-aa35-70e74abec66e'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Nombres — série 1',
		items: [
			q('difference', 10),
			q('comparerFractions', 7),
			q('enchainerFractions', 4),
			q('puissancesDeDix', 7),
			q('quotientPuissances', 5),
			q('decimalEnFraction', 11),
			q('pourcentageEnFraction', 10),
			q('ordreDeGrandeur', 8)
		]
	},
	{
		title: 'Nombres — série 2',
		items: [
			q('rapport', 7),
			q('interpreterDifference', 1),
			q('fractionsDenominateursMultiples', 7),
			q('produitPuissancesDeDix', 4),
			q('aires', 8),
			q('contenances', 4),
			q('dureeDecimale', 8),
			q('vitesses', 5)
		]
	}
];

const FICHE = {
	title: 'Automatismes : nombres (1)',
	description:
		'Comparer par différence ou par rapport, fractions, puissances, écritures d’un nombre, ordre de grandeur, conversions d’unités.',
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
	if (lignes?.length !== attendus) throw new Error(`Modèles : ${lignes?.length ?? 0}/${attendus}`);
	for (const row of lignes) modeles.set(row.id, toQuestionTemplate(row));
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
