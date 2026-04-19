/**
 * French mathematics vocabulary dictionary.
 * Used for autocomplete in text blanks (BlankInput) and as a glossary.
 */

import type { GradeCode } from '$lib/types/grades';
import { hasAccessToGrade } from '$lib/utils/grades';

// ---------------------------------------------------------------------------
// Graded content types
// ---------------------------------------------------------------------------

/** A piece of content associated with a grade level. */
export interface GradedContent {
	grade: GradeCode;
	content: string; // ubumark
}

/**
 * A field whose content depends on the reader's grade level.
 * - `cumulative` (default): all items from accessible grades are shown
 * - `discriminant`: only the highest accessible item is shown
 */
export interface GradedField {
	mode?: 'cumulative' | 'discriminant';
	items: GradedContent[];
}

/**
 * Resolve a graded field for a given reader grade.
 * Returns the content strings appropriate for the reader.
 */
export function resolveGradedField(field: GradedField, readerGrade: GradeCode): string[] {
	const eligible = field.items.filter((i) => hasAccessToGrade(readerGrade, i.grade));

	if (field.mode === 'discriminant') {
		return eligible.length > 0 ? [eligible[eligible.length - 1].content] : [];
	}
	// Cumulative by default
	return eligible.map((i) => i.content);
}

// ---------------------------------------------------------------------------
// MathTerm interface
// ---------------------------------------------------------------------------

export interface MathTerm {
	term: string;
	tags: string[];
	/** Definitions by grade level (ubumark). Required for principal terms, omitted for derived terms. */
	definitions?: GradedField;
	/** Usage examples by grade level (ubumark). */
	exemples?: GradedField;
	/** Historical note about the term or concept (ubumark). Invariant across grades. */
	history?: string;
	image?: string;
	/** Grade at which the term is introduced. */
	grade: GradeCode;
	synonyms?: string[];
	/** For derived terms (verbs, adjectives): points to the principal term (substantive). */
	derivedFrom?: string;
}

// ---------------------------------------------------------------------------
// Dictionary data (~200-300 terms)
// ---------------------------------------------------------------------------

