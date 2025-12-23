/**
 * Exercise Instance Generator
 * ============================
 *
 * Converts Exercise templates (with {{}} syntax) into ExerciseInstance objects
 * with resolved values.
 *
 * Process:
 * 1. Check if exercise uses variations system or legacy format
 * 2. For variations: select variation based on seed, merge shared/per-variation variables
 * 3. Resolve variables using shared library
 * 4. Resolve {{}} syntax in markdown content (statement_md, solution_md)
 * 5. Optionally parse markdown to AST
 * 6. Return ExerciseInstance with metadata
 *
 * Supports three distribution modes:
 * - `on_demand`: Random instance each time
 * - `per_student`: Deterministic based on student_id (same student = same values)
 * - `per_group`: Deterministic based on group_id (all students see same values)
 *
 * @module exercises/generator/instance-generator
 *
 * @example Basic usage (on-demand, random)
 * ```typescript
 * const template: Exercise = {
 *   id: 'ex-123',
 *   variables: [
 *     { name: 'a', expression: '{{1..10}}' },
 *     { name: 'b', expression: '{{1..10}}' }
 *   ],
 *   statement_md: 'Calculate ${{a}} + {{b}}$',
 *   solution_md: 'The answer is ${{eval:a+b}}$',
 *   distribution_mode: 'on_demand',
 *   difficulty: 1,
 *   tags: ['addition']
 * };
 *
 * const result = generateExerciseInstance(template);
 * if (result.success) {
 *   console.log(result.instance.statement_md); // "Calculate $7 + 3$"
 *   console.log(result.instance.solution_md);  // "The answer is $10$"
 * }
 * ```
 *
 * @example Per-student distribution (deterministic)
 * ```typescript
 * const seed = generateStudentSeed(exerciseId, studentId);
 * const result = generateExerciseInstance(template, { seed });
 * // Same student always gets same values
 * ```
 *
 * @example With AST parsing
 * ```typescript
 * const result = generateExerciseInstance(template, {
 *   seed: 12345,
 *   parseAST: true
 * });
 * if (result.success) {
 *   console.log(result.instance.statement_ast); // DocumentNode
 *   console.log(result.instance.solution_ast);  // DocumentNode
 * }
 * ```
 *
 * @example Exercise with variations (new system)
 * ```typescript
 * const exercise: Exercise = {
 *   id: 'ex-789',
 *   shared: {
 *     variables: [
 *       { name: 'a', expression: '{{3..10}}' },
 *       { name: 'b', expression: '{{3..10}}' }
 *     ],
 *     solution_md: 'AC = {{result}} cm'
 *   },
 *   variations: [
 *     {
 *       label: 'guided',
 *       statement_md: 'With hints: {{hint:pythagore}}...',
 *       hints: [{ id: 'pythagore', type: 'video', url: '...', title: 'Rappel' }]
 *     },
 *     {
 *       label: 'autonomous',
 *       statement_md: 'Calculate directly...'
 *     }
 *   ],
 *   distribution_mode: 'per_student',
 *   difficulty: 2,
 *   tags: ['geometry']
 * };
 *
 * const result = generateExerciseInstance(exercise, { seed: 42 });
 * if (result.success) {
 *   console.log(result.instance.selectedVariationLabel); // 'guided' or 'autonomous'
 *   console.log(result.instance.resolvedHints); // hints from selected variation
 * }
 * ```
 */

