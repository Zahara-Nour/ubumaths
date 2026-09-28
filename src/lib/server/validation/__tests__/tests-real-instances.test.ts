/**
 * `validateSaveTest` face à de VRAIES instances (`generateInstance` sur des
 * modèles copiés de la production).
 *
 * Défaut d'origine : le schéma exigeait `answer` et `type` (ancien format) ;
 * le générateur ne les produit plus → 400 sur toute session automaths. Les
 * tests historiques (`tests.test.ts`) fabriquaient l'ancien format à la main et
 * restaient verts.
 *
 * Le payload est construit comme le fait le client (`TestInteractive` /
 * `TestCourse` → `automaths/test/+page.svelte`), puis passé par
 * `JSON.stringify`/`JSON.parse` comme sur le réseau.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { isCourseCard, type QuestionInstance, type QuestionTemplate } from '$lib/questions/types';
import { validateSaveTest } from '../tests';
import { REAL_TEMPLATES } from './fixtures/real-templates';

// ============================================================================
// TYPES
// ============================================================================

type WireAnswerData = {
	value?: string | string[] | number | number[];
	isCorrect: boolean;
	timeSpent: number;
	attempts: number;
	submittedAt: string;
};

type WireAnswer = { value?: WireAnswerData['value']; isCorrect: boolean; attempts?: number };

/** Payload tel que reçu par la route : champs volontairement lâches pour les mutations hostiles */
type WirePayload = {
	result: {
		timeSpent: unknown;
		totalQuestions: unknown;
		correctAnswers: unknown;
		answers: {
			index: number;
			instance: Record<string, unknown>;
			userAnswer: Record<string, unknown>;
			isCorrect: unknown;
			timeSpent: unknown;
		}[];
	};
	categories: { category: { level: unknown } }[];
};

// ============================================================================
// HELPERS
// ============================================================================

/** Génère une instance réelle, ou échoue le test si le modèle est invalide */
function realInstance(template: QuestionTemplate, seed = 7): QuestionInstance {
	const result = generateInstance(template, seed);
	if (!result.success) {
		throw new Error(`generateInstance a échoué : ${JSON.stringify(result.errors)}`);
	}
	return result.instance;
}

/** Même calcul que `TestInteractive.completeTest()` */
function buildPayload(
	instances: QuestionInstance[],
	answers: (WireAnswer | undefined)[],
	levels: number[] = [1]
): WirePayload {
	const answerResults = instances.map((instance, index) => {
		const a = answers[index];
		const userAnswer: WireAnswerData | undefined = a
			? {
					value: a.value,
					isCorrect: a.isCorrect,
					timeSpent: 12,
					attempts: a.attempts ?? 1,
					submittedAt: new Date().toISOString()
				}
			: undefined;
		return {
			index,
			instance,
			userAnswer,
			isCorrect: userAnswer?.isCorrect || false,
			timeSpent: userAnswer?.timeSpent,
			attempts: userAnswer?.attempts
		};
	});
	// Comme le client depuis #494 : une carte de cours ne compte pas au score
	const correctAnswers = answerResults.filter(
		(r) => r.isCorrect && !isCourseCard(r.instance)
	).length;
	const totalQuestions = instances.length;
	const result = {
		mode: 'interactive' as const,
		score: Math.round((correctAnswers / totalQuestions) * 10 * 10) / 10,
		scorePercentage: (correctAnswers / totalQuestions) * 100,
		totalQuestions,
		correctAnswers,
		timeSpent: 95,
		averageTime: 95 / totalQuestions,
		answers: answerResults,
		completedAt: new Date().toISOString()
	};
	const categories = levels.map((level) => ({
		category: { theme: 'Entiers', domain: 'Additionner', subdomain: 'Tables', level },
		quantity: 5,
		delay: 20
	}));
	// Aller-retour réseau : `undefined` disparaît, les marques de type aussi
	return JSON.parse(JSON.stringify({ result, categories }));
}

function realSessionPayload() {
	const instances = [
		realInstance(REAL_TEMPLATES.singleBlank),
		realInstance(REAL_TEMPLATES.multipleChoice),
		realInstance(REAL_TEMPLATES.multiBlank),
		realInstance(REAL_TEMPLATES.unit)
	];
	return buildPayload(instances, [
		{ value: ['8'], isCorrect: true },
		{ value: 1, isCorrect: false },
		{ value: ['3', '4'], isCorrect: true },
		{ value: ['50\\,\\mathrm{km.h^{-1}}'], isCorrect: true }
	]);
}

// ============================================================================
// TESTS
// ============================================================================