const MATH_DICTIONARY: MathTerm[] = [
	// =========================================================================
	// TRANSVERSAL (termes generaux)
	// =========================================================================
	{
		term: 'nombre',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CP', content: 'Concept mathématique représentant une quantité.' }]
		},
		grade: 'CP'
	},
	{
		term: 'chiffre',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Symbole ($0, 1, 2, \\ldots, 9$) utilisé pour écrire les nombres dans le système décimal.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'calcul',
		tags: ['transversal'],
		definitions: {
			items: [
				{ grade: 'CP', content: "Opération ou suite d'opérations effectuées sur des nombres." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'résultat',
		tags: ['transversal'],
		definitions: { items: [{ grade: 'CP', content: "Valeur obtenue à l'issue d'un calcul." }] },
		grade: 'CP'
	},
	{
		term: 'somme',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{ grade: 'CP', content: "Résultat d'une addition. Ex : la somme de $3$ et $5$ est $8$." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'différence',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Résultat d'une soustraction. Ex : la différence de $8$ et $3$ est $5$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'produit',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Résultat d'une multiplication. Ex : le produit de $4$ et $3$ est $12$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'quotient',
		tags: ['transversal', 'operations', 'entiers'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: "Résultat d'une division. Dans $15 \\div 4 = 3$ reste $3$, le quotient est $3$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'reste',
		tags: ['transversal', 'operations', 'entiers'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Ce qui reste après une division euclidienne. Dans $15 \\div 4 = 3$ reste $3$, le reste est $3$.'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'addition',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Opération qui associe à deux nombres leur somme.' }]
		},
		grade: 'CP'
	},
	{
		term: 'soustraction',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CP', content: 'Opération qui associe à deux nombres leur différence.' }]
		},
		grade: 'CP'
	},
	{
		term: 'multiplication',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CP', content: 'Opération qui associe à deux nombres leur produit.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'division',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Opération qui associe à deux nombres leur quotient.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'égal',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Relation entre deux quantités qui ont la même valeur. Symbole : $=$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'ordre de grandeur',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Valeur approchée d'un nombre, souvent arrondie à la dizaine, centaine, etc."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'opérateur',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Symbole indiquant une opération ($+$, $-$, $\\times$, $\\div$).' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'terme',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Chaque élément d'une somme ou d'une suite. Ex : dans $3 + 5$, les termes sont $3$ et $5$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'facteur',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Chaque élément d'un produit. Ex : dans $4 \\times 3$, les facteurs sont $4$ et $3$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'additionner',
		tags: ['transversal', 'operations'],
		grade: 'CP',
		derivedFrom: 'addition'
	},
	{
		term: 'calculer',
		tags: ['transversal'],
		grade: 'CP',
		derivedFrom: 'calcul'
	},
	{
		term: 'compter',
		tags: ['transversal'],
		grade: 'CP',
		derivedFrom: 'calcul'
	},
	{
		term: 'soustraire',
		tags: ['transversal', 'operations'],
		grade: 'CP',
		derivedFrom: 'soustraction'
	},
	{
		term: 'multiplier',
		tags: ['transversal', 'operations'],
		grade: 'CE1',
		derivedFrom: 'multiplication'
	},
	{
		term: 'diviser',
		tags: ['transversal', 'operations'],
		grade: 'CE2',
		derivedFrom: 'division'
	},
	{
		term: 'ordonner',
		tags: ['transversal'],
		grade: 'CM1',
		derivedFrom: 'ordre de grandeur'
	},
	{
		term: 'calculatrice',
		tags: ['transversal'],
		definitions: { items: [{ grade: 'CM1', content: 'Machine servant à effectuer des calculs.' }] },
		grade: 'CE1'
	},
	{
		term: 'convention',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Règle adoptée par accord. Ex : convention de signes.' }]
		},
		grade: '4'
	},
	{
		term: 'égalité',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: '4',
					content: 'Relation entre deux expressions ayant la même valeur. Symbole : $=$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'formule',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Égalité exprimant une relation entre des grandeurs. Ex : $A = L \\times l$.'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'géométrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE2', content: "Branche des mathématiques étudiant les figures et l'espace." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'inférieur',
		tags: ['transversal'],
		definitions: { items: [{ grade: 'CP', content: 'Plus petit que. Symbole : $<$ ou $\\leq$.' }] },
		grade: 'CE1'
	},
	{
		term: 'infini',
		tags: ['transversal'],
		definitions: {
			items: [
				{ grade: 'CE1', content: 'Concept désignant ce qui est sans fin. Symbole : $\\infty$.' }
			]
		},
		grade: '4'
	},
	{
		term: 'mathématiques',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: '4', content: 'Science des nombres, des formes et des structures.' }]
		},
		grade: 'CP'
	},
	{
		term: 'maths',
		tags: ['transversal'],
		definitions: { items: [{ grade: 'CP', content: 'Abréviation de mathématiques.' }] },
		grade: 'CP',
		derivedFrom: 'mathématiques'
	},
	{
		term: 'moins',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CP', content: 'Symbole $-$ de la soustraction ou du signe négatif.' }]
		},
		grade: 'CP'
	},
	{
		term: 'opération',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Processus de calcul : addition, soustraction, multiplication, division.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'ordre',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CP', content: 'Relation de comparaison entre nombres ($<$, $>$, $=$).' }]
		},
		grade: 'CE1'
	},
	{
		term: 'particulier',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: 'Cas spécial. Ex : triangle particulier (équilatéral, isocèle, rectangle).'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'plus',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: '6', content: "Symbole $+$ de l'addition ou du signe positif." }]
		},
		grade: 'CP'
	},
	{
		term: 'problème',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Situation nécessitant un raisonnement mathématique pour être résolue.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'schéma',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CP', content: 'Dessin simplifié représentant une situation mathématique.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'supérieur',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Plus grand que. Symbole : $>$ ou $\\geq$.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'valeur',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Nombre attribué à une variable ou à une expression.' }]
		},
		grade: 'CE1'
	},

	// =========================================================================
	// ENTIERS
	// =========================================================================
	{
		term: 'entier naturel',
		tags: ['entiers'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Nombre entier positif ou nul. L'ensemble des entiers naturels est $\\mathbb{N} = \\{0, 1, 2, 3, \\ldots\\}$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'pair',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{ grade: 'CP', content: 'Nombre entier divisible par $2$. Ex : $0, 2, 4, 6, 8, \\ldots$' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'impair',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Nombre entier qui n'est pas divisible par $2$. Ex : $1, 3, 5, 7, 9, \\ldots$"
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'dizaine',
		tags: ['entiers', 'numération'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Groupe de $10$ unités. Le chiffre des dizaines indique le nombre de dizaines.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'centaine',
		tags: ['entiers', 'numération'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Groupe de $100$ unités ($10$ dizaines). Le chiffre des centaines indique le nombre de centaines.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'millier',
		tags: ['entiers', 'numération'],
		definitions: { items: [{ grade: 'CE1', content: 'Groupe de $1\\,000$ unités.' }] },
		grade: 'CE2'
	},
	{
		term: 'unite',
		tags: ['entiers', 'numération', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Grandeur de référence pour mesurer. En numération, le rang le plus à droite dans un nombre entier.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'multiple',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'$a$ est un multiple de $b$ si $a = b \\times k$ avec $k$ entier. Ex : $12$ est un multiple de $3$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'diviseur (arithmétique)',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'$b$ est un diviseur de $a$ si $a \\div b$ est un entier (reste $0$). Ex : $3$ est un diviseur de $12$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'divisible',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Un nombre est divisible par un autre si la division tombe juste (reste $0$). Ex : $12$ est divisible par $3$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'nombre premier',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Entier naturel supérieur à $1$ qui n'a que deux diviseurs : $1$ et lui-même. Ex : $2, 3, 5, 7, 11$."
				}
			]
		},
		grade: '5',
		synonyms: ['premier']
	},
	{
		term: 'décomposition en facteurs premiers',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Écriture d'un entier comme produit de nombres premiers. Ex : $60 = 2^2 \\times 3 \\times 5$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'PGCD',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: '4',
					content: 'Plus Grand Commun Diviseur de deux entiers. Ex : $\\text{PGCD}(12, 18) = 6$.'
				}
			]
		},
		grade: '3',
		synonyms: ['plus grand commun diviseur']
	},
	{
		term: 'PPCM',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: '3',
					content: 'Plus Petit Commun Multiple de deux entiers. Ex : $\\text{PPCM}(4, 6) = 12$.'
				}
			]
		},
		grade: '3',
		synonyms: ['plus petit commun multiple']
	},
	{
		term: 'critère de divisibilité',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Règle permettant de savoir si un nombre est divisible par un autre sans faire la division. Ex : un nombre est divisible par $3$ si la somme de ses chiffres est divisible par $3$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'division euclidienne',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Division d'un entier $a$ par un entier $b \\neq 0$ donnant un quotient $q$ et un reste $r$ tels que $a = b \\times q + r$ avec $0 \\leq r < b$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'dividende',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{ grade: '6', content: "Nombre que l'on divise. Dans $15 \\div 4$, le dividende est $15$." }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'diviseur (operation)',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Nombre par lequel on divise. Dans $15 \\div 4$, le diviseur est $4$.'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'table de multiplication',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Tableau donnant les produits des nombres de $1$ a $10$ (ou $12$).'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'double',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Le double d'un nombre est ce nombre multiplié par $2$. Ex : le double de $7$ est $14$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'moitié',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"La moitié d'un nombre est ce nombre divisé par $2$. Ex : la moitié de $14$ est $7$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'triple',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [{ grade: 'CP', content: "Le triple d'un nombre est ce nombre multiplié par $3$." }]
		},
		grade: 'CE1'
	},
	{
		term: 'quart',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [{ grade: 'CE1', content: "Le quart d'un nombre est ce nombre divisé par $4$." }]
		},
		grade: 'CE1'
	},
	{
		term: 'quadruple',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Le quadruple d'un nombre est ce nombre multiplié par $4$." }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'tiers',
		tags: ['entiers', 'operations', 'fractions'],
		definitions: {
			items: [{ grade: 'CE1', content: "Le tiers d'un nombre est ce nombre divisé par $3$." }]
		},
		grade: 'CE1'
	},
	{
		term: 'arithmétique',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: 'Étude des propriétés des nombres entiers (divisibilité, premiers, etc.).'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'décomposition',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Écriture d'un nombre comme produit de facteurs. Ex : $60 = 2^2 \\times 3 \\times 5$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'décomposer',
		tags: ['entiers', 'arithmétique'],
		grade: '4',
		derivedFrom: 'décomposition en facteurs premiers'
	},
	{
		term: 'diviseur',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [{ grade: '4', content: 'Nombre qui divise exactement un autre nombre.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'entier',
		tags: ['entiers'],
		definitions: { items: [{ grade: 'CM1', content: 'Nombre sans partie décimale.' }] },
		grade: 'CP'
	},
	{
		term: 'euclide',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Mathématicien grec. Associé à la division euclidienne et l'algorithme d'Euclide."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'euclidienne',
		tags: ['entiers', 'arithmétique'],
		grade: '6',
		derivedFrom: 'division euclidienne'
	},
	{
		term: 'numération',
		tags: ['entiers', 'numération'],
		definitions: {
			items: [
				{ grade: '6', content: 'Système de représentation des nombres (décimal, binaire, etc.).' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'premier',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{ grade: 'CP', content: "Se dit d'un nombre n'ayant que deux diviseurs : $1$ et lui-même." }
			]
		},
		grade: '5'
	},

	// =========================================================================
	// DECIMAUX
	// =========================================================================
	{
		term: 'nombre décimal',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Nombre pouvant s'écrire sous forme de fraction décimale. Ex : $3{,}14 = \\frac{314}{100}$."
				}
			]
		},
		grade: 'CM1',
		synonyms: ['decimal']
	},
	{
		term: 'virgule',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Signe séparant la partie entière de la partie décimale dans l'écriture d'un nombre décimal."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'partie entiere',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Partie d'un nombre décimal située à gauche de la virgule. Ex : dans $3{,}14$, la partie entière est $3$."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'partie decimale',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Partie d'un nombre décimal située à droite de la virgule. Ex : dans $3{,}14$, la partie décimale est $0{,}14$."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'dixieme',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Premier rang après la virgule. $0{,}1 = \\frac{1}{10}$.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'centieme',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Deuxième rang après la virgule. $0{,}01 = \\frac{1}{100}$.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'millieme',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Troisième rang après la virgule. $0{,}001 = \\frac{1}{1000}$.' }
			]
		},
		grade: 'CM2'
	},
	{
		term: 'fraction décimale',
		tags: ['décimaux', 'fractions'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						'Fraction dont le dénominateur est une puissance de $10$. Ex : $\\frac{7}{10}$, $\\frac{314}{100}$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'arrondi',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Valeur approchée d'un nombre obtenue en tronquant puis ajustant le dernier chiffre conservé. Ex : $3{,}14$ arrondi au dixieme est $3{,}1$."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'arrondir',
		tags: ['décimaux'],
		grade: 'CM2',
		derivedFrom: 'arrondi'
	},
	{
		term: 'décimal',
		tags: ['décimaux'],
		grade: 'CM1',
		derivedFrom: 'nombre décimal'
	},
	{
		term: 'décimale',
		tags: ['décimaux'],
		grade: 'CM1',
		derivedFrom: 'nombre décimal'
	},
	{
		term: 'troncature',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Valeur approchée obtenue en supprimant les chiffres au-delà d'un rang donné, sans arrondir."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'valeur approchée',
		tags: ['décimaux'],
		definitions: {
			items: [{ grade: '6', content: "Nombre proche d'un nombre exact, par excès ou par défaut." }]
		},
		grade: 'CM2'
	},
	{
		term: 'encadrement',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						"Encadrer un nombre $x$, c'est trouver deux nombres $a$ et $b$ tels que $a \\leq x \\leq b$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'intercaler',
		tags: ['décimaux'],
		definitions: {
			items: [{ grade: '6', content: 'Placer un nombre entre deux autres sur la droite graduée.' }]
		},
		grade: 'CM1'
	},

	// =========================================================================
	// FRACTIONS
	// =========================================================================
	{
		term: 'fraction',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Écriture de la forme $\\frac{a}{b}$ où $a$ est le numérateur et $b$ le dénominateur ($b \\neq 0$).'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'numérateur',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Nombre situé au-dessus de la barre de fraction. Dans $\\frac{3}{4}$, le numérateur est $3$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'dénominateur',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Nombre situé sous la barre de fraction. Dans $\\frac{3}{4}$, le dénominateur est $4$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'fraction irréductible',
		tags: ['fractions', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Fraction dont le numérateur et le dénominateur n'ont pas de diviseur commun autre que $1$. Ex : $\\frac{3}{4}$ est irréductible."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'simplifier une fraction',
		tags: ['fractions', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Diviser le numérateur et le dénominateur par un même nombre. Ex : $\\frac{6}{8} = \\frac{3}{4}$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'fractions egales',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Deux fractions sont égales si elles représentent le même nombre. Ex : $\\frac{1}{2} = \\frac{2}{4}$.'
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'mise au même dénominateur',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						"Transformer des fractions pour qu'elles aient le même dénominateur, afin de les comparer ou les additionner."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'inverse',
		tags: ['fractions', 'operations'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"L'inverse d'un nombre $a \\neq 0$ est $\\frac{1}{a}$. Ex : l'inverse de $3$ est $\\frac{1}{3}$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'fractionnaire',
		tags: ['fractions'],
		grade: 'CM1',
		derivedFrom: 'fraction'
	},
	{
		term: 'simplification',
		tags: ['fractions', 'calcul-littéral'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Action de simplifier une fraction ou une expression.' }]
		},
		grade: '5'
	},
	{
		term: 'simplifier',
		tags: ['fractions', 'arithmétique'],
		grade: '5',
		derivedFrom: 'simplifier une fraction'
	},

	// =========================================================================
	// RELATIFS
	// =========================================================================
	{
		term: 'nombre relatif',
		tags: ['relatifs'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Nombre muni d'un signe ($+$ ou $-$). L'ensemble des relatifs est $\\mathbb{Z} = \\{\\ldots, -2, -1, 0, 1, 2, \\ldots\\}$."
				}
			]
		},
		grade: '5',
		synonyms: ['relatif', 'entier relatif']
	},
	{
		term: 'positif',
		tags: ['relatifs'],
		definitions: {
			items: [{ grade: '5', content: "Un nombre est positif s'il est supérieur ou égal à $0$." }]
		},
		grade: '5'
	},
	{
		term: 'négatif',
		tags: ['relatifs'],
		definitions: {
			items: [{ grade: '5', content: "Un nombre est négatif s'il est inférieur ou égal à $0$." }]
		},
		grade: '5'
	},
	{
		term: 'opposé',
		tags: ['relatifs'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"L'opposé d'un nombre $a$ est $-a$. Leur somme vaut $0$. Ex : l'opposé de $3$ est $-3$."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'valeur absolue',
		tags: ['relatifs'],
		definitions: {
			items: [{ grade: '5', content: "Distance d'un nombre à zéro. $|{-3}| = |3| = 3$." }]
		},
		grade: '4'
	},
	{
		term: 'signe',
		tags: ['relatifs'],
		definitions: {
			items: [
				{ grade: '4', content: "Indication positive ($+$) ou négative ($-$) d'un nombre relatif." }
			]
		},
		grade: '5'
	},
	{
		term: 'distance a zero',
		tags: ['relatifs'],
		definitions: {
			items: [{ grade: '5', content: "La distance à zéro d'un nombre est sa valeur absolue." }]
		},
		grade: '5',
		synonyms: ['valeur absolue']
	},
	{
		term: 'irrationnel',
		tags: ['relatifs'],
		grade: '3',
		derivedFrom: 'nombre relatif'
	},
	{
		term: 'rationnel',
		tags: ['relatifs'],
		grade: '4',
		derivedFrom: 'nombre relatif'
	},
	{
		term: 'relatif',
		tags: ['relatifs'],
		grade: '5',
		derivedFrom: 'nombre relatif'
	},

	// =========================================================================
	// CALCUL LITTERAL
	// =========================================================================
	{
		term: 'expression',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Suite de nombres et de lettres reliés par des opérations. Ex : $3x + 2$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'expression litterale',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Expression contenant au moins une lettre représentant un nombre. Ex : $2a + b$.'
				}
			]
		},
		grade: '5',
		synonyms: ['expression algebrique']
	},
	{
		term: 'variable',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Lettre représentant un nombre inconnu ou pouvant varier. Ex : $x$ dans $2x + 3$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'équation',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{ grade: '5', content: 'Égalité contenant une inconnue à déterminer. Ex : $2x + 3 = 7$.' }
			]
		},
		grade: '4'
	},
	{
		term: 'inconnue',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Valeur à trouver dans une équation. Souvent notée $x$. Ex : dans $2x + 3 = 7$, l'inconnue est $x = 2$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'solution (équation)',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Valeur de l'inconnue qui rend l'équation vraie. Ex : $x = 2$ est la solution de $2x + 3 = 7$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'développer',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Transformer un produit en somme en utilisant la distributivité. Ex : $3(x + 2) = 3x + 6$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'factoriser',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{ grade: '4', content: 'Transformer une somme en produit. Ex : $3x + 6 = 3(x + 2)$.' }
			]
		},
		grade: '3'
	},
	{
		term: 'réduire',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '3',
					content: 'Regrouper les termes semblables dans une expression. Ex : $3x + 2x = 5x$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'distributivite',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Propriété : $a(b + c) = ab + ac$. Permet de développer ou factoriser.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'identité remarquable',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{ grade: '5', content: 'Formule algébrique classique. Ex : $(a + b)^2 = a^2 + 2ab + b^2$.' }
			]
		},
		grade: '3'
	},
	{
		term: 'coefficient',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Nombre qui multiplie une variable. Ex : dans $5x$, le coefficient de $x$ est $5$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'monome',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content: "Expression constituée d'un coefficient et de variables. Ex : $3x^2$."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'polynôme',
		tags: ['calcul-littéral'],
		definitions: { items: [{ grade: '3', content: 'Somme de monômes. Ex : $2x^2 + 3x - 1$.' }] },
		grade: '2'
	},
	{
		term: 'degre',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Plus grand exposant de la variable dans un polynôme. Ex : le degré de $2x^3 + x$ est $3$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'inéquation',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [{ grade: '2', content: 'Inégalité contenant une inconnue. Ex : $2x + 1 > 5$.' }]
		},
		grade: '4'
	},
	{
		term: "système d'equations",
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Ensemble de plusieurs équations à résoudre simultanément. Ex : $\\{x + y = 5;\\; x - y = 1\\}$.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'substituer',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Remplacer une variable par une valeur numérique. Ex : si $x = 3$, alors $2x + 1 = 7$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'algèbre',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Branche des mathématiques utilisant des lettres pour représenter des nombres.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'algébrique',
		tags: ['calcul-littéral'],
		grade: '4',
		derivedFrom: 'algèbre'
	},
	{
		term: 'développement',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{ grade: '4', content: 'Action de transformer un produit en somme par distributivité.' }
			]
		},
		grade: '4'
	},
	{
		term: 'factorisation',
		tags: ['calcul-littéral'],
		definitions: {
			items: [{ grade: '4', content: 'Action de transformer une somme en produit.' }]
		},
		grade: '3'
	},
	{
		term: 'inégalité',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Relation d'ordre entre deux expressions : $<$, $>$, $\\leq$, $\\geq$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'littéral',
		tags: ['calcul-littéral'],
		grade: '5',
		derivedFrom: 'expression litterale'
	},
	{
		term: 'resoudre',
		tags: ['calcul-littéral', 'équations'],
		grade: '4',
		derivedFrom: 'solution (équation)'
	},
	{
		term: 'solution',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [{ grade: '4', content: 'Valeur qui vérifie une équation ou un problème.' }]
		},
		grade: '4',
		derivedFrom: 'solution (équation)'
	},

	// =========================================================================
	// GRANDEURS ET MESURES
	// =========================================================================
	{
		term: 'périmètre',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Longueur du contour d'une figure. Ex : le périmètre d'un rectangle est $2(L + l)$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'aire',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Mesure de la surface d'une figure. Ex : l'aire d'un rectangle est $L \\times l$."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'volume',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Mesure de l'espace occupé par un solide. Ex : le volume d'un pavé droit est $L \\times l \\times h$."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'conversion',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content: "Passage d'une unité à une autre. Ex : $1\\,\\text{km} = 1000\\,\\text{m}$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'longueur',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Grandeur mesurant une distance. Unités : $\\text{mm}$, $\\text{cm}$, $\\text{m}$, $\\text{km}$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'masse',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Grandeur mesurant la quantité de matière. Unités : $\\text{g}$, $\\text{kg}$, $\\text{t}$.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'capacite',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: "Volume d'un récipient. Unités : $\\text{mL}$, $\\text{cL}$, $\\text{L}$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'durée',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: 'Grandeur mesurant un intervalle de temps. Unités : secondes, minutes, heures.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'grandeur',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: 'Ce qui peut être mesuré : longueur, masse, durée, aire, volume, etc.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'vitesse',
		tags: ['grandeurs', 'proportionnalité'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Rapport entre une distance et un temps. $v = \\frac{d}{t}$. Unités : $\\text{km/h}$, $\\text{m/s}$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'angle',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content: 'Figure formée par deux demi-droites de même origine. Se mesure en degrés ($°$).'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'angle droit',
		tags: ['grandeurs', 'géométrie'],
		definitions: { items: [{ grade: 'CE2', content: 'Angle mesurant $90°$.' }] },
		grade: 'CE1'
	},
	{
		term: 'angle aigu',
		tags: ['grandeurs', 'géométrie'],
		definitions: { items: [{ grade: 'CE1', content: 'Angle mesurant moins de $90°$.' }] },
		grade: 'CM1'
	},
	{
		term: 'angle obtus',
		tags: ['grandeurs', 'géométrie'],
		definitions: { items: [{ grade: 'CM1', content: 'Angle mesurant entre $90°$ et $180°$.' }] },
		grade: 'CM1'
	},
	{
		term: 'centimètre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Unité de longueur. $1\\,\\text{cm} = 0{,}01\\,\\text{m}$.' }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'construction',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Réalisation d'une figure géométrique à l'aide d'instruments." }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'construire',
		tags: ['géométrie'],
		grade: 'CE1',
		derivedFrom: 'construction'
	},
	{
		term: 'convertir',
		tags: ['grandeurs'],
		grade: 'CE2',
		derivedFrom: 'conversion'
	},
	{
		term: 'décamètre',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Unité de longueur. $1\\,\\text{dam} = 10\\,\\text{m}$.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'décimètre',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Unité de longueur. $1\\,\\text{dm} = 0{,}1\\,\\text{m}$.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'distance',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Longueur du plus court chemin entre deux points.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'gradué',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Muni d'une graduation. Ex : droite graduée, règle graduée." }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'graduer',
		tags: ['grandeurs'],
		grade: '6',
		derivedFrom: 'gradué'
	},
	{
		term: 'hauteur',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [{ grade: '6', content: "Dimension verticale d'un objet ou d'une figure." }]
		},
		grade: 'CE1'
	},
	{
		term: 'hectomètre',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Unité de longueur. $1\\,\\text{hm} = 100\\,\\text{m}$.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'kilomètre',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Unité de longueur. $1\\,\\text{km} = 1000\\,\\text{m}$.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'largeur',
		tags: ['grandeurs', 'géométrie'],
		definitions: { items: [{ grade: 'CE1', content: "Plus petite dimension d'un rectangle." }] },
		grade: 'CE1'
	},
	{
		term: 'mesure',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CE1', content: "Évaluation d'une grandeur à l'aide d'une unité." }]
		},
		grade: 'CE1'
	},
	{
		term: 'mesurer',
		tags: ['grandeurs'],
		grade: 'CE1',
		derivedFrom: 'mesure'
	},
	{
		term: 'mètre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{ grade: 'CE1', content: 'Unité de base du système international pour les longueurs.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'millimètre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{ grade: 'CP', content: 'Unité de longueur. $1\\,\\text{mm} = 0{,}001\\,\\text{m}$.' }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'surface',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [{ grade: 'CE1', content: "Étendue d'une figure plane. Synonyme d'aire." }]
		},
		grade: 'CM1'
	},

	// =========================================================================
	// PROPORTIONNALITE
	// =========================================================================
	{
		term: 'proportionnel',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Deux grandeurs sont proportionnelles si l'une est obtenue en multipliant l'autre par un même nombre constant."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'coefficient de proportionnalité',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content: "Constante par laquelle on multiplie une grandeur pour obtenir l'autre."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'tableau de proportionnalité',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Tableau dans lequel les valeurs de deux grandeurs proportionnelles sont en correspondance.'
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'pourcentage',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content: 'Proportion exprimée sur $100$. Ex : $25\\%$ signifie $\\frac{25}{100}$.'
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'échelle',
		tags: ['proportionnalité', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						"Rapport entre les dimensions d'une représentation et les dimensions réelles. Ex : échelle $1/1000$."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'produit en croix',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						'Méthode pour trouver une valeur manquante dans un tableau de proportionnalité : $\\frac{a}{b} = \\frac{c}{d} \\Rightarrow a \\times d = b \\times c$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'taux',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Rapport exprimé en pourcentage. Ex : un taux de $5\\%$ signifie $\\frac{5}{100}$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'augmentation',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Variation positive d'une grandeur. Augmenter de $20\\%$ : multiplier par $1{,}2$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'diminution',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Variation négative d'une grandeur. Diminuer de $20\\%$ : multiplier par $0{,}8$."
				}
			]
		},
		grade: '4',
		synonyms: ['reduction']
	},
	{
		term: 'coefficient multiplicateur',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Nombre par lequel on multiplie pour appliquer une variation. Ex : $+20\\% \\Rightarrow \\times 1{,}2$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'proportion',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{ grade: '2', content: 'Égalité de deux rapports. Ex : $\\frac{a}{b} = \\frac{c}{d}$.' }
			]
		},
		grade: 'CM2'
	},
	{
		term: 'proportionnalité',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{ grade: 'CM2', content: 'Relation entre deux grandeurs dont le rapport est constant.' }
			]
		},
		grade: 'CM2'
	},
	{
		term: 'rapport',
		tags: ['proportionnalité'],
		definitions: {
			items: [{ grade: 'CM2', content: 'Quotient de deux grandeurs. Ex : rapport $\\frac{a}{b}$.' }]
		},
		grade: '6'
	},
	{
		term: 'ratio',
		tags: ['proportionnalité'],
		definitions: {
			items: [{ grade: '6', content: 'Rapport entre deux quantités. Synonyme de rapport.' }]
		},
		grade: '6'
	},

	// =========================================================================
	// PUISSANCES
	// =========================================================================
	{
		term: 'puissance',
		tags: ['puissances'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'$a^n$ est le produit de $n$ facteurs égaux a $a$. Ex : $2^3 = 2 \\times 2 \\times 2 = 8$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'exposant',
		tags: ['puissances'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Nombre indiquant combien de fois la base est multipliée par elle-même. Dans $a^n$, $n$ est l'exposant."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'base',
		tags: ['puissances'],
		definitions: {
			items: [{ grade: '4', content: 'Nombre élevé à une puissance. Dans $a^n$, $a$ est la base.' }]
		},
		grade: '4'
	},
	{
		term: 'carré',
		tags: ['puissances', 'entiers'],
		definitions: {
			items: [
				{
					grade: '4',
					content: "Deuxième puissance d'un nombre. $a^2 = a \\times a$. Ex : $5^2 = 25$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'cube',
		tags: ['puissances', 'entiers'],
		definitions: {
			items: [
				{
					grade: '6',
					content: "Troisième puissance d'un nombre. $a^3 = a \\times a \\times a$. Ex : $2^3 = 8$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'notation scientifique',
		tags: ['puissances'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Écriture d'un nombre sous la forme $a \\times 10^n$ avec $1 \\leq a < 10$. Ex : $0{,}003 = 3 \\times 10^{-3}$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'puissance de dix',
		tags: ['puissances'],
		definitions: {
			items: [
				{
					grade: '4',
					content: 'Nombre de la forme $10^n$. Ex : $10^3 = 1000$, $10^{-2} = 0{,}01$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'exposant négatif',
		tags: ['puissances'],
		definitions: {
			items: [{ grade: '4', content: '$a^{-n} = \\frac{1}{a^n}$. Ex : $2^{-3} = \\frac{1}{8}$.' }]
		},
		grade: '4'
	},

	// =========================================================================
	// RACINES CARREES
	// =========================================================================
	{
		term: 'racine carree',
		tags: ['racines-carrees'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'$\\sqrt{a}$ est le nombre positif dont le carré vaut $a$. Ex : $\\sqrt{25} = 5$.'
				}
			]
		},
		grade: '3',
		synonyms: ['racine']
	},
	{
		term: 'racine',
		tags: ['racines-carrees'],
		definitions: { items: [{ grade: '3', content: "Racine carrée d'un nombre. $\\sqrt{a}$." }] },
		grade: '3',
		derivedFrom: 'racine carree'
	},
	{
		term: 'radical',
		tags: ['racines-carrees'],
		definitions: {
			items: [{ grade: '3', content: 'Symbole $\\sqrt{\\phantom{x}}$ désignant la racine carrée.' }]
		},
		grade: '3'
	},
	{
		term: 'carré parfait',
		tags: ['racines-carrees', 'entiers'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Entier qui est le carré d'un autre entier. Ex : $1, 4, 9, 16, 25, 36, \\ldots$"
				}
			]
		},
		grade: '3'
	},

	// =========================================================================
	// FONCTIONS
	// =========================================================================
	{
		term: 'fonction',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Relation qui associe à chaque élément d'un ensemble de départ un unique élément d'un ensemble d'arrivée."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'image',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"$f(x)$ est l'image de $x$ par la fonction $f$. Ex : si $f(x) = 2x$, l'image de $3$ est $6$."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'antécédent',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'$x$ est un antécédent de $y$ par $f$ si $f(x) = y$. Ex : $3$ est un antécédent de $6$ par $f(x) = 2x$.'
				}
			]
		},
		grade: '3',
		synonyms: ['antécédent']
	},
	{
		term: 'fonction linéaire',
		tags: ['fonctions', 'proportionnalité'],
		definitions: {
			items: [
				{
					grade: '3',
					content: 'Fonction de la forme $f(x) = ax$. Représente une situation de proportionnalité.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'fonction affine',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Fonction de la forme $f(x) = ax + b$. Sa représentation graphique est une droite.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'croissante',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Une fonction est croissante sur un intervalle si, quand $x$ augmente, $f(x)$ augmente.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'croissant',
		tags: ['fonctions'],
		grade: '3',
		derivedFrom: 'croissante'
	},
	{
		term: 'décroissante',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Une fonction est décroissante sur un intervalle si, quand $x$ augmente, $f(x)$ diminue.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'décroissant',
		tags: ['fonctions'],
		grade: '3',
		derivedFrom: 'décroissante'
	},
	{
		term: 'maximum',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: '3', content: 'Plus grande valeur atteinte par une fonction sur un intervalle.' }
			]
		},
		grade: '2'
	},
	{
		term: 'minimum',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: '2', content: 'Plus petite valeur atteinte par une fonction sur un intervalle.' }
			]
		},
		grade: '2'
	},
	{
		term: 'courbe représentative',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Ensemble des points $(x, f(x))$ dans un repère. Représentation graphique d'une fonction."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'courbe',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: '2', content: 'Ligne représentant graphiquement une fonction ou une relation.' }
			]
		},
		grade: '3'
	},
	{
		term: 'representer',
		tags: ['fonctions'],
		grade: '2',
		derivedFrom: 'courbe représentative'
	},
	{
		term: 'abscisse',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Coordonnée horizontale d'un point dans un repère. Première coordonnée du couple $(x, y)$."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'ordonnée',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Coordonnée verticale d'un point dans un repère. Deuxième coordonnée du couple $(x, y)$."
				}
			]
		},
		grade: '5'
	},
	{
		term: "ordonnée à l'origine",
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Valeur $f(0)$, le point où la courbe coupe l'axe des ordonnées. Pour $f(x) = ax + b$, c'est $b$."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'coefficient directeur',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Pente d'une droite. Pour $f(x) = ax + b$, le coefficient directeur est $a$."
				}
			]
		},
		grade: '3',
		synonyms: ['pente']
	},
	{
		term: 'repère',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Système d'axes perpendiculaires gradué permettant de représenter des points par leurs coordonnées."
				}
			]
		},
		grade: '5',
		synonyms: ['repere orthonorme']
	},
	{
		term: 'tableau de valeurs',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Tableau donnant des couples $(x, f(x))$ pour représenter une fonction.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'tableau de signes',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Tableau indiquant les intervalles où une expression est positive, négative ou nulle.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'tableau de variations',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content: "Tableau résumant les intervalles de croissance et décroissance d'une fonction."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'fonction carrée',
		tags: ['fonctions'],
		definitions: {
			items: [{ grade: '2', content: 'Fonction $f(x) = x^2$. Sa courbe est une parabole.' }]
		},
		grade: '2'
	},
	{
		term: 'fonction inverse',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content: 'Fonction $f(x) = \\frac{1}{x}$ ($x \\neq 0$). Sa courbe est une hyperbole.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'fonction racine carrée',
		tags: ['fonctions', 'racines-carrees'],
		definitions: {
			items: [{ grade: '2', content: 'Fonction $f(x) = \\sqrt{x}$ définie pour $x \\geq 0$.' }]
		},
		grade: '2'
	},
	{
		term: 'dérivée',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Fonction $f'$ qui donne le taux de variation instantané de $f$. $f'(a)$ est la pente de la tangente en $a$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'tangente',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Droite qui touche la courbe en un point et à la même pente que la courbe en ce point.'
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'nombre dérivé',
		tags: ['fonctions'],
		definitions: {
			items: [{ grade: '1_SPE', content: "Valeur de la dérivée en un point : $f'(a)$." }]
		},
		grade: '1_SPE'
	},
	{
		term: 'taux de variation',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: '$\\frac{f(b) - f(a)}{b - a}$ : variation moyenne de $f$ entre $a$ et $b$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'extremum',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content: "Maximum ou minimum local d'une fonction. En un extremum, $f'(a) = 0$."
				}
			]
		},
		grade: '1_SPE',
		synonyms: ['extrema']
	},
	{
		term: 'fonction exponentielle',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Fonction $f(x) = e^x$ ($\\exp(x)$). Seule fonction égale à sa propre dérivée avec $f(0) = 1$.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'fonction logarithme',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Fonction $\\ln(x)$ définie pour $x > 0$. Réciproque de l'exponentielle : $\\ln(e^x) = x$."
				}
			]
		},
		grade: 'T_SPE',
		synonyms: ['logarithme neperien']
	},
	{
		term: 'intervalle',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						'Ensemble de nombres réels compris entre deux bornes. Ex : $[2; 5]$, $]-\\infty; 3[$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'ensemble de définition',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: '2', content: 'Ensemble des valeurs de $x$ pour lesquelles $f(x)$ est définie.' }
			]
		},
		grade: '2'
	},
	{
		term: 'primitive',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content: "Fonction $F$ telle que $F' = f$. Ex : une primitive de $2x$ est $x^2$."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'continu',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: 'T_SPE', content: "Se dit d'une fonction sans saut ni trou sur un intervalle." }
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'continuité',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content: "Propriété d'une fonction continue : pas de rupture dans la courbe."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'dériver',
		tags: ['fonctions'],
		grade: '1_SPE',
		derivedFrom: 'dérivée'
	},
	{
		term: 'exponentielle',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: 'Fonction $f(x) = e^x$. Seule fonction égale à sa propre dérivée.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'intégrale',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content: "Outil du calcul intégral. $\\int_a^b f(x)\\,dx$ mesure l'aire sous la courbe."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'intégrer',
		tags: ['fonctions'],
		grade: 'T_SPE',
		derivedFrom: 'intégrale'
	},
	{
		term: 'limite',
		tags: ['fonctions', 'suites'],
		definitions: {
			items: [{ grade: 'T_SPE', content: 'Valeur vers laquelle tend une suite ou une fonction.' }]
		},
		grade: 'T_SPE'
	},
	{
		term: 'logarithme',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: 'T_SPE', content: "Fonction réciproque de l'exponentielle. $\\ln(e^x) = x$." }
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'coordonnée',
		tags: ['géométrie', 'fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content: "Nombre repérant la position d'un point sur un axe ou dans un plan."
				}
			]
		},
		grade: '5'
	},

	// =========================================================================
	// SUITES
	// =========================================================================
	{
		term: 'suite',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Fonction de $\\mathbb{N}$ dans $\\mathbb{R}$. Liste ordonnée de nombres : $u_0, u_1, u_2, \\ldots$'
				}
			]
		},
		grade: '1_SPE',
		synonyms: ['suite numerique']
	},
	{
		term: 'terme (suite)',
		tags: ['suites'],
		definitions: {
			items: [{ grade: '1_SPE', content: "Élément d'une suite. $u_n$ est le terme de rang $n$." }]
		},
		grade: '1_SPE'
	},
	{
		term: 'rang',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: "Indice d'un terme dans une suite. Dans $u_5$, le rang est $5$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'raison',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Constante $r$ telle que $u_{n+1} = u_n + r$ (arithmétique) ou $u_{n+1} = u_n \\times q$ (géométrique, notée $q$).'
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'suite arithmétique',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Suite telle que $u_{n+1} = u_n + r$ (raison constante). Ex : $2, 5, 8, 11, \\ldots$ (raison $3$).'
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'suite géométrique',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Suite telle que $u_{n+1} = u_n \\times q$ ($q$ constante). Ex : $3, 6, 12, 24, \\ldots$ (raison $2$).'
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'suite croissante',
		tags: ['suites'],
		definitions: {
			items: [{ grade: '1_SPE', content: 'Suite telle que $u_{n+1} \\geq u_n$ pour tout $n$.' }]
		},
		grade: '1_SPE'
	},
	{
		term: 'suite décroissante',
		tags: ['suites'],
		definitions: {
			items: [{ grade: '1_SPE', content: 'Suite telle que $u_{n+1} \\leq u_n$ pour tout $n$.' }]
		},
		grade: '1_SPE'
	},
	{
		term: 'convergente',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: "Suite qui tend vers une limite finie quand $n$ tend vers l'infini."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'divergente',
		tags: ['suites'],
		definitions: {
			items: [
				{ grade: 'T_SPE', content: "Suite qui ne converge pas (tend vers l'infini ou oscille)." }
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'terme général',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content: 'Formule explicite donnant $u_n$ en fonction de $n$. Ex : $u_n = 3n + 2$.'
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'récurrence',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Relation définissant chaque terme à partir du (ou des) précédent(s). Ex : $u_{n+1} = 2u_n + 1$.'
				}
			]
		},
		grade: '1_SPE',
		synonyms: ['relation de recurrence']
	},
	{
		term: 'consécutif',
		tags: ['transversal'],
		grade: '6',
		derivedFrom: 'suite'
	},
	{
		term: 'série',
		tags: ['suites'],
		definitions: {
			items: [{ grade: '6', content: "Somme des termes d'une suite. $S_n = \\sum_{k=0}^{n} u_k$." }]
		},
		grade: 'T_SPE'
	},

	// =========================================================================
	// PROBABILITES
	// =========================================================================
	{
		term: 'probabilité',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content: "Nombre entre $0$ et $1$ mesurant la chance qu'un événement se produise."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'expérience aléatoire',
		tags: ['probabilités'],
		definitions: {
			items: [
				{ grade: '5', content: 'Expérience dont le résultat dépend du hasard. Ex : lancer un dé.' }
			]
		},
		grade: '5'
	},
	{
		term: 'issue',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Résultat possible d'une expérience aléatoire. Ex : obtenir $3$ en lançant un dé."
				}
			]
		},
		grade: '5',
		synonyms: ['eventualite']
	},
	{
		term: 'événement',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Ensemble d'issues. Ex : obtenir un nombre pair en lançant un dé ($\\{2, 4, 6\\}$)."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'univers',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Ensemble de toutes les issues possibles. Ex : pour un dé, $\\Omega = \\{1, 2, 3, 4, 5, 6\\}$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'équiprobabilité',
		tags: ['probabilités'],
		definitions: {
			items: [{ grade: '5', content: 'Situation où toutes les issues ont la même probabilité.' }]
		},
		grade: '5'
	},
	{
		term: 'événement contraire',
		tags: ['probabilités'],
		definitions: {
			items: [{ grade: '5', content: "Complémentaire d'un événement. $P(\\bar{A}) = 1 - P(A)$." }]
		},
		grade: '5'
	},
	{
		term: 'arbre de probabilités',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Schéma en arbre représentant les étapes successives d'une expérience aléatoire et les probabilités associées."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'fréquence',
		tags: ['probabilités', 'statistiques'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Rapport du nombre d'occurrences d'un événement au nombre total d'expériences. $f = \\frac{\\text{effectif}}{\\text{total}}$."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'loi de probabilité',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Tableau associant à chaque issue sa probabilité. La somme des probabilités vaut $1$.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'variable aléatoire',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Fonction associant un nombre réel à chaque issue d'une expérience aléatoire."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'espérance',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: "Valeur moyenne d'une variable aléatoire. $E(X) = \\sum x_i \\cdot P(X = x_i)$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'combinaison',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: 'Nombre de façons de choisir $k$ éléments parmi $n$ : $\\binom{n}{k}$.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'permutation',
		tags: ['probabilités'],
		definitions: {
			items: [
				{ grade: 'T_SPE', content: "Arrangement ordonné de tous les éléments d'un ensemble." }
			]
		},
		grade: 'T_SPE'
	},

	// =========================================================================
	// STATISTIQUES
	// =========================================================================
	{
		term: 'moyenne',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						'Somme des valeurs divisée par le nombre de valeurs. $\\bar{x} = \\frac{\\sum x_i}{n}$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'médiane',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '6',
					content: 'Valeur qui partage une série ordonnée en deux parties de même effectif.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'étendue',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '5',
					content: "Différence entre la plus grande et la plus petite valeur d'une série."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'effectif',
		tags: ['statistiques'],
		definitions: {
			items: [
				{ grade: '5', content: "Nombre de fois qu'une valeur apparaît dans une série statistique." }
			]
		},
		grade: '5'
	},
	{
		term: 'diagramme',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Représentation graphique de données statistiques (barres, circulaire, etc.).'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'quartile',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Valeurs qui partagent une série ordonnée en quatre parties de même effectif ($Q_1$, $Q_2$, $Q_3$).'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'écart type',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'Mesure de la dispersion des valeurs autour de la moyenne. $\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'variance',
		tags: ['statistiques'],
		definitions: {
			items: [
				{ grade: '2', content: "Carré de l'écart type. $V = \\frac{\\sum (x_i - \\bar{x})^2}{n}$." }
			]
		},
		grade: '2'
	},
	{
		term: 'statistiques',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Branche des mathématiques traitant de la collecte, l'analyse et l'interprétation des données."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'statistique',
		tags: ['statistiques'],
		grade: '5',
		derivedFrom: 'statistiques'
	},

	// =========================================================================
	// GEOMETRIE (transversal pour fill-in-blanks)
	// =========================================================================
	{
		term: 'segment',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '5', content: "Partie d'une droite délimitée par deux points. Noté $[AB]$." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'droite',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CP', content: 'Ligne infinie, sans courbure. Notée $(AB)$.' }]
		},
		grade: 'CP'
	},
	{
		term: 'demi-droite',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Partie d'une droite ayant une origine mais pas de fin. Notée $[AB)$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'perpendiculaire',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: 'Deux droites sont perpendiculaires si elles forment un angle droit ($90°$).'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'parallèle',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE2', content: 'Deux droites sont parallèles si elles ne se coupent jamais.' }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'symétrie axiale',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Transformation qui associe à un point son symétrique par rapport à un axe.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'symétrie centrale',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content: 'Transformation qui associe à un point son symétrique par rapport à un centre.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'translation',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Transformation qui déplace chaque point de la même direction, du même sens et de la même distance.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'rotation',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Transformation qui fait tourner chaque point autour d'un centre, d'un angle donné."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'homothetie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Transformation qui agrandit ou réduit une figure par rapport à un centre et un rapport $k$.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'théorème de Pythagore',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Dans un triangle rectangle, $c^2 = a^2 + b^2$ où $c$ est l'hypoténuse."
				}
			]
		},
		grade: '4',
		synonyms: ['Pythagore']
	},
	{
		term: 'théorème de Thalès',
		tags: ['géométrie', 'proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Si deux droites parallèles coupent deux sécantes, alors elles déterminent des segments proportionnels.'
				}
			]
		},
		grade: '3',
		synonyms: ['Thales']
	},
	{
		term: 'hypoténuse',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Côté le plus long d'un triangle rectangle, opposé à l'angle droit."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'trigonométrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Étude des relations entre les angles et les côtés d'un triangle. Utilise $\\cos$, $\\sin$, $\\tan$."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'cosinus',
		tags: ['géométrie', 'trigonométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'$\\cos(\\alpha) = \\frac{\\text{adjacent}}{\\text{hypotenuse}}$ dans un triangle rectangle.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'sinus',
		tags: ['géométrie', 'trigonométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'$\\sin(\\alpha) = \\frac{\\text{oppose}}{\\text{hypotenuse}}$ dans un triangle rectangle.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'tangente (trigonométrie)',
		tags: ['géométrie', 'trigonométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'$\\tan(\\alpha) = \\frac{\\text{oppose}}{\\text{adjacent}}$ dans un triangle rectangle.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'cercle',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Ensemble des points situés à une même distance (rayon) d'un point (centre)."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'rayon',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Segment joignant le centre d'un cercle à un point du cercle." }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'diamètre',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Segment passant par le centre d'un cercle et joignant deux points du cercle. $d = 2r$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'triangle',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE1', content: 'Polygone à trois côtés.' }] },
		grade: 'CP'
	},
	{
		term: 'rectangle',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Quadrilatère ayant quatre angles droits.' }] },
		grade: 'CP'
	},
	{
		term: 'carré (géométrie)',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Rectangle ayant quatre côtés égaux.' }] },
		grade: 'CP'
	},
	{
		term: 'losange',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Quadrilatère ayant quatre côtés égaux.' }] },
		grade: 'CE2'
	},
	{
		term: 'parallélogramme',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE2', content: 'Quadrilatère dont les côtés opposés sont parallèles et égaux.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'trapeze',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Quadrilatère ayant exactement deux côtés parallèles.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'polygone',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content: 'Figure plane fermée délimitée par des segments. Ex : triangle, carré, hexagone.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'sommet',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE1', content: "Point de rencontre de deux côtés d'un polygone." }]
		},
		grade: 'CE1'
	},
	{
		term: 'côté',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE1', content: 'Segment délimitant un polygone.' }] },
		grade: 'CE1'
	},
	{
		term: 'diagonale',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Segment joignant deux sommets non consécutifs d'un polygone." }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'milieu',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Point qui partage un segment en deux parties égales.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'médiane (géométrie)',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Dans un triangle, segment joignant un sommet au milieu du côté opposé.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'médiatrice',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Droite perpendiculaire à un segment et passant par son milieu. Lieu des points équidistants des extrémités.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'bissectrice',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '6', content: 'Demi-droite qui partage un angle en deux angles égaux.' }]
		},
		grade: '6'
	},
	{
		term: 'hauteur (géométrie)',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content: "Droite passant par un sommet d'un triangle et perpendiculaire au côté opposé."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'vecteur',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Objet mathématique défini par une direction, un sens et une norme (longueur). Noté $\\vec{AB}$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'norme',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '2', content: "Longueur d'un vecteur. $\\|\\vec{u}\\| = \\sqrt{x^2 + y^2}$." }
			]
		},
		grade: '2'
	},
	{
		term: 'coordonnées',
		tags: ['géométrie', 'fonctions'],
		definitions: {
			items: [{ grade: '2', content: 'Couple de nombres $(x, y)$ repérant un point dans le plan.' }]
		},
		grade: '5'
	},
	{
		term: 'scalaire',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Produit scalaire de deux vecteurs : $\\vec{u} \\cdot \\vec{v} = \\|u\\|\\|v\\|\\cos(\\theta)$.'
				}
			]
		},
		grade: '1_SPE',
		synonyms: ['produit scalaire']
	},
	{
		term: 'adjacent',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '1_SPE', content: 'Se dit de deux angles ayant un côté commun.' }]
		},
		grade: '6'
	},
	{
		term: 'aigu',
		tags: ['géométrie'],
		definitions: { items: [{ grade: '6', content: "Se dit d'un angle mesurant moins de $90°$." }] },
		grade: 'CM1'
	},
	{
		term: 'aligne',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Se dit de points situés sur une même droite.' }]
		},
		grade: '6'
	},
	{
		term: 'aligner',
		tags: ['géométrie'],
		grade: '6',
		derivedFrom: 'aligne'
	},
	{
		term: 'arête',
		tags: ['géométrie'],
		definitions: { items: [{ grade: '6', content: "Segment commun à deux faces d'un solide." }] },
		grade: '6'
	},
	{
		term: 'axe',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '6', content: 'Droite de référence (axe de symétrie, axe des abscisses, etc.).' }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'barycentre',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE2', content: "Point d'équilibre d'un système de points pondérés." }]
		},
		grade: '1_SPE'
	},
	{
		term: 'centre',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: "Point équidistant de tous les points d'un cercle ou d'une sphère."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'codage',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Symboles placés sur une figure pour indiquer des propriétés (longueurs égales, angles droits, etc.).'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'coder',
		tags: ['géométrie'],
		grade: '6',
		derivedFrom: 'codage'
	},
	{
		term: 'compas',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content: 'Instrument de géométrie servant à tracer des cercles et reporter des longueurs.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'complémentaire',
		tags: ['géométrie'],
		grade: '5',
		derivedFrom: 'angle'
	},
	{
		term: 'cône',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '5', content: 'Solide ayant une base circulaire et un sommet pointu.' }]
		},
		grade: '5'
	},
	{
		term: 'cylindre',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '5', content: 'Solide ayant deux bases circulaires parallèles et égales.' }]
		},
		grade: '5'
	},
	{
		term: 'droit',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content: "Se dit d'un angle mesurant $90°$. Aussi : droite, une ligne infinie."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'ellipse',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content: 'Courbe fermée dont la somme des distances à deux foyers est constante.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'équerre',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '2', content: 'Instrument de géométrie en forme de triangle rectangle.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'équidistant',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE1', content: 'A égale distance de deux points ou objets.' }]
		},
		grade: '6'
	},
	{
		term: 'équilatéral',
		tags: ['géométrie'],
		grade: '6',
		derivedFrom: 'triangle'
	},
	{
		term: 'espace',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content: 'Ensemble à trois dimensions dans lequel se situent les objets géométriques.'
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'extrémité',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CM2', content: "Point aux bouts d'un segment." }] },
		grade: 'CE1'
	},
	{
		term: 'face',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE1', content: 'Surface plane délimitant un solide.' }] },
		grade: 'CE2'
	},
	{
		term: 'figure',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Dessin géométrique représentant des formes.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'forme',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE1', content: "Aspect extérieur d'un objet géométrique." }] },
		grade: 'CP'
	},
	{
		term: 'hexagone',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Polygone à six côtés.' }] },
		grade: 'CM1'
	},
	{
		term: 'hyperbole',
		tags: ['géométrie', 'fonctions'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Courbe formée de deux branches, représentant la fonction inverse ou une conique.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'hypothénuse',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Variante orthographique de hypoténuse (côté le plus long d'un triangle rectangle)."
				}
			]
		},
		grade: '4',
		derivedFrom: 'hypoténuse'
	},
	{
		term: 'isocèle',
		tags: ['géométrie'],
		grade: '6',
		derivedFrom: 'triangle'
	},
	{
		term: 'obtus',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '6', content: "Se dit d'un angle mesurant entre $90°$ et $180°$." }]
		},
		grade: 'CM1'
	},
	{
		term: 'octogone',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CM1', content: 'Polygone à huit côtés.' }] },
		grade: 'CM1'
	},
	{
		term: 'origine',
		tags: ['transversal', 'géométrie'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Point de référence sur une droite graduée ou dans un repère.' }
			]
		},
		grade: '6'
	},
	{
		term: 'orthogonal',
		tags: ['géométrie'],
		grade: '5',
		derivedFrom: 'perpendiculaire'
	},
	{
		term: 'parabole',
		tags: ['géométrie', 'fonctions'],
		definitions: {
			items: [{ grade: '5', content: 'Courbe en U représentant une fonction du second degré.' }]
		},
		grade: '2'
	},
	{
		term: 'patron',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '2', content: 'Figure plane qui, une fois pliée, forme un solide.' }]
		},
		grade: '6'
	},
	{
		term: 'pave',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '6', content: 'Solide à six faces rectangulaires (parallélépipède rectangle).' }
			]
		},
		grade: '6',
		synonyms: ['parallelepipede rectangle']
	},
	{
		term: 'pentagone',
		tags: ['géométrie'],
		definitions: { items: [{ grade: '6', content: 'Polygone à cinq côtés.' }] },
		grade: 'CM1'
	},
	{
		term: 'perspective',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM1', content: "Représentation d'un objet 3D sur un plan 2D." }]
		},
		grade: '6'
	},
	{
		term: 'pi',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Nombre $\\pi \\approx 3{,}14159$. Rapport du périmètre d'un cercle à son diamètre."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'plan',
		tags: ['géométrie'],
		definitions: { items: [{ grade: '6', content: 'Surface plane infinie à deux dimensions.' }] },
		grade: 'CE2'
	},
	{
		term: 'point',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Élément géométrique sans dimension, désigné par une lettre majuscule.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'prisme',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Solide dont les deux bases sont des polygones égaux et parallèles.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'pyramide',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Solide dont la base est un polygone et les faces latérales sont des triangles.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'pythagore',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '5', content: 'Mathématicien grec. Associé au théorème de Pythagore.' }]
		},
		grade: '4',
		derivedFrom: 'théorème de Pythagore'
	},
	{
		term: 'quadrilatere',
		tags: ['géométrie'],
		definitions: { items: [{ grade: '4', content: 'Polygone à quatre côtés.' }] },
		grade: 'CE2'
	},
	{
		term: 'quelconque',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Sans propriété particulière. Ex : triangle quelconque.' }]
		},
		grade: '6'
	},
	{
		term: 'radian',
		tags: ['géométrie', 'trigonométrie'],
		definitions: {
			items: [{ grade: '6', content: "Unité de mesure d'angle. $\\pi\\,\\text{rad} = 180°$." }]
		},
		grade: '2'
	},
	{
		term: 'rapporteur',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '2', content: 'Instrument de géométrie servant à mesurer des angles.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'regle',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Instrument de géométrie servant à tracer des droites et mesurer des longueurs.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'sécante',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Droite qui coupe une autre droite ou une courbe en un ou plusieurs points.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'secant',
		tags: ['géométrie'],
		grade: '4',
		derivedFrom: 'sécante'
	},
	{
		term: 'secteur',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '4', content: 'Portion de disque délimitée par deux rayons et un arc de cercle.' }
			]
		},
		grade: '6'
	},
	{
		term: 'concave',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '6', content: "Se dit d'une figure ou d'une courbe qui présente un creux." }]
		},
		grade: '4'
	},
	{
		term: 'convexe',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Se dit d'une figure ou d'une courbe qui ne présente pas de creux. Un segment joignant deux points de la figure reste à l'intérieur."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'solide',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '4', content: "Figure géométrique de l'espace à trois dimensions." }]
		},
		grade: 'CE2'
	},
	{
		term: 'sphère',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: "Ensemble des points de l'espace situés à une même distance d'un centre."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'sphérique',
		tags: ['géométrie'],
		grade: '5',
		derivedFrom: 'sphère'
	},
	{
		term: 'symétrie',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '5', content: 'Transformation géométrique (axiale ou centrale).' }]
		},
		grade: '6'
	},
	{
		term: 'symétrique',
		tags: ['géométrie'],
		grade: '6',
		derivedFrom: 'symétrie axiale'
	},
	{
		term: 'tangeant',
		tags: ['géométrie', 'trigonométrie'],
		definitions: { items: [{ grade: '6', content: 'Variante orthographique de tangente.' }] },
		grade: '3',
		derivedFrom: 'tangente (trigonométrie)'
	},
	{
		term: 'thales',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '3', content: 'Mathématicien grec. Associé au théorème de Thales.' }]
		},
		grade: '3',
		derivedFrom: 'théorème de Thalès'
	},

	// =========================================================================
	// LOGIQUE / ENSEMBLES (termes utiles)
	// =========================================================================
	{
		term: 'ensemble',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Collection d'éléments. Ex : $\\mathbb{N}$ (entiers naturels), $\\mathbb{R}$ (réels)."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'appartenir',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content: "Un élément appartient à un ensemble s'il en fait partie. $3 \\in \\mathbb{N}$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'inclusion',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content: '$A \\subset B$ signifie que tous les éléments de $A$ sont dans $B$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'union',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"$A \\cup B$ est l'ensemble des éléments qui sont dans $A$ ou dans $B$ (ou les deux)."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'intersection',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"$A \\cap B$ est l'ensemble des éléments qui sont à la fois dans $A$ et dans $B$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'réciproque',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"La réciproque de «si $A$ alors $B$» est «si $B$ alors $A$». Elle n'est pas toujours vraie."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'contraposée',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'La contraposée de «si $A$ alors $B$» est «si non $B$ alors non $A$». Elle est toujours équivalente.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'conjecture',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
					content: "Proposition que l'on suppose vraie mais qui n'a pas encore été démontrée."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'conjecturer',
		tags: ['logique'],
		grade: '4',
		derivedFrom: 'conjecture'
	},
	{
		term: 'déduire',
		tags: ['logique'],
		grade: '4',
		derivedFrom: 'démonstration'
	},
	{
		term: 'démonstration',
		tags: ['logique'],
		definitions: {
			items: [
				{ grade: '4', content: "Raisonnement logique prouvant qu'une proposition est vraie." }
			]
		},
		grade: '4'
	},
	{
		term: 'démontrer',
		tags: ['logique'],
		grade: '4',
		derivedFrom: 'démonstration'
	},
	{
		term: 'équivalence',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Relation logique : $A \\Leftrightarrow B$ signifie que $A$ et $B$ sont simultanément vraies ou fausses.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'hypothèse',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content: "Condition supposée vraie au départ d'un raisonnement ou d'un théorème."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'implication',
		tags: ['logique'],
		definitions: {
			items: [
				{ grade: '4', content: 'Relation logique : si $A$ alors $B$, notée $A \\Rightarrow B$.' }
			]
		},
		grade: '4'
	},
	{
		term: 'raisonnement',
		tags: ['logique'],
		definitions: {
			items: [{ grade: '4', content: "Suite logique d'arguments menant à une conclusion." }]
		},
		grade: '4'
	},
	{
		term: 'synthese',
		tags: ['logique'],
		definitions: {
			items: [
				{ grade: '4', content: 'Raisonnement partant des hypothèses pour arriver à la conclusion.' }
			]
		},
		grade: '4'
	},
	{
		term: 'théorème',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content: "Résultat mathématique démontré à partir d'axiomes ou d'autres théorèmes."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'propriété',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Caractéristique d'un objet mathématique qui a été démontrée. Ex : la somme des angles d'un triangle vaut $180°$."
				}
			]
		},
		grade: '6'
	},

	// =========================================================================
	// DIVERS
	// =========================================================================
	{
		term: 'shisma',
		tags: ['arithmétique'],
		definitions: {
			items: [
				{ grade: '6', content: 'Petit intervalle musical en théorie des nombres (terme rare).' }
			]
		},
		grade: 'T_SPE'
	}
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Returns all terms introduced at the given grade or earlier.
 * Uses hasAccessToGrade for proper prerequisite-based filtering.
 */
export function getTermsForGrade(grade: GradeCode): MathTerm[] {
	return MATH_DICTIONARY.filter((t) => hasAccessToGrade(grade, t.grade));
}

/**
 * Returns all terms matching the given tag.
 */
export function getTermsByTag(tag: string): MathTerm[] {
	return MATH_DICTIONARY.filter((t) => t.tags.includes(tag));
}

/**
 * Returns terms matching both a tag and a grade (introduced at or before).
 */
export function getTermsByTagAndGrade(tag: string, grade: GradeCode): MathTerm[] {
	return MATH_DICTIONARY.filter((t) => t.tags.includes(tag) && hasAccessToGrade(grade, t.grade));
}

/**
 * Returns all terms in the dictionary.
 */
export function getAllTerms(): MathTerm[] {
	return [...MATH_DICTIONARY];
}

export default MATH_DICTIONARY;
