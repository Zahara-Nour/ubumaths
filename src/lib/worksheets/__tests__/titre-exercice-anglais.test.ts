/**
 * Le titre d'un exercice dans la langue de la fiche
 * =================================================
 *
 * Demandé par David le 2026-11-25 : une fiche anglaise imprimait le titre de
 * chaque exercice en français. Le titre est une colonne (`exercises.title`) ;
 * sa traduction vit dans `exercises.translations` ({"en": {"title": …}}), sur
 * le modèle des fiches et des sections.
 *
 * Chemin de la page de la fiche : réponse validée de `GET /api/worksheets/[id]`,
 * copie, Typst du PDF. Plus l'écriture : le schéma de l'enregistrement, et la
 * réponse qui rend l'exercice à l'éditeur.
 */
import { describe, it, expect } from 'vitest';
import { worksheetDetailResponseSchema } from '#lib/server/validation/worksheets.ts';
import { exerciseResponseSchema, updateExerciseSchema } from '#lib/server/validation/exercises.ts';
import {
	buildWorksheetCopy,
	localizedExerciseTitle,
	type WorksheetForCopy
} from '../worksheet-copy';
import { generateWorksheetTypst } from '#lib/typst/generators/worksheet-generator.ts';
import type { WorksheetConfig, WorksheetRow } from '#lib/types/worksheets.ts';
import type { ContentLocale } from '#lib/types/locale.ts';

// ============================================================================
// FIXTURES — une fiche, un exercice titré en français et en anglais
// ============================================================================

const NOW = '2026-11-25T08:00:00.000Z';
const WORKSHEET_ID = '00000000-0000-4000-8000-000000000001';
const EXERCISE_ID = '00000000-0000-4000-8000-000000000003';
const AUTHOR_ID = '00000000-0000-4000-8000-000000000004';

const FRENCH = 'Calculer avec les formules';
const ENGLISH = 'Using formulas';

function apiRows(language: ContentLocale, translations: unknown) {
	return {
		worksheet: {
			id: WORKSHEET_ID,
			title: 'Fiche',
			description: null,
			type: 'worksheet',
			config: { language },
			status: 'draft',
			version: 1,
			published_at: null,
			archived_at: null,
			estimated_duration_minutes: null,
			total_points: null,
			grades: [],
			tags: [],
			created_by: AUTHOR_ID,
			school_id: null,
			created_at: NOW,
			updated_at: NOW,
			translations: null,
			sections: [],
			exercises: [
				{
					id: '00000000-0000-4000-8000-000000000005',
					worksheet_id: WORKSHEET_ID,
					exercise_id: EXERCISE_ID,
					section_id: null,
					position: 1,
					points: null,
					variant_mode: 'none',
					variant_config: {},
					custom_instructions: null,
					is_essential: false,
					created_at: NOW,
					updated_at: NOW,
					translations: null,
					exercise: {
						id: EXERCISE_ID,
						title: FRENCH,
						translations,
						variables: null,
						shared: null,
						variations: [{ label: 'autonomous', statement_md: 'Calculer', solution_md: 'ok' }]
					}
				}
			]
		}
	};
}

/** Le Typst du PDF de la page de la fiche, depuis la réponse validée de l'API */
function pdfOfPage(language: ContentLocale, translations: unknown): string {
	const ws = worksheetDetailResponseSchema.parse(apiRows(language, translations))
		.worksheet as unknown as WorksheetForCopy;
	const instance = buildWorksheetCopy(ws, {
		assignmentId: null,
		worksheetId: WORKSHEET_ID,
		level: 'autonomous',
		individualized: false,
		locale: language
	});
	return generateWorksheetTypst({
		worksheet: ws as unknown as WorksheetRow,
		instance,
		config: ws.config as WorksheetConfig,
		mode: 'worksheet'
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe('PDF de la page de la fiche : titre de l’exercice', () => {
	it('fiche anglaise : le titre anglais', () => {
		const typst = pdfOfPage('en', { en: { title: ENGLISH } });
		expect(typst).toContain(ENGLISH);
		expect(typst).not.toContain(FRENCH);
	});

	it('fiche française : le titre français, même si l’anglais existe', () => {
		const typst = pdfOfPage('fr', { en: { title: ENGLISH } });
		expect(typst).toContain(FRENCH);
		expect(typst).not.toContain(ENGLISH);
	});

	it('fiche anglaise sans titre anglais : le titre français, rien ne disparaît', () => {
		expect(pdfOfPage('en', null)).toContain(FRENCH);
	});
});

describe('localizedExerciseTitle', () => {
	it('titre anglais vide : le titre français', () => {
		expect(
			localizedExerciseTitle({ title: FRENCH, translations: { en: { title: '' } } }, 'en')
		).toBe(FRENCH);
	});

	it('traductions illisibles : le titre français, sans planter', () => {
		expect(localizedExerciseTitle({ title: FRENCH, translations: 'oups' }, 'en')).toBe(FRENCH);
	});

	it('pas d’exercice : null', () => {
		expect(localizedExerciseTitle(null, 'en')).toBeNull();
	});
});

describe('enregistrement de l’exercice : le titre anglais', () => {
	it('est accepté, espaces retirés', () => {
		const parsed = updateExerciseSchema.safeParse({
			translations: { en: { title: `  ${ENGLISH}  ` } }
		});
		expect(parsed.success).toBe(true);
		expect(parsed.data?.translations).toEqual({ en: { title: ENGLISH } });
	});

	it('trop long : refusé, avec la limite du titre français (200)', () => {
		const parsed = updateExerciseSchema.safeParse({
			translations: { en: { title: 'x'.repeat(201) } }
		});
		expect(parsed.success).toBe(false);
	});

	it('langue inconnue ou champ inconnu : refusé', () => {
		expect(
			updateExerciseSchema.safeParse({ translations: { de: { title: 'Formeln' } } }).success
		).toBe(false);
		expect(
			updateExerciseSchema.safeParse({ translations: { en: { statement_md: 'x' } } }).success
		).toBe(false);
	});

	it('effacer la traduction (null) : accepté', () => {
		expect(updateExerciseSchema.safeParse({ translations: null }).success).toBe(true);
	});

	it('la réponse rend la traduction à l’éditeur (pas retirée en silence)', () => {
		const parsed = exerciseResponseSchema.parse({
			id: EXERCISE_ID,
			category: 'application',
			title: FRENCH,
			translations: { en: { title: ENGLISH } },
			is_public: false,
			search_indexed: false,
			created_by: AUTHOR_ID,
			created_at: NOW,
			updated_at: NOW
		});
		expect(parsed).toMatchObject({ translations: { en: { title: ENGLISH } } });
	});
});
