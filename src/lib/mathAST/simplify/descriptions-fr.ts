/**
 * French Descriptions for Simplify Steps
 *
 * @module mathAST/simplify/descriptions-fr
 */

/**
 * French descriptions for simplification phases.
 */
export const PHASE_DESCRIPTIONS: Readonly<Record<string, string>> = {
	rules: 'Application des regles de simplification',
	normalize: 'Normalisation polynomiale',
	'post-normalize': 'Re-normalisation post-regles'
};

/**
 * Get a French description for a simplification rule.
 */
export function getSimplifyRuleDescription(rule: string): string {
	const descriptions: Readonly<Record<string, string>> = {
		// Abs rules
		'abs-negation': 'Simplification de |-x| en |x|',
		'abs-idempotent': 'Simplification de ||x|| en |x|',
		'abs-product': 'Distribution de la valeur absolue sur le produit',
		'abs-quotient': 'Distribution de la valeur absolue sur le quotient',
		'abs-positive': 'Simplification de |x| en x (x positif)',
		'abs-negative': 'Simplification de |x| en -x (x negatif)',
		// Pipeline phases
		'pattern-rules': 'Regles de simplification par pattern matching',
		normalize: 'Mise en forme canonique'
	};

	return descriptions[rule] ?? `Regle : ${rule}`;
}
