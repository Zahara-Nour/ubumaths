/**
 * French Descriptions for Numeric Types
 *
 * Provides human-readable descriptions in French for pedagogical feedback.
 */

import type { NumericType, MathType, TypeDescription, SignInfo } from './types';

// =============================================================================
// Type Descriptions Database
// =============================================================================

/**
 * Complete type descriptions for each numeric type.
 */
const TYPE_DESCRIPTIONS: Record<NumericType, TypeDescription> = {
	integer: {
		id: 'integer',
		nameFr: 'Entier',
		descriptionFr: 'Un nombre entier est un nombre sans partie décimale, positif, négatif ou nul.',
		examples: ['0', '1', '-5', '42', '100'],
		parents: ['rational', 'algebraic', 'real', 'complex'],
		children: []
	},
	rational: {
		id: 'rational',
		nameFr: 'Rationnel',
		descriptionFr:
			"Un nombre rationnel peut s'écrire comme une fraction de deux entiers (avec un dénominateur non nul).",
		examples: ['1/2', '3/4', '-2/3', '0.5', '0.333...'],
		parents: ['algebraic', 'real', 'complex'],
		children: ['integer']
	},
	irrational_algebraic: {
		id: 'irrational_algebraic',
		nameFr: 'Algébrique irrationnel',
		descriptionFr:
			"Un nombre algébrique irrationnel est solution d'une équation polynomiale à coefficients entiers, mais ne peut pas s'écrire comme fraction.",
		examples: ['√2', '√3', '∛5', '√2 + √3', '(1+√5)/2'],
		parents: ['algebraic', 'real', 'complex'],
		children: []
	},
	algebraic: {
		id: 'algebraic',
		nameFr: 'Algébrique',
		descriptionFr:
			"Un nombre algébrique est solution d'une équation polynomiale à coefficients entiers. Il peut être rationnel ou irrationnel.",
		examples: ['2', '1/2', '√2', '∛7', '√2 + 1'],
		parents: ['real', 'complex'],
		children: ['integer', 'rational', 'irrational_algebraic']
	},
	transcendental: {
		id: 'transcendental',
		nameFr: 'Transcendant',
		descriptionFr:
			"Un nombre transcendant n'est solution d'aucune équation polynomiale à coefficients entiers. Les constantes π et e sont transcendantes.",
		examples: ['π', 'e', 'sin(1)', 'ln(2)', 'e^π'],
		parents: ['real', 'complex'],
		children: []
	},
	real: {
		id: 'real',
		nameFr: 'Réel',
		descriptionFr:
			'Un nombre réel est un nombre qui peut être représenté sur la droite numérique. Il inclut les entiers, rationnels, et irrationnels.',
		examples: ['0', '1/2', '√2', 'π', '-3.14'],
		parents: ['complex'],
		children: ['integer', 'rational', 'irrational_algebraic', 'algebraic', 'transcendental']
	},
	complex: {
		id: 'complex',
		nameFr: 'Complexe',
		descriptionFr:
			"Un nombre complexe s'écrit sous la forme a + bi, où a et b sont réels et i² = -1.",
		examples: ['i', '2 + 3i', '√(-1)', '1 - i', 'e^(iπ)'],
		parents: [],
		children: ['integer', 'rational', 'irrational_algebraic', 'algebraic', 'transcendental', 'real']
	},
	unknown: {
		id: 'unknown',
		nameFr: 'Inconnu',
		descriptionFr: 'Le type de ce nombre ne peut pas être déterminé.',
		examples: [],
		parents: [],
		children: []
	}
};

// =============================================================================
// Simple Description
// =============================================================================

/**
 * Returns a simple French description of a numeric type.
 *
 * @param type - The MathType to describe
 * @returns A human-readable description in French
 *
 * @example
 * describeType({ base: 'integer' })           // "un nombre entier"
 * describeType({ base: 'integer', sign: 'positive' })  // "un nombre entier positif"
 * describeType({ base: 'rational' })          // "un nombre rationnel"
 * describeType({ base: 'transcendental' })    // "un nombre transcendant"
 */
