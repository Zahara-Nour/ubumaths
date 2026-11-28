/**
 * Erreurs de console gardées pour le bouton « signaler » (serveur de dev)
 */

import { describe, expect, it } from 'vitest';
import { MAX_ERRORS, MAX_ERROR_MESSAGE } from '../feedback.ts';
import { createErrorBuffer, describeValue, installCollector } from '../feedback-collector.ts';

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
		const hostile = {
			get piege(): never {
				throw new Error('lecture interdite');
			}
		};
		expect(typeof describeValue(hostile)).toBe('string');
	});

	it('ne sérialise jamais un gros objet en entier', () => {
		const big = { items: Array.from({ length: 100_000 }, (_, i) => ({ i, text: 'x'.repeat(50) })) };
		const text = describeValue(big);
		expect(text.length).toBeLessThanOrEqual(MAX_ERROR_MESSAGE);
		expect(text).toContain('de plus');
		const deep = { a: { b: { c: { d: { e: 1 } } } } };
		expect(describeValue(deep)).toContain('[…]');
	});
});

describe('bouton signaler — branchement sur la console', () => {
	function fakeTarget() {
		const calls: unknown[][] = [];
		const listeners = new Map<string, (event: never) => void>();
		const target = {
			console: { error: (...values: unknown[]) => void calls.push(values) },
			addEventListener: (type: string, listener: (event: never) => void) =>
				void listeners.set(type, listener)
		};
		return { calls, listeners, target };
	}

	it('console.error garde son comportement : mêmes arguments, et l’erreur est notée', () => {
		const { calls, target } = fakeTarget();
		const buffer = createErrorBuffer();
		installCollector(target, buffer);
		const error = new Error('boum');
		target.console.error('Échec', error);
		expect(calls).toEqual([['Échec', error]]);
		expect(buffer.snapshot().errors[0]).toMatchObject({ type: 'console' });
	});

	it('un tampon qui échoue ne casse pas la console de l’appli', () => {
		const { calls, target } = fakeTarget();
		installCollector(target, {
			push: () => {
				throw new Error('tampon cassé');
			},
			snapshot: () => ({ errors: [], dropped: 0 })
		});
		expect(() => target.console.error('toujours affiché')).not.toThrow();
		expect(calls).toEqual([['toujours affiché']]);
	});

	it('note les erreurs non rattrapées et les promesses rejetées', () => {
		const { listeners, target } = fakeTarget();
		const buffer = createErrorBuffer();
		installCollector(target, buffer);
		listeners.get('error')?.({ error: new TypeError('pas bon') } as never);
		listeners.get('error')?.({ message: 'Script error.' } as never);
		listeners.get('unhandledrejection')?.({ reason: 'refus' } as never);
		const { errors } = buffer.snapshot();
		expect(errors.map((error) => error.type)).toEqual(['error', 'error', 'unhandledrejection']);
		expect(errors[0]?.message).toContain('TypeError: pas bon');
		expect(errors[1]?.message).toBe('Script error.');
		expect(errors[2]?.message).toBe('refus');
	});
});
