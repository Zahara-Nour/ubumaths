/**
 * Contenu du cahier de texte — format et aperçu (chantier cahier-ubumark)
 *
 * Le cahier est écrit en ubumark (lignes HTML converties le 2026-11-08, lecture
 * HTML retirée ensuite) : `journalContentPreview` donne le texte brut des
 * aperçus (grille de la semaine, carte de travail).
 */
import { describe, it, expect } from 'vitest';
import * as content from '../content';
import { journalContentPreview } from '../content';

const FICHE = '8443f4b7-1d0b-4035-9852-6ac06b63e89f';

describe('lecture HTML retirée', () => {
	it('le module n’expose plus de détection du format HTML', () => {
		expect('isLegacyHtmlContent' in content).toBe(false);
	});
});

describe('journalContentPreview', () => {
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
	});
});
