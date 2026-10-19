/**
 * Les tests des cartes se jouent sur un écran de bureau.
 *
 * La page des tests navigateur fait 414 px de large : la disposition téléphone,
 * où « Mes objets » s'ouvre replié (2026-10-19) et cache ses cartes. Ce qu'on
 * teste ici est la carte, pas le repli (voir `mes-objets-telephone.svelte.test.ts`).
 */
import { beforeEach } from 'vitest';
import { page } from 'vitest/browser';

/** À appeler au niveau du fichier : chaque test commence à 1280 × 900. */
export function onDesktopScreen() {
	beforeEach(async () => {
		await page.viewport(1280, 900);
	});
}
