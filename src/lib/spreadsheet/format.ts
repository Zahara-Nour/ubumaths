/**
 * Spreadsheet Format Utils - Utilities for formatting cell values
 *
 * This module provides functions for formatting numbers according to
 * different display formats (percent, currency, etc.) and for formatting
 * computed values based on cell format settings.
 *
 * @module spreadsheet/format
 */

import type { ComputedValue, NumberFormat, CellFormat } from './types';

/**
 * Format a number according to the specified format type
 *
 * @param value - The numeric value to format
 * @param format - The format type to apply
 * @returns Formatted string representation
 *
 * @example
 * formatNumber(0.5, 'percent')    // "50%"
 * formatNumber(42.5, 'currency')  // "42,50 €"
 * formatNumber(3.14159, 'number') // "3.14"
 */
export function formatNumber(value: number, format: NumberFormat): string {
	switch (format) {
		case 'percent':
			return (value * 100).toFixed(0) + '%';
		case 'currency':
			return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
		case 'number':
		default:
			// Smart formatting: show decimals only if needed
			return Number.isInteger(value) ? value.toString() : value.toFixed(2);
	}
}

/**
 * Format a computed value for display
 *
 * Takes a computed value and optional formatting settings and returns
 * a human-readable string representation.
 *
 * @param computed - The computed value to format
 * @param format - Optional cell format settings
 * @returns Formatted string for display
 *
 * @example
 * formatComputedValue({ type: 'number', value: 42 })
 * // "42"
 *
 * formatComputedValue({ type: 'number', value: 0.5 }, { numberFormat: 'percent' })
 * // "50%"
 */
export function formatComputedValue(computed: ComputedValue, format?: CellFormat): string {
	if (computed.type === 'empty') return '';
	if (computed.type === 'error') return computed.code;
	if (computed.type === 'boolean') return computed.value ? 'VRAI' : 'FAUX';
	if (computed.type === 'string') return computed.value;
	if (computed.type === 'number') {
		return formatNumber(computed.value, format?.numberFormat ?? 'number');
	}
	return '';
}
