import { describe, expect, it } from 'vitest';
import {
	controlDraws,
	durationSignalsOf,
	mockTestDraws,
	observedDurationsOf,
	type DurationDraw,
	type MockTestTraceRow
} from '../duration-signals';
import { observedSuggestion, tooShortAt } from '#lib/types/duration-signals.ts';

// Constantes
const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';

// Functions
function draws(n: number, missed: number, delaySeconds = 20, templateId = T1): DurationDraw[] {
	return Array.from({ length: n }, (_, i) => ({
		studentId: `eleve-${i}`,
		templateId,
		delaySeconds,
		missed: i < missed,
		responseSeconds: null,
		timedOut: i < missed
	}));
}

/** Tirages d'un élève chacun : un nombre = validé en tant de secondes, null = temps écoulé */
function timed(
	times: ReadonlyArray<number | null>,
	templateId = T1,
	delaySeconds = 20
): DurationDraw[] {
	return times.map((t, i) => ({
		studentId: `eleve-${i}`,
		templateId,
		delaySeconds,
		missed: false,
		responseSeconds: t,
		timedOut: t === null
	}));
}

function trace(overrides: Partial<MockTestTraceRow>): MockTestTraceRow {
	return {
		student_id: 'eleve-0',
		template_id: T1,
		allotted_ms: 20_000,
		response_ms: 20_000,
		end_reason: 'timeout',
		part_verdicts: null,
		...overrides
	};
}

describe('durationSignalsOf', () => {
	it('signale une durée quand plus de la moitié de 5 élèves au moins n’ont rien répondu', () => {
		const signals = durationSignalsOf(draws(10, 7));
		expect(signals[T1]).toEqual([
			{ delaySeconds: 20, students: 10, unansweredInTime: 7, tooShort: true }
		]);
	});

	it('ne signale rien sous 5 élèves', () => {
		expect(durationSignalsOf(draws(4, 4))[T1][0].tooShort).toBe(false);
	});

	it('la moitié exacte ne suffit pas', () => {
		expect(durationSignalsOf(draws(6, 3))[T1][0].tooShort).toBe(false);
		expect(durationSignalsOf(draws(6, 4))[T1][0].tooShort).toBe(true);
	});

	it('une durée ne compte pas pour une autre (modèle × durée)', () => {
		const signals = durationSignalsOf([...draws(6, 6, 10), ...draws(6, 0, 40)]);
		expect(signals[T1].map((t) => [t.delaySeconds, t.tooShort])).toEqual([
			[10, true],
			[40, false]
		]);
	});

	it('sépare les modèles', () => {
		const signals = durationSignalsOf([...draws(5, 5, 20, T1), ...draws(5, 0, 20, T2)]);
		expect(signals[T1][0].tooShort).toBe(true);
		expect(signals[T2][0].tooShort).toBe(false);
	});

	it('un élève compte une fois ; manqué seulement si tous ses tirages le sont', () => {
		const signals = durationSignalsOf([
			{
				studentId: 'a',
				templateId: T1,
				delaySeconds: 20,
				missed: true,
				responseSeconds: null,
				timedOut: true
			},
			{
				studentId: 'a',
				templateId: T1,
				delaySeconds: 20,
				missed: false,
				responseSeconds: 5,
				timedOut: false
			},
			{
				studentId: 'b',
				templateId: T1,
				delaySeconds: 20,
				missed: true,
				responseSeconds: null,
				timedOut: true
			},
			{
				studentId: 'b',
				templateId: T1,
				delaySeconds: 20,
				missed: true,
				responseSeconds: null,
				timedOut: true
			}
		]);
		expect(signals[T1][0]).toMatchObject({ students: 2, unansweredInTime: 1 });
	});
});

describe('mockTestDraws', () => {
	it('temps écoulé sans case remplie : manqué, à la durée de la trace', () => {
		expect(mockTestDraws([trace({})])).toEqual([
			{
				studentId: 'eleve-0',
				templateId: T1,
				delaySeconds: 20,
				missed: true,
				responseSeconds: null,
				timedOut: true
			}
		]);
	});

	it('temps écoulé avec une réponse commencée (choix coché compris) : pas manqué', () => {
		expect(mockTestDraws([trace({ part_verdicts: [false] })])[0].missed).toBe(false);
	});

	it('validée à vide avant la fin : un tirage, pas manqué', () => {
		expect(mockTestDraws([trace({ end_reason: 'validated' })])[0].missed).toBe(false);
	});

	it('écarte une fin inconnue (« Terminer ») ou une durée absente', () => {
		expect(mockTestDraws([trace({ end_reason: null }), trace({ allotted_ms: null })])).toEqual([]);
	});
});

