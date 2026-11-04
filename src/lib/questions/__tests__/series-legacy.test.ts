/**
 * Ancienne forme d'une ligne de série (ADR 0035) : toujours lisible
 * ================================================================
 *
 * Un ancien lien `?categories=…`, un ancien panier ou une série pas encore
 * convertie désignent des catégories : chacune retrouve son modèle publié.
 */

import { describe, it, expect } from 'vitest';
import {
	deleteSeriesLink,
	hasSeriesLink,
	isLegacyLine,
	legacyTemplatesFilter,
	parseSeriesLink,
	resolveSeriesLines,
	storedSeriesLinesSchema,
	type LegacyResolvableTemplate
} from '$lib/questions/series-legacy';
import { buildSeriesLink, encodeSeriesParam } from '$lib/validation/series';

// Constantes
const ADDITION_ID = '0a11f0e0-0000-4000-8000-000000000001';
const FRACTIONS_ID = '0a11f0e0-0000-4000-8000-000000000002';

const TEMPLATES: LegacyResolvableTemplate[] = [
	{ id: ADDITION_ID, theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 },
	{ id: FRACTIONS_ID, theme: 'Nombres', domain: 'Fractions', subdomain: 'Simplifier', level: 3 }
];

const LEGACY_ADDITION = {
	category: { theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 },
	quantity: 3,
	delay: 20
};

// Functions
function params(query: Record<string, string>): URLSearchParams {
	return new URLSearchParams(query);
}

describe('storedSeriesLinesSchema', () => {
	it('accepte la nouvelle forme et l’ancienne, mêlées', () => {
		const parsed = storedSeriesLinesSchema.safeParse([
			{ templateId: FRACTIONS_ID, quantity: 1, delay: 30 },
			LEGACY_ADDITION
		]);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.data.map(isLegacyLine)).toEqual([false, true]);
	});

	it('relit un niveau en chaîne (ancien panier du navigateur)', () => {
		const parsed = storedSeriesLinesSchema.safeParse([
			{ ...LEGACY_ADDITION, category: { ...LEGACY_ADDITION.category, level: '2' } }
		]);
		expect(parsed.success).toBe(true);
	});

	it('refuse un identifiant de modèle qui n’est pas un uuid', () => {
		const parsed = storedSeriesLinesSchema.safeParse([
			{ templateId: 'pas-un-uuid', quantity: 1, delay: 20 }
		]);
		expect(parsed.success).toBe(false);
	});

	it('refuse une composition vide ou de plus de 50 lignes', () => {
		expect(storedSeriesLinesSchema.safeParse([]).success).toBe(false);
		const line = { templateId: ADDITION_ID, quantity: 1, delay: 20 };
		expect(storedSeriesLinesSchema.safeParse(Array(51).fill(line)).success).toBe(false);
	});
});

describe('resolveSeriesLines', () => {
	it('une ancienne ligne devient le modèle de sa catégorie, quantité et durée gardées', () => {
		expect(resolveSeriesLines([LEGACY_ADDITION], TEMPLATES)).toEqual({
			items: [{ templateId: ADDITION_ID, quantity: 3, delay: 20 }],
			unresolved: 0
		});
	});

	it('sous-domaine absent : null et chaîne vide se valent', () => {
		const line = { ...LEGACY_ADDITION, category: { ...LEGACY_ADDITION.category, subdomain: '' } };
		expect(resolveSeriesLines([line], TEMPLATES).items[0].templateId).toBe(ADDITION_ID);
	});

	it('la nouvelle forme passe telle quelle, même si le modèle n’est pas dans la liste', () => {
		const line = { templateId: '0a11f0e0-0000-4000-8000-0000000000ff', quantity: 2, delay: 15 };
		expect(resolveSeriesLines([line], TEMPLATES)).toEqual({ items: [line], unresolved: 0 });
	});

	it('une ancienne ligne sans modèle publié est comptée et retirée, les autres gardées', () => {
		const orpheline = {
			category: { theme: 'Disparu', domain: 'Nulle part', subdomain: null, level: 1 },
			quantity: 1,
			delay: 20
		};
		expect(resolveSeriesLines([orpheline, LEGACY_ADDITION], TEMPLATES)).toEqual({
			items: [{ templateId: ADDITION_ID, quantity: 3, delay: 20 }],
			unresolved: 1
		});
	});
});

describe('parseSeriesLink', () => {
	it('relit un lien `?modeles=` construit par buildSeriesLink', () => {
		const items = [{ templateId: ADDITION_ID, quantity: 2, delay: 25 }];
		const link = new URL(buildSeriesLink('https://chiph.re', items));
		expect(link.searchParams.has('modeles')).toBe(true);
		expect(link.searchParams.has('categories')).toBe(false);
		expect(parseSeriesLink(link.searchParams)).toEqual({ success: true, lines: items });
	});

	it('relit un ancien lien `?categories=` (lignes à résoudre par l’appelant)', () => {
		const raw = encodeURIComponent(JSON.stringify([LEGACY_ADDITION]));
		const result = parseSeriesLink(params({ categories: raw }));
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(isLegacyLine(result.lines[0])).toBe(true);
	});

	it('lien sans composition, JSON abîmé, forme invalide → message, jamais d’exception', () => {
		expect(parseSeriesLink(params({}))).toEqual({
			success: false,
			error: 'Ce lien ne contient aucune question.'
		});
		expect(parseSeriesLink(params({ modeles: '%7B%7B' })).success).toBe(false);
		expect(parseSeriesLink(params({ modeles: '%E0%A4%A' })).success).toBe(false);
		const invalid = encodeSeriesParam([{ templateId: 'x', quantity: 1, delay: 1 }]);
		const result = parseSeriesLink(params({ modeles: invalid }));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toMatch(/^Ce lien de série n'est pas valide/);
	});

	it('hasSeriesLink et deleteSeriesLink voient les deux paramètres', () => {
		const both = params({ modeles: 'a', categories: 'b', mode: 'flash' });
		expect(hasSeriesLink(params({ categories: 'b' }))).toBe(true);
		deleteSeriesLink(both);
		expect(both.toString()).toBe('mode=flash');
	});
});

describe('legacyTemplatesFilter', () => {
	it('une condition exacte par catégorie, doublons fusionnés, guillemets échappés', () => {
		const filter = legacyTemplatesFilter([
			{ theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 },
			{ theme: 'Nombres', domain: 'Calcul', subdomain: '', level: 2 },
			{ theme: 'Dit "x"', domain: 'A,B', subdomain: 'S', level: 3 }
		]);
		expect(filter).toBe(
			'and(theme.eq."Nombres",domain.eq."Calcul",or(subdomain.is.null,subdomain.eq.""),level.eq.2),' +
				'and(theme.eq."Dit \\"x\\"",domain.eq."A,B",subdomain.eq."S",level.eq.3)'
		);
	});
});
