/**
 * Les textes anglais d'une fiche arrivent jusqu'au PDF anglais
 * ============================================================
 *
 * Bug signalé par David le 2026-11-25 : une fiche anglaise imprimait ses titres
 * de section en français. Les titres anglais étaient en base, mais le schéma de
 * réponse de `GET /api/worksheets/[id]` ne connaissait pas `translations` et
 * retirait la clé en silence — sur les sections, la fiche et ses exercices.
 * La page de la fiche (aperçu et PDF) et ses éditeurs les recevaient donc vides.
 *
 * Le test passe par le même chemin que la page : la réponse validée, la copie,
 * puis le Typst du PDF.
 */
import { describe, it, expect } from 'vitest';
import { worksheetDetailResponseSchema } from '#lib/server/validation/worksheets.ts';
import { buildWorksheetCopy, type WorksheetForCopy } from '../worksheet-copy';
import { generateWorksheetTypst } from '#lib/typst/generators/worksheet-generator.ts';
import type { WorksheetConfig, WorksheetRow } from '#lib/types/worksheets.ts';

// ============================================================================
// FIXTURES — une fiche anglaise, une section, un exercice, comme la base les rend
// ============================================================================

const NOW = '2026-11-25T08:00:00.000Z';
const WORKSHEET_ID = '00000000-0000-4000-8000-000000000001';
const SECTION_ID = '00000000-0000-4000-8000-000000000002';
const EXERCISE_ID = '00000000-0000-4000-8000-000000000003';
const AUTHOR_ID = '00000000-0000-4000-8000-000000000004';

function apiRows() {
	return {
		worksheet: {
			id: WORKSHEET_ID,
			title: 'Suites',
			description: null,
			type: 'worksheet',
			config: { language: 'en' },
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
			translations: { en: { title: 'Sequences' } },
			sections: [
				{
					id: SECTION_ID,
					worksheet_id: WORKSHEET_ID,
					title: 'Recherche',
					instructions: 'Justifier chaque réponse.',
					position: 1,
					points_total: null,
					created_at: NOW,
					updated_at: NOW,
					translations: {
						en: { title: 'Investigation', instructions: 'Justify each answer.' }
					}
				}
			],
			exercises: [
				{
					id: '00000000-0000-4000-8000-000000000005',
					worksheet_id: WORKSHEET_ID,
					exercise_id: EXERCISE_ID,
					section_id: SECTION_ID,
					position: 1,
					points: null,
					variant_mode: 'none',
					variant_config: {},
					custom_instructions: 'Sans calculatrice.',
					is_essential: false,
					created_at: NOW,
					updated_at: NOW,
					translations: { en: { custom_instructions: 'No calculator.' } },
					exercise: {
						id: EXERCISE_ID,
						title: 'T',
						variables: null,
						shared: null,
						variations: [{ label: 'autonomous', statement_md: 'Calculer', solution_md: 'ok' }]
					}
				}
			]
		}
	};
}

/** La fiche telle que la page la reçoit : la réponse validée par l'API */
function worksheetFromApi() {
	return worksheetDetailResponseSchema.parse(apiRows()).worksheet;
}

// ============================================================================
// TESTS
// ============================================================================

describe('réponse de GET /api/worksheets/[id] : les traductions restent', () => {
	it('celles des sections', () => {
		expect(worksheetFromApi().sections?.[0]).toMatchObject({
			translations: { en: { title: 'Investigation', instructions: 'Justify each answer.' } }
		});
	});

	it('celle de la fiche', () => {
		expect(worksheetFromApi()).toMatchObject({ translations: { en: { title: 'Sequences' } } });
	});

	it('celles des consignes du prof sur un exercice', () => {
		expect(worksheetFromApi().exercises?.[0]).toMatchObject({
			translations: { en: { custom_instructions: 'No calculator.' } }
		});
	});

	it('une fiche française sans traductions reste lisible', () => {
		const rows = apiRows();
		const { translations: _w, ...worksheet } = rows.worksheet;
		const sections = worksheet.sections.map(({ translations: _s, ...s }) => s);
		const exercises = worksheet.exercises.map((e) => ({ ...e, translations: null }));
		const parsed = worksheetDetailResponseSchema.safeParse({
			worksheet: { ...worksheet, sections, exercises }
		});
		expect(parsed.success).toBe(true);
	});
});

describe('PDF anglais de la page de la fiche', () => {
	it('imprime le titre et la consigne anglais de la section, et la consigne du prof', () => {
		const ws = worksheetFromApi() as unknown as WorksheetForCopy;
		const instance = buildWorksheetCopy(ws, {
			assignmentId: null,
			worksheetId: WORKSHEET_ID,
			level: 'autonomous',
			individualized: false,
			locale: 'en'
		});
		const typst = generateWorksheetTypst({
			worksheet: ws as unknown as WorksheetRow,
			instance,
			config: ws.config as WorksheetConfig,
			mode: 'worksheet'
		});

		expect(typst).toContain('Investigation');
		expect(typst).toContain('Justify each answer.');
		expect(typst).toContain('No calculator.');
		expect(typst).not.toContain('Recherche');
		expect(typst).not.toContain('Justifier chaque réponse.');
		expect(typst).not.toContain('Sans calculatrice.');
	});
});
