/**
 * Mathematical vocabulary organized by grade level (French educational system)
 *
 * Contains 270+ French mathematical terms organized into 7 difficulty levels
 * corresponding to French school grades (6ème through Tale).
 *
 * Vocabulary selection:
 * - 6ème/5ème: Basic arithmetic, fractions
 * - 4ème/3ème: Algebra, equations, functions, statistics
 * - 2nde/1ère/Tale: Advanced functions, calculus, derivatives, integrals
 */
import type { WordLists, Difficulty } from './types';

export const WORD_LISTS: WordLists = {
	'6ème': [
		'abscisse',
		'addition',
		'additionner',
		'adjacent',
		'aigu',
		'aire',
		'aligne',
		'aligner',
		'angle',
		'arete',
		'arithmetique',
		'arrondi',
		'arrondir',
		'axe',
		'base',
		'bissectrice',
		'calcul',
		'calculer',
		'calculatrice',
		'carre',
		'centimetre',
		'centre',
		'cercle',
		'chiffre',
		'codage',
		'coder',
		'compas',
		'compter',
		'consecutif',
		'construire',
		'construction',
		'conversion',
		'convertir',
		'cote',
		'croissant',
		'cube',
		'decametre',
		'decimal',
		'decimale',
		'decimetre',
		'decametre',
		'decomposer',
		'decomposition',
		'decroissant',
		'denominateur',
		'diagonale',
		'diametre',
		'distance',
		'diviseur',
		'divisible',
		'division',
		'diviser',
		'double',
		'droit',
		'droite',
		'duree',
		'echelle',
		'egal',
		'egalite',
		'entier',
		'equation',
		'equerre',
		'equidistant',
		'equilateral',
		'extremite',
		'euclide',
		'euclidienne',
		'face',
		'figure',
		'forme',
		'formule',
		'fraction',
		'fractionnaire',
		'geometrie',
		'grandeur',
		'gradue',
		'graduer',
		'hauteur',
		'hectometre',
		'hexagone',
		'impair',
		'inferieur',
		'infini',
		'intersection',
		'isocele',
		'kilometre',
		'largeur',
		'longueur',
		'losange',
		'mathematiques',
		'masse',
		'maths',
		'mediane',
		'mediatrice',
		'mesure',
		'mesurer',
		'metre',
		'milieu',
		'millimetre',
		'moitie',
		'moins',
		'moyenne',
		'multiple',
		'multiplication',
		'multiplier',
		'nombre',
		'numerateur',
		'obtus',
		'octogone',
		'operation',
		'ordre',
		'ordonner',
		'origine',
		'pair',
		'parallele',
		'particulier',
		'patron',
		'pave',
		'pentagone',
		'perimetre',
		'perpendiculaire',
		'perspective',
		'pi',
		'plus',
		'point',
		'polygone',
		'pourcentage',
		'premier',
		'probleme',
		'proportionnalite',
		'quadrilatere',
		'quadruple',
		'quart',
		'quelconque',
		'quotient',
		'rapport',
		'rapporteur',
		'ratio',
		'rayon',
		'rectangle',
		'representer',
		'regle',
		'schema',
		'secant',
		'secante',
		'segment',
		'sommet',
		'soustraction',
		'soustraire',
		'superieur',
		'symetrie',
		'symetrique',
		'tiers',
		'trapeze',
		'triangle',
		'triple',
		'unite',
		'vitesse',
		'volume',
		'pyramide',
		'signe',
		'solide',
		'somme',
		'sphere',
		'surface',
		'valeur'
	],
	'5ème': [
		// Adding relative numbers, fractions, basic algebra (7th grade)
		'bissectrice',
		'complementaire',
		'cone',
		'coordonnee',
		'courbe',
		'cylindre',
		'difference',
		'equivalence',
		'espace',
		'intervalle',
		'inverse',
		'isocele',
		'kilometre',
		'losange',
		'mediane',
		'mediatrice',
		'millimetre',
		'numerateur',
		'numeration',
		'obtus',
		'octogone',
		'ordre',
		'ordonner',
		'oppose',
		'ordonnee',
		'origine',
		'orthogonal',
		'parallele',
		'parallelogramme',
		'particulier',
		'pave',
		'pentagone',
		'perpendiculaire',
		'polygone',
		'prisme',
		'proportion',
		'proportionnalite',
		'propriete',
		'pythagore',
		'quadrilatere',
		'quadruple',
		'quelconque',
		'rapport',
		'rapporteur',
		'ratio',
		'rationnel',
		'reciproque',
		'reduire',
		'relatif',
		'repere',
		'schema',
		'secant',
		'secante',
		'secteur',
		'simplification',
		'simplifier',
		'superieur',
		'symetrie',
		'symetrique',
		'trapeze',
		'trigonometrie',
		'vecteur'
	],
	'4ème': [
		'hypothenuse',
		// Introducing algebra, equations, Thales (8th grade)
		'algebre',
		'algebrique',
		'antecedent',
		'arete',
		'arithmetique',
		'barycentre',
		'coefficient',
		'combinaison',
		'concave',
		'conjecture',
		'conjecturer',
		'continu',
		'continuite',
		'convention',
		'convexe',
		'cosinus',
		'decomposer',
		'decomposition',
		'deduire',
		'demonstration',
		'demontrer',
		'developpement',
		'developper',
		'diagonale',
		'ensemble',
		'equation',
		'evenement',
		'formule',
		'fonction',
		'hypothenuse',
		'hypothese',
		'image',
		'implication',
		'inconnue',
		'inegalite',
		'inequation',
		'infini',
		'intersection',
		'irrationnel',
		'litteral',
		'mathematiques',
		'norme',
		'parabole',
		'permutation',
		'polynome',
		'probabilite',
		'puissance',
		'racine',
		'radian',
		'raisonnement',
		'resoudre',
		'rotation',
		'serie',
		'shisma',
		'sinus',
		'solution',
		'statistique',
		'statistiques',
		'suite',
		'synthese',
		'tangeant',
		'tangente',
		'terme',
		'thales',
		'theoreme',
		'translation'
	],
	'3ème': [
		// Advanced algebra, trigonometry, Pythagoras (9th grade - end of middle school)
		'convergente',
		'derivee',
		'deriver',
		'divergente',
		'ellipse',
		'euclide',
		'euclidienne',
		'exponentielle',
		'factorisation',
		'factoriser',
		'homothetie',
		'hyperbole',
		'integrale',
		'integrer',
		'limite',
		'logarithme',
		'primitive'
	],
	'2nde': [
		// High school start: functions, sequences, statistics (10th grade)
		'convergente',
		'divergente',
		'exponentielle',
		'fonction',
		'logarithme',
		'parabole',
		'polynome',
		'probabilite',
		'serie',
		'statistique',
		'suite'
	],
	'1ère': [
		// Derivatives, limits, trigonometry (11th grade)
		'derivee',
		'deriver',
		'exponentielle',
		'limite',
		'logarithme',
		'primitive',
		'sinus',
		'cosinus',
		'tangente'
	],
	Tale: [
		// Final year: integrals, advanced calculus (12th grade)
		'convergente',
		'derivee',
		'divergente',
		'exponentielle',
		'integrale',
		'integrer',
		'limite',
		'logarithme',
		'primitive',
		'serie'
	]
};

