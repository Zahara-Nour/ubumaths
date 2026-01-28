/**
 * Type Algebra for Numeric Types
 *
 * Provides lattice operations on the numeric type hierarchy:
 * - join: least upper bound (most specific common supertype)
 * - meet: greatest lower bound (most specific common subtype)
 * - isSubtype: subtype relationship check
 */

import type { NumericType } from './types';

// =============================================================================
// Type Hierarchy Definition
// =============================================================================

/**
 * Type hierarchy levels (lower = more specific, higher = more general).
 *
 * The lattice structure:
 *
 *                 complex (6)
 *                    |
 *                  real (5)
 *                 /    \
 *     transcendental  algebraic (4)
 *           (4)        /      \
 *                 rational   irrational_algebraic
 *                   (2)           (3)
 *                    |
 *                 integer (1)
 *
 * Note: transcendental and algebraic are at the same level (4)
 * but are NOT subtypes of each other.
 */
const TYPE_LEVEL: Record<NumericType, number> = {
	integer: 1,
	rational: 2,
	irrational_algebraic: 3,
	algebraic: 4,
	transcendental: 4, // Same level as algebraic, different branch
	real: 5,
	complex: 6,
	unknown: 7 // Top element for unknown
};

/**
 * Direct parent types in the hierarchy.
 * A type can have multiple direct parents.
 */
const DIRECT_PARENTS: Record<NumericType, readonly NumericType[]> = {
	integer: ['rational'],
	rational: ['algebraic'],
	irrational_algebraic: ['algebraic'],
	algebraic: ['real'],
	transcendental: ['real'],
	real: ['complex'],
	complex: [],
	unknown: [] // unknown has no parents (it's a special case)
};

/**
 * All ancestor types (transitive closure of parent relationship).
 */
const ALL_ANCESTORS: Record<NumericType, ReadonlySet<NumericType>> = {
	integer: new Set<NumericType>(['rational', 'algebraic', 'real', 'complex']),
	rational: new Set<NumericType>(['algebraic', 'real', 'complex']),
	irrational_algebraic: new Set<NumericType>(['algebraic', 'real', 'complex']),
	algebraic: new Set<NumericType>(['real', 'complex']),
	transcendental: new Set<NumericType>(['real', 'complex']),
	real: new Set<NumericType>(['complex']),
	complex: new Set<NumericType>(),
	unknown: new Set<NumericType>()
};

// =============================================================================
// Subtype Checking
// =============================================================================

/**
 * Checks if type t1 is a subtype of (or equal to) type t2.
 *
 * In the type hierarchy, a type is a subtype of another if it's
 * more specific. For example:
 * - integer is a subtype of rational
 * - rational is a subtype of algebraic
 * - algebraic is a subtype of real
 * - transcendental is a subtype of real
 * - real is a subtype of complex
 *
 * Special cases:
 * - Every type is a subtype of itself
 * - 'unknown' is NOT a subtype of anything except itself
 * - Nothing is a subtype of 'unknown' except 'unknown' itself
 *
 * @param t1 - The potential subtype
 * @param t2 - The potential supertype
 * @returns true if t1 is a subtype of t2
 *
 * @example
 * isSubtype('integer', 'rational')  // true
 * isSubtype('rational', 'integer')  // false
 * isSubtype('integer', 'integer')   // true
 * isSubtype('transcendental', 'algebraic')  // false (different branches)
 */
export function isSubtype(t1: NumericType, t2: NumericType): boolean {
	// Same type
	if (t1 === t2) return true;

	// Unknown handling
	if (t1 === 'unknown' || t2 === 'unknown') {
		return false;
	}

	// Check if t2 is an ancestor of t1
	return ALL_ANCESTORS[t1].has(t2);
}

/**
 * Checks if two types are compatible (one is subtype of the other).
 *
 * @param t1 - First type
 * @param t2 - Second type
 * @returns true if one is a subtype of the other
 */
export function areCompatible(t1: NumericType, t2: NumericType): boolean {
	return isSubtype(t1, t2) || isSubtype(t2, t1);
}

// =============================================================================
// Join Operation (Least Upper Bound)
// =============================================================================

/**
 * Computes the join (least upper bound) of two numeric types.
 *
 * The join is the most specific type that is a supertype of both inputs.
 * This is used when combining types in operations like addition.
 *
 * @param t1 - First type
 * @param t2 - Second type
 * @returns The least upper bound of t1 and t2
 *
 * @example
 * join('integer', 'integer')        // 'integer'
 * join('integer', 'rational')       // 'rational'
 * join('rational', 'irrational_algebraic')  // 'algebraic'
 * join('algebraic', 'transcendental')       // 'real'
 * join('real', 'complex')           // 'complex'
 */