describe('controlDraws', () => {
	const delays = new Map<string, number | null>([
		[T1, 20],
		[T2, null]
	]);

	it('sans réponse jusqu’au bout du chrono : manqué', () => {
		const [draw] = controlDraws([
			{ studentId: 'a', answer: { template_id: T1, status: null, time_spent: 20 }, delays }
		]);
		expect(draw).toEqual({
			studentId: 'a',
			templateId: T1,
			delaySeconds: 20,
			missed: true,
			responseSeconds: null,
			timedOut: true
		});
	});

	it('vide validé tôt : pas manqué', () => {
		const [draw] = controlDraws([
			{ studentId: 'a', answer: { template_id: T1, status: null, time_spent: 3 }, delays }
		]);
		expect(draw.missed).toBe(false);
	});

	it('modèle sur deux lignes à durées différentes (D1) : écarté', () => {
		expect(
			controlDraws([
				{ studentId: 'a', answer: { template_id: T2, status: null, time_spent: 20 }, delays }
			])
		).toEqual([]);
	});
});

describe('tooShortAt', () => {
	it('rend l’entrée de la durée demandée si elle est trop courte', () => {
		const signals = durationSignalsOf([...draws(5, 5, 10), ...draws(5, 0, 20)]);
		expect(tooShortAt(signals, T1, 10)?.unansweredInTime).toBe(5);
		expect(tooShortAt(signals, T1, 20)).toBeNull();
		expect(tooShortAt(signals, T1, 30)).toBeNull();
		expect(tooShortAt(null, T1, 10)).toBeNull();
	});
});

describe('mockTestDraws — durée de réponse', () => {
	it('validée avec une réponse : la durée de réponse en secondes', () => {
		const [draw] = mockTestDraws([
			trace({ end_reason: 'validated', response_ms: 12_400, part_verdicts: [false] })
		]);
		expect(draw).toMatchObject({ responseSeconds: 12.4, timedOut: false });
	});

	it('temps écoulé, réponse commencée ou non : au-delà de la durée', () => {
		const draws = mockTestDraws([trace({}), trace({ part_verdicts: [true] })]);
		expect(draws.map((d) => [d.responseSeconds, d.timedOut])).toEqual([
			[null, true],
			[null, true]
		]);
	});

	it('validée sans durée déclarée : durée inconnue, pas au-delà', () => {
		const [draw] = mockTestDraws([
			trace({ end_reason: 'validated', response_ms: null, part_verdicts: [true] })
		]);
		expect(draw).toMatchObject({ responseSeconds: null, timedOut: false });
	});

	it('passée à vide avant la fin : durée inconnue (passer ≠ avoir eu le temps)', () => {
		const [draw] = mockTestDraws([trace({ end_reason: 'validated', response_ms: 2_000 })]);
		expect(draw).toMatchObject({ responseSeconds: null, timedOut: false });
	});
});

describe('controlDraws — durée de réponse', () => {
	const delays = new Map<string, number | null>([[T1, 20]]);

	it('répondue avant la fin (juste ou fausse) : la durée de réponse', () => {
		const [draw] = controlDraws([
			{ studentId: 'a', answer: { template_id: T1, status: 'incorrect', time_spent: 8 }, delays }
		]);
		expect(draw).toMatchObject({ responseSeconds: 8, timedOut: false });
	});

	it('passée à vide avant la fin : durée inconnue', () => {
		const [draw] = controlDraws([
			{ studentId: 'a', answer: { template_id: T1, status: null, time_spent: 2 }, delays }
		]);
		expect(draw).toMatchObject({ responseSeconds: null, timedOut: false });
	});

	it('arrivée au bout du chrono, même avec une réponse : au-delà de la durée', () => {
		const [draw] = controlDraws([
			{ studentId: 'a', answer: { template_id: T1, status: 'correct', time_spent: 19 }, delays }
		]);
		expect(draw).toMatchObject({ responseSeconds: null, timedOut: true });
	});

	it('durée non déclarée : inconnue, pas au-delà', () => {
		const [draw] = controlDraws([
			{ studentId: 'a', answer: { template_id: T1, status: 'correct', time_spent: null }, delays }
		]);
		expect(draw).toMatchObject({ responseSeconds: null, timedOut: false });
	});
});