import type {
	Exercise,
	ExerciseInstance,
	GenerateInstanceOptions,
	InstanceGenerationResult
} from '../types';
import { isVariationsExercise, resolveExerciseVariationWithShared } from '../types';
import {
	resolveVariables,
	resolveText,
	detectCircularDependencies,
	parseMarkdown
} from '$lib/ubumark';

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate an exercise instance from a template
 *
 * Takes an Exercise template (which may contain variables and {{}} syntax)
 * and generates a concrete ExerciseInstance with all variables resolved
 * and content ready for display.
 *
 * **Process**:
 * 1. Generate or use provided seed
 * 2. Check if exercise uses variations system
 * 3. If variations: select variation, merge variables, resolve
 * 4. If legacy: check parameterization, resolve if needed
 * 5. Optionally parse markdown to AST
 * 6. Return instance with metadata
 *
 * **Error Handling**:
 * - Catches circular dependencies in variables
 * - Catches invalid variable expressions
 * - Catches undefined variable references in content
 * - Catches markdown parsing errors (if parseAST is true)
 *
 * @param exercise - Exercise template (may contain variables and {{}} syntax)
 * @param options - Generation options (seed, parseAST)
 * @returns Generation result with instance or errors
 *
 * @example Static exercise (no variables)
 * ```typescript
 * const exercise: Exercise = {
 *   id: 'ex-static',
 *   statement_md: 'Calculate $2 + 3$',
 *   solution_md: 'The answer is $5$',
 *   distribution_mode: 'on_demand',
 *   difficulty: 1,
 *   tags: ['addition'],
 *   created_by: 'teacher-id',
 *   created_at: '2024-01-01',
 *   updated_at: '2024-01-01'
 * };
 *
 * const result = generateExerciseInstance(exercise);
 * // Content unchanged, seed = 0 (no randomization needed)
 * ```
 *
 * @example Parameterized exercise
 * ```typescript
 * const exercise: Exercise = {
 *   id: 'ex-param',
 *   variables: [
 *     { name: 'a', expression: '{{1..10}}' },
 *     { name: 'b', expression: '{{1..10}}' },
 *     { name: 'sum', expression: '{{eval:a+b}}' }
 *   ],
 *   statement_md: 'Calculate ${{a}} + {{b}}$',
 *   solution_md: 'The answer is ${{sum}}$',
 *   distribution_mode: 'per_student',
 *   difficulty: 1,
 *   tags: ['addition'],
 *   created_by: 'teacher-id',
 *   created_at: '2024-01-01',
 *   updated_at: '2024-01-01'
 * };
 *
 * const result = generateExerciseInstance(exercise, { seed: 42 });
 * if (result.success) {
 *   console.log(result.instance.resolvedVariables);
 *   // [
 *   //   { name: 'a', value: '7' },
 *   //   { name: 'b', value: '3' },
 *   //   { name: 'sum', value: '10' }
 *   // ]
 *   console.log(result.instance.statement_md); // "Calculate $7 + 3$"
 *   console.log(result.instance.solution_md);  // "The answer is $10$"
 * }
 * ```
 *
 * @example Error handling
 * ```typescript
 * const exercise: Exercise = {
 *   // ... exercise with circular dependency
 *   variables: [
 *     { name: 'a', expression: '{{b}}' },
 *     { name: 'b', expression: '{{a}}' }  // Circular!
 *   ],
 *   // ...
 * };
 *
 * const result = generateExerciseInstance(exercise);
 * if (!result.success) {
 *   console.error(result.errors);
 *   // ['Circular dependency detected: a -> b -> a']
 * }
 * ```
 */
export function generateExerciseInstance(
	exercise: Exercise,
	options: GenerateInstanceOptions = {}
): InstanceGenerationResult {
	try {
		// Generate seed if not provided
		const seed = options.seed ?? Math.floor(Math.random() * 1000000);

		// Check if exercise uses variations system
		if (isVariationsExercise(exercise)) {
			return generateVariationsInstance(exercise, seed, options);
		}

		// Legacy path: exercise without variations
		return generateLegacyInstance(exercise, seed, options);
	} catch (error) {
		// Catch any unexpected errors
		return {
			success: false,
			errors: [
				`Unexpected error during instance generation: ${error instanceof Error ? error.message : String(error)}`
			]
		};
	}
}

// ============================================================================
// VARIATIONS INSTANCE GENERATOR
// ============================================================================

/**
 * Generate instance for exercise using the variations system
 *
 * @param exercise - Exercise with variations array
 * @param seed - Random seed for reproducible generation
 * @param options - Generation options
 * @returns Generation result with instance or errors
 */
