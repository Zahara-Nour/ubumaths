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
	/** Formes conjuguées reconnues dans les énoncés (« résous », « résolvez » pour « résoudre »). */
	forms?: string[];
	/** `false` : mot trop courant, jamais souligné automatiquement dans un énoncé (liste fermée). */
	autoLink?: false;
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
			items: [
				{
					grade: 'CP',
					content:
						"Ce qui sert à dire combien il y a d'objets (trente-quatre cubes), à quelle place on est (le quatrième) ou combien mesure une longueur."
				}
			]
		},
		grade: 'CP',
		autoLink: false
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
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'calcul',
		tags: ['transversal'],
		definitions: {
			items: [
				{ grade: 'CP', content: "Opération ou suite d'opérations effectuées sur des nombres." }
			]
		},
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'résultat',
		tags: ['transversal'],
		definitions: { items: [{ grade: 'CP', content: "Valeur obtenue à l'issue d'un calcul." }] },
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'somme',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Une somme d'argent, c'est ce que valent ensemble des pièces et des billets : un billet de $10$ € et une pièce de $2$ € font une somme de $12$ €."
				},
				{ grade: 'CE2', content: "Résultat d'une addition. Ex : la somme de $3$ et $5$ est $8$." }
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
					content:
						"Résultat exact d'une division : le quotient de $3$ par $4$ est $\\frac{3}{4} = 0{,}75$. Dans une division euclidienne, le quotient est le nombre entier trouvé : $15 = 4 \\times 3 + 3$ (quotient $3$, reste $3$)."
				},
				{
					grade: '5',
					content:
						"Le quotient de $a$ par $b$ ($b \\neq 0$) est le nombre qui, multiplié par $b$, donne $a$ ; on l'écrit $a \\div b$ ou $\\frac{a}{b}$ : $3 \\times \\frac{7}{3} = 7$."
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
			items: [
				{
					grade: 'CP',
					content:
						"Opération qui sert à enlever, à retirer ou à trouver ce qui manque : $56 - 14 = 42$. C'est l'opération inverse de l'addition."
				}
			]
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
				{
					grade: 'CE1',
					content:
						"Opération qui remplace une addition répétée : $3 \\times 20$, c'est $20 + 20 + 20$. Son résultat s'appelle le produit."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'division',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Opération qui sert à partager en parts égales, ou à chercher combien de fois un nombre est contenu dans un autre. C'est l'opération inverse de la multiplication : $7 \\times 13 = 91$, donc $91 \\div 7 = 13$."
				}
			]
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
		grade: 'CP',
		autoLink: false
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
				{
					grade: '5',
					content:
						"Ce qui agit sur un nombre pour le transformer : « prendre les $\\frac{3}{4}$ de » est un opérateur ; les $\\frac{3}{4}$ de $20$, c'est $15$."
				}
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
						"Chacun des nombres d'une addition ou d'une soustraction : $12$ et $25$ sont les termes de l'addition $12 + 25$."
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
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Trouver le résultat d'une ou de plusieurs opérations : calculer $7 + 5$, c'est trouver $12$."
				},
				{
					grade: '5',
					content:
						"Calculer, c'est obtenir un résultat numérique. On calcule le périmètre d'un carré de $3$ cm de côté : $12$ cm ; on exprime le périmètre d'un carré de côté $c$ : $4c$."
				}
			]
		},
		grade: 'CE1',
		forms: ['calcule', 'calculez']
	},
	{
		term: 'compter',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Dire les nombres dans l'ordre : un, deux, trois… Compter des objets, c'est trouver combien il y en a."
				}
			]
		},
		grade: 'CP'
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
		grade: 'CP',
		forms: ['ordonne', 'ordonnez', 'range', 'rangez'],
		synonyms: ['ranger'],
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
					content:
						'Écriture avec le signe $=$ qui dit que deux calculs ou deux nombres valent la même chose : $3 + 2 = 5$.'
				},
				{
					grade: '5',
					content:
						'Écriture $A = B$ qui affirme que deux expressions ont la même valeur ; elle peut être vraie ou fausse : $2x + 1 = 7$ est vraie pour $x = 3$, fausse pour $x = 4$.'
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
			items: [
				{
					grade: 'CE1',
					content:
						'« Inférieur à » veut dire « plus petit que » ; on écrit le signe $<$ : $49 < 53$.'
				},
				{
					grade: '3',
					content:
						"« Inférieur ou égal à » s'écrit $\\leq$ : $x \\leq 3$ veut dire que $x$ est plus petit que $3$ ou égal à $3$."
				}
			]
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
			items: [
				{
					grade: 'CP',
					content:
						"Mot qu'on lit pour le signe $-$ : $56 - 14$ se lit « 56 moins 14 ». « Moins que » sert aussi à comparer : $3$, c'est moins que $5$."
				},
				{
					grade: '5',
					content: 'Le signe $-$ indique aussi un nombre négatif : $-4$ se lit « moins 4 ».'
				}
			]
		},
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'opération',
		tags: ['transversal', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Calcul comme l'addition ($+$) ou la soustraction ($-$) ; plus tard viennent la multiplication ($\\times$) et la division ($\\div$)."
				}
			]
		},
		grade: 'CP',
		autoLink: false
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
				}
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
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'problème',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						'Petite histoire avec des nombres et une question : pour répondre, on cherche quel calcul faire.'
				},
				{
					grade: '6',
					content: 'Situation qui demande de chercher et de raisonner pour répondre à une question.'
				}
			]
		},
		grade: 'CP',
		autoLink: false
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
			items: [
				{
					grade: 'CE1',
					content:
						'« Supérieur à » veut dire « plus grand que » ; on écrit le signe $>$ : $53 > 49$.'
				},
				{
					grade: '3',
					content:
						"« Supérieur ou égal à » s'écrit $\\geq$ : $x \\geq 3$ veut dire que $x$ est plus grand que $3$ ou égal à $3$."
				}
			]
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
		grade: 'CP',
		autoLink: false
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
				{
					grade: 'CP',
					content:
						"Un nombre pair est le double d'un nombre : $0$, $2$, $4$, $6$, $8$, $10$… Son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$."
				},
				{ grade: 'CM1', content: 'Nombre entier divisible par $2$.' }
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
					content:
						"Nombre qui n'est pas pair : $1$, $3$, $5$, $7$, $9$, $11$… Son chiffre des unités est $1$, $3$, $5$, $7$ ou $9$."
				},
				{ grade: 'CM1', content: "Nombre entier qui n'est pas divisible par $2$." }
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
						'$3$ est un diviseur de $12$ car la division de $12$ par $3$ tombe juste : $12 = 3 \\times 4$.'
				},
				{
					grade: '5',
					content:
						'$b$ est un diviseur de $a$ si $a$ est un multiple de $b$ : $a = b \\times k$ avec $k$ entier.'
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
						'Règle qui permet de savoir, sans poser la division, si un nombre est divisible par un autre : un nombre est divisible par $2$ si son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$.'
				},
				{
					grade: '5',
					content:
						'Un nombre est divisible par $3$ (ou par $9$) si la somme de ses chiffres est divisible par $3$ (ou par $9$).'
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
						"La moitié d'un nombre, c'est le nombre dont il est le double : la moitié de $14$ est $7$, car $7 + 7 = 14$."
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
			items: [
				{
					grade: 'CE1',
					content:
						"Un quart, c'est une des $4$ parts égales d'un tout partagé en $4$. Un quart d'heure, c'est $15$ minutes."
				}
			]
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
			items: [
				{
					grade: 'CE1',
					content:
						"Le tiers d'un tout, c'est une part quand ce tout est partagé en $3$ parts égales."
				}
			]
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
		grade: 'CP',
		forms: ['décompose', 'décomposez'],
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
						"Ce qui reste d'un nombre décimal quand on enlève sa partie entière : la partie décimale de $3{,}14$ est $0{,}14$."
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
				{
					grade: 'CM1',
					content:
						"Un dixième, c'est une unité partagée en $10$ parts égales : $\\frac{1}{10} = 0{,}1$. Dix dixièmes font une unité ; le chiffre des dixièmes est le premier après la virgule."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'centième',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Un centième, c'est une unité partagée en $100$ parts égales : $\\frac{1}{100} = 0{,}01$. Dix centièmes font un dixième ; le chiffre des centièmes est le deuxième après la virgule."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'millième',
		tags: ['décimaux', 'numération'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						"Un millième, c'est une unité partagée en $1\\,000$ parts égales : $\\frac{1}{1\\,000} = 0{,}001$. Dix millièmes font un centième."
				}
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
						'Fraction dont le dénominateur est $10$, $100$ ou $1\\,000$ : $\\frac{7}{10}$, $\\frac{35}{100}$.'
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
						"L'arrondi à l'unité d'un nombre est l'entier le plus proche de ce nombre : l'arrondi de $7{,}8$ est $8$, celui de $7{,}3$ est $7$."
				},
				{
					grade: '6',
					content:
						'On arrondit aussi au dixième ou au centième : $3{,}14$ arrondi au dixième est $3{,}1$.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'arrondir',
		tags: ['décimaux'],
		grade: 'CM1',
		forms: ['arrondis', 'arrondissez'],
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
			items: [
				{
					grade: 'CP',
					content:
						"Intercaler un nombre entre deux nombres, c'est trouver un nombre plus grand que le premier et plus petit que le second : $25$ est entre $20$ et $30$."
				}
			]
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
					grade: '6',
					content:
						'Quotient de deux nombres entiers : $\\frac{3}{7}$ est le nombre qui, multiplié par $7$, donne $3$. Une fraction est à la fois ce nombre et son écriture ($3$ est le numérateur, $7$ le dénominateur).'
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
						'Diviser le numérateur et le dénominateur par un même nombre entier, diviseur des deux : $\\frac{6}{8} = \\frac{3}{4}$.'
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
		grade: 'CE2',
		synonyms: ['fractions équivalentes']
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
			items: [
				{
					grade: '6',
					content:
						"Simplifier une fraction, c'est diviser son numérateur et son dénominateur par un même nombre entier pour obtenir une fraction égale plus simple : $\\frac{6}{8} = \\frac{3}{4}$."
				},
				{
					grade: '5',
					content:
						"Plus généralement, simplifier une écriture, c'est la remplacer par une écriture égale plus simple : $3x + 2x$ devient $5x$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'simplifier',
		tags: ['fractions', 'arithmétique'],
		grade: '5',
		forms: ['simplifie', 'simplifiez'],
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
						'Nombre positif (comme $3$ ou $+2{,}5$), négatif (comme $-4$ ou $-0{,}7$) ou nul ($0$). Avec eux, toutes les soustractions sont possibles : $3 - 5 = -2$.'
				}
			]
		},
		grade: '5',
		synonyms: ['relatif']
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
			items: [
				{
					grade: '5',
					content:
						"Écart entre un nombre et $0$ sur une droite graduée, sans tenir compte du signe : la distance à zéro de $-3$ est $3$, comme celle de $3$. On l'appelle aussi valeur absolue."
				}
			]
		},
		grade: '5',
		synonyms: ['valeur absolue']
	},
	{
		term: 'irrationnel',
		tags: ['relatifs'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Nombre réel qui ne peut pas s'écrire comme quotient de deux entiers : $\\sqrt{2}$ et $\\pi$ sont irrationnels."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'rationnel',
		tags: ['relatifs'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Nombre égal au quotient de deux nombres entiers relatifs : $\\frac{-3}{4}$, $0{,}5 = \\frac{1}{2}$ ou $7 = \\frac{7}{1}$.'
				}
			]
		},
		grade: '4'
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
					content:
						"Écriture qui combine des nombres, parfois des lettres, avec des signes d'opérations et des parenthèses : $3 \\times (5 + 2)$ ou $3x + 2$."
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
						"Lettre qui peut prendre différentes valeurs : dans $2x + 3$, on peut remplacer $x$ par n'importe quel nombre."
				},
				{
					grade: '4',
					content:
						'En informatique, une variable est une case de la mémoire qui porte un nom et contient une valeur, qui peut changer pendant le programme.'
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
						"Nombre que l'on cherche dans une équation, désigné par une lettre : dans $5x + 3 = 13$, l'inconnue est $x$ ; $2$ est la solution car $5 \\times 2 + 3 = 13$."
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
		grade: '5',
		forms: ['développe', 'développez']
	},
	{
		term: 'factoriser',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Écrire sous forme d'un produit : une somme, $3x + 6 = 3(x + 2)$, ou un nombre entier, $21 = 3 \\times 7$."
				}
			]
		},
		grade: '5',
		forms: ['factorise', 'factorisez']
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
		grade: '5',
		forms: ['réduis', 'réduisez']
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
				{
					grade: '3',
					content:
						'Chacune des trois égalités vraies pour tous nombres $a$ et $b$ : $(a+b)^2 = a^2 + 2ab + b^2$, $(a-b)^2 = a^2 - 2ab + b^2$ et $(a-b)(a+b) = a^2 - b^2$.'
				}
			]
		},
		grade: '3'
	},
	{
		term: 'coefficient',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{ grade: '5', content: 'Nombre qui multiplie : dans $5x$, le coefficient de $x$ est $5$.' },
				{
					grade: '3',
					content:
						'Les coefficients de la fonction affine $x \\mapsto ax + b$ sont les nombres $a$ et $b$.'
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
					content: "Produit d'un nombre par une puissance d'une lettre, comme $3x^2$ ou $-5x$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'polynôme',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'Expression comme $ax^2 + bx + c$ ou $ax^3 + bx^2 + cx + d$ : une somme de termes « nombre × puissance de $x$ ». Le plus grand exposant de coefficient non nul est son degré : $2x^2 + 3x - 1$ est de degré $2$.'
				}
			]
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
						"Plus grand exposant de $x$ dont le coefficient n'est pas nul : $2x^3 + x$ est de degré $3$."
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
			items: [
				{
					grade: '5',
					content: "Écriture sous forme d'un produit : $3x + 6 = 3(x + 2)$ ou $21 = 3 \\times 7$."
				}
			]
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
		forms: ['résous', 'résolvez'],
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
						"Longueur du contour d'une figure : on l'obtient en ajoutant les longueurs de tous ses côtés."
				},
				{
					grade: '5',
					content:
						"Le périmètre d'un rectangle de longueur $L$ et de largeur $l$ est $2 \\times (L + l)$."
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
						"L'aire d'une figure mesure l'étendue de sa surface ; on peut la trouver en comptant des carrés-unités, par exemple des carrés de $1$ cm de côté ($\\text{cm}^2$)."
				},
				{
					grade: '6',
					content:
						"L'aire d'un rectangle est le produit de sa longueur par sa largeur : $4\\,\\text{cm} \\times 3\\,\\text{cm} = 12\\,\\text{cm}^2$."
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
						"Le volume d'un solide mesure la place qu'il occupe ; on peut le trouver en comptant des cubes-unités, par exemple des cubes de $1$ cm de côté ($\\text{cm}^3$)."
				},
				{
					grade: '5',
					content:
						"Le volume d'un pavé droit est le produit de sa longueur, de sa largeur et de sa hauteur."
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
						'On mesure une masse en grammes ($\\text{g}$) et en kilogrammes ($\\text{kg}$) : $1\\,\\text{kg} = 1\\,000\\,\\text{g}$.'
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
					content:
						'Temps qui passe entre deux instants, par exemple entre le début et la fin de la récréation ; on la mesure en heures et en minutes.'
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
				{
					grade: '6',
					content: 'Angle dont la mesure est comprise entre $0°$ et $90°$ (ni nul, ni droit).'
				}
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
		forms: ['construis', 'construisez'],
		derivedFrom: 'construction'
	},
	{
		term: 'convertir',
		tags: ['grandeurs'],
		grade: 'CE2',
		forms: ['convertis', 'convertissez'],
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
			items: [
				{
					grade: 'CE1',
					content: 'Nombre trouvé en mesurant, avec son unité : la table mesure $120$ cm.'
				}
			]
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
			items: [
				{
					grade: 'CM1',
					content:
						"Partie du plan délimitée par une figure, ou bord extérieur d'un solide. Son aire est la mesure de son étendue : on compare des surfaces selon leur aire."
				}
			]
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
				{
					grade: '6',
					content:
						"Part que représente une partie dans le tout : $3$ élèves sur $12$, c'est une proportion de $\\frac{3}{12} = \\frac{1}{4}$, soit $25\\,\\%$."
				}
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
				{
					grade: '6',
					content:
						"Deux grandeurs sont proportionnelles si l'on obtient les valeurs de l'une en multipliant celles de l'autre par un même nombre non nul."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'rapport',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Le rapport d'une partie au tout est la fraction qui indique quelle part elle représente : $3$ filles sur $12$ élèves, c'est un rapport de $\\frac{3}{12}$, soit $\\frac{1}{4}$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'ratio',
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Façon de comparer des quantités par leurs parts : un ratio de $2 : 3$ veut dire $2$ parts pour $3$ parts. On peut comparer plus de deux quantités, comme $2 : 3 : 5$.'
				}
			]
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
						'Pour un entier $n \\geq 1$, $a^n$ est le produit de $n$ facteurs égaux à $a$ : $2^3 = 2 \\times 2 \\times 2 = 8$. Par convention, $a^0 = 1$ pour $a \\neq 0$.'
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
						"Dans $a^n$, l'exposant $n$ est le nombre de facteurs égaux à $a$ : $2^3 = 2 \\times 2 \\times 2$ a trois facteurs."
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
				{ grade: '4', content: 'Nombre de la forme $10^n$, comme $10^3 = 1\\,000$.' },
				{
					grade: '3',
					content: 'Avec les exposants négatifs : $10^{-2} = \\frac{1}{100} = 0{,}01$.'
				}
			]
		},
		grade: '4'
	},
	{
		term: 'exposant négatif',
		tags: ['puissances'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Pour $a \\neq 0$ et $n$ entier positif, $a^{-n} = \\frac{1}{a^n}$, l'inverse de $a^n$ : $2^{-3} = \\frac{1}{8}$."
				}
			]
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
					content: "Entier qui est le carré d'un entier : $0$, $1$, $4$, $9$, $16$, $25$…"
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
						'Procédé qui, à chaque nombre $x$, associe un seul nombre, noté $f(x)$ : la fonction $f : x \\mapsto 2x + 1$ associe $7$ à $3$.'
				},
				{
					grade: '2',
					content:
						'Une fonction $f$ définie sur un ensemble $D$ associe à chaque réel $x$ de $D$ un unique réel $f(x)$, son image.'
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
						'$f$ est croissante sur un intervalle $I$ si, pour tous réels $a$ et $b$ de $I$ tels que $a \\leq b$, on a $f(a) \\leq f(b)$ : quand $x$ augmente, $f(x)$ augmente ou reste égal.'
				}
			]
		},
		grade: '2'
	},
	{ term: 'croissant', tags: ['fonctions'], grade: 'CP', derivedFrom: 'ordre' },
	{
		term: 'décroissante',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'$f$ est décroissante sur un intervalle $I$ si, pour tous réels $a$ et $b$ de $I$ tels que $a \\leq b$, on a $f(a) \\geq f(b)$ : quand $x$ augmente, $f(x)$ diminue ou reste égal.'
				}
			]
		},
		grade: '2'
	},
	{ term: 'décroissant', tags: ['fonctions'], grade: 'CP', derivedFrom: 'ordre' },
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
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Montrer une situation, des données ou un nombre par un dessin, un schéma, un tableau ou un graphique : représenter une fraction, représenter des données par un diagramme.'
				}
			]
		},
		grade: 'CE1',
		forms: ['représente', 'représentez']
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
						"Pour une fonction affine $x \\mapsto ax + b$, c'est le nombre $b = f(0)$ : la droite qui la représente coupe l'axe des ordonnées au point d'ordonnée $b$."
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
					content:
						"Pour une fonction affine $x \\mapsto ax + b$, c'est le nombre $a$ : quand $x$ augmente de $1$, $f(x)$ augmente de $a$. On l'appelle aussi la pente de la droite."
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
						"Fonction dérivée de $f$ : la fonction $f'$ qui, à chaque nombre $x$ où $f$ est dérivable, associe le nombre dérivé $f'(x)$."
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
						"Tangente à la courbe de $f$ au point d'abscisse $a$ : la droite qui passe par ce point et dont le coefficient directeur est le nombre dérivé $f'(a)$. C'est la position limite des sécantes qui passent par ce point."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'nombre dérivé',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Nombre $f'(a)$ dont se rapproche le taux de variation $\\frac{f(a+h) - f(a)}{h}$ quand $h$ se rapproche de $0$. C'est le coefficient directeur de la tangente à la courbe au point d'abscisse $a$."
				}
			]
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
					content:
						'Le plus grand (maximum) ou le plus petit (minimum) des nombres $f(x)$ quand $x$ parcourt un intervalle.'
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
						'Ensemble des réels $x$ qui vérifient une ou deux inégalités : $[2 ; 5]$ contient les $x$ tels que $2 \\leq x \\leq 5$ ; $]-\\infty ; 3[$ contient les $x$ tels que $x < 3$.'
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
				{
					grade: 'T_SPE',
					content:
						"Une fonction $f$ est continue en $a$ si $f(x)$ se rapproche de $f(a)$ quand $x$ se rapproche de $a$ : $\\lim_{x \\to a} f(x) = f(a)$. Continue sur un intervalle, sa courbe s'y trace sans lever le crayon."
				}
			]
		},
		grade: 'T_SPE'
	},
	{ term: 'continuité', tags: ['fonctions'], grade: 'T_SPE', derivedFrom: 'continu' },
	{
		term: 'dériver',
		tags: ['fonctions'],
		grade: '1_SPE',
		derivedFrom: 'dérivée'
	},
	{
		term: 'exponentielle',
		tags: ['fonctions'],
		grade: '1_SPE',
		derivedFrom: 'fonction exponentielle'
	},
	{
		term: 'intégrale',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Pour $f$ continue et positive sur $[a ; b]$, $\\int_a^b f(x)\\,\\mathrm{d}x$ est l'aire du domaine compris entre la courbe de $f$, l'axe des abscisses et les droites d'équations $x = a$ et $x = b$. Pour $f$ continue de signe quelconque, c'est $F(b) - F(a)$, où $F$ est une primitive de $f$."
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
			items: [
				{
					grade: '1_SPE',
					content:
						"Une suite a pour limite le réel $\\ell$ si ses termes deviennent aussi proches de $\\ell$ que l'on veut quand $n$ est assez grand ; elle a pour limite $+\\infty$ si ses termes deviennent aussi grands que l'on veut."
				},
				{
					grade: 'T_SPE',
					content:
						"Le réel $\\ell$ est la limite de $(u_n)$ si tout intervalle ouvert contenant $\\ell$ contient tous les termes $u_n$ à partir d'un certain rang ; même idée pour $f(x)$ quand $x$ tend vers $a$ ou vers $+\\infty$."
				}
			]
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
					grade: '6',
					content:
						"Le rang d'un chiffre est sa place dans l'écriture d'un nombre : dans $3{,}52$, le chiffre $5$ est au rang des dixièmes."
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
					grade: '6',
					content:
						"Nombre compris entre $0$ et $1$ qui mesure la chance qu'un évènement se produise : $0$ s'il est impossible, $1$ s'il est certain."
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
						"La fréquence d'un résultat est le nombre de fois où il est obtenu divisé par le nombre total d'essais : $5$ « pile » sur $20$ lancers donne $\\frac{5}{20} = 0{,}25$."
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
					content:
						"Une combinaison de $k$ éléments d'un ensemble $E$ à $n$ éléments est une partie de $E$ à $k$ éléments (l'ordre ne compte pas). Il y en a $\\binom{n}{k}$."
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
						'Nombre obtenu en additionnant toutes les valeurs puis en divisant par le nombre de valeurs : la moyenne de $8$, $12$ et $13$ est $(8 + 12 + 13) \\div 3 = 11$.'
				},
				{
					grade: '4',
					content:
						'Moyenne pondérée : chaque valeur compte autant de fois que son effectif (ou son coefficient).'
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
						"Le premier quartile $Q_1$ est la plus petite valeur de la série telle qu'au moins un quart des valeurs lui sont inférieures ou égales ; le troisième quartile $Q_3$, la plus petite telle qu'au moins trois quarts le sont."
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
					content:
						"Moyenne des carrés des écarts à la moyenne ; pour une variable aléatoire $X$ : $V(X) = E\\big((X - E(X))^2\\big)$. L'écart type est $\\sqrt{V}$."
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
			items: [
				{
					grade: 'CP',
					content:
						"Ligne bien droite, tracée à la règle, qui ne s'arrête pas : on n'en dessine qu'un morceau."
				},
				{
					grade: '6',
					content:
						'Ligne droite illimitée des deux côtés ; la droite qui passe par $A$ et $B$ se note $(AB)$.'
				}
			]
		},
		grade: 'CP',
		autoLink: false
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
					content:
						"Le symétrique d'un point $A$ par rapport à une droite $(d)$ est le point $A'$ tel que $(d)$ soit la médiatrice du segment $[AA']$ (ou $A$ lui-même si $A$ est sur $(d)$). La symétrie axiale transforme une figure comme un pliage le long de $(d)$."
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
					content:
						"Demi-tour autour d'un point $O$ : l'image d'un point $M$ est le point $M'$ tel que $O$ soit le milieu du segment $[MM']$."
				}
			]
		},
		grade: '5',
		synonyms: ['demi-tour']
	},
	{
		term: 'translation',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						'Transformation qui déplace chaque point dans la même direction, dans le même sens et de la même distance.'
				},
				{
					grade: '3',
					content:
						"La translation qui transforme $A$ en $B$ associe à tout point $M$ le point $M'$ tel que $ABM'M$ soit un parallélogramme (éventuellement aplati)."
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
						"Si deux droites sécantes en $A$ sont coupées par deux droites parallèles $(BC)$ et $(MN)$, avec $B$ et $M$ sur l'une, $C$ et $N$ sur l'autre, alors $\\frac{AM}{AB} = \\frac{AN}{AC} = \\frac{MN}{BC}$."
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
				{
					grade: 'CE2',
					content:
						"Segment qui va du centre d'un cercle à un point du cercle ; c'est aussi sa longueur : un cercle de rayon $4$ cm."
				}
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
						'Segment qui joint deux points du cercle en passant par son centre ; il est deux fois plus long que le rayon.'
				},
				{
					grade: '3',
					content:
						"Segment qui joint deux points d'un cercle ou d'une sphère en passant par le centre ; sa longueur est le double du rayon : $d = 2r$."
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
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Figure qui a $4$ côtés et $4$ coins comme ceux d'une feuille ; ses côtés opposés ont la même longueur."
				},
				{ grade: 'CE2', content: 'Quadrilatère qui a quatre angles droits.' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'carré',
		sense: 'géométrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Figure qui a $4$ côtés de même longueur et $4$ coins comme ceux d'une feuille."
				},
				{
					grade: 'CE2',
					content: 'Quadrilatère qui a quatre angles droits et quatre côtés de même longueur.'
				}
			]
		},
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
				{ grade: '5', content: 'Quadrilatère dont les côtés opposés sont parallèles deux à deux.' }
			]
		},
		grade: '5'
	},
	{
		term: 'trapèze',
		tags: ['géométrie'],
		definitions: {
			items: [{ grade: 'CM2', content: 'Quadrilatère qui a deux côtés opposés parallèles.' }]
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
						'Le vecteur $\\overrightarrow{AB}$ décrit la translation qui transforme $A$ en $B$ : une direction (celle de la droite $(AB)$), un sens (de $A$ vers $B$) et une longueur ($AB$).'
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
				{
					grade: '2',
					content:
						"Longueur d'un vecteur : la norme de $\\overrightarrow{AB}$ est la distance $AB$. Dans une base orthonormée, si $\\vec{u}$ a pour coordonnées $(x ; y)$, sa norme est $\\sqrt{x^2 + y^2}$."
				}
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
						"Produit scalaire de deux vecteurs non nuls $\\vec{u}$ et $\\vec{v}$ : le nombre $\\vec{u} \\cdot \\vec{v} = \\|\\vec{u}\\| \\times \\|\\vec{v}\\| \\times \\cos(\\vec{u}, \\vec{v})$ ; il vaut $0$ si l'un des vecteurs est nul. En base orthonormée, c'est $xx' + yy'$."
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
			items: [
				{
					grade: '6',
					content:
						"Deux angles adjacents ont le même sommet, un côté commun, et sont situés de part et d'autre de ce côté."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'aigu',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CE1', content: "Se dit d'un angle plus petit qu'un angle droit." },
				{
					grade: '6',
					content:
						"Se dit d'un angle dont la mesure est comprise entre $0°$ et $90°$ (ni nul, ni droit)."
				}
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
			items: [
				{
					grade: '2',
					content:
						"Barycentre de $A$ et $B$ affectés des coefficients $a$ et $b$ ($a + b \\neq 0$) : le point $G$ tel que $a\\overrightarrow{GA} + b\\overrightarrow{GB} = \\vec{0}$. Si $a = b$, c'est le milieu de $[AB]$."
				}
			]
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
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'forme',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CP', content: "Aspect extérieur d'un objet géométrique." }] },
		grade: 'CP',
		autoLink: false
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
						"Courbe représentative de la fonction inverse $x \\mapsto \\frac{1}{x}$ : deux branches, l'une pour $x < 0$, l'autre pour $x > 0$."
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
			items: [
				{
					grade: '3',
					content: 'Courbe en forme de U, comme celle de la fonction carré $x \\mapsto x^2$.'
				},
				{
					grade: '1_SPE',
					content:
						"Courbe représentative d'une fonction polynôme du second degré $x \\mapsto ax^2 + bx + c$ ($a \\neq 0$) : tournée vers le haut si $a > 0$, vers le bas si $a < 0$."
				}
			]
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
		synonyms: ['parallélépipède rectangle', 'pavé droit']
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
		grade: 'CP',
		autoLink: false
	},
	{
		term: 'prisme',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Un prisme droit est un solide qui a deux faces superposables et parallèles, ses bases (des polygones) ; toutes ses autres faces sont des rectangles.'
				}
			]
		},
		grade: 'CM1',
		synonyms: ['prisme droit']
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
					content:
						'Solide dont la base est un polygone et dont les autres faces sont des triangles qui ont un sommet commun, le sommet de la pyramide.'
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
				{
					grade: 'T_SPE',
					content:
						"Une fonction $f$ est concave sur un intervalle $I$ si sa courbe y est située au-dessus de chacune de ses sécantes, entre les deux points d'intersection : c'est le cas de $x \\mapsto -x^2$, dont la courbe a la forme d'un dôme."
				}
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
						"Une fonction $f$ est convexe sur un intervalle $I$ si sa courbe y est située en dessous de chacune de ses sécantes, entre les deux points d'intersection : c'est le cas de $x \\mapsto x^2$, dont la courbe a la forme d'un creux."
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
				}
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
					grade: '4',
					content:
						"Collection d'objets bien déterminés, ses éléments : l'ensemble des issues d'un lancer de dé est $\\{1, 2, 3, 4, 5, 6\\}$."
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
		grade: '4',
		synonyms: ['réunion']
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
		forms: ['démontre', 'démontrez'],
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
				{
					grade: '3',
					content:
						"Dans un raisonnement par analyse-synthèse, étape où l'on vérifie que les valeurs trouvées pendant l'analyse sont vraiment des solutions."
				}
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
						"Énoncé vrai pour tous les objets d'une même sorte, démontré ou admis : « la somme des angles d'un triangle vaut $180°$ » est une propriété des triangles."
				}
			]
		},
		grade: 'CE1'
	},

	// =========================================================================
	// AJOUTS DU LOT 0d (vocabulaire des programmes officiels, validé par David)
	// =========================================================================
	{
		term: 'cube',
		sense: 'solide',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CP', content: 'Solide qui a $6$ faces carrées, toutes pareilles, comme un dé.' },
				{
					grade: 'CM1',
					content:
						'Pavé droit dont les $6$ faces sont des carrés de même taille ; il a $12$ arêtes et $8$ sommets.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'degré',
		sense: 'angle',
		tags: ['grandeurs', 'géométrie'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						"Unité de mesure des angles, notée $°$ : l'angle droit mesure $90°$, un demi-tour $180°$."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'base',
		sense: 'solide',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Dans une pyramide, la face sur laquelle elle est posée, qui n'est pas forcément un triangle. Un prisme ou un cylindre a deux bases, parallèles et superposables."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'base',
		sense: 'vecteurs',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Une base du plan est formée de deux vecteurs non colinéaires $\\vec{i}$ et $\\vec{j}$ ; elle est orthonormée si ces vecteurs sont orthogonaux et de norme $1$.'
				},
				{
					grade: 'T_SPE',
					content:
						"Une base de l'espace est formée de trois vecteurs non coplanaires $\\vec{i}$, $\\vec{j}$, $\\vec{k}$ : tout vecteur s'écrit d'une seule façon $x\\vec{i} + y\\vec{j} + z\\vec{k}$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'racine',
		sense: 'polynôme',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Une racine d'un polynôme $P$ est un nombre $a$ tel que $P(a) = 0$. Ainsi, $2$ est une racine de $x^2 - 4$, car $2^2 - 4 = 0$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'échelle',
		sense: 'axe gradué',
		tags: ['statistiques', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Sur un axe gradué ou un diagramme, ce que représente l'écart entre deux graduations : par exemple, $1$ carreau pour $10$ élèves."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'image',
		sense: 'transformation',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"L'image d'un point par une transformation (symétrie, translation…) est le point sur lequel elle l'envoie : par la symétrie de centre $O$, l'image de $M$ est le point $M'$ tel que $O$ soit le milieu de $[MM']$."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'complémentaire',
		sense: 'ensemble',
		tags: ['logique', 'probabilités'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Le complémentaire d'un ensemble $A$ est l'ensemble des éléments qui ne sont pas dans $A$ : pour un dé, le complémentaire de « obtenir un nombre pair » est « obtenir un nombre impair »."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'plan',
		sense: 'lieu',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Dessin d'un lieu vu de dessus, qui aide à se repérer : le plan de la classe, le plan du quartier."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'série statistique',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Liste des valeurs relevées dans une enquête ou une expérience : les notes d'une classe, les tailles des élèves…"
				}
			]
		},
		grade: '5'
	},
	{
		term: 'fonction paire',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Une fonction $f$ est paire si, pour tout $x$ de son ensemble de définition, $-x$ en fait aussi partie et $f(-x) = f(x)$ : sa courbe est symétrique par rapport à l'axe des ordonnées. Ex : $x \\mapsto x^2$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'fonction impaire',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Une fonction $f$ est impaire si, pour tout $x$ de son ensemble de définition, $-x$ en fait aussi partie et $f(-x) = -f(x)$ : sa courbe est symétrique par rapport à l'origine. Ex : $x \\mapsto x^3$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'fonction réciproque',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Quand une fonction $f$ associe à chaque $x$ d'un intervalle un nombre $y$, et que chaque $y$ vient d'un seul $x$, la fonction réciproque fait le chemin inverse : elle associe $x$ à $y$. Ex : $\\ln$ est la réciproque de $\\exp$."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'impossible',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Se dit d'un évènement qui ne peut jamais se produire : obtenir $7$ en lançant un dé à six faces."
				},
				{ grade: '6', content: 'Un évènement impossible a une probabilité égale à $0$.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'possible',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Se dit d'un évènement qui peut se produire, sans que ce soit sûr : obtenir $6$ en lançant un dé."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'certain',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Se dit d'un évènement qui se produit à coup sûr : obtenir un nombre plus petit que $7$ en lançant un dé à six faces."
				},
				{ grade: '6', content: 'Un évènement certain a une probabilité égale à $1$.' }
			]
		},
		grade: 'CM1'
	},
	{
		term: 'probable',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Se dit d'un évènement qui a beaucoup de chances de se produire : en lançant un dé, obtenir un nombre plus grand que $1$ est probable."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'peu probable',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Se dit d'un évènement qui a peu de chances de se produire : tirer la seule boule rouge d'un sac qui contient aussi $20$ boules bleues."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'une chance sur deux',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						'Un évènement a une chance sur deux de se produire quand il a autant de chances de se produire que de ne pas se produire : obtenir pile en lançant une pièce.'
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'compris entre',
		tags: ['entiers', 'transversal'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Un nombre est compris entre deux nombres s'il est plus grand que le premier et plus petit que le second : $35$ est compris entre $30$ et $40$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'en fonction de',
		tags: ['fonctions', 'calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Une grandeur s'exprime en fonction d'une autre quand on peut la calculer à partir d'elle : le prix payé en fonction du nombre de places, le périmètre d'un carré en fonction de son côté."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'condition nécessaire',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						'« B est une condition nécessaire pour A » veut dire que A ne peut pas être vrai sans B : si A est vrai, alors B est vrai ($A \\Rightarrow B$). Être pair est une condition nécessaire pour être multiple de $4$.'
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'condition suffisante',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"« A est une condition suffisante pour B » veut dire qu'il suffit que A soit vrai pour que B le soit : si A est vrai, alors B est vrai ($A \\Rightarrow B$). Être multiple de $4$ est une condition suffisante pour être pair."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'disque',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CP', content: 'Figure ronde et pleine, comme une pièce posée à plat.' },
				{
					grade: '6',
					content:
						'Ensemble des points situés à une distance du centre inférieure ou égale au rayon ; le cercle en est le bord.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'boule',
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: 'CP', content: 'Solide tout rond, comme une balle.' },
				{
					grade: '3',
					content:
						"Ensemble des points de l'espace situés à une distance du centre inférieure ou égale au rayon ; la sphère en est la surface."
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'corde',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Segment qui joint deux points d'un cercle. Une corde qui passe par le centre est un diamètre."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'angle nul',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [{ grade: '6', content: 'Angle dont les deux côtés sont confondus : il mesure $0°$.' }]
		},
		grade: '6'
	},
	{
		term: 'angle plat',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Angle dont les deux côtés sont dans le prolongement l'un de l'autre : il mesure $180°$."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'angle plein',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [{ grade: '6', content: 'Angle qui fait un tour complet : il mesure $360°$.' }]
		},
		grade: '6'
	},
	{
		term: 'angle saillant',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Angle dont la mesure est comprise entre $0°$ et $180°$ : c'est l'angle que l'on mesure d'habitude avec le rapporteur."
				}
			]
		},
		grade: '6'
	},
	{
		term: 'angles supplémentaires',
		tags: ['géométrie', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						'Deux angles sont supplémentaires quand la somme de leurs mesures est égale à $180°$.'
				}
			]
		},
		grade: '6'
	},
	{
		term: 'grand cercle',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Sur une sphère, cercle qui a le même centre et le même rayon que la sphère : l'équateur est un grand cercle de la Terre."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'ensemble vide',
		tags: ['logique', 'probabilités'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Ensemble qui ne contient aucun élément, noté $\\varnothing$ : un évènement impossible correspond à l'ensemble vide."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'contenance',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Quantité de liquide qu'un récipient peut contenir ; on la mesure en litres ($\\text{L}$), décilitres ($\\text{dL}$) ou centilitres ($\\text{cL}$)."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'triangle rectangle',
		tags: ['géométrie'],
		definitions: { items: [{ grade: 'CE1', content: 'Triangle qui a un angle droit.' }] },
		grade: 'CE1'
	},
	{
		term: 'axe de symétrie',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						'Droite le long de laquelle on peut plier une figure pour que ses deux moitiés se superposent exactement.'
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'nombre ordinal',
		tags: ['entiers', 'numération'],
		definitions: {
			items: [
				{ grade: 'CP', content: 'Nombre qui indique un rang : premier, deuxième, troisième…' }
			]
		},
		grade: 'CP'
	},
	{
		term: 'heure',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Unité de durée, notée $\\text{h}$ : une journée dure $24$ heures.'
				},
				{
					grade: 'CE1',
					content: 'Une heure dure $60$ minutes : $1\\,\\text{h} = 60\\,\\text{min}$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'minute',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: 'Unité de durée, notée $\\text{min}$ : il y a $60$ minutes dans une heure.'
				},
				{
					grade: 'CM1',
					content: 'Une minute dure $60$ secondes : $1\\,\\text{min} = 60\\,\\text{s}$.'
				}
			]
		},
		grade: 'CP'
	},
	{
		term: 'gramme',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Unité de masse, notée $\\text{g}$ : un trombone pèse environ $1$ g. Il faut $1\\,000$ grammes pour faire $1$ kilogramme.'
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'kilogramme',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Unité de masse, notée $\\text{kg}$ : $1\\,\\text{kg} = 1\\,000\\,\\text{g}$. Un litre d'eau pèse environ $1$ kg."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'litre',
		tags: ['grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Unité de contenance, notée $\\text{L}$ : une bouteille d'eau contient souvent $1$ L. $1\\,\\text{L} = 10\\,\\text{dL} = 100\\,\\text{cL}$."
				}
			]
		},
		grade: 'CE2'
	},
	{
		term: 'retenue',
		tags: ['operations', 'entiers'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Dans une opération posée, le chiffre que l'on reporte dans la colonne de gauche : $7 + 5 = 12$, on écrit $2$ et on retient $1$."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'demi',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Un demi, c'est une des $2$ parts égales d'un tout partagé en $2$ : $\\frac{1}{2}$. Deux demis font un tout."
				}
			]
		},
		grade: 'CE1'
	},
	{
		term: 'programme de calcul',
		tags: ['calcul-littéral', 'operations'],
		definitions: {
			items: [
				{
					grade: 'CM1',
					content:
						"Suite d'instructions de calcul à appliquer à un nombre : « choisis un nombre, multiplie-le par $3$, puis ajoute $5$ »."
				}
			]
		},
		grade: 'CM1'
	},
	{
		term: 'algorithme',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CM2',
					content:
						"Suite d'instructions précises qui permet d'obtenir un résultat ou de résoudre un problème, comme une recette."
				}
			]
		},
		grade: 'CM2'
	},
	{
		term: 'boucle',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Partie d'un programme répétée plusieurs fois : un nombre de fois fixé (« répéter $10$ fois ») ou tant qu'une condition est vraie."
				}
			]
		},
		grade: '5'
	},
	{
		term: 'instruction conditionnelle',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: '4',
					content:
						"Instruction d'un programme exécutée seulement si une condition est vraie : « si … alors … sinon … »."
				}
			]
		},
		grade: '4'
	},
	{
		term: 'million',
		tags: ['entiers', 'numération'],
		definitions: { items: [{ grade: 'CM2', content: 'Mille milliers : $1\\,000\\,000$.' }] },
		grade: 'CM2'
	},
	{
		term: 'milliard',
		tags: ['entiers', 'numération'],
		definitions: { items: [{ grade: '6', content: 'Mille millions : $1\\,000\\,000\\,000$.' }] },
		grade: '6'
	},
	{
		term: 'nombre mixte',
		tags: ['fractions'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Écriture d'un nombre comme un entier plus une fraction plus petite que $1$ : $2 + \\frac{3}{4}$, qui vaut $\\frac{11}{4}$."
				}
			]
		},
		grade: '6'
	},
	{
		term: "point d'intersection",
		tags: ['géométrie'],
		definitions: {
			items: [
				{ grade: '6', content: 'Point commun à deux droites, ou à deux lignes, qui se coupent.' }
			]
		},
		grade: '6'
	},
	{
		term: 'cercle circonscrit',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '6',
					content:
						"Cercle qui passe par les trois sommets d'un triangle ; son centre est le point de rencontre des médiatrices des côtés."
				}
			]
		},
		grade: '6'
	},
	{
		term: "taux d'évolution",
		tags: ['proportionnalité'],
		definitions: {
			items: [
				{
					grade: '3',
					content:
						"Variation d'une grandeur rapportée à sa valeur de départ, souvent en pourcentage : passer de $50$ à $60$, c'est un taux d'évolution de $\\frac{60 - 50}{50} = 20\\,\\%$."
				}
			]
		},
		grade: '3'
	},
	{
		term: 'nombre réel',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Nombre qui repère un point sur une droite graduée : les entiers, les décimaux et les fractions, mais aussi $\\sqrt{2}$ ou $\\pi$. Leur ensemble se note $\\mathbb{R}$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'colinéaire',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Deux vecteurs sont colinéaires si l'un est égal à l'autre multiplié par un nombre : $\\vec{v} = k\\vec{u}$. Les points $A$, $B$, $C$ sont alignés quand $\\overrightarrow{AB}$ et $\\overrightarrow{AC}$ sont colinéaires."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'vecteur directeur',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Vecteur non nul qui donne la direction d'une droite : $\\overrightarrow{AB}$ est un vecteur directeur de la droite $(AB)$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'déterminant',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Le déterminant des vecteurs $\\vec{u}(x ; y)$ et $\\vec{v}(x' ; y')$ est le nombre $xy' - x'y$ ; il est nul si et seulement si les deux vecteurs sont colinéaires."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'équation réduite',
		tags: ['fonctions', 'géométrie'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Une droite non parallèle à l'axe des ordonnées a une équation de la forme $y = mx + p$ : c'est son équation réduite ($m$ est le coefficient directeur, $p$ l'ordonnée à l'origine)."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'sens de variation',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Le sens de variation d'une fonction dit sur quels intervalles elle est croissante ou décroissante ; on le résume dans un tableau de variations."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'fonction de référence',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Fonction dont on connaît la courbe et les variations : $x \\mapsto x^2$, $x \\mapsto \\frac{1}{x}$, $x \\mapsto \\sqrt{x}$, $x \\mapsto x^3$, $x \\mapsto |x|$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'histogramme',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Diagramme qui représente des données regroupées en classes : pour chaque classe, un rectangle dont l'aire est proportionnelle à l'effectif."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'écart interquartile',
		tags: ['statistiques'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'Différence $Q_3 - Q_1$ entre le troisième et le premier quartile : plus il est petit, plus les valeurs centrales de la série sont regroupées.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'forme factorisée',
		tags: ['calcul-littéral'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Écriture d'une expression sous forme d'un produit : $(x - 1)(x + 3)$ est une forme factorisée de $x^2 + 2x - 3$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'probabilité conditionnelle',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						"Probabilité que l'évènement $B$ se réalise quand on sait que $A$ est réalisé ; on la note $P_A(B)$ et $P_A(B) = \\frac{P(A \\cap B)}{P(A)}$."
				}
			]
		},
		grade: '2'
	},
	{
		term: 'croissance linéaire',
		tags: ['suites', 'fonctions'],
		definitions: {
			items: [
				{
					grade: '1_GEN',
					content:
						'Une grandeur a une croissance linéaire quand elle augmente de la même quantité à chaque étape : $100$, $110$, $120$, $130$… (on ajoute $10$).'
				}
			]
		},
		grade: '1_GEN'
	},
	{
		term: 'croissance exponentielle',
		tags: ['suites', 'fonctions'],
		definitions: {
			items: [
				{
					grade: '1_GEN',
					content:
						'Une grandeur a une croissance exponentielle quand elle est multipliée par le même nombre, plus grand que $1$, à chaque étape : $100$, $110$, $121$, $133{,}1$… (on multiplie par $1{,}1$).'
				}
			]
		},
		grade: '1_GEN'
	},
	{
		term: 'discret',
		tags: ['suites'],
		definitions: {
			items: [
				{
					grade: '1_GEN',
					content:
						"Se dit d'une grandeur qui évolue par étapes (chaque année, chaque mois…), par opposition à « continu » : une suite modélise une évolution discrète."
				}
			]
		},
		grade: '1_GEN'
	},
	{
		term: 'discriminant',
		tags: ['fonctions', 'équations'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Pour $ax^2 + bx + c$ ($a \\neq 0$), le nombre $\\Delta = b^2 - 4ac$ : son signe dit si l'équation $ax^2 + bx + c = 0$ a deux, une ou aucune solution réelle."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'forme canonique',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Écriture d'une fonction polynôme du second degré sous la forme $a(x - \\alpha)^2 + \\beta$ : le sommet de sa parabole est le point $(\\alpha ; \\beta)$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'évènements indépendants',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Deux évènements $A$ et $B$ sont indépendants si $P(A \\cap B) = P(A) \\times P(B)$ : savoir que l'un est réalisé ne change pas la probabilité de l'autre."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'épreuve de Bernoulli',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: '1_SPE',
					content:
						"Expérience aléatoire à deux issues : le succès, de probabilité $p$, et l'échec, de probabilité $1 - p$."
				}
			]
		},
		grade: '1_SPE'
	},
	{
		term: 'schéma de Bernoulli',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content: 'Répétition de $n$ épreuves de Bernoulli identiques et indépendantes.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'loi binomiale',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						'Loi du nombre de succès dans un schéma de Bernoulli de $n$ épreuves de probabilité de succès $p$ : $P(X = k) = \\binom{n}{k} p^k (1 - p)^{n - k}$.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'coefficient binomial',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"$\\binom{n}{k}$ (« $k$ parmi $n$ ») : le nombre de façons de choisir $k$ éléments parmi $n$, sans tenir compte de l'ordre. Ex : $\\binom{4}{2} = 6$."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'factorielle',
		tags: ['probabilités'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"$n! = 1 \\times 2 \\times \\cdots \\times n$ pour $n \\geq 1$, et $0! = 1$ : c'est le nombre de façons de ranger $n$ objets. Ex : $4! = 24$."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'raisonnement par récurrence',
		tags: ['logique', 'suites'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Pour démontrer qu'une propriété $P(n)$ est vraie pour tout entier $n \\geq n_0$ : on vérifie $P(n_0)$ (initialisation), puis on montre que si $P(n)$ est vraie, alors $P(n + 1)$ l'est aussi (hérédité)."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'asymptote',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Droite dont la courbe se rapproche autant qu'on veut : si $\\lim_{x \\to +\\infty} f(x) = 2$, la droite d'équation $y = 2$ est asymptote horizontale ; si $\\lim_{x \\to 1} f(x) = +\\infty$, la droite d'équation $x = 1$ est asymptote verticale."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'fonction composée',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						'La composée de $u$ suivie de $v$ est la fonction $x \\mapsto v(u(x))$ : on applique $u$, puis $v$ au résultat. Ex : $x \\mapsto \\sqrt{x^2 + 1}$.'
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'dérivée seconde',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Dérivée de la dérivée : $f'' = (f')'$. Son signe indique où $f$ est convexe ($f'' \\geq 0$) ou concave ($f'' \\leq 0$)."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: "point d'inflexion",
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Point où la courbe traverse sa tangente : la fonction y passe de convexe à concave, ou l'inverse ; $f''$ y change de signe."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'théorème des valeurs intermédiaires',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Si $f$ est continue sur $[a ; b]$, alors pour tout réel $k$ compris entre $f(a)$ et $f(b)$, l'équation $f(x) = k$ a au moins une solution dans $[a ; b]$."
				}
			]
		},
		grade: 'T_SPE'
	},
	{
		term: 'équation différentielle',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_SPE',
					content:
						"Équation dont l'inconnue est une fonction, reliée à sa dérivée : $y' = 2y$ a pour solutions les fonctions $x \\mapsto Ce^{2x}$."
				}
			]
		},
		grade: 'T_SPE'
	},

	// =========================================================================
	// VERBES DE CONSIGNE (lot 0e, validé par David)
	// =========================================================================
	{
		term: 'exprimer',
		tags: ['calcul-littéral', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Exprimer une mesure dans une unité, c'est l'écrire avec cette unité : $1$ m s'exprime aussi $100$ cm."
				},
				{
					grade: '5',
					content:
						"Exprimer une grandeur en fonction d'une autre, c'est l'écrire avec une expression littérale : le périmètre d'un rectangle de largeur $L$ et de longueur $2L$ s'exprime par $6L$. À la différence de « calculer », le résultat contient une lettre."
				}
			]
		},
		grade: 'CE1',
		forms: ['exprime', 'exprimez']
	},
	{
		term: 'déterminer',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content: "Trouver ce qui est demandé : déterminer la moitié de $14$, c'est trouver $7$."
				},
				{
					grade: '5',
					content:
						"Trouver ce qui est demandé (un nombre, une expression, un point…) en montrant comment on l'a obtenu : déterminer l'image de $3$ par une fonction, déterminer les solutions d'une équation."
				}
			]
		},
		grade: 'CP',
		forms: ['détermine', 'déterminez']
	},
	{
		term: 'justifier',
		tags: ['logique'],
		definitions: {
			items: [
				{
					grade: '5',
					content:
						"Donner les raisons qui montrent qu'une réponse est vraie : un calcul, une propriété, une mesure ou un contre-exemple."
				}
			]
		},
		grade: '5',
		forms: ['justifie', 'justifiez']
	},
	{
		term: 'vérifier',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"S'assurer qu'une réponse est juste : vérifier avec la règle que des points sont alignés, ou refaire un calcul autrement."
				},
				{
					grade: '5',
					content:
						"Vérifier qu'un nombre est solution d'une équation, c'est le remplacer dans l'équation et constater que l'égalité est vraie."
				}
			]
		},
		grade: 'CP',
		forms: ['vérifie', 'vérifiez']
	},
	{
		term: 'tracer',
		tags: ['géométrie'],
		definitions: {
			items: [
				{
					grade: 'CE2',
					content:
						"Dessiner une ligne ou une figure avec la règle, l'équerre ou le compas : tracer un segment de $5$ cm."
				}
			]
		},
		grade: 'CE2',
		forms: ['trace', 'tracez']
	},
	{
		term: 'estimer',
		tags: ['transversal', 'grandeurs'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						'Donner une valeur approchée sans calcul exact ni mesure précise : estimer la longueur de la classe, ou que $298 + 403$ fait environ $700$.'
				}
			]
		},
		grade: 'CE1',
		forms: ['estime', 'estimez']
	},
	{
		term: 'comparer',
		tags: ['entiers', 'transversal'],
		definitions: {
			items: [
				{
					grade: 'CP',
					content:
						"Dire lequel de deux nombres, de deux longueurs ou de deux collections est le plus grand, ou s'ils sont égaux ; on écrit $<$, $>$ ou $=$."
				}
			]
		},
		grade: 'CP',
		forms: ['compare', 'comparez']
	},
	{
		term: 'encadrer',
		tags: ['entiers', 'décimaux'],
		grade: 'CP',
		forms: ['encadre', 'encadrez'],
		derivedFrom: 'encadrement'
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
		autoLink: false,
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
