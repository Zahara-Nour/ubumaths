/**
 * Shared mappings between the Python exercise DB row, the ExerciseForm
 * component state, and the API submit body.
 *
 * Centralised here so the round-trip test (scripts/test-exercise-round-trip.ts)
 * and the two callers (/python-exercises/new and /python-exercises/[id]/edit)
 * cannot drift silently — any change to `buildInitialForm` or
 * `buildSubmitBody` is automatically picked up by the test.
 */

import type { ValidationConfig } from '$lib/types/python-exercises';

export type Level = 'college' | 'lycee' | 'nsi' | 'etudiant';

export type ExerciseFormState = {
	title: string;
	description: string;
	instructions: string;
	starter_code: string;
	solution_code: string;
	validation_config: ValidationConfig;
	level: Level;
	tags: string[];
	source: string;
	is_public: boolean;
};

/**
 * Structural type matching either a `PythonExercise` (API GET response)
 * or a raw `python_exercises` DB row. The fields used by `buildInitialForm`
 * are all that matter — this avoids tying the helper to one specific type.
 */
export type ExerciseSource = {
	title: string;
	description: string | null;
	instructions: string | null;
	starter_code: string | null;
	solution_code: string;
	validation_config: ValidationConfig;
	level: string;
	tags: string[];
	source: string | null;
	is_public: boolean;
};

/** Empty form, ready to bind on /new. */
export function emptyExerciseForm(): ExerciseFormState {
	return {
		title: '',
		description: '',
		instructions: '',
		starter_code: '',
		solution_code: '',
		validation_config: {
			behavior: {
				kind: 'output',
				test_cases: [{ input: '', expected_output: '' }],
				comparison: { kind: 'exact' }
			}
		},
		level: 'lycee',
		tags: [],
		source: '',
		is_public: true
	};
}

/**
 * Map a DB row / API GET response to the form state used by ExerciseForm.
 * Nullable text fields collapse to empty strings (the textarea/input model).
 */
export function buildInitialForm(ex: ExerciseSource): ExerciseFormState {
	return {
		title: ex.title,
		description: ex.description ?? '',
		instructions: ex.instructions ?? '',
		starter_code: ex.starter_code ?? '',
		solution_code: ex.solution_code,
		validation_config: ex.validation_config,
		level: ex.level as Level,
		tags: ex.tags,
		source: ex.source ?? '',
		is_public: ex.is_public
	};
}

/**
 * Body shared by POST /api/python-exercises (create) and
 * PUT  /api/python-exercises/[id]  (update). The PUT caller adds an `id`
 * field on top.
 *
 * Trim semantics (caught by the round-trip test):
 *   - `title` : single-line, trimmed (defensive against accidental spaces)
 *   - `source`: single-line, trimmed; empty → null
 *   - `description` / `instructions` / `starter_code` : multi-line content,
 *     preserved byte-for-byte (esp. trailing \n in code/markdown).
 *     Only the empty-vs-content check uses .trim().
 *   - `solution_code` : preserved byte-for-byte.
 */
export function buildSubmitBody(form: ExerciseFormState) {
	return {
		title: form.title.trim(),
		description: form.description.trim() === '' ? null : form.description,
		instructions: form.instructions.trim() === '' ? null : form.instructions,
		starter_code: form.starter_code.trim() === '' ? null : form.starter_code,
		solution_code: form.solution_code,
		validation_config: form.validation_config,
		level: form.level,
		tags: form.tags,
		source: form.source.trim() === '' ? null : form.source.trim(),
		is_public: form.is_public
	};
}
