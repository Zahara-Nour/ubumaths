/**
 * Worksheet Instance Generator
 * =============================
 *
 * Generates unique worksheet instances for students with resolved parameters.
 * Supports multiple variant modes and deterministic generation based on seeds.
 *
 * Uses the central Exercise generator for consistency with the exercise system.
 */

import type {
	WorksheetConfig,
	VariantConfig,
	VariantMode,
	ResolvedExercise,
	InstanceData,
	WorksheetExerciseWithExercise
} from '$lib/types/worksheets';
import type { Exercise } from '$lib/exercises/types';
import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';

/**
 * Parameters for generating a worksheet instance
 */
export interface GenerateInstanceParams {
	worksheetId: string;
	studentId: string;
	exercises: WorksheetExerciseWithExercise[];
	config: WorksheetConfig;
}

/**
 * Generates a deterministic seed based on worksheet ID, student ID, and variant configuration
 */
function generateSeed(
	worksheetId: string,
	studentId: string,
	variantMode: VariantMode,
	variantConfig?: VariantConfig
): number {
	// Create a simple hash from the combined IDs
	const baseString = `${worksheetId}-${studentId}`;
	let hash = 0;
	for (let i = 0; i < baseString.length; i++) {
		const char = baseString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	// Apply variant mode specific transformations
	switch (variantMode) {
		case 'none':
			// Same seed for everyone (based only on worksheet)
			return Math.abs(worksheetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));

		case 'individual':
			// Unique seed per student
			return Math.abs(hash);

		case 'n_versions': {
			// Limited number of versions
			const nVersions = variantConfig?.n_versions || 3;
			const versionIndex = Math.abs(hash) % nVersions;
			// Use worksheet ID + version as seed
			return Math.abs(
				worksheetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
					versionIndex * 1000
			);
		}

		case 'group': {
			// Students grouped by seed
			const groupSize = variantConfig?.group_size || 4;
			const groupIndex = Math.floor((Math.abs(hash) % 100) / groupSize);
			return Math.abs(
				worksheetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + groupIndex * 1000
			);
		}

		default:
			// Default to individual
			return Math.abs(hash);
	}
}

/**
 * Gets the variant version identifier (for n_versions mode)
 */
function getVariantVersion(
	studentId: string,
	variantMode: VariantMode,
	variantConfig?: VariantConfig
): string | null {
	if (variantMode !== 'n_versions') {
		return null;
	}

	const nVersions = variantConfig?.n_versions || 3;
	const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const versionIndex = Math.abs(hash) % nVersions;

	// Return version as A, B, C, etc.
	return String.fromCharCode(65 + versionIndex);
}

/**
 * Gets the group identifier (for group mode)
 */
function getGroupId(
	studentId: string,
	variantMode: VariantMode,
	variantConfig?: VariantConfig
): string | null {
	if (variantMode !== 'group') {
		return null;
	}

	const groupSize = variantConfig?.group_size || 4;
	const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const groupIndex = Math.floor((Math.abs(hash) % 100) / groupSize);

	return `G${groupIndex + 1}`;
}

/**
 * Shuffles an array using Fisher-Yates algorithm with a seeded random
 */
function shuffleArray<T>(array: T[], seed: number): T[] {
	const shuffled = [...array];
	let currentIndex = shuffled.length;

	// Simple seeded random generator
	let randomSeed = seed;
	const random = () => {
		randomSeed = (randomSeed * 9301 + 49297) % 233280;
		return randomSeed / 233280;
	};

	while (currentIndex !== 0) {
		const randomIndex = Math.floor(random() * currentIndex);
		currentIndex--;

		// Swap elements
		[shuffled[currentIndex], shuffled[randomIndex]] = [
			shuffled[randomIndex],
			shuffled[currentIndex]
		];
	}

	return shuffled;
}