export function describeType(type: MathType): string {
	const baseDescription = getBaseDescription(type.base);

	// Add sign information if available
	const signSuffix = getSignSuffix(type.sign);

	// Add finiteness information if relevant
	const finiteSuffix = type.finite === false ? ' (infini)' : '';

	return `${baseDescription}${signSuffix}${finiteSuffix}`;
}

/**
 * Gets the base description for a numeric type.
 */
function getBaseDescription(base: NumericType): string {
	switch (base) {
		case 'integer':
			return 'un nombre entier';
		case 'rational':
			return 'un nombre rationnel';
		case 'irrational_algebraic':
			return 'un nombre algébrique irrationnel';
		case 'algebraic':
			return 'un nombre algébrique';
		case 'transcendental':
			return 'un nombre transcendant';
		case 'real':
			return 'un nombre réel';
		case 'complex':
			return 'un nombre complexe';
		case 'unknown':
			return 'un nombre de type inconnu';
	}
}

/**
 * Gets a sign suffix for the description.
 */
function getSignSuffix(sign: SignInfo | undefined): string {
	switch (sign) {
		case 'positive':
			return ' positif';
		case 'negative':
			return ' négatif';
		case 'zero':
			return ' nul';
		case 'nonzero':
			return ' non nul';
		default:
			return '';
	}
}

// =============================================================================
// Detailed Description
// =============================================================================

/**
 * Returns a detailed TypeDescription for a numeric type.
 *
 * @param type - The MathType to describe
 * @returns A TypeDescription with full information
 *
 * @example
 * const desc = describeTypeDetailed({ base: 'integer' });
 * // {
 * //   id: 'integer',
 * //   nameFr: 'Entier',
 * //   descriptionFr: 'Un nombre entier est...',
 * //   examples: ['0', '1', '-5', '42'],
 * //   parents: ['rational', 'algebraic', 'real', 'complex'],
 * //   children: []
 * // }
 */
export function describeTypeDetailed(type: MathType): TypeDescription {
	return TYPE_DESCRIPTIONS[type.base];
}

// =============================================================================
// Type Name
// =============================================================================

/**
 * Returns the French name of a numeric type.
 *
 * @param type - The numeric type
 * @returns The French name (e.g., "Entier", "Rationnel")
 */
export function getTypeName(type: NumericType): string {
	return TYPE_DESCRIPTIONS[type].nameFr;
}

/**
 * Returns the French name with article.
 *
 * @param type - The numeric type
 * @returns The French name with article (e.g., "un entier", "un rationnel")
 */
export function getTypeNameWithArticle(type: NumericType): string {
	switch (type) {
		case 'integer':
			return 'un entier';
		case 'rational':
			return 'un rationnel';
		case 'irrational_algebraic':
			return 'un algébrique irrationnel';
		case 'algebraic':
			return 'un algébrique';
		case 'transcendental':
			return 'un transcendant';
		case 'real':
			return 'un réel';
		case 'complex':
			return 'un complexe';
		case 'unknown':
			return 'un type inconnu';
	}
}

// =============================================================================
// Comparison Descriptions
// =============================================================================

/**
 * Describes the relationship between two types.
 *
 * @param actual - The actual type of an expression
 * @param expected - The expected type
 * @returns A French description of the relationship
 *
 * @example
 * describeTypeRelation('integer', 'rational')
 * // "Un entier est un cas particulier de rationnel."
 *
 * describeTypeRelation('transcendental', 'integer')
 * // "Un transcendant n'est pas un entier."
 */
