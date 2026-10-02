/**
 * Options des listes Thème / Domaine / Sous-domaine de l'éditeur de modèle :
 * filtrées par les choix au-dessus, la valeur courante toujours présente.
 */
import { describe, it, expect } from 'vitest';
import {
	distinctCategoryEntries,
	themeOptionsFor,
	domainOptionsFor,
	subdomainOptionsFor,
	isKnownDomain,
	isKnownSubdomain,
	type CategoryEntry
} from '$lib/questions/category-options';

const ENTRIES: CategoryEntry[] = [
	{ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' },
	{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' },
	{ theme: 'Suites', domain: 'Arithmétiques', subdomain: 'Terme général' },
	{ theme: 'Suites', domain: 'Arithmétiques', subdomain: null },
	{ theme: 'Fractions', domain: 'Définition', subdomain: 'Simplifier' },
	{ theme: 'Fractions', domain: 'Comparer', subdomain: null }
];

describe('distinctCategoryEntries', () => {
	it('dédoublonne les triplets et les trie (thème, domaine, sous-domaine)', () => {
		const rows = [
			{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' },
			{ theme: 'Fractions', domain: 'Comparer', subdomain: null },
			{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' },
			{ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' }
		];
		expect(distinctCategoryEntries(rows)).toEqual([
			{ theme: 'Fractions', domain: 'Comparer', subdomain: null },
			{ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' },
			{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' }
		]);
	});

	it('ignore les lignes sans thème ou sans domaine, et un sous-domaine vide devient null', () => {
		const rows = [
			{ theme: '', domain: 'X', subdomain: null },
			{ theme: 'T', domain: '', subdomain: null },
			{ theme: 'T', domain: 'D', subdomain: '' },
			{ theme: 'T', domain: 'D', subdomain: null }
		];
		expect(distinctCategoryEntries(rows)).toEqual([{ theme: 'T', domain: 'D', subdomain: null }]);
	});
});

describe('themeOptionsFor', () => {
	it('tous les thèmes, une fois chacun, triés', () => {
		expect(themeOptionsFor(ENTRIES, [], '')).toEqual(['Fractions', 'Suites']);
	});

	it('ajoute les thèmes de la session et la valeur courante absente des données', () => {
		expect(themeOptionsFor(ENTRIES, ['Probabilités'], 'Géométrie')).toEqual([
			'Fractions',
			'Géométrie',
			'Probabilités',
			'Suites'
		]);
	});
});

describe('domainOptionsFor', () => {
	it('ne propose que les domaines du thème choisi', () => {
		expect(domainOptionsFor(ENTRIES, 'Fractions', '')).toEqual(['Comparer', 'Définition']);
		expect(domainOptionsFor(ENTRIES, 'Suites', '')).toEqual(['Arithmétiques', 'Définition']);
	});

	it('sans thème choisi : tous les domaines', () => {
		expect(domainOptionsFor(ENTRIES, '', '')).toEqual(['Arithmétiques', 'Comparer', 'Définition']);
	});

	it('la valeur courante reste présente même hors du thème', () => {
		expect(domainOptionsFor(ENTRIES, 'Fractions', 'Arithmétiques')).toEqual([
			'Arithmétiques',
			'Comparer',
			'Définition'
		]);
	});
});

describe('subdomainOptionsFor', () => {
	it('ne propose que les sous-domaines du thème ET du domaine choisis', () => {
		expect(subdomainOptionsFor(ENTRIES, 'Suites', 'Définition', '')).toEqual([
			'Explicite',
			'Récurrence'
		]);
		// même domaine « Définition », autre thème
		expect(subdomainOptionsFor(ENTRIES, 'Fractions', 'Définition', '')).toEqual(['Simplifier']);
	});

	it('domaine sans sous-domaine : liste vide (null n’est pas une option)', () => {
		expect(subdomainOptionsFor(ENTRIES, 'Fractions', 'Comparer', '')).toEqual([]);
	});

	it('thème choisi sans domaine : sous-domaines du thème', () => {
		expect(subdomainOptionsFor(ENTRIES, 'Suites', '', '')).toEqual([
			'Explicite',
			'Récurrence',
			'Terme général'
		]);
	});

	it('la valeur courante reste présente', () => {
		expect(subdomainOptionsFor(ENTRIES, 'Fractions', 'Comparer', 'Méthode')).toEqual(['Méthode']);
	});
});

describe('isKnownDomain / isKnownSubdomain', () => {
	it('dit si la combinaison existe dans les données', () => {
		expect(isKnownDomain(ENTRIES, 'Suites', 'Définition')).toBe(true);
		expect(isKnownDomain(ENTRIES, 'Fractions', 'Arithmétiques')).toBe(false);
		expect(isKnownSubdomain(ENTRIES, 'Suites', 'Définition', 'Explicite')).toBe(true);
		expect(isKnownSubdomain(ENTRIES, 'Fractions', 'Définition', 'Explicite')).toBe(false);
	});
});
