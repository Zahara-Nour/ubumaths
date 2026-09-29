/**
 * Ordre des catégories de questions (thème → domaine → sous-domaine)
 * ==================================================================
 *
 * Les catégories ne sont que des champs texte des modèles : la base ne connaît
 * aucun ordre. Celui-ci est l'ordre déclaré dans TinyMath (ordre du JSON
 * d'origine), relevé le 2026-09-29 sur les catégories réellement en base, avec
 * leurs noms actuels (« Racines carrées », pas « Racines carré »).
 *
 * Décision de David (2026-09-29) : l'ordre vit ici, dans le code ; une
 * catégorie absente de cette liste (créée plus tard dans l'éditeur) se range
 * après les catégories connues, par ordre alphabétique. Changer l'ordre = une PR.
 */

// ============================================================================
// TYPES
// ============================================================================

interface DomainOrder {
	domain: string;
	subdomains: readonly string[];
}

interface ThemeOrder {
	theme: string;
	domains: readonly DomainOrder[];
}

/** Ce dont le tri a besoin d'un modèle */
export interface CategorizedItem {
	theme: string;
	domain: string;
	subdomain?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CATEGORY_ORDER: readonly ThemeOrder[] = [
	{
		theme: 'Entiers',
		domains: [
			{ domain: 'Apprivoiser', subdomains: ['Ecriture', 'Décomposition', 'Repérage', 'Comparer'] },
			{
				domain: 'Additionner',
				subdomains: [
					'Tables',
					'Somme',
					'Complément',
					'A trou',
					'Double et moitié',
					'Triple et tiers',
					'Somme astucieuse'
				]
			},
			{ domain: 'Soustraire', subdomains: ['Différence', 'A trou', 'Différence astucieuse'] },
			{
				domain: 'Multiplier',
				subdomains: [
					'Tables',
					'Produit',
					'Double et moitié',
					'Triple et tiers',
					'Quadruple et quart',
					'Produits particuliers',
					'Puissances de $$10$$',
					'A trou',
					'Carrés',
					'Produits astucieux',
					'Distributivité',
					'Décomposition'
				]
			},
			{
				domain: 'Diviser',
				subdomains: ['Quotient', 'A trou', 'Divisibilité', 'Division euclidienne']
			},
			{ domain: 'Priorités opératoires', subdomains: ['Avec parenthèses', 'Sans parenthèses'] },
			{ domain: 'Vocabulaire', subdomains: ['Traduire'] }
		]
	},
	{
		theme: 'Décimaux',
		domains: [
			{
				domain: 'Apprivoiser',
				subdomains: ['Ecriture', 'Décomposition', 'Forme fractionnaire', 'Comparer', 'Encadrer']
			},
			{ domain: 'Additionner', subdomains: ['Somme', 'A trou', 'Somme astucieuse', 'Moitié'] },
			{ domain: 'Soustraire', subdomains: ['Différence'] },
			{
				domain: 'Multiplier',
				subdomains: [
					'Produit',
					'Produit particulier',
					'Puissances de 10',
					'Produits astucieux',
					'Distributivité',
					'A trou'
				]
			},
			{ domain: 'Diviser', subdomains: ['Quotient', 'A trou'] }
		]
	},
	{
		theme: 'Relatifs',
		domains: [
			{ domain: 'Apprivoiser', subdomains: ["La définition d'un nombre négatif", 'Comparer'] },
			{
				domain: 'Additionner et soustraire',
				subdomains: ['Sur la droite graduée', 'Sommes', 'Différences', 'Sommes algébriques']
			},
			{ domain: 'Multiplier et Diviser', subdomains: ['Produit', 'Carré', 'Quotient'] }
		]
	},
	{
		theme: 'Fractions',
		domains: [
			{
				domain: 'Apprivoiser',
				subdomains: [
					'Définition',
					'Décomposition',
					'Forme décimale',
					'Egalité de fractions',
					'Simplification',
					'Comparer'
				]
			},
			{ domain: 'A trou', subdomains: ['Addition - Soustraction', 'Multiplication'] },
			{
				domain: 'Calculer',
				subdomains: [
					'Addition et Soustraction',
					"Fraction d'une quantité",
					'Multiplication',
					'Inverse',
					'Division'
				]
			}
		]
	},
	{
		theme: 'Puissances',
		domains: [
			{
				domain: 'Apprivoiser',
				subdomains: ['Définition', 'Puissances de 10', 'Notation scientifique']
			},
			{
				domain: 'Calculer',
				subdomains: ['Multiplier', 'Diviser', 'Puissance de puissance', 'Mixer tout ça']
			}
		]
	},
	{
		theme: 'Grandeurs',
		domains: [
			{ domain: 'Unités', subdomains: ['Unités simples', 'Unités composées'] },
			{ domain: 'Périmètres', subdomains: ["Périmètre d'un carré", "Périmètre d'un rectangle"] },
			{
				domain: 'Aires',
				subdomains: [
					"Aire d'un carré",
					"Aire d'un rectangle",
					"Aire d'un triangle rectangle",
					"Aire d'un triangle quelconque",
					"Aire d'un parallélogramme"
				]
			},
			{ domain: 'Volumes', subdomains: ['conversions'] },
			{ domain: 'Durées', subdomains: ['Convertir', 'Calculer'] },
			{ domain: 'Vitesses', subdomains: ['Convertir', 'Calculer'] }
		]
	},
	{
		theme: 'Racines carrées',
		domains: [
			{ domain: 'Apprivoiser', subdomains: ['Définition'] },
			{ domain: 'Manipuler', subdomains: ['Propriétés', 'Réduire', 'Egalité', 'Calculer'] }
		]
	},
	{
		theme: 'Probabilités',
		domains: [{ domain: 'Apprivoiser', subdomains: ['Probabilité simple', 'Fréquences'] }]
	},
	{
		theme: 'Proportionnalité',
		domains: [
			{
				domain: 'Tableaux de proportionnalité',
				subdomains: ['Reconnaître', 'Calculer une quatrième proportionnelle', 'Appliquer']
			},
			{ domain: 'Pourcentages', subdomains: ['Définition', 'Calculer', 'Variations'] },
			{ domain: "Echelle d'une carte", subdomains: ["Trouver l'échelle", "Utiliser l'échelle"] }
		]
	},
	{
		theme: 'Calcul littéral',
		domains: [
			{ domain: 'Calculs', subdomains: ['Par substitution'] },
			{
				domain: 'Transformation',
				subdomains: [
					"Simplification d'écriture",
					'Réduction',
					"Opposé d'une expression",
					'Développement',
					'Factorisation',
					'Identités remarquables'
				]
			},
			{
				domain: 'Equations',
				subdomains: ['Dans $$\\N$$', 'Dans $$\\Z$$', 'Dans $$\\Q$$', 'Linéaire du premier degré']
			}
		]
	},
	{
		theme: 'Fonctions',
		domains: [
			{ domain: 'Fonctions affines', subdomains: ['Apprivoiser', 'Variations-Signe', 'Equations'] },
			{ domain: 'Valeur absolue', subdomains: ['Apprivoiser', 'Equations'] },
			{
				domain: 'Polynôme du second degré',
				subdomains: ['Apprivoiser', 'Racines', 'Vrai ou Faux']
			},
			{ domain: 'Dérivation', subdomains: ['Apprivoiser'] },
			{ domain: 'Etude de fonction', subdomains: ['Flash'] }
		]
	},
	{
		theme: 'Suites',
		domains: [
			{
				domain: 'Apprivoiser',
				subdomains: ['Calculer un terme', 'Ecriture des termes', 'Deviner le terme général']
			},
			{ domain: 'Limites', subdomains: ['Determiner une limite'] },
			{ domain: 'Suites arithmétiques', subdomains: ['Calculer un terme', 'Determiner la raison'] }
		]
	}
];

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Rang dans la liste ; absent → après tous les connus */
function rankOf(names: readonly string[], name: string): number {
	const index = names.indexOf(name);
	return index === -1 ? Number.POSITIVE_INFINITY : index;
}

/** Même rang (deux inconnus) → ordre alphabétique français */
function compareByRank(names: readonly string[], a: string, b: string): number {
	const difference = rankOf(names, a) - rankOf(names, b);
	if (difference !== 0 && !Number.isNaN(difference)) return difference;
	return a.localeCompare(b, 'fr');
}

/**
 * Compare deux éléments selon l'ordre déclaré : thème, puis domaine dans le
 * thème, puis sous-domaine dans le domaine. Égalité si même catégorie (le
 * départage — niveau, etc. — revient à l'appelant).
 */
export function compareCategories(a: CategorizedItem, b: CategorizedItem): number {
	if (a.theme !== b.theme) {
		return compareByRank(
			CATEGORY_ORDER.map((entry) => entry.theme),
			a.theme,
			b.theme
		);
	}
	const theme = CATEGORY_ORDER.find((entry) => entry.theme === a.theme);
	if (a.domain !== b.domain) {
		return compareByRank(theme?.domains.map((entry) => entry.domain) ?? [], a.domain, b.domain);
	}
	const subdomainA = a.subdomain ?? '';
	const subdomainB = b.subdomain ?? '';
	if (subdomainA === subdomainB) return 0;
	const domain = theme?.domains.find((entry) => entry.domain === a.domain);
	return compareByRank(domain?.subdomains ?? [], subdomainA, subdomainB);
}
