/**
 * French Descriptions for Matrix Operation Steps
 *
 * Human-readable descriptions in French for each matrix operation step type.
 *
 * @module mathAST/matrix/descriptions-fr
 */

import type { MatrixRule } from './types';

// =============================================================================
// Rule Descriptions
// =============================================================================

/**
 * French descriptions for each matrix rule.
 */
const RULE_DESCRIPTIONS: Record<MatrixRule, string> = {
	// Determinant rules
	'identify-matrix-size': 'On identifie la taille de la matrice',
	'det-1x1': "Le determinant d'une matrice 1x1 est son unique element",
	'det-2x2-formula': 'On applique la formule du determinant 2x2: ad - bc',
	'det-cofactor-expansion': 'On developpe selon la premiere ligne (methode des cofacteurs)',
	'compute-minor': 'On calcule le mineur',
	'compute-cofactor': 'On calcule le cofacteur',
	'sum-cofactors': 'On somme les produits element x cofacteur',
	'det-result': 'Le determinant vaut',

	// Inverse rules
	'check-determinant': 'On verifie que le determinant est non nul',
	'inverse-2x2-formula': "On applique la formule de l'inverse 2x2: (1/det) x adj(A)",
	'augment-identity': 'On forme la matrice augmentee [A|I]',
	'row-swap': 'On echange deux lignes',
	'row-scale': 'On multiplie une ligne par un scalaire',
	'row-add': "On ajoute un multiple d'une ligne a une autre",
	'extract-inverse': 'On extrait la matrice inverse (partie droite)',
	'inverse-result': 'La matrice inverse est'
};

/**
 * Gets the description for a rule.
 */
export function getRuleDescription(rule: MatrixRule): string {
	return RULE_DESCRIPTIONS[rule];
}

// =============================================================================
// Parameterized Descriptions - Determinant
// =============================================================================

/**
 * Describe identifying matrix size.
 */
export function describeMatrixSize(rows: number, cols: number): string {
	return `La matrice est de taille ${rows}x${cols}`;
}

/**
 * Describe 2x2 determinant computation.
 */
export function describeDet2x2(a: string, b: string, c: string, d: string): string {
	return `det = ${a} x ${d} - ${b} x ${c}`;
}

/**
 * Describe cofactor expansion.
 */
export function describeCofactorExpansion(n: number): string {
	return `On developpe le determinant ${n}x${n} selon la premiere ligne`;
}

/**
 * Describe computing a minor.
 * @param i Row index (0-based, will display as 1-based)
 * @param j Column index (0-based, will display as 1-based)
 */
export function describeMinor(i: number, j: number): string {
	return `On calcule le mineur M_{${i + 1}${j + 1}} (matrice sans ligne ${i + 1} et colonne ${j + 1})`;
}

/**
 * Describe computing a cofactor with its sign.
 * @param i Row index (0-based)
 * @param j Column index (0-based)
 * @param minorValue String representation of the minor value
 */
export function describeCofactor(i: number, j: number, minorValue: string): string {
	const sign = (i + j) % 2 === 0 ? '+' : '-';
	return `Cofacteur C_{${i + 1}${j + 1}} = ${sign === '+' ? '' : '-'}${minorValue}`;
}

/**
 * Describe summing cofactors for determinant.
 */
export function describeSumCofactors(terms: string[]): string {
	return `det = ${terms.join(' + ')}`;
}

/**
 * Describe final determinant result.
 */
export function describeDetResult(value: string): string {
	return `det(A) = ${value}`;
}

// =============================================================================
// Parameterized Descriptions - Inverse
// =============================================================================

/**
 * Describe checking determinant for invertibility.
 */
export function describeCheckDet(detValue: string): string {
	return `det(A) = ${detValue} != 0, donc la matrice est inversible`;
}

/**
 * Describe 2x2 inverse formula.
 */
export function describeInverse2x2(detValue: string): string {
	return `A^{-1} = (1/${detValue}) x adj(A) ou adj(A) = [[d,-b],[-c,a]]`;
}

/**
 * Describe forming augmented matrix [A|I].
 */
export function describeAugmentedMatrix(n: number): string {
	return `On forme la matrice augmentee [A|I_{${n}}]`;
}

/**
 * Describe row swap operation.
 * @param i First row index (0-based)
 * @param j Second row index (0-based)
 */
export function describeRowSwap(i: number, j: number): string {
	return `L_{${i + 1}} <-> L_{${j + 1}}`;
}

/**
 * Describe row scaling operation.
 * @param i Row index (0-based)
 * @param factor Scale factor as string
 */
export function describeRowScale(i: number, factor: string): string {
	return `L_{${i + 1}} <- ${factor} x L_{${i + 1}}`;
}

/**
 * Describe row addition operation.
 * @param target Target row index (0-based)
 * @param source Source row index (0-based)
 * @param factor Multiplication factor as string
 */
export function describeRowAdd(target: number, source: number, factor: string): string {
	const sign = factor.startsWith('-') ? '' : '+ ';
	return `L_{${target + 1}} <- L_{${target + 1}} ${sign}${factor} x L_{${source + 1}}`;
}

/**
 * Describe extracting inverse from augmented matrix.
 */
export function describeExtractInverse(): string {
	return 'La partie droite de la matrice augmentee est A^{-1}';
}

/**
 * Describe final inverse result.
 */
export function describeInverseResult(): string {
	return 'La matrice inverse A^{-1} est';
}
