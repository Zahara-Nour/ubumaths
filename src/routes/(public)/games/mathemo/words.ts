/**
 * Mathematical vocabulary organized by grade level (French educational system)
 *
 * Contains 270+ French mathematical terms organized into 7 difficulty levels
 * corresponding to French school grades (6ème through Tale).
 *
 * Vocabulary selection:
 * - 6ème/5ème: Basic arithmetic, fractions, geometry
 * - 4ème/3ème: Algebra, equations, functions, statistics
 * - 2nde/1ère/Tale: Advanced functions, calculus, derivatives, integrals
 */
import type { WordLists, Difficulty } from './types';

export const WORD_LISTS: WordLists = {
	'6ème': [
		// Basic arithmetic and geometry (6th grade)
		'addition',
		'aire',
		'angle',
		'axe',
		'base',
		'calcul',
		'calculer',
		'carre',
		'centre',
		'cercle',
		'chiffre',
		'compas',
		'compter',
		'cote',
		'cube',
		'decimal',
		'decimale',
		'distance',
		'diviseur',
		'divisible',
		'division',
		'diviser',
		'double',
		'droit',
		'droite',
		'duree',
		'egal',
		'egalite',
		'entier',
		'equerre',
		'face',
		'figure',
		'forme',
		'hauteur',
		'largeur',
		'longueur',
		'masse',
		'maths',
		'mesure',
		'mesurer',
		'metre',
		'milieu',
		'moitie',
		'moins',
		'moyenne',
		'multiple',
		'multiplication',
		'multiplier',
		'nombre',
		'operation',
		'pair',
		'patron',
		'perimetre',
		'pi',
		'plan',
		'plus',
		'point',
		'positif',
		'negatif',
		'pourcentage',
		'premier',
		'probleme',
		'produit',
		'pyramide',
		'quart',
		'quotient',
		'rayon',
		'rectangle',
		'regle',
		'segment',
		'signe',
		'solide',
		'somme',
		'sommet',
		'soustraction',
		'soustraire',
		'sphere',
		'surface',
		'tiers',
		'triangle',
		'triple',
		'unite',
		'valeur',
		'vitesse',
		'volume'
	],
	'5ème': [
		// Adding relative numbers, fractions, basic algebra (7th grade)
		'abscisse',
		'adjacent',
		'aigu',
		'aligne',
		'aligner',
		'arrondi',
		'arrondir',
		'bissectrice',
		'calculatrice',
		'centimetre',
		'codage',
		'coder',
		'complementaire',
		'cone',
		'consecutif',
		'construire',
		'construction',
		'conversion',
		'convertir',
		'coordonnee',
		'courbe',
		'croissant',
		'cylindre',
		'decametre',
		'decimetre',
		'decroissant',
		'denominateur',
		'diametre',
		'difference',
		'echelle',
		'equidistant',
		'equilateral',
		'equivalence',
		'espace',
		'extremite',
		'facteur',
		'fraction',
		'fractionnaire',
		'geometrie',
		'grandeur',
		'gradue',
		'graduer',
		'hectometre',
		'hexagone',
		'impair',
		'inferieur',
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
		// Introducing algebra, equations, Thales (8th grade)
		'additionner',
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

/**
 * Pre-computed set of all words across all difficulty levels
 * Used for fast O(1) validation during gameplay
 */
const allWordsSet = new Set<string>();
Object.values(WORD_LISTS).forEach((words) => {
	words.forEach((word) => allWordsSet.add(word));
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