describe('validateSaveTest — vraies instances du générateur', () => {
	it.each(Object.entries(REAL_TEMPLATES))('accepte une instance réelle (%s)', (_, template) => {
		const payload = buildPayload([realInstance(template)], [{ value: ['1'], isCorrect: true }]);
		const v = validateSaveTest(payload);
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('accepte une session mixte (trous, QCM, plusieurs cases, unité)', () => {
		const v = validateSaveTest(realSessionPayload());
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('conserve le templateId (seul champ de l’instance que la route exploite)', () => {
		const v = validateSaveTest(realSessionPayload());
		expect(v.success).toBe(true);
		if (!v.success) return;
		expect(v.data.result.answers.map((a) => a.instance.templateId)).toEqual([
			REAL_TEMPLATES.singleBlank.id,
			REAL_TEMPLATES.multipleChoice.id,
			REAL_TEMPLATES.multiBlank.id,
			REAL_TEMPLATES.unit.id
		]);
	});

	it('accepte une question laissée sans réponse (TestCourse : userAnswer absent)', () => {
		const payload = buildPayload([realInstance(REAL_TEMPLATES.singleBlank)], [undefined]);
		const v = validateSaveTest(payload);
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('accepte un temps écoulé (TestInteractive : attempts = 0, value = "")', () => {
		const payload = buildPayload(
			[realInstance(REAL_TEMPLATES.singleBlank)],
			[{ value: '', isCorrect: false, attempts: 0 }]
		);
		const v = validateSaveTest(payload);
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('accepte un QCM sans choix sélectionné (value absente)', () => {
		const payload = buildPayload(
			[realInstance(REAL_TEMPLATES.multipleChoice)],
			[{ isCorrect: false }]
		);
		const v = validateSaveTest(payload);
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('accepte un panier au niveau 8 (la production a des modèles jusqu’au niveau 20)', () => {
		const payload = buildPayload(
			[realInstance(REAL_TEMPLATES.singleBlank)],
			[{ value: ['2'], isCorrect: true }],
			[8, 20]
		);
		const v = validateSaveTest(payload);
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('ne laisse passer aucun champ inconnu de l’instance vers la base', () => {
		const payload = realSessionPayload();
		payload.result.answers[0].instance.injected = { huge: 'x'.repeat(1000) };
		const v = validateSaveTest(payload);
		expect(v.success).toBe(true);
		if (!v.success) return;
		expect(v.data.result.answers[0].instance).not.toHaveProperty('injected');
	});
});

describe('validateSaveTest — carte de cours (#617)', () => {
	function mixedCardPayload() {
		return buildPayload(
			[realInstance(REAL_TEMPLATES.singleBlank), realInstance(REAL_TEMPLATES.courseCard)],
			// L'élève rate la question, puis « Je savais » sur la carte
			[{ value: ['3'], isCorrect: false }, { isCorrect: true }]
		);
	}

	it('accepte une session mixte carte + question', () => {
		const v = validateSaveTest(mixedCardPayload());
		expect(v.success ? 'ok' : v.error.issues).toBe('ok');
	});

	it('la carte ne compte pas au score : un compteur qui l’inclut est refusé', () => {
		const payload = mixedCardPayload();
		expect(payload.result.correctAnswers).toBe(0);
		payload.result.correctAnswers = 1;
		expect(validateSaveTest(payload).success).toBe(false);
	});

	it('garde le marqueur courseCard et rien d’autre dans options', () => {
		const payload = mixedCardPayload();
		payload.result.answers[1].instance.options = { courseCard: true, secret: 'x' };
		const v = validateSaveTest(payload);
		expect(v.success).toBe(true);
		if (!v.success) return;
		expect(v.data.result.answers[1].instance.options).toEqual({ courseCard: true });
	});
});

describe('validateSaveTest — payloads hostiles', () => {
	const mutate = (fn: (p: WirePayload) => void) => {
		const payload = realSessionPayload();
		fn(payload);
		return validateSaveTest(payload).success;
	};

	it('refuse un templateId qui n’est pas un UUID', () => {
		expect(mutate((p) => (p.result.answers[0].instance.templateId = 'abc'))).toBe(false);
	});

	it('refuse un énoncé démesuré', () => {
		expect(mutate((p) => (p.result.answers[0].instance.statement = 'x'.repeat(20_001)))).toBe(
			false
		);
	});

	it('refuse un isCorrect qui n’est pas un booléen', () => {
		expect(mutate((p) => (p.result.answers[0].isCorrect = 'true'))).toBe(false);
	});

	it('refuse une réponse élève démesurée (tableau trop long, chaîne trop longue)', () => {
		expect(mutate((p) => (p.result.answers[0].userAnswer.value = Array(51).fill('1')))).toBe(false);
		expect(mutate((p) => (p.result.answers[0].userAnswer.value = 'x'.repeat(2001)))).toBe(false);
	});

	it('refuse une réponse élève de forme arbitraire (objet imbriqué)', () => {
		expect(mutate((p) => (p.result.answers[0].userAnswer = { a: { b: { c: 1 } } }))).toBe(false);
	});

	it('refuse des temps négatifs ou absurdes', () => {
		expect(mutate((p) => (p.result.timeSpent = -1))).toBe(false);
		expect(mutate((p) => (p.result.timeSpent = 10_000_000))).toBe(false);
		expect(mutate((p) => (p.result.answers[0].timeSpent = 10_000_000))).toBe(false);
	});

	it('refuse plus de 500 réponses', () => {
		expect(
			mutate((p) => {
				const one = p.result.answers[0];
				p.result.answers = Array.from({ length: 501 }, (_, index) => ({ ...one, index }));
				p.result.totalQuestions = 501;
				p.result.correctAnswers = 501;
			})
		).toBe(false);
	});

	it('refuse trop de catégories et un niveau hors bornes', () => {
		expect(mutate((p) => (p.categories = Array.from({ length: 51 }, () => p.categories[0])))).toBe(
			false
		);
		expect(mutate((p) => (p.categories[0].category.level = 1000))).toBe(false);
	});

	it('refuse un compteur de bonnes réponses incohérent', () => {
		expect(mutate((p) => (p.result.correctAnswers = 4))).toBe(false);
	});

	it('refuse un assignmentId invalide', () => {
		expect(mutate((p) => Object.assign(p, { assignmentId: 'not-a-uuid' }))).toBe(false);
	});
});
