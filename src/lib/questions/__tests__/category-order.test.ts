/**
 * Ordre déclaré des catégories (TinyMath), pas l'ordre alphabétique
 */
import { describe, it, expect } from 'vitest';
import {
	CATEGORY_ORDER,
	compareCategories,
	type CategorizedItem
} from '$lib/questions/category-order';

function sortItems(items: CategorizedItem[]): CategorizedItem[] {
	return [...items].sort(compareCategories);
}

describe('compareCategories', () => {
	it("range les thèmes dans l'ordre déclaré (Entiers avant Décimaux, Fractions avant Calcul littéral)", () => {
		const themes = ['Calcul littéral', 'Fractions', 'Décimaux', 'Entiers'].map((theme) => ({
			theme,
			domain: 'Apprivoiser'
		}));

		expect(sortItems(themes).map((item) => item.theme)).toEqual([
			'Entiers',
			'Décimaux',
			'Fractions',
			'Calcul littéral'
		]);
	});

	it('Suites (1re SPE) : domaines par notion, sous-domaines accentués', () => {
		const domains = [
			'Limites',
			'Modélisation',
			'Seuil et algorithmes',
			'Sommes',
			'Sens de variation',
			'Reconnaître une suite',
			'Suites géométriques',
			'Suites arithmétiques',
			'Représentation graphique',
			'Apprivoiser'
		];
		expect(
			sortItems(domains.map((domain) => ({ theme: 'Suites', domain }))).map((item) => item.domain)
		).toEqual([...domains].reverse());

		const graphiques = ['Escalier', 'Associer formule et nuage', 'Lire un terme'].map(
			(subdomain) => ({
				theme: 'Suites',
				domain: 'Représentation graphique',
				subdomain
			})
		);
		expect(sortItems(graphiques).map((item) => item.subdomain)).toEqual([
			'Lire un terme',
			'Associer formule et nuage',
			'Escalier'
		]);

		const subdomains = ['Terme général', 'Déterminer la raison', 'Calculer un terme'].map(
			(subdomain) => ({ theme: 'Suites', domain: 'Suites géométriques', subdomain })
		);
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Calculer un terme',
			'Déterminer la raison',
			'Terme général'
		]);
	});

	it('Fonction exponentielle : après la dérivation, sous-domaines par notion', () => {
		const domains = ['Etude de fonction', 'Fonction exponentielle', 'Dérivation'].map((domain) => ({
			theme: 'Fonctions',
			domain
		}));
		expect(sortItems(domains).map((item) => item.domain)).toEqual([
			'Dérivation',
			'Fonction exponentielle',
			'Etude de fonction'
		]);
		const subdomains = [
			'Suites et modélisation',
			'Dérivation',
			'Propriétés algébriques',
			'Équations et inéquations'
		].map((subdomain) => ({ theme: 'Fonctions', domain: 'Fonction exponentielle', subdomain }));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Propriétés algébriques',
			'Équations et inéquations',
			'Dérivation',
			'Suites et modélisation'
		]);
	});

	it("range les domaines d'Entiers dans l'ordre déclaré", () => {
		const domains = [
			'Vocabulaire',
			'Soustraire',
			'Priorités opératoires',
			'Multiplier',
			'Diviser',
			'Apprivoiser',
			'Additionner'
		].map((domain) => ({ theme: 'Entiers', domain }));

		expect(sortItems(domains).map((item) => item.domain)).toEqual([
			'Apprivoiser',
			'Additionner',
			'Soustraire',
			'Multiplier',
			'Diviser',
			'Priorités opératoires',
			'Vocabulaire'
		]);
	});

	it("range les sous-domaines dans l'ordre déclaré de leur domaine", () => {
		const subdomains = ['Comparer', 'Ecriture', 'Repérage', 'Décomposition'].map((subdomain) => ({
			theme: 'Entiers',
			domain: 'Apprivoiser',
			subdomain
		}));

		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Ecriture',
			'Décomposition',
			'Repérage',
			'Comparer'
		]);
	});

	it('un même nom de domaine suit le rang propre à son thème', () => {
		// « Calculer » : 2ᵉ domaine des Puissances, 3ᵉ des Fractions (après « A trou »)
		const items = [
			{ theme: 'Fractions', domain: 'Calculer' },
			{ theme: 'Fractions', domain: 'A trou' }
		];

		expect(sortItems(items).map((item) => item.domain)).toEqual(['A trou', 'Calculer']);
	});

	it('met les catégories inconnues après les connues, par ordre alphabétique', () => {
		const items = [
			{ theme: 'Zététique', domain: 'x' },
			{ theme: 'Suites', domain: 'Apprivoiser' },
			{ theme: 'Arithmétique', domain: 'x' },
			{ theme: 'Entiers', domain: 'Apprivoiser' }
		];

		expect(sortItems(items).map((item) => item.theme)).toEqual([
			'Entiers',
			'Suites',
			'Arithmétique',
			'Zététique'
		]);
	});

	it('met un domaine inconnu après les domaines connus du thème', () => {
		const items = [
			{ theme: 'Entiers', domain: 'Nouveau domaine' },
			{ theme: 'Entiers', domain: 'Vocabulaire' }
		];

		expect(sortItems(items).map((item) => item.domain)).toEqual(['Vocabulaire', 'Nouveau domaine']);
	});

	it('traite un sous-domaine absent (null) comme égal à un autre absent', () => {
		expect(
			compareCategories(
				{ theme: 'Entiers', domain: 'Diviser', subdomain: null },
				{ theme: 'Entiers', domain: 'Diviser' }
			)
		).toBe(0);
	});

	it('ne contient aucun doublon (un doublon rendrait le rang ambigu)', () => {
		const themes = CATEGORY_ORDER.map((entry) => entry.theme);
		expect(new Set(themes).size).toBe(themes.length);
		for (const theme of CATEGORY_ORDER) {
			const domains = theme.domains.map((entry) => entry.domain);
			expect(new Set(domains).size, theme.theme).toBe(domains.length);
			for (const domain of theme.domains) {
				expect(new Set(domain.subdomains).size, `${theme.theme} / ${domain.domain}`).toBe(
					domain.subdomains.length
				);
			}
		}
	});
});
