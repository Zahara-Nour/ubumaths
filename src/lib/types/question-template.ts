/**
 * Converters between the raw `question_templates` row and the business
 * `QuestionTemplate` type.
 *
 * The table stores several fields as `jsonb` (`variations`, `shared`,
 * `options`, `default_display_options`, `test_specs`), which the generated
 * types expose as the `Json` union: a union carries no keys, so every consumer
 * used to cast it away. Casting at each call site means a schema change is
 * caught nowhere. Converting here means it is caught in one place.
 *
 * Two conversions are real, not cosmetic:
 * - Postgres says "absent" with `null`, TypeScript with `undefined`;
 * - `status` and `grades` are free-form `text` in the database. A value the
 *   application does not know is not silently promoted: an unknown status
 *   falls back to `draft` (the template stays out of the students' reach) and
 *   an unknown grade is dropped rather than smuggled into `GradeLevel[]`.
 */
import type { QuestionTemplate, QuestionVariation, TestSpec } from '$lib/questions/types';
import type { DisplayOptions } from '$lib/questions/types';
import type { GradeLevel } from '$lib/questions/types';
import { isGradeCode } from '$lib/types/grades';
import type { Json } from '$lib/types/database';

/** Row shape shared by every `question_templates` select (`select('*')`). */
export interface QuestionTemplateRow {
	id: string;
	title: string;
	description: string | null;
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
	status: string;
	grades: string[];
	delay: number | null;
	variations: Json;
	shared: Json | null;
	options: Json | null;
	default_display_options: Json | null;
	test_specs: Json | null;
	multiple_answers: boolean | null;
	exercise_instruction: string | null;
	created_at: string | null;
	updated_at: string | null;
	created_by: string | null;
}

/** Keeps a template out of reach when the database holds an unknown status. */
function asTemplateStatus(value: string): QuestionTemplate['status'] {
	return value === 'published' ? 'published' : 'draft';
}

/** Drops the grades the application does not know rather than widening the union. */
export function asGradeLevels(value: string[] | null): GradeLevel[] {
	return (value ?? []).filter(isGradeCode);
}

/** `variations` is `NOT NULL` but free-form: an unusable value yields no variation. */
function asVariations(value: Json): QuestionVariation[] {
	return Array.isArray(value) ? (value as unknown as QuestionVariation[]) : [];
}

function asOptional<T>(value: Json | null): T | undefined {
	return value === null || value === undefined ? undefined : (value as unknown as T);
}

export function toQuestionTemplate(row: QuestionTemplateRow): QuestionTemplate {
	return {
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		theme: row.theme,
		domain: row.domain,
		subdomain: row.subdomain ?? undefined,
		level: row.level,
		status: asTemplateStatus(row.status),
		grades: asGradeLevels(row.grades),
		delay: row.delay ?? undefined,
		variations: asVariations(row.variations),
		shared: asOptional<QuestionTemplate['shared']>(row.shared),
		options: asOptional<QuestionTemplate['options']>(row.options),
		defaultDisplayOptions: asOptional<DisplayOptions>(row.default_display_options),
		testSpecs: asOptional<TestSpec[]>(row.test_specs),
		multipleAnswers: row.multiple_answers ?? undefined,
		exerciseInstruction: row.exercise_instruction ?? undefined,
		created_at: row.created_at ?? undefined,
		updated_at: row.updated_at ?? undefined,
		created_by: row.created_by ?? undefined
	};
}