export function describeTypeRelation(actual: NumericType, expected: NumericType): string {
	if (actual === expected) {
		return `C'est bien ${getTypeNameWithArticle(expected)}.`;
	}

	const actualDesc = TYPE_DESCRIPTIONS[actual];
	const expectedDesc = TYPE_DESCRIPTIONS[expected];

	// Check if actual is a subtype of expected
	if (actualDesc.parents.includes(expected)) {
		return `Un ${actualDesc.nameFr.toLowerCase()} est un cas particulier de ${expectedDesc.nameFr.toLowerCase()}.`;
	}

	// Check if expected is a subtype of actual
	if (expectedDesc.parents.includes(actual)) {
		return `Un ${expectedDesc.nameFr.toLowerCase()} est un cas particulier de ${actualDesc.nameFr.toLowerCase()}, mais l'inverse n'est pas vrai.`;
	}

	// No subtype relationship
	return `Un ${actualDesc.nameFr.toLowerCase()} n'est pas ${getTypeNameWithArticle(expected)}.`;
}

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Generates a pedagogical error message when a type mismatch occurs.
 *
 * @param actual - The actual type of the expression
 * @param expected - The expected type
 * @returns A pedagogical error message in French
 *
 * @example
 * getTypeMismatchMessage({ base: 'transcendental' }, 'integer')
 * // "Attendu : un nombre entier. Obtenu : un nombre transcendant (π, e, sin(1)...)."
 */
export function getTypeMismatchMessage(actual: MathType, expected: NumericType): string {
	const actualDesc = describeType(actual);
	const expectedDesc = getBaseDescription(expected);
	const examples = TYPE_DESCRIPTIONS[actual.base].examples;

	let message = `Attendu : ${expectedDesc}. Obtenu : ${actualDesc}`;

	if (examples.length > 0) {
		const exampleList = examples.slice(0, 3).join(', ');
		message += ` (${exampleList}...)`;
	}

	message += '.';

	return message;
}

/**
 * Generates a hint about why a type constraint failed.
 *
 * @param actual - The actual type
 * @param expected - The expected type
 * @returns A hint message in French
 */
export function getTypeHint(actual: NumericType, expected: NumericType): string {
	// Specific hints for common cases
	if (expected === 'integer') {
		if (actual === 'rational') {
			return 'Astuce : une fraction comme 1/2 est rationnelle, pas entière.';
		}
		if (actual === 'irrational_algebraic') {
			return 'Astuce : √2 est irrationnel, donc pas entier.';
		}
		if (actual === 'transcendental') {
			return 'Astuce : π et e sont transcendants, pas entiers.';
		}
		if (actual === 'real') {
			return "Astuce : un nombre décimal comme 3.14 n'est pas entier.";
		}
	}

	if (expected === 'rational') {
		if (actual === 'irrational_algebraic') {
			return "Astuce : √2 ne peut pas s'écrire comme fraction.";
		}
		if (actual === 'transcendental') {
			return "Astuce : π ne peut pas s'écrire comme fraction.";
		}
	}

	if (expected === 'algebraic') {
		if (actual === 'transcendental') {
			return "Astuce : π et e ne sont solutions d'aucune équation polynomiale.";
		}
	}

	if (expected === 'real') {
		if (actual === 'complex') {
			return 'Astuce : √(-1) = i est un nombre complexe, pas réel.';
		}
	}

	return describeTypeRelation(actual, expected);
}

// =============================================================================
// Examples
// =============================================================================

/**
 * Gets example expressions for a numeric type.
 *
 * @param type - The numeric type
 * @returns Array of example expressions
 */
export function getTypeExamples(type: NumericType): readonly string[] {
	return TYPE_DESCRIPTIONS[type].examples;
}

/**
 * Gets a formatted string of examples for a type.
 *
 * @param type - The numeric type
 * @param maxExamples - Maximum number of examples to include
 * @returns Formatted example string
 */
export function formatTypeExamples(type: NumericType, maxExamples: number = 3): string {
	const examples = TYPE_DESCRIPTIONS[type].examples;
	if (examples.length === 0) return '';

	const selected = examples.slice(0, maxExamples);
	return `Exemples : ${selected.join(', ')}`;
}
