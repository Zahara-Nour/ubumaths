import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_PAGES, demoSeo } from '../demo-pages';
import { SITEMAP_PAGES } from '../sitemap-pages';
import { PARENT_VIEW, STUDENT_VIEW, TEACHER_VIEW } from '#lib/kingdom-tour/views.ts';

/**
 * Garde : relevé du 2026-11-21, sept pages du plan de site écrivaient leur `<title>` à la
 * main, donc sans adresse canonique ni balises de partage, et cinq séparateurs différents
 * précédaient le nom du site. Une page listée passe par `SeoHead`, et son titre finit par
 * « | Chiphre ».
 */
describe('titres des pages du plan de site', () => {
	const routes = join(process.cwd(), 'src', 'routes');

	/** Source de la page d'un chemin du plan */
	function pageSource(path: string): string {
		const segments = path === '/' ? [] : path.slice(1).split('/');
		const file = [
			join(routes, ...segments, '+page.svelte'),
			join(routes, '(public)', ...segments, '+page.svelte')
		].find(existsSync);
		if (!file) throw new Error(`page introuvable : ${path}`);
		return readFileSync(file, 'utf8');
	}

	it('aucune page listée n’écrit son <title> à la main', () => {
		const fautives = SITEMAP_PAGES.map((p) => p.path).filter((path) =>
			/<title>/.test(pageSource(path))
		);

		expect(fautives).toEqual([]);
	});

	it('chaque page listée passe par SeoHead, directement ou par AudienceView', () => {
		const fautives = SITEMAP_PAGES.map((p) => p.path).filter(
			(path) => !/<SeoHead|<AudienceView/.test(pageSource(path))
		);

		expect(fautives).toEqual([]);
	});

	it('un seul séparateur avant le nom du site : « | Chiphre »', () => {
		// Tiret, tiret demi-cadratin, tiret cadratin ou point médian suivi du nom du site
		const fautives = SITEMAP_PAGES.map((p) => p.path).filter((path) =>
			/ [-–—·] Chiphre["'`<]/.test(pageSource(path))
		);

		expect(fautives).toEqual([]);
	});

	it('les pages élèves, parents et professeurs finissent par « | Chiphre »', () => {
		for (const view of [STUDENT_VIEW, PARENT_VIEW, TEACHER_VIEW]) {
			expect(view.seoTitle).toMatch(/ \| Chiphre$/);
		}
	});

	it('les démonstrations finissent par « | Chiphre »', () => {
		for (const { path } of DEMO_PAGES) {
			expect(demoSeo(path).title).toMatch(/ \| Chiphre$/);
		}
	});
});
