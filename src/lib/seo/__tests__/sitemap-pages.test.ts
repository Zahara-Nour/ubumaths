import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
	SITEMAP_DYNAMIC_ROUTES,
	SITEMAP_EXCLUSIONS,
	SITEMAP_PAGES,
	matchesExclusion
} from '../sitemap-pages';

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

/**
 * Garde : rien n'obligeait à ajouter une nouvelle page publique au plan. Relevé
 * du 2026-10-11 : 30 pages listées sur 94 pages publiques fixes. Désormais,
 * toute `+page.svelte` hors `(protected)` est listée, générée par une source
 * dynamique, ou exclue avec sa raison.
 */
describe('sitemap — toute page publique est listée ou exclue', () => {
	const routes = join(process.cwd(), 'src', 'routes');

	/**
	 * Chemins de route de toutes les pages hors `(protected)`, groupes retirés
	 * (`(public)/cahier/[token]` → `/cahier/[token]`).
	 */
	function publicRoutes(): string[] {
		const found: string[] = [];
		for (const entry of readdirSync(routes, { recursive: true, encoding: 'utf8' })) {
			const segments = entry.split(/[\\/]/);
			if (segments.at(-1) !== '+page.svelte') continue;
			if (segments.includes('(protected)')) continue;
			const urlSegments = segments.slice(0, -1).filter((s) => !/^\(.*\)$/.test(s));
			found.push('/' + urlSegments.join('/'));
		}
		return found.sort();
	}

	const listed = new Set(SITEMAP_PAGES.map((p) => p.path));
	const dynamic = new Set(SITEMAP_DYNAMIC_ROUTES.map((d) => d.route));
	const isExcluded = (route: string) =>
		SITEMAP_EXCLUSIONS.some(({ pattern }) => matchesExclusion(route, pattern));

	it('le parcours du disque trouve bien les pages publiques', () => {
		const all = publicRoutes();

		expect(all).toContain('/');
		expect(all).toContain('/chiffrement/cesar');
		expect(all).toContain('/shtam/[slug]');
		expect(all).toContain('/demo/trig-circle-demo');
		expect(all.some((r) => r.startsWith('/dashboard'))).toBe(false);
	});

	it('chaque page publique est listée, dynamique ou exclue avec sa raison', () => {
		const orphans = publicRoutes().filter(
			(route) => !listed.has(route) && !dynamic.has(route) && !isExcluded(route)
		);

		expect(
			orphans.map(
				(route) =>
					`nouvelle page publique \`${route}\` : ajoute-la à SITEMAP_PAGES ou à SITEMAP_EXCLUSIONS avec sa raison`
			)
		).toEqual([]);
	});

	it('aucune page listée n’est aussi exclue', () => {
		expect([...listed].filter(isExcluded)).toEqual([]);
	});

	it('aucun paramètre de route dans SITEMAP_PAGES', () => {
		expect([...listed].filter((path) => path.includes('['))).toEqual([]);
	});

	it('chaque route dynamique couverte existe sur le disque', () => {
		const all = new Set(publicRoutes());

		expect([...dynamic].filter((route) => !all.has(route))).toEqual([]);
	});

	it('chaque exclusion a une raison et couvre au moins une page existante', () => {
		const all = publicRoutes();
		const stale = SITEMAP_EXCLUSIONS.filter(
			({ pattern }) => !all.some((route) => matchesExclusion(route, pattern))
		);

		expect(stale.map((e) => e.pattern)).toEqual([]);
		for (const { pattern, reason } of SITEMAP_EXCLUSIONS) {
			expect(reason.trim(), pattern).not.toBe('');
		}
	});
});

describe('matchesExclusion', () => {
	it('un motif exact ne couvre que sa route', () => {
		expect(matchesExclusion('/api-docs', '/api-docs')).toBe(true);
		expect(matchesExclusion('/api-docs/x', '/api-docs')).toBe(false);
	});

	it('`/**` couvre la route et ses descendantes, pas ses voisines', () => {
		expect(matchesExclusion('/demo', '/demo/**')).toBe(true);
		expect(matchesExclusion('/demo/trig-circle-demo', '/demo/**')).toBe(true);
		expect(matchesExclusion('/demonstration', '/demo/**')).toBe(false);
	});

	it('`*` reste dans un segment', () => {
		expect(matchesExclusion('/test-font', '/test-*')).toBe(true);
		expect(matchesExclusion('/test-font/x', '/test-*')).toBe(false);
	});

	it('les crochets des paramètres sont pris à la lettre', () => {
		expect(matchesExclusion('/cahier/[token]/fiche/[id]', '/cahier/[token]/**')).toBe(true);
		expect(matchesExclusion('/cahier/t', '/cahier/[token]/**')).toBe(false);
	});
});
