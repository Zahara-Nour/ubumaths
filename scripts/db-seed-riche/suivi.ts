/**
 * Base locale remplie, chantier `seed-complet`, PR 2 — suivi et travail scolaire des élèves fictifs.
 *
 * Fonction pure et déterministe (graine fixe), comme `activite.ts` : elle ne touche ni réseau ni
 * base, `index.ts` insère ce qu'elle rend. Le moteur de questions (tirage, correction) lui est
 * passé en fonctions (`./moteur.ts` en vrai, des doublures dans les tests).
 * Tests : scripts/__tests__/db-seed-suivi.test.ts.
 *
 * Ce qu'elle invente : évaluations passées, entraînement (traces), révisions (paquets, fiches de
 * mémorisation, séances), Python (exercices, fichier, carnets), devinettes, fiches (élèves nommés,
 * corrigés par exercice, signalements, impression), exercices hors fiche, compétences, visites.
 *
 * Cas toujours présents : l'élève « étoile » réussit tout ; l'élève « absent » (le dernier de la
 * première classe) n'a AUCUNE activité et sa dernière visite date de plus de trois semaines ;
 * l'élève hors classe n'a aucune activité mais reçoit une fiche à son nom ; une évaluation est
 * commencée sans être rendue ; une réponse de devinette attend le prof.
 *
 * Jamais écrites ici, parce que la base les calcule seule à l'insertion (déclencheurs) :
 * `student_point_state` (depuis les traces) et `python_exercise_mastery` (depuis les soumissions).
 */

import { gradeOutOf20 } from '#lib/questions/grading.ts';

/** Début de tous les identifiants inventés ici : le seed les retrouve pour les effacer. */
export const PREFIXE_SUIVI = '5eed5c01';

export interface QuestionTiree {
	template_id: string;
	seed: number;
	delay_seconds: number;
	/** Question complète, réponses attendues comprises, SANS sa graine. */
	instance: Record<string, unknown>;
	attendues: string[];
}

export interface Verdict {
	status: 'correct' | 'unoptimal_form' | 'bad_form' | 'incorrect' | 'empty';
	points: 0 | 0.5 | 1;
	isCorrect: boolean;
	partial: boolean;
	feedback?: string;
}

export interface ContexteSuivi {
	prof: string;
	/** `modeles` : modèles publiés, rangés au programme du niveau de la classe, hors cours. */
	classes: { id: string; eleves: string[]; modeles: string[] }[];
	horsClasse: string;
	maintenant: Date;
	graine: number;
	/** L'évaluation copiée, la composition de sa série, et quand la première classe l'a reçue. */
	evaluation: { id: string; items: unknown[]; assigneeLe: string } | null;
	/** Tire les questions de l'évaluation pour une graine. */
	tirer: (graine: number) => QuestionTiree[];
	corriger: (instance: Record<string, unknown>, valeurs: string[] | null) => Verdict;
	/** Réponses attendues d'un modèle pour une graine ; `null` si la question ne se génère pas. */
	attendues: (modele: string, graine: number) => string[] | null;
	/** Fiches assignées par `activite.ts`. */
	assignations: { id: string; classe: string; exercicesDeFiche: string[] }[];
	/** Exercices assignables hors fiche. */
	exercices: string[];
	python: {
		exercices: string[];
		fichier: string | null;
		carnets: { id: string; controles: string[] }[];
	};
	devinette: { id: string; difficulte: number } | null;
	observables: { id: string; code: string; competence: string }[];
}

type Lignes = Record<string, unknown>[];

const JOUR = 86_400_000;
const MINUTE = 60_000;
const GRAINE_MAX = 2_147_483_647;
const CONFIG_PAQUET = { maximumInterval: 36500, desiredRetention: 0.9 };

const CARTES_LIBRES: [recto: string, verso: string][] = [
	[
		'Qu’est-ce qu’un nombre premier ?',
		'Un entier naturel qui a exactement deux diviseurs : 1 et lui-même.'
	],
	['Que vaut $7 \\times 8$ ?', '$56$'],
	['Aire d’un disque de rayon $r$ ?', '$\\pi r^2$'],
	['Périmètre d’un cercle de rayon $r$ ?', '$2\\pi r$'],
	['Théorème de Pythagore ?', 'Dans un triangle rectangle : $a^2 + b^2 = c^2$ (c : hypoténuse).']
];

const SIGNALEMENTS: [statut: 'pending' | 'fixed' | 'rejected', texte: string, reponse?: string][] =
	[
		['pending', 'Dans la question 2, le corrigé donne 12 mais je trouve 15 avec la calculatrice.'],
		[
			'fixed',
			'Il manque l’unité dans l’énoncé : on ne sait pas si c’est en cm ou en m.',
			'Bien vu, c’est corrigé. Merci !'
		],
		[
			'rejected',
			'Je crois que la réponse de la question 1 est fausse, je trouve un résultat négatif.',
			'L’énoncé est juste : relis le signe devant la parenthèse.'
		]
	];

const CODE_JUSTE = 'def double(x):\n    return 2 * x\n';
const CODE_FAUX = 'def double(x):\n    return x + 2\n';

