/**
 * Editing an exercise translation
 * ===============================
 *
 * The editor writes one field at a time, and the result must stay honest: an
 * exercise whose English tab was opened, typed into, then emptied has to end up
 * exactly as it started — French only. Otherwise it keeps an empty
 * `translations` that makes it look translated in the UI (the EN badge) and in
 * any future "what is left to translate" listing.
 *
 * Kept out of the Svelte component so the rule can be tested without a browser.
 */

import type { ExerciseTranslations, TranslatedExerciseContent, TranslatedHint } from './types';

/** Fields the variation editor can translate today. */
export type TranslatableField = Extract<
	keyof TranslatedExerciseContent,
	'statement_md' | 'solution_md'
>;

/**
 * Translations with `field` set to `value`, or removed when `value` is blank.
 *
 * Returns `undefined` once nothing is translated any more, so the caller can
 * store it as-is and never persist an empty container.
 */
export function withTranslatedField(
	translations: ExerciseTranslations | undefined,
	field: TranslatableField,
	value: string
): ExerciseTranslations | undefined {
	const en: TranslatedExerciseContent = { ...translations?.en };

	if (value.trim()) {
		en[field] = value;
	} else {
		delete en[field];
	}

	if (Object.keys(en).length === 0) {
		// Nothing translated left: drop the locale, then the map itself.
		const rest = { ...translations };
		delete rest.en;
		return Object.keys(rest).length === 0 ? undefined : rest;
	}

	return { ...translations, en };
}

/** Text of a translated field, or an empty string when it has none. */
export function translatedField(
	translations: ExerciseTranslations | undefined,
	field: TranslatableField
): string {
	return translations?.en?.[field] ?? '';
}

/**
 * Whether a variation should be shown as translated.
 *
 * The statement is what decides: a translated solution alone still produces a
 * French statement in the worksheet, so it is not a translated exercise.
 */
export function hasEnglishStatement(translations: ExerciseTranslations | undefined): boolean {
	return Boolean(translations?.en?.statement_md?.trim());
}

/** Fields of a hint that carry text, and can therefore be translated. */
export type TranslatableHintField = keyof TranslatedHint;

/**
 * Translations with one field of one hint set, or removed when blank.
 *
 * Hints are keyed by id rather than mirrored as a list precisely so that a
 * translation can never touch `id`, `type` or `url` — the three fields the
 * `{{hint:id}}` references in the statement depend on. Pruning cascades from
 * the field up to the whole map, so a hint typed then cleared leaves nothing
 * behind, exactly like a cleared statement.
 */
export function withTranslatedHint(
	translations: ExerciseTranslations | undefined,
	hintId: string,
	field: TranslatableHintField,
	value: string
): ExerciseTranslations | undefined {
	const hints = { ...translations?.en?.hints };
	const hint: TranslatedHint = { ...hints[hintId] };

	if (value.trim()) {
		hint[field] = value;
	} else {
		delete hint[field];
	}

	if (Object.keys(hint).length > 0) {
		hints[hintId] = hint;
	} else {
		delete hints[hintId];
	}

	const en: TranslatedExerciseContent = { ...translations?.en };
	if (Object.keys(hints).length > 0) {
		en.hints = hints;
	} else {
		delete en.hints;
	}

	if (Object.keys(en).length === 0) {
		const rest = { ...translations };
		delete rest.en;
		return Object.keys(rest).length === 0 ? undefined : rest;
	}

	return { ...translations, en };
}

/** Translated text of one hint field, or an empty string when it has none. */
export function translatedHintField(
	translations: ExerciseTranslations | undefined,
	hintId: string,
	field: TranslatableHintField
): string {
	return translations?.en?.hints?.[hintId]?.[field] ?? '';
}
