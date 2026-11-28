/**
 * Erreurs de la classe sur une question d'un contrôle (chantier
 * `erreurs-frequentes`, PR 1) : calcul pur et lecture.
 */
import { describe, expect, it } from 'vitest';
import {
	computeQuestionErrors,
	getEvaluationQuestionErrors,
	type QuestionErrorAnswer
} from '../evaluation-question-errors';
import { QUESTION_ERRORS_MESSAGE } from '#lib/types/evaluation-breakdown.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';
import type { DetailedVerdict, StudentAnswer } from '#lib/utils/answer-validator.ts';
import { createFakeSupabase, type Result } from './helpers/fake-supabase';
import { GRADING_BUDGET_EXCEEDED_FEEDBACK } from '../grading-budget';

const EVALUATION = '8b9c0d1e-8888-4888-8888-888888888888';
const TEMPLATE = '4d5e6f70-4444-4444-8444-444444444441';

function instance(statement: string, blankTypes: string[] = ['math']): QuestionInstance {
	return {
		templateId: TEMPLATE,
		statement,
		blanks: blankTypes.map((type) => ({ type, expectedAnswer: '1' })),
		generatedAt: '2026-11-10T10:00:00Z'
	} as unknown as QuestionInstance;
}

function row(
	name: string,
	status: string | null,
	values: string[] | null,
	inst: QuestionInstance = instance('Calcule 3 + 4')
): QuestionErrorAnswer {
	return {
		studentName: name,
		instance: { ...inst, attemptPosition: 1 },
		userAnswer: values === null ? null : { value: values },
		status
	};
}

/** Validateur factice : une case est juste quand sa valeur vaut « ok » */
function validate(inst: QuestionInstance, answer: StudentAnswer): DetailedVerdict {
	const blanks = (inst.blanks ?? []).map((_, index) => ({
		index,
		status: answer.values?.[index] === 'ok' ? ('correct' as const) : ('incorrect' as const),
		remarks: [],
		answer: answer.values?.[index] ?? ''
	}));
	return { status: blanks.every((b) => b.status === 'correct') ? 'correct' : 'incorrect', blanks };
}

