import { describe, expect, it } from 'vitest';
import { parseArticle } from '../articles';
import {
	ARTICLES_PER_PAGE,
	frontPageParts,
	pageCountFor,
	pageOfArticle,
	toArticleView,
	toEdition,
	toSummary,
	todayIsoInParis
} from '../present';

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

describe('frontPageParts', () => {
	const image = '![Des rails qui semblent se rejoindre.](/shtam/rails.svg){size=large}';
	const long = 'Un paragraphe assez long. '.repeat(15).trim();

	it('reprend la première image du corps, où qu’elle soit', () => {
		const body = `Premier.\n\nDeuxième.\n\n${image}\n\nTroisième.`;
		expect(frontPageParts(body).image).toBe(image);
	});

	it('sinon prend celle du vrai du faux, où sont les figures des articles', () => {
		expect(frontPageParts('Premier.', `- Le fait.\n\n${image}`).image).toBe(image);
	});

	it('sans image nulle part, n’en invente pas', () => {
		expect(frontPageParts('Premier.\n\nDeuxième.', 'Le fait.').image).toBeNull();
	});

	it('garde les premiers paragraphes jusqu’à environ 500 caractères, sans l’image', () => {
		const body = `${long}\n\n${image}\n\n${long}\n\nNon repris.`;
		expect(frontPageParts(body).excerpt).toBe(`${long}\n\n${long}`);
	});

	it('s’arrête avant un bloc (liste, tableau, intertitre, code), qui ne se coupe pas', () => {
		for (const block of [
			'- un point',
			'| a | b |',
			'### Intertitre',
			'```variation',
			'1. premier'
		]) {
			expect(frontPageParts(`Court.\n\n${block}\n\nAprès.`).excerpt).toBe('Court.');
		}
	});
});

describe('pages du journal', () => {
	it('range deux articles par page intérieure, à partir de la page 2', () => {
		expect(ARTICLES_PER_PAGE).toBe(2);
		expect([0, 1, 2, 3, 4].map(pageOfArticle)).toEqual([2, 2, 3, 3, 4]);
	});

	it('compte la une en plus des pages intérieures', () => {
		expect(pageCountFor(0)).toBe(1);
		expect(pageCountFor(1)).toBe(2);
		expect(pageCountFor(12)).toBe(7);
		expect(pageCountFor(13)).toBe(8);
	});
});

describe('toEdition', () => {
	it('numérote le journal par le nombre d’articles parus et le date du jour', () => {
		expect(toEdition('2026-10-05', 12)).toEqual({
			number: 12,
			almanachDate: expect.stringMatching(/^\d+ Ambraire, An \d+ E\.R\.$/),
			gregorianDate: '5 octobre 2026'
		});
	});
});
