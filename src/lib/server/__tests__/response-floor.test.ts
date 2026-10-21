import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForResponseFloor } from '../response-floor';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('waitForResponseFloor', () => {
	it('chemin rapide → attend le reste du plancher', async () => {
		let done = false;
		const promise = waitForResponseFloor(1000, 2000, () => 1300).then(() => (done = true));
		await vi.advanceTimersByTimeAsync(1699);
		expect(done).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await promise;
		expect(done).toBe(true);
	});

	it('plancher déjà dépassé → rend la main aussitôt', async () => {
		const spy = vi.spyOn(globalThis, 'setTimeout');
		await waitForResponseFloor(1000, 2000, () => 3500);
		expect(spy).not.toHaveBeenCalled();
	});
});
