/**
 * Le contenu du Tour du Royaume : fidèle au Compendium, des liens qui mènent quelque part,
 * aucun mot que le lore interdit.
 *
 * Les Provinces sont recopiées du Compendium (§ II, 2026-10-11) : aucun test ne lit `docs/`.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	FINAL_CALLS,
	FORM_DEMO,
	HERO_CALLS,
	PARENT_FACTS,
	PARENT_LINKS,
	PLACES,
	PROVINCES,
	STRENGTHS,
	TOUR_PATH
} from '../tour';

// Constantes

/** Copie figée du Compendium, § II « Le Royaume » et fiches des Provinces */
const COMPENDIUM_PROVINCES = [
	['Nombrilie', 'Empoche-les-Bains', 'Mère Ubu', 'Patron, la soustraction !'],
	[
		'Bedonstan',
		'Lobatchevsk',
		'Professeur Achras',
		'La route est droite, mais la courbe est forte'
	],
	['Yoyolande', 'Sinusborg', 'Bougrelas', 'Plus ça monte, moins ça descend'],
	['Pifométrie', 'Bonneteau-sur-Vistule', 'Cheval à Phynances', 'Jamais trois sans deux'],
	['Glitchistan', 'Turingrad', 'Bosse-de-Nage', 'Aux grands maux les grands Reset !'],
	[
		'Patatovie',
		'Cracovenn',
		'Docteur Faustroll',
		'L’infini n’en finit pas d’en finir, surtout vers la fin'
	]
];

/**
 * Ce que le lore interdit sur une vitrine : « Mathres » (`lore.ts`), les mots du
 * Compendium § IX « Ce qu'il NE faut JAMAIS écrire », les jurons hors canon (écart D15),
 * le Collège, et tout rattachement du Czar à un pays réel.
 */
const FORBIDDEN = [
	/mathres/i,
	/\bbravo\b/i,
	/\bxp\b/i,
	/\blevel\b/i,
	/\bboss\b/i,
	/\bscore\b/i,
	/\bstreak\b/i,
	/leaderboard/i,
	/[🔥💯🚀]/u,
	/hornphynance|hornstrompe|palotron/i,
	/coll[eè]ge de .?pataphysique/i,
	/russie|russe|moscou/i
];

const routes = join(process.cwd(), 'src', 'routes');

// Functions

/** Chemin d'URL (sans requête ni ancre) → la page publique existe-t-elle sur le disque ? */
function publicPageExists(href: string): boolean {
	const path = href.split(/[?#]/)[0];
	const segments = path === '/' ? [] : path.slice(1).split('/');
	return existsSync(join(routes, '(public)', ...segments, '+page.svelte'));
}

/** Préfixes exclus par `static/robots.txt` */
function robotsDisallowed(): string[] {
	const robots = readFileSync(join(process.cwd(), 'static', 'robots.txt'), 'utf8');
	return [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
}

/** Toutes les chaînes d'une valeur, en profondeur */
function strings(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(strings);
	if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
	return [];
}

const visitLinks = [
	...PLACES.map((p) => p.href),
	...PROVINCES.flatMap((p) => p.tools.map((t) => t.href)),
	...PARENT_LINKS.map((l) => l.href)
];

describe('les six Provinces', () => {
	it('suivent le Compendium : nom, capitale, gouverneur, devise, dans l’ordre', () => {
		expect(PROVINCES.map((p) => [p.name, p.capital, p.governor, p.motto])).toEqual(
			COMPENDIUM_PROVINCES
		);
	});

	it('chacune a son domaine et son décor', () => {
		for (const province of PROVINCES) {
			expect(province.domain, province.name).not.toBe('');
			expect(province.scenery, province.name).not.toBe('');
		}
	});
});

describe('les liens de la visite', () => {
	it('mènent tous à une page publique qui existe', () => {
		const missing = visitLinks.filter((href) => !publicPageExists(href));
		expect(missing).toEqual([]);
	});

	it('ne mènent à aucune page que robots.txt exclut (démos, espaces authentifiés)', () => {
		const disallowed = robotsDisallowed();
		expect(disallowed.length).toBeGreaterThan(0);
		const excluded = visitLinks.filter((href) => disallowed.some((d) => href.startsWith(d)));
		expect(excluded).toEqual([]);
	});

	it('les appels à entrer mènent à des pages qui existent (connexion, inscription comprises)', () => {
		const calls = [...HERO_CALLS, ...FINAL_CALLS]
			.map((c) => c.href)
			.filter((h) => !h.startsWith('#'));
		expect(calls.filter((href) => !publicPageExists(href))).toEqual([]);
	});

	it('la visite elle-même est une page publique', () => {
		expect(publicPageExists(TOUR_PATH)).toBe(true);
	});

	it('un lieu par page, sans doublon', () => {
		const hrefs = PLACES.map((p) => p.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});
});

describe('ce qui exige un compte est dit', () => {
	it('le tuteur et les révisions espacées sont marqués « avec ton compte »', () => {
		const access = Object.fromEntries(STRENGTHS.map((s) => [s.id, s.access]));
		expect(access.tutor).toBe('account');
		expect(access['spaced-review']).toBe('account');
	});
});

describe('garde du lore', () => {
	const all = strings({
		PROVINCES,
		PLACES,
		STRENGTHS,
		FORM_DEMO,
		HERO_CALLS,
		FINAL_CALLS,
		PARENT_LINKS,
		PARENT_FACTS
	});

	it('le contenu n’est pas vide (la garde lit bien quelque chose)', () => {
		expect(all.length).toBeGreaterThan(50);
	});

	it.each(FORBIDDEN.map((re) => [re.source, re]))('aucune chaîne ne contient %s', (_src, re) => {
		expect(all.filter((s) => re.test(s))).toEqual([]);
	});
});
