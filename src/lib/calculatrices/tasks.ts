/**
 * Guides calculatrices : les tâches, communes à tous les modèles.
 *
 * Liste vérifiée contre les programmes officiels (seeds de l'arbre des notions et
 * textes des BO) le 2026-10-12 : docs/wip/guides-calculatrices-taches.md. Chaque niveau
 * ne liste que ce qui est NOUVEAU chez lui ; les niveaux suivants le reprennent en
 * « Rappels ». Un identifiant ne change jamais : les séquences des modèles et la
 * relecture sur machine s'y réfèrent.
 */

import type { CalculatorTask } from './types';

export const TASKS = [
	// ===== 6e =====
	{
		id: 'clear-input',
		grade: '6',
		title: 'Effacer, corriger une saisie',
		status: 'pratique',
		boRefs: []
	},
	{
		id: 'basic-operations',
		grade: '6',
		title: 'Les quatre opérations et l’ordre des calculs',
		status: 'pratique',
		boRefs: []
	},
	{
		id: 'euclidean-division',
		grade: '6',
		title: 'Division euclidienne : quotient et reste',
		status: 'programme',
		boRefs: ['6-123', '6-124']
	},
	{
		id: 'fraction-to-decimal',
		grade: '6',
		title: 'Passer d’une fraction à son écriture décimale',
		status: 'programme',
		boRefs: ['6-125', '6-130']
	},
	{
		id: 'last-answer',
		grade: '6',
		title: 'Réutiliser le dernier résultat',
		status: 'pratique',
		boRefs: []
	},
	{
		id: 'percentage',
		grade: '6',
		title: 'Calculer et appliquer un pourcentage',
		status: 'programme',
		boRefs: ['6-140', '6-141']
	},
	{
		id: 'round-display',
		grade: '6',
		title: 'Arrondir un résultat (unité, dixième, centième)',
		status: 'programme',
		boRefs: ['6-111', '6-112']
	},

	// ===== 5e =====
	{
		id: 'negative-number',
		grade: '5',
		title: 'Saisir un nombre négatif : l’opposé n’est pas la soustraction',
		status: 'programme',
		boRefs: ['5-013', '5-018', '5-020', '5-023']
	},
	{
		id: 'parentheses-priorities',
		grade: '5',
		title: 'Enchaîner des calculs : priorités et parenthèses',
		status: 'programme',
		boRefs: ['5-004', '5-005', '5-007', '5-021']
	},
	{
		id: 'fraction-input',
		grade: '5',
		title: 'Écrire une fraction et calculer avec',
		status: 'verifier',
		boRefs: ['5-025', '5-026']
	},
	{
		id: 'square-cube',
		grade: '5',
		title: 'Carré, cube et puissances',
		status: 'programme',
		boRefs: ['5-028', '5-032', '5-033']
	},
	{
		id: 'pi',
		grade: '5',
		title: 'Utiliser π (aire du disque, volume du cylindre)',
		status: 'programme',
		boRefs: ['5-052', '5-053']
	},
	{
		id: 'table-of-values',
		grade: '5',
		title: 'Tableau de valeurs d’une formule',
		status: 'programme',
		boRefs: ['5-093', '5-097']
	},
	{
		id: 'mean',
		grade: '5',
		title: 'Moyenne et fréquences d’une série',
		status: 'verifier',
		boRefs: ['5-076', '5-080']
	},
	{
		id: 'percentage-evolution-5',
		grade: '5',
		title: 'Calculer, appliquer un pourcentage dans un problème',
		status: 'programme',
		boRefs: ['5-086']
	},
	{
		id: 'block-programming',
		grade: '5',
		title: 'Programmer par blocs sur la calculatrice',
		status: 'pratique',
		boRefs: ['5-102', '5-103', '5-106'],
		optional: true
	},

	// ===== 4e =====
	{
		id: 'relative-products',
		grade: '4',
		title: 'Multiplier, diviser des nombres relatifs',
		status: 'programme',
		boRefs: ['4-001', '4-002', '4-003']
	},
	{
		id: 'fraction-simplify',
		grade: '4',
		title: 'Simplifier une fraction, calculer l’inverse',
		status: 'verifier',
		boRefs: ['4-005', '4-008', '4-012', '4-013']
	},
	{
		id: 'square-root',
		grade: '4',
		title: 'Racine carrée (Pythagore)',
		status: 'programme',
		boRefs: ['4-019', '4-020', '4-034']
	},
	{
		id: 'multiplier-coefficient',
		grade: '4',
		title: 'Coefficient multiplicateur : augmenter ou diminuer de t %',
		status: 'programme',
		boRefs: ['4-056', '4-057']
	},
	{
		id: 'median-range',
		grade: '4',
		title: 'Moyenne pondérée, médiane, étendue',
		status: 'verifier',
		boRefs: ['4-039', '4-040', '4-041', '4-045']
	},
	{
		id: 'random-simulation',
		grade: '4',
		title: 'Nombre aléatoire et simulation',
		status: 'programme',
		boRefs: ['4-050', '4-051']
	},
	{
		id: 'equation-by-table',
		grade: '4',
		title: 'Approcher la solution d’une équation avec un tableau de valeurs',
		status: 'verifier',
		boRefs: ['4-026']
	},

	// ===== 3e =====
	{
		id: 'negative-exponents',
		grade: '3',
		title: 'Puissances d’exposant négatif',
		status: 'programme',
		boRefs: ['3-004', '3-052']
	},
	{
		id: 'scientific-notation',
		grade: '3',
		title: 'Notation scientifique : saisir et lire',
		status: 'programme',
		boRefs: ['3-006', '3-007']
	},
	{
		id: 'prime-factorization',
		grade: '3',
		title: 'Décomposer en facteurs premiers',
		status: 'verifier',
		boRefs: ['3-010']
	},
	{
		id: 'trigonometry-degrees',
		grade: '3',
		title: 'Trigonométrie en degrés : cos, sin, tan et l’angle',
		status: 'programme',
		boRefs: ['3-023']
	},
	{
		id: 'linear-function-image',
		grade: '3',
		title: 'Image par une fonction linéaire ou affine',
		status: 'programme',
		boRefs: ['3-039', '3-040', '3-044']
	},
	{
		id: 'quartiles-college',
		grade: '3',
		title: 'Médiane et quartiles d’un tableau d’effectifs',
		status: 'verifier',
		boRefs: ['3-028', '3-029', '3-056']
	},
	{
		id: 'percentage-evolution-3',
		grade: '3',
		title: 'Évolution en pourcentage',
		status: 'programme',
		boRefs: ['3-036']
	},

	// ===== 2de =====
	{
		id: 'exam-mode',
		grade: '2',
		title: 'Mode examen : l’activer, le quitter, ce qu’il bloque',
		status: 'pratique',
		boRefs: []
	},
	{
		id: 'settings',
		grade: '2',
		title: 'Réglages : degrés ou radians, nombre de chiffres',
		status: 'programme',
		boRefs: ['2-254']
	},
	{
		id: 'define-function',
		grade: '2',
		title: 'Définir une fonction et faire son tableau de valeurs',
		status: 'programme',
		boRefs: ['2-351']
	},
	{
		id: 'plot-function',
		grade: '2',
		title: 'Tracer une courbe, régler la fenêtre, zoomer',
		status: 'programme',
		boRefs: ['2-351']
	},
	{
		id: 'graph-analysis',
		grade: '2',
		title: 'Sur la courbe : image, zéro, intersection, maximum, minimum',
		status: 'programme',
		boRefs: ['2-336', '2-338', '2-350', '2-351']
	},
	{
		id: 'one-variable-stats',
		grade: '2',
		title: 'Statistiques : moyenne, écart type, médiane, quartiles',
		status: 'programme',
		boRefs: ['2-370', '2-382']
	},
	{
		id: 'evolution-rates',
		grade: '2',
		title: 'Évolutions successives, évolution réciproque',
		status: 'programme',
		boRefs: ['2-375', '2-376', '2-377', '2-378', '2-379']
	},
	{
		id: 'python-basics',
		grade: '2',
		title: 'Python : écrire, exécuter un script, appeler une fonction',
		status: 'programme',
		boRefs: ['2-226', '2-227', '2-229', '2-231', '2-234', '2-392']
	},

	// ===== 1re enseignement scientifique =====
	{
		id: 'real-power',
		grade: '1_GEN',
		title: 'aˣ pour x réel, racine n-ième',
		status: 'programme',
		boRefs: ['1GEN-032', '1GEN-036']
	},
	{
		id: 'average-rate',
		grade: '1_GEN',
		title: 'Taux d’évolution moyen',
		status: 'programme',
		boRefs: ['1GEN-037', '1GEN-040']
	},
	{
		id: 'sequence-terms-gen',
		grade: '1_GEN',
		title: 'Termes d’une suite, problème de seuil',
		status: 'programme',
		boRefs: ['1GEN-018', '1GEN-021', '1GEN-039', '1GEN-044']
	},
	{
		id: 'regression-gen',
		grade: '1_GEN',
		title: 'Point moyen, ajustement affine',
		status: 'pratique',
		boRefs: ['1GEN-007', '1GEN-008']
	},

	// ===== 1re spécialité =====
	{
		id: 'sequences',
		grade: '1_SPE',
		title: 'Suites : les définir, tableau des termes, nuage de points',
		status: 'programme',
		boRefs: ['1SPE-221', '1SPE-223']
	},
	{
		id: 'sequence-limit',
		grade: '1_SPE',
		title: 'Conjecturer la limite d’une suite',
		status: 'programme',
		boRefs: ['1SPE-220', '1SPE-231']
	},
	{
		id: 'threshold-python',
		grade: '1_SPE',
		title: 'Chercher un seuil avec Python',
		status: 'programme',
		boRefs: ['1SPE-237']
	},
	{
		id: 'derivative-tangent',
		grade: '1_SPE',
		title: 'Nombre dérivé et tangente',
		status: 'verifier',
		boRefs: ['1SPE-270', '1SPE-272']
	},
	{
		id: 'quadratic-roots',
		grade: '1_SPE',
		title: 'Racines d’un trinôme',
		status: 'verifier',
		boRefs: ['1SPE-248', '1SPE-255']
	},
	{
		id: 'random-variable',
		grade: '1_SPE',
		title: 'Espérance et écart type d’une variable aléatoire',
		status: 'programme',
		boRefs: ['1SPE-356', '1SPE-357']
	},
	{
		id: 'exponential',
		grade: '1_SPE',
		title: 'Fonction exponentielle',
		status: 'programme',
		boRefs: ['1SPE-291']
	},
	{
		id: 'radians',
		grade: '1_SPE',
		title: 'Trigonométrie en radians',
		status: 'programme',
		boRefs: ['1SPE-303']
	},
	{
		id: 'python-lists',
		grade: '1_SPE',
		title: 'Python : les listes',
		status: 'programme',
		boRefs: ['1SPE-206', '1SPE-207', '1SPE-208', '1SPE-209', '1SPE-210']
	},
	{
		id: 'loan-annuity',
		grade: '1_SPE',
		title: 'Intérêts composés, annuités d’emprunt',
		status: 'pratique',
		boRefs: ['1SPE-242'],
		optional: true
	},

	// ===== 1re technologique =====
	{
		id: 'sequence-terms-techno',
		grade: '1_TECHNO',
		title: 'Termes d’une suite, nuage de points, seuil',
		status: 'programme',
		boRefs: ['1TECHNO-043', '1TECHNO-044', '1TECHNO-050', '1TECHNO-051', '1TECHNO-052']
	},
	{
		id: 'scan-solution',
		grade: '1_TECHNO',
		title: 'Approcher une solution par balayage',
		status: 'programme',
		boRefs: ['1TECHNO-067']
	},
	{
		id: 'derivative-techno',
		grade: '1_TECHNO',
		title: 'Nombre dérivé, tangente, extremums',
		status: 'verifier',
		boRefs: ['1TECHNO-055', '1TECHNO-070', '1TECHNO-079', '1TECHNO-081']
	},
	{
		id: 'regression-techno',
		grade: '1_TECHNO',
		title: 'Point moyen, ajustement affine, interpoler',
		status: 'programme',
		boRefs: ['1TECHNO-086', '1TECHNO-087', '1TECHNO-088']
	},
	{
		id: 'expectation-techno',
		grade: '1_TECHNO',
		title: 'Espérance d’une variable aléatoire',
		status: 'programme',
		boRefs: ['1TECHNO-099']
	},
	{
		id: 'bernoulli-simulation',
		grade: '1_TECHNO',
		title: 'Simuler une loi de Bernoulli',
		status: 'pratique',
		boRefs: ['1TECHNO-003', '1TECHNO-103']
	},

	// ===== Tle spécialité =====
	{
		id: 'natural-log',
		grade: 'T_SPE',
		title: 'Logarithme népérien',
		status: 'programme',
		boRefs: ['TSPE-438']
	},
	{
		id: 'factorial-combinations',
		grade: 'T_SPE',
		title: 'Factorielle, k parmi n',
		status: 'programme',
		boRefs: ['TSPE-310', 'TSPE-313']
	},
	{
		id: 'binomial',
		grade: 'T_SPE',
		title: 'Loi binomiale : P(X = k), P(X ≤ k), P(a ≤ X ≤ b)',
		status: 'programme',
		boRefs: ['TSPE-510']
	},
	{
		id: 'binomial-inverse',
		grade: 'T_SPE',
		title: 'Le plus petit k tel que P(X ≤ k) dépasse un seuil',
		status: 'programme',
		boRefs: ['TSPE-511', 'TSPE-514']
	},
	{
		id: 'threshold-tspe',
		grade: 'T_SPE',
		title: 'Recherche de seuil',
		status: 'programme',
		boRefs: ['TSPE-392']
	},
	{
		id: 'sequence-limit-tspe',
		grade: 'T_SPE',
		title: 'Conjecturer une limite avec un tableau de valeurs',
		status: 'verifier',
		boRefs: ['TSPE-393', 'TSPE-452']
	},
	{
		id: 'integral',
		grade: 'T_SPE',
		title: 'Valeur approchée d’une intégrale',
		status: 'verifier',
		boRefs: ['TSPE-485']
	},

	// ===== Maths expertes =====
	{
		id: 'complex-numbers',
		grade: 'T_EXP',
		title: 'Nombres complexes : forme algébrique, module, argument',
		status: 'verifier',
		boRefs: ['TEXP-204', 'TEXP-206', 'TEXP-220', 'TEXP-221', 'TEXP-237', 'TEXP-238']
	},
	{
		id: 'complex-roots',
		grade: 'T_EXP',
		title: 'Racines complexes d’un trinôme',
		status: 'verifier',
		boRefs: ['TEXP-247']
	},
	{
		id: 'arithmetic',
		grade: 'T_EXP',
		title: 'Quotient, reste, PGCD, facteurs premiers',
		status: 'verifier',
		boRefs: ['TEXP-272', 'TEXP-285', 'TEXP-299']
	},
	{
		id: 'modular',
		grade: 'T_EXP',
		title: 'Calculer modulo n',
		status: 'pratique',
		boRefs: ['TEXP-286', 'TEXP-287', 'TEXP-305']
	},
	{
		id: 'matrices',
		grade: 'T_EXP',
		title: 'Matrices : saisir, produit, inverse, puissance',
		status: 'programme',
		boRefs: ['TEXP-319', 'TEXP-338', 'TEXP-339', 'TEXP-340']
	},
	{
		id: 'markov',
		grade: 'T_EXP',
		title: 'Graphes et chaînes de Markov : Aⁿ, π₀Pⁿ',
		status: 'programme',
		boRefs: ['TEXP-333', 'TEXP-342', 'TEXP-343']
	},

	// ===== Maths complémentaires =====
	{
		id: 'recurrent-sequence-comp',
		grade: 'T_COMP',
		title: 'Conjecturer le comportement d’une suite uₙ₊₁ = f(uₙ)',
		status: 'programme',
		boRefs: ['TCOMP-211', 'TCOMP-212', 'TCOMP-217']
	},
	{
		id: 'log-exp-comp',
		grade: 'T_COMP',
		title: 'Logarithme népérien et exponentielle',
		status: 'programme',
		boRefs: ['TCOMP-224', 'TCOMP-236', 'TCOMP-237', 'TCOMP-238']
	},
	{
		id: 'solve-approx-comp',
		grade: 'T_COMP',
		title: 'Encadrer la solution de f(x) = k',
		status: 'programme',
		boRefs: ['TCOMP-235', 'TCOMP-243']
	},
	{
		id: 'binomial-comp',
		grade: 'T_COMP',
		title: 'Loi binomiale à la calculatrice',
		status: 'programme',
		boRefs: ['TCOMP-297', 'TCOMP-299']
	},
	{
		id: 'geometric-law',
		grade: 'T_COMP',
		title: 'Loi géométrique',
		status: 'programme',
		boRefs: ['TCOMP-298']
	},
	{
		id: 'exponential-law',
		grade: 'T_COMP',
		title: 'Loi exponentielle',
		status: 'programme',
		boRefs: ['TCOMP-312', 'TCOMP-315']
	},
	{
		id: 'regression-comp',
		grade: 'T_COMP',
		title: 'Droite de régression, coefficient de corrélation',
		status: 'programme',
		boRefs: ['TCOMP-322', 'TCOMP-326', 'TCOMP-327']
	},
	{
		id: 'variable-change-comp',
		grade: 'T_COMP',
		title: 'Ajustement par changement de variable',
		status: 'programme',
		boRefs: ['TCOMP-323', 'TCOMP-328']
	},
	{
		id: 'integral-comp',
		grade: 'T_COMP',
		title: 'Intégrale et valeur moyenne',
		status: 'verifier',
		boRefs: ['TCOMP-276', 'TCOMP-277']
	},

	// ===== Tle technologique =====
	{
		id: 'index-base-100',
		grade: 'T_TECHNO',
		title: 'Indice base 100, taux d’évolution',
		status: 'programme',
		boRefs: ['TTECHNO-015']
	},
	{
		id: 'real-power-techno',
		grade: 'T_TECHNO',
		title: 'aˣ pour x réel, taux d’évolution moyen',
		status: 'programme',
		boRefs: ['TTECHNO-031', 'TTECHNO-035', 'TTECHNO-038']
	},
	{
		id: 'decimal-log',
		grade: 'T_TECHNO',
		title: 'Logarithme décimal, résoudre aˣ = b',
		status: 'programme',
		boRefs: ['TTECHNO-040', 'TTECHNO-043']
	},
	{
		id: 'variable-change-techno',
		grade: 'T_TECHNO',
		title: 'Changement de variable puis ajustement',
		status: 'programme',
		boRefs: ['TTECHNO-052']
	},
	{
		id: 'binomial-techno',
		grade: 'T_TECHNO',
		title: 'Coefficients binomiaux, loi binomiale',
		status: 'verifier',
		boRefs: ['TTECHNO-061', 'TTECHNO-064', 'TTECHNO-065', 'TTECHNO-068']
	}
] as const satisfies readonly CalculatorTask[];

export type TaskId = (typeof TASKS)[number]['id'];
