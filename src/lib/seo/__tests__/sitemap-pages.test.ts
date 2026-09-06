import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITEMAP_PAGES } from '../sitemap-pages';

/**
 * Régression : le plan listait `/legal` et `/exercice`, qui ne sont que des
 * dossiers de routes — seules leurs pages filles existent. Un sitemap qui
 * pointe vers des 404 dessert le référencement au lieu de l'aider, et le
 * défaut reste invisible tant qu'on ne visite pas chaque URL à la main.
 */
describe('sitemap — pages listées', () => {
	const routes = join(process.cwd(), 'src', 'routes');

	/** Un chemin d'URL correspond-il à une page réellement rendue ? */
	function pageExists(path: string): boolean {
		const segments = path === '/' ? [] : path.slice(1).split('/');
		// Les pages publiques vivent sous le groupe `(public)`, sauf la racine.
		const candidates = [
			join(routes, ...segments, '+page.svelte'),
			join(routes, '(public)', ...segments, '+page.svelte')
		];
		return candidates.some(existsSync);
	}

	it('chaque URL du plan correspond à une page existante', () => {
		const manquantes = SITEMAP_PAGES.map((p) => p.path).filter((path) => !pageExists(path));

		expect(manquantes).toEqual([]);
	});

	it('la racine est présente et prioritaire', () => {
		const racine = SITEMAP_PAGES.find((p) => p.path === '/');

		expect(racine).toBeDefined();
		expect(racine?.priority).toBe(1.0);
	});

	it("n'expose aucune route authentifiée", () => {
		const privees = SITEMAP_PAGES.filter(
			(p) => p.path.startsWith('/dashboard') || p.path.startsWith('/auth')
		);

		expect(privees).toEqual([]);
	});

	it('les priorités restent dans les bornes du protocole', () => {
		for (const { path, priority } of SITEMAP_PAGES) {
			expect(priority, path).toBeGreaterThanOrEqual(0);
			expect(priority, path).toBeLessThanOrEqual(1);
		}
	});

	it('aucun doublon', () => {
		const chemins = SITEMAP_PAGES.map((p) => p.path);

		expect(new Set(chemins).size).toBe(chemins.length);
	});
});