function aleatoire(graine: number): () => number {
	let a = graine >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function planSuivi(c: ContexteSuivi) {
	const r = aleatoire(c.graine);
	const uuid = () =>
		`${PREFIXE_SUIVI}-xxxx-4xxx-8xxx-xxxxxxxxxxxx`.replace(/x/g, () =>
			Math.floor(r() * 16).toString(16)
		);
	const entier = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));
	const choisir = <T>(liste: readonly T[]) => liste[Math.floor(r() * liste.length)];
	const iso = (ms: number) => new Date(ms).toISOString();
	const t0 = c.maintenant.getTime();
	const quand = (joursAvant: number, minutesAvant = 0) =>
		iso(t0 - joursAvant * JOUR - minutesAvant * MINUTE);

	const premiere = c.classes[0]?.eleves ?? [];
	const etoile = premiere[0];
	const absent = premiere.length > 1 ? premiere.at(-1) : undefined;
	/** Élèves d'une classe qui travaillent (tous sauf l'absent). */
	const actifs = (classe: { eleves: string[] } | undefined) =>
		(classe?.eleves ?? []).filter((e) => e !== absent);
	const deuxClasses = c.classes.slice(0, 2);
	const elevesSuivis = deuxClasses.flatMap(actifs);

	// Toutes les traces « contenu » (évaluation + entraînement) : les fiches de mémorisation en sortent.
	const traces: {
		id: string;
		student_id: string;
		template_id: string;
		success: boolean;
		source: 'auto' | 'student_self';
		place: 'evaluation' | 'typing' | 'mock_test' | 'flash_cards' | 'review';
		grade: 1 | 3;
		with_help: false;
		response_ms: number | null;
		allotted_ms: number | null;
		end_reason: 'validated' | 'timeout' | null;
		seed: number | null;
		answer_parts: string[] | null;
		part_verdicts: boolean[] | null;
		created_at: string;
	}[] = [];

	// --- Évaluations passées ------------------------------------------------------------------
	const evaluationsAssignees: Lignes = [];
	const seances: Lignes = [];
	const questionsTirees: Lignes = [];
	const reponses: Lignes = [];
	const evaluation = c.evaluation;
	if (evaluation) {
		// `activite.ts` l'assigne déjà à la première classe ; on l'assigne aussi à la deuxième.
		if (c.classes[1]) {
			evaluationsAssignees.push({
				id: uuid(),
				evaluation_id: evaluation.id,
				class_id: c.classes[1].id,
				assigned_by: c.prof,
				assigned_at: quand(4)
			});
		}
		const enCours = actifs(c.classes[1]).at(-1);
		const passer = (eleve: string, joursAvant: number, niveau: number, rendue: boolean) => {
			const tirage = c.tirer(entier(0, GRAINE_MAX));
			if (tirage.length === 0) return;
			// Assez tôt pour que la copie, même rendue au bout de chaque délai, soit déjà rendue.
			const dureeMax = tirage.reduce((n, q) => n + q.delay_seconds, 0) * 1000;
			const debut = t0 - joursAvant * JOUR - dureeMax - 10 * MINUTE;
			const seance = {
				id: uuid(),
				user_id: eleve,
				evaluation_id: evaluation.id,
				mode: 'interactive',
				items: evaluation.items,
				total_questions: tirage.length,
				time_limit: null,
				created_at: iso(debut),
				completed_at: null as string | null,
				points_earned: null as number | null,
				grade: null as number | null,
				score: null as number | null,
				time_spent: null as number | null
			};
			seances.push(seance);
			tirage.forEach((q, position) =>
				questionsTirees.push({
					test_session_id: seance.id,
					position,
					template_id: q.template_id,
					seed: q.seed,
					delay_seconds: q.delay_seconds,
					instance: q.instance,
					created_at: seance.created_at
				})
			);
			if (!rendue) return;

			let ecoule = 0;
			let points = 0;
			tirage.forEach((q, position) => {
				const tire = r();
				const sorte =
					tire < niveau ? 'juste' : tire < niveau + (1 - niveau) * 0.7 ? 'faux' : 'vide';
				const valeurs =
					sorte === 'vide' || q.attendues.length === 0
						? null
						: sorte === 'juste'
							? q.attendues
							: q.attendues.map((v) => (v === '0' ? '1' : '0'));
				const verdict = c.corriger(q.instance, valeurs);
				const duree =
					valeurs === null
						? q.delay_seconds
						: Math.min(q.delay_seconds, entier(3, Math.max(3, q.delay_seconds - 1)));
				ecoule += duree;
				points += verdict.points;
				const rendueA = iso(debut + ecoule * 1000);
				reponses.push({
					id: uuid(),
					test_session_id: seance.id,
					template_id: q.template_id,
					question_instance: { ...q.instance, attemptPosition: position },
					user_answer:
						valeurs === null
							? null
							: {
									value: valeurs,
									isCorrect: verdict.isCorrect,
									timeSpent: duree,
									attempts: 1,
									submittedAt: rendueA,
									partial: verdict.partial,
									...(verdict.feedback && { feedback: verdict.feedback })
								},
					is_correct: verdict.isCorrect,
					points: verdict.points,
					status: verdict.status,
					time_spent: duree,
					attempts: 1,
					created_at: rendueA
				});
				traces.push({
					id: uuid(),
					student_id: eleve,
					template_id: q.template_id,
					success: verdict.isCorrect,
					source: 'auto',
					place: 'evaluation',
					grade: verdict.isCorrect ? 3 : 1,
					with_help: false,
					response_ms: duree * 1000,
					allotted_ms: q.delay_seconds * 1000,
					end_reason: valeurs === null ? 'timeout' : 'validated',
					seed: null,
					answer_parts: null,
					part_verdicts: null,
					created_at: rendueA
				});
			});
			seance.completed_at = iso(debut + ecoule * 1000);
			seance.points_earned = points;
			seance.grade = gradeOutOf20(points, tirage.length);
			seance.score = seance.grade / 2;
			seance.time_spent = ecoule;
		};
		// Jamais avant d'avoir reçu l'évaluation : la première classe l'a depuis `assigneeLe`
		// (`activite.ts`), la deuxième depuis 4 jours (ci-dessus).
		const depuis = Math.floor((t0 - Date.parse(evaluation.assigneeLe)) / JOUR);
		deuxClasses.forEach((classe, rang) => {
			const auPlusTot = Math.max(0, (rang === 0 ? depuis : 4) - 1);
			for (const eleve of actifs(classe)) {
				if (eleve === enCours) passer(eleve, 0, 0, false);
				else passer(eleve, entier(0, auPlusTot), eleve === etoile ? 1 : 0.4 + r() * 0.4, true);
			}
		});
		// Une deuxième tentative, meilleure : le prof voit « meilleure note » et « 2 tentatives ».
		const second = actifs(c.classes[0])[1];
		if (second && second !== enCours) passer(second, 0, 0.9, true);
	}

	// --- Entraînement : des traces sur les modèles du niveau de la classe -----------------------
	for (const classe of c.classes) {
		const modeles = classe.modeles.slice(0, 24);
		if (modeles.length === 0) continue;
		for (const eleve of actifs(classe)) {
			const niveau = eleve === etoile ? 1 : 0.45 + r() * 0.45;
			const jours = new Set<number>();
			const nbJours = entier(5, 7);
			while (jours.size < nbJours) jours.add(entier(0, 27));
			for (const jour of jours) {
				// Au moins 5 traces le même jour : c'est le seuil d'un « jour actif ».
				const n = entier(6, 12);
				for (let i = 0; i < n; i++) {
					const modele = choisir(modeles);
					const success = r() < niveau;
					const seed = entier(0, GRAINE_MAX);
					const tire = r();
					let place: (typeof traces)[number]['place'] =
						tire < 0.45
							? 'typing'
							: tire < 0.7
								? 'mock_test'
								: tire < 0.85
									? 'flash_cards'
									: 'review';
					const attendues =
						place === 'typing' || place === 'mock_test' ? c.attendues(modele, seed) : null;
					if ((place === 'typing' || place === 'mock_test') && !attendues?.length) {
						place = 'flash_cards';
					}
					const saisie = place === 'typing' || place === 'mock_test';
					const chrono = place === 'mock_test';
					traces.push({
						id: uuid(),
						student_id: eleve,
						template_id: modele,
						success,
						source: saisie ? 'auto' : 'student_self',
						place,
						grade: success ? 3 : 1,
						with_help: false,
						response_ms: chrono ? entier(3000, 19000) : null,
						allotted_ms: chrono ? 20000 : null,
						end_reason: chrono ? 'validated' : null,
						seed: place === 'review' ? null : seed,
						answer_parts: saisie
							? success
								? (attendues as string[])
								: (attendues as string[]).map((v) => (v === '0' ? '1' : '0'))
							: null,
						part_verdicts: saisie ? (attendues as string[]).map(() => success) : null,
						// Dans le passé, même pour aujourd'hui.
						created_at: quand(jour, 30 + (n - i) * 2)
					});
				}
			}
		}
	}
	traces.sort((a, b) => a.created_at.localeCompare(b.created_at));

	// --- Révisions : fiches de mémorisation, paquet « Programme », séances ----------------------
	const fiches: Lignes = [];
	const paquets: Lignes = [];
	const sections: Lignes = [];
	const cartes: Lignes = [];
	const paquetsAssignes: Lignes = [];
	const seancesRevision: Lignes = [];
	/** « élève|type|référence » des fiches déjà faites : une seule par élève et par carte. */
	const fichesFaites = new Set<string>();

	const parEleve = new Map<string, typeof traces>();
	for (const t of traces) {
		parEleve.set(t.student_id, [...(parEleve.get(t.student_id) ?? []), t]);
	}
	const modelesDeClasse = new Map<string, Set<string>>();
	for (const classe of c.classes) {
		for (const e of classe.eleves) modelesDeClasse.set(e, new Set(classe.modeles));
	}
	for (const [eleve, siennes] of parEleve) {
		const parModele = new Map<string, typeof traces>();
		for (const t of siennes)
			parModele.set(t.template_id, [...(parModele.get(t.template_id) ?? []), t]);
		for (const [modele, suite] of parModele) {
			const historique = suite.map((t, i) => {
				const ecart =
					i === 0 ? 0 : (Date.parse(t.created_at) - Date.parse(suite[i - 1].created_at)) / JOUR;
				return {
					date: t.created_at,
					grade: t.grade,
					elapsedDays: Math.round(ecart * 100) / 100,
					retrievability: i === 0 ? 1 : Math.max(0.5, Math.round((1 - ecart * 0.03) * 100) / 100)
				};
			});
			const derniere = suite[suite.length - 1];
			const reussites = suite.filter((t) => t.success).length;
			const state = !derniere.success ? 'relearning' : suite.length === 1 ? 'learning' : 'review';
			const stabilite = state === 'relearning' ? 0.5 : state === 'learning' ? 2 : 4 * reussites;
			fichesFaites.add(`${eleve}|template|${modele}`);
			fiches.push({
				id: uuid(),
				user_id: eleve,
				card_reference_type: 'template',
				card_reference_id: modele,
				difficulty: Math.min(10, Math.max(1, 5 + (suite.length - reussites) - reussites * 0.3)),
				stability: stabilite,
				state,
				last_review: derniere.created_at,
				// Une révision ratée revient tout de suite ; sinon après « stabilité » jours.
				next_review: iso(
					Date.parse(derniere.created_at) +
						(state === 'relearning' ? 10 * MINUTE : stabilite * JOUR)
				),
				total_reviews: historique.length,
				review_history: historique,
				created_at: suite[0].created_at
			});
		}
		// Paquet « Programme » : un par élève, une carte par modèle du programme déjà travaillé.
		const auProgramme = [...parModele.keys()].filter((m) => modelesDeClasse.get(eleve)?.has(m));
		if (auProgramme.length === 0) continue;
		const programme = uuid();
		paquets.push({
			id: programme,
			name: 'Programme',
			description: null,
			owner_id: eleve,
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: true,
			source_deck_id: null,
			config: CONFIG_PAQUET,
			created_at: siennes[0].created_at
		});
		for (const modele of auProgramme) {
			cartes.push({
				id: uuid(),
				deck_id: programme,
				card_type: 'template',
				template_id: modele,
				front_content: null,
				back_content: null,
				section_id: null
			});
		}
		// Une séance par jour où l'élève a révisé.
		const revisions = new Map<string, typeof traces>();
		for (const t of siennes.filter((x) => x.place === 'review')) {
			const jour = t.created_at.slice(0, 10);
			revisions.set(jour, [...(revisions.get(jour) ?? []), t]);
		}
		for (const duJour of revisions.values()) {
			const duree = duJour.length * entier(8, 25);
			seancesRevision.push({
				id: uuid(),
				user_id: eleve,
				deck_id: programme,
				started_at: duJour[0].created_at,
				completed_at: iso(Date.parse(duJour[duJour.length - 1].created_at) + MINUTE),
				cards_reviewed: duJour.length,
				correct_count: duJour.filter((t) => t.success).length,
				total_time: duree,
				average_time: Math.round((duree / duJour.length) * 10) / 10
			});
		}
	}

	// Paquets du prof, puis leur copie chez chaque élève à qui ils sont assignés.
	interface Source {
		id: string;
		name: string;
		description: string;
		deck_type: 'official' | 'personal';
		sections: { id: string; name: string }[];
		cartes: {
			type: 'template' | 'custom';
			modele?: string;
			recto?: string;
			verso?: string;
			section: number | null;
		}[];
	}
	const sources: Source[] = [
		{
			id: uuid(),
			name: 'Automatismes de la semaine',
			description: 'À revoir un peu chaque jour.',
			deck_type: 'official',
			sections: [
				{ id: uuid(), name: 'Calcul' },
				{ id: uuid(), name: 'Cours' }
			],
			cartes: [
				...(c.classes[0]?.modeles ?? [])
					.slice(0, 6)
					.map((modele) => ({ type: 'template' as const, modele, section: 0 })),
				...CARTES_LIBRES.slice(0, 2).map(([recto, verso]) => ({
					type: 'custom' as const,
					recto,
					verso,
					section: 1
				}))
			]
		},
		{
			id: uuid(),
			name: 'Formules à connaître',
			description: 'Géométrie : aires, périmètres, Pythagore.',
			deck_type: 'personal',
			sections: [],
			cartes: CARTES_LIBRES.slice(2).map(([recto, verso]) => ({
				type: 'custom' as const,
				recto,
				verso,
				section: null
			}))
		}
	];
	const ecrirePaquet = (source: Source, proprietaire: string, copieDe: string | null) => {
		const id = copieDe ? uuid() : source.id;
		paquets.push({
			id,
			name: source.name,
			description: source.description,
			owner_id: proprietaire,
			deck_type: source.deck_type,
			is_assigned: copieDe !== null,
			is_auto_managed: false,
			source_deck_id: copieDe,
			config: CONFIG_PAQUET,
			created_at: quand(copieDe ? 6 : 12)
		});
		const idsSections = source.sections.map((s, rang) => {
			const sid = copieDe ? uuid() : s.id;
			sections.push({ id: sid, deck_id: id, name: s.name, description: null, display_order: rang });
			return sid;
		});
		for (const carte of source.cartes) {
			const cid = uuid();
			cartes.push({
				id: cid,
				deck_id: id,
				card_type: carte.type,
				template_id: carte.modele ?? null,
				front_content: carte.recto ?? null,
				back_content: carte.verso ?? null,
				section_id: carte.section === null ? null : idsSections[carte.section]
			});
			if (!copieDe) continue;
			// Comme l'appli à l'assignation : une fiche neuve par carte, sauf si l'élève en a déjà une.
			const reference = carte.type === 'template' ? (carte.modele as string) : cid;
			const cle = `${proprietaire}|${carte.type}|${reference}`;
			if (fichesFaites.has(cle)) continue;
			fichesFaites.add(cle);
			fiches.push({
				id: uuid(),
				user_id: proprietaire,
				card_reference_type: carte.type,
				card_reference_id: reference,
				difficulty: 5,
				stability: 0.1,
				state: 'new',
				last_review: null,
				next_review: quand(6),
				total_reviews: 0,
				review_history: [],
				created_at: quand(6)
			});
		}
	};
	const assigner = (source: Source, eleve: string) => {
		ecrirePaquet(source, eleve, source.id);
		paquetsAssignes.push({
			id: uuid(),
			source_deck_id: source.id,
			assigned_by: c.prof,
			// Toujours l'élève, même pour une assignation à la classe : c'est ce qu'écrit l'appli.
			assigned_to: eleve,
			assignment_type: 'student',
			assigned_at: quand(6)
		});
	};
	if (c.classes.length > 0) {
		for (const source of sources) ecrirePaquet(source, c.prof, null);
		for (const eleve of elevesSuivis) assigner(sources[0], eleve);
		if (etoile) assigner(sources[1], etoile);
	}

	// --- Python -----------------------------------------------------------------------------------
	const pythonAssignes: Lignes = [];
	const pythonSoumissions: Lignes = [];
	const pythonFichiers: Lignes = [];
	const pythonCarnets: Lignes = [];
	const pythonControles: Lignes = [];
	const exosPython = c.python.exercices.slice(0, 4);
	const assignerPython = (
		exercice: string,
		cible: { classe?: string; eleve?: string },
		echeance: number | null,
		maxEssais: number | null
	) => {
		const id = uuid();
		pythonAssignes.push({
			id,
			exercise_id: exercice,
			class_id: cible.classe ?? null,
			student_id: cible.eleve ?? null,
			assigned_by: c.prof,
			due_date: echeance === null ? null : quand(-echeance),
			max_attempts: maxEssais,
			created_at: quand(8)
		});
		return id;
	};
	const soumettre = (exercice: string, assignation: string, eleve: string) => {
		const essais = eleve === etoile ? 1 : entier(0, 3);
		const finitJuste = eleve === etoile || r() < 0.6;
		const jour = entier(1, 7);
		for (let i = 1; i <= essais; i++) {
			const juste = finitJuste && i === essais;
			const ms = entier(60, 400);
			pythonSoumissions.push({
				id: uuid(),
				exercise_id: exercice,
				assignment_id: assignation,
				student_id: eleve,
				code: juste ? CODE_JUSTE : CODE_FAUX,
				validation_result: juste
					? {
							valid: true,
							failed_layer: null,
							behavior_kind: 'unit_test',
							test_results: [{ passed: true, input: 'double(2)', expected: '4', actual: '4' }],
							execution_time_ms: ms
						}
					: {
							valid: false,
							failed_layer: 'behavior',
							behavior_kind: 'unit_test',
							test_results: [
								{ passed: true, input: 'double(2)', expected: '4', actual: '4' },
								{
									passed: false,
									input: 'double(5)',
									expected: '10',
									actual: '7',
									diff: 'Attendu 10, obtenu 7'
								}
							],
							execution_time_ms: ms
						},
				is_correct: juste,
				// La base le renumérote de toute façon (déclencheur) ; même valeur ici.
				attempt_number: i,
				execution_time_ms: ms,
				// Espacées de 5 minutes, dans le passé : la limite de 10 par minute ne joue pas.
				created_at: quand(jour, (essais - i + 1) * 5)
			});
		}
	};
	if (c.classes[0]) {
		exosPython.slice(0, 3).forEach((exercice, i) => {
			const id = assignerPython(
				exercice,
				{ classe: c.classes[0].id },
				i === 0 ? 7 : null,
				i === 2 ? 5 : null
			);
			for (const eleve of actifs(c.classes[0])) soumettre(exercice, id, eleve);
		});
		if (c.classes[1] && exosPython[1]) {
			const id = assignerPython(exosPython[1], { classe: c.classes[1].id }, 10, null);
			for (const eleve of actifs(c.classes[1])) soumettre(exosPython[1], id, eleve);
		}
		if (exosPython[3] && etoile) {
			const id = assignerPython(exosPython[3], { eleve: etoile }, null, null);
			soumettre(exosPython[3], id, etoile);
		}
		if (c.python.fichier) {
			pythonFichiers.push({
				id: uuid(),
				file_id: c.python.fichier,
				class_id: c.classes[0].id,
				assigned_by: c.prof,
				instructions: 'Complète la fonction, puis exécute le programme pour vérifier.',
				due_date: quand(-5),
				assigned_at: quand(3)
			});
		}
		// Le carnet qui a le plus de points de contrôle : c'est lui qui remplit le suivi du prof.
		const carnet = [...c.python.carnets].sort((a, b) => b.controles.length - a.controles.length)[0];
		if (carnet) {
			for (const classe of deuxClasses) {
				pythonCarnets.push({
					id: uuid(),
					notebook_id: carnet.id,
					class_id: classe.id,
					shared_by: c.prof,
					readonly: false,
					created_at: quand(5)
				});
			}
			for (const eleve of elevesSuivis) {
				const reussis =
					eleve === etoile ? carnet.controles.length : entier(0, carnet.controles.length);
				carnet.controles.forEach((cellule, rang) => {
					if (rang > reussis) return;
					const passe = rang < reussis;
					const essais = eleve === etoile ? 1 : entier(1, 3);
					const debut = quand(2, 60 - rang * 5);
					pythonControles.push({
						notebook_id: carnet.id,
						user_id: eleve,
						cell_id: cellule,
						status: passe ? 'passed' : 'failed',
						error_message: passe ? null : 'AssertionError : la valeur attendue est 12.5',
						ran_at: quand(2, 55 - rang * 5),
						attempt_count: essais,
						first_attempted_at: debut,
						succeeded_at: passe ? quand(2, 55 - rang * 5) : null,
						hint_revealed: !passe && essais > 1
					});
				});
			}
		}
	}

	// --- Devinettes -------------------------------------------------------------------------------
	const devinettesAssignees: Lignes = [];
	const devinettesTentatives: {
		id: string;
		riddle_id: string;
		student_id: string;
		attempt_number: number;
		submitted_answer: { value: string };
		is_correct: boolean | null;
		validated_by: string | null;
		validated_at: string | null;
		gidouilles_awarded: number;
		created_at: string;
	}[] = [];
	const devinette = c.devinette;
	if (devinette && c.classes[0]) {
		for (const classe of deuxClasses) {
			devinettesAssignees.push({
				id: uuid(),
				riddle_id: devinette.id,
				class_id: classe.id,
				student_id: null,
				assigned_by: c.prof,
				assigned_at: quand(5)
			});
		}
		const tenter = (
			eleve: string,
			numero: number,
			valeur: string,
			verdict: boolean | null,
			joursAvant: number
		) =>
			devinettesTentatives.push({
				id: uuid(),
				riddle_id: devinette.id,
				student_id: eleve,
				attempt_number: numero,
				submitted_answer: { value: valeur },
				is_correct: verdict,
				validated_by: verdict === null ? null : c.prof,
				validated_at: verdict === null ? null : quand(joursAvant - 1),
				// Barème de l'appli : difficulté × 3 au premier essai, × 2 au deuxième.
				gidouilles_awarded: verdict ? devinette.difficulte * (numero === 1 ? 3 : 2) : 0,
				created_at: quand(joursAvant)
			});
		const [un, deux] = actifs(c.classes[0]);
		if (un) tenter(un, 1, '42', true, 4);
		if (deux) {
			tenter(deux, 1, '24', false, 4);
			tenter(deux, 2, '42', null, 1);
		}
		const autre = actifs(c.classes[1])[0];
		if (autre) tenter(autre, 1, 'Je pense que c’est 40', null, 0);
	}

	// --- Fiches : élèves nommés, corrigés par exercice, signalements, impression -------------------
	const fichesEleves: Lignes = [];
	const reglagesCorrige: Lignes = [];
	const signalements: Lignes = [];
	const impression: Lignes = [];
	const fiche = c.assignations[0];
	if (fiche) {
		// Voie « élève nommé » : c'est ainsi qu'une fiche atteint un élève hors classe.
		const nommes = new Set([c.horsClasse]);
		const dAilleurs = c.classes.find((k) => k.id !== fiche.classe && actifs(k).length > 0);
		if (dAilleurs) nommes.add(actifs(dAilleurs)[0]);
		for (const eleve of nommes) {
			fichesEleves.push({
				id: uuid(),
				assignment_id: fiche.id,
				student_id: eleve,
				created_at: quand(3)
			});
		}
		fiche.exercicesDeFiche.slice(0, 2).forEach((exercice, rang) =>
			reglagesCorrige.push({
				id: uuid(),
				assignment_id: fiche.id,
				worksheet_exercise_id: exercice,
				// Le corrigé du premier exercice reste caché, celui du deuxième est montré.
				show_correction: rang === 1
			})
		);
		const auteurs = actifs(c.classes.find((k) => k.id === fiche.classe));
		if (auteurs.length > 0 && fiche.exercicesDeFiche.length > 0) {
			SIGNALEMENTS.forEach(([statut, texte, reponse], i) =>
				signalements.push({
					id: uuid(),
					assignment_id: fiche.id,
					worksheet_exercise_id: fiche.exercicesDeFiche[i % fiche.exercicesDeFiche.length],
					student_id: auteurs[i % auteurs.length],
					description: texte,
					status: statut,
					reviewed_by: statut === 'pending' ? null : c.prof,
					reviewed_at: statut === 'pending' ? null : quand(1),
					response: reponse ?? null,
					variation_index: 0,
					seed: entier(0, GRAINE_MAX),
					created_at: quand(2, i * 10)
				})
			);
		}
	}
	const [, grandTexte] = actifs(c.classes[0]);
	const lectureFacile = actifs(c.classes[1])[0];
	if (grandTexte)
		impression.push({ student_id: grandTexte, text_size: 'large', easy_reading: false });
	if (lectureFacile) {
		impression.push({ student_id: lectureFacile, text_size: 'x_large', easy_reading: true });
	}

	// --- Exercices assignés hors fiche ----------------------------------------------------------
	const exercicesAssignes: Lignes = [];
	const exercicesVus: Lignes = [];
	const assignerExercice = (
		exercice: string | undefined,
		type: 'class' | 'student' | 'public',
		cible: string | null,
		note: string | null
	) => {
		if (!exercice || (type !== 'public' && !cible)) return null;
		const id = uuid();
		exercicesAssignes.push({
			id,
			exercise_id: exercice,
			assigned_by: c.prof,
			assigned_to_type: type,
			class_id: type === 'class' ? cible : null,
			student_id: type === 'student' ? cible : null,
			assigned_at: quand(6),
			optional_deadline: type === 'class' ? quand(-6) : null,
			notes: note,
			is_active: true
		});
		return id;
	};
	const voir = (exercice: string, assignation: string, eleve: string, fini: boolean) =>
		exercicesVus.push({
			id: uuid(),
			exercise_id: exercice,
			assignment_id: assignation,
			student_id: eleve,
			completed_at: fini ? quand(1) : null,
			last_viewed_at: quand(1),
			view_count: fini ? entier(1, 3) : 1
		});
	const [ex0, ex1, ex2, ex3] = c.exercices;
	const aLaClasse = assignerExercice(
		ex0,
		'class',
		c.classes[0]?.id ?? null,
		'À faire avant le contrôle.'
	);
	if (aLaClasse)
		actifs(c.classes[0]).forEach((e, i) => voir(ex0, aLaClasse, e, e === etoile || i % 2 === 0));
	const aLAutreClasse = assignerExercice(ex1, 'class', c.classes[1]?.id ?? null, null);
	if (aLAutreClasse)
		actifs(c.classes[1])
			.slice(0, 1)
			.forEach((e) => voir(ex1, aLAutreClasse, e, false));
	const aLEleve = assignerExercice(ex2, 'student', etoile ?? null, 'Pour aller plus loin.');
	if (aLEleve && etoile) voir(ex2, aLEleve, etoile, true);
	// « public » : visible de tous les élèves, sans classe ni élève.
	if (c.classes[0]) assignerExercice(ex3, 'public', null, null);

	// --- Compétences (écrites telles quelles : sans tâche complexe en base, rien ne les calcule) ---
	const observablesEtats: Lignes = [];
	const competences: Lignes = [];
	const parCompetence = new Map<string, { id: string; code: string }[]>();
	for (const o of c.observables) {
		parCompetence.set(o.competence, [...(parCompetence.get(o.competence) ?? []), o]);
	}
	const NIVEAUX = ['insuffisante', 'fragile', 'satisfaisante', 'tres_bonne'] as const;
	const PART_VALIDEE = { insuffisante: 0.2, fragile: 0.4, satisfaisante: 0.7, tres_bonne: 1 };
	const peuObserve = actifs(c.classes[1]).at(-1);
	for (const eleve of elevesSuivis) {
		for (const [competence, observables] of parCompetence) {
			// Moins de deux tâches : l'appli dit « pas encore assez observé ».
			const assez = eleve !== peuObserve;
			const niveau = !assez ? 'insuffisante' : eleve === etoile ? 'tres_bonne' : choisir(NIVEAUX);
			const nbValides = assez ? Math.round(observables.length * PART_VALIDEE[niveau]) : 0;
			const valides = observables.slice(0, nbValides);
			const manquant = observables[nbValides];
			competences.push({
				student_id: eleve,
				math_competence_id: competence,
				niveau,
				validated_observables: valides.map((o) => o.code),
				missing_for_next: !assez
					? [{ kind: 'guard', name: 'needs_more_tasks' }]
					: manquant
						? [{ kind: 'observable', code: manquant.code }]
						: [],
				task_count: assez ? 3 : 1,
				last_recalc_at: quand(2)
			});
			observables.forEach((o, rang) => {
				const valide = rang < nbValides;
				const plus = valide ? entier(2, 3) : assez ? entier(0, 1) : rang === 0 ? 1 : 0;
				const moins = valide ? entier(0, 1) : assez ? entier(1, 2) : 0;
				if (plus + moins === 0) return;
				observablesEtats.push({
					student_id: eleve,
					observable_id: o.id,
					count_plus: plus,
					count_minus: moins,
					// Règle de l'appli : au moins deux « + », et plus de « + » que de « − ».
					is_acquis: plus >= 2 && plus > moins,
					last_attempt_at: quand(entier(2, 20))
				});
			});
		}
	}

	// --- Dernières visites ------------------------------------------------------------------------
	// Le jour de Paris, comme l'appli : une visite « d'aujourd'hui » ne doit pas dater d'hier.
	const jourDeParis = (joursAvant: number) =>
		new Date(t0 - joursAvant * JOUR).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
	const visites = c.classes.flatMap((k) =>
		k.eleves.map((eleve) => ({
			student_id: eleve,
			// L'absent revient après plus de trois semaines : le Palotin fête son retour.
			last_visit_date: jourDeParis(eleve === absent ? 25 : 0),
			welcome_back_on: null,
			week_celebrated_on: null
		}))
	);

	return {
		evaluationsAssignees,
		seances,
		questionsTirees,
		reponses,
		traces,
		fiches,
		paquets,
		sections,
		cartes,
		paquetsAssignes,
		seancesRevision,
		pythonAssignes,
		pythonSoumissions,
		pythonFichiers,
		pythonCarnets,
		pythonControles,
		devinettesAssignees,
		devinettesTentatives,
		fichesEleves,
		reglagesCorrige,
		signalements,
		impression,
		exercicesAssignes,
		exercicesVus,
		observablesEtats,
		competences,
		visites
	};
}

