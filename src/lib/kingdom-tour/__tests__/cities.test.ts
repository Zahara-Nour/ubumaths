import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CITIES, CITY_MAP_SIZE, capitalOf, cityBySlug, cityPath } from '../cities';
import { PROVINCES } from '../tour';

/** Mots que le lore interdit sur une vitrine (Compendium § IX, lore.ts) */
const FORBIDDEN =
	/mathres|\bbravo\b|\bxp\b|\blevel\b|\bboss\b|\bscore\b|\bstreak\b|leaderboard|[🔥💯🚀]/iu;

describe('les villes du Royaume', () => {
	it('Sandomir et une capitale par Province, sous le nom de la fiche', () => {
		expect(CITIES).toHaveLength(7);
		expect(cityBySlug('sandomir')?.province).toBeNull();
		for (const province of PROVINCES) {
			expect(capitalOf(province.id).name).toBe(province.capital);
		}
	});

	it('une adresse par ville, sans doublon', () => {
		const slugs = CITIES.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const slug of slugs) {
			expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
			expect(cityPath(slug)).toBe(`/royaume/${slug}`);
		}
		expect(cityBySlug('varsovie')).toBeUndefined();
	});

	it('chaque fond de carte existe sous static/', () => {
		for (const city of CITIES) {
			expect(existsSync(join(process.cwd(), 'static', city.image)), city.image).toBe(true);
		}
	});

	it('les 39 lieux des cartes validées, chacun décrit en quelques phrases', () => {
		expect(CITIES.flatMap((c) => c.places)).toHaveLength(39);
		for (const city of CITIES) {
			const ids = city.places.map((p) => p.id);
			expect(new Set(ids).size, city.slug).toBe(ids.length);
			for (const place of city.places) {
				expect(place.description.length, place.id).toBeGreaterThan(30);
				expect(place.description.length, place.id).toBeLessThanOrEqual(260);
				expect(place.description, place.id).not.toMatch(FORBIDDEN);
				expect(place.targets.length, place.id).toBeGreaterThan(0);
			}
		}
	});

	it('chaque cible et chaque nom restent dans l’image', () => {
		for (const place of CITIES.flatMap((c) => c.places)) {
			for (const t of place.targets) {
				expect(t.cx - t.rx, place.id).toBeGreaterThanOrEqual(0);
				expect(t.cy - t.ry, place.id).toBeGreaterThanOrEqual(0);
				expect(t.cx + t.rx, place.id).toBeLessThanOrEqual(CITY_MAP_SIZE);
				expect(t.cy + t.ry, place.id).toBeLessThanOrEqual(CITY_MAP_SIZE);
			}
			expect(place.labelAt.x).toBeGreaterThan(0);
			expect(place.labelAt.x).toBeLessThan(CITY_MAP_SIZE);
			expect(place.labelAt.y).toBeGreaterThan(0);
			expect(place.labelAt.y).toBeLessThan(CITY_MAP_SIZE);
		}
	});

	it('textes de vitrine : intro de chaque ville sans mot interdit', () => {
		for (const city of CITIES) {
			expect(city.intro.length).toBeGreaterThan(30);
			expect(city.intro).not.toMatch(FORBIDDEN);
		}
	});
});