function generateVariationsInstance(
	exercise: Exercise,
	seed: number,
	options: GenerateInstanceOptions
): InstanceGenerationResult {
	// 1. Variation selection (R3): Use forced index if provided, otherwise seed-based
	const variationCount = exercise.variations!.length;
	let variationIndex: number;

	if (options.variationIndex !== undefined) {
		// Teacher-forced variation (clamped to valid range)
		variationIndex = Math.max(0, Math.min(options.variationIndex, variationCount - 1));
	} else {
		// Seed-based selection (deterministic per student)
		variationIndex = Math.abs(seed) % variationCount;
	}

	const selectedVariation = exercise.variations![variationIndex];

	// 2. Merge shared defaults with variation
	const resolvedVariation = resolveExerciseVariationWithShared(exercise.shared, selectedVariation);

	// 3. Check for circular dependencies in merged variables
	if (resolvedVariation.variables?.length) {
		const circularResult = detectCircularDependencies(resolvedVariation.variables);
		if (!circularResult.valid) {
			return {
				success: false,
				errors: circularResult.errors.map((e) => e.message)
			};
		}
	}

	// 4. Resolve variables
	let resolvedVariables: Array<{ name: string; value: string }> = [];
	try {
		resolvedVariables = resolvedVariation.variables?.length
			? resolveVariables(resolvedVariation.variables, seed)
			: [];
	} catch (error) {
		return {
			success: false,
			errors: [error instanceof Error ? error.message : String(error)]
		};
	}

	// 5. Resolve {{varName}} in content
	// Note: {{hint:id}} references are NOT resolved here - they stay as-is
	// The frontend component will handle rendering hints from the hints array
	let resolvedStatementMd: string;
	let resolvedSolutionMd: string;
	try {
		resolvedStatementMd = resolveText(resolvedVariation.statement_md, resolvedVariables);
		resolvedSolutionMd = resolveText(resolvedVariation.solution_md, resolvedVariables);
	} catch (error) {
		return {
			success: false,
			errors: [error instanceof Error ? error.message : String(error)]
		};
	}

	// 6. Parse AST if requested
	let statementAst;
	let solutionAst;

	if (options.parseAST === true) {
		try {
			statementAst = parseMarkdown(resolvedStatementMd);
			solutionAst = parseMarkdown(resolvedSolutionMd);
		} catch (error) {
			return {
				success: false,
				errors: [
					`Markdown parsing failed: ${error instanceof Error ? error.message : String(error)}`
				]
			};
		}
	}

	// 7. Construct instance with variation info
	const instance: ExerciseInstance = {
		// Metadata from template
		exerciseId: exercise.id,
		title: exercise.title,
		difficulty: exercise.difficulty,
		tags: exercise.tags,
		source: exercise.source,
		grade_levels: exercise.grade_levels,
		topic: exercise.topic,

		// Instance-specific data
		seed,
		resolvedVariables,

		// Resolved content
		statement_md: resolvedStatementMd,
		solution_md: resolvedSolutionMd,

		// Optional AST
		statement_ast: statementAst,
		solution_ast: solutionAst,

		// Generation metadata
		generatedAt: new Date(),
		distributionMode: exercise.distribution_mode,

		// Variation tracking
		selectedVariationIndex: variationIndex,
		selectedVariationLabel: selectedVariation.label,
		resolvedHints: resolvedVariation.hints
	};

	return {
		success: true,
		instance
	};
}

// ============================================================================
// LEGACY INSTANCE GENERATOR
// ============================================================================

/**
 * Generate instance for legacy exercise (without variations)
 *
 * This handles exercises that use the original format with:
 * - Direct statement_md/solution_md fields
 * - Optional variables array at exercise level
 *
 * @param exercise - Legacy exercise without variations
 * @param seed - Random seed for reproducible generation
 * @param options - Generation options
 * @returns Generation result with instance or errors
 */
function generateLegacyInstance(
	exercise: Exercise,
	seed: number,
	options: GenerateInstanceOptions
): InstanceGenerationResult {
	// Check if exercise is parameterized
	const parameterized = isParameterized(exercise);

	let resolvedStatementMd: string;
	let resolvedSolutionMd: string;
	let resolvedVariables: Array<{ name: string; value: string }> = [];

	if (parameterized) {
		// Parameterized: resolve variables and content

		// Check for circular dependencies first
		const circularResult = detectCircularDependencies(exercise.variables!);
		if (!circularResult.valid) {
			return {
				success: false,
				errors: circularResult.errors.map((e) => e.message)
			};
		}

		try {
			// Resolve variables using shared library
			resolvedVariables = resolveVariables(exercise.variables!, seed);

			// Resolve {{}} syntax in content using resolved variables
			resolvedStatementMd = resolveText(exercise.statement_md, resolvedVariables);
			resolvedSolutionMd = resolveText(exercise.solution_md, resolvedVariables);
		} catch (error) {
			// Catch errors from variable resolution or text resolution
			return {
				success: false,
				errors: [error instanceof Error ? error.message : String(error)]
			};
		}
	} else {
		// Static: passthrough content unchanged
		resolvedStatementMd = exercise.statement_md;
		resolvedSolutionMd = exercise.solution_md;
	}

	// Optionally parse markdown to AST
	let statementAst;
	let solutionAst;

	if (options.parseAST === true) {
		try {
			statementAst = parseMarkdown(resolvedStatementMd);
			solutionAst = parseMarkdown(resolvedSolutionMd);
		} catch (error) {
			return {
				success: false,
				errors: [
					`Markdown parsing failed: ${error instanceof Error ? error.message : String(error)}`
				]
			};
		}
	}

	// Construct instance
	const instance: ExerciseInstance = {
		// Metadata from template
		exerciseId: exercise.id,
		title: exercise.title,
		difficulty: exercise.difficulty,
		tags: exercise.tags,
		source: exercise.source,
		grade_levels: exercise.grade_levels,
		topic: exercise.topic,

		// Instance-specific data
		seed,
		resolvedVariables,

		// Resolved content
		statement_md: resolvedStatementMd,
		solution_md: resolvedSolutionMd,

		// Optional AST
		statement_ast: statementAst,
		solution_ast: solutionAst,

		// Generation metadata
		generatedAt: new Date(),
		distributionMode: exercise.distribution_mode
	};

	return {
		success: true,
		instance
	};
}