describe('computeQuestionErrors', () => {
	it('liste les réponses fausses, partielles ou de mauvaise forme ; jamais les justes', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'correct', ['ok']),
				row('Bob', 'incorrect', ['8']),
				row('Cléo', 'unoptimal_form', ['7/1']),
				row('Dan', 'bad_form', ['7,0'])
			],
			{ validate }
		);
		expect(result.answers).toBe(4);
		expect(result.groups.flatMap((g) => g.students).sort()).toEqual(['Bob', 'Cléo', 'Dan']);
		expect(result.groups.map((g) => g.status).sort()).toEqual([
			'bad_form',
			'incorrect',
			'unoptimal_form'
		]);
	});

	it('sans réponse : selon le statut seul, comme le bilan ; compté à part, jamais listé', () => {
		const result = computeQuestionErrors(
			[row('Bob', 'empty', ['']), row('Cléo', null, null), row('Dan', 'inconnu', ['3'])],
			{ validate }
		);
		expect(result.withoutAnswer).toBe(3);
		expect(result.groups).toEqual([]);
	});

	it('faux sans valeur enregistrée : faux comme dans le bilan, listé avec une réponse vide', () => {
		const result = computeQuestionErrors([row('Ada', 'incorrect', null)], { validate });
		expect(result.withoutAnswer).toBe(0);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]).toMatchObject({ students: ['Ada'], status: 'incorrect' });
	});

	it('question non corrigée faute de temps : détail indisponible, jamais recalculé', () => {
		const late: QuestionErrorAnswer = {
			...row('Ada', 'incorrect', ['ok']),
			userAnswer: { value: ['ok'], feedback: GRADING_BUDGET_EXCEEDED_FEEDBACK }
		};
		const result = computeQuestionErrors([late], { validate });
		expect(result.groups[0].verdict).toMatchObject({ unavailable: true, status: 'incorrect' });
	});

	it('même énoncé et même réponse : un groupe avec la liste des noms', () => {
		const result = computeQuestionErrors(
			[row('Ada', 'incorrect', ['12']), row('Bob', 'incorrect', ['12'])],
			{ validate }
		);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0].students).toEqual(['Ada', 'Bob']);
		expect(result.groups[0].values).toEqual(['12']);
		// La position dans la copie n'est pas servie
		expect(result.groups[0].instance).not.toHaveProperty('attemptPosition');
	});

	it('même réponse mais énoncés différents : groupes séparés', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'incorrect', ['12'], instance('Calcule 3 + 4')),
				row('Bob', 'incorrect', ['12'], instance('Calcule 5 + 6'))
			],
			{ validate }
		);
		expect(result.groups).toHaveLength(2);
	});

	it('même énoncé, réponses différentes : groupes séparés', () => {
		const result = computeQuestionErrors(
			[row('Ada', 'incorrect', ['12']), row('Bob', 'incorrect', ['13'])],
			{ validate }
		);
		expect(result.groups).toHaveLength(2);
	});

	it("l'ordre des clés de l'instance ne sépare pas deux groupes", () => {
		const a = instance('Calcule 3 + 4');
		const b = Object.fromEntries(Object.entries(a).reverse()) as unknown as QuestionInstance;
		const result = computeQuestionErrors(
			[row('Ada', 'incorrect', ['12'], a), row('Bob', 'incorrect', ['12'], b)],
			{ validate }
		);
		expect(result.groups).toHaveLength(1);
	});

	it('stats par case : une case ratée sur deux, les justes au dénominateur', () => {
		const two = instance('a et b', ['math', 'math']);
		const result = computeQuestionErrors(
			[
				row('Ada', 'correct', ['ok', 'ok'], two),
				row('Bob', 'incorrect', ['ok', 'x'], two),
				row('Cléo', 'incorrect', ['y', 'x'], two),
				row('Dan', 'incorrect', null, two)
			],
			{ validate }
		);
		// Dan : faux sans valeur enregistrée, compté comme dans le bilan (cases vides = fausses)
		expect(result.blanks).toEqual([
			{ blank: 1, errors: 2, answers: 4 },
			{ blank: 2, errors: 3, answers: 4 }
		]);
	});

	it('stats par case : aucune pour une seule case', () => {
		const result = computeQuestionErrors([row('Bob', 'incorrect', ['x'])], { validate });
		expect(result.blanks).toEqual([]);
	});

	it('stats par case : aucune pour un QCM', () => {
		const qcm = instance('Choisis', ['choice', 'choice']);
		const result = computeQuestionErrors([row('Bob', 'incorrect', ['0', '1'], qcm)], { validate });
		expect(result.blanks).toEqual([]);
	});

	it('détail indisponible : écarté des stats par case, réponse tout de même listée', () => {
		const two = instance('a et b', ['math', 'math']);
		const failing = () => {
			throw new Error('validateur en échec');
		};
		const result = computeQuestionErrors([row('Bob', 'incorrect', ['x', 'y'], two)], {
			validate: failing
		});
		expect(result.blanks).toEqual([]);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0].verdict).toMatchObject({ unavailable: true });
	});

	it('verdict fourni (trace de série) : jamais recalculé, servi tel quel', () => {
		let calls = 0;
		const verdict = {
			status: 'incorrect' as const,
			blanks: [{ index: 0, status: 'incorrect' as const, remarks: [], answer: '8' }]
		};
		const result = computeQuestionErrors([{ ...row('Bob', 'incorrect', ['8']), verdict }], {
			validate: (inst, answer) => {
				calls += 1;
				return validate(inst, answer);
			}
		});
		expect(calls).toBe(0);
		expect(result.groups[0].verdict).toEqual(verdict);
	});

	it('aucune erreur : liste vide', () => {
		const result = computeQuestionErrors([row('Ada', 'correct', ['ok'])], { validate });
		expect(result).toMatchObject({ answers: 1, withoutAnswer: 0, groups: [], blanks: [] });
	});

	it('le groupe le plus nombreux vient en premier', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'incorrect', ['1']),
				row('Bob', 'incorrect', ['2']),
				row('Cléo', 'incorrect', ['2'])
			],
			{ validate }
		);
		expect(result.groups[0].students).toEqual(['Bob', 'Cléo']);
	});
});

