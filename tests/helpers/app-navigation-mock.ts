/**
 * Mock complet de `$app/navigation` pour les tests navigateur.
 *
 * SvelteKit 3 : `vi.mock('$app/navigation', async (importOriginal) => ({
 * ...(await importOriginal()), goto }))` ne se termine jamais (le module réel,
 * importé depuis la fabrique de son propre mock, attend ce mock) : le fichier
 * de test se fige, puis toute la suite client. On ne garde donc plus le module
 * réel : chaque fonction est un `vi.fn` inerte, et le test remplace celles qu'il
 * observe.
 *
 * ```ts
 * vi.mock('$app/navigation', async () =>
 *   (await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({ goto })
 * );
 * ```
 */
import { vi } from 'vitest';
import type * as Navigation from '$app/navigation';

type NavigationModule = typeof Navigation;

/** Toutes les fonctions de `$app/navigation`, inertes, sauf celles de `overrides`. */
export function appNavigationMock(overrides: Partial<NavigationModule> = {}): NavigationModule {
	const inertes = {
		afterNavigate: vi.fn(),
		beforeNavigate: vi.fn(),
		onNavigate: vi.fn(),
		disableScrollHandling: vi.fn(),
		goto: vi.fn(async () => {}),
		invalidate: vi.fn(async () => {}),
		invalidateAll: vi.fn(async () => {}),
		refreshAll: vi.fn(async () => {}),
		preloadCode: vi.fn(async () => {}),
		preloadData: vi.fn(async () => ({ type: 'loaded' as const, status: 200, data: {} })),
		pushState: vi.fn(async () => {}),
		replaceState: vi.fn(async () => {}),
		snapshot: vi.fn()
	};
	// Le module réel a des surcharges et des types génériques que des `vi.fn` ne
	// reproduisent pas ; la forme (mêmes noms d'export) est ce qui compte ici.
	return { ...inertes, ...overrides } as unknown as NavigationModule;
}
