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

import type { ExerciseTranslations, TranslatedExerciseContent } from './types';

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
