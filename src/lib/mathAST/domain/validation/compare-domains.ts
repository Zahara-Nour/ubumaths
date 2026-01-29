/**
 * Domain Comparison
 *
 * Compares two domains to determine their relationship.
 * Used for validating student answers against correct domains.
 *
 * @module mathAST/domain/validation/compare-domains
 */

import type { Domain } from '../types';
import type { DomainComparison } from './types';
import { intersect, difference, isEmpty, isUniversal } from '../algebra';

// =============================================================================
// Main API
// =============================================================================

/**
 * Compare two domains to determine their relationship.
 *
 * @param student - The student's domain answer
 * @param correct - The correct domain
 * @returns DomainComparison with detailed relationship information
 *
 * @example
 * ```typescript
 * // Student is too restrictive
 * compareDomains(
 *   intervalDomain([greaterThan(fromNumber(0))]),  // ]0, +∞[
 *   intervalDomain([greaterThanOrEqual(fromNumber(0))])  // [0, +∞[
 * );
 * // { areEqual: false, studentIsSubset: true, studentMissing: {0}, ... }
 *
 * // Student is too permissive
 * compareDomains(
 *   universalDomain(),  // ℝ
 *   intervalDomain([greaterThan(fromNumber(0))])  // ]0, +∞[
 * );
 * // { areEqual: false, studentIsSuperset: true, studentExtra: ]-∞, 0], ... }
 * ```
 */
export function compareDomains(student: Domain, correct: Domain): DomainComparison {
	// Compute intersection and differences
	const intersectionDomain = intersect(student, correct);
	const studentMissingDomain = difference(correct, student);
	const studentExtraDomain = difference(student, correct);

	// Determine equality
	const studentMissingIsEmpty = isEmpty(studentMissingDomain);
	const studentExtraIsEmpty = isEmpty(studentExtraDomain);
	const areEqual = studentMissingIsEmpty && studentExtraIsEmpty;

	// Determine subset/superset relationships
	// Student is subset if they're missing parts but have no extra
	const studentIsSubset = !areEqual && studentExtraIsEmpty && !studentMissingIsEmpty;

	// Student is superset if they have extra parts but are not missing any
	const studentIsSuperset = !areEqual && studentMissingIsEmpty && !studentExtraIsEmpty;

	return {
		areEqual,
		studentIsSubset,
		studentIsSuperset,
		intersection: intersectionDomain,
		studentMissing: studentMissingDomain,
		studentExtra: studentExtraDomain
	};
}

/**
 * Check if two domains are mathematically equal.
 *
 * This is a simplified version of compareDomains that only checks equality.
 *
 * @param a - First domain
 * @param b - Second domain
 * @returns true if the domains are equal
 */
export function domainsAreEqual(a: Domain, b: Domain): boolean {
	// Quick checks for special cases
	if (a.kind === 'empty' && b.kind === 'empty') return true;
	if (a.kind === 'universal' && b.kind === 'universal') return true;
	if (a.kind === 'empty' || b.kind === 'empty') {
		return isEmpty(a) && isEmpty(b);
	}
	if (a.kind === 'universal' || b.kind === 'universal') {
		return isUniversal(a) && isUniversal(b);
	}

	// Full comparison
	const diff1 = difference(a, b);
	const diff2 = difference(b, a);

	return isEmpty(diff1) && isEmpty(diff2);
}

/**
 * Calculate a similarity score between two domains.
 *
 * This provides a rough measure of how close the student's answer is
 * to the correct answer. The score is based on the ratio of the
 * intersection to the union.
 *
 * @param student - The student's domain answer
 * @param correct - The correct domain
 * @returns Score from 0 (completely wrong) to 100 (completely correct)
 */
export function calculateDomainSimilarity(student: Domain, correct: Domain): number {
	// Handle special cases
	if (isEmpty(student) && isEmpty(correct)) return 100;
	if (isEmpty(student) || isEmpty(correct)) {
		// One is empty, the other is not
		return isEmpty(student) && isEmpty(correct) ? 100 : 0;
	}
	if (isUniversal(student) && isUniversal(correct)) return 100;

	// Check for equality first
	const comparison = compareDomains(student, correct);
	if (comparison.areEqual) return 100;

	// For interval-based domains, calculate based on overlap
	// This is a simplified heuristic

	// If student has the correct answer but with extra parts (too permissive)
	if (comparison.studentIsSuperset) {
		// Partial credit - they included everything correct but also wrong parts
		return 60;
	}

	// If student has part of the correct answer (too restrictive)
	if (comparison.studentIsSubset) {
		// Partial credit - they got part of it right
		return 70;
	}

	// Mixed case - some overlap, some missing, some extra
	const hasIntersection = !isEmpty(comparison.intersection);
	if (hasIntersection) {
		// Some overlap, give partial credit
		return 40;
	}

	// No overlap at all
	return 0;
}

/**
 * Describe the relationship between student and correct domains in French.
 *
 * @param comparison - The domain comparison result
 * @returns French description of the relationship
 */
export function describeDomainRelationship(comparison: DomainComparison): string {
	if (comparison.areEqual) {
		return 'Les domaines sont identiques.';
	}

	if (comparison.studentIsSubset) {
		return 'Ta réponse est trop restrictive : tu as exclu des valeurs qui devraient être dans le domaine.';
	}

	if (comparison.studentIsSuperset) {
		return 'Ta réponse est trop large : tu as inclus des valeurs qui ne devraient pas être dans le domaine.';
	}

	// Mixed case
	const hasMissing = !isEmpty(comparison.studentMissing);
	const hasExtra = !isEmpty(comparison.studentExtra);

	if (hasMissing && hasExtra) {
		return "Ta réponse contient des erreurs : certaines valeurs manquent et d'autres ont été ajoutées à tort.";
	}

	return 'Les domaines diffèrent.';
}
