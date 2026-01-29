/**
 * Domain Validation Module
 *
 * Provides tools for validating student answers about mathematical domains.
 *
 * @module mathAST/domain/validation
 */

// =============================================================================
// Types
// =============================================================================

export type {
	DomainValidationResult,
	DomainValidationOptions,
	DomainComparison,
	StudentInputFormat,
	ParseStudentDomainResult,
	HintLevel,
	HintOptions
} from './types';

export type { DomainMistakeType, DomainMistake } from './mistake-types';

// =============================================================================
// Student Domain Parsing
// =============================================================================

export { parseStudentDomain } from './parse-student-domain';

// =============================================================================
// Domain Comparison
// =============================================================================

export {
	compareDomains,
	domainsAreEqual,
	calculateDomainSimilarity,
	describeDomainRelationship
} from './compare-domains';

// =============================================================================
// Validation
// =============================================================================

export { validateStudentDomain } from './validate-student-domain';

// =============================================================================
// Hints
// =============================================================================

export { generateDomainHints } from './hints';

// =============================================================================
// Mistake Detection
// =============================================================================

export { detectDomainMistakes } from './detect-mistakes';

export {
	getMistakeSeverity,
	isForgotConstraintMistake,
	isBoundaryMistake,
	isSetOperationMistake
} from './mistake-types';

export {
	getMistakeDescription,
	getMistakeCorrectionTemplate,
	applyMistakeCorrectionTemplate,
	MISTAKE_DESCRIPTIONS
} from './mistake-descriptions';
