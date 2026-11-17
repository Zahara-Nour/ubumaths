/**
 * Trace d'une question de contrôle (chantier `formes-de-serie`, PR 4 bis)
 */

import { describe, it, expect } from 'vitest';
import { evaluationTraceOf } from '$lib/server/evaluation-trace';

describe('evaluationTraceOf — Contrôle blanc (chrono par question)', () => {
	const base = { form: 'interactive' as const, delaySeconds: 20, timeLimitSeconds: null };

	it('validée : durée envoyée, durée allouée = délai de la question, fin validated', () => {
		expect(evaluationTraceOf({ ...base, sent: { timeSpent: 7, endReason: 'validated' } })).toEqual({
			place: 'evaluation',
			response_ms: 7000,
			allotted_ms: 20_000,
			end_reason: 'validated'
		});
	});

	it('durée envoyée au-delà du délai : plafonnée à la durée allouée', () => {
		expect(
			evaluationTraceOf({ ...base, sent: { timeSpent: 3600, endReason: 'validated' } })
		).toMatchObject({ response_ms: 20_000, allotted_ms: 20_000 });
	});

	it('temps écoulé : durée de réponse = durée allouée, même sans durée envoyée', () => {
		expect(evaluationTraceOf({ ...base, sent: { endReason: 'timeout' } })).toEqual({
			place: 'evaluation',
			response_ms: 20_000,
			allotted_ms: 20_000,
			end_reason: 'timeout'
		});
	});

	it('validée sans durée envoyée : ni durée ni fin', () => {
		expect(evaluationTraceOf({ ...base, sent: { endReason: 'validated' } })).toEqual({
			place: 'evaluation'
		});
	});

	it('ancien onglet (ni fin ni durée) ou question absente de la copie : lieu seul', () => {
		expect(evaluationTraceOf({ ...base, sent: { timeSpent: 7 } })).toEqual({ place: 'evaluation' });
		expect(evaluationTraceOf({ ...base, sent: null })).toEqual({ place: 'evaluation' });
	});
});

describe('evaluationTraceOf — Course (un chrono pour tout le contrôle)', () => {
	const base = { form: 'course' as const, delaySeconds: 20, timeLimitSeconds: 300 };

	it('validée : durée allouée = durée de la course', () => {
		expect(evaluationTraceOf({ ...base, sent: { timeSpent: 42, endReason: 'validated' } })).toEqual(
			{ place: 'evaluation', response_ms: 42_000, allotted_ms: 300_000, end_reason: 'validated' }
		);
	});

	it('non validée au chrono : timeout, durée = durée de la course', () => {
		expect(evaluationTraceOf({ ...base, sent: { timeSpent: 12, endReason: 'timeout' } })).toEqual({
			place: 'evaluation',
			response_ms: 300_000,
			allotted_ms: 300_000,
			end_reason: 'timeout'
		});
	});

	it('laissée par « Terminer » (aucune fin) : sans durée ni fin', () => {
		expect(evaluationTraceOf({ ...base, sent: { timeSpent: 12 } })).toEqual({
			place: 'evaluation'
		});
	});

	it('course sans durée connue : sans durée ni fin', () => {
		expect(
			evaluationTraceOf({
				...base,
				timeLimitSeconds: null,
				sent: { timeSpent: 12, endReason: 'validated' }
			})
		).toEqual({ place: 'evaluation' });
	});
});
