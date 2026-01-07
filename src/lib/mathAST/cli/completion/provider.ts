/**
 * Completion Provider
 *
 * Provides auto-completion suggestions for math expressions.
 *
 * @module mathAST/cli/completion/provider
 */

import type { Completion, CompletionKind, CompletionContext, CompletionOptions } from './types';

// =============================================================================
// Built-in Completions Data
// =============================================================================

interface BuiltinCompletion {
	label: string;
	kind: CompletionKind;
	insertText: string;
	signature?: string;
	description: string;
}

/**
 * Built-in function completions.
 */
const BUILTIN_FUNCTIONS: readonly BuiltinCompletion[] = [
	// Trigonometric
	{
		label: 'sin',
		kind: 'function',
		insertText: 'sin(',
		signature: 'sin(x)',
		description: 'Sinus'
	},
	{
		label: 'cos',
		kind: 'function',
		insertText: 'cos(',
		signature: 'cos(x)',
		description: 'Cosinus'
	},
	{
		label: 'tan',
		kind: 'function',
		insertText: 'tan(',
		signature: 'tan(x)',
		description: 'Tangente'
	},
	{
		label: 'arcsin',
		kind: 'function',
		insertText: 'arcsin(',
		signature: 'arcsin(x)',
		description: 'Arc sinus'
	},
	{
		label: 'arccos',
		kind: 'function',
		insertText: 'arccos(',
		signature: 'arccos(x)',
		description: 'Arc cosinus'
	},
	{
		label: 'arctan',
		kind: 'function',
		insertText: 'arctan(',
		signature: 'arctan(x)',
		description: 'Arc tangente'
	},
	// Hyperbolic
	{
		label: 'sinh',
		kind: 'function',
		insertText: 'sinh(',
		signature: 'sinh(x)',
		description: 'Sinus hyperbolique'
	},
	{
		label: 'cosh',
		kind: 'function',
		insertText: 'cosh(',
		signature: 'cosh(x)',
		description: 'Cosinus hyperbolique'
	},
	{
		label: 'tanh',
		kind: 'function',
		insertText: 'tanh(',
		signature: 'tanh(x)',
		description: 'Tangente hyperbolique'
	},
	// Logarithmic/Exponential
	{
		label: 'ln',
		kind: 'function',
		insertText: 'ln(',
		signature: 'ln(x)',
		description: 'Logarithme népérien'
	},
	{
		label: 'log',
		kind: 'function',
		insertText: 'log(',
		signature: 'log(x) ou log_base(x)',
		description: 'Logarithme (base 10 ou personnalisée)'
	},
	{
		label: 'exp',
		kind: 'function',
		insertText: 'exp(',
		signature: 'exp(x)',
		description: 'Exponentielle'
	},
	// Roots and powers
	{
		label: 'sqrt',
		kind: 'function',
		insertText: 'sqrt(',
		signature: 'sqrt(x) ou sqrt[n](x)',
		description: 'Racine carrée (ou nième)'
	},
	// Limits and bounds
	{
		label: 'lim',
		kind: 'function',
		insertText: 'lim(',
		signature: 'lim(expr)',
		description: 'Limite'
	},
	{
		label: 'min',
		kind: 'function',
		insertText: 'min(',
		signature: 'min(a, b, ...)',
		description: 'Minimum'
	},
	{
		label: 'max',
		kind: 'function',
		insertText: 'max(',
		signature: 'max(a, b, ...)',
		description: 'Maximum'
	},
	// Absolute value
	{
		label: 'abs',
		kind: 'function',
		insertText: '|',
		signature: '|x|',
		description: 'Valeur absolue'
	},
	// Number theory
	{
		label: 'gcd',
		kind: 'function',
		insertText: 'gcd(',
		signature: 'gcd(a, b)',
		description: 'PGCD'
	},
	{
		label: 'lcm',
		kind: 'function',
		insertText: 'lcm(',
		signature: 'lcm(a, b)',
		description: 'PPCM'
	}
];

/**
 * Built-in constants.
 */
const BUILTIN_CONSTANTS: readonly BuiltinCompletion[] = [
	{
		label: 'pi',
		kind: 'constant',
		insertText: '\\pi',
		description: 'Pi (3.14159...)'
	},
	{
		label: 'e',
		kind: 'constant',
		insertText: 'e',
		description: "Nombre d'Euler (2.71828...)"
	},
	{
		label: 'infty',
		kind: 'constant',
		insertText: '\\infty',
		description: 'Infini'
	}
];

/**
 * Greek letters.
 */
