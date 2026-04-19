/**
 * French mathematics vocabulary dictionary.
 * Used for autocomplete in text blanks (BlankInput) and as a glossary.
 */

import type { GradeCode } from '$lib/types/grades';
import { GRADES } from '$lib/types/grades';

export interface MathTerm {
	term: string;
	tags: string[];
	/** Definition of the term (ubumark). Required for principal terms, omitted for derived terms. */
	definition?: string;
	/** Usage example (ubumark). */
	exemple?: string;
	/** Historical note about the term or concept (ubumark). */
	history?: string;
	image?: string;
	level: GradeCode;
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
		definition: 'Concept mathématique représentant une quantité.',
		level: 'CP'
	},
	{
		term: 'chiffre',
		tags: ['transversal'],
		definition:
			'Symbole ($0, 1, 2, \\ldots, 9$) utilisé pour écrire les nombres dans le système décimal.',
		level: 'CP'
	},
	{
		term: 'calcul',
		tags: ['transversal'],
		definition: "Opération ou suite d'opérations effectuées sur des nombres.",
		level: 'CP'
	},
	{
		term: 'résultat',
		tags: ['transversal'],
		definition: "Valeur obtenue à l'issue d'un calcul.",
		level: 'CP'
	},
	{
		term: 'somme',
		tags: ['transversal', 'operations'],
		definition: "Résultat d'une addition. Ex : la somme de $3$ et $5$ est $8$.",
		level: 'CP'
	},
	{
		term: 'différence',
		tags: ['transversal', 'operations'],
		definition: "Résultat d'une soustraction. Ex : la différence de $8$ et $3$ est $5$.",
		level: 'CP'
	},
	{
		term: 'produit',
		tags: ['transversal', 'operations'],
		definition: "Résultat d'une multiplication. Ex : le produit de $4$ et $3$ est $12$.",
		level: 'CE1'
	},
	{
		term: 'quotient',
		tags: ['transversal', 'operations', 'entiers'],
		definition: "Résultat d'une division. Dans $15 \\div 4 = 3$ reste $3$, le quotient est $3$.",
		level: 'CE2'
	},
	{
		term: 'reste',
		tags: ['transversal', 'operations', 'entiers'],
		definition:
			'Ce qui reste après une division euclidienne. Dans $15 \\div 4 = 3$ reste $3$, le reste est $3$.',
		level: 'CE2'
	},
	{
		term: 'addition',
		tags: ['transversal', 'operations'],
		definition: 'Opération qui associe à deux nombres leur somme.',
		level: 'CP'
	},
	{
		term: 'soustraction',
		tags: ['transversal', 'operations'],
		definition: 'Opération qui associe à deux nombres leur différence.',
		level: 'CP'
	},
	{
		term: 'multiplication',
		tags: ['transversal', 'operations'],
		definition: 'Opération qui associe à deux nombres leur produit.',
		level: 'CE1'
	},
	{
		term: 'division',
		tags: ['transversal', 'operations'],
		definition: 'Opération qui associe à deux nombres leur quotient.',
		level: 'CE2'
	},
	{
		term: 'égal',
		tags: ['transversal'],
		definition: 'Relation entre deux quantités qui ont la même valeur. Symbole : $=$.',
		level: 'CP'
	},
	{
		term: 'ordre de grandeur',
		tags: ['transversal'],
		definition: "Valeur approchée d'un nombre, souvent arrondie à la dizaine, centaine, etc.",
		level: 'CM1'
	},
	{
		term: 'opérateur',
		tags: ['transversal', 'operations'],
		definition: 'Symbole indiquant une opération ($+$, $-$, $\\times$, $\\div$).',
		level: 'CP'
	},
	{
		term: 'terme',
		tags: ['transversal'],
		definition:
			"Chaque élément d'une somme ou d'une suite. Ex : dans $3 + 5$, les termes sont $3$ et $5$.",
		level: 'CE1'
	},
	{
		term: 'facteur',
		tags: ['transversal', 'operations'],
		definition:
			"Chaque élément d'un produit. Ex : dans $4 \\times 3$, les facteurs sont $4$ et $3$.",
		level: 'CE2'
	},
	{
		term: 'additionner',
		tags: ['transversal', 'operations'],
		level: 'CP',
		derivedFrom: 'addition'
	},
	{
		term: 'calculer',
		tags: ['transversal'],
		level: 'CP',
		derivedFrom: 'calcul'
	},
	{
		term: 'compter',
		tags: ['transversal'],
		level: 'CP',
		derivedFrom: 'calcul'
	},
	{
		term: 'soustraire',
		tags: ['transversal', 'operations'],
		level: 'CP',
		derivedFrom: 'soustraction'
	},
	{
		term: 'multiplier',
		tags: ['transversal', 'operations'],
		level: 'CE1',
		derivedFrom: 'multiplication'
	},
	{
		term: 'diviser',
		tags: ['transversal', 'operations'],
		level: 'CE2',
		derivedFrom: 'division'
	},
	{
		term: 'ordonner',
		tags: ['transversal'],
		level: 'CM1',
		derivedFrom: 'ordre de grandeur'
	},
	{
		term: 'calculatrice',
		tags: ['transversal'],
		definition: 'Machine servant à effectuer des calculs.',
		level: 'CE1'
	},
	{
		term: 'convention',
		tags: ['transversal'],
		definition: 'Règle adoptée par accord. Ex : convention de signes.',
		level: '4'
	},
	{
		term: 'égalité',
		tags: ['transversal'],
		definition: 'Relation entre deux expressions ayant la même valeur. Symbole : $=$.',
		level: 'CP'
	},
	{
		term: 'formule',
		tags: ['transversal'],
		definition: 'Égalité exprimant une relation entre des grandeurs. Ex : $A = L \\times l$.',
		level: 'CE2'
	},
	{
		term: 'géométrie',
		tags: ['géométrie'],
		definition: "Branche des mathématiques étudiant les figures et l'espace.",
		level: 'CP'
	},
	{
		term: 'inférieur',
		tags: ['transversal'],
		definition: 'Plus petit que. Symbole : $<$ ou $\\leq$.',
		level: 'CE1'
	},
	{
		term: 'infini',
		tags: ['transversal'],
		definition: 'Concept désignant ce qui est sans fin. Symbole : $\\infty$.',
		level: '4'
	},
	{
		term: 'mathématiques',
		tags: ['transversal'],
		definition: 'Science des nombres, des formes et des structures.',
		level: 'CP'
	},
	{
		term: 'maths',
		tags: ['transversal'],
		definition: 'Abréviation de mathématiques.',
		level: 'CP',
		derivedFrom: 'mathématiques'
	},
	{
		term: 'moins',
		tags: ['transversal', 'operations'],
		definition: 'Symbole $-$ de la soustraction ou du signe négatif.',
		level: 'CP'
	},
	{
		term: 'opération',
		tags: ['transversal', 'operations'],
		definition: 'Processus de calcul : addition, soustraction, multiplication, division.',
		level: 'CP'
	},
	{
		term: 'ordre',
		tags: ['transversal'],
		definition: 'Relation de comparaison entre nombres ($<$, $>$, $=$).',
		level: 'CE1'
	},
	{
		term: 'particulier',
		tags: ['transversal'],
		definition: 'Cas spécial. Ex : triangle particulier (équilatéral, isocèle, rectangle).',
		level: '6'
	},
	{
		term: 'plus',
		tags: ['transversal', 'operations'],
		definition: "Symbole $+$ de l'addition ou du signe positif.",
		level: 'CP'
	},
	{
		term: 'problème',
		tags: ['transversal'],
		definition: 'Situation nécessitant un raisonnement mathématique pour être résolue.',
		level: 'CP'
	},
	{
		term: 'schéma',
		tags: ['transversal'],
		definition: 'Dessin simplifié représentant une situation mathématique.',
		level: 'CE2'
	},
	{
		term: 'supérieur',
		tags: ['transversal'],
		definition: 'Plus grand que. Symbole : $>$ ou $\\geq$.',
		level: 'CE1'
	},
	{
		term: 'valeur',
		tags: ['transversal'],
		definition: 'Nombre attribué à une variable ou à une expression.',
		level: 'CE1'
	},

	// =========================================================================
	// ENTIERS
	// =========================================================================
	{
		term: 'entier naturel',
		tags: ['entiers'],
		definition:
			"Nombre entier positif ou nul. L'ensemble des entiers naturels est $\\mathbb{N} = \\{0, 1, 2, 3, \\ldots\\}$.",
		level: 'CP'
	},
	{
		term: 'pair',
		tags: ['entiers', 'arithmétique'],
		definition: 'Nombre entier divisible par $2$. Ex : $0, 2, 4, 6, 8, \\ldots$',
		level: 'CP'
	},
	{
		term: 'impair',
		tags: ['entiers', 'arithmétique'],
		definition: "Nombre entier qui n'est pas divisible par $2$. Ex : $1, 3, 5, 7, 9, \\ldots$",
		level: 'CP'
	},
	{
		term: 'dizaine',
		tags: ['entiers', 'numération'],
		definition: 'Groupe de $10$ unités. Le chiffre des dizaines indique le nombre de dizaines.',
		level: 'CP'
	},
	{
		term: 'centaine',
		tags: ['entiers', 'numération'],
		definition:
			'Groupe de $100$ unités ($10$ dizaines). Le chiffre des centaines indique le nombre de centaines.',
		level: 'CE1'
	},
	{
		term: 'millier',
		tags: ['entiers', 'numération'],
		definition: 'Groupe de $1\\,000$ unités.',
		level: 'CE2'
	},
	{
		term: 'unite',
		tags: ['entiers', 'numération', 'grandeurs'],
		definition:
			'Grandeur de référence pour mesurer. En numération, le rang le plus à droite dans un nombre entier.',
		level: 'CP'
	},
	{
		term: 'multiple',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition:
			'$a$ est un multiple de $b$ si $a = b \\times k$ avec $k$ entier. Ex : $12$ est un multiple de $3$.',
		level: 'CM1'
	},
	{
		term: 'diviseur (arithmétique)',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition:
			'$b$ est un diviseur de $a$ si $a \\div b$ est un entier (reste $0$). Ex : $3$ est un diviseur de $12$.',
		level: 'CM1'
	},
	{
		term: 'divisible',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition:
			'Un nombre est divisible par un autre si la division tombe juste (reste $0$). Ex : $12$ est divisible par $3$.',
		level: 'CM1'
	},
	{
		term: 'nombre premier',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition:
			"Entier naturel supérieur à $1$ qui n'a que deux diviseurs : $1$ et lui-même. Ex : $2, 3, 5, 7, 11$.",
		level: '5',
		synonyms: ['premier']
	},
	{
		term: 'décomposition en facteurs premiers',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition:
			"Écriture d'un entier comme produit de nombres premiers. Ex : $60 = 2^2 \\times 3 \\times 5$.",
		level: '4'
	},
	{
		term: 'PGCD',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition: 'Plus Grand Commun Diviseur de deux entiers. Ex : $\\text{PGCD}(12, 18) = 6$.',
		level: '3',
		synonyms: ['plus grand commun diviseur']
	},
	{
		term: 'PPCM',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition: 'Plus Petit Commun Multiple de deux entiers. Ex : $\\text{PPCM}(4, 6) = 12$.',
		level: '3',
		synonyms: ['plus petit commun multiple']
	},
	{
		term: 'critère de divisibilité',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition:
			'Règle permettant de savoir si un nombre est divisible par un autre sans faire la division. Ex : un nombre est divisible par $3$ si la somme de ses chiffres est divisible par $3$.',
		level: '6'
	},
	{
		term: 'division euclidienne',
		tags: ['entiers', 'arithmétique'],
		definition:
			"Division d'un entier $a$ par un entier $b \\neq 0$ donnant un quotient $q$ et un reste $r$ tels que $a = b \\times q + r$ avec $0 \\leq r < b$.",
		level: '6'
	},
	{
		term: 'dividende',
		tags: ['entiers', 'operations'],
		definition: "Nombre que l'on divise. Dans $15 \\div 4$, le dividende est $15$.",
		level: 'CE2'
	},
	{
		term: 'diviseur (operation)',
		tags: ['entiers', 'operations'],
		definition: 'Nombre par lequel on divise. Dans $15 \\div 4$, le diviseur est $4$.',
		level: 'CE2'
	},
	{
		term: 'table de multiplication',
		tags: ['entiers', 'operations'],
		definition: 'Tableau donnant les produits des nombres de $1$ a $10$ (ou $12$).',
		level: 'CE1'
	},
	{
		term: 'double',
		tags: ['entiers', 'operations'],
		definition:
			"Le double d'un nombre est ce nombre multiplié par $2$. Ex : le double de $7$ est $14$.",
		level: 'CP'
	},
	{
		term: 'moitié',
		tags: ['entiers', 'operations'],
		definition:
			"La moitié d'un nombre est ce nombre divisé par $2$. Ex : la moitié de $14$ est $7$.",
		level: 'CP'
	},
	{
		term: 'triple',
		tags: ['entiers', 'operations'],
		definition: "Le triple d'un nombre est ce nombre multiplié par $3$.",
		level: 'CE1'
	},
	{
		term: 'quart',
		tags: ['entiers', 'operations'],
		definition: "Le quart d'un nombre est ce nombre divisé par $4$.",
		level: 'CE1'
	},
	{
		term: 'quadruple',
		tags: ['entiers', 'operations'],
		definition: "Le quadruple d'un nombre est ce nombre multiplié par $4$.",
		level: 'CE1'
	},
	{
		term: 'tiers',
		tags: ['entiers', 'operations', 'fractions'],
		definition: "Le tiers d'un nombre est ce nombre divisé par $3$.",
		level: 'CE1'
	},
	{
		term: 'arithmétique',
		tags: ['entiers', 'arithmétique'],
		definition: 'Étude des propriétés des nombres entiers (divisibilité, premiers, etc.).',
		level: '6'
	},
	{
		term: 'décomposition',
		tags: ['entiers', 'arithmétique'],
		definition:
			"Écriture d'un nombre comme produit de facteurs. Ex : $60 = 2^2 \\times 3 \\times 5$.",
		level: '4'
	},
	{
		term: 'décomposer',
		tags: ['entiers', 'arithmétique'],
		level: '4',
		derivedFrom: 'décomposition en facteurs premiers'
	},
	{
		term: 'diviseur',
		tags: ['entiers', 'arithmétique', 'divisibilité'],
		definition: 'Nombre qui divise exactement un autre nombre.',
		level: 'CM1'
	},
	{
		term: 'entier',
		tags: ['entiers'],
		definition: 'Nombre sans partie décimale.',
		level: 'CP'
	},
	{
		term: 'euclide',
		tags: ['entiers', 'arithmétique'],
		definition: "Mathématicien grec. Associé à la division euclidienne et l'algorithme d'Euclide.",
		level: '6'
	},
	{
		term: 'euclidienne',
		tags: ['entiers', 'arithmétique'],
		level: '6',
		derivedFrom: 'division euclidienne'
	},
	{
		term: 'numération',
		tags: ['entiers', 'numération'],
		definition: 'Système de représentation des nombres (décimal, binaire, etc.).',
		level: 'CP'
	},
	{
		term: 'premier',
		tags: ['entiers', 'arithmétique'],
		definition: "Se dit d'un nombre n'ayant que deux diviseurs : $1$ et lui-même.",
		level: '5'
	},

	// =========================================================================
	// DECIMAUX
	// =========================================================================
	{
		term: 'nombre décimal',
		tags: ['décimaux'],
		definition:
			"Nombre pouvant s'écrire sous forme de fraction décimale. Ex : $3{,}14 = \\frac{314}{100}$.",
		level: 'CM1',
		synonyms: ['decimal']
	},
	{
		term: 'virgule',
		tags: ['décimaux'],
		definition:
			"Signe séparant la partie entière de la partie décimale dans l'écriture d'un nombre décimal.",
		level: 'CM1'
	},
	{
		term: 'partie entiere',
		tags: ['décimaux'],
		definition:
			"Partie d'un nombre décimal située à gauche de la virgule. Ex : dans $3{,}14$, la partie entière est $3$.",
		level: 'CM1'
	},
	{
		term: 'partie decimale',
		tags: ['décimaux'],
		definition:
			"Partie d'un nombre décimal située à droite de la virgule. Ex : dans $3{,}14$, la partie décimale est $0{,}14$.",
		level: 'CM1'
	},
	{
		term: 'dixieme',
		tags: ['décimaux', 'numération'],
		definition: 'Premier rang après la virgule. $0{,}1 = \\frac{1}{10}$.',
		level: 'CM1'
	},
	{
		term: 'centieme',
		tags: ['décimaux', 'numération'],
		definition: 'Deuxième rang après la virgule. $0{,}01 = \\frac{1}{100}$.',
		level: 'CM1'
	},
	{
		term: 'millieme',
		tags: ['décimaux', 'numération'],
		definition: 'Troisième rang après la virgule. $0{,}001 = \\frac{1}{1000}$.',
		level: 'CM2'
	},
	{
		term: 'fraction décimale',
		tags: ['décimaux', 'fractions'],
		definition:
			'Fraction dont le dénominateur est une puissance de $10$. Ex : $\\frac{7}{10}$, $\\frac{314}{100}$.',
		level: 'CM1'
	},
	{
		term: 'arrondi',
		tags: ['décimaux'],
		definition:
			"Valeur approchée d'un nombre obtenue en tronquant puis ajustant le dernier chiffre conservé. Ex : $3{,}14$ arrondi au dixieme est $3{,}1$.",
		level: 'CM2'
	},
	{
		term: 'arrondir',
		tags: ['décimaux'],
		level: 'CM2',
		derivedFrom: 'arrondi'
	},
	{
		term: 'décimal',
		tags: ['décimaux'],
		level: 'CM1',
		derivedFrom: 'nombre décimal'
	},
	{
		term: 'décimale',
		tags: ['décimaux'],
		level: 'CM1',
		derivedFrom: 'nombre décimal'
	},
	{
		term: 'troncature',
		tags: ['décimaux'],
		definition:
			"Valeur approchée obtenue en supprimant les chiffres au-delà d'un rang donné, sans arrondir.",
		level: '6'
	},
	{
		term: 'valeur approchée',
		tags: ['décimaux'],
		definition: "Nombre proche d'un nombre exact, par excès ou par défaut.",
		level: 'CM2'
	},
	{
		term: 'encadrement',
		tags: ['décimaux'],
		definition:
			"Encadrer un nombre $x$, c'est trouver deux nombres $a$ et $b$ tels que $a \\leq x \\leq b$.",
		level: '6'
	},
	{
		term: 'intercaler',
		tags: ['décimaux'],
		definition: 'Placer un nombre entre deux autres sur la droite graduée.',
		level: 'CM1'
	},

	// =========================================================================
	// FRACTIONS
	// =========================================================================
	{
		term: 'fraction',
		tags: ['fractions'],
		definition:
			'Écriture de la forme $\\frac{a}{b}$ où $a$ est le numérateur et $b$ le dénominateur ($b \\neq 0$).',
		level: 'CM1'
	},
	{
		term: 'numérateur',
		tags: ['fractions'],
		definition:
			'Nombre situé au-dessus de la barre de fraction. Dans $\\frac{3}{4}$, le numérateur est $3$.',
		level: 'CM1'
	},
	{
		term: 'dénominateur',
		tags: ['fractions'],
		definition:
			'Nombre situé sous la barre de fraction. Dans $\\frac{3}{4}$, le dénominateur est $4$.',
		level: 'CM1'
	},
	{
		term: 'fraction irréductible',
		tags: ['fractions', 'arithmétique'],
		definition:
			"Fraction dont le numérateur et le dénominateur n'ont pas de diviseur commun autre que $1$. Ex : $\\frac{3}{4}$ est irréductible.",
		level: '5'
	},
	{
		term: 'simplifier une fraction',
		tags: ['fractions', 'arithmétique'],
		definition:
			'Diviser le numérateur et le dénominateur par un même nombre. Ex : $\\frac{6}{8} = \\frac{3}{4}$.',
		level: '5'
	},
	{
		term: 'fractions egales',
		tags: ['fractions'],
		definition:
			'Deux fractions sont égales si elles représentent le même nombre. Ex : $\\frac{1}{2} = \\frac{2}{4}$.',
		level: 'CM2'
	},
	{
		term: 'mise au même dénominateur',
		tags: ['fractions'],
		definition:
			"Transformer des fractions pour qu'elles aient le même dénominateur, afin de les comparer ou les additionner.",
		level: '5'
	},
	{
		term: 'inverse',
		tags: ['fractions', 'operations'],
		definition:
			"L'inverse d'un nombre $a \\neq 0$ est $\\frac{1}{a}$. Ex : l'inverse de $3$ est $\\frac{1}{3}$.",
		level: '4'
	},
	{
		term: 'fractionnaire',
		tags: ['fractions'],
		level: 'CM1',
		derivedFrom: 'fraction'
	},
	{
		term: 'simplification',
		tags: ['fractions', 'calcul-littéral'],
		definition: 'Action de simplifier une fraction ou une expression.',
		level: '5'
	},
	{
		term: 'simplifier',
		tags: ['fractions', 'arithmétique'],
		level: '5',
		derivedFrom: 'simplifier une fraction'
	},

	// =========================================================================
	// RELATIFS
	// =========================================================================
	{
		term: 'nombre relatif',
		tags: ['relatifs'],
		definition:
			"Nombre muni d'un signe ($+$ ou $-$). L'ensemble des relatifs est $\\mathbb{Z} = \\{\\ldots, -2, -1, 0, 1, 2, \\ldots\\}$.",
		level: '5',
		synonyms: ['relatif', 'entier relatif']
	},
	{
		term: 'positif',
		tags: ['relatifs'],
		definition: "Un nombre est positif s'il est supérieur ou égal à $0$.",
		level: '5'
	},
	{
		term: 'négatif',
		tags: ['relatifs'],
		definition: "Un nombre est négatif s'il est inférieur ou égal à $0$.",
		level: '5'
	},
	{
		term: 'opposé',
		tags: ['relatifs'],
		definition:
			"L'opposé d'un nombre $a$ est $-a$. Leur somme vaut $0$. Ex : l'opposé de $3$ est $-3$.",
		level: '5'
	},
	{
		term: 'valeur absolue',
		tags: ['relatifs'],
		definition: "Distance d'un nombre à zéro. $|{-3}| = |3| = 3$.",
		level: '4'
	},
	{
		term: 'signe',
		tags: ['relatifs'],
		definition: "Indication positive ($+$) ou négative ($-$) d'un nombre relatif.",
		level: '5'
	},
	{
		term: 'distance a zero',
		tags: ['relatifs'],
		definition: "La distance à zéro d'un nombre est sa valeur absolue.",
		level: '5',
		synonyms: ['valeur absolue']
	},
	{
		term: 'irrationnel',
		tags: ['relatifs'],
		level: '3',
		derivedFrom: 'nombre relatif'
	},
	{
		term: 'rationnel',
		tags: ['relatifs'],
		level: '4',
		derivedFrom: 'nombre relatif'
	},
	{
		term: 'relatif',
		tags: ['relatifs'],
		level: '5',
		derivedFrom: 'nombre relatif'
	},

	// =========================================================================
	// CALCUL LITTERAL
	// =========================================================================
	{
		term: 'expression',
		tags: ['calcul-littéral'],
		definition: 'Suite de nombres et de lettres reliés par des opérations. Ex : $3x + 2$.',
		level: '5'
	},
	{
		term: 'expression litterale',
		tags: ['calcul-littéral'],
		definition: 'Expression contenant au moins une lettre représentant un nombre. Ex : $2a + b$.',
		level: '5',
		synonyms: ['expression algebrique']
	},
	{
		term: 'variable',
		tags: ['calcul-littéral'],
		definition: 'Lettre représentant un nombre inconnu ou pouvant varier. Ex : $x$ dans $2x + 3$.',
		level: '5'
	},
	{
		term: 'équation',
		tags: ['calcul-littéral', 'équations'],
		definition: 'Égalité contenant une inconnue à déterminer. Ex : $2x + 3 = 7$.',
		level: '4'
	},
	{
		term: 'inconnue',
		tags: ['calcul-littéral', 'équations'],
		definition:
			"Valeur à trouver dans une équation. Souvent notée $x$. Ex : dans $2x + 3 = 7$, l'inconnue est $x = 2$.",
		level: '4'
	},
	{
		term: 'solution (équation)',
		tags: ['calcul-littéral', 'équations'],
		definition:
			"Valeur de l'inconnue qui rend l'équation vraie. Ex : $x = 2$ est la solution de $2x + 3 = 7$.",
		level: '4'
	},
	{
		term: 'développer',
		tags: ['calcul-littéral'],
		definition:
			'Transformer un produit en somme en utilisant la distributivité. Ex : $3(x + 2) = 3x + 6$.',
		level: '4'
	},
	{
		term: 'factoriser',
		tags: ['calcul-littéral'],
		definition: 'Transformer une somme en produit. Ex : $3x + 6 = 3(x + 2)$.',
		level: '3'
	},
	{
		term: 'réduire',
		tags: ['calcul-littéral'],
		definition: 'Regrouper les termes semblables dans une expression. Ex : $3x + 2x = 5x$.',
		level: '5'
	},
	{
		term: 'distributivite',
		tags: ['calcul-littéral'],
		definition: 'Propriété : $a(b + c) = ab + ac$. Permet de développer ou factoriser.',
		level: '5'
	},
	{
		term: 'identité remarquable',
		tags: ['calcul-littéral'],
		definition: 'Formule algébrique classique. Ex : $(a + b)^2 = a^2 + 2ab + b^2$.',
		level: '3'
	},
	{
		term: 'coefficient',
		tags: ['calcul-littéral'],
		definition: 'Nombre qui multiplie une variable. Ex : dans $5x$, le coefficient de $x$ est $5$.',
		level: '5'
	},
	{
		term: 'monome',
		tags: ['calcul-littéral'],
		definition: "Expression constituée d'un coefficient et de variables. Ex : $3x^2$.",
		level: '3'
	},
	{
		term: 'polynôme',
		tags: ['calcul-littéral'],
		definition: 'Somme de monômes. Ex : $2x^2 + 3x - 1$.',
		level: '2'
	},
	{
		term: 'degre',
		tags: ['calcul-littéral'],
		definition:
			'Plus grand exposant de la variable dans un polynôme. Ex : le degré de $2x^3 + x$ est $3$.',
		level: '2'
	},
	{
		term: 'inéquation',
		tags: ['calcul-littéral', 'équations'],
		definition: 'Inégalité contenant une inconnue. Ex : $2x + 1 > 5$.',
		level: '4'
	},
	{
		term: "système d'equations",
		tags: ['calcul-littéral', 'équations'],
		definition:
			'Ensemble de plusieurs équations à résoudre simultanément. Ex : $\\{x + y = 5;\\; x - y = 1\\}$.',
		level: '3'
	},
	{
		term: 'substituer',
		tags: ['calcul-littéral'],
		definition:
			'Remplacer une variable par une valeur numérique. Ex : si $x = 3$, alors $2x + 1 = 7$.',
		level: '5'
	},
	{
		term: 'algèbre',
		tags: ['calcul-littéral'],
		definition: 'Branche des mathématiques utilisant des lettres pour représenter des nombres.',
		level: '4'
	},
	{
		term: 'algébrique',
		tags: ['calcul-littéral'],
		level: '4',
		derivedFrom: 'algèbre'
	},
	{
		term: 'développement',
		tags: ['calcul-littéral'],
		definition: 'Action de transformer un produit en somme par distributivité.',
		level: '4'
	},
	{
		term: 'factorisation',
		tags: ['calcul-littéral'],
		definition: 'Action de transformer une somme en produit.',
		level: '3'
	},
	{
		term: 'inégalité',
		tags: ['calcul-littéral'],
		definition: "Relation d'ordre entre deux expressions : $<$, $>$, $\\leq$, $\\geq$.",
		level: '4'
	},
	{
		term: 'littéral',
		tags: ['calcul-littéral'],
		level: '5',
		derivedFrom: 'expression litterale'
	},
	{
		term: 'resoudre',
		tags: ['calcul-littéral', 'équations'],
		level: '4',
		derivedFrom: 'solution (équation)'
	},
	{
		term: 'solution',
		tags: ['calcul-littéral', 'équations'],
		definition: 'Valeur qui vérifie une équation ou un problème.',
		level: '4',
		derivedFrom: 'solution (équation)'
	},

	// =========================================================================
	// GRANDEURS ET MESURES
	// =========================================================================
	{
		term: 'périmètre',
		tags: ['grandeurs', 'géométrie'],
		definition:
			"Longueur du contour d'une figure. Ex : le périmètre d'un rectangle est $2(L + l)$.",
		level: 'CE1'
	},
	{
		term: 'aire',
		tags: ['grandeurs', 'géométrie'],
		definition: "Mesure de la surface d'une figure. Ex : l'aire d'un rectangle est $L \\times l$.",
		level: 'CM1'
	},
	{
		term: 'volume',
		tags: ['grandeurs', 'géométrie'],
		definition:
			"Mesure de l'espace occupé par un solide. Ex : le volume d'un pavé droit est $L \\times l \\times h$.",
		level: 'CM2'
	},
	{
		term: 'conversion',
		tags: ['grandeurs'],
		definition: "Passage d'une unité à une autre. Ex : $1\\,\\text{km} = 1000\\,\\text{m}$.",
		level: 'CE2'
	},
	{
		term: 'longueur',
		tags: ['grandeurs', 'géométrie'],
		definition:
			'Grandeur mesurant une distance. Unités : $\\text{mm}$, $\\text{cm}$, $\\text{m}$, $\\text{km}$.',
		level: 'CP'
	},
	{
		term: 'masse',
		tags: ['grandeurs'],
		definition:
			'Grandeur mesurant la quantité de matière. Unités : $\\text{g}$, $\\text{kg}$, $\\text{t}$.',
		level: 'CE1'
	},
	{
		term: 'capacite',
		tags: ['grandeurs'],
		definition: "Volume d'un récipient. Unités : $\\text{mL}$, $\\text{cL}$, $\\text{L}$.",
		level: 'CE1'
	},
	{
		term: 'durée',
		tags: ['grandeurs'],
		definition: 'Grandeur mesurant un intervalle de temps. Unités : secondes, minutes, heures.',
		level: 'CE1'
	},
	{
		term: 'grandeur',
		tags: ['grandeurs'],
		definition: 'Ce qui peut être mesuré : longueur, masse, durée, aire, volume, etc.',
		level: 'CE1'
	},
	{
		term: 'vitesse',
		tags: ['grandeurs', 'proportionnalité'],
		definition:
			'Rapport entre une distance et un temps. $v = \\frac{d}{t}$. Unités : $\\text{km/h}$, $\\text{m/s}$.',
		level: '4'
	},
	{
		term: 'angle',
		tags: ['grandeurs', 'géométrie'],
		definition: 'Figure formée par deux demi-droites de même origine. Se mesure en degrés ($°$).',
		level: 'CE2'
	},
	{
		term: 'angle droit',
		tags: ['grandeurs', 'géométrie'],
		definition: 'Angle mesurant $90°$.',
		level: 'CE1'
	},
	{
		term: 'angle aigu',
		tags: ['grandeurs', 'géométrie'],
		definition: 'Angle mesurant moins de $90°$.',
		level: 'CM1'
	},
	{
		term: 'angle obtus',
		tags: ['grandeurs', 'géométrie'],
		definition: 'Angle mesurant entre $90°$ et $180°$.',
		level: 'CM1'
	},
	{
		term: 'centimètre',
		tags: ['grandeurs'],
		definition: 'Unité de longueur. $1\\,\\text{cm} = 0{,}01\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'construction',
		tags: ['géométrie'],
		definition: "Réalisation d'une figure géométrique à l'aide d'instruments.",
		level: 'CE1'
	},
	{
		term: 'construire',
		tags: ['géométrie'],
		level: 'CE1',
		derivedFrom: 'construction'
	},
	{
		term: 'convertir',
		tags: ['grandeurs'],
		level: 'CE2',
		derivedFrom: 'conversion'
	},
	{
		term: 'décamètre',
		tags: ['grandeurs'],
		definition: 'Unité de longueur. $1\\,\\text{dam} = 10\\,\\text{m}$.',
		level: 'CE2'
	},
	{
		term: 'décimètre',
		tags: ['grandeurs'],
		definition: 'Unité de longueur. $1\\,\\text{dm} = 0{,}1\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'distance',
		tags: ['géométrie', 'grandeurs'],
		definition: 'Longueur du plus court chemin entre deux points.',
		level: 'CE1'
	},
	{
		term: 'gradué',
		tags: ['grandeurs'],
		definition: "Muni d'une graduation. Ex : droite graduée, règle graduée.",
		level: 'CE1'
	},
	{
		term: 'graduer',
		tags: ['grandeurs'],
		level: '6',
		derivedFrom: 'gradué'
	},
	{
		term: 'hauteur',
		tags: ['grandeurs', 'géométrie'],
		definition: "Dimension verticale d'un objet ou d'une figure.",
		level: 'CE1'
	},
	{
		term: 'hectomètre',
		tags: ['grandeurs'],
		definition: 'Unité de longueur. $1\\,\\text{hm} = 100\\,\\text{m}$.',
		level: 'CE2'
	},
	{
		term: 'kilomètre',
		tags: ['grandeurs'],
		definition: 'Unité de longueur. $1\\,\\text{km} = 1000\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'largeur',
		tags: ['grandeurs', 'géométrie'],
		definition: "Plus petite dimension d'un rectangle.",
		level: 'CE1'
	},
	{
		term: 'mesure',
		tags: ['grandeurs'],
		definition: "Évaluation d'une grandeur à l'aide d'une unité.",
		level: 'CE1'
	},
	{
		term: 'mesurer',
		tags: ['grandeurs'],
		level: 'CE1',
		derivedFrom: 'mesure'
	},
	{
		term: 'mètre',
		tags: ['grandeurs'],
		definition: 'Unité de base du système international pour les longueurs.',
		level: 'CP'
	},
	{
		term: 'millimètre',
		tags: ['grandeurs'],
		definition: 'Unité de longueur. $1\\,\\text{mm} = 0{,}001\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'surface',
		tags: ['géométrie', 'grandeurs'],
		definition: "Étendue d'une figure plane. Synonyme d'aire.",
		level: 'CM1'
	},

	// =========================================================================
	// PROPORTIONNALITE
	// =========================================================================
	{
		term: 'proportionnel',
		tags: ['proportionnalité'],
		definition:
			"Deux grandeurs sont proportionnelles si l'une est obtenue en multipliant l'autre par un même nombre constant.",
		level: 'CM2'
	},
	{
		term: 'coefficient de proportionnalité',
		tags: ['proportionnalité'],
		definition: "Constante par laquelle on multiplie une grandeur pour obtenir l'autre.",
		level: '6'
	},
	{
		term: 'tableau de proportionnalité',
		tags: ['proportionnalité'],
		definition:
			'Tableau dans lequel les valeurs de deux grandeurs proportionnelles sont en correspondance.',
		level: 'CM2'
	},
	{
		term: 'pourcentage',
		tags: ['proportionnalité'],
		definition: 'Proportion exprimée sur $100$. Ex : $25\\%$ signifie $\\frac{25}{100}$.',
		level: 'CM2'
	},
	{
		term: 'échelle',
		tags: ['proportionnalité', 'grandeurs'],
		definition:
			"Rapport entre les dimensions d'une représentation et les dimensions réelles. Ex : échelle $1/1000$.",
		level: 'CM2'
	},
	{
		term: 'produit en croix',
		tags: ['proportionnalité'],
		definition:
			'Méthode pour trouver une valeur manquante dans un tableau de proportionnalité : $\\frac{a}{b} = \\frac{c}{d} \\Rightarrow a \\times d = b \\times c$.',
		level: '6'
	},
	{
		term: 'taux',
		tags: ['proportionnalité'],
		definition: 'Rapport exprimé en pourcentage. Ex : un taux de $5\\%$ signifie $\\frac{5}{100}$.',
		level: '4'
	},
	{
		term: 'augmentation',
		tags: ['proportionnalité'],
		definition: "Variation positive d'une grandeur. Augmenter de $20\\%$ : multiplier par $1{,}2$.",
		level: '4'
	},
	{
		term: 'diminution',
		tags: ['proportionnalité'],
		definition: "Variation négative d'une grandeur. Diminuer de $20\\%$ : multiplier par $0{,}8$.",
		level: '4',
		synonyms: ['reduction']
	},
	{
		term: 'coefficient multiplicateur',
		tags: ['proportionnalité'],
		definition:
			'Nombre par lequel on multiplie pour appliquer une variation. Ex : $+20\\% \\Rightarrow \\times 1{,}2$.',
		level: '2'
	},
	{
		term: 'proportion',
		tags: ['proportionnalité'],
		definition: 'Égalité de deux rapports. Ex : $\\frac{a}{b} = \\frac{c}{d}$.',
		level: 'CM2'
	},
	{
		term: 'proportionnalité',
		tags: ['proportionnalité'],
		definition: 'Relation entre deux grandeurs dont le rapport est constant.',
		level: 'CM2'
	},
	{
		term: 'rapport',
		tags: ['proportionnalité'],
		definition: 'Quotient de deux grandeurs. Ex : rapport $\\frac{a}{b}$.',
		level: '6'
	},
	{
		term: 'ratio',
		tags: ['proportionnalité'],
		definition: 'Rapport entre deux quantités. Synonyme de rapport.',
		level: '6'
	},

	// =========================================================================
	// PUISSANCES
	// =========================================================================
	{
		term: 'puissance',
		tags: ['puissances'],
		definition:
			'$a^n$ est le produit de $n$ facteurs égaux a $a$. Ex : $2^3 = 2 \\times 2 \\times 2 = 8$.',
		level: '4'
	},
	{
		term: 'exposant',
		tags: ['puissances'],
		definition:
			"Nombre indiquant combien de fois la base est multipliée par elle-même. Dans $a^n$, $n$ est l'exposant.",
		level: '4'
	},
	{
		term: 'base',
		tags: ['puissances'],
		definition: 'Nombre élevé à une puissance. Dans $a^n$, $a$ est la base.',
		level: '4'
	},
	{
		term: 'carré',
		tags: ['puissances', 'entiers'],
		definition: "Deuxième puissance d'un nombre. $a^2 = a \\times a$. Ex : $5^2 = 25$.",
		level: '6'
	},
	{
		term: 'cube',
		tags: ['puissances', 'entiers'],
		definition: "Troisième puissance d'un nombre. $a^3 = a \\times a \\times a$. Ex : $2^3 = 8$.",
		level: '6'
	},
	{
		term: 'notation scientifique',
		tags: ['puissances'],
		definition:
			"Écriture d'un nombre sous la forme $a \\times 10^n$ avec $1 \\leq a < 10$. Ex : $0{,}003 = 3 \\times 10^{-3}$.",
		level: '4'
	},
	{
		term: 'puissance de dix',
		tags: ['puissances'],
		definition: 'Nombre de la forme $10^n$. Ex : $10^3 = 1000$, $10^{-2} = 0{,}01$.',
		level: '4'
	},
	{
		term: 'exposant négatif',
		tags: ['puissances'],
		definition: '$a^{-n} = \\frac{1}{a^n}$. Ex : $2^{-3} = \\frac{1}{8}$.',
		level: '4'
	},

	// =========================================================================
	// RACINES CARREES
	// =========================================================================
	{
		term: 'racine carree',
		tags: ['racines-carrees'],
		definition: '$\\sqrt{a}$ est le nombre positif dont le carré vaut $a$. Ex : $\\sqrt{25} = 5$.',
		level: '3',
		synonyms: ['racine']
	},
	{
		term: 'racine',
		tags: ['racines-carrees'],
		definition: "Racine carrée d'un nombre. $\\sqrt{a}$.",
		level: '3',
		derivedFrom: 'racine carree'
	},
	{
		term: 'radical',
		tags: ['racines-carrees'],
		definition: 'Symbole $\\sqrt{\\phantom{x}}$ désignant la racine carrée.',
		level: '3'
	},
	{
		term: 'carré parfait',
		tags: ['racines-carrees', 'entiers'],
		definition: "Entier qui est le carré d'un autre entier. Ex : $1, 4, 9, 16, 25, 36, \\ldots$",
		level: '3'
	},

	// =========================================================================
	// FONCTIONS
	// =========================================================================
	{
		term: 'fonction',
		tags: ['fonctions'],
		definition:
			"Relation qui associe à chaque élément d'un ensemble de départ un unique élément d'un ensemble d'arrivée.",
		level: '3'
	},
	{
		term: 'image',
		tags: ['fonctions'],
		definition:
			"$f(x)$ est l'image de $x$ par la fonction $f$. Ex : si $f(x) = 2x$, l'image de $3$ est $6$.",
		level: '3'
	},
	{
		term: 'antécédent',
		tags: ['fonctions'],
		definition:
			'$x$ est un antécédent de $y$ par $f$ si $f(x) = y$. Ex : $3$ est un antécédent de $6$ par $f(x) = 2x$.',
		level: '3',
		synonyms: ['antécédent']
	},
	{
		term: 'fonction linéaire',
		tags: ['fonctions', 'proportionnalité'],
		definition: 'Fonction de la forme $f(x) = ax$. Représente une situation de proportionnalité.',
		level: '3'
	},
	{
		term: 'fonction affine',
		tags: ['fonctions'],
		definition: 'Fonction de la forme $f(x) = ax + b$. Sa représentation graphique est une droite.',
		level: '3'
	},
	{
		term: 'croissante',
		tags: ['fonctions'],
		definition:
			'Une fonction est croissante sur un intervalle si, quand $x$ augmente, $f(x)$ augmente.',
		level: '3'
	},
	{
		term: 'croissant',
		tags: ['fonctions'],
		level: '3',
		derivedFrom: 'croissante'
	},
	{
		term: 'décroissante',
		tags: ['fonctions'],
		definition:
			'Une fonction est décroissante sur un intervalle si, quand $x$ augmente, $f(x)$ diminue.',
		level: '3'
	},
	{
		term: 'décroissant',
		tags: ['fonctions'],
		level: '3',
		derivedFrom: 'décroissante'
	},
	{
		term: 'maximum',
		tags: ['fonctions'],
		definition: 'Plus grande valeur atteinte par une fonction sur un intervalle.',
		level: '2'
	},
	{
		term: 'minimum',
		tags: ['fonctions'],
		definition: 'Plus petite valeur atteinte par une fonction sur un intervalle.',
		level: '2'
	},
	{
		term: 'courbe représentative',
		tags: ['fonctions'],
		definition:
			"Ensemble des points $(x, f(x))$ dans un repère. Représentation graphique d'une fonction.",
		level: '2'
	},
	{
		term: 'courbe',
		tags: ['fonctions'],
		definition: 'Ligne représentant graphiquement une fonction ou une relation.',
		level: '3'
	},
	{
		term: 'representer',
		tags: ['fonctions'],
		level: '2',
		derivedFrom: 'courbe représentative'
	},
	{
		term: 'abscisse',
		tags: ['fonctions', 'géométrie'],
		definition:
			"Coordonnée horizontale d'un point dans un repère. Première coordonnée du couple $(x, y)$.",
		level: '5'
	},
	{
		term: 'ordonnée',
		tags: ['fonctions', 'géométrie'],
		definition:
			"Coordonnée verticale d'un point dans un repère. Deuxième coordonnée du couple $(x, y)$.",
		level: '5'
	},
	{
		term: "ordonnée à l'origine",
		tags: ['fonctions'],
		definition:
			"Valeur $f(0)$, le point où la courbe coupe l'axe des ordonnées. Pour $f(x) = ax + b$, c'est $b$.",
		level: '3'
	},
	{
		term: 'coefficient directeur',
		tags: ['fonctions'],
		definition: "Pente d'une droite. Pour $f(x) = ax + b$, le coefficient directeur est $a$.",
		level: '3',
		synonyms: ['pente']
	},
	{
		term: 'repère',
		tags: ['fonctions', 'géométrie'],
		definition:
			"Système d'axes perpendiculaires gradué permettant de représenter des points par leurs coordonnées.",
		level: '5',
		synonyms: ['repere orthonorme']
	},
	{
		term: 'tableau de valeurs',
		tags: ['fonctions'],
		definition: 'Tableau donnant des couples $(x, f(x))$ pour représenter une fonction.',
		level: '3'
	},
	{
		term: 'tableau de signes',
		tags: ['fonctions'],
		definition:
			'Tableau indiquant les intervalles où une expression est positive, négative ou nulle.',
		level: '2'
	},
	{
		term: 'tableau de variations',
		tags: ['fonctions'],
		definition: "Tableau résumant les intervalles de croissance et décroissance d'une fonction.",
		level: '2'
	},
	{
		term: 'fonction carrée',
		tags: ['fonctions'],
		definition: 'Fonction $f(x) = x^2$. Sa courbe est une parabole.',
		level: '2'
	},
	{
		term: 'fonction inverse',
		tags: ['fonctions'],
		definition: 'Fonction $f(x) = \\frac{1}{x}$ ($x \\neq 0$). Sa courbe est une hyperbole.',
		level: '2'
	},
	{
		term: 'fonction racine carrée',
		tags: ['fonctions', 'racines-carrees'],
		definition: 'Fonction $f(x) = \\sqrt{x}$ définie pour $x \\geq 0$.',
		level: '2'
	},
	{
		term: 'dérivée',
		tags: ['fonctions'],
		definition:
			"Fonction $f'$ qui donne le taux de variation instantané de $f$. $f'(a)$ est la pente de la tangente en $a$.",
		level: '1_SPE'
	},
	{
		term: 'tangente',
		tags: ['fonctions', 'géométrie'],
		definition:
			'Droite qui touche la courbe en un point et à la même pente que la courbe en ce point.',
		level: '1_SPE'
	},
	{
		term: 'nombre dérivé',
		tags: ['fonctions'],
		definition: "Valeur de la dérivée en un point : $f'(a)$.",
		level: '1_SPE'
	},
	{
		term: 'taux de variation',
		tags: ['fonctions'],
		definition: '$\\frac{f(b) - f(a)}{b - a}$ : variation moyenne de $f$ entre $a$ et $b$.',
		level: '2'
	},
	{
		term: 'extremum',
		tags: ['fonctions'],
		definition: "Maximum ou minimum local d'une fonction. En un extremum, $f'(a) = 0$.",
		level: '1_SPE',
		synonyms: ['extrema']
	},
	{
		term: 'fonction exponentielle',
		tags: ['fonctions'],
		definition:
			'Fonction $f(x) = e^x$ ($\\exp(x)$). Seule fonction égale à sa propre dérivée avec $f(0) = 1$.',
		level: 'T_SPE'
	},
	{
		term: 'fonction logarithme',
		tags: ['fonctions'],
		definition:
			"Fonction $\\ln(x)$ définie pour $x > 0$. Réciproque de l'exponentielle : $\\ln(e^x) = x$.",
		level: 'T_SPE',
		synonyms: ['logarithme neperien']
	},
	{
		term: 'intervalle',
		tags: ['fonctions'],
		definition:
			'Ensemble de nombres réels compris entre deux bornes. Ex : $[2; 5]$, $]-\\infty; 3[$.',
		level: '2'
	},
	{
		term: 'ensemble de définition',
		tags: ['fonctions'],
		definition: 'Ensemble des valeurs de $x$ pour lesquelles $f(x)$ est définie.',
		level: '2'
	},
	{
		term: 'primitive',
		tags: ['fonctions'],
		definition: "Fonction $F$ telle que $F' = f$. Ex : une primitive de $2x$ est $x^2$.",
		level: 'T_SPE'
	},
	{
		term: 'continu',
		tags: ['fonctions'],
		definition: "Se dit d'une fonction sans saut ni trou sur un intervalle.",
		level: 'T_SPE'
	},
	{
		term: 'continuité',
		tags: ['fonctions'],
		definition: "Propriété d'une fonction continue : pas de rupture dans la courbe.",
		level: 'T_SPE'
	},
	{
		term: 'dériver',
		tags: ['fonctions'],
		level: '1_SPE',
		derivedFrom: 'dérivée'
	},
	{
		term: 'exponentielle',
		tags: ['fonctions'],
		definition: 'Fonction $f(x) = e^x$. Seule fonction égale à sa propre dérivée.',
		level: 'T_SPE'
	},
	{
		term: 'intégrale',
		tags: ['fonctions'],
		definition: "Outil du calcul intégral. $\\int_a^b f(x)\\,dx$ mesure l'aire sous la courbe.",
		level: 'T_SPE'
	},
	{
		term: 'intégrer',
		tags: ['fonctions'],
		level: 'T_SPE',
		derivedFrom: 'intégrale'
	},
	{
		term: 'limite',
		tags: ['fonctions', 'suites'],
		definition: 'Valeur vers laquelle tend une suite ou une fonction.',
		level: 'T_SPE'
	},
	{
		term: 'logarithme',
		tags: ['fonctions'],
		definition: "Fonction réciproque de l'exponentielle. $\\ln(e^x) = x$.",
		level: 'T_SPE'
	},
	{
		term: 'coordonnée',
		tags: ['géométrie', 'fonctions'],
		definition: "Nombre repérant la position d'un point sur un axe ou dans un plan.",
		level: '5'
	},

	// =========================================================================
	// SUITES
	// =========================================================================
	{
		term: 'suite',
		tags: ['suites'],
		definition:
			'Fonction de $\\mathbb{N}$ dans $\\mathbb{R}$. Liste ordonnée de nombres : $u_0, u_1, u_2, \\ldots$',
		level: '1_SPE',
		synonyms: ['suite numerique']
	},
	{
		term: 'terme (suite)',
		tags: ['suites'],
		definition: "Élément d'une suite. $u_n$ est le terme de rang $n$.",
		level: '1_SPE'
	},
	{
		term: 'rang',
		tags: ['suites'],
		definition: "Indice d'un terme dans une suite. Dans $u_5$, le rang est $5$.",
		level: '1_SPE'
	},
	{
		term: 'raison',
		tags: ['suites'],
		definition:
			'Constante $r$ telle que $u_{n+1} = u_n + r$ (arithmétique) ou $u_{n+1} = u_n \\times q$ (géométrique, notée $q$).',
		level: '1_SPE'
	},
	{
		term: 'suite arithmétique',
		tags: ['suites'],
		definition:
			'Suite telle que $u_{n+1} = u_n + r$ (raison constante). Ex : $2, 5, 8, 11, \\ldots$ (raison $3$).',
		level: '1_SPE'
	},
	{
		term: 'suite géométrique',
		tags: ['suites'],
		definition:
			'Suite telle que $u_{n+1} = u_n \\times q$ ($q$ constante). Ex : $3, 6, 12, 24, \\ldots$ (raison $2$).',
		level: '1_SPE'
	},
	{
		term: 'suite croissante',
		tags: ['suites'],
		definition: 'Suite telle que $u_{n+1} \\geq u_n$ pour tout $n$.',
		level: '1_SPE'
	},
	{
		term: 'suite décroissante',
		tags: ['suites'],
		definition: 'Suite telle que $u_{n+1} \\leq u_n$ pour tout $n$.',
		level: '1_SPE'
	},
	{
		term: 'convergente',
		tags: ['suites'],
		definition: "Suite qui tend vers une limite finie quand $n$ tend vers l'infini.",
		level: 'T_SPE'
	},
	{
		term: 'divergente',
		tags: ['suites'],
		definition: "Suite qui ne converge pas (tend vers l'infini ou oscille).",
		level: 'T_SPE'
	},
	{
		term: 'terme général',
		tags: ['suites'],
		definition: 'Formule explicite donnant $u_n$ en fonction de $n$. Ex : $u_n = 3n + 2$.',
		level: '1_SPE'
	},
	{
		term: 'récurrence',
		tags: ['suites'],
		definition:
			'Relation définissant chaque terme à partir du (ou des) précédent(s). Ex : $u_{n+1} = 2u_n + 1$.',
		level: '1_SPE',
		synonyms: ['relation de recurrence']
	},
	{
		term: 'consécutif',
		tags: ['transversal'],
		level: '6',
		derivedFrom: 'suite'
	},
	{
		term: 'série',
		tags: ['suites'],
		definition: "Somme des termes d'une suite. $S_n = \\sum_{k=0}^{n} u_k$.",
		level: 'T_SPE'
	},

	// =========================================================================
	// PROBABILITES
	// =========================================================================
	{
		term: 'probabilité',
		tags: ['probabilités'],
		definition: "Nombre entre $0$ et $1$ mesurant la chance qu'un événement se produise.",
		level: '5'
	},
	{
		term: 'expérience aléatoire',
		tags: ['probabilités'],
		definition: 'Expérience dont le résultat dépend du hasard. Ex : lancer un dé.',
		level: '5'
	},
	{
		term: 'issue',
		tags: ['probabilités'],
		definition: "Résultat possible d'une expérience aléatoire. Ex : obtenir $3$ en lançant un dé.",
		level: '5',
		synonyms: ['eventualite']
	},
	{
		term: 'événement',
		tags: ['probabilités'],
		definition:
			"Ensemble d'issues. Ex : obtenir un nombre pair en lançant un dé ($\\{2, 4, 6\\}$).",
		level: '5'
	},
	{
		term: 'univers',
		tags: ['probabilités'],
		definition:
			'Ensemble de toutes les issues possibles. Ex : pour un dé, $\\Omega = \\{1, 2, 3, 4, 5, 6\\}$.',
		level: '5'
	},
	{
		term: 'équiprobabilité',
		tags: ['probabilités'],
		definition: 'Situation où toutes les issues ont la même probabilité.',
		level: '5'
	},
	{
		term: 'événement contraire',
		tags: ['probabilités'],
		definition: "Complémentaire d'un événement. $P(\\bar{A}) = 1 - P(A)$.",
		level: '5'
	},
	{
		term: 'arbre de probabilités',
		tags: ['probabilités'],
		definition:
			"Schéma en arbre représentant les étapes successives d'une expérience aléatoire et les probabilités associées.",
		level: '3'
	},
	{
		term: 'fréquence',
		tags: ['probabilités', 'statistiques'],
		definition:
			"Rapport du nombre d'occurrences d'un événement au nombre total d'expériences. $f = \\frac{\\text{effectif}}{\\text{total}}$.",
		level: '5'
	},
	{
		term: 'loi de probabilité',
		tags: ['probabilités'],
		definition:
			'Tableau associant à chaque issue sa probabilité. La somme des probabilités vaut $1$.',
		level: '3'
	},
	{
		term: 'variable aléatoire',
		tags: ['probabilités'],
		definition: "Fonction associant un nombre réel à chaque issue d'une expérience aléatoire.",
		level: '1_SPE'
	},
	{
		term: 'espérance',
		tags: ['probabilités'],
		definition: "Valeur moyenne d'une variable aléatoire. $E(X) = \\sum x_i \\cdot P(X = x_i)$.",
		level: '1_SPE'
	},
	{
		term: 'combinaison',
		tags: ['probabilités'],
		definition: 'Nombre de façons de choisir $k$ éléments parmi $n$ : $\\binom{n}{k}$.',
		level: 'T_SPE'
	},
	{
		term: 'permutation',
		tags: ['probabilités'],
		definition: "Arrangement ordonné de tous les éléments d'un ensemble.",
		level: 'T_SPE'
	},

	// =========================================================================
	// STATISTIQUES
	// =========================================================================
	{
		term: 'moyenne',
		tags: ['statistiques'],
		definition:
			'Somme des valeurs divisée par le nombre de valeurs. $\\bar{x} = \\frac{\\sum x_i}{n}$.',
		level: '6'
	},
	{
		term: 'médiane',
		tags: ['statistiques'],
		definition: 'Valeur qui partage une série ordonnée en deux parties de même effectif.',
		level: '5'
	},
	{
		term: 'étendue',
		tags: ['statistiques'],
		definition: "Différence entre la plus grande et la plus petite valeur d'une série.",
		level: '5'
	},
	{
		term: 'effectif',
		tags: ['statistiques'],
		definition: "Nombre de fois qu'une valeur apparaît dans une série statistique.",
		level: '5'
	},
	{
		term: 'diagramme',
		tags: ['statistiques'],
		definition: 'Représentation graphique de données statistiques (barres, circulaire, etc.).',
		level: 'CE2'
	},
	{
		term: 'quartile',
		tags: ['statistiques'],
		definition:
			'Valeurs qui partagent une série ordonnée en quatre parties de même effectif ($Q_1$, $Q_2$, $Q_3$).',
		level: '3'
	},
	{
		term: 'écart type',
		tags: ['statistiques'],
		definition:
			'Mesure de la dispersion des valeurs autour de la moyenne. $\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}$.',
		level: '2'
	},
	{
		term: 'variance',
		tags: ['statistiques'],
		definition: "Carré de l'écart type. $V = \\frac{\\sum (x_i - \\bar{x})^2}{n}$.",
		level: '2'
	},
	{
		term: 'statistiques',
		tags: ['statistiques'],
		definition:
			"Branche des mathématiques traitant de la collecte, l'analyse et l'interprétation des données.",
		level: '5'
	},
	{
		term: 'statistique',
		tags: ['statistiques'],
		level: '5',
		derivedFrom: 'statistiques'
	},

	// =========================================================================
	// GEOMETRIE (transversal pour fill-in-blanks)
	// =========================================================================
	{
		term: 'segment',
		tags: ['géométrie'],
		definition: "Partie d'une droite délimitée par deux points. Noté $[AB]$.",
		level: 'CP'
	},
	{
		term: 'droite',
		tags: ['géométrie'],
		definition: 'Ligne infinie, sans courbure. Notée $(AB)$.',
		level: 'CP'
	},
	{
		term: 'demi-droite',
		tags: ['géométrie'],
		definition: "Partie d'une droite ayant une origine mais pas de fin. Notée $[AB)$.",
		level: 'CE1'
	},
	{
		term: 'perpendiculaire',
		tags: ['géométrie'],
		definition: 'Deux droites sont perpendiculaires si elles forment un angle droit ($90°$).',
		level: 'CE2'
	},
	{
		term: 'parallèle',
		tags: ['géométrie'],
		definition: 'Deux droites sont parallèles si elles ne se coupent jamais.',
		level: 'CE2'
	},
	{
		term: 'symétrie axiale',
		tags: ['géométrie'],
		definition: 'Transformation qui associe à un point son symétrique par rapport à un axe.',
		level: '6'
	},
	{
		term: 'symétrie centrale',
		tags: ['géométrie'],
		definition: 'Transformation qui associe à un point son symétrique par rapport à un centre.',
		level: '5'
	},
	{
		term: 'translation',
		tags: ['géométrie'],
		definition:
			'Transformation qui déplace chaque point de la même direction, du même sens et de la même distance.',
		level: '4'
	},
	{
		term: 'rotation',
		tags: ['géométrie'],
		definition:
			"Transformation qui fait tourner chaque point autour d'un centre, d'un angle donné.",
		level: '4'
	},
	{
		term: 'homothetie',
		tags: ['géométrie'],
		definition:
			'Transformation qui agrandit ou réduit une figure par rapport à un centre et un rapport $k$.',
		level: '3'
	},
	{
		term: 'théorème de Pythagore',
		tags: ['géométrie'],
		definition: "Dans un triangle rectangle, $c^2 = a^2 + b^2$ où $c$ est l'hypoténuse.",
		level: '4',
		synonyms: ['Pythagore']
	},
	{
		term: 'théorème de Thalès',
		tags: ['géométrie', 'proportionnalité'],
		definition:
			'Si deux droites parallèles coupent deux sécantes, alors elles déterminent des segments proportionnels.',
		level: '3',
		synonyms: ['Thales']
	},
	{
		term: 'hypoténuse',
		tags: ['géométrie'],
		definition: "Côté le plus long d'un triangle rectangle, opposé à l'angle droit.",
		level: '4'
	},
	{
		term: 'trigonométrie',
		tags: ['géométrie'],
		definition:
			"Étude des relations entre les angles et les côtés d'un triangle. Utilise $\\cos$, $\\sin$, $\\tan$.",
		level: '3'
	},
	{
		term: 'cosinus',
		tags: ['géométrie', 'trigonométrie'],
		definition:
			'$\\cos(\\alpha) = \\frac{\\text{adjacent}}{\\text{hypotenuse}}$ dans un triangle rectangle.',
		level: '4'
	},
	{
		term: 'sinus',
		tags: ['géométrie', 'trigonométrie'],
		definition:
			'$\\sin(\\alpha) = \\frac{\\text{oppose}}{\\text{hypotenuse}}$ dans un triangle rectangle.',
		level: '3'
	},
	{
		term: 'tangente (trigonométrie)',
		tags: ['géométrie', 'trigonométrie'],
		definition:
			'$\\tan(\\alpha) = \\frac{\\text{oppose}}{\\text{adjacent}}$ dans un triangle rectangle.',
		level: '3'
	},
	{
		term: 'cercle',
		tags: ['géométrie'],
		definition: "Ensemble des points situés à une même distance (rayon) d'un point (centre).",
		level: 'CE1'
	},
	{
		term: 'rayon',
		tags: ['géométrie'],
		definition: "Segment joignant le centre d'un cercle à un point du cercle.",
		level: 'CE1'
	},
	{
		term: 'diamètre',
		tags: ['géométrie'],
		definition:
			"Segment passant par le centre d'un cercle et joignant deux points du cercle. $d = 2r$.",
		level: 'CE1'
	},
	{
		term: 'triangle',
		tags: ['géométrie'],
		definition: 'Polygone à trois côtés.',
		level: 'CP'
	},
	{
		term: 'rectangle',
		tags: ['géométrie'],
		definition: 'Quadrilatère ayant quatre angles droits.',
		level: 'CP'
	},
	{
		term: 'carré (géométrie)',
		tags: ['géométrie'],
		definition: 'Rectangle ayant quatre côtés égaux.',
		level: 'CP'
	},
	{
		term: 'losange',
		tags: ['géométrie'],
		definition: 'Quadrilatère ayant quatre côtés égaux.',
		level: 'CE2'
	},
	{
		term: 'parallélogramme',
		tags: ['géométrie'],
		definition: 'Quadrilatère dont les côtés opposés sont parallèles et égaux.',
		level: 'CM1'
	},
	{
		term: 'trapeze',
		tags: ['géométrie'],
		definition: 'Quadrilatère ayant exactement deux côtés parallèles.',
		level: 'CM1'
	},
	{
		term: 'polygone',
		tags: ['géométrie'],
		definition: 'Figure plane fermée délimitée par des segments. Ex : triangle, carré, hexagone.',
		level: 'CE1'
	},
	{
		term: 'sommet',
		tags: ['géométrie'],
		definition: "Point de rencontre de deux côtés d'un polygone.",
		level: 'CE1'
	},
	{
		term: 'côté',
		tags: ['géométrie'],
		definition: 'Segment délimitant un polygone.',
		level: 'CE1'
	},
	{
		term: 'diagonale',
		tags: ['géométrie'],
		definition: "Segment joignant deux sommets non consécutifs d'un polygone.",
		level: 'CM1'
	},
	{
		term: 'milieu',
		tags: ['géométrie'],
		definition: 'Point qui partage un segment en deux parties égales.',
		level: 'CE2'
	},
	{
		term: 'médiane (géométrie)',
		tags: ['géométrie'],
		definition: 'Dans un triangle, segment joignant un sommet au milieu du côté opposé.',
		level: '5'
	},
	{
		term: 'médiatrice',
		tags: ['géométrie'],
		definition:
			'Droite perpendiculaire à un segment et passant par son milieu. Lieu des points équidistants des extrémités.',
		level: '6'
	},
	{
		term: 'bissectrice',
		tags: ['géométrie'],
		definition: 'Demi-droite qui partage un angle en deux angles égaux.',
		level: '6'
	},
	{
		term: 'hauteur (géométrie)',
		tags: ['géométrie'],
		definition: "Droite passant par un sommet d'un triangle et perpendiculaire au côté opposé.",
		level: '5'
	},
	{
		term: 'vecteur',
		tags: ['géométrie'],
		definition:
			'Objet mathématique défini par une direction, un sens et une norme (longueur). Noté $\\vec{AB}$.',
		level: '2'
	},
	{
		term: 'norme',
		tags: ['géométrie'],
		definition: "Longueur d'un vecteur. $\\|\\vec{u}\\| = \\sqrt{x^2 + y^2}$.",
		level: '2'
	},
	{
		term: 'coordonnées',
		tags: ['géométrie', 'fonctions'],
		definition: 'Couple de nombres $(x, y)$ repérant un point dans le plan.',
		level: '5'
	},
	{
		term: 'scalaire',
		tags: ['géométrie'],
		definition:
			'Produit scalaire de deux vecteurs : $\\vec{u} \\cdot \\vec{v} = \\|u\\|\\|v\\|\\cos(\\theta)$.',
		level: '1_SPE',
		synonyms: ['produit scalaire']
	},
	{
		term: 'adjacent',
		tags: ['géométrie'],
		definition: 'Se dit de deux angles ayant un côté commun.',
		level: '6'
	},
	{
		term: 'aigu',
		tags: ['géométrie'],
		definition: "Se dit d'un angle mesurant moins de $90°$.",
		level: 'CM1'
	},
	{
		term: 'aligne',
		tags: ['géométrie'],
		definition: 'Se dit de points situés sur une même droite.',
		level: '6'
	},
	{
		term: 'aligner',
		tags: ['géométrie'],
		level: '6',
		derivedFrom: 'aligne'
	},
	{
		term: 'arête',
		tags: ['géométrie'],
		definition: "Segment commun à deux faces d'un solide.",
		level: '6'
	},
	{
		term: 'axe',
		tags: ['géométrie'],
		definition: 'Droite de référence (axe de symétrie, axe des abscisses, etc.).',
		level: 'CE2'
	},
	{
		term: 'barycentre',
		tags: ['géométrie'],
		definition: "Point d'équilibre d'un système de points pondérés.",
		level: '1_SPE'
	},
	{
		term: 'centre',
		tags: ['géométrie'],
		definition: "Point équidistant de tous les points d'un cercle ou d'une sphère.",
		level: 'CE1'
	},
	{
		term: 'codage',
		tags: ['géométrie'],
		definition:
			'Symboles placés sur une figure pour indiquer des propriétés (longueurs égales, angles droits, etc.).',
		level: '6'
	},
	{
		term: 'coder',
		tags: ['géométrie'],
		level: '6',
		derivedFrom: 'codage'
	},
	{
		term: 'compas',
		tags: ['géométrie'],
		definition: 'Instrument de géométrie servant à tracer des cercles et reporter des longueurs.',
		level: 'CE1'
	},
	{
		term: 'complémentaire',
		tags: ['géométrie'],
		level: '5',
		derivedFrom: 'angle'
	},
	{
		term: 'cône',
		tags: ['géométrie'],
		definition: 'Solide ayant une base circulaire et un sommet pointu.',
		level: '5'
	},
	{
		term: 'cylindre',
		tags: ['géométrie'],
		definition: 'Solide ayant deux bases circulaires parallèles et égales.',
		level: '5'
	},
	{
		term: 'droit',
		tags: ['géométrie'],
		definition: "Se dit d'un angle mesurant $90°$. Aussi : droite, une ligne infinie.",
		level: 'CE1'
	},
	{
		term: 'ellipse',
		tags: ['géométrie'],
		definition: 'Courbe fermée dont la somme des distances à deux foyers est constante.',
		level: '2'
	},
	{
		term: 'équerre',
		tags: ['géométrie'],
		definition: 'Instrument de géométrie en forme de triangle rectangle.',
		level: 'CE1'
	},
	{
		term: 'équidistant',
		tags: ['géométrie'],
		definition: 'A égale distance de deux points ou objets.',
		level: '6'
	},
	{
		term: 'équilatéral',
		tags: ['géométrie'],
		level: '6',
		derivedFrom: 'triangle'
	},
	{
		term: 'espace',
		tags: ['géométrie'],
		definition: 'Ensemble à trois dimensions dans lequel se situent les objets géométriques.',
		level: 'CM2'
	},
	{
		term: 'extrémité',
		tags: ['géométrie'],
		definition: "Point aux bouts d'un segment.",
		level: 'CE1'
	},
	{
		term: 'face',
		tags: ['géométrie'],
		definition: 'Surface plane délimitant un solide.',
		level: 'CE2'
	},
	{
		term: 'figure',
		tags: ['géométrie'],
		definition: 'Dessin géométrique représentant des formes.',
		level: 'CE1'
	},
	{
		term: 'forme',
		tags: ['géométrie'],
		definition: "Aspect extérieur d'un objet géométrique.",
		level: 'CP'
	},
	{
		term: 'hexagone',
		tags: ['géométrie'],
		definition: 'Polygone à six côtés.',
		level: 'CM1'
	},
	{
		term: 'hyperbole',
		tags: ['géométrie', 'fonctions'],
		definition: 'Courbe formée de deux branches, représentant la fonction inverse ou une conique.',
		level: '2'
	},
	{
		term: 'hypothénuse',
		tags: ['géométrie'],
		definition:
			"Variante orthographique de hypoténuse (côté le plus long d'un triangle rectangle).",
		level: '4',
		derivedFrom: 'hypoténuse'
	},
	{
		term: 'isocèle',
		tags: ['géométrie'],
		level: '6',
		derivedFrom: 'triangle'
	},
	{
		term: 'obtus',
		tags: ['géométrie'],
		definition: "Se dit d'un angle mesurant entre $90°$ et $180°$.",
		level: 'CM1'
	},
	{
		term: 'octogone',
		tags: ['géométrie'],
		definition: 'Polygone à huit côtés.',
		level: 'CM1'
	},
	{
		term: 'origine',
		tags: ['transversal', 'géométrie'],
		definition: 'Point de référence sur une droite graduée ou dans un repère.',
		level: '6'
	},
	{
		term: 'orthogonal',
		tags: ['géométrie'],
		level: '5',
		derivedFrom: 'perpendiculaire'
	},
	{
		term: 'parabole',
		tags: ['géométrie', 'fonctions'],
		definition: 'Courbe en U représentant une fonction du second degré.',
		level: '2'
	},
	{
		term: 'patron',
		tags: ['géométrie'],
		definition: 'Figure plane qui, une fois pliée, forme un solide.',
		level: '6'
	},
	{
		term: 'pave',
		tags: ['géométrie'],
		definition: 'Solide à six faces rectangulaires (parallélépipède rectangle).',
		level: '6',
		synonyms: ['parallelepipede rectangle']
	},
	{
		term: 'pentagone',
		tags: ['géométrie'],
		definition: 'Polygone à cinq côtés.',
		level: 'CM1'
	},
	{
		term: 'perspective',
		tags: ['géométrie'],
		definition: "Représentation d'un objet 3D sur un plan 2D.",
		level: '6'
	},
	{
		term: 'pi',
		tags: ['géométrie'],
		definition:
			"Nombre $\\pi \\approx 3{,}14159$. Rapport du périmètre d'un cercle à son diamètre.",
		level: '6'
	},
	{
		term: 'plan',
		tags: ['géométrie'],
		definition: 'Surface plane infinie à deux dimensions.',
		level: 'CE2'
	},
	{
		term: 'point',
		tags: ['géométrie'],
		definition: 'Élément géométrique sans dimension, désigné par une lettre majuscule.',
		level: 'CP'
	},
	{
		term: 'prisme',
		tags: ['géométrie'],
		definition: 'Solide dont les deux bases sont des polygones égaux et parallèles.',
		level: '5'
	},
	{
		term: 'pyramide',
		tags: ['géométrie'],
		definition: 'Solide dont la base est un polygone et les faces latérales sont des triangles.',
		level: '5'
	},
	{
		term: 'pythagore',
		tags: ['géométrie'],
		definition: 'Mathématicien grec. Associé au théorème de Pythagore.',
		level: '4',
		derivedFrom: 'théorème de Pythagore'
	},
	{
		term: 'quadrilatere',
		tags: ['géométrie'],
		definition: 'Polygone à quatre côtés.',
		level: 'CE2'
	},
	{
		term: 'quelconque',
		tags: ['géométrie'],
		definition: 'Sans propriété particulière. Ex : triangle quelconque.',
		level: '6'
	},
	{
		term: 'radian',
		tags: ['géométrie', 'trigonométrie'],
		definition: "Unité de mesure d'angle. $\\pi\\,\\text{rad} = 180°$.",
		level: '2'
	},
	{
		term: 'rapporteur',
		tags: ['géométrie'],
		definition: 'Instrument de géométrie servant à mesurer des angles.',
		level: 'CE2'
	},
	{
		term: 'regle',
		tags: ['géométrie'],
		definition: 'Instrument de géométrie servant à tracer des droites et mesurer des longueurs.',
		level: 'CP'
	},
	{
		term: 'sécante',
		tags: ['géométrie'],
		definition: 'Droite qui coupe une autre droite ou une courbe en un ou plusieurs points.',
		level: '4'
	},
	{
		term: 'secant',
		tags: ['géométrie'],
		level: '4',
		derivedFrom: 'sécante'
	},
	{
		term: 'secteur',
		tags: ['géométrie'],
		definition: 'Portion de disque délimitée par deux rayons et un arc de cercle.',
		level: '6'
	},
	{
		term: 'concave',
		tags: ['géométrie'],
		definition: "Se dit d'une figure ou d'une courbe qui présente un creux.",
		level: '4'
	},
	{
		term: 'convexe',
		tags: ['géométrie'],
		definition:
			"Se dit d'une figure ou d'une courbe qui ne présente pas de creux. Un segment joignant deux points de la figure reste à l'intérieur.",
		level: '4'
	},
	{
		term: 'solide',
		tags: ['géométrie'],
		definition: "Figure géométrique de l'espace à trois dimensions.",
		level: 'CE2'
	},
	{
		term: 'sphère',
		tags: ['géométrie'],
		definition: "Ensemble des points de l'espace situés à une même distance d'un centre.",
		level: '5'
	},
	{
		term: 'sphérique',
		tags: ['géométrie'],
		level: '5',
		derivedFrom: 'sphère'
	},
	{
		term: 'symétrie',
		tags: ['géométrie'],
		definition: 'Transformation géométrique (axiale ou centrale).',
		level: '6'
	},
	{
		term: 'symétrique',
		tags: ['géométrie'],
		level: '6',
		derivedFrom: 'symétrie axiale'
	},
	{
		term: 'tangeant',
		tags: ['géométrie', 'trigonométrie'],
		definition: 'Variante orthographique de tangente.',
		level: '3',
		derivedFrom: 'tangente (trigonométrie)'
	},
	{
		term: 'thales',
		tags: ['géométrie'],
		definition: 'Mathématicien grec. Associé au théorème de Thales.',
		level: '3',
		derivedFrom: 'théorème de Thalès'
	},

	// =========================================================================
	// LOGIQUE / ENSEMBLES (termes utiles)
	// =========================================================================
	{
		term: 'ensemble',
		tags: ['logique'],
		definition:
			"Collection d'éléments. Ex : $\\mathbb{N}$ (entiers naturels), $\\mathbb{R}$ (réels).",
		level: '4'
	},
	{
		term: 'appartenir',
		tags: ['logique'],
		definition: "Un élément appartient à un ensemble s'il en fait partie. $3 \\in \\mathbb{N}$.",
		level: '4'
	},
	{
		term: 'inclusion',
		tags: ['logique'],
		definition: '$A \\subset B$ signifie que tous les éléments de $A$ sont dans $B$.',
		level: '2'
	},
	{
		term: 'union',
		tags: ['logique'],
		definition:
			"$A \\cup B$ est l'ensemble des éléments qui sont dans $A$ ou dans $B$ (ou les deux).",
		level: '2'
	},
	{
		term: 'intersection',
		tags: ['logique'],
		definition: "$A \\cap B$ est l'ensemble des éléments qui sont à la fois dans $A$ et dans $B$.",
		level: '2'
	},
	{
		term: 'réciproque',
		tags: ['logique'],
		definition:
			"La réciproque de «si $A$ alors $B$» est «si $B$ alors $A$». Elle n'est pas toujours vraie.",
		level: '4'
	},
	{
		term: 'contraposée',
		tags: ['logique'],
		definition:
			'La contraposée de «si $A$ alors $B$» est «si non $B$ alors non $A$». Elle est toujours équivalente.',
		level: '2'
	},
	{
		term: 'conjecture',
		tags: ['logique'],
		definition: "Proposition que l'on suppose vraie mais qui n'a pas encore été démontrée.",
		level: '4'
	},
	{
		term: 'conjecturer',
		tags: ['logique'],
		level: '4',
		derivedFrom: 'conjecture'
	},
	{
		term: 'déduire',
		tags: ['logique'],
		level: '4',
		derivedFrom: 'démonstration'
	},
	{
		term: 'démonstration',
		tags: ['logique'],
		definition: "Raisonnement logique prouvant qu'une proposition est vraie.",
		level: '4'
	},
	{
		term: 'démontrer',
		tags: ['logique'],
		level: '4',
		derivedFrom: 'démonstration'
	},
	{
		term: 'équivalence',
		tags: ['logique'],
		definition:
			'Relation logique : $A \\Leftrightarrow B$ signifie que $A$ et $B$ sont simultanément vraies ou fausses.',
		level: '4'
	},
	{
		term: 'hypothèse',
		tags: ['logique'],
		definition: "Condition supposée vraie au départ d'un raisonnement ou d'un théorème.",
		level: '4'
	},
	{
		term: 'implication',
		tags: ['logique'],
		definition: 'Relation logique : si $A$ alors $B$, notée $A \\Rightarrow B$.',
		level: '4'
	},
	{
		term: 'raisonnement',
		tags: ['logique'],
		definition: "Suite logique d'arguments menant à une conclusion.",
		level: '4'
	},
	{
		term: 'synthese',
		tags: ['logique'],
		definition: 'Raisonnement partant des hypothèses pour arriver à la conclusion.',
		level: '4'
	},
	{
		term: 'théorème',
		tags: ['logique'],
		definition: "Résultat mathématique démontré à partir d'axiomes ou d'autres théorèmes.",
		level: '4'
	},
	{
		term: 'propriété',
		tags: ['logique'],
		definition:
			"Caractéristique d'un objet mathématique qui a été démontrée. Ex : la somme des angles d'un triangle vaut $180°$.",
		level: '6'
	},

	// =========================================================================
	// DIVERS
	// =========================================================================
	{
		term: 'shisma',
		tags: ['arithmétique'],
		definition: 'Petit intervalle musical en théorie des nombres (terme rare).',
		level: 'T_SPE'
	}
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Returns all terms introduced at the given level or earlier.
 * Uses the `schoolYear` ordering from GRADES.
 */
export function getTermsForLevel(level: GradeCode): MathTerm[] {
	const targetYear = GRADES[level].schoolYear;
	return MATH_DICTIONARY.filter((t) => GRADES[t.level].schoolYear <= targetYear);
}

/**
 * Returns all terms matching the given tag.
 */
export function getTermsByTag(tag: string): MathTerm[] {
	return MATH_DICTIONARY.filter((t) => t.tags.includes(tag));
}

/**
 * Returns terms matching both a tag and a level (introduced at or before).
 */
export function getTermsByTagAndLevel(tag: string, level: GradeCode): MathTerm[] {
	const targetYear = GRADES[level].schoolYear;
	return MATH_DICTIONARY.filter(
		(t) => t.tags.includes(tag) && GRADES[t.level].schoolYear <= targetYear
	);
}

/**
 * Returns all terms in the dictionary.
 */
export function getAllTerms(): MathTerm[] {
	return [...MATH_DICTIONARY];
}

export default MATH_DICTIONARY;
