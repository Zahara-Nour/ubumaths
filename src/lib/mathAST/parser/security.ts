/**
 * Parser Security
 *
 * Provides security limits for parsing to prevent DoS attacks via:
 * - Excessively long input strings
 * - Deeply nested expressions (stack overflow)
 * - Expressions with too many nodes (memory exhaustion)
 *
 * @module mathAST/parser/security
 */

// =============================================================================
// Error Types
// =============================================================================

/**
 * Security error codes for categorization.
 */
export type SecurityErrorCode = 'INPUT_TOO_LONG' | 'AST_TOO_DEEP' | 'AST_TOO_MANY_NODES';

/**
 * Error thrown when security limits are exceeded.
 *
 * Distinct from ParseError to allow separate handling of security
 * violations vs parsing errors.
 *
 * @example
 * try {
 *   parseLatex(veryLongInput, { security: { maxInputLength: 1000 } });
 * } catch (e) {
 *   if (e instanceof SecurityError) {
 *     console.log(`Security violation: ${e.code}`);
 *   }
 * }
 */
export class SecurityError extends Error {
	readonly code: SecurityErrorCode;

	constructor(message: string, code: SecurityErrorCode) {
		super(message);
		this.name = 'SecurityError';
		this.code = code;
	}
}

// =============================================================================
// Options
// =============================================================================

/**
 * Security options for parser.
 *
 * All limits are optional and use sensible defaults if not specified.
 */
export interface ParserSecurityOptions {
	/**
	 * Maximum input string length.
	 * @default 10000
	 */
	readonly maxInputLength?: number;

	/**
	 * Maximum AST depth (nesting level).
	 * @default 100
	 */
	readonly maxASTDepth?: number;

	/**
	 * Maximum number of AST nodes.
	 * @default 10000
	 */
	readonly maxNodeCount?: number;
}

/**
 * Default security options.
 *
 * These defaults balance security with usability:
 * - 10000 chars is enough for complex expressions
 * - 100 depth handles most legitimate nesting
 * - 10000 nodes supports complex formulas
 */
export const DEFAULT_SECURITY_OPTIONS: Required<ParserSecurityOptions> = {
	maxInputLength: 10000,
	maxASTDepth: 100,
	maxNodeCount: 10000
} as const;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Get effective security options by merging with defaults.
 */
export function getEffectiveSecurityOptions(
	options?: ParserSecurityOptions
): Required<ParserSecurityOptions> {
	if (!options) {
		return DEFAULT_SECURITY_OPTIONS;
	}
	return {
		maxInputLength: options.maxInputLength ?? DEFAULT_SECURITY_OPTIONS.maxInputLength,
		maxASTDepth: options.maxASTDepth ?? DEFAULT_SECURITY_OPTIONS.maxASTDepth,
		maxNodeCount: options.maxNodeCount ?? DEFAULT_SECURITY_OPTIONS.maxNodeCount
	};
}

/**
 * Check input length and throw if exceeded.
 */
export function checkInputLength(input: string, maxLength: number): void {
	if (input.length > maxLength) {
		throw new SecurityError(
			`Input length ${input.length} exceeds maximum allowed ${maxLength} characters`,
			'INPUT_TOO_LONG'
		);
	}
}

/**
 * Security context for tracking during parsing.
 */
export interface SecurityContext {
	readonly maxDepth: number;
	readonly maxNodeCount: number;
	currentDepth: number;
	nodeCount: number;
}

/**
 * Create a new security context for tracking during parsing.
 */
export function createSecurityContext(options: Required<ParserSecurityOptions>): SecurityContext {
	return {
		maxDepth: options.maxASTDepth,
		maxNodeCount: options.maxNodeCount,
		currentDepth: 0,
		nodeCount: 0
	};
}

/**
 * Increment depth and throw if exceeded.
 */
export function incrementDepth(ctx: SecurityContext): void {
	ctx.currentDepth++;
	if (ctx.currentDepth > ctx.maxDepth) {
		throw new SecurityError(
			`AST depth ${ctx.currentDepth} exceeds maximum allowed ${ctx.maxDepth}`,
			'AST_TOO_DEEP'
		);
	}
}

/**
 * Decrement depth when leaving a nested context.
 */
export function decrementDepth(ctx: SecurityContext): void {
	ctx.currentDepth--;
}

/**
 * Increment node count and throw if exceeded.
 */
export function incrementNodeCount(ctx: SecurityContext): void {
	ctx.nodeCount++;
	if (ctx.nodeCount > ctx.maxNodeCount) {
		throw new SecurityError(
			`AST node count ${ctx.nodeCount} exceeds maximum allowed ${ctx.maxNodeCount}`,
			'AST_TOO_MANY_NODES'
		);
	}
}
