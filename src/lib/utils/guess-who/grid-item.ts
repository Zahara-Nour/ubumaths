/**
 * Polymorphic Grid Item Types for Guess Who Math Game
 *
 * Supports different types of items on the game grid:
 * - Numbers (existing packs)
 * - Fractions (new)
 * - More types can be added: shapes, expressions, etc.
 *
 * @module utils/guess-who/grid-item
 */

import type { Fraction } from './fraction-properties';
import { fractionToUbumark, fractionsEqual } from './fraction-properties';

// ============================================================================
// GRID ITEM TYPES
// ============================================================================

/**
 * A number item on the grid
 */
export interface NumberGridItem {
	type: 'number';
	value: number;
}

/**
 * A fraction item on the grid
 */
export interface FractionGridItem {
	type: 'fraction';
	numerator: number;
	denominator: number;
}

/**
 * Union of all possible grid item types
 * Extensible for future types (shapes, expressions, etc.)
 */
export type GridItem = NumberGridItem | FractionGridItem;

/**
 * Type of grid item
 */
export type GridItemType = GridItem['type'];

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if item is a number
 */
export function isNumberItem(item: GridItem): item is NumberGridItem {
	return item.type === 'number';
}

/**
 * Check if item is a fraction
 */
export function isFractionItem(item: GridItem): item is FractionGridItem {
	return item.type === 'fraction';
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a number grid item
 */
export function numberItem(value: number): NumberGridItem {
	return { type: 'number', value };
}

/**
 * Create a fraction grid item
 */
export function fractionItem(numerator: number, denominator: number): FractionGridItem {
	return { type: 'fraction', numerator, denominator };
}

/**
 * Create a fraction grid item from a Fraction object
 */
export function fractionItemFrom(f: Fraction): FractionGridItem {
	return { type: 'fraction', numerator: f.numerator, denominator: f.denominator };
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Get the ubumark display string for a grid item
 * This is what gets rendered in the UI
 */
export function gridItemToUbumark(item: GridItem): string {
	switch (item.type) {
		case 'number':
			return String(item.value);
		case 'fraction':
			return fractionToUbumark({ numerator: item.numerator, denominator: item.denominator });
	}
}

/**
 * Get a simple string identifier for a grid item
 * Used for logging, debugging, keys, etc.
 */
export function gridItemToKey(item: GridItem): string {
	switch (item.type) {
		case 'number':
			return `n:${item.value}`;
		case 'fraction':
			return `f:${item.numerator}/${item.denominator}`;
	}
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Check if two grid items are equal (same type and same value)
 */
export function gridItemsEqual(a: GridItem, b: GridItem): boolean {
	if (a.type !== b.type) return false;

	switch (a.type) {
		case 'number':
			return a.value === (b as NumberGridItem).value;
		case 'fraction':
			return fractionsEqual(
				{ numerator: a.numerator, denominator: a.denominator },
				{
					numerator: (b as FractionGridItem).numerator,
					denominator: (b as FractionGridItem).denominator
				}
			);
	}
}

// ============================================================================
// SERIALIZATION (for DB storage)
// ============================================================================

/**
 * Serialize a grid item to JSON-compatible format for DB storage
 */
export function serializeGridItem(item: GridItem): object {
	return { ...item };
}

/**
 * Deserialize a grid item from DB storage
 */
export function deserializeGridItem(data: unknown): GridItem {
	if (typeof data === 'number') {
		// Backward compatibility: plain numbers
		return numberItem(data);
	}

	if (typeof data === 'object' && data !== null && 'type' in data) {
		const obj = data as { type: string };
		switch (obj.type) {
			case 'number':
				return data as NumberGridItem;
			case 'fraction':
				return data as FractionGridItem;
			default:
				throw new Error(`Unknown grid item type: ${obj.type}`);
		}
	}

	throw new Error(`Invalid grid item data: ${JSON.stringify(data)}`);
}

/**
 * Serialize an array of grid items for DB storage
 */
export function serializeGrid(items: GridItem[]): object[] {
	return items.map(serializeGridItem);
}

/**
 * Deserialize a grid from DB storage
 * Handles backward compatibility with number[] format
 */
export function deserializeGrid(data: unknown[]): GridItem[] {
	return data.map(deserializeGridItem);
}

// ============================================================================
// CONVERSION HELPERS (for backward compatibility)
// ============================================================================

/**
 * Convert number array to GridItem array (for existing number packs)
 */
export function numbersToGridItems(numbers: number[]): GridItem[] {
	return numbers.map(numberItem);
}

/**
 * Convert fraction array to GridItem array
 */
export function fractionsToGridItems(fractions: Fraction[]): GridItem[] {
	return fractions.map(fractionItemFrom);
}

/**
 * Extract number values from grid items (for backward compat with number-only code)
 * Throws if any non-number items are present
 */
export function gridItemsToNumbers(items: GridItem[]): number[] {
	return items.map((item) => {
		if (!isNumberItem(item)) {
			throw new Error(`Expected number item, got ${item.type}`);
		}
		return item.value;
	});
}