const GREEK_LETTERS: readonly BuiltinCompletion[] = [
	{ label: 'alpha', kind: 'greek', insertText: '\\alpha', description: 'Alpha grec' },
	{ label: 'beta', kind: 'greek', insertText: '\\beta', description: 'Bêta grec' },
	{ label: 'gamma', kind: 'greek', insertText: '\\gamma', description: 'Gamma grec' },
	{ label: 'theta', kind: 'greek', insertText: '\\theta', description: 'Thêta grec' },
	{ label: 'delta', kind: 'greek', insertText: '\\delta', description: 'Delta grec' },
	{ label: 'epsilon', kind: 'greek', insertText: '\\epsilon', description: 'Epsilon grec' },
	{ label: 'lambda', kind: 'greek', insertText: '\\lambda', description: 'Lambda grec' },
	{ label: 'mu', kind: 'greek', insertText: '\\mu', description: 'Mu grec' },
	{ label: 'sigma', kind: 'greek', insertText: '\\sigma', description: 'Sigma grec' },
	{ label: 'omega', kind: 'greek', insertText: '\\omega', description: 'Oméga grec' }
];

// =============================================================================
// Completion Provider
// =============================================================================

/**
 * Provides auto-completion suggestions.
 *
 * @example Basic usage
 * ```typescript
 * const provider = new CompletionProvider();
 * const completions = provider.getCompletions('sin');
 * // Returns completions for 'sin', 'sinh', etc.
 * ```
 *
 * @example With context
 * ```typescript
 * const provider = new CompletionProvider();
 * const completions = provider.getCompletions('x', {
 *   variables: ['x', 'y', 'z']
 * });
 * // Returns variable completion for 'x'
 * ```
 */
export class CompletionProvider {
	/**
	 * Get completions for a prefix.
	 *
	 * @param prefix - The text prefix to complete
	 * @param context - Optional context with variables/functions
	 * @param options - Optional completion options
	 * @returns Array of completion suggestions
	 */
	getCompletions(
		prefix: string,
		context?: CompletionContext,
		options?: CompletionOptions
	): Completion[] {
		const maxResults = options?.maxResults ?? 20;
		const lowerPrefix = prefix.toLowerCase();

		const results: Array<Completion & { score: number }> = [];

		// Add built-in functions
		for (const fn of BUILTIN_FUNCTIONS) {
			if (fn.label.toLowerCase().startsWith(lowerPrefix)) {
				results.push({
					...fn,
					score: this.computeScore(fn.label, prefix)
				});
			}
		}

		// Add constants
		for (const constant of BUILTIN_CONSTANTS) {
			if (constant.label.toLowerCase().startsWith(lowerPrefix)) {
				results.push({
					...constant,
					score: this.computeScore(constant.label, prefix)
				});
			}
		}

		// Add Greek letters
		for (const greek of GREEK_LETTERS) {
			if (greek.label.toLowerCase().startsWith(lowerPrefix)) {
				results.push({
					...greek,
					score: this.computeScore(greek.label, prefix)
				});
			}
		}

		// Add context variables
		if (context?.variables) {
			for (const varName of context.variables) {
				if (varName.toLowerCase().startsWith(lowerPrefix)) {
					results.push({
						label: varName,
						kind: 'variable',
						insertText: varName,
						description: 'Variable',
						score: this.computeScore(varName, prefix)
					});
				}
			}
		}

		// Add context functions
		if (context?.functions) {
			for (const fnName of context.functions) {
				if (fnName.toLowerCase().startsWith(lowerPrefix)) {
					results.push({
						label: fnName,
						kind: 'function',
						insertText: `${fnName}(`,
						signature: `${fnName}(...)`,
						description: 'Fonction utilisateur',
						score: this.computeScore(fnName, prefix)
					});
				}
			}
		}

		// Sort by score (higher = better match), then alphabetically
		results.sort((a, b) => {
			if (a.score !== b.score) return b.score - a.score;
			return a.label.localeCompare(b.label);
		});

		// Remove score from results and limit
		return results.slice(0, maxResults).map(({ score: _score, ...rest }) => rest);
	}

	/**
	 * Compute relevance score for a completion.
	 * Higher score = more relevant.
	 */
	private computeScore(label: string, prefix: string): number {
		let score = 0;

		// Exact match: highest priority
		if (label.toLowerCase() === prefix.toLowerCase()) {
			score += 100;
		}

		// Prefix length bonus
		score += prefix.length * 10;

		// Shorter completions preferred (less to type)
		score -= label.length;

		// Case match bonus
		if (label.startsWith(prefix)) {
			score += 5;
		}

		return score;
	}
}
