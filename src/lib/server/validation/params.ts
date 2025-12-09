/**
 * Route Parameter Validation
 *
 * Helpers for validating route parameters (e.g., params.id).
 * Provides defense-in-depth even when RLS protects against unauthorized access.
 *
 * @module lib/server/validation/params
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';

/**
 * Validates a route parameter as UUID.
 *
 * @param id - The parameter value to validate
 * @param paramName - Name of the parameter for error messages (default: 'id')
 * @returns The validated UUID string
 * @throws 400 error if not a valid UUID
 *
 * @example
 * ```typescript
 * export const GET: RequestHandler = async ({ params }) => {
 *     const id = validateUuidParam(params.id);
 *     // id is guaranteed to be a valid UUID
 * };
 * ```
 */
export function validateUuidParam(id: string, paramName = 'id'): string {
	const result = z.string().uuid().safeParse(id);
	if (!result.success) {
		throw error(400, `Format ${paramName} invalide`);
	}
	return result.data;
}

/**
 * Validates multiple route parameters as UUIDs.
 *
 * @param params - Object containing parameter values
 * @param paramNames - Array of parameter names to validate
 * @returns Object with validated UUID values
 * @throws 400 error if any parameter is not a valid UUID
 *
 * @example
 * ```typescript
 * export const GET: RequestHandler = async ({ params }) => {
 *     const { id, sectionId } = validateUuidParams(params, ['id', 'sectionId']);
 * };
 * ```
 */
export function validateUuidParams<T extends string>(
	params: Record<string, string>,
	paramNames: T[]
): Record<T, string> {
	const result: Record<string, string> = {};
	for (const name of paramNames) {
		result[name] = validateUuidParam(params[name], name);
	}
	return result as Record<T, string>;
}

/**
 * Validates a route parameter as a positive integer.
 *
 * @param value - The parameter value to validate
 * @param paramName - Name of the parameter for error messages
 * @param options - Optional min/max bounds
 * @returns The validated integer
 * @throws 400 error if not a valid positive integer
 *
 * @example
 * ```typescript
 * export const GET: RequestHandler = async ({ params }) => {
 *     const page = validateIntParam(params.page, 'page', { min: 1, max: 1000 });
 * };
 * ```
 */
export function validateIntParam(
	value: string,
	paramName: string,
	options?: { min?: number; max?: number }
): number {
	const { min = 1, max = Number.MAX_SAFE_INTEGER } = options ?? {};

	const schema = z.coerce.number().int().min(min).max(max);
	const result = schema.safeParse(value);

	if (!result.success) {
		throw error(400, `Format ${paramName} invalide`);
	}
	return result.data;
}

/**
 * Validates a route parameter against an enum/literal union.
 *
 * @param value - The parameter value to validate
 * @param allowedValues - Array of allowed values
 * @param paramName - Name of the parameter for error messages
 * @returns The validated value
 * @throws 400 error if not one of allowed values
 *
 * @example
 * ```typescript
 * export const GET: RequestHandler = async ({ params }) => {
 *     const type = validateEnumParam(params.type, ['student', 'teacher'], 'type');
 * };
 * ```
 */
export function validateEnumParam<T extends string>(
	value: string,
	allowedValues: readonly T[],
	paramName: string
): T {
	if (!allowedValues.includes(value as T)) {
		throw error(400, `Valeur ${paramName} invalide`);
	}
	return value as T;
}
