/**
 * French mathematics vocabulary dictionary.
 * Used for autocomplete in text blanks (BlankInput) and as a glossary.
 */

import type { GradeCode } from '$lib/types/grades';
import { GRADES } from '$lib/types/grades';

export interface MathTerm {
	term: string;
	tags: string[];
	/** Definition of the term. Required for principal terms, omitted for derived terms. */
	definition?: string;
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
		definition: 'Concept mathematique representant une quantite.',
		level: 'CP'
	},
	{
		term: 'chiffre',
		tags: ['transversal'],
		definition:
			"Symbole ($0, 1, 2, \\ldots, 9$) utilise pour ecrire les nombres dans le systeme decimal.",
		level: 'CP'
	},
	{
		term: 'calcul',
		tags: ['transversal'],
		definition: 'Operation ou suite d\'operations effectuees sur des nombres.',
		level: 'CP'
	},
	{
		term: 'resultat',
		tags: ['transversal'],
		definition: 'Valeur obtenue a l\'issue d\'un calcul.',
		level: 'CP'
	},
	{
		term: 'somme',
		tags: ['transversal', 'operations'],
		definition: 'Resultat d\'une addition. Ex : la somme de $3$ et $5$ est $8$.',
		level: 'CP'
	},
	{
		term: 'difference',
		tags: ['transversal', 'operations'],
		definition: 'Resultat d\'une soustraction. Ex : la difference de $8$ et $3$ est $5$.',
		level: 'CP'
	},
	{
		term: 'produit',
		tags: ['transversal', 'operations'],
		definition: 'Resultat d\'une multiplication. Ex : le produit de $4$ et $3$ est $12$.',
		level: 'CE1'
	},
	{
		term: 'quotient',
		tags: ['transversal', 'operations', 'entiers'],
		definition:
			'Resultat d\'une division. Dans $15 \\div 4 = 3$ reste $3$, le quotient est $3$.',
		level: 'CE2'
	},
	{
		term: 'reste',
		tags: ['transversal', 'operations', 'entiers'],
		definition:
			'Ce qui reste apres une division euclidienne. Dans $15 \\div 4 = 3$ reste $3$, le reste est $3$.',
		level: 'CE2'
	},
	{
		term: 'addition',
		tags: ['transversal', 'operations'],
		definition: 'Operation qui associe a deux nombres leur somme.',
		level: 'CP'
	},
	{
		term: 'soustraction',
		tags: ['transversal', 'operations'],
		definition: 'Operation qui associe a deux nombres leur difference.',
		level: 'CP'
	},
	{
		term: 'multiplication',
		tags: ['transversal', 'operations'],
		definition: 'Operation qui associe a deux nombres leur produit.',
		level: 'CE1'
	},
	{
		term: 'division',
		tags: ['transversal', 'operations'],
		definition: 'Operation qui associe a deux nombres leur quotient.',
		level: 'CE2'
	},
	{
		term: 'egal',
		tags: ['transversal'],
		definition: 'Relation entre deux quantites qui ont la meme valeur. Symbole : $=$.',
		level: 'CP'
	},
	{
		term: 'ordre de grandeur',
		tags: ['transversal'],
		definition: 'Valeur approchee d\'un nombre, souvent arrondie a la dizaine, centaine, etc.',
		level: 'CM1'
	},
	{
		term: 'operateur',
		tags: ['transversal', 'operations'],
		definition: 'Symbole indiquant une operation ($+$, $-$, $\\times$, $\\div$).',
		level: 'CP'
	},
	{
		term: 'terme',
		tags: ['transversal'],
		definition:
			'Chaque element d\'une somme ou d\'une suite. Ex : dans $3 + 5$, les termes sont $3$ et $5$.',
		level: 'CE1'
	},
	{
		term: 'facteur',
		tags: ['transversal', 'operations'],
		definition:
			'Chaque element d\'un produit. Ex : dans $4 \\times 3$, les facteurs sont $4$ et $3$.',
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
		definition: 'Machine servant a effectuer des calculs.',
		level: 'CE1'
	},
	{
		term: 'convention',
		tags: ['transversal'],
		definition: 'Regle adoptee par accord. Ex : convention de signes.',
		level: '4'
	},
	{
		term: 'egalite',
		tags: ['transversal'],
		definition: 'Relation entre deux expressions ayant la meme valeur. Symbole : $=$.',
		level: 'CP'
	},
	{
		term: 'formule',
		tags: ['transversal'],
		definition: 'Egalite exprimant une relation entre des grandeurs. Ex : $A = L \\times l$.',
		level: 'CE2'
	},
	{
		term: 'geometrie',
		tags: ['geometrie'],
		definition: 'Branche des mathematiques etudiant les figures et l\'espace.',
		level: 'CP'
	},
	{
		term: 'inferieur',
		tags: ['transversal'],
		definition: 'Plus petit que. Symbole : $<$ ou $\\leq$.',
		level: 'CE1'
	},
	{
		term: 'infini',
		tags: ['transversal'],
		definition: 'Concept designant ce qui est sans fin. Symbole : $\\infty$.',
		level: '4'
	},
	{
		term: 'mathematiques',
		tags: ['transversal'],
		definition: 'Science des nombres, des formes et des structures.',
		level: 'CP'
	},
	{
		term: 'maths',
		tags: ['transversal'],
		definition: 'Abreviation de mathematiques.',
		level: 'CP',
		derivedFrom: 'mathematiques'
	},
	{
		term: 'moins',
		tags: ['transversal', 'operations'],
		definition: 'Symbole $-$ de la soustraction ou du signe negatif.',
		level: 'CP'
	},
	{
		term: 'operation',
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
		definition: 'Cas special. Ex : triangle particulier (equilateral, isocele, rectangle).',
		level: '6'
	},
	{
		term: 'plus',
		tags: ['transversal', 'operations'],
		definition: 'Symbole $+$ de l\'addition ou du signe positif.',
		level: 'CP'
	},
	{
		term: 'probleme',
		tags: ['transversal'],
		definition: 'Situation necessitant un raisonnement mathematique pour etre resolue.',
		level: 'CP'
	},
	{
		term: 'schema',
		tags: ['transversal'],
		definition: 'Dessin simplifie representant une situation mathematique.',
		level: 'CE2'
	},
	{
		term: 'superieur',
		tags: ['transversal'],
		definition: 'Plus grand que. Symbole : $>$ ou $\\geq$.',
		level: 'CE1'
	},
	{
		term: 'valeur',
		tags: ['transversal'],
		definition: 'Nombre attribue a une variable ou a une expression.',
		level: 'CE1'
	},

	// =========================================================================
	// ENTIERS
	// =========================================================================
	{
		term: 'entier naturel',
		tags: ['entiers'],
		definition:
			'Nombre entier positif ou nul. L\'ensemble des entiers naturels est $\\mathbb{N} = \\{0, 1, 2, 3, \\ldots\\}$.',
		level: 'CP'
	},
	{
		term: 'pair',
		tags: ['entiers', 'arithmetique'],
		definition:
			'Nombre entier divisible par $2$. Ex : $0, 2, 4, 6, 8, \\ldots$',
		level: 'CP'
	},
	{
		term: 'impair',
		tags: ['entiers', 'arithmetique'],
		definition:
			'Nombre entier qui n\'est pas divisible par $2$. Ex : $1, 3, 5, 7, 9, \\ldots$',
		level: 'CP'
	},
	{
		term: 'dizaine',
		tags: ['entiers', 'numeration'],
		definition: 'Groupe de $10$ unites. Le chiffre des dizaines indique le nombre de dizaines.',
		level: 'CP'
	},
	{
		term: 'centaine',
		tags: ['entiers', 'numeration'],
		definition:
			'Groupe de $100$ unites ($10$ dizaines). Le chiffre des centaines indique le nombre de centaines.',
		level: 'CE1'
	},
	{
		term: 'millier',
		tags: ['entiers', 'numeration'],
		definition: 'Groupe de $1\\,000$ unites.',
		level: 'CE2'
	},
	{
		term: 'unite',
		tags: ['entiers', 'numeration', 'grandeurs'],
		definition:
			'Grandeur de reference pour mesurer. En numeration, le rang le plus a droite dans un nombre entier.',
		level: 'CP'
	},
	{
		term: 'multiple',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'$a$ est un multiple de $b$ si $a = b \\times k$ avec $k$ entier. Ex : $12$ est un multiple de $3$.',
		level: 'CM1'
	},
	{
		term: 'diviseur (arithmetique)',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'$b$ est un diviseur de $a$ si $a \\div b$ est un entier (reste $0$). Ex : $3$ est un diviseur de $12$.',
		level: 'CM1'
	},
	{
		term: 'divisible',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'Un nombre est divisible par un autre si la division tombe juste (reste $0$). Ex : $12$ est divisible par $3$.',
		level: 'CM1'
	},
	{
		term: 'nombre premier',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'Entier naturel superieur a $1$ qui n\'a que deux diviseurs : $1$ et lui-meme. Ex : $2, 3, 5, 7, 11$.',
		level: '5',
		synonyms: ['premier']
	},
	{
		term: 'decomposition en facteurs premiers',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'Ecriture d\'un entier comme produit de nombres premiers. Ex : $60 = 2^2 \\times 3 \\times 5$.',
		level: '4'
	},
	{
		term: 'PGCD',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'Plus Grand Commun Diviseur de deux entiers. Ex : $\\text{PGCD}(12, 18) = 6$.',
		level: '3',
		synonyms: ['plus grand commun diviseur']
	},
	{
		term: 'PPCM',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'Plus Petit Commun Multiple de deux entiers. Ex : $\\text{PPCM}(4, 6) = 12$.',
		level: '3',
		synonyms: ['plus petit commun multiple']
	},
	{
		term: 'critere de divisibilite',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition:
			'Regle permettant de savoir si un nombre est divisible par un autre sans faire la division. Ex : un nombre est divisible par $3$ si la somme de ses chiffres est divisible par $3$.',
		level: '6'
	},
	{
		term: 'division euclidienne',
		tags: ['entiers', 'arithmetique'],
		definition:
			'Division d\'un entier $a$ par un entier $b \\neq 0$ donnant un quotient $q$ et un reste $r$ tels que $a = b \\times q + r$ avec $0 \\leq r < b$.',
		level: '6'
	},
	{
		term: 'dividende',
		tags: ['entiers', 'operations'],
		definition: 'Nombre que l\'on divise. Dans $15 \\div 4$, le dividende est $15$.',
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
		definition: 'Le double d\'un nombre est ce nombre multiplie par $2$. Ex : le double de $7$ est $14$.',
		level: 'CP'
	},
	{
		term: 'moitie',
		tags: ['entiers', 'operations'],
		definition: 'La moitie d\'un nombre est ce nombre divise par $2$. Ex : la moitie de $14$ est $7$.',
		level: 'CP'
	},
	{
		term: 'triple',
		tags: ['entiers', 'operations'],
		definition: 'Le triple d\'un nombre est ce nombre multiplie par $3$.',
		level: 'CE1'
	},
	{
		term: 'quart',
		tags: ['entiers', 'operations'],
		definition: 'Le quart d\'un nombre est ce nombre divise par $4$.',
		level: 'CE1'
	},
	{
		term: 'quadruple',
		tags: ['entiers', 'operations'],
		definition: 'Le quadruple d\'un nombre est ce nombre multiplie par $4$.',
		level: 'CE1'
	},
	{
		term: 'tiers',
		tags: ['entiers', 'operations', 'fractions'],
		definition: 'Le tiers d\'un nombre est ce nombre divise par $3$.',
		level: 'CE1'
	},
	{
		term: 'arithmetique',
		tags: ['entiers', 'arithmetique'],
		definition: 'Etude des proprietes des nombres entiers (divisibilite, premiers, etc.).',
		level: '6'
	},
	{
		term: 'decomposition',
		tags: ['entiers', 'arithmetique'],
		definition: 'Ecriture d\'un nombre comme produit de facteurs. Ex : $60 = 2^2 \\times 3 \\times 5$.',
		level: '4'
	},
	{
		term: 'decomposer',
		tags: ['entiers', 'arithmetique'],
		level: '4',
		derivedFrom: 'decomposition en facteurs premiers'
	},
	{
		term: 'diviseur',
		tags: ['entiers', 'arithmetique', 'divisibilite'],
		definition: 'Nombre qui divise exactement un autre nombre.',
		level: 'CM1'
	},
	{
		term: 'entier',
		tags: ['entiers'],
		definition: 'Nombre sans partie decimale.',
		level: 'CP'
	},
	{
		term: 'euclide',
		tags: ['entiers', 'arithmetique'],
		definition: 'Mathematicien grec. Associe a la division euclidienne et l\'algorithme d\'Euclide.',
		level: '6'
	},
	{
		term: 'euclidienne',
		tags: ['entiers', 'arithmetique'],
		level: '6',
		derivedFrom: 'division euclidienne'
	},
	{
		term: 'numeration',
		tags: ['entiers', 'numeration'],
		definition: 'Systeme de representation des nombres (decimal, binaire, etc.).',
		level: 'CP'
	},
	{
		term: 'premier',
		tags: ['entiers', 'arithmetique'],
		definition: 'Se dit d\'un nombre n\'ayant que deux diviseurs : $1$ et lui-meme.',
		level: '5'
	},

	// =========================================================================
	// DECIMAUX
	// =========================================================================
	{
		term: 'nombre decimal',
		tags: ['decimaux'],
		definition:
			'Nombre pouvant s\'ecrire sous forme de fraction decimale. Ex : $3{,}14 = \\frac{314}{100}$.',
		level: 'CM1',
		synonyms: ['decimal']
	},
	{
		term: 'virgule',
		tags: ['decimaux'],
		definition:
			'Signe separant la partie entiere de la partie decimale dans l\'ecriture d\'un nombre decimal.',
		level: 'CM1'
	},
	{
		term: 'partie entiere',
		tags: ['decimaux'],
		definition:
			'Partie d\'un nombre decimal situee a gauche de la virgule. Ex : dans $3{,}14$, la partie entiere est $3$.',
		level: 'CM1'
	},
	{
		term: 'partie decimale',
		tags: ['decimaux'],
		definition:
			'Partie d\'un nombre decimal situee a droite de la virgule. Ex : dans $3{,}14$, la partie decimale est $0{,}14$.',
		level: 'CM1'
	},
	{
		term: 'dixieme',
		tags: ['decimaux', 'numeration'],
		definition:
			'Premier rang apres la virgule. $0{,}1 = \\frac{1}{10}$.',
		level: 'CM1'
	},
	{
		term: 'centieme',
		tags: ['decimaux', 'numeration'],
		definition:
			'Deuxieme rang apres la virgule. $0{,}01 = \\frac{1}{100}$.',
		level: 'CM1'
	},
	{
		term: 'millieme',
		tags: ['decimaux', 'numeration'],
		definition:
			'Troisieme rang apres la virgule. $0{,}001 = \\frac{1}{1000}$.',
		level: 'CM2'
	},
	{
		term: 'fraction decimale',
		tags: ['decimaux', 'fractions'],
		definition:
			'Fraction dont le denominateur est une puissance de $10$. Ex : $\\frac{7}{10}$, $\\frac{314}{100}$.',
		level: 'CM1'
	},
	{
		term: 'arrondi',
		tags: ['decimaux'],
		definition:
			'Valeur approchee d\'un nombre obtenue en tronquant puis ajustant le dernier chiffre conserve. Ex : $3{,}14$ arrondi au dixieme est $3{,}1$.',
		level: 'CM2'
	},
	{
		term: 'arrondir',
		tags: ['decimaux'],
		level: 'CM2',
		derivedFrom: 'arrondi'
	},
	{
		term: 'decimal',
		tags: ['decimaux'],
		level: 'CM1',
		derivedFrom: 'nombre decimal'
	},
	{
		term: 'decimale',
		tags: ['decimaux'],
		level: 'CM1',
		derivedFrom: 'nombre decimal'
	},
	{
		term: 'troncature',
		tags: ['decimaux'],
		definition:
			'Valeur approchee obtenue en supprimant les chiffres au-dela d\'un rang donne, sans arrondir.',
		level: '6'
	},
	{
		term: 'valeur approchee',
		tags: ['decimaux'],
		definition:
			'Nombre proche d\'un nombre exact, par exces ou par defaut.',
		level: 'CM2'
	},
	{
		term: 'encadrement',
		tags: ['decimaux'],
		definition:
			'Encadrer un nombre $x$, c\'est trouver deux nombres $a$ et $b$ tels que $a \\leq x \\leq b$.',
		level: '6'
	},
	{
		term: 'intercaler',
		tags: ['decimaux'],
		definition:
			'Placer un nombre entre deux autres sur la droite graduee.',
		level: 'CM1'
	},

	// =========================================================================
	// FRACTIONS
	// =========================================================================
	{
		term: 'fraction',
		tags: ['fractions'],
		definition:
			'Ecriture de la forme $\\frac{a}{b}$ ou $a$ est le numerateur et $b$ le denominateur ($b \\neq 0$).',
		level: 'CM1'
	},
	{
		term: 'numerateur',
		tags: ['fractions'],
		definition:
			'Nombre situe au-dessus de la barre de fraction. Dans $\\frac{3}{4}$, le numerateur est $3$.',
		level: 'CM1'
	},
	{
		term: 'denominateur',
		tags: ['fractions'],
		definition:
			'Nombre situe sous la barre de fraction. Dans $\\frac{3}{4}$, le denominateur est $4$.',
		level: 'CM1'
	},
	{
		term: 'fraction irreductible',
		tags: ['fractions', 'arithmetique'],
		definition:
			'Fraction dont le numerateur et le denominateur n\'ont pas de diviseur commun autre que $1$. Ex : $\\frac{3}{4}$ est irreductible.',
		level: '5'
	},
	{
		term: 'simplifier une fraction',
		tags: ['fractions', 'arithmetique'],
		definition:
			'Diviser le numerateur et le denominateur par un meme nombre. Ex : $\\frac{6}{8} = \\frac{3}{4}$.',
		level: '5'
	},
	{
		term: 'fractions egales',
		tags: ['fractions'],
		definition:
			'Deux fractions sont egales si elles representent le meme nombre. Ex : $\\frac{1}{2} = \\frac{2}{4}$.',
		level: 'CM2'
	},
	{
		term: 'mise au meme denominateur',
		tags: ['fractions'],
		definition:
			'Transformer des fractions pour qu\'elles aient le meme denominateur, afin de les comparer ou les additionner.',
		level: '5'
	},
	{
		term: 'inverse',
		tags: ['fractions', 'operations'],
		definition:
			'L\'inverse d\'un nombre $a \\neq 0$ est $\\frac{1}{a}$. Ex : l\'inverse de $3$ est $\\frac{1}{3}$.',
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
		tags: ['fractions', 'calcul-litteral'],
		definition: 'Action de simplifier une fraction ou une expression.',
		level: '5'
	},
	{
		term: 'simplifier',
		tags: ['fractions', 'arithmetique'],
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
			'Nombre muni d\'un signe ($+$ ou $-$). L\'ensemble des relatifs est $\\mathbb{Z} = \\{\\ldots, -2, -1, 0, 1, 2, \\ldots\\}$.',
		level: '5',
		synonyms: ['relatif', 'entier relatif']
	},
	{
		term: 'positif',
		tags: ['relatifs'],
		definition: 'Un nombre est positif s\'il est superieur ou egal a $0$.',
		level: '5'
	},
	{
		term: 'negatif',
		tags: ['relatifs'],
		definition: 'Un nombre est negatif s\'il est inferieur ou egal a $0$.',
		level: '5'
	},
	{
		term: 'oppose',
		tags: ['relatifs'],
		definition:
			'L\'oppose d\'un nombre $a$ est $-a$. Leur somme vaut $0$. Ex : l\'oppose de $3$ est $-3$.',
		level: '5'
	},
	{
		term: 'valeur absolue',
		tags: ['relatifs'],
		definition:
			'Distance d\'un nombre a zero. $|{-3}| = |3| = 3$.',
		level: '4'
	},
	{
		term: 'signe',
		tags: ['relatifs'],
		definition: 'Indication positive ($+$) ou negative ($-$) d\'un nombre relatif.',
		level: '5'
	},
	{
		term: 'distance a zero',
		tags: ['relatifs'],
		definition:
			'La distance a zero d\'un nombre est sa valeur absolue.',
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
		tags: ['calcul-litteral'],
		definition:
			'Suite de nombres et de lettres relies par des operations. Ex : $3x + 2$.',
		level: '5'
	},
	{
		term: 'expression litterale',
		tags: ['calcul-litteral'],
		definition:
			'Expression contenant au moins une lettre representant un nombre. Ex : $2a + b$.',
		level: '5',
		synonyms: ['expression algebrique']
	},
	{
		term: 'variable',
		tags: ['calcul-litteral'],
		definition:
			'Lettre representant un nombre inconnu ou pouvant varier. Ex : $x$ dans $2x + 3$.',
		level: '5'
	},
	{
		term: 'equation',
		tags: ['calcul-litteral', 'equations'],
		definition:
			'Egalite contenant une inconnue a determiner. Ex : $2x + 3 = 7$.',
		level: '4'
	},
	{
		term: 'inconnue',
		tags: ['calcul-litteral', 'equations'],
		definition:
			'Valeur a trouver dans une equation. Souvent notee $x$. Ex : dans $2x + 3 = 7$, l\'inconnue est $x = 2$.',
		level: '4'
	},
	{
		term: 'solution (equation)',
		tags: ['calcul-litteral', 'equations'],
		definition:
			'Valeur de l\'inconnue qui rend l\'equation vraie. Ex : $x = 2$ est la solution de $2x + 3 = 7$.',
		level: '4'
	},
	{
		term: 'developper',
		tags: ['calcul-litteral'],
		definition:
			'Transformer un produit en somme en utilisant la distributivite. Ex : $3(x + 2) = 3x + 6$.',
		level: '4'
	},
	{
		term: 'factoriser',
		tags: ['calcul-litteral'],
		definition:
			'Transformer une somme en produit. Ex : $3x + 6 = 3(x + 2)$.',
		level: '3'
	},
	{
		term: 'reduire',
		tags: ['calcul-litteral'],
		definition:
			'Regrouper les termes semblables dans une expression. Ex : $3x + 2x = 5x$.',
		level: '5'
	},
	{
		term: 'distributivite',
		tags: ['calcul-litteral'],
		definition:
			'Propriete : $a(b + c) = ab + ac$. Permet de developper ou factoriser.',
		level: '5'
	},
	{
		term: 'identite remarquable',
		tags: ['calcul-litteral'],
		definition:
			'Formule algebrique classique. Ex : $(a + b)^2 = a^2 + 2ab + b^2$.',
		level: '3'
	},
	{
		term: 'coefficient',
		tags: ['calcul-litteral'],
		definition:
			'Nombre qui multiplie une variable. Ex : dans $5x$, le coefficient de $x$ est $5$.',
		level: '5'
	},
	{
		term: 'monome',
		tags: ['calcul-litteral'],
		definition:
			'Expression constituee d\'un coefficient et de variables. Ex : $3x^2$.',
		level: '3'
	},
	{
		term: 'polynome',
		tags: ['calcul-litteral'],
		definition:
			'Somme de monomes. Ex : $2x^2 + 3x - 1$.',
		level: '2'
	},
	{
		term: 'degre',
		tags: ['calcul-litteral'],
		definition:
			'Plus grand exposant de la variable dans un polynome. Ex : le degre de $2x^3 + x$ est $3$.',
		level: '2'
	},
	{
		term: 'inequation',
		tags: ['calcul-litteral', 'equations'],
		definition:
			'Inegalite contenant une inconnue. Ex : $2x + 1 > 5$.',
		level: '4'
	},
	{
		term: 'systeme d\'equations',
		tags: ['calcul-litteral', 'equations'],
		definition:
			'Ensemble de plusieurs equations a resoudre simultanement. Ex : $\\{x + y = 5;\\; x - y = 1\\}$.',
		level: '3'
	},
	{
		term: 'substituer',
		tags: ['calcul-litteral'],
		definition:
			'Remplacer une variable par une valeur numerique. Ex : si $x = 3$, alors $2x + 1 = 7$.',
		level: '5'
	},
	{
		term: 'algebre',
		tags: ['calcul-litteral'],
		definition: 'Branche des mathematiques utilisant des lettres pour representer des nombres.',
		level: '4'
	},
	{
		term: 'algebrique',
		tags: ['calcul-litteral'],
		level: '4',
		derivedFrom: 'algebre'
	},
	{
		term: 'developpement',
		tags: ['calcul-litteral'],
		definition: 'Action de transformer un produit en somme par distributivite.',
		level: '4'
	},
	{
		term: 'factorisation',
		tags: ['calcul-litteral'],
		definition: 'Action de transformer une somme en produit.',
		level: '3'
	},
	{
		term: 'inegalite',
		tags: ['calcul-litteral'],
		definition: 'Relation d\'ordre entre deux expressions : $<$, $>$, $\\leq$, $\\geq$.',
		level: '4'
	},
	{
		term: 'litteral',
		tags: ['calcul-litteral'],
		level: '5',
		derivedFrom: 'expression litterale'
	},
	{
		term: 'resoudre',
		tags: ['calcul-litteral', 'equations'],
		level: '4',
		derivedFrom: 'solution (equation)'
	},
	{
		term: 'solution',
		tags: ['calcul-litteral', 'equations'],
		definition: 'Valeur qui verifie une equation ou un probleme.',
		level: '4',
		derivedFrom: 'solution (equation)'
	},

	// =========================================================================
	// GRANDEURS ET MESURES
	// =========================================================================
	{
		term: 'perimetre',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Longueur du contour d\'une figure. Ex : le perimetre d\'un rectangle est $2(L + l)$.',
		level: 'CE1'
	},
	{
		term: 'aire',
		tags: ['grandeurs', 'geometrie'],
		definition:
			'Mesure de la surface d\'une figure. Ex : l\'aire d\'un rectangle est $L \\times l$.',
		level: 'CM1'
	},
	{
		term: 'volume',
		tags: ['grandeurs', 'geometrie'],
		definition:
			'Mesure de l\'espace occupe par un solide. Ex : le volume d\'un pave droit est $L \\times l \\times h$.',
		level: 'CM2'
	},
	{
		term: 'conversion',
		tags: ['grandeurs'],
		definition:
			'Passage d\'une unite a une autre. Ex : $1\\,\\text{km} = 1000\\,\\text{m}$.',
		level: 'CE2'
	},
	{
		term: 'longueur',
		tags: ['grandeurs', 'geometrie'],
		definition:
			'Grandeur mesurant une distance. Unites : $\\text{mm}$, $\\text{cm}$, $\\text{m}$, $\\text{km}$.',
		level: 'CP'
	},
	{
		term: 'masse',
		tags: ['grandeurs'],
		definition:
			'Grandeur mesurant la quantite de matiere. Unites : $\\text{g}$, $\\text{kg}$, $\\text{t}$.',
		level: 'CE1'
	},
	{
		term: 'capacite',
		tags: ['grandeurs'],
		definition:
			'Volume d\'un recipient. Unites : $\\text{mL}$, $\\text{cL}$, $\\text{L}$.',
		level: 'CE1'
	},
	{
		term: 'duree',
		tags: ['grandeurs'],
		definition: 'Grandeur mesurant un intervalle de temps. Unites : secondes, minutes, heures.',
		level: 'CE1'
	},
	{
		term: 'grandeur',
		tags: ['grandeurs'],
		definition:
			'Ce qui peut etre mesure : longueur, masse, duree, aire, volume, etc.',
		level: 'CE1'
	},
	{
		term: 'vitesse',
		tags: ['grandeurs', 'proportionnalite'],
		definition:
			'Rapport entre une distance et un temps. $v = \\frac{d}{t}$. Unites : $\\text{km/h}$, $\\text{m/s}$.',
		level: '4'
	},
	{
		term: 'angle',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Figure formee par deux demi-droites de meme origine. Se mesure en degres ($°$).',
		level: 'CE2'
	},
	{
		term: 'angle droit',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Angle mesurant $90°$.',
		level: 'CE1'
	},
	{
		term: 'angle aigu',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Angle mesurant moins de $90°$.',
		level: 'CM1'
	},
	{
		term: 'angle obtus',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Angle mesurant entre $90°$ et $180°$.',
		level: 'CM1'
	},
	{
		term: 'centimetre',
		tags: ['grandeurs'],
		definition: 'Unite de longueur. $1\\,\\text{cm} = 0{,}01\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'construction',
		tags: ['geometrie'],
		definition: 'Realisation d\'une figure geometrique a l\'aide d\'instruments.',
		level: 'CE1'
	},
	{
		term: 'construire',
		tags: ['geometrie'],
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
		term: 'decametre',
		tags: ['grandeurs'],
		definition: 'Unite de longueur. $1\\,\\text{dam} = 10\\,\\text{m}$.',
		level: 'CE2'
	},
	{
		term: 'decimetre',
		tags: ['grandeurs'],
		definition: 'Unite de longueur. $1\\,\\text{dm} = 0{,}1\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'distance',
		tags: ['geometrie', 'grandeurs'],
		definition: 'Longueur du plus court chemin entre deux points.',
		level: 'CE1'
	},
	{
		term: 'gradue',
		tags: ['grandeurs'],
		definition: 'Muni d\'une graduation. Ex : droite graduee, regle graduee.',
		level: 'CE1'
	},
	{
		term: 'graduer',
		tags: ['grandeurs'],
		level: '6',
		derivedFrom: 'gradue'
	},
	{
		term: 'hauteur',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Dimension verticale d\'un objet ou d\'une figure.',
		level: 'CE1'
	},
	{
		term: 'hectometre',
		tags: ['grandeurs'],
		definition: 'Unite de longueur. $1\\,\\text{hm} = 100\\,\\text{m}$.',
		level: 'CE2'
	},
	{
		term: 'kilometre',
		tags: ['grandeurs'],
		definition: 'Unite de longueur. $1\\,\\text{km} = 1000\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'largeur',
		tags: ['grandeurs', 'geometrie'],
		definition: 'Plus petite dimension d\'un rectangle.',
		level: 'CE1'
	},
	{
		term: 'mesure',
		tags: ['grandeurs'],
		definition: 'Evaluation d\'une grandeur a l\'aide d\'une unite.',
		level: 'CE1'
	},
	{
		term: 'mesurer',
		tags: ['grandeurs'],
		level: 'CE1',
		derivedFrom: 'mesure'
	},
	{
		term: 'metre',
		tags: ['grandeurs'],
		definition: 'Unite de base du systeme international pour les longueurs.',
		level: 'CP'
	},
	{
		term: 'millimetre',
		tags: ['grandeurs'],
		definition: 'Unite de longueur. $1\\,\\text{mm} = 0{,}001\\,\\text{m}$.',
		level: 'CE1'
	},
	{
		term: 'surface',
		tags: ['geometrie', 'grandeurs'],
		definition: 'Etendue d\'une figure plane. Synonyme d\'aire.',
		level: 'CM1'
	},

	// =========================================================================
	// PROPORTIONNALITE
	// =========================================================================
	{
		term: 'proportionnel',
		tags: ['proportionnalite'],
		definition:
			'Deux grandeurs sont proportionnelles si l\'une est obtenue en multipliant l\'autre par un meme nombre constant.',
		level: 'CM2'
	},
	{
		term: 'coefficient de proportionnalite',
		tags: ['proportionnalite'],
		definition:
			'Constante par laquelle on multiplie une grandeur pour obtenir l\'autre.',
		level: '6'
	},
	{
		term: 'tableau de proportionnalite',
		tags: ['proportionnalite'],
		definition:
			'Tableau dans lequel les valeurs de deux grandeurs proportionnelles sont en correspondance.',
		level: 'CM2'
	},
	{
		term: 'pourcentage',
		tags: ['proportionnalite'],
		definition:
			'Proportion exprimee sur $100$. Ex : $25\\%$ signifie $\\frac{25}{100}$.',
		level: 'CM2'
	},
	{
		term: 'echelle',
		tags: ['proportionnalite', 'grandeurs'],
		definition:
			'Rapport entre les dimensions d\'une representation et les dimensions reelles. Ex : echelle $1/1000$.',
		level: 'CM2'
	},
	{
		term: 'produit en croix',
		tags: ['proportionnalite'],
		definition:
			'Methode pour trouver une valeur manquante dans un tableau de proportionnalite : $\\frac{a}{b} = \\frac{c}{d} \\Rightarrow a \\times d = b \\times c$.',
		level: '6'
	},
	{
		term: 'taux',
		tags: ['proportionnalite'],
		definition:
			'Rapport exprime en pourcentage. Ex : un taux de $5\\%$ signifie $\\frac{5}{100}$.',
		level: '4'
	},
	{
		term: 'augmentation',
		tags: ['proportionnalite'],
		definition:
			'Variation positive d\'une grandeur. Augmenter de $20\\%$ : multiplier par $1{,}2$.',
		level: '4'
	},
	{
		term: 'diminution',
		tags: ['proportionnalite'],
		definition:
			'Variation negative d\'une grandeur. Diminuer de $20\\%$ : multiplier par $0{,}8$.',
		level: '4',
		synonyms: ['reduction']
	},
	{
		term: 'coefficient multiplicateur',
		tags: ['proportionnalite'],
		definition:
			'Nombre par lequel on multiplie pour appliquer une variation. Ex : $+20\\% \\Rightarrow \\times 1{,}2$.',
		level: '2'
	},
	{
		term: 'proportion',
		tags: ['proportionnalite'],
		definition: 'Egalite de deux rapports. Ex : $\\frac{a}{b} = \\frac{c}{d}$.',
		level: 'CM2'
	},
	{
		term: 'proportionnalite',
		tags: ['proportionnalite'],
		definition: 'Relation entre deux grandeurs dont le rapport est constant.',
		level: 'CM2'
	},
	{
		term: 'rapport',
		tags: ['proportionnalite'],
		definition: 'Quotient de deux grandeurs. Ex : rapport $\\frac{a}{b}$.',
		level: '6'
	},
	{
		term: 'ratio',
		tags: ['proportionnalite'],
		definition: 'Rapport entre deux quantites. Synonyme de rapport.',
		level: '6'
	},

	// =========================================================================
	// PUISSANCES
	// =========================================================================
	{
		term: 'puissance',
		tags: ['puissances'],
		definition:
			'$a^n$ est le produit de $n$ facteurs egaux a $a$. Ex : $2^3 = 2 \\times 2 \\times 2 = 8$.',
		level: '4'
	},
	{
		term: 'exposant',
		tags: ['puissances'],
		definition:
			'Nombre indiquant combien de fois la base est multipliee par elle-meme. Dans $a^n$, $n$ est l\'exposant.',
		level: '4'
	},
	{
		term: 'base',
		tags: ['puissances'],
		definition: 'Nombre eleve a une puissance. Dans $a^n$, $a$ est la base.',
		level: '4'
	},
	{
		term: 'carre',
		tags: ['puissances', 'entiers'],
		definition:
			'Deuxieme puissance d\'un nombre. $a^2 = a \\times a$. Ex : $5^2 = 25$.',
		level: '6'
	},
	{
		term: 'cube',
		tags: ['puissances', 'entiers'],
		definition:
			'Troisieme puissance d\'un nombre. $a^3 = a \\times a \\times a$. Ex : $2^3 = 8$.',
		level: '6'
	},
	{
		term: 'notation scientifique',
		tags: ['puissances'],
		definition:
			'Ecriture d\'un nombre sous la forme $a \\times 10^n$ avec $1 \\leq a < 10$. Ex : $0{,}003 = 3 \\times 10^{-3}$.',
		level: '4'
	},
	{
		term: 'puissance de dix',
		tags: ['puissances'],
		definition:
			'Nombre de la forme $10^n$. Ex : $10^3 = 1000$, $10^{-2} = 0{,}01$.',
		level: '4'
	},
	{
		term: 'exposant negatif',
		tags: ['puissances'],
		definition:
			'$a^{-n} = \\frac{1}{a^n}$. Ex : $2^{-3} = \\frac{1}{8}$.',
		level: '4'
	},

	// =========================================================================
	// RACINES CARREES
	// =========================================================================
	{
		term: 'racine carree',
		tags: ['racines-carrees'],
		definition:
			'$\\sqrt{a}$ est le nombre positif dont le carre vaut $a$. Ex : $\\sqrt{25} = 5$.',
		level: '3',
		synonyms: ['racine']
	},
	{
		term: 'racine',
		tags: ['racines-carrees'],
		definition: 'Racine carree d\'un nombre. $\\sqrt{a}$.',
		level: '3',
		derivedFrom: 'racine carree'
	},
	{
		term: 'radical',
		tags: ['racines-carrees'],
		definition:
			'Symbole $\\sqrt{\\phantom{x}}$ designant la racine carree.',
		level: '3'
	},
	{
		term: 'carre parfait',
		tags: ['racines-carrees', 'entiers'],
		definition:
			'Entier qui est le carre d\'un autre entier. Ex : $1, 4, 9, 16, 25, 36, \\ldots$',
		level: '3'
	},

	// =========================================================================
	// FONCTIONS
	// =========================================================================
	{
		term: 'fonction',
		tags: ['fonctions'],
		definition:
			'Relation qui associe a chaque element d\'un ensemble de depart un unique element d\'un ensemble d\'arrivee.',
		level: '3'
	},
	{
		term: 'image',
		tags: ['fonctions'],
		definition:
			'$f(x)$ est l\'image de $x$ par la fonction $f$. Ex : si $f(x) = 2x$, l\'image de $3$ est $6$.',
		level: '3'
	},
	{
		term: 'antecedent',
		tags: ['fonctions'],
		definition:
			'$x$ est un antecedent de $y$ par $f$ si $f(x) = y$. Ex : $3$ est un antecedent de $6$ par $f(x) = 2x$.',
		level: '3',
		synonyms: ['antecedent']
	},
	{
		term: 'fonction lineaire',
		tags: ['fonctions', 'proportionnalite'],
		definition:
			'Fonction de la forme $f(x) = ax$. Represente une situation de proportionnalite.',
		level: '3'
	},
	{
		term: 'fonction affine',
		tags: ['fonctions'],
		definition:
			'Fonction de la forme $f(x) = ax + b$. Sa representation graphique est une droite.',
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
		term: 'decroissante',
		tags: ['fonctions'],
		definition:
			'Une fonction est decroissante sur un intervalle si, quand $x$ augmente, $f(x)$ diminue.',
		level: '3'
	},
	{
		term: 'decroissant',
		tags: ['fonctions'],
		level: '3',
		derivedFrom: 'decroissante'
	},
	{
		term: 'maximum',
		tags: ['fonctions'],
		definition:
			'Plus grande valeur atteinte par une fonction sur un intervalle.',
		level: '2'
	},
	{
		term: 'minimum',
		tags: ['fonctions'],
		definition:
			'Plus petite valeur atteinte par une fonction sur un intervalle.',
		level: '2'
	},
	{
		term: 'courbe representative',
		tags: ['fonctions'],
		definition:
			'Ensemble des points $(x, f(x))$ dans un repere. Representation graphique d\'une fonction.',
		level: '2'
	},
	{
		term: 'courbe',
		tags: ['fonctions'],
		definition: 'Ligne representant graphiquement une fonction ou une relation.',
		level: '3'
	},
	{
		term: 'representer',
		tags: ['fonctions'],
		level: '2',
		derivedFrom: 'courbe representative'
	},
	{
		term: 'abscisse',
		tags: ['fonctions', 'geometrie'],
		definition:
			'Coordonnee horizontale d\'un point dans un repere. Premiere coordonnee du couple $(x, y)$.',
		level: '5'
	},
	{
		term: 'ordonnee',
		tags: ['fonctions', 'geometrie'],
		definition:
			'Coordonnee verticale d\'un point dans un repere. Deuxieme coordonnee du couple $(x, y)$.',
		level: '5'
	},
	{
		term: 'ordonnee a l\'origine',
		tags: ['fonctions'],
		definition:
			'Valeur $f(0)$, le point ou la courbe coupe l\'axe des ordonnees. Pour $f(x) = ax + b$, c\'est $b$.',
		level: '3'
	},
	{
		term: 'coefficient directeur',
		tags: ['fonctions'],
		definition:
			'Pente d\'une droite. Pour $f(x) = ax + b$, le coefficient directeur est $a$.',
		level: '3',
		synonyms: ['pente']
	},
	{
		term: 'repere',
		tags: ['fonctions', 'geometrie'],
		definition:
			'Systeme d\'axes perpendiculaires gradue permettant de representer des points par leurs coordonnees.',
		level: '5',
		synonyms: ['repere orthonorme']
	},
	{
		term: 'tableau de valeurs',
		tags: ['fonctions'],
		definition:
			'Tableau donnant des couples $(x, f(x))$ pour representer une fonction.',
		level: '3'
	},
	{
		term: 'tableau de signes',
		tags: ['fonctions'],
		definition:
			'Tableau indiquant les intervalles ou une expression est positive, negative ou nulle.',
		level: '2'
	},
	{
		term: 'tableau de variations',
		tags: ['fonctions'],
		definition:
			'Tableau resumant les intervalles de croissance et decroissance d\'une fonction.',
		level: '2'
	},
	{
		term: 'fonction carree',
		tags: ['fonctions'],
		definition:
			'Fonction $f(x) = x^2$. Sa courbe est une parabole.',
		level: '2'
	},
	{
		term: 'fonction inverse',
		tags: ['fonctions'],
		definition:
			'Fonction $f(x) = \\frac{1}{x}$ ($x \\neq 0$). Sa courbe est une hyperbole.',
		level: '2'
	},
	{
		term: 'fonction racine carree',
		tags: ['fonctions', 'racines-carrees'],
		definition:
			'Fonction $f(x) = \\sqrt{x}$ definie pour $x \\geq 0$.',
		level: '2'
	},
	{
		term: 'derivee',
		tags: ['fonctions'],
		definition:
			'Fonction $f\'$ qui donne le taux de variation instantane de $f$. $f\'(a)$ est la pente de la tangente en $a$.',
		level: '1_SPE'
	},
	{
		term: 'tangente',
		tags: ['fonctions', 'geometrie'],
		definition:
			'Droite qui touche la courbe en un point et a la meme pente que la courbe en ce point.',
		level: '1_SPE'
	},
	{
		term: 'nombre derive',
		tags: ['fonctions'],
		definition:
			'Valeur de la derivee en un point : $f\'(a)$.',
		level: '1_SPE'
	},
	{
		term: 'taux de variation',
		tags: ['fonctions'],
		definition:
			'$\\frac{f(b) - f(a)}{b - a}$ : variation moyenne de $f$ entre $a$ et $b$.',
		level: '2'
	},
	{
		term: 'extremum',
		tags: ['fonctions'],
		definition:
			'Maximum ou minimum local d\'une fonction. En un extremum, $f\'(a) = 0$.',
		level: '1_SPE',
		synonyms: ['extrema']
	},
	{
		term: 'fonction exponentielle',
		tags: ['fonctions'],
		definition:
			'Fonction $f(x) = e^x$ ($\\exp(x)$). Seule fonction egale a sa propre derivee avec $f(0) = 1$.',
		level: 'T_SPE'
	},
	{
		term: 'fonction logarithme',
		tags: ['fonctions'],
		definition:
			'Fonction $\\ln(x)$ definie pour $x > 0$. Reciproque de l\'exponentielle : $\\ln(e^x) = x$.',
		level: 'T_SPE',
		synonyms: ['logarithme neperien']
	},
	{
		term: 'intervalle',
		tags: ['fonctions'],
		definition:
			'Ensemble de nombres reels compris entre deux bornes. Ex : $[2; 5]$, $]-\\infty; 3[$.',
		level: '2'
	},
	{
		term: 'ensemble de definition',
		tags: ['fonctions'],
		definition:
			'Ensemble des valeurs de $x$ pour lesquelles $f(x)$ est definie.',
		level: '2'
	},
	{
		term: 'primitive',
		tags: ['fonctions'],
		definition:
			'Fonction $F$ telle que $F\' = f$. Ex : une primitive de $2x$ est $x^2$.',
		level: 'T_SPE'
	},
	{
		term: 'continu',
		tags: ['fonctions'],
		definition: 'Se dit d\'une fonction sans saut ni trou sur un intervalle.',
		level: 'T_SPE'
	},
	{
		term: 'continuite',
		tags: ['fonctions'],
		definition: 'Propriete d\'une fonction continue : pas de rupture dans la courbe.',
		level: 'T_SPE'
	},
	{
		term: 'deriver',
		tags: ['fonctions'],
		level: '1_SPE',
		derivedFrom: 'derivee'
	},
	{
		term: 'exponentielle',
		tags: ['fonctions'],
		definition: 'Fonction $f(x) = e^x$. Seule fonction egale a sa propre derivee.',
		level: 'T_SPE'
	},
	{
		term: 'integrale',
		tags: ['fonctions'],
		definition: 'Outil du calcul integral. $\\int_a^b f(x)\\,dx$ mesure l\'aire sous la courbe.',
		level: 'T_SPE'
	},
	{
		term: 'integrer',
		tags: ['fonctions'],
		level: 'T_SPE',
		derivedFrom: 'integrale'
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
		definition: 'Fonction reciproque de l\'exponentielle. $\\ln(e^x) = x$.',
		level: 'T_SPE'
	},
	{
		term: 'coordonnee',
		tags: ['geometrie', 'fonctions'],
		definition: 'Nombre repérant la position d\'un point sur un axe ou dans un plan.',
		level: '5'
	},

	// =========================================================================
	// SUITES
	// =========================================================================
	{
		term: 'suite',
		tags: ['suites'],
		definition:
			'Fonction de $\\mathbb{N}$ dans $\\mathbb{R}$. Liste ordonnee de nombres : $u_0, u_1, u_2, \\ldots$',
		level: '1_SPE',
		synonyms: ['suite numerique']
	},
	{
		term: 'terme (suite)',
		tags: ['suites'],
		definition:
			'Element d\'une suite. $u_n$ est le terme de rang $n$.',
		level: '1_SPE'
	},
	{
		term: 'rang',
		tags: ['suites'],
		definition: 'Indice d\'un terme dans une suite. Dans $u_5$, le rang est $5$.',
		level: '1_SPE'
	},
	{
		term: 'raison',
		tags: ['suites'],
		definition:
			'Constante $r$ telle que $u_{n+1} = u_n + r$ (arithmetique) ou $u_{n+1} = u_n \\times q$ (geometrique, notee $q$).',
		level: '1_SPE'
	},
	{
		term: 'suite arithmetique',
		tags: ['suites'],
		definition:
			'Suite telle que $u_{n+1} = u_n + r$ (raison constante). Ex : $2, 5, 8, 11, \\ldots$ (raison $3$).',
		level: '1_SPE'
	},
	{
		term: 'suite geometrique',
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
		term: 'suite decroissante',
		tags: ['suites'],
		definition: 'Suite telle que $u_{n+1} \\leq u_n$ pour tout $n$.',
		level: '1_SPE'
	},
	{
		term: 'convergente',
		tags: ['suites'],
		definition:
			'Suite qui tend vers une limite finie quand $n$ tend vers l\'infini.',
		level: 'T_SPE'
	},
	{
		term: 'divergente',
		tags: ['suites'],
		definition:
			'Suite qui ne converge pas (tend vers l\'infini ou oscille).',
		level: 'T_SPE'
	},
	{
		term: 'terme general',
		tags: ['suites'],
		definition:
			'Formule explicite donnant $u_n$ en fonction de $n$. Ex : $u_n = 3n + 2$.',
		level: '1_SPE'
	},
	{
		term: 'recurrence',
		tags: ['suites'],
		definition:
			'Relation definissant chaque terme a partir du (ou des) precedent(s). Ex : $u_{n+1} = 2u_n + 1$.',
		level: '1_SPE',
		synonyms: ['relation de recurrence']
	},
	{
		term: 'consecutif',
		tags: ['transversal'],
		level: '6',
		derivedFrom: 'suite'
	},
	{
		term: 'serie',
		tags: ['suites'],
		definition: 'Somme des termes d\'une suite. $S_n = \\sum_{k=0}^{n} u_k$.',
		level: 'T_SPE'
	},

	// =========================================================================
	// PROBABILITES
	// =========================================================================
	{
		term: 'probabilite',
		tags: ['probabilites'],
		definition:
			'Nombre entre $0$ et $1$ mesurant la chance qu\'un evenement se produise.',
		level: '5'
	},
	{
		term: 'experience aleatoire',
		tags: ['probabilites'],
		definition:
			'Experience dont le resultat depend du hasard. Ex : lancer un de.',
		level: '5'
	},
	{
		term: 'issue',
		tags: ['probabilites'],
		definition:
			'Resultat possible d\'une experience aleatoire. Ex : obtenir $3$ en lancant un de.',
		level: '5',
		synonyms: ['eventualite']
	},
	{
		term: 'evenement',
		tags: ['probabilites'],
		definition:
			'Ensemble d\'issues. Ex : obtenir un nombre pair en lancant un de ($\\{2, 4, 6\\}$).',
		level: '5'
	},
	{
		term: 'univers',
		tags: ['probabilites'],
		definition:
			'Ensemble de toutes les issues possibles. Ex : pour un de, $\\Omega = \\{1, 2, 3, 4, 5, 6\\}$.',
		level: '5'
	},
	{
		term: 'equiprobabilite',
		tags: ['probabilites'],
		definition:
			'Situation ou toutes les issues ont la meme probabilite.',
		level: '5'
	},
	{
		term: 'evenement contraire',
		tags: ['probabilites'],
		definition:
			'Complementaire d\'un evenement. $P(\\bar{A}) = 1 - P(A)$.',
		level: '5'
	},
	{
		term: 'arbre de probabilites',
		tags: ['probabilites'],
		definition:
			'Schema en arbre representant les etapes successives d\'une experience aleatoire et les probabilites associees.',
		level: '3'
	},
	{
		term: 'frequence',
		tags: ['probabilites', 'statistiques'],
		definition:
			'Rapport du nombre d\'occurrences d\'un evenement au nombre total d\'experiences. $f = \\frac{\\text{effectif}}{\\text{total}}$.',
		level: '5'
	},
	{
		term: 'loi de probabilite',
		tags: ['probabilites'],
		definition:
			'Tableau associant a chaque issue sa probabilite. La somme des probabilites vaut $1$.',
		level: '3'
	},
	{
		term: 'variable aleatoire',
		tags: ['probabilites'],
		definition:
			'Fonction associant un nombre reel a chaque issue d\'une experience aleatoire.',
		level: '1_SPE'
	},
	{
		term: 'esperance',
		tags: ['probabilites'],
		definition:
			'Valeur moyenne d\'une variable aleatoire. $E(X) = \\sum x_i \\cdot P(X = x_i)$.',
		level: '1_SPE'
	},
	{
		term: 'combinaison',
		tags: ['probabilites'],
		definition: 'Nombre de facons de choisir $k$ elements parmi $n$ : $\\binom{n}{k}$.',
		level: 'T_SPE'
	},
	{
		term: 'permutation',
		tags: ['probabilites'],
		definition: 'Arrangement ordonne de tous les elements d\'un ensemble.',
		level: 'T_SPE'
	},

	// =========================================================================
	// STATISTIQUES
	// =========================================================================
	{
		term: 'moyenne',
		tags: ['statistiques'],
		definition:
			'Somme des valeurs divisee par le nombre de valeurs. $\\bar{x} = \\frac{\\sum x_i}{n}$.',
		level: '6'
	},
	{
		term: 'mediane',
		tags: ['statistiques'],
		definition:
			'Valeur qui partage une serie ordonnee en deux parties de meme effectif.',
		level: '5'
	},
	{
		term: 'etendue',
		tags: ['statistiques'],
		definition:
			'Difference entre la plus grande et la plus petite valeur d\'une serie.',
		level: '5'
	},
	{
		term: 'effectif',
		tags: ['statistiques'],
		definition:
			'Nombre de fois qu\'une valeur apparait dans une serie statistique.',
		level: '5'
	},
	{
		term: 'diagramme',
		tags: ['statistiques'],
		definition:
			'Representation graphique de donnees statistiques (barres, circulaire, etc.).',
		level: 'CE2'
	},
	{
		term: 'quartile',
		tags: ['statistiques'],
		definition:
			'Valeurs qui partagent une serie ordonnee en quatre parties de meme effectif ($Q_1$, $Q_2$, $Q_3$).',
		level: '3'
	},
	{
		term: 'ecart type',
		tags: ['statistiques'],
		definition:
			'Mesure de la dispersion des valeurs autour de la moyenne. $\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}$.',
		level: '2'
	},
	{
		term: 'variance',
		tags: ['statistiques'],
		definition:
			'Carre de l\'ecart type. $V = \\frac{\\sum (x_i - \\bar{x})^2}{n}$.',
		level: '2'
	},
	{
		term: 'statistiques',
		tags: ['statistiques'],
		definition: 'Branche des mathematiques traitant de la collecte, l\'analyse et l\'interpretation des donnees.',
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
		tags: ['geometrie'],
		definition:
			'Partie d\'une droite delimitee par deux points. Note $[AB]$.',
		level: 'CP'
	},
	{
		term: 'droite',
		tags: ['geometrie'],
		definition:
			'Ligne infinie, sans courbure. Note $(AB)$.',
		level: 'CP'
	},
	{
		term: 'demi-droite',
		tags: ['geometrie'],
		definition:
			'Partie d\'une droite ayant une origine mais pas de fin. Note $[AB)$.',
		level: 'CE1'
	},
	{
		term: 'perpendiculaire',
		tags: ['geometrie'],
		definition: 'Deux droites sont perpendiculaires si elles forment un angle droit ($90°$).',
		level: 'CE2'
	},
	{
		term: 'parallele',
		tags: ['geometrie'],
		definition: 'Deux droites sont paralleles si elles ne se coupent jamais.',
		level: 'CE2'
	},
	{
		term: 'symetrie axiale',
		tags: ['geometrie'],
		definition:
			'Transformation qui associe a un point son symetrique par rapport a un axe.',
		level: '6'
	},
	{
		term: 'symetrie centrale',
		tags: ['geometrie'],
		definition:
			'Transformation qui associe a un point son symetrique par rapport a un centre.',
		level: '5'
	},
	{
		term: 'translation',
		tags: ['geometrie'],
		definition:
			'Transformation qui deplace chaque point de la meme direction, du meme sens et de la meme distance.',
		level: '4'
	},
	{
		term: 'rotation',
		tags: ['geometrie'],
		definition:
			'Transformation qui fait tourner chaque point autour d\'un centre, d\'un angle donne.',
		level: '4'
	},
	{
		term: 'homothetie',
		tags: ['geometrie'],
		definition:
			'Transformation qui agrandit ou reduit une figure par rapport a un centre et un rapport $k$.',
		level: '3'
	},
	{
		term: 'theoreme de Pythagore',
		tags: ['geometrie'],
		definition:
			'Dans un triangle rectangle, $c^2 = a^2 + b^2$ ou $c$ est l\'hypotenuse.',
		level: '4',
		synonyms: ['Pythagore']
	},
	{
		term: 'theoreme de Thales',
		tags: ['geometrie', 'proportionnalite'],
		definition:
			'Si deux droites paralleles coupent deux secantes, alors elles determinent des segments proportionnels.',
		level: '3',
		synonyms: ['Thales']
	},
	{
		term: 'hypotenuse',
		tags: ['geometrie'],
		definition:
			'Cote le plus long d\'un triangle rectangle, oppose a l\'angle droit.',
		level: '4'
	},
	{
		term: 'trigonometrie',
		tags: ['geometrie'],
		definition:
			'Etude des relations entre les angles et les cotes d\'un triangle. Utilise $\\cos$, $\\sin$, $\\tan$.',
		level: '3'
	},
	{
		term: 'cosinus',
		tags: ['geometrie', 'trigonometrie'],
		definition:
			'$\\cos(\\alpha) = \\frac{\\text{adjacent}}{\\text{hypotenuse}}$ dans un triangle rectangle.',
		level: '4'
	},
	{
		term: 'sinus',
		tags: ['geometrie', 'trigonometrie'],
		definition:
			'$\\sin(\\alpha) = \\frac{\\text{oppose}}{\\text{hypotenuse}}$ dans un triangle rectangle.',
		level: '3'
	},
	{
		term: 'tangente (trigonometrie)',
		tags: ['geometrie', 'trigonometrie'],
		definition:
			'$\\tan(\\alpha) = \\frac{\\text{oppose}}{\\text{adjacent}}$ dans un triangle rectangle.',
		level: '3'
	},
	{
		term: 'cercle',
		tags: ['geometrie'],
		definition:
			'Ensemble des points situes a une meme distance (rayon) d\'un point (centre).',
		level: 'CE1'
	},
	{
		term: 'rayon',
		tags: ['geometrie'],
		definition: 'Segment joignant le centre d\'un cercle a un point du cercle.',
		level: 'CE1'
	},
	{
		term: 'diametre',
		tags: ['geometrie'],
		definition:
			'Segment passant par le centre d\'un cercle et joignant deux points du cercle. $d = 2r$.',
		level: 'CE1'
	},
	{
		term: 'triangle',
		tags: ['geometrie'],
		definition: 'Polygone a trois cotes.',
		level: 'CP'
	},
	{
		term: 'rectangle',
		tags: ['geometrie'],
		definition: 'Quadrilatere ayant quatre angles droits.',
		level: 'CP'
	},
	{
		term: 'carre (geometrie)',
		tags: ['geometrie'],
		definition: 'Rectangle ayant quatre cotes egaux.',
		level: 'CP'
	},
	{
		term: 'losange',
		tags: ['geometrie'],
		definition: 'Quadrilatere ayant quatre cotes egaux.',
		level: 'CE2'
	},
	{
		term: 'parallelogramme',
		tags: ['geometrie'],
		definition: 'Quadrilatere dont les cotes opposes sont paralleles et egaux.',
		level: 'CM1'
	},
	{
		term: 'trapeze',
		tags: ['geometrie'],
		definition: 'Quadrilatere ayant exactement deux cotes paralleles.',
		level: 'CM1'
	},
	{
		term: 'polygone',
		tags: ['geometrie'],
		definition: 'Figure plane fermee delimitee par des segments. Ex : triangle, carre, hexagone.',
		level: 'CE1'
	},
	{
		term: 'sommet',
		tags: ['geometrie'],
		definition: 'Point de rencontre de deux cotes d\'un polygone.',
		level: 'CE1'
	},
	{
		term: 'cote',
		tags: ['geometrie'],
		definition: 'Segment delimitant un polygone.',
		level: 'CE1'
	},
	{
		term: 'diagonale',
		tags: ['geometrie'],
		definition: 'Segment joignant deux sommets non consecutifs d\'un polygone.',
		level: 'CM1'
	},
	{
		term: 'milieu',
		tags: ['geometrie'],
		definition: 'Point qui partage un segment en deux parties egales.',
		level: 'CE2'
	},
	{
		term: 'mediane (geometrie)',
		tags: ['geometrie'],
		definition: 'Dans un triangle, segment joignant un sommet au milieu du cote oppose.',
		level: '5'
	},
	{
		term: 'mediatrice',
		tags: ['geometrie'],
		definition:
			'Droite perpendiculaire a un segment et passant par son milieu. Lieu des points equidistants des extremites.',
		level: '6'
	},
	{
		term: 'bissectrice',
		tags: ['geometrie'],
		definition:
			'Demi-droite qui partage un angle en deux angles egaux.',
		level: '6'
	},
	{
		term: 'hauteur (geometrie)',
		tags: ['geometrie'],
		definition:
			'Droite passant par un sommet d\'un triangle et perpendiculaire au cote oppose.',
		level: '5'
	},
	{
		term: 'vecteur',
		tags: ['geometrie'],
		definition:
			'Objet mathematique defini par une direction, un sens et une norme (longueur). Note $\\vec{AB}$.',
		level: '2'
	},
	{
		term: 'norme',
		tags: ['geometrie'],
		definition:
			'Longueur d\'un vecteur. $\\|\\vec{u}\\| = \\sqrt{x^2 + y^2}$.',
		level: '2'
	},
	{
		term: 'coordonnees',
		tags: ['geometrie', 'fonctions'],
		definition:
			'Couple de nombres $(x, y)$ repérant un point dans le plan.',
		level: '5'
	},
	{
		term: 'scalaire',
		tags: ['geometrie'],
		definition:
			'Produit scalaire de deux vecteurs : $\\vec{u} \\cdot \\vec{v} = \\|u\\|\\|v\\|\\cos(\\theta)$.',
		level: '1_SPE',
		synonyms: ['produit scalaire']
	},
	{
		term: 'adjacent',
		tags: ['geometrie'],
		definition: 'Se dit de deux angles ayant un cote commun.',
		level: '6'
	},
	{
		term: 'aigu',
		tags: ['geometrie'],
		definition: 'Se dit d\'un angle mesurant moins de $90°$.',
		level: 'CM1'
	},
	{
		term: 'aligne',
		tags: ['geometrie'],
		definition: 'Se dit de points situes sur une meme droite.',
		level: '6'
	},
	{
		term: 'aligner',
		tags: ['geometrie'],
		level: '6',
		derivedFrom: 'aligne'
	},
	{
		term: 'arete',
		tags: ['geometrie'],
		definition: 'Segment commun a deux faces d\'un solide.',
		level: '6'
	},
	{
		term: 'axe',
		tags: ['geometrie'],
		definition: 'Droite de reference (axe de symetrie, axe des abscisses, etc.).',
		level: 'CE2'
	},
	{
		term: 'barycentre',
		tags: ['geometrie'],
		definition: 'Point d\'equilibre d\'un systeme de points ponderes.',
		level: '1_SPE'
	},
	{
		term: 'centre',
		tags: ['geometrie'],
		definition: 'Point equidistant de tous les points d\'un cercle ou d\'une sphere.',
		level: 'CE1'
	},
	{
		term: 'codage',
		tags: ['geometrie'],
		definition: 'Symboles places sur une figure pour indiquer des proprietes (longueurs egales, angles droits, etc.).',
		level: '6'
	},
	{
		term: 'coder',
		tags: ['geometrie'],
		level: '6',
		derivedFrom: 'codage'
	},
	{
		term: 'compas',
		tags: ['geometrie'],
		definition: 'Instrument de geometrie servant a tracer des cercles et reporter des longueurs.',
		level: 'CE1'
	},
	{
		term: 'complementaire',
		tags: ['geometrie'],
		level: '5',
		derivedFrom: 'angle'
	},
	{
		term: 'cone',
		tags: ['geometrie'],
		definition: 'Solide ayant une base circulaire et un sommet pointu.',
		level: '5'
	},
	{
		term: 'cylindre',
		tags: ['geometrie'],
		definition: 'Solide ayant deux bases circulaires paralleles et egales.',
		level: '5'
	},
	{
		term: 'droit',
		tags: ['geometrie'],
		definition: 'Se dit d\'un angle mesurant $90°$. Aussi : droite, une ligne infinie.',
		level: 'CE1'
	},
	{
		term: 'ellipse',
		tags: ['geometrie'],
		definition: 'Courbe fermee dont la somme des distances a deux foyers est constante.',
		level: '2'
	},
	{
		term: 'equerre',
		tags: ['geometrie'],
		definition: 'Instrument de geometrie en forme de triangle rectangle.',
		level: 'CE1'
	},
	{
		term: 'equidistant',
		tags: ['geometrie'],
		definition: 'A egale distance de deux points ou objets.',
		level: '6'
	},
	{
		term: 'equilateral',
		tags: ['geometrie'],
		level: '6',
		derivedFrom: 'triangle'
	},
	{
		term: 'espace',
		tags: ['geometrie'],
		definition: 'Ensemble a trois dimensions dans lequel se situent les objets geometriques.',
		level: 'CM2'
	},
	{
		term: 'extremite',
		tags: ['geometrie'],
		definition: 'Point aux bouts d\'un segment.',
		level: 'CE1'
	},
	{
		term: 'face',
		tags: ['geometrie'],
		definition: 'Surface plane delimitant un solide.',
		level: 'CE2'
	},
	{
		term: 'figure',
		tags: ['geometrie'],
		definition: 'Dessin geometrique representant des formes.',
		level: 'CE1'
	},
	{
		term: 'forme',
		tags: ['geometrie'],
		definition: 'Aspect exterieur d\'un objet geometrique.',
		level: 'CP'
	},
	{
		term: 'hexagone',
		tags: ['geometrie'],
		definition: 'Polygone a six cotes.',
		level: 'CM1'
	},
	{
		term: 'hyperbole',
		tags: ['geometrie', 'fonctions'],
		definition: 'Courbe formee de deux branches, representant la fonction inverse ou une conique.',
		level: '2'
	},
	{
		term: 'hypothenuse',
		tags: ['geometrie'],
		definition: 'Variante orthographique de hypotenuse (cote le plus long d\'un triangle rectangle).',
		level: '4',
		derivedFrom: 'hypotenuse'
	},
	{
		term: 'isocele',
		tags: ['geometrie'],
		level: '6',
		derivedFrom: 'triangle'
	},
	{
		term: 'obtus',
		tags: ['geometrie'],
		definition: 'Se dit d\'un angle mesurant entre $90°$ et $180°$.',
		level: 'CM1'
	},
	{
		term: 'octogone',
		tags: ['geometrie'],
		definition: 'Polygone a huit cotes.',
		level: 'CM1'
	},
	{
		term: 'origine',
		tags: ['transversal', 'geometrie'],
		definition: 'Point de reference sur une droite graduee ou dans un repere.',
		level: '6'
	},
	{
		term: 'orthogonal',
		tags: ['geometrie'],
		level: '5',
		derivedFrom: 'perpendiculaire'
	},
	{
		term: 'parabole',
		tags: ['geometrie', 'fonctions'],
		definition: 'Courbe en U representant une fonction du second degre.',
		level: '2'
	},
	{
		term: 'patron',
		tags: ['geometrie'],
		definition: 'Figure plane qui, une fois pliee, forme un solide.',
		level: '6'
	},
	{
		term: 'pave',
		tags: ['geometrie'],
		definition: 'Solide a six faces rectangulaires (parallelepipede rectangle).',
		level: '6',
		synonyms: ['parallelepipede rectangle']
	},
	{
		term: 'pentagone',
		tags: ['geometrie'],
		definition: 'Polygone a cinq cotes.',
		level: 'CM1'
	},
	{
		term: 'perspective',
		tags: ['geometrie'],
		definition: 'Representation d\'un objet 3D sur un plan 2D.',
		level: '6'
	},
	{
		term: 'pi',
		tags: ['geometrie'],
		definition: 'Nombre $\\pi \\approx 3{,}14159$. Rapport du perimetre d\'un cercle a son diametre.',
		level: '6'
	},
	{
		term: 'plan',
		tags: ['geometrie'],
		definition: 'Surface plane infinie a deux dimensions.',
		level: 'CE2'
	},
	{
		term: 'point',
		tags: ['geometrie'],
		definition: 'Element geometrique sans dimension, designe par une lettre majuscule.',
		level: 'CP'
	},
	{
		term: 'prisme',
		tags: ['geometrie'],
		definition: 'Solide dont les deux bases sont des polygones egaux et paralleles.',
		level: '5'
	},
	{
		term: 'pyramide',
		tags: ['geometrie'],
		definition: 'Solide dont la base est un polygone et les faces laterales sont des triangles.',
		level: '5'
	},
	{
		term: 'pythagore',
		tags: ['geometrie'],
		definition: 'Mathematicien grec. Associe au theoreme de Pythagore.',
		level: '4',
		derivedFrom: 'theoreme de Pythagore'
	},
	{
		term: 'quadrilatere',
		tags: ['geometrie'],
		definition: 'Polygone a quatre cotes.',
		level: 'CE2'
	},
	{
		term: 'quelconque',
		tags: ['geometrie'],
		definition: 'Sans propriete particuliere. Ex : triangle quelconque.',
		level: '6'
	},
	{
		term: 'radian',
		tags: ['geometrie', 'trigonometrie'],
		definition: 'Unite de mesure d\'angle. $\\pi\\,\\text{rad} = 180°$.',
		level: '2'
	},
	{
		term: 'rapporteur',
		tags: ['geometrie'],
		definition: 'Instrument de geometrie servant a mesurer des angles.',
		level: 'CE2'
	},
	{
		term: 'regle',
		tags: ['geometrie'],
		definition: 'Instrument de geometrie servant a tracer des droites et mesurer des longueurs.',
		level: 'CP'
	},
	{
		term: 'secante',
		tags: ['geometrie'],
		definition: 'Droite qui coupe une autre droite ou une courbe en un ou plusieurs points.',
		level: '4'
	},
	{
		term: 'secant',
		tags: ['geometrie'],
		level: '4',
		derivedFrom: 'secante'
	},
	{
		term: 'secteur',
		tags: ['geometrie'],
		definition: 'Portion de disque delimitee par deux rayons et un arc de cercle.',
		level: '6'
	},
	{
		term: 'concave',
		tags: ['geometrie'],
		definition: 'Se dit d\'une figure ou d\'une courbe qui presente un creux.',
		level: '4'
	},
	{
		term: 'convexe',
		tags: ['geometrie'],
		definition:
			'Se dit d\'une figure ou d\'une courbe qui ne presente pas de creux. Un segment joignant deux points de la figure reste a l\'interieur.',
		level: '4'
	},
	{
		term: 'solide',
		tags: ['geometrie'],
		definition: 'Figure geometrique de l\'espace a trois dimensions.',
		level: 'CE2'
	},
	{
		term: 'sphere',
		tags: ['geometrie'],
		definition: 'Ensemble des points de l\'espace situes a une meme distance d\'un centre.',
		level: '5'
	},
	{
		term: 'spherique',
		tags: ['geometrie'],
		level: '5',
		derivedFrom: 'sphere'
	},
	{
		term: 'symetrie',
		tags: ['geometrie'],
		definition: 'Transformation geometrique (axiale ou centrale).',
		level: '6'
	},
	{
		term: 'symetrique',
		tags: ['geometrie'],
		level: '6',
		derivedFrom: 'symetrie axiale'
	},
	{
		term: 'tangeant',
		tags: ['geometrie', 'trigonometrie'],
		definition: 'Variante orthographique de tangente.',
		level: '3',
		derivedFrom: 'tangente (trigonometrie)'
	},
	{
		term: 'thales',
		tags: ['geometrie'],
		definition: 'Mathematicien grec. Associe au theoreme de Thales.',
		level: '3',
		derivedFrom: 'theoreme de Thales'
	},

	// =========================================================================
	// LOGIQUE / ENSEMBLES (termes utiles)
	// =========================================================================
	{
		term: 'ensemble',
		tags: ['logique'],
		definition:
			'Collection d\'elements. Ex : $\\mathbb{N}$ (entiers naturels), $\\mathbb{R}$ (reels).',
		level: '4'
	},
	{
		term: 'appartenir',
		tags: ['logique'],
		definition:
			'Un element appartient a un ensemble s\'il en fait partie. $3 \\in \\mathbb{N}$.',
		level: '4'
	},
	{
		term: 'inclusion',
		tags: ['logique'],
		definition:
			'$A \\subset B$ signifie que tous les elements de $A$ sont dans $B$.',
		level: '2'
	},
	{
		term: 'union',
		tags: ['logique'],
		definition:
			'$A \\cup B$ est l\'ensemble des elements qui sont dans $A$ ou dans $B$ (ou les deux).',
		level: '2'
	},
	{
		term: 'intersection',
		tags: ['logique'],
		definition:
			'$A \\cap B$ est l\'ensemble des elements qui sont a la fois dans $A$ et dans $B$.',
		level: '2'
	},
	{
		term: 'reciproque',
		tags: ['logique'],
		definition:
			'La reciproque de «si $A$ alors $B$» est «si $B$ alors $A$». Elle n\'est pas toujours vraie.',
		level: '4'
	},
	{
		term: 'contraposee',
		tags: ['logique'],
		definition:
			'La contraposee de «si $A$ alors $B$» est «si non $B$ alors non $A$». Elle est toujours equivalente.',
		level: '2'
	},
	{
		term: 'conjecture',
		tags: ['logique'],
		definition: 'Proposition que l\'on suppose vraie mais qui n\'a pas encore ete demontree.',
		level: '4'
	},
	{
		term: 'conjecturer',
		tags: ['logique'],
		level: '4',
		derivedFrom: 'conjecture'
	},
	{
		term: 'deduire',
		tags: ['logique'],
		level: '4',
		derivedFrom: 'demonstration'
	},
	{
		term: 'demonstration',
		tags: ['logique'],
		definition: 'Raisonnement logique prouvant qu\'une proposition est vraie.',
		level: '4'
	},
	{
		term: 'demontrer',
		tags: ['logique'],
		level: '4',
		derivedFrom: 'demonstration'
	},
	{
		term: 'equivalence',
		tags: ['logique'],
		definition: 'Relation logique : $A \\Leftrightarrow B$ signifie que $A$ et $B$ sont simultanement vraies ou fausses.',
		level: '4'
	},
	{
		term: 'hypothese',
		tags: ['logique'],
		definition: 'Condition supposee vraie au depart d\'un raisonnement ou d\'un theoreme.',
		level: '4'
	},
	{
		term: 'implication',
		tags: ['logique'],
		definition: 'Relation logique : si $A$ alors $B$, notee $A \\Rightarrow B$.',
		level: '4'
	},
	{
		term: 'raisonnement',
		tags: ['logique'],
		definition: 'Suite logique d\'arguments menant a une conclusion.',
		level: '4'
	},
	{
		term: 'synthese',
		tags: ['logique'],
		definition: 'Raisonnement partant des hypotheses pour arriver a la conclusion.',
		level: '4'
	},
	{
		term: 'theoreme',
		tags: ['logique'],
		definition: 'Resultat mathematique demontre a partir d\'axiomes ou d\'autres theoremes.',
		level: '4'
	},
	{
		term: 'propriete',
		tags: ['logique'],
		definition:
			'Caracteristique d\'un objet mathematique qui a ete demontree. Ex : la somme des angles d\'un triangle vaut $180°$.',
		level: '6'
	},

	// =========================================================================
	// DIVERS
	// =========================================================================
	{
		term: 'shisma',
		tags: ['arithmetique'],
		definition: 'Petit intervalle musical en theorie des nombres (terme rare).',
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