export type PlanSuivi = ReturnType<typeof planSuivi>;

/**
 * Où va chaque partie du plan, dans l'ordre d'écriture (une table avant celles qui la désignent).
 * `tableaux` : colonnes qui sont des tableaux Postgres, pas du JSON.
 */
export const ECRITURE_SUIVI: readonly {
	partie: keyof PlanSuivi;
	table: string;
	tableaux?: readonly string[];
	/** Colonnes d'une clé unique de la table (hors `id`) : le plan n'y met jamais deux fois la même. */
	unique?: readonly string[];
}[] = [
	{ partie: 'evaluationsAssignees', table: 'evaluation_assignments' },
	{ partie: 'seances', table: 'test_sessions' },
	{
		partie: 'questionsTirees',
		table: 'evaluation_attempt_questions',
		unique: ['test_session_id', 'position']
	},
	{ partie: 'reponses', table: 'test_answers' },
	{ partie: 'traces', table: 'skill_attempts', tableaux: ['answer_parts', 'part_verdicts'] },
	{ partie: 'paquets', table: 'srs_decks' },
	{ partie: 'sections', table: 'srs_deck_sections', unique: ['deck_id', 'name'] },
	{ partie: 'cartes', table: 'srs_cards' },
	{ partie: 'paquetsAssignes', table: 'srs_deck_assignments' },
	{
		partie: 'fiches',
		table: 'srs_card_stats',
		unique: ['user_id', 'card_reference_type', 'card_reference_id']
	},
	{ partie: 'seancesRevision', table: 'srs_review_sessions' },
	{
		partie: 'pythonAssignes',
		table: 'python_exercise_assignments',
		unique: ['exercise_id', 'class_id', 'student_id']
	},
	{
		partie: 'pythonSoumissions',
		table: 'python_exercise_submissions',
		unique: ['student_id', 'exercise_id', 'attempt_number']
	},
	{ partie: 'pythonFichiers', table: 'python_file_assignments', unique: ['file_id', 'class_id'] },
	{
		partie: 'pythonCarnets',
		table: 'python_notebook_assignments',
		unique: ['notebook_id', 'class_id']
	},
	{
		partie: 'pythonControles',
		table: 'python_notebook_checkpoint_runs',
		unique: ['notebook_id', 'user_id', 'cell_id']
	},
	{ partie: 'devinettesAssignees', table: 'riddle_assignments' },
	{
		partie: 'devinettesTentatives',
		table: 'riddle_attempts',
		unique: ['riddle_id', 'student_id', 'attempt_number']
	},
	{
		partie: 'fichesEleves',
		table: 'worksheet_assignment_students',
		unique: ['assignment_id', 'student_id']
	},
	{
		partie: 'reglagesCorrige',
		table: 'worksheet_assignment_exercise_settings',
		unique: ['assignment_id', 'worksheet_exercise_id']
	},
	{ partie: 'signalements', table: 'worksheet_error_reports' },
	{ partie: 'impression', table: 'student_print_settings', unique: ['student_id'] },
	{
		partie: 'exercicesAssignes',
		table: 'exercise_assignments',
		unique: ['exercise_id', 'assigned_to_type', 'class_id', 'student_id']
	},
	{ partie: 'exercicesVus', table: 'exercise_completions', unique: ['exercise_id', 'student_id'] },
	{
		partie: 'observablesEtats',
		table: 'student_observable_state',
		unique: ['student_id', 'observable_id']
	},
	{
		partie: 'competences',
		table: 'student_competence_level',
		unique: ['student_id', 'math_competence_id']
	},
	{ partie: 'visites', table: 'student_last_visits', unique: ['student_id'] }
];