export function join(t1: NumericType, t2: NumericType): NumericType {
	// Same type
	if (t1 === t2) return t1;

	// Unknown propagates
	if (t1 === 'unknown' || t2 === 'unknown') {
		return 'unknown';
	}

	// If one is subtype of the other, return the supertype
	if (isSubtype(t1, t2)) return t2;
	if (isSubtype(t2, t1)) return t1;

	// Neither is subtype of the other - find common ancestor
	// This happens with algebraic/transcendental or irrational_algebraic/rational
	const level1 = TYPE_LEVEL[t1];
	const level2 = TYPE_LEVEL[t2];

	// Handle the algebraic/transcendental case
	if (
		(t1 === 'algebraic' || t1 === 'transcendental') &&
		(t2 === 'algebraic' || t2 === 'transcendental')
	) {
		return 'real';
	}

	// Handle cases where one type's ancestors contain the other's
	// e.g., rational and irrational_algebraic -> algebraic
	if (
		(t1 === 'rational' || t1 === 'irrational_algebraic') &&
		(t2 === 'rational' || t2 === 'irrational_algebraic')
	) {
		return 'algebraic';
	}

	// Handle mixed cases - find the minimum level that encompasses both
	// This is a fallback that climbs up the hierarchy
	if (level1 < level2) {
		// t1 is more specific, find where t1's ancestors meet t2's level
		const ancestors1 = Array.from(ALL_ANCESTORS[t1]);
		for (const ancestor of ancestors1) {
			if (isSubtype(t2, ancestor) || t2 === ancestor) {
				return ancestor;
			}
		}
	} else {
		// t2 is more specific or same level
		const ancestors2 = Array.from(ALL_ANCESTORS[t2]);
		for (const ancestor of ancestors2) {
			if (isSubtype(t1, ancestor) || t1 === ancestor) {
				return ancestor;
			}
		}
	}

	// Fallback: return 'real' as common ancestor for all numeric types
	// (except complex which has no numeric subtypes)
	if (t1 !== 'complex' && t2 !== 'complex') {
		return 'real';
	}

	return 'complex';
}

/**
 * Computes the join of multiple numeric types.
 *
 * @param types - Array of types to join
 * @returns The least upper bound of all types
 */
export function joinAll(types: readonly NumericType[]): NumericType {
	if (types.length === 0) return 'unknown';
	return types.reduce(join);
}

// =============================================================================
// Meet Operation (Greatest Lower Bound)
// =============================================================================

/**
 * Computes the meet (greatest lower bound) of two numeric types.
 *
 * The meet is the most general type that is a subtype of both inputs.
 * This is useful for constraint solving and type narrowing.
 *
 * @param t1 - First type
 * @param t2 - Second type
 * @returns The greatest lower bound of t1 and t2, or 'unknown' if no common subtype exists
 *
 * @example
 * meet('real', 'algebraic')         // 'algebraic'
 * meet('rational', 'real')          // 'rational'
 * meet('algebraic', 'transcendental')  // 'unknown' (no common subtype)
 * meet('complex', 'real')           // 'real'
 */
export function meet(t1: NumericType, t2: NumericType): NumericType {
	// Same type
	if (t1 === t2) return t1;

	// Unknown handling - meet with unknown is unknown
	if (t1 === 'unknown' || t2 === 'unknown') {
		return 'unknown';
	}

	// If one is subtype of the other, return the subtype
	if (isSubtype(t1, t2)) return t1;
	if (isSubtype(t2, t1)) return t2;

	// Neither is subtype of the other - no common subtype exists
	// This happens with algebraic/transcendental, rational/irrational_algebraic
	return 'unknown';
}

/**
 * Computes the meet of multiple numeric types.
 *
 * @param types - Array of types to meet
 * @returns The greatest lower bound of all types
 */
export function meetAll(types: readonly NumericType[]): NumericType {
	if (types.length === 0) return 'unknown';
	return types.reduce(meet);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets the direct parent types of a numeric type.
 *
 * @param type - The type to get parents for
 * @returns Array of direct parent types
 */
export function getParents(type: NumericType): readonly NumericType[] {
	return DIRECT_PARENTS[type];
}

/**
 * Gets all ancestor types (transitive closure).
 *
 * @param type - The type to get ancestors for
 * @returns Set of all ancestor types
 */
export function getAncestors(type: NumericType): ReadonlySet<NumericType> {
	return ALL_ANCESTORS[type];
}

/**
 * Gets the level in the type hierarchy (lower = more specific).
 *
 * @param type - The type to get the level for
 * @returns The hierarchy level
 */
export function getLevel(type: NumericType): number {
	return TYPE_LEVEL[type];
}

/**
 * Checks if a type is a "leaf" type (has no subtypes).
 *
 * @param type - The type to check
 * @returns true if the type has no subtypes
 */
export function isLeafType(type: NumericType): boolean {
	return type === 'integer' || type === 'irrational_algebraic' || type === 'transcendental';
}

/**
 * Checks if a type is algebraic (integer, rational, or irrational_algebraic).
 *
 * @param type - The type to check
 * @returns true if the type is algebraic or a subtype of algebraic
 */
export function isAlgebraicBranch(type: NumericType): boolean {
	return (
		type === 'integer' ||
		type === 'rational' ||
		type === 'irrational_algebraic' ||
		type === 'algebraic'
	);
}

/**
 * Checks if a type is in the transcendental branch.
 *
 * @param type - The type to check
 * @returns true if the type is transcendental
 */
export function isTranscendentalBranch(type: NumericType): boolean {
	return type === 'transcendental';
}