describe('computeQuestionErrors — types d’erreur (chantier type-erreur)', () => {
	/** Énoncé tiré : réponse attendue de chaque case = `expected` */
	function drawn(expected: string, blanks = 1): QuestionInstance {
		return {
			templateId: TEMPLATE,
			statement: `Calcule (résultat ${expected})`,
			blanks: Array.from({ length: blanks }, () => ({
				type: 'math',
				expectedAnswer: expected,
				expectedAnswerLatex: expected
			})),
			generatedAt: '2026-11-15T10:00:00Z'
		} as unknown as QuestionInstance;
	}

	it('énoncés différents, même type : comptés ensemble, chaque élève une fois', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'incorrect', ['-12'], drawn('12')),
				row('Bob', 'incorrect', ['-12'], drawn('12')),
				row('Cléo', 'incorrect', ['-35'], drawn('35')),
				row('Dan', 'incorrect', ['3,5'], drawn('35')),
				row('Eve', 'incorrect', ['13'], drawn('12')),
				row('Fred', 'correct', ['ok'], drawn('12'))
			],
			{ validate }
		);
		expect(result.errorKinds).toEqual([
			{ label: 'Erreur de signe', count: 3 },
			{ label: 'Puissance de 10', count: 1 }
		]);
		expect(result.unrecognized).toBe(1);
		const ada = result.groups.find((g) => g.students.includes('Ada'));
		expect(ada?.errorKinds).toEqual([{ blank: 1, guess: { kind: 'sign' } }]);
		const eve = result.groups.find((g) => g.students.includes('Eve'));
		expect(eve?.errorKinds).toEqual([]);
	});

	it('plusieurs cases : un compte par case fausse', () => {
		const result = computeQuestionErrors([row('Ada', 'incorrect', ['-12', '24'], drawn('12', 2))], {
			validate
		});
		expect(result.errorKinds).toEqual([
			{ label: 'Erreur de signe', count: 1 },
			{ label: 'Double', count: 1 }
		]);
		expect(result.groups[0].errorKinds.map((k) => k.blank)).toEqual([1, 2]);
	});

	it('mauvaise forme : ni type ni « non reconnue »', () => {
		const result = computeQuestionErrors(
			[
				{
					...row('Ada', 'bad_form', ['\\frac{24}{2}'], drawn('12')),
					verdict: {
						status: 'bad_form',
						blanks: [{ index: 0, status: 'bad_form', remarks: [], answer: '\\frac{24}{2}' }]
					}
				}
			],
			{ validate }
		);
		expect(result.errorKinds).toEqual([]);
		expect(result.unrecognized).toBe(0);
	});

	/** Attendu 7 (3 + 4) ; erreur prévue −1 (3 − 4), nommée ou non */
	function withExpected(expected: string, error: string, label?: string): QuestionInstance {
		const inst = drawn(expected);
		return {
			...inst,
			blanks: inst.blanks?.map((blank) => ({
				...blank,
				expectedErrors: [
					{
						answer: error,
						answerLatex: error,
						message: "Tu as soustrait au lieu d'additionner.",
						...(label !== undefined && { label })
					}
				]
			}))
		};
	}

	it('erreur prévue : comptée sous son nom, à côté des types devinés (idées-format, idée 3)', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'incorrect', ['-1'], withExpected('7', '-1', 'Soustraction')),
				row('Bob', 'incorrect', ['-1'], withExpected('7', '-1', 'Soustraction')),
				// Autre tirage, même erreur prévue : comptée avec les autres
				row('Cléo', 'incorrect', ['-2'], withExpected('8', '-2', 'Soustraction')),
				row('Dan', 'incorrect', ['-7'], withExpected('7', '-1', 'Soustraction')),
				row('Eve', 'incorrect', ['13'], withExpected('7', '-1', 'Soustraction'))
			],
			{ validate }
		);
		expect(result.errorKinds).toEqual([
			{ label: 'Soustraction', count: 3 },
			{ label: 'Erreur de signe', count: 1 }
		]);
		expect(result.unrecognized).toBe(1);
		const ada = result.groups.find((g) => g.students.includes('Ada'));
		expect(ada?.errorKinds).toEqual([{ blank: 1, expected: 'Soustraction' }]);
	});

	it('sans nom court : comptée sous le message de l’élève', () => {
		const result = computeQuestionErrors(
			[row('Ada', 'incorrect', ['-1'], withExpected('7', '-1'))],
			{ validate }
		);
		expect(result.errorKinds).toEqual([
			{ label: "Tu as soustrait au lieu d'additionner.", count: 1 }
		]);
	});

	it('à égalité : l’erreur prévue avant le type deviné', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'incorrect', ['-7'], withExpected('7', '-1', 'Soustraction')),
				row('Bob', 'incorrect', ['-1'], withExpected('7', '-1', 'Soustraction'))
			],
			{ validate }
		);
		expect(result.errorKinds.map((c) => c.label)).toEqual(['Soustraction', 'Erreur de signe']);
	});

	it('erreur prévue nommée comme un type deviné : un seul compte', () => {
		const result = computeQuestionErrors(
			[
				row('Ada', 'incorrect', ['-1'], withExpected('7', '-1', 'Erreur de signe')),
				row('Bob', 'incorrect', ['-7'], withExpected('7', '-1', 'Erreur de signe'))
			],
			{ validate }
		);
		expect(result.errorKinds).toEqual([{ label: 'Erreur de signe', count: 2 }]);
	});

	it('aucune erreur : aucun compte', () => {
		const result = computeQuestionErrors([row('Ada', 'correct', ['ok'], drawn('12'))], {
			validate
		});
		expect(result).toMatchObject({ errorKinds: [], unrecognized: 0 });
	});
});

