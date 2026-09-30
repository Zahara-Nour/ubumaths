/**
 * Composition d'une série : bornes partagées par l'enregistrement (B11) et par
 * la relecture d'un lien `/automaths/test?categories=…` (C19).
 */
import { describe, it, expect } from 'vitest';
import {
	buildSeriesLink,
	encodeCategoriesParam,
	parseCategoriesParam,
	seriesCategoriesSchema
} from '../series';

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

/** Ce que `URLSearchParams.get` rend pour un lien fabriqué par le panier */
function asReadFromUrl(categories: unknown): string {
	const params = new URLSearchParams({
		categories: encodeURIComponent(JSON.stringify(categories))
	});
	return new URLSearchParams(params.toString()).get('categories')!;
}

describe('seriesCategoriesSchema', () => {
	it('accepte 1 à 50 catégories', () => {
		expect(seriesCategoriesSchema.safeParse([ITEM]).success).toBe(true);
		expect(seriesCategoriesSchema.safeParse(Array(50).fill(ITEM)).success).toBe(true);
	});

	it('accepte 99 questions pour une catégorie (plafond du panier)', () => {
		expect(seriesCategoriesSchema.safeParse([{ ...ITEM, quantity: 99 }]).success).toBe(true);
	});

	it('refuse une série vide ou de plus de 50 catégories', () => {
		expect(seriesCategoriesSchema.safeParse([]).success).toBe(false);
		expect(seriesCategoriesSchema.safeParse(Array(51).fill(ITEM)).success).toBe(false);
	});

	it('refuse une quantité ou une durée hors bornes', () => {
		for (const bad of [
			{ ...ITEM, quantity: 0 },
			{ ...ITEM, quantity: 100 },
			{ ...ITEM, quantity: 2.5 },
			{ ...ITEM, delay: -1 },
			{ ...ITEM, delay: 3601 }
		]) {
			expect(seriesCategoriesSchema.safeParse([bad]).success).toBe(false);
		}
	});
});

describe('parseCategoriesParam (C19)', () => {
	it('relit un lien fabriqué par le panier', () => {
		const result = parseCategoriesParam(asReadFromUrl([ITEM]));
		expect(result).toEqual({ success: true, data: [ITEM] });
	});

	it('relit aussi un JSON encodé une seule fois', () => {
		const result = parseCategoriesParam(JSON.stringify([ITEM]));
		expect(result.success).toBe(true);
	});

	it('lien sans questions : message clair', () => {
		expect(parseCategoriesParam(null)).toEqual({
			success: false,
			error: 'Ce lien ne contient aucune question.'
		});
		expect(parseCategoriesParam('').success).toBe(false);
	});

	it('lien abîmé (JSON tronqué, % isolé) : message clair, pas d’exception', () => {
		for (const raw of ['[{"category":', '%E0%A4%A', '%']) {
			const result = parseCategoriesParam(raw);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toMatch(/abîmé|pas valide/);
		}
	});

	it('trop de catégories : refusé avec la borne', () => {
		const result = parseCategoriesParam(asReadFromUrl(Array(51).fill(ITEM)));
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('50 au plus');
	});

	it('valeurs hors bornes : refusé', () => {
		const result = parseCategoriesParam(asReadFromUrl([{ ...ITEM, quantity: 1000 }]));
		expect(result.success).toBe(false);
	});

	it('un objet au lieu d’une liste : refusé', () => {
		expect(parseCategoriesParam(asReadFromUrl(ITEM)).success).toBe(false);
	});
});

describe('buildSeriesLink (C18)', () => {
	it('construit un lien SANS forme, que parseCategoriesParam relit', () => {
		const link = buildSeriesLink('https://chiph.re', [ITEM]);
		const url = new URL(link);

		expect(url.pathname).toBe('/automaths/test');
		expect(url.searchParams.has('mode')).toBe(false);
		expect(parseCategoriesParam(url.searchParams.get('categories'))).toEqual({
			success: true,
			data: [ITEM]
		});
	});

	it('encodeCategoriesParam est l’inverse de parseCategoriesParam', () => {
		expect(parseCategoriesParam(decodeURIComponent(encodeCategoriesParam([ITEM])))).toEqual({
			success: true,
			data: [ITEM]
		});
	});
});
