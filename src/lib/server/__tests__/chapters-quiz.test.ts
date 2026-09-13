/**
 * Quiz de chapitre — instances par élève et garde de publication.
 * =============================================================
 *
 * Trois invariants que ni le typecheck ni le lint ne voient :
 *
 * 1. **Un modèle non publié n'est pas absent, il est invisible.** La policy
 *    « Students can view published templates » filtre sur `status`, donc la
 *    requête de l'élève rend une ligne de moins — sans erreur. Le filtrer en
 *    silence est exactement ce qui a caché le quiz mort pendant toute la vie
 *    de la fonctionnalité : un écran vide qui accuse la base.
 *
 * 2. **Une panne de lecture n'est pas un quiz vide.** Si la requête échoue,
 *    l'appelant doit pouvoir le dire, pas afficher « aucune question ».
 *
 * 3. **La graine décide de l'équité.** Une graine aléatoire à chaque
 *    affichage laisse l'élève recharger jusqu'à tomber sur une version plus
 *    facile ; une graine dérivée de (question, élève) ne le permet pas.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createMockSupabase, mockSuccess, mockError } from 'tests/helpers';
import type { QuestionTemplateRow } from '$lib/types/question-template';

const QUIZ_Q1 = '11111111-1111-4111-8111-111111111111';
const QUIZ_Q2 = '22222222-2222-4222-8222-222222222222';
const TEMPLATE_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEMPLATE_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CHAPITRE = '99999999-9999-4999-8999-999999999999';
const AUTRE_CHAPITRE = '88888888-8888-4888-8888-888888888888';
const ELEVE_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ELEVE_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** Un modèle publié dont l'énoncé porte une valeur tirée au sort. */
function modele(overrides: Partial<QuestionTemplateRow> = {}): QuestionTemplateRow {
	return {
		id: TEMPLATE_1,
		title: 'Parité',
		description: null,
		theme: 'Nombres',
		domain: 'Entiers',
		subdomain: null,
		level: 1,
		status: 'published',
		grades: ['2'],
		delay: null,
		variations: [
			{
				statement: 'Le nombre {{n}} est-il pair ? [_]',
				variables: [{ name: 'n', expression: '{{random:1..10000}}' }],
				blanks: [{ expectedAnswer: '{{n}}' }]
			}
		] as unknown as QuestionTemplateRow['variations'],
		shared: null,
		options: null,
		default_display_options: null,
		test_specs: null,
		multiple_answers: null,
		exercise_instruction: null,
		created_at: null,
		updated_at: null,
		created_by: null,
		...overrides
	};
}

const question = (id: string, questionTemplateId: string) => ({ id, questionTemplateId });

/**
 * Un comptage PostgREST (`select('*', { count: 'exact', head: true })`) rend
 * `count` À LA RACINE, pas dans `data` : `mockSuccess` ne sait pas l'exprimer,
 * et un mock qui le range dans `data` laisserait `count` à `undefined` — le
 * test passerait alors pour une raison fausse.
 */
function mockCount(supabase: ReturnType<typeof createMockSupabase>, count: number) {
	const reponse = { data: null, error: null, count };
	supabase._mockChain.then.mockImplementationOnce((onFulfilled?: (v: unknown) => unknown) =>
		Promise.resolve(onFulfilled ? onFulfilled(reponse) : reponse)
	);
}

/**
 * Le PREMIER `generateInstance` du processus paie l'initialisation de la pile
 * mathématique (~2 s), les suivants coûtent quelques millisecondes. Sans cette
 * chauffe, cette dépense tombait sur le premier test venu et le faisait
 * dépasser les 5 s par défaut dès que la suite complète tournait en parallèle —
 * un échec qui n'aurait rien appris sur le code testé.
 */
