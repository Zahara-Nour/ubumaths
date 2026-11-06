/**
 * Contenu du cahier de texte — format et aperçu (chantier cahier-ubumark)
 *
 * Le cahier passe du HTML à ubumark. Le temps de convertir les lignes déjà
 * écrites, les deux formats coexistent : `isLegacyHtmlContent` les distingue,
 * `journalContentPreview` donne le texte brut des aperçus (grille de la
 * semaine, carte de travail) quel que soit le format.
 *
 * Contenus HTML : ceux de la prod au 2026-11-06 (paragraphes autour de
 * références, paragraphes vides compris).
 */
import { describe, it, expect } from 'vitest';
import { isLegacyHtmlContent, journalContentPreview } from '../content';

const FICHE = '8443f4b7-1d0b-4035-9852-6ac06b63e89f';

describe('isLegacyHtmlContent', () => {
	it('reconnaît le HTML de TipTap (paragraphes, titres, listes)', () => {
		expect(isLegacyHtmlContent(`<p>[[worksheet:${FICHE}|Évaluation]]</p><p></p>`)).toBe(true);
		expect(isLegacyHtmlContent('<h2>Cours</h2>')).toBe(true);
		expect(isLegacyHtmlContent('  <ul><li>a</li></ul>')).toBe(true);
	});

	it('ne prend pas du markdown pour du HTML', () => {
		expect(isLegacyHtmlContent('Revoir le **cours** sur $x^2$')).toBe(false);
		expect(isLegacyHtmlContent('# Cours\n\n- point 1')).toBe(false);
		expect(isLegacyHtmlContent(`[[worksheet:${FICHE}|Évaluation]]`)).toBe(false);
	});

	it('un markdown qui commence par une comparaison reste du markdown', () => {
		expect(isLegacyHtmlContent('< 3 élèves absents')).toBe(false);
		expect(isLegacyHtmlContent('$<$ est une relation d’ordre')).toBe(false);
	});

	it('vide ou absent : pas du HTML', () => {
		expect(isLegacyHtmlContent('')).toBe(false);
		expect(isLegacyHtmlContent(null)).toBe(false);
		expect(isLegacyHtmlContent(undefined)).toBe(false);
	});
});

describe('journalContentPreview', () => {
	it('HTML : balises retirées, références réduites à leur libellé', () => {
		const html = `<p>[[worksheet:${FICHE}#2,4,5|Évaluation — ex. 2, 4 et 5]]</p><p></p><p>Bien relire.</p>`;
		expect(journalContentPreview(html)).toBe('Évaluation — ex. 2, 4 et 5 Bien relire.');
	});

	it('markdown : marques retirées, références réduites à leur libellé', () => {
		const md = `Revoir le **cours** et faire [[worksheet:${FICHE}#3|l’exercice 3]].\n\n- point _un_`;
		expect(journalContentPreview(md)).toBe('Revoir le cours et faire l’exercice 3. point un');
	});

	it('markdown : un identifiant à tiret bas ne casse pas le libellé', () => {
		const md = `[[worksheet_exercise:${FICHE}|Exercice 3 — Fiche : Dérivées]]`;
		expect(journalContentPreview(md)).toBe('Exercice 3 — Fiche : Dérivées');
	});

	it('coupe au-delà de la longueur demandée', () => {
		expect(journalContentPreview('Revoir le **cours** de lundi', 9)).toBe('Revoir le...');
		expect(journalContentPreview('court', 9)).toBe('court');
	});

	it('vide ou absent : chaîne vide', () => {
		expect(journalContentPreview('')).toBe('');
		expect(journalContentPreview(null)).toBe('');
		expect(journalContentPreview('<p></p>')).toBe('');
	});
});
