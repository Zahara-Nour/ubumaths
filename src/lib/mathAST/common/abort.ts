/**
 * Cooperative interruption primitives for long-running synchronous mathAST
 * operations.
 *
 * `simplify()`, `normalize()`, and `areEquivalent()` accept an optional
 * `AbortSignal` and/or `timeoutMs`. Internally, passes interrogate a synchronous
 * checker between phases — zero overhead when neither is provided.
 *
 * Why not just AbortSignal? `AbortSignal.timeout(ms)` schedules its abort via
 * the event loop, which is starved while a synchronous `simplify()` call runs.
 * For wall-clock bounds on CPU-bound code we use `performance.now()` against a
 * deadline computed at call entry. External `AbortSignal` (e.g. from a Web
 * Worker host or fetch combinator) still works because we read `signal.aborted`
 * synchronously.
 *
 * Modeled after Poincaré's `Expression::ShouldStopProcessing` /
 * `sCircuitBreaker` (`extern/Upsilon/poincare/src/expression.cpp:81-99`).
 */

/**
 * Thrown by `checkAbort()` when the work should stop.
 * Distinct class so callers can `instanceof` discriminate from real errors.
 */
export class AbortError extends Error {
	constructor(message = 'Operation aborted') {
		super(message);
		this.name = 'AbortError';
	}
}

/**
 * A synchronous predicate that returns `true` when the caller should stop.
 *
 * Implementations close over an `AbortSignal`, a deadline timestamp, or both.
 * Calling the checker is intentionally cheap (one or two field reads).
 */
export type AbortChecker = () => boolean;

/**
 * Build a synchronous abort checker from a public `(signal, timeoutMs)` pair.
 *
 * - Both undefined → returns `undefined` (callers short-circuit).
 * - Only `signal` → checker reads `signal.aborted` (~1 ns getter).
 * - Only `timeoutMs` → checker compares `performance.now()` to a deadline
 *   captured at call time (~50 ns).
 * - Both → checker tests both; whichever fires first wins.
 *
 * The checker is safe to call in tight loops and is the primary mechanism
 * because synchronous code cannot observe `AbortSignal.timeout` (which fires
 * via the event loop only after the synchronous call returns).
 */
export function makeAbortChecker(
	signal?: AbortSignal,
	timeoutMs?: number
): AbortChecker | undefined {
	if (!signal && timeoutMs === undefined) return undefined;
	if (signal && timeoutMs === undefined) return () => signal.aborted;
	if (!signal && timeoutMs !== undefined) {
		const deadline = performance.now() + timeoutMs;
		return () => performance.now() > deadline;
	}
	const deadline = performance.now() + timeoutMs!;
	return () => signal!.aborted || performance.now() > deadline;
}

/**
 * Throws `AbortError` if the checker reports that work should stop.
 * No-op when `check` is undefined. Designed for use at the top of loops.
 */
export function checkAbort(check: AbortChecker | undefined): void {
	if (check?.()) throw new AbortError();
}

// =============================================================================
// Active abort checker (scoped module-level state)
// =============================================================================
//
// Some hot paths (pattern-matching `permutations`/`combinations` generators,
// recursive `match` calls) live deep inside library code where threading an
// extra `abortChecker?` parameter through every signature is impractical.
//
// We expose a scoped getter/setter pair: callers wrap the entry point with
// `withActiveAbortChecker(checker, fn)`, and deep loops read the current
// checker via `getActiveAbortChecker()`. Restoration is guaranteed by
// `try/finally`. Safe in JS because the language is single-threaded — no race.
//
// Modeled after Poincaré's `sCircuitBreaker` global (`expression.cpp:83-99`)
// but lexically scoped instead of process-wide.

let _activeChecker: AbortChecker | undefined;

/** Reads the active abort checker installed by `withActiveAbortChecker`. */
export function getActiveAbortChecker(): AbortChecker | undefined {
	return _activeChecker;
}

/**
 * Installs `checker` as the active abort checker for the dynamic extent of
 * `fn`, restoring the previous value (typically `undefined`) on exit. Nests
 * cleanly: the previous checker is reinstated even if `fn` throws.
 */
export function withActiveAbortChecker<T>(checker: AbortChecker | undefined, fn: () => T): T {
	const prev = _activeChecker;
	_activeChecker = checker;
	try {
		return fn();
	} finally {
		_activeChecker = prev;
	}
}
