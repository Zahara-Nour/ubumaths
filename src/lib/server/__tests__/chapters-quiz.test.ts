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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, mockSuccess, mockError } from 'tests/helpers';
import type { QuestionTemplateRow } from '$lib/types/question-template';

const QUIZ_Q1 = '11111111-1111-4111-8111-111111111111';
const QUIZ_Q2 = '22222222-2222-4222-8222-222222222222';
const TEMPLATE_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEMPLATE_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CHAPITRE = '99999999-9999-4999-8999-999999999999';
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
		mockError(supabase, { message: 'connexion perdue', code: '08006' }, 'then');

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
		mockError(supabase, { message: 'connexion perdue', code: '08006' }, 'then');

		const { data, error } = await submitQuizAnswer(
			ELEVE_A,
			QUIZ_Q1,
			true,
			12,
			supabase as never,
			'4'
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});
});
