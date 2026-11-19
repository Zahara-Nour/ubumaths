/**
 * Titre imprimé d'une fiche (ADR 0041, chantier categorie-fiche)
 *
 * Décisions de David (2026-11-19, synthèse de la phase 0) :
 * - fiche d'exercices sans titre libre : les notions en grand (« Suites ·
 *   Dérivation »), la catégorie en petit dessous ; bas de page « Suites ·
 *   Entraînement technique » ;
 * - titre libre (ou titre des autres types) : lui seul en grand, les notions
 *   dessous ; jamais la catégorie ;
 * - amendé le 2026-11-19 (reprise des 50 fiches) : plusieurs notions pour
 *   toute fiche ; chaque notion commence par une majuscule (sous-notions de
 *   l'arbre écrites en minuscule) ;
 * - fiche en anglais : catégorie traduite, aucune notion imprimée (chantier
 *   séparé).
 */
import { describe, expect, it } from 'vitest';
import {
	composedTitle,
	notionLabel,
	printedTitle,
	type PrintedTitleInput
} from '../worksheet-title';

const base: PrintedTitleInput = {
	type: 'worksheet',
	category: 'technical_practice',
	customTitle: false,
	title: 'Suites · Entraînement technique',
	notions: ['Suites'],
	locale: 'fr'
};

describe('notionLabel', () => {
	it('majuscule en tête, le reste intact', () => {
		expect(notionLabel('loi géométrique')).toBe('Loi géométrique');
		expect(notionLabel('équations de droites')).toBe('Équations de droites');
		expect(notionLabel('Suites')).toBe('Suites');
		expect(notionLabel('')).toBe('');
	});
});

describe('composedTitle (le titre écrit en base)', () => {
	it('notion puis catégorie', () => {
		expect(composedTitle('technical_practice', ['Suites'])).toBe('Suites · Entraînement technique');
	});

	it('plusieurs notions, dans l’ordre', () => {
		expect(composedTitle('review', ['Suites', 'Dérivation'])).toBe(
			'Suites · Dérivation · Révisions'
		);
	});

	it('sous-notion en minuscule : majuscule en tête', () => {
		expect(composedTitle('technical_practice', ['loi géométrique'])).toBe(
			'Loi géométrique · Entraînement technique'
		);
	});

	it('Entraînement technique à trois notions', () => {
		expect(
			composedTitle('technical_practice', [
				'Généralités sur les suites',
				'Suites arithmétiques',
				'Suites géométriques'
			])
		).toBe(
			'Généralités sur les suites · Suites arithmétiques · Suites géométriques · Entraînement technique'
		);
	});

	it('sans notion : la catégorie seule ; sans rien : vide', () => {
		expect(composedTitle('applications', [])).toBe('Applications');
		expect(composedTitle(null, ['Suites'])).toBe('Suites');
		expect(composedTitle(null, [])).toBe('');
	});
});

describe('printedTitle', () => {
	it('une notion, sans titre libre : la notion en grand, la catégorie dessous', () => {
		expect(printedTitle(base)).toEqual({
			main: 'Suites',
			sub: 'entraînement technique',
			footer: 'Suites · Entraînement technique'
		});
	});

	it('Automatismes à deux notions : les deux en grand, la catégorie dessous', () => {
		expect(
			printedTitle({ ...base, category: 'automatisms', notions: ['Suites', 'Dérivation'] })
		).toEqual({
			main: 'Suites · Dérivation',
			sub: 'automatismes',
			footer: 'Suites · Dérivation · Automatismes'
		});
	});

	it('sans notion, sans titre libre : la catégorie en grand, rien dessous', () => {
		expect(printedTitle({ ...base, category: 'review', notions: [] })).toEqual({
			main: 'Révisions',
			sub: '',
			footer: 'Révisions'
		});
	});

	it('ni notion ni catégorie : le titre en base', () => {
		expect(printedTitle({ ...base, category: null, notions: [], title: 'Fiche 3' })).toEqual({
			main: 'Fiche 3',
			sub: '',
			footer: 'Fiche 3'
		});
	});

	it('titre libre sur une fiche à une notion : lui en grand, la notion dessous, pas la catégorie', () => {
		expect(printedTitle({ ...base, customTitle: true, title: 'Le produit scalaire' })).toEqual({
			main: 'Le produit scalaire',
			sub: 'Suites',
			footer: 'Le produit scalaire'
		});
	});

	it('sous-notion en minuscule : majuscule en tête, en grand comme dessous', () => {
		expect(printedTitle({ ...base, notions: ['loi géométrique'] })).toMatchObject({
			main: 'Loi géométrique',
			footer: 'Loi géométrique · Entraînement technique'
		});
		expect(
			printedTitle({ ...base, customTitle: true, title: 'Fiche', notions: ['loi géométrique'] })
		).toMatchObject({ sub: 'Loi géométrique' });
	});

	it('titre libre en Révisions : les notions dessous, jamais la catégorie', () => {
		expect(
			printedTitle({
				...base,
				category: 'review',
				customTitle: true,
				title: 'Préparation Bac Blanc 1',
				notions: ['Suites', 'Dérivation']
			})
		).toEqual({
			main: 'Préparation Bac Blanc 1',
			sub: 'Suites · Dérivation',
			footer: 'Préparation Bac Blanc 1'
		});
	});

	it('évaluation : titre écrit à la main, notions dessous, case ignorée', () => {
		for (const customTitle of [true, false]) {
			expect(
				printedTitle({
					...base,
					type: 'assessment',
					category: null,
					customTitle,
					title: 'Contrôle n° 2',
					notions: ['Suites', 'Dérivation']
				})
			).toEqual({ main: 'Contrôle n° 2', sub: 'Suites · Dérivation', footer: 'Contrôle n° 2' });
		}
	});

	it('anglais sans titre libre : la catégorie traduite, sans notion', () => {
		expect(printedTitle({ ...base, locale: 'en', title: 'Suites' })).toEqual({
			main: 'Technical practice',
			sub: '',
			footer: 'Technical practice'
		});
	});

	it('anglais, Automatismes : « Fluency » (David, 2026-11-19, sur ma reco)', () => {
		expect(printedTitle({ ...base, locale: 'en', category: 'automatisms' }).main).toBe('Fluency');
	});

	it('anglais, titre libre à plusieurs notions : aucune notion imprimée', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				type: 'exam',
				category: null,
				customTitle: true,
				title: 'Mock exam',
				notions: ['Suites']
			})
		).toEqual({ main: 'Mock exam', sub: '', footer: 'Mock exam' });
	});
});
