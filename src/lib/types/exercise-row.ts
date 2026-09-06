/**
 * Converter between the raw `exercises` row and the business `Exercise` type.
 *
 * The table keeps `variables`, `variations`, `shared` and `resources` as
 * `jsonb` — exposed as the `Json` union, which carries no keys — and stores
 * `category` and `distribution_mode` as free-form `text`. Converting here means
 * a schema change surfaces in one place instead of being cast away at each
 * page.
 *
 * Unknown values are not promoted: an unknown category becomes `automatisme`
 * and an unknown distribution mode becomes `on_demand`, the two settings that
 * change nothing for the student (a fresh instance on each attempt) rather than
 * pinning a shared or per-student instance that was never asked for.
 */
import type {
	Exercise,
	ExerciseCategory,
	ExerciseResource,
	ExerciseVariation,
	DistributionMode,
	SharedExerciseDefaults,
	Variable
} from '$lib/exercises/types';
import { EXERCISE_CATEGORIES } from '$lib/exercises/types';
import type { GradeCode } from '$lib/types/grades';
import { isGradeCode } from '$lib/types/grades';
import type { Json } from '$lib/types/database';

/** Row shape shared by every `exercises` select (`select('*')`). */
export interface ExerciseRow {
	id: string;
	slug: string | null;
	title: string | null;
	source: string | null;
	topic: string | null;
	category: string;
	distribution_mode: string;
	is_public: boolean;
	grades: string[] | null;
	generic_functions: string[] | null;
	variables: Json;
	variations: Json | null;
	shared: Json | null;
	resources: Json | null;
	created_at: string;
	updated_at: string;
	created_by: string;
}

export function asExerciseCategory(value: string): ExerciseCategory {
	const known = EXERCISE_CATEGORIES.find((c) => c.value === value);
	return known ? known.value : 'automatisme';
}

export function asDistributionMode(value: string): DistributionMode {
	return value === 'per_student' || value === 'per_group' ? value : 'on_demand';
}

function asArray<T>(value: Json | null): T[] | undefined {
	return Array.isArray(value) ? (value as unknown as T[]) : undefined;
}

/**
 * @param tags read from the `exercise_tags` join table — tags are not a column
 * of `exercises`.
 */
export function toExercise(row: ExerciseRow, tags: string[] = []): Exercise {
	return {
		id: row.id,
		// Postgres says "absent" with `null`, TypeScript with `undefined`.
		slug: row.slug ?? undefined,
		title: row.title ?? undefined,
		source: row.source ?? undefined,
		topic: row.topic ?? undefined,
		category: asExerciseCategory(row.category),
		tags,
		distribution_mode: asDistributionMode(row.distribution_mode),
		is_public: row.is_public,
		// A grade the application does not know is dropped rather than smuggled
		// into `GradeCode[]`.
		grades: (row.grades ?? []).filter(isGradeCode) as GradeCode[],
		generic_functions: row.generic_functions ?? undefined,
		variables: asArray<Variable>(row.variables),
		variations: asArray<ExerciseVariation>(row.variations),
		resources: asArray<ExerciseResource>(row.resources),
		shared:
			typeof row.shared === 'object' && row.shared !== null && !Array.isArray(row.shared)
				? (row.shared as unknown as SharedExerciseDefaults)
				: undefined,
		created_at: row.created_at,
		updated_at: row.updated_at,
		created_by: row.created_by
	};
}
