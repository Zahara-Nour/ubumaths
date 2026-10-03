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

	it('Fonctions trigonométriques : sous-domaines par notion', () => {
		const subdomains = [
			'Inéquations',
			'Propriétés',
			"Cosinus et sinus d'un réel",
			'Cercle et radians'
		].map((subdomain) => ({ theme: 'Fonctions', domain: 'Fonctions trigonométriques', subdomain }));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Cercle et radians',
			"Cosinus et sinus d'un réel",
			'Propriétés',
			'Inéquations'
		]);
	});

	it('Dérivation : Apprivoiser, puis nombre dérivé, tangente, fonctions dérivées, variations', () => {
		const subdomains = [
			'Variations',
			'Tangente',
			'Apprivoiser',
			'Fonctions dérivées',
			'Nombre dérivé'
		].map((subdomain) => ({ theme: 'Fonctions', domain: 'Dérivation', subdomain }));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Apprivoiser',
			'Nombre dérivé',
			'Tangente',
			'Fonctions dérivées',
			'Variations'
		]);
	});

	it('Probabilités conditionnelles : tableaux, arbres, indépendance, problèmes', () => {
		const subdomains = [
			'Problèmes en contexte',
			'Indépendance',
			'Tableaux croisés',
			'Arbres pondérés'
		].map((subdomain) => ({
			theme: 'Probabilités',
			domain: 'Probabilités conditionnelles',
			subdomain
		}));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Tableaux croisés',
			'Arbres pondérés',
			'Indépendance',
			'Problèmes en contexte'
		]);
	});

	it('Variables aléatoires : loi, compléter, espérance, variance, jeux', () => {
		const subdomains = [
			'Jeux et gains',
			'Variance et écart-type',
			"Loi d'une variable aléatoire",
			'Espérance',
			'Compléter une loi'
		].map((subdomain) => ({
			theme: 'Probabilités',
			domain: 'Variables aléatoires',
			subdomain
		}));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			"Loi d'une variable aléatoire",
			'Compléter une loi',
			'Espérance',
			'Variance et écart-type',
			'Jeux et gains'
		]);
	});

	it('Variables aléatoires après Probabilités conditionnelles', () => {
		const domains = ['Variables aléatoires', 'Probabilités conditionnelles', 'Apprivoiser'].map(
			(domain) => ({ theme: 'Probabilités', domain, subdomain: '' })
		);
		expect(sortItems(domains).map((item) => item.domain)).toEqual([
			'Apprivoiser',
			'Probabilités conditionnelles',
			'Variables aléatoires'
		]);
	});

	it('Produit scalaire : calculer, propriétés, angles et longueurs, lieux', () => {
		const subdomains = [
			'Lieux de points',
			'Angles et longueurs',
			'Calculer un produit scalaire',
			'Propriétés'
		].map((subdomain) => ({ theme: 'Géométrie', domain: 'Produit scalaire', subdomain }));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Calculer un produit scalaire',
			'Propriétés',
			'Angles et longueurs',
			'Lieux de points'
		]);
	});

	it("Géométrie : produit scalaire puis géométrie repérée, sous-domaines dans l'ordre", () => {
		const domains = ['Géométrie repérée', 'Produit scalaire'].map((domain) => ({
			theme: 'Géométrie',
			domain,
			subdomain: ''
		}));
		expect(sortItems(domains).map((item) => item.domain)).toEqual([
			'Produit scalaire',
			'Géométrie repérée'
		]);
		const subdomains = [
			'Équation de cercle',
			'Projeté orthogonal',
			'Vecteur normal et équation de droite'
		].map((subdomain) => ({ theme: 'Géométrie', domain: 'Géométrie repérée', subdomain }));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Vecteur normal et équation de droite',
			'Projeté orthogonal',
			'Équation de cercle'
		]);
	});

	it("Logique : ensembles puis logique et raisonnement, sous-domaines dans l'ordre", () => {
		const domains = ['Logique et raisonnement', 'Ensembles'].map((domain) => ({
			theme: 'Logique',
			domain,
			subdomain: ''
		}));
		expect(sortItems(domains).map((item) => item.domain)).toEqual([
			'Ensembles',
			'Logique et raisonnement'
		]);
		const subdomains = [
			'Raisonnements',
			'Quantificateurs et négation',
			'Implication et équivalence',
			'Connecteurs et contre-exemples'
		].map((subdomain) => ({ theme: 'Logique', domain: 'Logique et raisonnement', subdomain }));
		expect(sortItems(subdomains).map((item) => item.subdomain)).toEqual([
			'Connecteurs et contre-exemples',
			'Implication et équivalence',
			'Quantificateurs et négation',
			'Raisonnements'
		]);
		// Ordre pédagogique, pas alphabétique (Cardinal viendrait avant Intervalles)
		const ensembles = [
			'Cardinal et produit cartésien',
			'Intervalles',
			'Opérations sur les ensembles',
			'Appartenance et inclusion'
		].map((subdomain) => ({ theme: 'Logique', domain: 'Ensembles', subdomain }));
		expect(sortItems(ensembles).map((item) => item.subdomain)).toEqual([
			'Appartenance et inclusion',
			'Opérations sur les ensembles',
			'Intervalles',
			'Cardinal et produit cartésien'
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
