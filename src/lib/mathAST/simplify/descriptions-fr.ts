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
	identity: 'Application des identites',
	'post-normalize': 'Normalisation post-identites'
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
		// Infinity transforms
		'arctan-pos-inf': 'Evaluation de arctan(+∞) = π/2',
		'arctan-neg-inf': 'Evaluation de arctan(-∞) = -π/2',
		'exp-pos-inf': 'Evaluation de exp(+∞) = +∞',
		'exp-neg-inf': 'Evaluation de exp(-∞) = 0',
		'ln-pos-inf': 'Evaluation de ln(+∞) = +∞',
		'tanh-pos-inf': 'Evaluation de tanh(+∞) = 1',
		'tanh-neg-inf': 'Evaluation de tanh(-∞) = -1',
		// Pipeline phases
		'pattern-rules': 'Regles de simplification par pattern matching',
		normalize: 'Mise en forme canonique',
		'trig-identities': 'Identites trigonometriques',
		'hyperbolic-identities': 'Identites hyperboliques',
		'algebraic-identities': 'Identites algebriques',
		'infinity-transforms': "Evaluation a l'infini"
	};

	return descriptions[rule] ?? `Regle : ${rule}`;
}
