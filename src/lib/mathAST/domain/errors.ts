/**
 * Domain-related error types
 */

import type { MathNode } from '../types';
import type { DomainViolation } from './types';

/**
 * Error thrown when a domain violation is detected during evaluation.
 *
 * Provides both technical error information and pedagogical messages
 * in French for educational contexts.
 */
export class DomainError extends Error {
	readonly name = 'DomainError';

	constructor(
		message: string,
		/** The function that has the domain restriction */
		public readonly functionName: string,
		/** The parameter name that violated the constraint */
		public readonly parameter: string,
		/** Human-readable constraint description (e.g., "x >= 0") */
		public readonly constraint: string,
		/** The value that violated the constraint */
		public readonly violatingValue: number | MathNode,
		/** Optional detailed violations for compound expressions */
		public readonly violations?: readonly DomainViolation[]
	) {
		super(message);
	}

	/**
	 * Format a pedagogical message in French.
	 *
	 * @example
	 * // Returns: "sqrt(x) requiert x >= 0, valeur recue : x = -1"
	 */
	toFrenchMessage(): string {
		const valueStr = this.formatValue(this.violatingValue);
		return `${this.functionName}(${this.parameter}) requiert ${this.constraint}, valeur recue : ${this.parameter} = ${valueStr}`;
	}

	/**
	 * Format a technical message in English.
	 *
	 * @example
	 * // Returns: "sqrt(x) requires x >= 0, got x = -1"
	 */
	toEnglishMessage(): string {
		const valueStr = this.formatValue(this.violatingValue);
		return `${this.functionName}(${this.parameter}) requires ${this.constraint}, got ${this.parameter} = ${valueStr}`;
	}

	private formatValue(value: number | MathNode): string {
		if (typeof value === 'number') {
			return String(value);
		}
		// For MathNode, we'd need toCustom or toLatex
		// For now, just indicate it's a symbolic value
		return '[symbolic]';
	}
}

/**
 * Creates a DomainError for a specific function and constraint.
 */
export function createDomainError(
	functionName: string,
	parameter: string,
	constraint: string,
	violatingValue: number | MathNode
): DomainError {
	const message = `${functionName}(${parameter}) requires ${constraint}, got ${typeof violatingValue === 'number' ? violatingValue : '[symbolic]'}`;
	return new DomainError(message, functionName, parameter, constraint, violatingValue);
}

/**
 * Creates a DomainViolation object for tracking multiple violations.
 */
export function createDomainViolation(
	source: string,
	parameter: string,
	constraint: string,
	value: number
): DomainViolation {
	return {
		source,
		parameter,
		constraint,
		value,
		messageFr: `${source}(${parameter}) requiert ${constraint}, valeur recue : ${parameter} = ${value}`,
		messageEn: `${source}(${parameter}) requires ${constraint}, got ${parameter} = ${value}`
	};
}