export const words = [
	'algebre',
	'algebrique',
	'antecedent',

	'barycentre',
	'coefficient',
	'combinaison',

	'complementaire',

	'concave',
	'cone',
	'conjecture',
	'conjecturer',

	'continu',
	'continuite',
	'convention',
	'convergente',

	'convexe',
	'coordonnee',
	'cosinus',

	'courbe',

	'cylindre',

	'deduire',
	'demonstration',
	'demontrer',

	'deriver',
	'derivee',
	'developpement',
	'developper',
	'difference',

	'divergente',

	'ellipse',
	'ensemble',

	'equivalence',
	'espace',
	'evenement',
	'exponentielle',

	'facteur',
	'factorisation',
	'factoriser',

	'fonction',

	'homothetie',
	'hyperbole',

	'hypothese',
	'image',

	'implication',
	'inconnue',
	'inegalite',
	'inequation',

	'integrer',
	'integrale',

	'intervalle',
	'inverse',
	'irrationnel',

	'limite',
	'litteral',
	'logarithme',

	'negatif',

	'norme',

	'numeration',

	'oppose',
	'ordonnee',

	'orthogonal',

	'parabole',

	'parallelogramme',

	'permutation',

	'plan',
	'plus',

	'polynome',
	'positif',

	'primitive',
	'prisme',
	'probabilite',
	'produit',

	'propriete',
	'puissance',
	'pyramide',
	'pythagore',

	'racine',
	'radian',
	'raisonnement',

	'rationnel',

	'reciproque',
	'reduire',

	'relatif',
	'repere',
	'resoudre',
	'rotation',

	'secteur',
	'serie',

	'shisma',
	'signe',
	'simplification',
	'simplifier',
	'sinus',
	'solide',
	'solution',
	'somme',

	'sphere',
	'spherique',
	'statistique',
	'statistiques',
	'suite',

	'synthese',
	'tangeant',
	'tangente',
	'terme',
	'thales',
	'theoreme',

	'translation',

	'trigonometrie',

	'valeur',
	'vecteur'
];

/**
 * Pre-computed set of all words across all difficulty levels
 * Used for fast O(1) validation during gameplay
 */
const allWordsSet = new Set<string>();
Object.values(WORD_LISTS).forEach((words) => {
	words.forEach((word: string) => allWordsSet.add(word));
});

/**
 * Get all allowed words for a specific difficulty level
 * @param difficulty - The grade level to get words for
 * @returns Set of valid words for that difficulty
 */
export function getAllowedWords(difficulty: Difficulty): Set<string> {
	return new Set(WORD_LISTS[difficulty]);
}

/**
 * Check if a word is valid across ALL difficulty levels
 * Used for permissive validation - players can submit words from any level
 * @param word - The word to validate (should be normalized first)
 * @returns true if word exists in any difficulty level
 */
export function isValidWord(word: string): boolean {
	return allWordsSet.has(word);
}

/**
 * Get a random word from a specific difficulty level
 * Called when starting a new game
 * @param difficulty - The grade level to select from
 * @returns A random mathematical term appropriate for that level
 */
export function getRandomWord(difficulty: Difficulty): string {
	const words = WORD_LISTS[difficulty];
	return words[Math.floor(Math.random() * words.length)];
}

/**
 * Normalize string by removing accents and converting to lowercase
 * Uses NFD (Canonical Decomposition) to separate base characters from diacritics
 *
 * Examples:
 * - "algèbre" → "algebre"
 * - "Équation" → "equation"
 * - "périmètre" → "perimetre"
 *
 * This allows players to type without accents, improving accessibility
 * @param str - The string to normalize
 * @returns Normalized string without accents, lowercased
 */
export function normalizeString(str: string): string {
	return str
		.normalize('NFD') // Decompose accented characters (è → e + ̀)
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritic marks
		.toLowerCase();
}