describe('observedDurationsOf (A1, Q3-Q4)', () => {
	it('durée où 80 % des tirages sont validés, arrondie aux 5 s supérieures', () => {
		// 10 tirages : le 8e plus court est 31 s → 35 s
		const observed = observedDurationsOf(timed([4, 6, 9, 12, 15, 20, 25, 31, 40, 55]));
		expect(observed[T1]).toEqual({ seconds: 35, students: 10 });
	});

	it('un multiple de 5 reste tel quel ; jamais sous 5 s', () => {
		expect(observedDurationsOf(timed([10, 10, 10, 10, 10]))[T1].seconds).toBe(10);
		expect(observedDurationsOf(timed([0, 1, 1, 2, 2]))[T1].seconds).toBe(5);
	});

	it('plafonnée à 300 s', () => {
		expect(observedDurationsOf(timed([400, 400, 400, 400, 400]))[T1].seconds).toBe(300);
	});

	it('temps écoulé = au-delà : jusqu’à 20 % des tirages, le chiffre se calcule', () => {
		const observed = observedDurationsOf(timed([5, 6, 7, 8, 9, 10, 11, 12, null, null]));
		expect(observed[T1].seconds).toBe(15);
	});

	it('plus de 20 % de temps écoulés : aucun chiffre', () => {
		expect(
			observedDurationsOf(timed([5, 6, 7, 8, 9, 10, 11, null, null, null]))[T1]
		).toBeUndefined();
	});

	it('moins de 5 élèves : rien, même avec beaucoup de tirages', () => {
		const fourStudents = [0, 1, 2, 3].flatMap((i) =>
			timed([10, 10, 10]).map((d) => ({ ...d, studentId: `eleve-${i}` }))
		);
		expect(observedDurationsOf(fourStudents)[T1]).toBeUndefined();
	});

	it('chaque tirage compte, durées allouées confondues', () => {
		const observed = observedDurationsOf([
			...timed([30, 30, 30], T1, 20),
			...timed([30, 30], T1, 40).map((d) => ({ ...d, studentId: `autre-${d.studentId}` }))
		]);
		expect(observed[T1]).toEqual({ seconds: 30, students: 5 });
	});

	it('une durée inconnue ne compte pas', () => {
		expect(
			observedDurationsOf(
				timed([10, 10, 10, 10, null]).map((d) => (d.timedOut ? { ...d, timedOut: false } : d))
			)[T1]
		).toBeUndefined();
	});

	it('sépare les modèles', () => {
		const observed = observedDurationsOf([
			...timed([10, 10, 10, 10, 10], T1),
			...timed([40, 40, 40, 40, 40], T2)
		]);
		expect([observed[T1].seconds, observed[T2].seconds]).toEqual([10, 40]);
	});
});

describe('observedSuggestion (Q5)', () => {
	const observed = { [T1]: { seconds: 35, students: 10 }, [T2]: { seconds: 25, students: 6 } };

	it('suggère quand l’écart atteint 5 s et 25 %', () => {
		expect(observedSuggestion(observed, T1, 20)).toBe(35);
	});

	it('dans les deux sens : trop long aussi', () => {
		expect(observedSuggestion({ [T1]: { seconds: 15, students: 5 } }, T1, 60)).toBe(15);
	});

	it('écart sous 25 % : rien', () => {
		// 25 s pour 30 s : 5 s, mais 17 %
		expect(observedSuggestion({ [T1]: { seconds: 25, students: 5 } }, T1, 30)).toBeNull();
	});

	it('écart de 25 % mais sous 5 s : rien', () => {
		expect(observedSuggestion({ [T1]: { seconds: 5, students: 5 } }, T1, 8)).toBeNull();
	});

	it('durée 0 de la ligne = 20 s (comme au tirage)', () => {
		expect(observedSuggestion(observed, T2, 0)).toBe(25);
		expect(observedSuggestion({ [T2]: { seconds: 20, students: 5 } }, T2, 0)).toBeNull();
	});

	it('aucune durée observée, ou lecture en échec : rien', () => {
		expect(observedSuggestion(observed, 'autre', 20)).toBeNull();
		expect(observedSuggestion(null, T1, 20)).toBeNull();
	});
});
