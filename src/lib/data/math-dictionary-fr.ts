/**
 * Dictionnaire du vocabulaire mathématique, en français.
 * Lu par le glossaire (/glossaire) et par Mathémo (source des mots à deviner).
 *
 * Chaque définition est rangée à un niveau : la première au niveau du terme,
 * les suivantes à des niveaux plus avancés (tests de math-dictionary-fr.test.ts).
 * Relecture contre les programmes officiels : docs/wip/lexique/relecture-bo.md.
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

/** Pages du site vers lesquelles un terme peut renvoyer (« Voir aussi ») */
export type SeeAlsoPath =
	| '/chiffrement'
	| '/chiffrement/depeches'
	| '/chiffrement/cesar'
	| '/chiffrement/substitution'
	| '/chiffrement/vigenere'
	| '/chiffrement/affine'
	| '/chiffrement/hill'
	| '/chiffrement/rsa';

export interface MathTerm {
	term: string;
	/** Semantic disambiguation for homonyms (e.g., 'géométrie' vs 'puissances' for 'base'). */
	sense?: string;
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
	/** Page du site où la notion se pratique (lien « Voir aussi » du glossaire) */
	seeAlso?: { label: string; path: SeeAlsoPath };
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
					grade: 'CE2',
					content: "Résultat d'une soustraction. Ex : la différence de $8$ et $3$ est $5$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'produit',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE1',
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
					grade: '6',
					content: "Résultat d'une division. Dans $15 \\div 4 = 3$ reste $3$, le quotient est $3$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'reste',
		tags: ['transversal', 'operations', 'entiers'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Ce qu'il reste quand on enlève une partie. Ex : j'ai $10$ €, j'en dépense $7$, il me reste $3$ €."
				},
				{
					grade: 'CM1',
					content:
						'Ce qui reste après une division euclidienne. Dans $15 \\div 4 = 3$ reste $3$, le reste est $3$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'addition',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CP', content: 'Opération qui associe à deux nombres leur somme.' }]
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
			items: [
				{
					grade: 'CP',
					content:
						"Calcul qui permet de compter vite des paquets identiques. Ex : $3$ paquets de $4$ billes, c'est $3$ fois $4$ billes : $4 + 4 + 4 = 12$."
				},
				{ grade: 'CE1', content: 'Opération qui associe à deux nombres leur produit.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'division',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Opération qui associe à deux nombres leur quotient.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'égal',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
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
					grade: '6',
					content: "Valeur approchée d'un nombre, souvent arrondie à la dizaine, centaine, etc."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'opérateur',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{ grade: '5', content: 'Symbole indiquant une opération ($+$, $-$, $\\times$, $\\div$).' }
			]
		},
		grade: '5'
	},
	{
		term: 'terme',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Chaque élément d'une somme ou d'une suite. Ex : dans $3 + 5$, les termes sont $3$ et $5$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'facteur',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE2',
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
		grade: 'CP',
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
		derivedFrom: 'ordre'
	},
	{
		term: 'calculatrice',
		tags: ['transversal'],
		definitions: { items: [{ grade: 'CM1', content: 'Machine servant à effectuer des calculs.' }] },
		grade: 'CM1'
	},
	{
		term: 'convention',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: '4', content: 'Règle adoptée par accord. Ex : convention de signes.' }]
		},
		grade: '4'
	},
	{
		term: 'égalité',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
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
					grade: '6',
					content: 'Égalité exprimant une relation entre des grandeurs. Ex : $A = L \\times l$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'géométrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CM1', content: "Branche des mathématiques étudiant les figures et l'espace." }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'inférieur',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Plus petit que. Symbole : $<$ ou $\\leq$.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'infini',
		tags: ['transversal'],
		definitions: {
			items: [
				{ grade: '5', content: 'Concept désignant ce qui est sans fin. Symbole : $\\infty$.' }
			]
		},
		grade: '5'
	},
	{
		term: 'mathématiques',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CP', content: 'Science des nombres, des formes et des structures.' }]
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
			items: [
				{
					grade: 'CP',
					content:
						"Façon de ranger des nombres : dans l'ordre croissant, du plus petit au plus grand ; dans l'ordre décroissant, du plus grand au plus petit."
				},
				{ grade: 'CE1', content: 'Relation de comparaison entre nombres ($<$, $>$, $=$).' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'particulier',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: '6',
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
			items: [{ grade: 'CP', content: "Symbole $+$ de l'addition ou du signe positif." }]
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
		grade: 'CP'
	},
	{
		term: 'supérieur',
		tags: ['transversal'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Plus grand que. Symbole : $>$ ou $\\geq$.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'valeur',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Ce que vaut quelque chose. Ex : dans $35$, le chiffre $3$ vaut $3$ dizaines ; un billet de $10$ € a une valeur de $10$ euros.'
				},
				{ grade: '5', content: 'Nombre attribué à une variable ou à une expression.' }
			]
		},
		grade: 'CP'
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
					grade: '4',
					content:
						"Nombre entier positif ou nul. L'ensemble des entiers naturels est $\\mathbb{N} = \\{0, 1, 2, 3, \\ldots\\}$."
				}
			]
		},
		grade: '4'
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
					grade: 'CE1',
					content: "Nombre entier qui n'est pas divisible par $2$. Ex : $1, 3, 5, 7, 9, \\ldots$"
				}
			]
		},
		grade: 'CE1'
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
					grade: 'CE1',
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
		definitions: { items: [{ grade: 'CE2', content: 'Groupe de $1\\,000$ unités.' }] },
		grade: 'CE2'
	},
	{
		term: 'unité',
		tags: ['entiers', 'numération', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CP',
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
					grade: 'CE2',
					content:
						"Les multiples d'un nombre sont les résultats de sa table de multiplication. Ex : $12$ est un multiple de $3$, car $3 \\times 4 = 12$."
				},
				{
					grade: '5',
					content:
						'$a$ est un multiple de $b$ si $a = b \\times k$ avec $k$ entier. Ex : $12$ est un multiple de $3$.'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'diviseur',
		sense: 'arithmétique',
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
					grade: '5',
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
					grade: '3',
					content:
						"Écriture d'un entier comme produit de nombres premiers. Ex : $60 = 2^2 \\times 3 \\times 5$."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'PGCD',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content: 'Plus Grand Commun Diviseur de deux entiers. Ex : $\\text{PGCD}(12, 18) = 6$.'
				}
			]
		},
		grade: 'T_EXP',
		synonyms: ['plus grand commun diviseur']
	},
	{
		term: 'PPCM',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content: 'Plus Petit Commun Multiple de deux entiers. Ex : $\\text{PPCM}(4, 6) = 12$.'
				}
			]
		},
		grade: 'T_EXP',
		synonyms: ['plus petit commun multiple']
	},
	{
		term: 'critère de divisibilité',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Règle permettant de savoir si un nombre est divisible par un autre sans faire la division. Ex : un nombre est divisible par $3$ si la somme de ses chiffres est divisible par $3$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'division euclidienne',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Division « avec reste » de deux nombres entiers. Ex : $17$ divisé par $5$ : le quotient est $3$ et le reste est $2$, car $17 = 5 \\times 3 + 2$ et $2$ est plus petit que $5$.'
				},
				{
					grade: '5',
					content:
						"Division d'un entier $a$ par un entier $b \\neq 0$ donnant un quotient $q$ et un reste $r$ tels que $a = b \\times q + r$ avec $0 \\leq r < b$."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'dividende',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content: "Nombre que l'on divise. Dans $15 \\div 4$, le dividende est $15$."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'diviseur',
		sense: 'opération',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content: 'Nombre par lequel on divise. Dans $15 \\div 4$, le diviseur est $4$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'table de multiplication',
		tags: ['entiers', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE1',
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
					grade: 'CP',
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
			items: [{ grade: '5', content: "Le triple d'un nombre est ce nombre multiplié par $3$." }]
		},
		grade: '5'
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
				{ grade: 'CM1', content: "Le quadruple d'un nombre est ce nombre multiplié par $4$." }
			]
		},
		grade: 'CM1'
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
					grade: '5',
					content: 'Étude des propriétés des nombres entiers (divisibilité, premiers, etc.).'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'décomposition',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Écriture d'un nombre en plusieurs morceaux. Ex : $35 = 30 + 5$, ou $35$ = $3$ dizaines et $5$ unités."
				},
				{
					grade: '3',
					content:
						"Écriture d'un nombre comme produit de facteurs. Ex : $60 = 2^2 \\times 3 \\times 5$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'décomposer',
		tags: ['entiers', 'arithmétique'],
		grade: '4',
		derivedFrom: 'décomposition'
	},
	{
		term: 'diviseur',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Nombre qui divise exactement un autre nombre.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'entier',
		tags: ['entiers'],
		definitions: { items: [{ grade: 'CP', content: 'Nombre sans partie décimale.' }] },
		grade: 'CP'
	},
	{
		term: 'Euclide',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Mathématicien grec. Associé à la division euclidienne et l'algorithme d'Euclide."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'euclidienne',
		tags: ['entiers', 'arithmétique'],
		grade: 'CM1',
		derivedFrom: 'division euclidienne'
	},
	{
		term: 'numération',
		tags: ['entiers', 'numération'],
		definitions: {
			items: [
				{ grade: 'CE2', content: 'Système de représentation des nombres (décimal, binaire, etc.).' }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'premier',
		tags: ['entiers', 'arithmétique'],
		definitions: {
			items: [
				{ grade: '5', content: "Se dit d'un nombre n'ayant que deux diviseurs : $1$ et lui-même." }
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
					grade: 'CM1',
					content:
						"Nombre pouvant s'écrire sous forme de fraction décimale. Ex : $3{,}14 = \\frac{314}{100}$."
				}
			]
		},
		grade: 'CM1',
		synonyms: ['décimal']
	},
	{
		term: 'virgule',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Signe qui sépare les euros des centimes dans l'écriture d'un prix. Ex : $3{,}50$ € se lit « trois euros cinquante »."
				},
				{
					grade: 'CM1',
					content:
						"Signe séparant la partie entière de la partie décimale dans l'écriture d'un nombre décimal."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'partie entière',
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
		term: 'partie décimale',
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
		term: 'dixième',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Une part d'un tout partagé en dix parts égales." },
				{ grade: 'CM1', content: 'Premier rang après la virgule. $0{,}1 = \\frac{1}{10}$.' }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'centième',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Deuxième rang après la virgule. $0{,}01 = \\frac{1}{100}$.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'millième',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{ grade: 'CM2', content: 'Troisième rang après la virgule. $0{,}001 = \\frac{1}{1000}$.' }
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
					grade: 'CM1',
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
						"Valeur approchée d'un nombre obtenue en tronquant puis ajustant le dernier chiffre conservé. Ex : $3{,}14$ arrondi au dixième est $3{,}1$."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'arrondir',
		tags: ['décimaux'],
		grade: 'CM1',
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
					grade: '6',
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
		grade: '6'
	},
	{
		term: 'encadrement',
		tags: ['décimaux'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Encadrer un nombre, c'est trouver un nombre plus petit et un nombre plus grand que lui. Ex : $23$ est entre $20$ et $30$."
				},
				{
					grade: '5',
					content:
						"Encadrer un nombre $x$, c'est trouver deux nombres $a$ et $b$ tels que $a \\leq x \\leq b$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'intercaler',
		tags: ['décimaux'],
		definitions: {
			items: [{ grade: 'CP', content: 'Placer un nombre entre deux autres sur la droite graduée.' }]
		},
		grade: 'CP'
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
					grade: 'CE1',
					content:
						"Nombre qui sert à parler de parts égales d'un tout. Ex : $\\frac{1}{2}$ (un demi) : on partage en $2$ parts égales et on en prend $1$ ; $\\frac{3}{4}$ : on partage en $4$ et on en prend $3$."
				},
				{
					grade: '5',
					content:
						'Écriture de la forme $\\frac{a}{b}$ où $a$ est le numérateur et $b$ le dénominateur ($b \\neq 0$).'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'numérateur',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Nombre situé au-dessus de la barre de fraction. Dans $\\frac{3}{4}$, le numérateur est $3$.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'dénominateur',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Nombre situé sous la barre de fraction. Dans $\\frac{3}{4}$, le dénominateur est $4$.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'fraction irréductible',
		tags: ['fractions', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Fraction dont le numérateur et le dénominateur n'ont pas de diviseur commun autre que $1$. Ex : $\\frac{3}{4}$ est irréductible."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'simplifier une fraction',
		tags: ['fractions', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Diviser le numérateur et le dénominateur par un même nombre. Ex : $\\frac{6}{8} = \\frac{3}{4}$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'fractions égales',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Deux fractions sont égales si elles représentent le même nombre. Ex : $\\frac{1}{2} = \\frac{2}{4}$.'
				}
			]
		},
		grade: 'CE2'
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
		grade: 'CM2'
	},
	{
		term: 'inverse',
		tags: ['fractions', 'operations'],
		definitions: {
			items: [
				{
					grade: '4',
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
			items: [{ grade: '6', content: 'Action de simplifier une fraction ou une expression.' }]
		},
		grade: '6'
	},
	{
		term: 'simplifier',
		tags: ['fractions', 'arithmétique'],
		grade: '5',
		derivedFrom: 'simplification'
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
			items: [
				{
					grade: '5',
					content:
						"Distance d'un nombre à zéro sur une droite graduée. Ex : la valeur absolue de $-3$ et celle de $3$ valent toutes deux $3$."
				},
				{ grade: '2', content: "Distance d'un nombre à zéro. $|{-3}| = |3| = 3$." }
			]
		},
		grade: '5'
	},
	{
		term: 'signe',
		tags: ['relatifs'],
		definitions: {
			items: [
				{ grade: '5', content: "Indication positive ($+$) ou négative ($-$) d'un nombre relatif." }
			]
		},
		grade: '5'
	},
	{
		term: 'distance à zéro',
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
		term: 'expression littérale',
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
		synonyms: ['expression algébrique']
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
		grade: '5'
	},
	{
		term: 'inconnue',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Nombre qu'on ne connaît pas encore et qu'on cherche. On peut le représenter par un symbole ($\\square$, $?$) ou par une lettre."
				},
				{
					grade: '5',
					content:
						"Valeur à trouver dans une équation. Souvent notée $x$. Ex : dans $2x + 3 = 7$, l'inconnue est $x = 2$."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'solution',
		sense: 'équation',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Valeur de l'inconnue qui rend l'équation vraie. Ex : $x = 2$ est la solution de $2x + 3 = 7$."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'développer',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Transformer un produit en somme en utilisant la distributivité. Ex : $3(x + 2) = 3x + 6$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'factoriser',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{ grade: '5', content: 'Transformer une somme en produit. Ex : $3x + 6 = 3(x + 2)$.' }
			]
		},
		grade: '5'
	},
	{
		term: 'réduire',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content: 'Regrouper les termes semblables dans une expression. Ex : $3x + 2x = 5x$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'distributivité',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Propriété qui permet de calculer un produit en le découpant. Ex : $7 \\times 12 = 7 \\times 10 + 7 \\times 2 = 70 + 14 = 84$.'
				},
				{
					grade: '5',
					content: 'Propriété : $a(b + c) = ab + ac$. Permet de développer ou factoriser.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'identité remarquable',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{ grade: '3', content: 'Formule algébrique classique. Ex : $(a + b)^2 = a^2 + 2ab + b^2$.' }
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
					grade: '5',
					content:
						'Nombre qui multiplie une variable. Ex : dans $5x$, le coefficient de $x$ est $5$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'monôme',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content: "Expression constituée d'un coefficient et de variables. Ex : $3x^2$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'polynôme',
		tags: ['calcul-littéral'],
		definitions: {
			items: [{ grade: '1_SPE', content: 'Somme de monômes. Ex : $2x^2 + 3x - 1$.' }]
		},
		grade: '1_SPE'
	},
	{
		term: 'degré',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Une équation du premier degré est une équation où l'inconnue n'est jamais élevée au carré ni à une autre puissance. Ex : $3x + 2 = 8$."
				},
				{
					grade: '1_SPE',
					content:
						'Plus grand exposant de la variable dans un polynôme. Ex : le degré de $2x^3 + x$ est $3$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'inéquation',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [{ grade: '3', content: 'Inégalité contenant une inconnue. Ex : $2x + 1 > 5$.' }]
		},
		grade: '3'
	},
	{
		term: "système d'équations",
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						'Ensemble de plusieurs équations à résoudre simultanément. Ex : $\\{x + y = 5;\\; x - y = 1\\}$.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'substituer',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
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
					grade: 'CM1',
					content: 'Branche des mathématiques utilisant des lettres pour représenter des nombres.'
				}
			]
		},
		grade: 'CM1'
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
				{ grade: '5', content: 'Action de transformer un produit en somme par distributivité.' }
			]
		},
		grade: '5'
	},
	{
		term: 'factorisation',
		tags: ['calcul-littéral'],
		definitions: {
			items: [{ grade: '5', content: 'Action de transformer une somme en produit.' }]
		},
		grade: '5'
	},
	{
		term: 'inégalité',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '4',
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
		derivedFrom: 'expression littérale'
	},
	{
		term: 'résoudre',
		tags: ['calcul-littéral', 'équations'],
		grade: '5',
		derivedFrom: 'solution'
	},
	{
		term: 'solution',
		tags: ['calcul-littéral', 'équations'],
		definitions: {
			items: [{ grade: '5', content: 'Valeur qui vérifie une équation ou un problème.' }]
		},
		grade: '5',
		derivedFrom: 'solution'
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
					grade: 'CE2',
					content:
						"Longueur du contour d'une figure. Ex : le périmètre d'un rectangle est $2(L + l)$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'aire',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM1',
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
					grade: 'CM2',
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
					grade: 'CE2',
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
					grade: 'CP',
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
						'Ce qui permet de dire si un objet est lourd ou léger. On compare des masses avec une balance.'
				},
				{
					grade: 'CE1',
					content:
						'Grandeur mesurant la quantité de matière. Unités : $\\text{g}$, $\\text{kg}$, $\\text{t}$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'capacité',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: '5',
					content: "Volume d'un récipient. Unités : $\\text{mL}$, $\\text{cL}$, $\\text{L}$."
				}
			]
		},
		grade: '5'
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
					grade: 'CM1',
					content: 'Ce qui peut être mesuré : longueur, masse, durée, aire, volume, etc.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'vitesse',
		tags: ['grandeurs', 'proportionnalité'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Rapport entre une distance et un temps. $v = \\frac{d}{t}$. Unités : $\\text{km/h}$, $\\text{m/s}$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'angle',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Coin formé par deux traits droits qui partent d'un même point. Ex : l'angle droit, comme le coin d'une feuille."
				},
				{
					grade: '6',
					content: 'Figure formée par deux demi-droites de même origine. Se mesure en degrés ($°$).'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'angle droit',
		tags: ['grandeurs', 'géométrie'],
		definitions: { items: [{ grade: 'CE1', content: 'Angle mesurant $90°$.' }] },
		grade: 'CE1'
	},
	{
		term: 'angle aigu',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Angle plus petit qu'un angle droit." },
				{ grade: '6', content: 'Angle mesurant moins de $90°$.' }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'angle obtus',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Angle plus grand qu'un angle droit." },
				{ grade: '6', content: 'Angle mesurant entre $90°$ et $180°$.' }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'centimètre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Unité pour mesurer des longueurs, notée $\\text{cm}$. Il faut $100$ centimètres pour faire $1$ mètre.'
				},
				{ grade: 'CM1', content: 'Unité de longueur. $1\\,\\text{cm} = 0{,}01\\,\\text{m}$.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'construction',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CM1', content: "Réalisation d'une figure géométrique à l'aide d'instruments." }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'construire',
		tags: ['géométrie'],
		grade: 'CM1',
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
			items: [{ grade: 'CM1', content: 'Unité de longueur. $1\\,\\text{dam} = 10\\,\\text{m}$.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'décimètre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Unité de longueur, notée $\\text{dm}$. $1\\,\\text{m} = 10\\,\\text{dm}$ et $1\\,\\text{dm} = 10\\,\\text{cm}$.'
				},
				{ grade: 'CM1', content: 'Unité de longueur. $1\\,\\text{dm} = 0{,}1\\,\\text{m}$.' }
			]
		},
		grade: 'CE2'
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
				{ grade: 'CP', content: "Muni d'une graduation. Ex : droite graduée, règle graduée." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'graduer',
		tags: ['grandeurs'],
		grade: 'CP',
		derivedFrom: 'gradué'
	},
	{
		term: 'hauteur',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [{ grade: 'CP', content: "Dimension verticale d'un objet ou d'une figure." }]
		},
		grade: 'CP'
	},
	{
		term: 'hectomètre',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Unité de longueur. $1\\,\\text{hm} = 100\\,\\text{m}$.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'kilomètre',
		tags: ['grandeurs'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Unité de longueur. $1\\,\\text{km} = 1000\\,\\text{m}$.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'largeur',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Mesure d'un objet d'un bord à l'autre, souvent la plus petite de ses dimensions. Ex : la largeur de la classe."
				},
				{ grade: 'CE2', content: "Plus petite dimension d'un rectangle." }
			]
		},
		grade: 'CP'
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
				{ grade: 'CP', content: 'Unité de base du système international pour les longueurs.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'millimètre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Unité de longueur, notée $\\text{mm}$. $1\\,\\text{cm} = 10\\,\\text{mm}$.'
				},
				{ grade: 'CM1', content: 'Unité de longueur. $1\\,\\text{mm} = 0{,}001\\,\\text{m}$.' }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'surface',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [{ grade: 'CM1', content: "Étendue d'une figure plane. Synonyme d'aire." }]
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
					grade: 'CM2',
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
					grade: '5',
					content: "Constante par laquelle on multiplie une grandeur pour obtenir l'autre."
				}
			]
		},
		grade: '5'
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
		grade: '6'
	},
	{
		term: 'pourcentage',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '6',
					content: 'Proportion exprimée sur $100$. Ex : $25\\%$ signifie $\\frac{25}{100}$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'échelle',
		tags: ['proportionnalité', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Rapport entre les dimensions d'une représentation et les dimensions réelles. Ex : échelle $1/1000$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'produit en croix',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Méthode pour trouver une valeur manquante dans un tableau de proportionnalité : $\\frac{a}{b} = \\frac{c}{d} \\Rightarrow a \\times d = b \\times c$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'taux',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
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
		synonyms: ['réduction']
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
		grade: '4'
	},
	{
		term: 'proportion',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{ grade: '6', content: 'Égalité de deux rapports. Ex : $\\frac{a}{b} = \\frac{c}{d}$.' }
			]
		},
		grade: '6'
	},
	{
		term: 'proportionnalité',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Deux grandeurs sont proportionnelles quand, si l'une est multipliée par $2$, $3$, $10$…, l'autre l'est aussi. Ex : $1$ cahier coûte $2$ €, $3$ cahiers coûtent $6$ €."
				},
				{ grade: '6', content: 'Relation entre deux grandeurs dont le rapport est constant.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'rapport',
		tags: ['proportionnalité'],
		definitions: {
			items: [{ grade: '6', content: 'Quotient de deux grandeurs. Ex : rapport $\\frac{a}{b}$.' }]
		},
		grade: '6'
	},
	{
		term: 'ratio',
		tags: ['proportionnalité'],
		definitions: {
			items: [{ grade: '4', content: 'Rapport entre deux quantités. Synonyme de rapport.' }]
		},
		grade: '4'
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
					grade: '5',
					content:
						"Le carré d'un nombre est ce nombre multiplié par lui-même : $5^2 = 5 \\times 5 = 25$ ; son cube : $2^3 = 2 \\times 2 \\times 2 = 8$. Ce sont des puissances."
				},
				{
					grade: '4',
					content:
						'$a^n$ est le produit de $n$ facteurs égaux a $a$. Ex : $2^3 = 2 \\times 2 \\times 2 = 8$.'
				}
			]
		},
		grade: '5'
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
					grade: '5',
					content: "Deuxième puissance d'un nombre. $a^2 = a \\times a$. Ex : $5^2 = 25$."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'cube',
		tags: ['puissances', 'entiers'],
		definitions: {
			items: [
				{
					grade: '5',
					content: "Troisième puissance d'un nombre. $a^3 = a \\times a \\times a$. Ex : $2^3 = 8$."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'notation scientifique',
		tags: ['puissances'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Écriture d'un nombre sous la forme $a \\times 10^n$ avec $1 \\leq a < 10$. Ex : $0{,}003 = 3 \\times 10^{-3}$."
				}
			]
		},
		grade: '3'
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
			items: [{ grade: '3', content: '$a^{-n} = \\frac{1}{a^n}$. Ex : $2^{-3} = \\frac{1}{8}$.' }]
		},
		grade: '3'
	},

	// =========================================================================
	// RACINES CARREES
	// =========================================================================
	{
		term: 'racine carrée',
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
		grade: '4',
		synonyms: ['racine']
	},
	{
		term: 'racine',
		tags: ['racines-carrees'],
		definitions: { items: [{ grade: '4', content: "Racine carrée d'un nombre. $\\sqrt{a}$." }] },
		grade: '4',
		derivedFrom: 'racine carrée'
	},
	{
		term: 'radical',
		tags: ['racines-carrees'],
		definitions: {
			items: [{ grade: '4', content: 'Symbole $\\sqrt{\\phantom{x}}$ désignant la racine carrée.' }]
		},
		grade: '4'
	},
	{
		term: 'carré parfait',
		tags: ['racines-carrees', 'entiers'],
		definitions: {
			items: [
				{
					grade: '4',
					content: "Entier qui est le carré d'un autre entier. Ex : $1, 4, 9, 16, 25, 36, \\ldots$"
				}
			]
		},
		grade: '4'
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
					grade: '2',
					content:
						'Une fonction est croissante sur un intervalle si, quand $x$ augmente, $f(x)$ augmente.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'croissant',
		tags: ['fonctions'],
		grade: '3',
		derivedFrom: 'ordre'
	},
	{
		term: 'décroissante',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Une fonction est décroissante sur un intervalle si, quand $x$ augmente, $f(x)$ diminue.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'décroissant',
		tags: ['fonctions'],
		grade: '3',
		derivedFrom: 'ordre'
	},
	{
		term: 'maximum',
		tags: ['fonctions'],
		definitions: {
			items: [
				{ grade: '2', content: 'Plus grande valeur atteinte par une fonction sur un intervalle.' }
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
				{
					grade: 'CM1',
					content:
						'Ligne qui relie des points dans un graphique pour montrer comment une quantité évolue. Ex : la courbe des températures de la semaine.'
				},
				{ grade: '3', content: 'Ligne représentant graphiquement une fonction ou une relation.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'représenter',
		tags: ['fonctions'],
		grade: '2',
		derivedFrom: 'courbe représentative'
	},
	{
		term: 'abscisse',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{ grade: '6', content: 'Nombre qui repère un point sur une droite graduée.' },
				{
					grade: '5',
					content:
						"Coordonnée horizontale d'un point dans un repère. Première coordonnée du couple $(x, y)$."
				}
			]
		},
		grade: '6'
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
					grade: '2',
					content:
						"Valeur $f(0)$, le point où la courbe coupe l'axe des ordonnées. Pour $f(x) = ax + b$, c'est $b$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'coefficient directeur',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content: "Pente d'une droite. Pour $f(x) = ax + b$, le coefficient directeur est $a$."
				}
			]
		},
		grade: '2',
		synonyms: ['pente']
	},
	{
		term: 'repère',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Deux axes gradués qui permettent de placer des points, par exemple dans un graphique.'
				},
				{
					grade: '5',
					content:
						"Système d'axes perpendiculaires gradué permettant de représenter des points par leurs coordonnées."
				}
			]
		},
		grade: 'CM1',
		synonyms: ['repère orthonormé']
	},
	{
		term: 'tableau de valeurs',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Tableau qui donne la valeur d'une expression pour plusieurs valeurs de la lettre. Ex : $3x + 1$ vaut $1$, $4$, $7$ pour $x = 0$, $1$, $2$."
				},
				{
					grade: '3',
					content: 'Tableau donnant des couples $(x, f(x))$ pour représenter une fonction.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'tableau de signes',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
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
			items: [{ grade: '3', content: 'Fonction $f(x) = x^2$. Sa courbe est une parabole.' }]
		},
		grade: '3'
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
					grade: '1_SPE',
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
		grade: '1_SPE'
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
		grade: '2',
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
		grade: '1_SPE'
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
		synonyms: ['logarithme népérien']
	},
	{
		term: 'intervalle',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
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
					grade: 'T_SPE',
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
		grade: '1_SPE'
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
			items: [{ grade: '1_SPE', content: 'Valeur vers laquelle tend une suite ou une fonction.' }]
		},
		grade: '1_SPE'
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
					grade: '5',
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
					grade: 'CP',
					content:
						"Liste d'objets, de formes ou de nombres rangés les uns après les autres, souvent selon une règle. Ex : $2$, $4$, $6$, $8$… (on ajoute $2$ à chaque fois)."
				},
				{
					grade: '1_SPE',
					content:
						'Fonction de $\\mathbb{N}$ dans $\\mathbb{R}$. Liste ordonnée de nombres : $u_0, u_1, u_2, \\ldots$'
				}
			]
		},
		grade: 'CP',
		synonyms: ['suite numérique']
	},
	{
		term: 'terme',
		sense: 'suite',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Chacun des nombres d'une suite. Ex : dans la suite $3$, $6$, $9$, $12$…, le deuxième terme est $6$."
				},
				{ grade: '1_SPE', content: "Élément d'une suite. $u_n$ est le terme de rang $n$." }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'rang',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Place occupée dans une file ou une liste : premier, deuxième, troisième… Ex : Léa est au troisième rang de la file.'
				},
				{
					grade: '1_SPE',
					content: "Indice d'un terme dans une suite. Dans $u_5$, le rang est $5$."
				}
			]
		},
		grade: 'CP'
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
					grade: 'T_SPE',
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
					grade: '1_SPE',
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
		synonyms: ['relation de récurrence']
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
			items: [
				{ grade: 'T_SPE', content: "Somme des termes d'une suite. $S_n = \\sum_{k=0}^{n} u_k$." }
			]
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
					grade: 'CM1',
					content:
						"La probabilité d'un évènement dit s'il a beaucoup ou peu de chances de se produire. Ex : avec une pièce, on a une chance sur deux d'obtenir pile."
				},
				{
					grade: '5',
					content: "Nombre entre $0$ et $1$ mesurant la chance qu'un événement se produise."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'expérience aléatoire',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content: 'Expérience dont le résultat dépend du hasard. Ex : lancer un dé.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'issue',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Résultat possible d'une expérience aléatoire. Ex : obtenir $3$ en lançant un dé."
				}
			]
		},
		grade: 'CM1',
		synonyms: ['éventualité']
	},
	{
		term: 'événement',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Ce qui peut arriver ou non lors d'une expérience aléatoire. Ex : « obtenir un nombre pair » en lançant un dé."
				},
				{
					grade: '4',
					content:
						"Ensemble d'issues. Ex : obtenir un nombre pair en lançant un dé ($\\{2, 4, 6\\}$)."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'univers',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Toutes les issues possibles d'une expérience aléatoire. Ex : pour un dé, les issues $1$, $2$, $3$, $4$, $5$, $6$."
				},
				{
					grade: '2',
					content:
						'Ensemble de toutes les issues possibles. Ex : pour un dé, $\\Omega = \\{1, 2, 3, 4, 5, 6\\}$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'équiprobabilité',
		tags: ['probabilités'],
		definitions: {
			items: [{ grade: 'CM1', content: 'Situation où toutes les issues ont la même probabilité.' }]
		},
		grade: 'CM1'
	},
	{
		term: 'événement contraire',
		tags: ['probabilités'],
		definitions: {
			items: [{ grade: '4', content: "Complémentaire d'un événement. $P(\\bar{A}) = 1 - P(A)$." }]
		},
		grade: '4'
	},
	{
		term: 'arbre de probabilités',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Schéma en arbre représentant les étapes successives d'une expérience aléatoire et les probabilités associées."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'fréquence',
		tags: ['probabilités', 'statistiques'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Rapport du nombre d'occurrences d'un événement au nombre total d'expériences. $f = \\frac{\\text{effectif}}{\\text{total}}$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'loi de probabilité',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '3',
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
					grade: '1_SPE',
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
					grade: 'T_SPE',
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
					grade: '5',
					content:
						'Somme des valeurs divisée par le nombre de valeurs. $\\bar{x} = \\frac{\\sum x_i}{n}$.'
				}
			]
		},
		grade: '5'
	},
	{
		term: 'médiane',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '4',
					content: 'Valeur qui partage une série ordonnée en deux parties de même effectif.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'étendue',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '4',
					content: "Différence entre la plus grande et la plus petite valeur d'une série."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'effectif',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Nombre de personnes ou d'objets dans un groupe. Ex : l'effectif des élèves qui viennent à vélo."
				},
				{ grade: '5', content: "Nombre de fois qu'une valeur apparaît dans une série statistique." }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'diagramme',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Dessin qui présente des données, par exemple avec des barres de hauteurs différentes : un diagramme en barres.'
				},
				{
					grade: 'CM1',
					content: 'Représentation graphique de données statistiques (barres, circulaire, etc.).'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'quartile',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '3',
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
					grade: '2',
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
				{
					grade: '1_SPE',
					content: "Carré de l'écart type. $V = \\frac{\\sum (x_i - \\bar{x})^2}{n}$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'statistiques',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '5',
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
				{ grade: 'CP', content: "Partie d'une droite délimitée par deux points. Noté $[AB]$." }
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
					content:
						'Ligne droite qui a un point de départ mais pas de fin. Ex : la demi-droite graduée sur laquelle on place les nombres.'
				},
				{
					grade: '6',
					content: "Partie d'une droite ayant une origine mais pas de fin. Notée $[AB)$."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'perpendiculaire',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content: 'Deux droites sont perpendiculaires si elles forment un angle droit ($90°$).'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'parallèle',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CM1', content: 'Deux droites sont parallèles si elles ne se coupent jamais.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'symétrie axiale',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
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
					grade: '5',
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
					grade: '4',
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
		term: 'homothétie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
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
					grade: '4',
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
					grade: '3',
					content:
						'Si deux droites parallèles coupent deux sécantes, alors elles déterminent des segments proportionnels.'
				}
			]
		},
		grade: '3',
		synonyms: ['Thalès']
	},
	{
		term: 'hypoténuse',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
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
					grade: '3',
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
		grade: '3'
	},
	{
		term: 'sinus',
		tags: ['géométrie', 'trigonométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						'$\\sin(\\alpha) = \\frac{\\text{oppose}}{\\text{hypotenuse}}$ dans un triangle rectangle.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'tangente',
		sense: 'trigonométrie',
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
					grade: 'CE1',
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
				{ grade: 'CE2', content: "Segment joignant le centre d'un cercle à un point du cercle." }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'diamètre',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Segment passant par le centre d'un cercle et joignant deux points du cercle. $d = 2r$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'triangle',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Polygone à trois côtés.' }] },
		grade: 'CP'
	},
	{
		term: 'rectangle',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Quadrilatère ayant quatre angles droits.' }] },
		grade: 'CP'
	},
	{
		term: 'carré',
		sense: 'géométrie',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: 'Rectangle ayant quatre côtés égaux.' }] },
		grade: 'CP'
	},
	{
		term: 'losange',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE2', content: 'Quadrilatère ayant quatre côtés égaux.' }] },
		grade: 'CE2'
	},
	{
		term: 'parallélogramme',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '5', content: 'Quadrilatère dont les côtés opposés sont parallèles et égaux.' }
			]
		},
		grade: '5'
	},
	{
		term: 'trapèze',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM2', content: 'Quadrilatère ayant exactement deux côtés parallèles.' }]
		},
		grade: 'CM2'
	},
	{
		term: 'polygone',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content: 'Figure plane fermée délimitée par des segments. Ex : triangle, carré, hexagone.'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'sommet',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Pointe d'une figure, là où deux côtés se rejoignent. Ex : un triangle a $3$ sommets."
				},
				{ grade: 'CE2', content: "Point de rencontre de deux côtés d'un polygone." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'côté',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Chacun des traits droits qui forment le bord d'une figure. Ex : un carré a $4$ côtés."
				},
				{ grade: 'CE2', content: 'Segment délimitant un polygone.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'diagonale',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Dans un quadrilatère, segment qui relie deux sommets opposés. Ex : un rectangle a deux diagonales.'
				},
				{ grade: 'CM1', content: "Segment joignant deux sommets non consécutifs d'un polygone." }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'milieu',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE1', content: 'Point qui partage un segment en deux parties égales.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'médiane',
		sense: 'géométrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
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
					grade: '6',
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
		term: 'hauteur',
		sense: 'géométrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '5',
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
					grade: '3',
					content:
						'Objet mathématique défini par une direction, un sens et une norme (longueur). Noté $\\vec{AB}$.'
				}
			]
		},
		grade: '3'
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
			items: [{ grade: '5', content: 'Couple de nombres $(x, y)$ repérant un point dans le plan.' }]
		},
		grade: '5'
	},
	{
		term: 'scalaire',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
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
			items: [{ grade: '6', content: 'Se dit de deux angles ayant un côté commun.' }]
		},
		grade: '6'
	},
	{
		term: 'aigu',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Se dit d'un angle plus petit qu'un angle droit." },
				{ grade: '6', content: "Se dit d'un angle mesurant moins de $90°$." }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'aligné',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CP', content: 'Se dit de points situés sur une même droite.' }]
		},
		grade: 'CP'
	},
	{
		term: 'aligner',
		tags: ['géométrie'],
		grade: 'CP',
		derivedFrom: 'aligné'
	},
	{
		term: 'arête',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Bord droit d'un solide, là où deux faces se rejoignent. Ex : un cube a $12$ arêtes."
				},
				{ grade: 'CM1', content: "Segment commun à deux faces d'un solide." }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'axe',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: 'Droite de référence (axe de symétrie, axe des abscisses, etc.).' }
			]
		},
		grade: 'CE1'
	},
	{
		term: 'barycentre',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '2', content: "Point d'équilibre d'un système de points pondérés." }]
		},
		grade: '2'
	},
	{
		term: 'centre',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
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
		grade: 'CE1'
	},
	{
		term: 'coder',
		tags: ['géométrie'],
		grade: 'CE1',
		derivedFrom: 'codage'
	},
	{
		term: 'compas',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
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
			items: [
				{
					grade: 'CP',
					content: 'Solide qui a une base ronde et une pointe. Ex : un cornet de glace.'
				},
				{ grade: 'CM1', content: 'Solide ayant une base circulaire et un sommet pointu.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'cylindre',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Solide qui a la forme d'un tube fermé par deux disques. Ex : une boîte de conserve."
				},
				{ grade: 'CM1', content: 'Solide ayant deux bases circulaires parallèles et égales.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'droit',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
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
					grade: '2',
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
			items: [{ grade: 'CE1', content: 'Instrument de géométrie en forme de triangle rectangle.' }]
		},
		grade: 'CE1'
	},
	{
		term: 'équidistant',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '6', content: 'A égale distance de deux points ou objets.' }]
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
					grade: 'CM1',
					content: 'Ensemble à trois dimensions dans lequel se situent les objets géométriques.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'extrémité',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CP', content: "Bout d'un objet ou d'un trait." },
				{ grade: 'CE1', content: "Point aux bouts d'un segment." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'face',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Chacune des surfaces plates d'un solide. Ex : un cube a $6$ faces carrées."
				},
				{ grade: 'CM1', content: 'Surface plane délimitant un solide.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'figure',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CP', content: 'Dessin géométrique représentant des formes.' }]
		},
		grade: 'CP'
	},
	{
		term: 'forme',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: "Aspect extérieur d'un objet géométrique." }] },
		grade: 'CP'
	},
	{
		term: 'hexagone',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE2', content: 'Polygone à six côtés.' }] },
		grade: 'CE2'
	},
	{
		term: 'hyperbole',
		tags: ['géométrie', 'fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
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
					grade: '4',
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
			items: [
				{ grade: 'CE1', content: "Se dit d'un angle plus grand qu'un angle droit." },
				{ grade: '6', content: "Se dit d'un angle mesurant entre $90°$ et $180°$." }
			]
		},
		grade: 'CE1'
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
				{
					grade: 'CE1',
					content: "Point de départ d'une demi-droite graduée, là où est placé le nombre $0$."
				},
				{ grade: '6', content: 'Point de référence sur une droite graduée ou dans un repère.' }
			]
		},
		grade: 'CE1'
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
			items: [{ grade: '3', content: 'Courbe en U représentant une fonction du second degré.' }]
		},
		grade: '3'
	},
	{
		term: 'patron',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CE2', content: 'Figure plane qui, une fois pliée, forme un solide.' }]
		},
		grade: 'CE2'
	},
	{
		term: 'pavé',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Solide qui a la forme d'une boîte : ses $6$ faces sont des rectangles. Ex : une boîte à chaussures."
				},
				{ grade: 'CM1', content: 'Solide à six faces rectangulaires (parallélépipède rectangle).' }
			]
		},
		grade: 'CP',
		synonyms: ['parallélépipède rectangle']
	},
	{
		term: 'pentagone',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE2', content: 'Polygone à cinq côtés.' }] },
		grade: 'CE2'
	},
	{
		term: 'perspective',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM1', content: "Représentation d'un objet 3D sur un plan 2D." }]
		},
		grade: 'CM1'
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
		definitions: { items: [{ grade: '5', content: 'Surface plane infinie à deux dimensions.' }] },
		grade: '5'
	},
	{
		term: 'point',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
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
					grade: 'CM1',
					content: 'Solide dont les deux bases sont des polygones égaux et parallèles.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'pyramide',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Solide qui a une base et des faces en forme de triangles qui se rejoignent en un sommet. Ex : les pyramides d'Égypte."
				},
				{
					grade: 'CM1',
					content: 'Solide dont la base est un polygone et les faces latérales sont des triangles.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'Pythagore',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '4', content: 'Mathématicien grec. Associé au théorème de Pythagore.' }]
		},
		grade: '4',
		derivedFrom: 'théorème de Pythagore'
	},
	{
		term: 'quadrilatère',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE2', content: 'Polygone à quatre côtés.' }] },
		grade: 'CE2'
	},
	{
		term: 'quelconque',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '5', content: 'Sans propriété particulière. Ex : triangle quelconque.' }]
		},
		grade: '5'
	},
	{
		term: 'radian',
		tags: ['géométrie', 'trigonométrie'],
		definitions: {
			items: [{ grade: '1_SPE', content: "Unité de mesure d'angle. $\\pi\\,\\text{rad} = 180°$." }]
		},
		grade: '1_SPE'
	},
	{
		term: 'rapporteur',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '6', content: 'Instrument de géométrie servant à mesurer des angles.' }]
		},
		grade: '6'
	},
	{
		term: 'règle',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
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
					grade: '2',
					content: 'Droite qui coupe une autre droite ou une courbe en un ou plusieurs points.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'secant',
		tags: ['géométrie'],
		grade: '2',
		derivedFrom: 'sécante'
	},
	{
		term: 'secteur',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content: 'Portion de disque délimitée par deux rayons et un arc de cercle.'
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'concave',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'T_SPE', content: "Se dit d'une figure ou d'une courbe qui présente un creux." }
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'convexe',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Se dit d'une figure ou d'une courbe qui ne présente pas de creux. Un segment joignant deux points de la figure reste à l'intérieur."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'solide',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Objet en trois dimensions qu'on peut prendre en main, comme un cube, une boule ou un cône."
				},
				{ grade: 'CM1', content: "Figure géométrique de l'espace à trois dimensions." }
			]
		},
		grade: 'CP'
	},
	{
		term: 'sphère',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content: "Ensemble des points de l'espace situés à une même distance d'un centre."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'sphérique',
		tags: ['géométrie'],
		grade: '3',
		derivedFrom: 'sphère'
	},
	{
		term: 'symétrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Une figure présente une symétrie quand elle a un axe de symétrie : en la pliant le long de cette droite, les deux moitiés se superposent exactement.'
				},
				{ grade: '6', content: 'Transformation géométrique (axiale ou centrale).' }
			]
		},
		grade: 'CE2'
	},
	{
		term: 'symétrique',
		tags: ['géométrie'],
		grade: '6',
		derivedFrom: 'symétrie axiale'
	},
	{
		term: 'Thalès',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: '3', content: 'Mathématicien grec. Associé au théorème de Thalès.' }]
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
					grade: 'CM1',
					content:
						"Groupe d'objets ou de points réunis parce qu'ils ont quelque chose en commun. Ex : le cercle est l'ensemble des points situés à la même distance du centre."
				},
				{
					grade: '2',
					content:
						"Collection d'éléments. Ex : $\\mathbb{N}$ (entiers naturels), $\\mathbb{R}$ (réels)."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'appartenir',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
					content: "Un élément appartient à un ensemble s'il en fait partie. $3 \\in \\mathbb{N}$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'inclusion',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
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
					grade: '4',
					content:
						"$A \\cup B$ est l'ensemble des éléments qui sont dans $A$ ou dans $B$ (ou les deux)."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'intersection',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"$A \\cap B$ est l'ensemble des éléments qui sont à la fois dans $A$ et dans $B$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'réciproque',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"La réciproque d'une propriété, c'est la même propriété « dans l'autre sens ». Elle n'est pas toujours vraie."
				},
				{
					grade: '4',
					content:
						"La réciproque de «si $A$ alors $B$» est «si $B$ alors $A$». Elle n'est pas toujours vraie."
				}
			]
		},
		grade: '6'
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
		grade: '4'
	},
	{
		term: 'conjecture',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '5',
					content: "Proposition que l'on suppose vraie mais qui n'a pas encore été démontrée."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'conjecturer',
		tags: ['logique'],
		grade: '5',
		derivedFrom: 'conjecture'
	},
	{
		term: 'déduire',
		tags: ['logique'],
		grade: '5',
		derivedFrom: 'démonstration'
	},
	{
		term: 'démonstration',
		tags: ['logique'],
		definitions: {
			items: [
				{ grade: '5', content: "Raisonnement logique prouvant qu'une proposition est vraie." }
			]
		},
		grade: '5'
	},
	{
		term: 'démontrer',
		tags: ['logique'],
		grade: '5',
		derivedFrom: 'démonstration'
	},
	{
		term: 'équivalence',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Relation logique : $A \\Leftrightarrow B$ signifie que $A$ et $B$ sont simultanément vraies ou fausses.'
				}
			]
		},
		grade: '2'
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
				{ grade: '2', content: 'Relation logique : si $A$ alors $B$, notée $A \\Rightarrow B$.' }
			]
		},
		grade: '2'
	},
	{
		term: 'raisonnement',
		tags: ['logique'],
		definitions: {
			items: [{ grade: '5', content: "Suite logique d'arguments menant à une conclusion." }]
		},
		grade: '5'
	},
	{
		term: 'synthèse',
		tags: ['logique'],
		definitions: {
			items: [
				{ grade: '3', content: 'Raisonnement partant des hypothèses pour arriver à la conclusion.' }
			]
		},
		grade: '3'
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
					grade: 'CE1',
					content:
						'Ce qui est toujours vrai pour une figure ou un nombre. Ex : un carré a toujours ses $4$ côtés de même longueur.'
				},
				{
					grade: '6',
					content:
						"Caractéristique d'un objet mathématique qui a été démontrée. Ex : la somme des angles d'un triangle vaut $180°$."
				}
			]
		},
		grade: 'CE1'
	},

	// =========================================================================
	// CRYPTOGRAPHIE (Cabinet Noir)
	// =========================================================================
	{
		term: 'chiffre',
		sense: 'cryptographie',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Méthode pour écrire un message en secret, que seul celui qui connaît la clé peut relire. Ex : le chiffre de César, le chiffre de Vigenère.'
				}
			]
		},
		grade: '6',
		seeAlso: { label: 'Le Cabinet Noir de Turingrad', path: '/chiffrement' }
	},
	{
		term: 'chiffrer',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Transformer un message à l’aide d’une clé pour le rendre illisible. On évite « crypter » : chiffrer sans clé n’aurait pas de sens.'
				}
			]
		},
		grade: '6',
		seeAlso: { label: 'Le Cabinet Noir de Turingrad', path: '/chiffrement' }
	},
	{
		term: 'déchiffrer',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Retrouver le message clair à partir du message chiffré, **en connaissant** la clé.'
				}
			]
		},
		grade: '6',
		seeAlso: { label: 'Le Cabinet Noir de Turingrad', path: '/chiffrement' }
	},
	{
		term: 'décrypter',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Retrouver le message clair **sans connaître** la clé, par exemple grâce à l’analyse de fréquences.'
				}
			]
		},
		grade: '6',
		seeAlso: { label: 'Les Dépêches du Czar', path: '/chiffrement/depeches' }
	},
	{
		term: 'clé',
		sense: 'cryptographie',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Information secrète qui règle un chiffre : le décalage du chiffre de César, le mot-clé du chiffre de Vigenère…'
				}
			]
		},
		grade: '6',
		seeAlso: { label: 'Le Cabinet Noir de Turingrad', path: '/chiffrement' }
	},
	{
		term: 'chiffre de César',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Chiffre qui décale chaque lettre d’un même nombre de rangs dans l’alphabet, en repartant au début après Z.'
				}
			]
		},
		exemples: {
			items: [{ grade: '6', content: 'Avec un décalage de $3$, A devient D et Y devient B.' }]
		},
		history:
			'L’historien Suétone raconte que Jules César décalait les lettres de ses messages secrets de trois rangs.',
		grade: '6',
		seeAlso: { label: 'Le chiffre de César', path: '/chiffrement/cesar' }
	},
	{
		term: 'analyse de fréquences',
		tags: ['cryptographie', 'statistiques'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						'Méthode de décryptage qui compare la fréquence des lettres d’un message chiffré à celle de la langue. En français, la lettre la plus fréquente est presque toujours le E.'
				}
			]
		},
		history: 'Décrite par le savant arabe Al-Kindi au IXᵉ siècle.',
		grade: '5',
		seeAlso: { label: 'La substitution', path: '/chiffrement/substitution' }
	},
	{
		term: 'chiffre de Vigenère',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Chiffre dont le décalage change à chaque lettre, selon les lettres d’un mot-clé répété tout au long du message.'
				}
			]
		},
		history:
			'Publié par Giovan Battista Bellaso en 1553, popularisé par Blaise de Vigenère en 1586, il fut surnommé « le chiffre indéchiffrable » jusqu’à la méthode de Kasiski (1863).',
		grade: '2',
		seeAlso: { label: 'Le chiffre de Vigenère', path: '/chiffrement/vigenere' }
	},
	{
		term: 'méthode de Kasiski',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Méthode pour trouver la longueur de la clé d’un chiffre de Vigenère : les écarts entre deux séquences répétées du message chiffré sont souvent des multiples de cette longueur.'
				}
			]
		},
		history: 'Publiée par l’officier prussien Friedrich Kasiski en 1863.',
		grade: '2',
		seeAlso: { label: 'Le chiffre de Vigenère', path: '/chiffrement/vigenere' }
	},
	{
		term: 'indice de coïncidence',
		tags: ['cryptographie', 'probabilités'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Probabilité que deux lettres prises au hasard dans un texte soient identiques : environ $0{,}078$ en français, $0{,}038$ pour des lettres tirées au hasard.'
				}
			]
		},
		history: 'Introduit par le cryptologue américain William Friedman dans les années 1920.',
		grade: '2',
		seeAlso: { label: 'Le chiffre de Vigenère', path: '/chiffrement/vigenere' }
	},
	{
		term: 'congruence',
		tags: ['entiers', 'arithmétique', 'cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'$a \\equiv b \\pmod{n}$ signifie que $n$ divise $a - b$ : $a$ et $b$ ont le même reste dans la division euclidienne par $n$.'
				}
			]
		},
		exemples: {
			items: [{ grade: 'T_EXP', content: '$27 \\equiv 1 \\pmod{26}$, car $27 - 1 = 26$.' }]
		},
		grade: 'T_EXP',
		synonyms: ['modulo'],
		seeAlso: { label: 'Le chiffre affine', path: '/chiffrement/affine' }
	},
	{
		term: 'inverse modulaire',
		tags: ['entiers', 'arithmétique', 'cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						"Un entier $a'$ tel que $a \\times a' \\equiv 1 \\pmod{n}$. Il existe si et seulement si $a$ est premier avec $n$."
				}
			]
		},
		exemples: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'$5 \\times 21 = 105 = 4 \\times 26 + 1$, donc $21$ est l’inverse de $5$ modulo $26$.'
				}
			]
		},
		grade: 'T_EXP',
		seeAlso: { label: 'Le chiffre affine', path: '/chiffrement/affine' }
	},
	{
		term: 'chiffre affine',
		tags: ['cryptographie', 'arithmétique'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Chiffre qui remplace la lettre de rang $x$ par celle de rang $ax + b$ modulo $26$. On ne peut déchiffrer que si $a$ est premier avec $26$.'
				}
			]
		},
		grade: 'T_EXP',
		seeAlso: { label: 'Le chiffre affine', path: '/chiffrement/affine' }
	},
	{
		term: 'chiffre de Hill',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Chiffre qui code les lettres par paires, en multipliant le vecteur de leurs rangs par une matrice $2 \\times 2$ inversible modulo $26$.'
				}
			]
		},
		history: 'Imaginé par le mathématicien américain Lester Hill en 1929.',
		grade: 'T_EXP',
		seeAlso: { label: 'Le chiffre de Hill', path: '/chiffrement/hill' }
	},
	{
		term: 'identité de Bézout',
		tags: ['entiers', 'arithmétique', 'cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Si $d$ est le PGCD de $a$ et $b$, il existe des entiers $u$ et $v$ tels que $au + bv = d$. L’algorithme d’Euclide étendu les calcule.'
				}
			]
		},
		exemples: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'$1 = -3 \\times 1080 + 463 \\times 7$ : $463$ est l’inverse de $7$ modulo $1080$.'
				}
			]
		},
		grade: 'T_EXP',
		seeAlso: { label: 'RSA de poche', path: '/chiffrement/rsa' }
	},
	{
		term: 'exponentiation rapide',
		tags: ['puissances', 'cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Méthode pour calculer $a^e$ modulo $n$ : on élève au carré encore et encore, et l’on ne multiplie que les carrés qui correspondent aux chiffres $1$ de l’écriture binaire de $e$.'
				}
			]
		},
		grade: 'T_EXP',
		seeAlso: { label: 'RSA de poche', path: '/chiffrement/rsa' }
	},
	{
		term: 'clé publique',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Dans un chiffrement comme RSA, la clé qui sert à chiffrer : elle peut être connue de tous. Seule la clé privée, gardée secrète, permet de déchiffrer.'
				}
			]
		},
		history:
			'L’idée vient de Whitfield Diffie et Martin Hellman (1976) ; RSA (Rivest, Shamir et Adleman, 1977) en est la première réalisation utilisable pour chiffrer.',
		grade: 'T_EXP',
		seeAlso: { label: 'RSA de poche', path: '/chiffrement/rsa' }
	},
	{
		term: 'clé privée',
		tags: ['cryptographie'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Clé gardée secrète qui permet de déchiffrer les messages chiffrés avec la clé publique correspondante.'
				}
			]
		},
		grade: 'T_EXP',
		seeAlso: { label: 'RSA de poche', path: '/chiffrement/rsa' }
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
