/**
 * Content locales
 * ===============
 *
 * Locales authored content can be written in. French is the source of truth:
 * it lives in the base fields (`statement_md`, `title`, `instructions`, ...),
 * and every other locale is stored as a translation carrying only what it
 * overrides. Anything a translation leaves out falls back to French, so a
 * partial translation never leaves a hole in a generated document.
 *
 * This is about *content* written by the teacher, not about the application UI,
 * which stays in French.
 */

export const CONTENT_LOCALES = ['fr', 'en'] as const;

export type ContentLocale = (typeof CONTENT_LOCALES)[number];

/** Locales stored as a translation rather than in the base fields. */
export type TranslatedLocale = Exclude<ContentLocale, 'fr'>;

/** Default locale when nothing is specified: the source of truth. */
export const DEFAULT_CONTENT_LOCALE: ContentLocale = 'fr';

/**
 * Date locale used when rendering a document in a given content locale.
 * Kept here so the PDF, the UI and the tests agree on a single mapping.
 */
export const DATE_LOCALES: Record<ContentLocale, string> = {
	fr: 'fr-FR',
	en: 'en-US'
};

/**
 * Typst `lang` value for a content locale. It drives hyphenation and smart
 * quotes, so an English worksheet must not keep `lang: "fr"`.
 */
export const TYPST_LANGS: Record<ContentLocale, string> = {
	fr: 'fr',
	en: 'en'
};

export function isContentLocale(value: unknown): value is ContentLocale {
	return typeof value === 'string' && (CONTENT_LOCALES as readonly string[]).includes(value);
}