beforeAll(async () => {
	const { buildQuizInstances } = await import('../chapters-quiz');
	const supabase = createMockSupabase();
	mockSuccess(supabase, [modele()], 'then');
	await buildQuizInstances([question(QUIZ_Q1, TEMPLATE_1)], ELEVE_A, supabase as never);
}, 60000);

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('buildQuizInstances — cas nominal', () => {
	it('rend une instance par question, indexée par la question de quiz', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const supabase = createMockSupabase();
		mockSuccess(supabase, [modele(), modele({ id: TEMPLATE_2 })], 'then');

		const { data, error } = await buildQuizInstances(
			[question(QUIZ_Q1, TEMPLATE_1), question(QUIZ_Q2, TEMPLATE_2)],
			ELEVE_A,
			supabase as never
		);

		expect(error).toBeNull();
		expect(Object.keys(data!.instances).sort()).toEqual([QUIZ_Q1, QUIZ_Q2].sort());
		expect(data!.unavailable).toHaveLength(0);
		expect(data!.instances[QUIZ_Q1].statement).toContain('est-il pair');
	});

	it("n'interroge pas la base quand le quiz est vide", async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const supabase = createMockSupabase();

		const { data, error } = await buildQuizInstances([], ELEVE_A, supabase as never);

		expect(error).toBeNull();
		expect(data).toEqual({ instances: {}, unavailable: [] });
		expect(supabase.from).not.toHaveBeenCalled();
	});
});

describe('buildQuizInstances — la graine', () => {
	/**
	 * Un seul tirage identique entre deux élèves serait un hasard acceptable ;
	 * cinq élèves qui voient tous la même valeur sur 1..10000 ne l'est pas.
	 */
	it('donne des valeurs différentes à des élèves différents', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const eleves = [ELEVE_A, ELEVE_B, QUIZ_Q1, QUIZ_Q2, TEMPLATE_2];
		const enonces = new Set<string>();

		for (const eleve of eleves) {
			const supabase = createMockSupabase();
			mockSuccess(supabase, [modele()], 'then');
			const { data } = await buildQuizInstances(
				[question(QUIZ_Q1, TEMPLATE_1)],
				eleve,
				supabase as never
			);
			enonces.add(data!.instances[QUIZ_Q1].statement);
		}

		expect(enonces.size).toBeGreaterThan(1);
	});

	it('redonne le même énoncé au même élève qui revient', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');

		const lire = async () => {
			const supabase = createMockSupabase();
			mockSuccess(supabase, [modele()], 'then');
			const { data } = await buildQuizInstances(
				[question(QUIZ_Q1, TEMPLATE_1)],
				ELEVE_A,
				supabase as never
			);
			return data!.instances[QUIZ_Q1].statement;
		};

		expect(await lire()).toBe(await lire());
	});

	it('donne des valeurs différentes à deux questions du même élève', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const supabase = createMockSupabase();
		mockSuccess(supabase, [modele(), modele({ id: TEMPLATE_2 })], 'then');

		const { data } = await buildQuizInstances(
			[question(QUIZ_Q1, TEMPLATE_1), question(QUIZ_Q2, TEMPLATE_2)],
			ELEVE_A,
			supabase as never
		);

		expect(data!.instances[QUIZ_Q1].statement).not.toBe(data!.instances[QUIZ_Q2].statement);
	});
});

describe('buildQuizInstances — ce qui manque est annoncé', () => {
	it('signale un modèle que l’élève ne peut pas lire, au lieu de le filtrer', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const supabase = createMockSupabase();
		// TEMPLATE_2 est en brouillon : la RLS ne le rend pas.
		mockSuccess(supabase, [modele()], 'then');

		const { data } = await buildQuizInstances(
			[question(QUIZ_Q1, TEMPLATE_1), question(QUIZ_Q2, TEMPLATE_2)],
			ELEVE_A,
			supabase as never
		);

		expect(Object.keys(data!.instances)).toEqual([QUIZ_Q1]);
		expect(data!.unavailable).toEqual([{ quizQuestionId: QUIZ_Q2, reason: 'modele_indisponible' }]);
	});

	it('laisse les autres questions jouables quand une génération échoue', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const supabase = createMockSupabase();
		// Un modèle sans variation ne peut pas produire d'instance.
		mockSuccess(
			supabase,
			[
				modele(),
				modele({ id: TEMPLATE_2, variations: [] as unknown as QuestionTemplateRow['variations'] })
			],
			'then'
		);

		const { data, error } = await buildQuizInstances(
			[question(QUIZ_Q1, TEMPLATE_1), question(QUIZ_Q2, TEMPLATE_2)],
			ELEVE_A,
			supabase as never
		);

		expect(error).toBeNull();
		expect(Object.keys(data!.instances)).toEqual([QUIZ_Q1]);
		expect(data!.unavailable).toEqual([
			{ quizQuestionId: QUIZ_Q2, reason: 'generation_impossible' }
		]);
	});

	it('remonte une panne de lecture au lieu de rendre un quiz vide', async () => {
		const { buildQuizInstances } = await import('../chapters-quiz');
		const supabase = createMockSupabase();
		mockError(supabase, 'connexion perdue', 'then', '08006');

		const { data, error } = await buildQuizInstances(
			[question(QUIZ_Q1, TEMPLATE_1)],
			ELEVE_A,
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
	});
});