/**
 * Converts worksheet exercise data to an Exercise template for the generator
 *
 * Note: Audit fields (created_at, updated_at, created_by) are set to placeholders
 * since they're not used by the generator but required by the Exercise type.
 */
function toExerciseTemplate(worksheetExercise: WorksheetExerciseWithExercise): Exercise {
	const ex = worksheetExercise.exercise;
	if (!ex) {
		throw new Error(`Exercise not found for worksheet_exercise ${worksheetExercise.id}`);
	}

	// Variations are the single source of truth - legacy fields are ignored
	if (!ex.variations || !Array.isArray(ex.variations) || ex.variations.length === 0) {
		throw new Error(
			`Exercise ${ex.id} has no variations. All exercises must use the variations system.`
		);
	}

	return {
		id: ex.id,
		title: ex.title,
		// Legacy fields deprecated - content comes from variations
		variables: ex.variables ?? undefined,
		shared: ex.shared ?? undefined,
		variations: ex.variations,
		distribution_mode: 'on_demand', // Worksheets handle their own distribution
		category: (ex.category ?? 'automatisme') as Exercise['category'],
		tags: [],
		// Required audit fields (not used by generator, but required by Exercise type)
		created_at: worksheetExercise.created_at,
		updated_at: worksheetExercise.updated_at,
		created_by: worksheetExercise.worksheet_id // Use worksheet_id as placeholder
	};
}

/**
 * Resolves an exercise with parameterized content using the central Exercise generator
 */
function resolveExercise(
	exercise: WorksheetExerciseWithExercise,
	position: number,
	seed: number,
	variantConfig?: VariantConfig
): ResolvedExercise {
	if (!exercise.exercise) {
		throw new Error(`Exercise not found for worksheet_exercise ${exercise.id}`);
	}

	// Convert to Exercise template
	const template = toExerciseTemplate(exercise);

	// Apply parameter overrides from variant config if provided
	if (variantConfig?.parameter_overrides && template.variables) {
		for (const [name, value] of Object.entries(variantConfig.parameter_overrides)) {
			const existingIndex = template.variables.findIndex((v) => v.name === name);
			if (existingIndex >= 0) {
				template.variables[existingIndex].expression = String(value);
			}
		}
	}

	// Use the central exercise generator with AST parsing enabled
	// Variation selection (R3): Pass teacher-forced index if set
	const result = generateExerciseInstance(template, {
		seed: seed + position,
		parseAST: true,
		variationIndex: exercise.variation_index ?? undefined
	});

	if (!result.success) {
		const errorMessage = result.errors?.join(', ') ?? 'Unknown error';
		throw new Error(`Failed to generate exercise instance: ${errorMessage}`);
	}

	// Type guard: result.success === true guarantees instance is defined
	const instance = result.instance;
	if (!instance) {
		throw new Error('Instance generation succeeded but returned no instance');
	}

	// Build parameters map from resolved variables
	const parameters: Record<string, number | string> = {};
	for (const resolved of instance.resolvedVariables) {
		parameters[resolved.name] = resolved.value;
	}

	return {
		exercise_id: exercise.exercise_id,
		title: exercise.exercise?.title ?? null,
		position,
		section_id: exercise.section_id ?? null,
		parameters,
		statement: instance.statement_md,
		solution: instance.solution_md,
		statement_ast: instance.statement_ast,
		solution_ast: instance.solution_ast,
		selectedVariationIndex: instance.selectedVariationIndex,
		selectedVariationLabel: instance.selectedVariationLabel,
		hints: instance.resolvedHints
	};
}

/**
 * Generates a complete worksheet instance for a student
 */
