/**
 * Composition d'une série : bornes partagées par l'enregistrement (B11) et par
 * la relecture d'un lien de série `?modeles=…` (C19, Q44) ; ADR 0035 : une ligne
 * désigne un MODÈLE (`templateId`).
 */
import { describe, it, expect } from 'vitest';
import {
	SERIES_LINK_PARAM,
	buildSeriesLink,
	decodeSeriesParamJson,
	encodeSeriesParam,
	savedSeriesItemsSchema,
	seriesItemSchema,
	seriesItemsSchema
} from '../series';

const ITEM = {
	templateId: '11111111-1111-4111-8111-111111111111',
	quantity: 4,
	delay: 20
};

/** Ce que `URLSearchParams.get` rend pour un lien fabriqué par le panier */
function asReadFromUrl(items: unknown): string {
	const params = new URLSearchParams({
		[SERIES_LINK_PARAM]: encodeURIComponent(JSON.stringify(items))
	});
	return new URLSearchParams(params.toString()).get(SERIES_LINK_PARAM)!;
}

/** Relit un paramètre comme le fait un lien : JSON décodé puis validé */
function readParam(raw: string) {
	const json = decodeSeriesParamJson(raw);
	return json.ok ? seriesItemsSchema.safeParse(json.value) : json;
}

describe('seriesItemsSchema', () => {
	it('accepte 1 à 50 lignes', () => {
		expect(seriesItemsSchema.safeParse([ITEM]).success).toBe(true);
		expect(seriesItemsSchema.safeParse(Array(50).fill(ITEM)).success).toBe(true);
	});

	it('accepte 99 questions pour un modèle (plafond du panier)', () => {
		expect(seriesItemsSchema.safeParse([{ ...ITEM, quantity: 99 }]).success).toBe(true);
	});

	it('refuse une série vide ou de plus de 50 lignes', () => {
		expect(seriesItemsSchema.safeParse([]).success).toBe(false);
		expect(seriesItemsSchema.safeParse(Array(51).fill(ITEM)).success).toBe(false);
	});

	it('refuse une quantité ou une durée hors bornes', () => {
		for (const bad of [
			{ ...ITEM, quantity: 0 },
			{ ...ITEM, quantity: 100 },
			{ ...ITEM, quantity: 2.5 },
			{ ...ITEM, delay: -1 },
			{ ...ITEM, delay: 3601 }
		]) {
			expect(seriesItemsSchema.safeParse([bad]).success).toBe(false);
		}
	});

	it('refuse un identifiant de modèle qui n’est pas un uuid, ou absent', () => {
		expect(seriesItemSchema.safeParse({ ...ITEM, templateId: 'pas-un-uuid' }).success).toBe(false);
		expect(seriesItemSchema.safeParse({ quantity: 1, delay: 20 }).success).toBe(false);
	});

	it('refuse une ancienne ligne par catégorie (plus relue)', () => {
		const legacy = {
			category: { level: 3 },
			quantity: 4,
			delay: 20
		};
		expect(seriesItemsSchema.safeParse([legacy]).success).toBe(false);
	});
});

describe('savedSeriesItemsSchema', () => {
	it('refuse plus de 500 questions en tout, accepte 500 pile', () => {
		const ligne = (quantity: number) => ({ ...ITEM, quantity });
		expect(
			savedSeriesItemsSchema.safeParse(Array(5).fill(ligne(99)).concat(ligne(5))).success
		).toBe(true);
		expect(
			savedSeriesItemsSchema.safeParse(Array(5).fill(ligne(99)).concat(ligne(6))).success
		).toBe(false);
	});
});

describe('relecture d’un paramètre de lien (C19)', () => {
	it('relit un lien fabriqué par le panier', () => {
		const result = readParam(asReadFromUrl([ITEM]));
		expect(result).toMatchObject({ success: true, data: [ITEM] });
	});

	it('relit aussi un JSON encodé une seule fois', () => {
		expect(readParam(JSON.stringify([ITEM]))).toMatchObject({ success: true });
	});

	it('lien abîmé (JSON tronqué, % isolé) : refusé sans exception', () => {
		for (const raw of ['[{"templateId":', '%E0%A4%A', '%']) {
			expect(decodeSeriesParamJson(raw)).toEqual({ ok: false });
		}
	});

	it('trop de lignes : refusé avec la borne', () => {
		const result = readParam(asReadFromUrl(Array(51).fill(ITEM)));
		expect(result).toMatchObject({ success: false });
		expect(JSON.stringify(result)).toContain('50 au plus');
	});

	it('valeurs hors bornes : refusé', () => {
		expect(readParam(asReadFromUrl([{ ...ITEM, quantity: 1000 }]))).toMatchObject({
			success: false
		});
	});

	it('un objet au lieu d’une liste : refusé', () => {
		expect(readParam(asReadFromUrl(ITEM))).toMatchObject({ success: false });
	});
});

describe('buildSeriesLink (Q44)', () => {
	it('sans forme : lien vers le PANIER, paramètre « modeles », que le lien relit', () => {
		const url = new URL(buildSeriesLink('https://chiph.re', [ITEM]));

		expect(url.pathname).toBe('/automaths/panier');
		expect(url.searchParams.has('mode')).toBe(false);
		expect(url.searchParams.has('time')).toBe(false);
		expect(url.searchParams.has('categories')).toBe(false);
		expect(readParam(url.searchParams.get(SERIES_LINK_PARAM)!)).toMatchObject({
			success: true,
			data: [ITEM]
		});
	});

	it.each(['display', 'interactive', 'flash'] as const)(
		'forme %s : lien vers la page de test, sans temps',
		(mode) => {
			const url = new URL(buildSeriesLink('https://chiph.re', [ITEM], { mode, timeLimit: 300 }));

			expect(url.pathname).toBe('/automaths/test');
			expect(url.searchParams.get('mode')).toBe(mode);
			expect(url.searchParams.has('time')).toBe(false);
			expect(readParam(url.searchParams.get(SERIES_LINK_PARAM)!)).toMatchObject({
				success: true,
				data: [ITEM]
			});
		}
	);

	it('Course aux nombres : le lien porte le temps limite (secondes)', () => {
		const url = new URL(
			buildSeriesLink('https://chiph.re', [ITEM], { mode: 'course', timeLimit: 420 })
		);

		expect(url.pathname).toBe('/automaths/test');
		expect(url.searchParams.get('mode')).toBe('course');
		expect(url.searchParams.get('time')).toBe('420');
	});

	it('encodeSeriesParam est l’inverse du décodage', () => {
		expect(decodeSeriesParamJson(encodeSeriesParam([ITEM]))).toEqual({ ok: true, value: [ITEM] });
	});
});
