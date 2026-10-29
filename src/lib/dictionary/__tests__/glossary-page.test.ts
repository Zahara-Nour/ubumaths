/**
 * Adresses et description des pages du glossaire (chantier seo).
 */
import { describe, expect, it } from 'vitest';
import type { MathTerm } from '../model';
import {
	glossaryDescription,
	isBareRedirect,
	pageSlugFor,
	termKey,
	termLabel
} from '../glossary-page';

const base: MathTerm = { term: 'base', sense: 'puissance', tags: [], grade: '4' };

describe('glossary-page', () => {
	it('la clé et le nom affiché portent le sens', () => {
		expect(termKey(base)).toBe('base|puissance');
		expect(termLabel(base)).toBe('base (puissance)');
		expect(termKey({ term: 'aire' })).toBe('aire|');
	});

	it('un renvoi est nu sans définition, exemple ni histoire', () => {
		expect(isBareRedirect({ ...base, derivedFrom: 'x' })).toBe(true);
		expect(isBareRedirect({ ...base, derivedFrom: 'x', history: 'Grec.' })).toBe(false);
		expect(isBareRedirect(base)).toBe(false);
	});

	it('la liste mène un renvoi nu à la page du terme cité', () => {
		const cited: MathTerm = { ...base, sense: undefined, term: 'résolution' };
		const derived: MathTerm = { term: 'résoudre', tags: [], grade: '4', derivedFrom: 'résolution' };
		const slugs = { 'résolution|': 'resolution', 'résoudre|': 'resoudre' };
		expect(pageSlugFor(derived, [cited, derived], slugs)).toBe('resolution');
		expect(pageSlugFor(cited, [cited, derived], slugs)).toBe('resolution');
		expect(pageSlugFor(derived, [derived], slugs)).toBe('resoudre');
	});

	it('la description est la première définition en texte brut, coupée à un mot', () => {
		const short: MathTerm = {
			...base,
			definitions: { items: [{ grade: '4', content: 'Dans $a^n$, le nombre **a**.' }] }
		};
		expect(glossaryDescription(short)).toBe('Dans a^n, le nombre a.');
		const long: MathTerm = {
			...base,
			definitions: { items: [{ grade: '4', content: 'mot '.repeat(60) }] }
		};
		const text = glossaryDescription(long);
		expect(text.length).toBeLessThanOrEqual(155);
		expect(text.endsWith('mot…')).toBe(true);
		expect(glossaryDescription(base)).toBe(
			'Définition de « base (puissance) » : glossaire mathématique de Chiphre.'
		);
	});
});
