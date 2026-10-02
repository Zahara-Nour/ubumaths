/**
 * Séries de chapitre — schémas de validation
 *
 * Rattacher une série enregistrée à un chapitre, choisir sa forme (Q124 a),
 * la retirer. Les identifiants viennent d'un formulaire : tous sont des UUID,
 * et la forme est bornée à la liste fermée de la contrainte CHECK
 * `chapter_series_form_check`.
 */

import { z } from 'zod';
import { uuidSchema } from './common';

/** Miroir de `chapter_series_form_check` : flash-cards (défaut) ou entraînement. */
export const CHAPTER_SERIES_FORMS = ['flash', 'interactive'] as const;

export const chapterSeriesFormSchema = z.enum(CHAPTER_SERIES_FORMS);

export const linkSeriesSchema = z.object({
	seriesId: uuidSchema,
	form: chapterSeriesFormSchema.default('flash')
});

export const setSeriesFormSchema = z.object({
	chapterSeriesId: uuidSchema,
	form: chapterSeriesFormSchema
});

export const unlinkSeriesSchema = z.object({
	chapterSeriesId: uuidSchema
});