describe('addQuizQuestion — garde de publication', () => {
	it('refuse un modèle en brouillon et n’insère rien', async () => {
		const { addQuizQuestion } = await import('../chapters');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: TEMPLATE_1, status: 'draft' }, 'single');

		const { data, error } = await addQuizQuestion(CHAPITRE, TEMPLATE_1, supabase as never, 0);

		expect(data).toBeNull();
		expect(error?.message).toMatch(/publi/i);
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});

	/**
	 * Le message d'un refus est écrit pour le professeur ; celui d'une panne
	 * vient de Postgres et décrit la base. L'appelant doit pouvoir montrer le
	 * premier sans laisser fuiter le second — d'où deux types distincts.
	 */
	it('distingue un refus délibéré d’une panne de lecture', async () => {
		const { addQuizQuestion, ContentRefusal } = await import('../chapters');

		const brouillon = createMockSupabase();
		mockSuccess(brouillon, { id: TEMPLATE_1, status: 'draft' }, 'single');
		const refus = await addQuizQuestion(CHAPITRE, TEMPLATE_1, brouillon as never, 0);
		expect(refus.error).toBeInstanceOf(ContentRefusal);

		const panne = createMockSupabase();
		mockError(panne, { message: 'connexion perdue', code: '08006' }, 'single');
		const erreur = await addQuizQuestion(CHAPITRE, TEMPLATE_1, panne as never, 0);
		expect(erreur.error).not.toBeNull();
		expect(erreur.error).not.toBeInstanceOf(ContentRefusal);
	});

	it('accepte un modèle publié', async () => {
		const { addQuizQuestion } = await import('../chapters');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: TEMPLATE_1, status: 'published' }, 'single');
		mockSuccess(
			supabase,
			{
				id: QUIZ_Q1,
				chapter_id: CHAPITRE,
				question_template_id: TEMPLATE_1,
				display_order: 0,
				points_override: null,
				created_at: new Date().toISOString()
			},
			'single'
		);

		const { data, error } = await addQuizQuestion(CHAPITRE, TEMPLATE_1, supabase as never, 0);

		expect(error).toBeNull();
		expect(data?.id).toBe(QUIZ_Q1);
		expect(supabase._mockChain.insert).toHaveBeenCalled();
	});
});