export function generateWorksheetInstance(params: GenerateInstanceParams): InstanceData {
	const { worksheetId, studentId, exercises, config } = params;

	// Group exercises by section (null section = no section)
	const exercisesBySection = new Map<string | null, WorksheetExerciseWithExercise[]>();
	for (const exercise of exercises) {
		const sectionId = exercise.section_id;
		if (!exercisesBySection.has(sectionId)) {
			exercisesBySection.set(sectionId, []);
		}
		exercisesBySection.get(sectionId)!.push(exercise);
	}

	// Sort exercises within each section by position
	for (const sectionExercises of exercisesBySection.values()) {
		sectionExercises.sort((a, b) => a.position - b.position);
	}

	const resolvedExercises: ResolvedExercise[] = [];
	let globalPosition = 0;

	// Process exercises section by section
	for (const [sectionId, sectionExercises] of exercisesBySection) {
		let exercisesToProcess = [...sectionExercises];

		// Shuffle within section if configured
		if (config.shuffle_within_sections && sectionId !== null) {
			// Use a section-specific seed component
			const sectionSeed =
				worksheetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
				(sectionId ? sectionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0);
			exercisesToProcess = shuffleArray(exercisesToProcess, sectionSeed);
		}

		// Process each exercise in the section
		for (const exercise of exercisesToProcess) {
			const seed = generateSeed(
				worksheetId,
				studentId,
				exercise.variant_mode,
				exercise.variant_config
			);

			const resolved = resolveExercise(exercise, globalPosition, seed, exercise.variant_config);

			resolvedExercises.push(resolved);
			globalPosition++;
		}
	}

	// Global shuffle if configured (ignores sections)
	let finalExercises = resolvedExercises;
	const exerciseOrder: number[] = [];

	if (config.shuffle_exercises) {
		const globalSeed = generateSeed(worksheetId, studentId, 'individual');
		const indices = Array.from({ length: resolvedExercises.length }, (_, i) => i);
		const shuffledIndices = shuffleArray(indices, globalSeed);

		finalExercises = shuffledIndices.map((i) => {
			exerciseOrder.push(resolvedExercises[i].position);
			return {
				...resolvedExercises[i],
				position: exerciseOrder.length - 1
			};
		});
	} else {
		// Keep original order
		for (let i = 0; i < resolvedExercises.length; i++) {
			exerciseOrder.push(i);
		}
	}

	// Determine variant mode from first exercise (or default to 'none')
	const primaryVariantMode = exercises[0]?.variant_mode || 'none';
	const primaryVariantConfig = exercises[0]?.variant_config;

	// Build instance data
	const instanceData: InstanceData = {
		exercises: finalExercises,
		variant_info: {
			seed: generateSeed(worksheetId, studentId, primaryVariantMode, primaryVariantConfig),
			version: getVariantVersion(studentId, primaryVariantMode, primaryVariantConfig) || undefined,
			group_id: getGroupId(studentId, primaryVariantMode, primaryVariantConfig) || undefined
		}
	};

	// Include exercise order if shuffled
	if (config.shuffle_exercises || config.shuffle_within_sections) {
		instanceData.exercise_order = exerciseOrder;
	}

	return instanceData;
}

/**
 * Generates a preview instance with optional custom seed
 */
export function generatePreviewInstance(
	params: Omit<GenerateInstanceParams, 'studentId'> & {
		studentId?: string;
		variantSeed?: number;
	}
): InstanceData {
	const { worksheetId, exercises, config, variantSeed } = params;

	// Use provided student ID or generate a preview ID
	const studentId = params.studentId || `preview-${Date.now()}`;

	// If a specific seed is provided, override the generation
	if (variantSeed !== undefined) {
		const resolvedExercises: ResolvedExercise[] = [];

		for (let i = 0; i < exercises.length; i++) {
			const exercise = exercises[i];
			const resolved = resolveExercise(exercise, i, variantSeed, exercise.variant_config);
			resolvedExercises.push(resolved);
		}

		return {
			exercises: resolvedExercises,
			variant_info: {
				seed: variantSeed,
				version: 'Preview'
			}
		};
	}

	// Otherwise generate normally
	return generateWorksheetInstance({
		worksheetId,
		studentId,
		exercises,
		config
	});
}
