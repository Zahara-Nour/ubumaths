/**
 * Test fixture: wraps a value in a `$state` proxy.
 *
 * Runes are only compiled in `.svelte` / `.svelte.ts` files, never in
 * `*.svelte.test.ts`, so tests that need a real state proxy (e.g. to reproduce
 * `structuredClone` DataCloneError) go through this helper.
 */
export function toStateProxy<T extends object>(value: T): T {
	const proxied = $state(value);
	return proxied;
}
