/**
 * Zod Validation Schemas for MathAST Eval
 *
 * Provides validation schemas for:
 * - Variable names
 * - Numeric values
 * - Eval bindings
 * - Parser security options
 *
 * @module mathAST/eval/validation
 */

import { z } from 'zod';

// =============================================================================
// Variable Name Validation
// =============================================================================

/**
 * Schema for valid variable names.
 *
 * Valid names:
 * - Start with letter or underscore
 * - Contain only letters, digits, underscores
 *
 * Examples: x, alpha, var_1, _private
 * Invalid: "", 123, @var, x y
 */
export const VariableNameSchema = z
	.string()
	.min(1, 'Le nom de variable ne peut pas être vide')
	.regex(
		/^[a-zA-Z_][a-zA-Z0-9_]*$/,
		'Le nom de variable doit commencer par une lettre ou underscore et ne contenir que des lettres, chiffres et underscores'
	);

// =============================================================================
// Numeric Value Validation
// =============================================================================

/**
 * Schema for valid numeric values.
 *
 * Accepts finite numbers only (no NaN, Infinity).
 */
export const NumericValueSchema = z
	.number()
	.finite('La valeur doit être un nombre fini (pas NaN ou Infinity)');

/**
 * Create a bounded numeric schema.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Zod schema for bounded numeric value
 */
export function createBoundedNumericSchema(min: number, max: number) {
	return NumericValueSchema.min(min, `La valeur doit être >= ${min}`).max(
		max,
		`La valeur doit être <= ${max}`
	);
}

// =============================================================================
// Eval Bindings Validation
// =============================================================================

/**
 * Schema for binding values.
 * Can be numeric (finite) or non-empty string.
 */
export const BindingValueSchema = z.union([
	NumericValueSchema,
	z.string().min(1, 'La valeur string ne peut pas être vide')
]);

/**
 * Schema for eval bindings record.
 *
 * Keys must be valid variable names.
 * Values must be finite numbers or non-empty strings.
 */
export const EvalBindingsSchema = z.record(VariableNameSchema, BindingValueSchema);

/**
 * Type inferred from EvalBindingsSchema.
 */
export type EvalBindings = z.infer<typeof EvalBindingsSchema>;

// =============================================================================
// Parser Options Validation
// =============================================================================

/**
 * Schema for positive integer (security limits).
 */
const PositiveIntegerSchema = z
	.number()
	.int('La valeur doit être un entier')
	.positive('La valeur doit être positive');

/**
 * Schema for parser security options.
 */
export const ParserSecurityOptionsSchema = z.object({
	maxInputLength: PositiveIntegerSchema.optional(),
	maxASTDepth: PositiveIntegerSchema.optional(),
	maxNodeCount: PositiveIntegerSchema.optional()
});

/**
 * Type inferred from ParserSecurityOptionsSchema.
 */
export type ValidatedSecurityOptions = z.infer<typeof ParserSecurityOptionsSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate a variable name.
 *
 * @param name - Name to validate
 * @returns SafeParseReturnType with success/error
 */
export function validateVariableName(name: string) {
	return VariableNameSchema.safeParse(name);
}

/**
 * Validate eval bindings.
 *
 * @param bindings - Bindings record to validate
 * @returns SafeParseReturnType with success/error
 */
export function validateEvalBindings(bindings: Record<string, unknown>) {
	return EvalBindingsSchema.safeParse(bindings);
}

/**
 * Validate parser security options.
 *
 * @param options - Options to validate
 * @returns SafeParseReturnType with success/error
 */
export function validateSecurityOptions(options: Record<string, unknown>) {
	return ParserSecurityOptionsSchema.safeParse(options);
}
