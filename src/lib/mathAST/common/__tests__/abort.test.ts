import { describe, it, expect } from 'vitest';
import {
	AbortError,
	checkAbort,
	makeAbortChecker,
	getActiveAbortChecker,
	withActiveAbortChecker
} from '../abort';

const tick = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('common/abort', () => {
	describe('AbortError', () => {
		it('has name "AbortError"', () => {
			const err = new AbortError();
			expect(err.name).toBe('AbortError');
			expect(err).toBeInstanceOf(Error);
		});

		it('has a non-empty message', () => {
			const err = new AbortError();
			expect(err.message.length).toBeGreaterThan(0);
		});

		it('preserves message when provided', () => {
			const err = new AbortError('custom reason');
			expect(err.message).toBe('custom reason');
		});
	});

	describe('checkAbort', () => {
		it('does nothing when checker is undefined', () => {
			expect(() => checkAbort(undefined)).not.toThrow();
		});

		it('does nothing when checker returns false', () => {
			expect(() => checkAbort(() => false)).not.toThrow();
		});

		it('throws AbortError when checker returns true', () => {
			expect(() => checkAbort(() => true)).toThrow(AbortError);
		});
	});

	describe('makeAbortChecker', () => {
		it('returns undefined when no signal and no timeout', () => {
			expect(makeAbortChecker(undefined, undefined)).toBeUndefined();
			expect(makeAbortChecker()).toBeUndefined();
		});

		it('returns a checker that reads signal.aborted when only signal is provided', () => {
			const ctrl = new AbortController();
			const check = makeAbortChecker(ctrl.signal, undefined)!;
			expect(check).toBeDefined();
			expect(check()).toBe(false);
			ctrl.abort();
			expect(check()).toBe(true);
		});

		it('returns a checker tied to a wall-clock deadline when only timeoutMs is provided', async () => {
			const check = makeAbortChecker(undefined, 10)!;
			expect(check()).toBe(false);
			await tick(30);
			expect(check()).toBe(true);
		});

		it('checker fires synchronously without yielding when deadline already passed', async () => {
			const check = makeAbortChecker(undefined, 1)!;
			await tick(5);
			// no event-loop yield needed — the checker reads performance.now() each call
			expect(check()).toBe(true);
		});

		it('combines signal and timeoutMs — external signal aborts win', () => {
			const ctrl = new AbortController();
			const check = makeAbortChecker(ctrl.signal, 10000)!;
			expect(check()).toBe(false);
			ctrl.abort();
			expect(check()).toBe(true);
		});

		it('combines signal and timeoutMs — deadline wins', async () => {
			const ctrl = new AbortController();
			const check = makeAbortChecker(ctrl.signal, 10)!;
			expect(check()).toBe(false);
			await tick(30);
			expect(check()).toBe(true);
			expect(ctrl.signal.aborted).toBe(false);
		});

		it('returns a checker that fires immediately when signal is already aborted', () => {
			const ctrl = new AbortController();
			ctrl.abort();
			const check = makeAbortChecker(ctrl.signal, 10000)!;
			expect(check()).toBe(true);
		});

		it('captures deadline at call time (not at first checker invocation)', async () => {
			const check = makeAbortChecker(undefined, 100)!;
			await tick(150);
			// 150 ms elapsed since checker was created; budget was 100 → fired
			expect(check()).toBe(true);
		});
	});

	describe('withActiveAbortChecker / getActiveAbortChecker', () => {
		it('returns undefined by default', () => {
			expect(getActiveAbortChecker()).toBeUndefined();
		});

		it('installs the checker for the duration of fn and restores on exit', () => {
			const ctrl = new AbortController();
			const checker = () => ctrl.signal.aborted;
			let observedInside: ReturnType<typeof getActiveAbortChecker>;
			const result = withActiveAbortChecker(checker, () => {
				observedInside = getActiveAbortChecker();
				return 42;
			});
			expect(result).toBe(42);
			expect(observedInside).toBe(checker);
			expect(getActiveAbortChecker()).toBeUndefined();
		});

		it('restores the previous checker even when fn throws', () => {
			expect(() => {
				withActiveAbortChecker(
					() => false,
					() => {
						throw new Error('boom');
					}
				);
			}).toThrow('boom');
			expect(getActiveAbortChecker()).toBeUndefined();
		});

		it('nests cleanly — inner installs override, outer restored on exit', () => {
			const outer = () => false;
			const inner = () => true;
			withActiveAbortChecker(outer, () => {
				expect(getActiveAbortChecker()).toBe(outer);
				withActiveAbortChecker(inner, () => {
					expect(getActiveAbortChecker()).toBe(inner);
				});
				expect(getActiveAbortChecker()).toBe(outer);
			});
			expect(getActiveAbortChecker()).toBeUndefined();
		});

		it('accepts undefined to clear the active checker for a scoped block', () => {
			withActiveAbortChecker(
				() => false,
				() => {
					withActiveAbortChecker(undefined, () => {
						expect(getActiveAbortChecker()).toBeUndefined();
					});
				}
			);
			expect(getActiveAbortChecker()).toBeUndefined();
		});
	});
});
