/**
 * La vitrine `/demo` ouverte aux robots (chantier demo-debug, PR 7, phase 0 suivie par David
 * le 2026-10-25) :
 *
 * - `DEMO_PAGES` colle aux dossiers de `/demo` : une vitrine ajoutée sans carte échoue ici ;
 * - l'accueil et les vitrines sont dans le sitemap, plus aucune exclusion ne les couvre ;
 * - `robots.txt` ne ferme plus `/demo`, mais garde fermées les autres démos de mise au point ;
 * - chaque vitrine n'a plus de `noindex` et passe par `SeoHead` (canonique, Open Graph), titre et
 *   description tirés de `DEMO_PAGES`.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_HUB, DEMO_PAGES, demoPage, demoSeo } from '../demo-pages';
import { SITEMAP_EXCLUSIONS, SITEMAP_PAGES, matchesExclusion } from '../sitemap-pages';

// Constantes

const DEMO_DIR = join(process.cwd(), 'src', 'routes', '(public)', 'demo');
const ROBOTS = readFileSync(join(process.cwd(), 'static', 'robots.txt'), 'utf8');

// Functions

/** Les dossiers de `/demo` qui portent une page */
function demoFolders(): string[] {
	return readdirSync(DEMO_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory() && existsSync(join(DEMO_DIR, d.name, '+page.svelte')))
		.map((d) => d.name)
		.sort();
}

function slug(path: string): string {
	return path.replace(/^\/demo\//, '');
}

describe('DEMO_PAGES', () => {
	it('une entrée par dossier de /demo, ni plus ni moins', () => {
		expect(DEMO_PAGES.map((p) => slug(p.path)).sort()).toEqual(demoFolders());
	});

	it('dans l’ordre validé par David', () => {
		expect(DEMO_PAGES.map((p) => slug(p.path))).toEqual([
			'questions',
			'corriges',
			'diaporama',
			'geometrie',
			'constructions',
			'cercle-trigo',
			'blocs',
			'editeur',
			'lexique',
			'cartes',
			'structure'
		]);
	});

	it('chaque entrée a un titre et une description d’une phrase', () => {
		for (const { path, title, description } of DEMO_PAGES) {
			expect(title.trim(), path).not.toBe('');
			expect(description.length, path).toBeGreaterThan(30);
			expect(description.length, path).toBeLessThanOrEqual(160);
		}
	});
});

describe('sitemap', () => {
	it('liste l’accueil /demo en 0,6 et les vitrines en 0,5', () => {
		const byPath = new Map(SITEMAP_PAGES.map((p) => [p.path, p]));
		expect(byPath.get(DEMO_HUB.path)?.priority).toBe(0.6);
		for (const { path } of DEMO_PAGES) {
			expect(byPath.get(path)?.priority, path).toBe(0.5);
		}
	});

	it('aucune exclusion ne couvre plus /demo', () => {
		const covering = SITEMAP_EXCLUSIONS.filter(({ pattern }) =>
			[DEMO_HUB, ...DEMO_PAGES].some(({ path }) => matchesExclusion(path, pattern))
		);
		expect(covering.map((e) => e.pattern)).toEqual([]);
	});
});

describe('robots.txt', () => {
	it('ne ferme plus /demo', () => {
		expect(ROBOTS).not.toMatch(/^Disallow:\s*\/demo/m);
	});

	it('garde fermées les démos de mise au point', () => {
		for (const path of ['/geometry-demo', '/construction-demo', '/test-', '/slides/', '/blockly']) {
			expect(ROBOTS, path).toMatch(new RegExp(`^Disallow: ${path}$`, 'm'));
		}
	});
});

describe('les vitrines', () => {
	it.each(DEMO_PAGES.map((p) => [slug(p.path)]))(
		'%s : sans noindex, titre et description tirés de DEMO_PAGES par SeoHead',
		(name) => {
			const source = readFileSync(join(DEMO_DIR, name, '+page.svelte'), 'utf8');
			expect(source).not.toMatch(/noindex/);
			expect(source).not.toMatch(/<title>/);
			expect(source).toContain(`<SeoHead {...demoSeo('/demo/${name}')} />`);
		}
	);

	it('demoSeo : le titre de la carte, suivi du nom du site', () => {
		expect(demoSeo('/demo/lexique')).toEqual({
			title: 'Le lexique — Chiphre',
			description: demoPage('/demo/lexique').description
		});
	});
});