// ============================================================================
// SEED GENERATION UTILITIES
// ============================================================================

/**
 * Generate deterministic seed for per-student distribution
 *
 * Creates a reproducible seed from exerciseId and studentId.
 * Same student + same exercise = same seed = same variable values.
 *
 * This ensures students get consistent values when reviewing their work.
 *
 * @param exerciseId - Exercise UUID
 * @param studentId - Student UUID
 * @returns Deterministic seed (positive integer)
 *
 * @example
 * ```typescript
 * const seed1 = generateStudentSeed('ex-123', 'student-456');
 * const seed2 = generateStudentSeed('ex-123', 'student-456');
 * console.log(seed1 === seed2); // true (deterministic)
 *
 * const seed3 = generateStudentSeed('ex-123', 'student-789');
 * console.log(seed1 === seed3); // false (different student)
 * ```
 */
export function generateStudentSeed(exerciseId: string, studentId: string): number {
	// Combine IDs with separator to ensure uniqueness
	const combined = `${exerciseId}:student:${studentId}`;
	return hashStringToNumber(combined);
}

/**
 * Generate deterministic seed for per-group distribution
 *
 * Creates a reproducible seed from exerciseId and groupId.
 * All students in same group see same values.
 *
 * Useful for class assignments where everyone should work on the same problem.
 *
 * @param exerciseId - Exercise UUID
 * @param groupId - Group/Assignment UUID
 * @returns Deterministic seed (positive integer)
 *
 * @example
 * ```typescript
 * const assignmentId = 'assign-123';
 * const seed = generateGroupSeed('ex-456', assignmentId);
 * // All students in this assignment get same seed = same values
 * ```
 */
export function generateGroupSeed(exerciseId: string, groupId: string): number {
	// Combine IDs with separator to ensure uniqueness
	const combined = `${exerciseId}:group:${groupId}`;
	return hashStringToNumber(combined);
}

/**
 * Check if exercise has variables (is parameterized)
 *
 * Returns true if exercise has variables defined, false otherwise.
 * Static exercises (no variables) have their content passed through unchanged.
 *
 * @param exercise - Exercise to check
 * @returns True if parameterized, false if static
 *
 * @example
 * ```typescript
 * const staticExercise: Exercise = {
 *   // ... no variables field
 *   statement_md: 'Calculate $2 + 3$'
 * };
 * console.log(isParameterized(staticExercise)); // false
 *
 * const parameterizedExercise: Exercise = {
 *   variables: [{ name: 'a', expression: '{{1..10}}' }],
 *   statement_md: 'Calculate ${{a}} + 3$'
 * };
 * console.log(isParameterized(parameterizedExercise)); // true
 * ```
 */
export function isParameterized(exercise: Exercise): boolean {
	return exercise.variables !== undefined && exercise.variables.length > 0;
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

/**
 * Hash a string to a positive integer
 *
 * Simple hash function for generating deterministic seeds from strings.
 * Uses Java-style string hash algorithm.
 *
 * @param str - String to hash
 * @returns Positive integer (32-bit)
 *
 * @internal
 */
function hashStringToNumber(str: string): number {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		// Java string hash: h = 31 * h + c
		// Using bit shift optimization: (hash << 5) - hash = hash * 31
		hash = (hash << 5) - hash + char;
		// Convert to 32-bit integer
		hash = hash & hash;
	}

	// Return absolute value to ensure positive seed
	return Math.abs(hash);
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Generate multiple instances from a template
 *
 * Useful for creating practice sets or test banks with different values.
 *
 * @param exercise - Exercise template
 * @param count - Number of instances to generate
 * @param baseSeed - Base seed (instances will use baseSeed + index)
 * @returns Array of generation results
 *
 * @example Generate 10 practice instances
 * ```typescript
 * const results = generateMultipleInstances(exercise, 10);
 * const successes = results.filter(r => r.success);
 * console.log(`Generated ${successes.length} instances`);
 * ```
 *
 * @example Generate with deterministic seeds
 * ```typescript
 * const results = generateMultipleInstances(exercise, 5, 1000);
 * // Seeds: 1000, 1001, 1002, 1003, 1004
 * ```
 */
export function generateMultipleInstances(
	exercise: Exercise,
	count: number,
	baseSeed?: number
): InstanceGenerationResult[] {
	const results: InstanceGenerationResult[] = [];

	for (let i = 0; i < count; i++) {
		const seed = baseSeed !== undefined ? baseSeed + i : undefined;
		results.push(generateExerciseInstance(exercise, { seed }));
	}

	return results;
}