// Lecture

const STUDENTS = [
	{ id: 'u-ada', firstname: 'Ada', lastname: 'Lovelace' },
	{ id: 'u-bob', firstname: 'Bob', lastname: null }
];
const EVALUATION_INPUT = {
	id: EVALUATION,
	series: { items: [{ templateId: TEMPLATE, quantity: 1, delay: 20 }] }
};

function fakeFrom(tables: Record<string, Result>) {
	return createFakeSupabase((table) => tables[table] ?? { data: [] });
}

function readable(): Record<string, Result> {
	return {
		test_sessions: {
			data: [
				{ id: 's-ada', user_id: 'u-ada', grade: 5, completed_at: '2026-11-10T10:00:00Z' },
				{ id: 's-bob', user_id: 'u-bob', grade: 12, completed_at: '2026-11-10T10:00:00Z' }
			]
		},
		test_answers: {
			data: [
				{
					test_session_id: 's-ada',
					question_instance: instance('Calcule 3 + 4'),
					user_answer: { value: ['8'] },
					status: 'incorrect'
				},
				{
					test_session_id: 's-bob',
					question_instance: instance('Calcule 3 + 4'),
					user_answer: { value: ['7'] },
					status: 'correct'
				}
			]
		}
	};
}

describe('getEvaluationQuestionErrors', () => {
	it('nominal : les copies comptées, les noms des élèves', async () => {
		const fake = fakeFrom(readable());
		const result = await getEvaluationQuestionErrors(
			fake.client,
			EVALUATION_INPUT,
			STUDENTS,
			TEMPLATE
		);
		expect(result).toMatchObject({ status: 'ok', answers: 2 });
		if (result.status !== 'ok') return;
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0].students).toEqual(['Ada Lovelace']);
	});

	it('seule la copie comptée de chaque élève porte ses réponses (copie en retard et copies étrangères ignorées)', async () => {
		const tables = readable();
		tables.test_sessions = {
			data: [
				{ id: 's-ada', user_id: 'u-ada', grade: 5, completed_at: '2026-11-10T10:00:00Z' },
				// Seconde copie d'Ada, meilleure note mais sans réponse : la copie comptée est la 1re
				{ id: 's-ada-2', user_id: 'u-ada', grade: 0, completed_at: '2026-11-11T10:00:00Z' }
			]
		};
		const fake = fakeFrom(tables);
		const result = await getEvaluationQuestionErrors(
			fake.client,
			EVALUATION_INPUT,
			STUDENTS,
			TEMPLATE
		);
		// Une seule réponse comptée : celle de s-ada (celle de s-bob n'appartient à aucune copie lue)
		expect(result).toMatchObject({ status: 'ok', answers: 1 });
	});

	it('copie comptée choisie comme dans le bilan : réponses de TOUS les modèles, pas seulement de celui-ci', async () => {
		// Deux copies d'Ada à note égale : la plus ancienne a répondu à CE modèle,
		// la plus récente seulement à un autre. Le bilan retient la plus récente
		// (avec réponses, puis la plus récente) : ses réponses à ce modèle = aucune.
		const sessions = {
			data: [
				{ id: 's-old', user_id: 'u-ada', grade: 10, completed_at: '2026-11-10T10:00:00Z' },
				{ id: 's-new', user_id: 'u-ada', grade: 10, completed_at: '2026-11-11T10:00:00Z' }
			]
		};
		const thisTemplate = [
			{
				id: 'a-1',
				test_session_id: 's-old',
				question_instance: instance('Calcule 3 + 4'),
				user_answer: { value: ['8'] },
				status: 'incorrect'
			}
		];
		const otherTemplate = [{ id: 'a-2', test_session_id: 's-new' }];
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'test_sessions') return sessions;
			if (table !== 'test_answers') return { data: [] };
			const filtered = calls.some((c) => c.method === 'eq' && c.args[0] === 'template_id');
			return { data: filtered ? thisTemplate : [...thisTemplate, ...otherTemplate] };
		});
		const result = await getEvaluationQuestionErrors(
			fake.client,
			EVALUATION_INPUT,
			STUDENTS,
			TEMPLATE
		);
		expect(result).toMatchObject({ status: 'ok', answers: 0, groups: [] });
	});

	it.each(['test_sessions', 'test_answers'])(
		'lecture de %s en échec : erreur propre, aucune exception',
		async (table) => {
			const fake = fakeFrom({ ...readable(), [table]: { error: { message: 'panne' } } });
			const result = await getEvaluationQuestionErrors(
				fake.client,
				EVALUATION_INPUT,
				STUDENTS,
				TEMPLATE
			);
			expect(result).toEqual({ status: 'error', message: QUESTION_ERRORS_MESSAGE });
		}
	);

	it('une exception (réseau) devient une erreur propre', async () => {
		const fake = createFakeSupabase((table) => {
			if (table === 'test_answers') throw new Error('réseau');
			return readable()[table] ?? { data: [] };
		});
		const result = await getEvaluationQuestionErrors(
			fake.client,
			EVALUATION_INPUT,
			STUDENTS,
			TEMPLATE
		);
		expect(result).toEqual({ status: 'error', message: QUESTION_ERRORS_MESSAGE });
	});

	it('les copies lues sont celles des élèves fournis, pour le modèle demandé', async () => {
		const fake = fakeFrom(readable());
		await getEvaluationQuestionErrors(fake.client, EVALUATION_INPUT, STUDENTS, TEMPLATE);
		const [sessions] = fake.on('test_sessions');
		expect(sessions.calls).toContainEqual({ method: 'in', args: ['user_id', ['u-ada', 'u-bob']] });
		const answerQueries = fake.on('test_answers');
		expect(
			answerQueries.some((q) =>
				q.calls.some(
					(c) => c.method === 'eq' && c.args[0] === 'template_id' && c.args[1] === TEMPLATE
				)
			)
		).toBe(true);
	});
});

describe('computeQuestionErrors — réponse en QCM (idée 4, PR 3)', () => {
	const enQcm = {
		templateId: TEMPLATE,
		statement: 'Calcule $8+4=\\ldots$',
		blanks: [
			{
				type: 'choice',
				expectedAnswer: '0',
				choice: { choices: ['$12$', '$4$'], order: [1, 0], multiple: false },
				expectedErrors: [{ answer: '4', answerLatex: '4', message: 'Tu as soustrait.' }],
				fromExpectedErrors: true
			}
		],
		generatedAt: '2026-11-10T10:00:00Z'
	} as unknown as QuestionInstance;

	it('chaque groupe dit s’il a été répondu en QCM', () => {
		const result = computeQuestionErrors(
			[row('Ada', 'incorrect', ['1'], enQcm), row('Bob', 'incorrect', ['9'])],
			{ validate }
		);
		if (result.status !== 'ok') throw new Error('erreur');
		const byStudent = new Map(result.groups.map((g) => [g.students[0], g.asChoice]));
		expect(byStudent.get('Ada')).toBe(true);
		expect(byStudent.get('Bob')).toBe(false);
	});
});
