import { describe, expect, it } from 'vitest';
import { parseArticle } from '../articles';
import { toArticleView, toSummary, todayIsoInParis } from '../present';

const raw = `---
title: Titre
date: 2026-10-05
author: cotice
lede: Chapeau.
---

Corps.

## Le vrai du faux

Le fait réel.
`;

describe('todayIsoInParis', () => {
	it('prend le jour civil de Paris, pas celui de l’UTC', () => {
		// 23 h 30 UTC le 4 octobre = 1 h 30 le 5 octobre à Paris (heure d’été)
		expect(todayIsoInParis(new Date('2026-10-04T23:30:00Z'))).toBe('2026-10-05');
	});
});

describe('toSummary', () => {
	it('date l’article dans l’Almanach et en grégorien, et le signe', () => {
		const s = toSummary(parseArticle('titre', raw));
		expect(s).toEqual({
			slug: 'titre',
			title: 'Titre',
			lede: 'Chapeau.',
			byline: 'Cotice, rédacteur en chef',
			date: '2026-10-05',
			almanachDate: expect.stringMatching(/^\d+ Ambraire, An \d+ E\.R\.$/),
			gregorianDate: '5 octobre 2026'
		});
	});

	it('ne transporte ni le corps ni le vrai du faux', () => {
		const s = toSummary(parseArticle('titre', raw));
		expect(s).not.toHaveProperty('body');
		expect(s).not.toHaveProperty('truth');
	});
});

describe('toArticleView', () => {
	it('ajoute le corps et le vrai du faux', () => {
		const v = toArticleView(parseArticle('titre', raw));
		expect(v.body).toBe('Corps.');
		expect(v.truth).toBe('Le fait réel.');
	});
});
