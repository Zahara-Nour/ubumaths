import { describe, expect, it } from 'vitest';
import {
	controlDraws,
	durationSignalsOf,
	mockTestDraws,
	type DurationDraw,
	type MockTestTraceRow
} from '../duration-signals';
import { tooShortAt } from '$lib/types/duration-signals';

// Constantes
const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';

// Functions
function draws(n: number, missed: number, delaySeconds = 20, templateId = T1): DurationDraw[] {
	return Array.from({ length: n }, (_, i) => ({
		studentId: `eleve-${i}`,
		templateId,
		delaySeconds,
		missed: i < missed
	}));
}

function trace(overrides: Partial<MockTestTraceRow>): MockTestTraceRow {
	return {
		student_id: 'eleve-0',
		template_id: T1,
		allotted_ms: 20_000,
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
			{ studentId: 'a', templateId: T1, delaySeconds: 20, missed: true },
			{ studentId: 'a', templateId: T1, delaySeconds: 20, missed: false },
			{ studentId: 'b', templateId: T1, delaySeconds: 20, missed: true },
			{ studentId: 'b', templateId: T1, delaySeconds: 20, missed: true }
		]);
		expect(signals[T1][0]).toMatchObject({ students: 2, unansweredInTime: 1 });
	});
});

describe('mockTestDraws', () => {
	it('temps écoulé sans case remplie : manqué, à la durée de la trace', () => {
		expect(mockTestDraws([trace({})])).toEqual([
			{ studentId: 'eleve-0', templateId: T1, delaySeconds: 20, missed: true }
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
		expect(draw).toEqual({ studentId: 'a', templateId: T1, delaySeconds: 20, missed: true });
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
