#!/usr/bin/env tsx

/**
 * Automatismes de 2de entretenus en 1re : géométrie et repérage — fiche de séries figées
 * (2026-11-08, ADR 0011)
 * ======================================================================================
 *
 * Fiche « Automatismes : géométrie et repérage (1) » : 2 séries de 8 questions, chacune un
 * exercice ordinaire fait d'instances de modèles de questions tirées avec une graine fixe (même
 * copie pour toute la classe). Capacités des automatismes de 2de (« Géométrie », à entretenir
 * en 1re) : repérer ou placer un point sur une droite graduée, lire ou placer un point dans un
 * repère orthogonal ; périmètres, aires et volumes usuels ; Pythagore, Thalès ; cosinus, sinus,
 * tangente. Modèles du collège et de 2de déjà en base, réutilisés tels quels, et DEUX modèles
 * neufs de 5e : « Lire les coordonnées d'un point » et « Placer un point de coordonnées
 * données » (scripts/questions/automatismes-2de-geometrie/, créés par
 * `create-questions.ts --dir scripts/questions/automatismes-2de-geometrie --publier`).
 * Tant que leurs fichiers n'ont pas d'`id`, la simulation les lit dans les fichiers et
 * l'écriture refuse. Fiche et séries attachées à la 2de ET à la 1re (décision de David,
 * 2026-11-06). Changer une graine change la copie : les graines sont la fiche ; choisies pour
 * éviter les cas triviaux (Thalès dont la réponse redit une donnée, point sur un axe pour la
 * lecture), varier les gestes (relatifs, dixièmes et quarts, rayon et diamètre, valeur exacte
 * et arrondie), et pour la mise en page du PDF.
 *
 * Garde-fous : base = prod ; modèles tous retrouvés ; séries construites et validées
 * (Zod) AVANT la moindre écriture ; arrêt si un titre d'exercice existe déjà dans le
 * thème ou si la fiche existe ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * fiche et exercices créés supprimés.
 *
 * Usage :
 *   pnpm tsx scripts/create-automatismes-geometrie.ts            # simulation
 *   pnpm tsx scripts/create-automatismes-geometrie.ts --publier  # écrit en prod
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

/** Modèles neufs de ce lot : lus dans leur fichier tant qu'ils ne sont pas en base (simulation) */
const NEUFS = {
	lireCoordonnees: {
		fichier: 'scripts/questions/automatismes-2de-geometrie/01-lire-coordonnees-point.json',
		provisoire: '00000000-0000-4000-8000-0000000000f3'
	},
	placerPoint: {
		fichier: 'scripts/questions/automatismes-2de-geometrie/02-placer-point-coordonnees.json',
		provisoire: '00000000-0000-4000-8000-0000000000f4'
	}
};
const fichiersNeufs = Object.fromEntries(
	Object.entries(NEUFS).map(([cle, n]) => [
		cle,
		JSON.parse(readFileSync(n.fichier, 'utf8')) as Record<string, unknown>
	])
) as Record<keyof typeof NEUFS, Record<string, unknown>>;
/** Identifiant en base d'un modèle neuf, ou null s'il n'est pas encore créé */
const idNeuf = (cle: keyof typeof NEUFS) => {
	const id = fichiersNeufs[cle].id;
	return typeof id === 'string' ? id : null;
};

/** Modèles (ADR 0011 : pas de niveau ajouté aux modèles d'autres niveaux) */
const MODELES = {
	/** 2de — lire l'abscisse d'un point sur une droite graduée */
	lireAbscisse: 'a692569a-ec38-413b-a774-4991d8c88b94',
	/** 2de — placer un réel sur une droite graduée */
	placerReel: '3b0a04c0-1af8-4040-9537-0aef99b31dd0',
	/** 5e, neuf — lire les coordonnées d'un point */
	lireCoordonnees: idNeuf('lireCoordonnees') ?? NEUFS.lireCoordonnees.provisoire,
	/** 5e, neuf — placer un point de coordonnées données */
	placerPoint: idNeuf('placerPoint') ?? NEUFS.placerPoint.provisoire,
	/** 4e — calculer une longueur avec Pythagore */
	pythagore: '22d947f4-1093-44d1-8d58-96a976520fb7',
	/** 3e — calculer une longueur avec Thalès */
	thales: 'f55d07b0-9256-4cfd-817a-28b7be6bb8ea',
	/** 3e — écrire cos, sin ou tan d'un angle */
	ecrireTrigo: 'dbd5debf-38d2-48f3-ae13-05701f5b09fc',
	/** 3e — calculer une longueur ou un angle (trigonométrie) */
	calculerTrigo: '57c73be1-c98c-45a0-8828-94987041ab60',
	/** 2de — périmètre d'un polygone */
	perimetrePolygone: '11bce2bf-3ec3-46b6-a333-8f5b1e430c89',
	/** 6e — périmètre d'un disque */
	perimetreDisque: 'cfb4c692-04d8-4cd9-9849-3b5cb94628e5',
	/** 5e — aire d'un triangle */
	aireTriangle: '72ac333e-4d40-44d3-bd27-25e8fd775729',
	/** 5e — aire d'un disque : valeur exacte */
	aireDisque: '8db109a5-ea7a-41e6-9a6d-62caed1160de',
	/** 5e — volume d'un cylindre : valeur exacte */
	cylindre: '47971d3d-cc14-4880-8b1b-09f80f703d2a',
	/** 4e — volume d'une pyramide */
	pyramide: '6a770d04-b763-4887-95a9-336709a92fba',
	/** 4e — volume d'un cône */
	cone: '35002b15-46dc-4813-aa6e-d241762d1b69',
	/** 3e — volume d'une boule */
	boule: '87f79961-03c8-44af-98b5-438165d2f689'
};

type Cle = keyof typeof MODELES;
const q = (cle: Cle, seed: number) => ({ cle, seed });

const SERIES = [
	{
		title: 'Géométrie et repérage — série 1',
		items: [
			q('lireAbscisse', 7),
			q('placerReel', 20),
			q('lireCoordonnees', 15),
			q('placerPoint', 17),
			q('pythagore', 17),
			q('thales', 7),
			q('ecrireTrigo', 14),
			q('calculerTrigo', 4)
		]
	},
	{
		title: 'Géométrie et repérage — série 2',
		items: [
			q('perimetrePolygone', 4),
			q('perimetreDisque', 14),
			q('aireTriangle', 10),
			q('aireDisque', 10),
			q('cylindre', 8),
			q('pyramide', 5),
			q('cone', 11),
			q('boule', 8)
		]
	}
];

const FICHE = {
	title: 'Automatismes : géométrie et repérage (1)',
	description:
		'Repérer et placer un point sur une droite graduée et dans un repère ; périmètres, aires et volumes usuels ; Pythagore, Thalès ; cosinus, sinus et tangente dans le triangle rectangle.',
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
	for (const cle of Object.keys(NEUFS) as (keyof typeof NEUFS)[]) {
		if (idNeuf(cle)) continue;
		// Modèle neuf pas encore créé : la simulation le lit dans son fichier, l'écriture refuse
		const { fichier, provisoire } = NEUFS[cle];
		if (PUBLIER) throw new Error(`${fichier} sans id : le créer d'abord (create-questions.ts)`);
		modeles.set(provisoire, {
			...(fichiersNeufs[cle] as unknown as QuestionTemplate),
			id: provisoire
		});
		console.log(`  ⚠️  ${fichier} lu dans le fichier (pas encore en base)`);
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
