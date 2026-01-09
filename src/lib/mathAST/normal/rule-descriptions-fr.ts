/**
 * Rule Descriptions (French)
 *
 * Human-readable descriptions for each simplification/normalization rule.
 * Used for pedagogical display in the step recorder.
 *
 * @module mathAST/normal/rule-descriptions-fr
 */

/**
 * French descriptions for each simplification rule.
 * Keys are rule identifiers, values are human-readable descriptions.
 */
export const RULE_DESCRIPTIONS: Readonly<Record<string, string>> = {
	// ==========================================================================
	// Arithmetic
	// ==========================================================================
	'additive-identity-left': "L'addition de 0 est l'élément neutre (0 + a = a)",
	'additive-identity-right': "L'addition de 0 est l'élément neutre (a + 0 = a)",
	'multiplicative-identity-left': 'La multiplication par 1 est neutre (1 × a = a)',
	'multiplicative-identity-right': 'La multiplication par 1 est neutre (a × 1 = a)',
	'multiplicative-zero-left': 'Tout nombre multiplié par 0 donne 0 (0 × a = 0)',
	'multiplicative-zero-right': 'Tout nombre multiplié par 0 donne 0 (a × 0 = 0)',
	'division-by-one': 'Division par 1 est neutre (a ÷ 1 = a)',
	'division-same': "Division d'un nombre par lui-même donne 1 (a ÷ a = 1)",
	'double-negative': 'Double négation (--a = a)',
	'constant-addition': 'Addition de constantes',
	'constant-subtraction': 'Soustraction de constantes',
	'constant-multiplication': 'Multiplication de constantes',
	'constant-division': 'Division de constantes',

	// ==========================================================================
	// Powers
	// ==========================================================================
	'power-zero': 'Tout nombre à la puissance 0 vaut 1 (a⁰ = 1)',
	'power-one': 'Un nombre à la puissance 1 reste inchangé (a¹ = a)',
	'zero-power': "0 élevé à n'importe quelle puissance positive vaut 0",
	'one-power': "1 élevé à n'importe quelle puissance vaut 1",
	'power-of-power': 'Puissance de puissance: (aᵐ)ⁿ = aᵐⁿ',
	'product-power': "Puissance d'un produit: (ab)ⁿ = aⁿbⁿ",
	'quotient-power': "Puissance d'un quotient: (a/b)ⁿ = aⁿ/bⁿ",
	'negative-exponent': 'Exposant négatif: a⁻ⁿ = 1/aⁿ',
	'constant-power': "Calcul d'une puissance de constantes",

	// ==========================================================================
	// Radicals
	// ==========================================================================
	'sqrt-perfect-square': 'Racine carrée parfaite: √n² = n',
	'sqrt-simplify': 'Simplification de racine: √(ab²) = b√a',
	'cbrt-perfect-cube': 'Racine cubique parfaite: ∛n³ = n',
	'radical-simplify': 'Simplification de radical',
	'radical-of-radical': 'Radical de radical: √(√a) = a^(1/4)',
	'sqrt-one': '√1 = 1',
	'sqrt-zero': '√0 = 0',
	'sqrt-of-square': 'Racine carrée de carré: √(a²) = a',
	'sqrt-of-even-power': 'Racine carrée de puissance paire: √(a²ⁿ) = aⁿ',
	'sqrt-to-half-power': 'Conversion en exposant fractionnaire: √a = a^(1/2)',
	'sqrt-extract-perfect-square': 'Extraction des carrés parfaits: √(4x²y) = 2x√y',
	'sqrt-perfect-square-trinomial': 'Trinôme carré parfait: √(a² ± 2ab + b²) = a ± b',

	// ==========================================================================
	// Transcendental Functions
	// ==========================================================================
	'ln-one': 'ln(1) = 0',
	'ln-e': 'ln(e) = 1',
	'exp-zero': 'e⁰ = 1',
	'exp-one': 'e¹ = e',
	'exp-ln': 'exp(ln(x)) = x',
	'ln-exp': 'ln(exp(x)) = x',
	'sin-zero': 'sin(0) = 0',
	'cos-zero': 'cos(0) = 1',
	'tan-zero': 'tan(0) = 0',
	'sin-pi': 'sin(π) = 0',
	'cos-pi': 'cos(π) = -1',

	// ==========================================================================
	// Phase 2 - Normalization
	// ==========================================================================
	'pre-simplify': 'Pré-simplification (Phase 1)',
	'combine-like-terms': 'Combinaison des termes semblables',
	'simplify-fraction': 'Simplification de la fraction',
	'expand-power': 'Développement de la puissance',
	'trig-known-value': 'Valeur trigonométrique remarquable',
	'exp-ln-inverse': 'exp(ln(x)) = x',
	'ln-exp-inverse': 'ln(exp(x)) = x',
	'log-simplify': 'Simplification du logarithme',
	'rationalize-denominator': 'Rationalisation du dénominateur: 1/√x = √x/x',
	'rationalize-conjugate': 'Rationalisation par conjugué: 1/(a+√b) = (a-√b)/(a²-b)',

	// ==========================================================================
	// General Categories
	// ==========================================================================
	simplification: 'Simplification',
	arithmetic: 'Simplification arithmétique',
	powers: 'Simplification des puissances',
	radicals: 'Simplification des radicaux',
	transcendental: 'Simplification des fonctions transcendantes'
};

/**
 * Gets the description for a rule, with fallback.
 *
 * @param rule - The rule identifier
 * @returns French description or fallback string
 *
 * @example
 * getRuleDescription('power-zero')
 * // Returns: "Tout nombre à la puissance 0 vaut 1 (a⁰ = 1)"
 *
 * getRuleDescription('unknown-rule')
 * // Returns: "Règle: unknown-rule"
 */
export function getRuleDescription(rule: string): string {
	return RULE_DESCRIPTIONS[rule] ?? `Règle: ${rule}`;
}
