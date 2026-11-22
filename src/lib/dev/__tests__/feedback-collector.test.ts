/**
 * Erreurs de console gardées pour le bouton « signaler » (serveur de dev)
 */

import { describe, expect, it } from 'vitest';
import { MAX_ERRORS, MAX_ERROR_MESSAGE } from '../feedback.ts';
import { createErrorBuffer, describeValue } from '../feedback-collector.ts';

describe('bouton signaler — erreurs gardées', () => {
	it('garde les erreurs dans l’ordre, avec leur type et leur heure', () => {
		const buffer = createErrorBuffer(() => new Date('2026-11-22T10:00:00.000Z'));
		buffer.push('console', ['Échec', new Error('boum')]);
		buffer.push('error', ['ReferenceError: x']);
		const { errors, dropped } = buffer.snapshot();
		expect(dropped).toBe(0);
		expect(errors).toHaveLength(2);
		expect(errors[0]).toMatchObject({ type: 'console', at: '2026-11-22T10:00:00.000Z' });
		expect(errors[0]?.message).toContain('Échec');
		expect(errors[0]?.message).toContain('boum');
		expect(errors[1]?.type).toBe('error');
	});

	it(`ne garde que les ${MAX_ERRORS} dernières et compte les autres`, () => {
		const buffer = createErrorBuffer();
		for (let i = 0; i < MAX_ERRORS + 7; i++) buffer.push('console', [`erreur ${i}`]);
		const { errors, dropped } = buffer.snapshot();
		expect(errors).toHaveLength(MAX_ERRORS);
		expect(dropped).toBe(7);
		expect(errors[0]?.message).toBe('erreur 7');
		expect(errors.at(-1)?.message).toBe(`erreur ${MAX_ERRORS + 6}`);
	});

	it('coupe un message trop long', () => {
		const buffer = createErrorBuffer();
		buffer.push('console', ['a'.repeat(MAX_ERROR_MESSAGE * 2)]);
		expect(buffer.snapshot().errors[0]?.message).toHaveLength(MAX_ERROR_MESSAGE);
	});

	it('rend une copie : la liste envoyée ne bouge plus', () => {
		const buffer = createErrorBuffer();
		buffer.push('console', ['un']);
		const first = buffer.snapshot();
		buffer.push('console', ['deux']);
		expect(first.errors).toHaveLength(1);
	});

	it('décrit une valeur quelconque sans jamais lever', () => {
		expect(describeValue('texte')).toBe('texte');
		expect(describeValue(new TypeError('pas bon'))).toContain('TypeError: pas bon');
		expect(describeValue({ a: 1 })).toBe('{"a":1}');
		const loop: Record<string, unknown> = {};
		loop.self = loop;
		expect(typeof describeValue(loop)).toBe('string');
		expect(describeValue(undefined)).toBe('undefined');
	});
});
