/**
 * Séries de chapitre — validation des formulaires du professeur
 *
 * La forme est bornée à la liste de la contrainte CHECK (Q124 a : flash-cards
 * par défaut, ou entraînement) ; jamais une forme d'évaluation, qui serait
 * notée.
 */

import { describe, it, expect } from 'vitest';
import { linkSeriesSchema, setSeriesFormSchema, unlinkSeriesSchema } from '../chapter-series';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('linkSeriesSchema', () => {
	it('forme absente → flash (défaut Q124 a)', () => {
		expect(linkSeriesSchema.parse({ seriesId: UUID })).toEqual({ seriesId: UUID, form: 'flash' });
	});

	it('accepte entraînement', () => {
		expect(linkSeriesSchema.parse({ seriesId: UUID, form: 'interactive' }).form).toBe(
			'interactive'
		);
	});

	it.each(['course', 'display', 'evaluation', ''])('refuse la forme « %s »', (form) => {
		expect(linkSeriesSchema.safeParse({ seriesId: UUID, form }).success).toBe(false);
	});

	it('refuse un identifiant qui n’est pas un UUID', () => {
		expect(linkSeriesSchema.safeParse({ seriesId: 'abc' }).success).toBe(false);
		expect(linkSeriesSchema.safeParse({ seriesId: null }).success).toBe(false);
	});
});

describe('setSeriesFormSchema / unlinkSeriesSchema', () => {
	it('exigent l’UUID du rattachement', () => {
		expect(setSeriesFormSchema.safeParse({ chapterSeriesId: UUID, form: 'flash' }).success).toBe(
			true
		);
		expect(setSeriesFormSchema.safeParse({ chapterSeriesId: UUID }).success).toBe(false);
		expect(unlinkSeriesSchema.safeParse({ chapterSeriesId: 'x' }).success).toBe(false);
		expect(unlinkSeriesSchema.safeParse({ chapterSeriesId: UUID }).success).toBe(true);
	});
});