describe('submitQuizAnswer — le numéro de tentative', () => {
	/**
	 * Sans lecture de l'erreur, un comptage en panne laissait `attempt_number`
	 * à 1 indéfiniment : le professeur lisait « 1ʳᵉ tentative » sur la dixième.
	 * Mieux vaut refuser que d'enregistrer un chiffre faux.
	 */
	it('refuse plutôt que d’enregistrer une première tentative fausse', async () => {
		const { submitQuizAnswer } = await import('../chapters');
		const supabase = createMockSupabase();
		// 1. lecture de la question du quiz : elle passe
		mockSuccess(
			supabase,
			{
				id: QUIZ_Q1,
				question_template_id: TEMPLATE_1,
				points_override: null,
				chapter: { is_visible: true, class_id: CHAPITRE }
			},
			'single'
		);
		// 2. comptage des essais : il tombe
		mockError(supabase, 'connexion perdue', 'then', '08006');

		const { data, error } = await submitQuizAnswer(
			{
				studentId: ELEVE_A,
				quizQuestionId: QUIZ_Q1,
				chapterId: CHAPITRE,
				isCorrect: true,
				timeSpentSeconds: 12,
				submittedAnswer: '4'
			},
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});
});

describe('submitQuizAnswer — la question doit appartenir au chapitre', () => {
	/**
	 * L'en-tête de la route promettait une « validation de contexte » qui
	 * n'existait pas : `params.id` était vérifié comme UUID, puis jamais comparé
	 * au chapitre de la question. Sans conséquence — la policy d'insertion
	 * revérifie l'appartenance à la classe — mais un commentaire qui ment sur un
	 * garde est pire que pas de garde : le prochain lecteur s'y fie.
	 */
	function questionDuChapitre(chapterId: string) {
		return {
			id: QUIZ_Q1,
			chapter_id: chapterId,
			question_template_id: TEMPLATE_1,
			points_override: null,
			chapter: { is_visible: true, class_id: chapterId }
		};
	}

	it('refuse une question rattachée à un autre chapitre, sans rien insérer', async () => {
		const { submitQuizAnswer } = await import('../chapters');
		const supabase = createMockSupabase();
		mockSuccess(supabase, questionDuChapitre(AUTRE_CHAPITRE), 'single');

		const { data, error } = await submitQuizAnswer(
			{
				studentId: ELEVE_A,
				quizQuestionId: QUIZ_Q1,
				chapterId: CHAPITRE,
				isCorrect: true,
				timeSpentSeconds: 12
			},
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});

	it('accepte quand la question appartient bien au chapitre', async () => {
		const { submitQuizAnswer } = await import('../chapters');
		const supabase = createMockSupabase();
		mockSuccess(supabase, questionDuChapitre(CHAPITRE), 'single');
		mockCount(supabase, 0);
		mockSuccess(
			supabase,
			{
				id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
				chapter_quiz_question_id: QUIZ_Q1,
				student_id: ELEVE_A,
				submitted_answer: '4',
				is_correct: true,
				points_earned: 1,
				time_spent_seconds: 12,
				attempt_number: 1,
				submitted_at: new Date().toISOString()
			},
			'single'
		);
		mockSuccess(supabase, null, 'maybeSingle'); // pas de carte SRS

		const { error } = await submitQuizAnswer(
			{
				studentId: ELEVE_A,
				quizQuestionId: QUIZ_Q1,
				chapterId: CHAPITRE,
				isCorrect: true,
				timeSpentSeconds: 12,
				submittedAnswer: '4'
			},
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase._mockChain.insert).toHaveBeenCalled();
	});
});

describe('submitQuizAnswer — le plafond de tentatives', () => {
	/**
	 * Le plafond ne protège PAS d'un élève qui scripterait son jeton : le rôle
	 * `authenticated` a le droit INSERT sur la table, donc PostgREST contourne
	 * cette fonction. Il borne le dégât d'un client qui re-soumet en boucle —
	 * ce qui s'est produit : la première version du composant re-postait à
	 * chaque retour en arrière.
	 */
	it('refuse au-delà du plafond, avec un motif distinct d’une panne', async () => {
		const { submitQuizAnswer, QuizSubmissionRefusal } = await import('../chapters');
		const supabase = createMockSupabase();
		mockSuccess(
			supabase,
			{
				id: QUIZ_Q1,
				chapter_id: CHAPITRE,
				question_template_id: TEMPLATE_1,
				points_override: null,
				chapter: { is_visible: true, class_id: CHAPITRE }
			},
			'single'
		);
		mockCount(supabase, 100);

		const { data, error } = await submitQuizAnswer(
			{
				studentId: ELEVE_A,
				quizQuestionId: QUIZ_Q1,
				chapterId: CHAPITRE,
				isCorrect: true,
				timeSpentSeconds: 3
			},
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).toBeInstanceOf(QuizSubmissionRefusal);
		expect((error as InstanceType<typeof QuizSubmissionRefusal>).reason).toBe('limite_atteinte');
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});
});
