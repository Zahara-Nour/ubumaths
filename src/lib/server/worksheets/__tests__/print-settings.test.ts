/**
 * Taille du texte d'un élève : lecture tolérante, écriture vérifiée
 *
 * Les droits eux-mêmes sont prouvés contre la base locale
 * (`tests/integration/taille-texte-fiches-eleve.test.ts`) ; ici, ce que le
 * code fait des réponses de la base.
 */
import { describe, it, expect } from 'vitest';
import { tableMock } from './table-mock';
import {
	DEFAULT_PRINT_SETTINGS,
	loadPrintSettings,
	loadPrintSettingsMany,
	loadTextSize,
	loadTextSizes,
	savePrintSettings,
	saveTextSize
} from '../print-settings';

const STUDENT = '550e8400-e29b-41d4-a716-446655440001';
const OTHER = '550e8400-e29b-41d4-a716-446655440002';

describe('loadTextSize / loadTextSizes', () => {
	it('rend la taille enregistrée', async () => {
		const { client } = tableMock({
			student_print_settings: { data: [{ student_id: STUDENT, text_size: 'large' }], error: null }
		});
		expect(await loadTextSize(client, STUDENT)).toBe('large');
	});

	it('sans réglage : taille normale', async () => {
		const { client } = tableMock({ student_print_settings: { data: [], error: null } });
		expect(await loadTextSize(client, STUDENT)).toBe('normal');
	});

	it('lecture en échec : taille normale, jamais une erreur (le PDF doit sortir)', async () => {
		const { client } = tableMock({
			student_print_settings: { data: null, error: { message: 'panne' } }
		});
		expect(await loadTextSize(client, STUDENT)).toBe('normal');
	});

	it('une valeur inconnue en base donne la taille normale', async () => {
		const { client } = tableMock({
			student_print_settings: { data: [{ student_id: STUDENT, text_size: 'enorme' }], error: null }
		});
		expect(await loadTextSize(client, STUDENT)).toBe('normal');
	});

	it('plusieurs élèves en une lecture ; liste vide : aucune requête', async () => {
		const mock = tableMock({
			student_print_settings: {
				data: [{ student_id: OTHER, text_size: 'x_large' }],
				error: null
			}
		});
		const sizes = await loadTextSizes(mock.client, [STUDENT, OTHER]);
		expect(sizes.get(OTHER)).toBe('x_large');
		expect(sizes.has(STUDENT)).toBe(false);

		const empty = tableMock({});
		expect((await loadTextSizes(empty.client, [])).size).toBe(0);
		expect(empty.tablesRead).toEqual([]);
	});
});

describe('saveTextSize', () => {
	it('une ligne écrite : vrai', async () => {
		const mock = tableMock({
			student_print_settings: { data: [{ student_id: STUDENT }], error: null }
		});
		expect(await saveTextSize(mock.client, STUDENT, 'large')).toBe(true);
		expect(mock.writes[0]).toMatchObject({
			kind: 'upsert',
			values: { student_id: STUDENT, text_size: 'large' }
		});
	});

	it('zéro ligne (refus silencieux de la RLS) : faux', async () => {
		const { client } = tableMock({ student_print_settings: { data: [], error: null } });
		expect(await saveTextSize(client, STUDENT, 'large')).toBe(false);
	});

	it('refus de la policy à l’insertion (42501) : faux', async () => {
		const { client } = tableMock({
			student_print_settings: { data: null, error: { code: '42501', message: 'rls' } }
		});
		expect(await saveTextSize(client, STUDENT, 'large')).toBe(false);
	});

	it('autre erreur de la base : levée', async () => {
		const { client } = tableMock({
			student_print_settings: { data: null, error: { code: '23514', message: 'check' } }
		});
		await expect(saveTextSize(client, STUDENT, 'large')).rejects.toThrow();
	});
});

// Lecture facilitée (chantier `lecture-facilitee`, D9 du 2026-11-19)
describe('loadPrintSettings / loadPrintSettingsMany', () => {
	it('rend la taille et la lecture facilitée enregistrées', async () => {
		const mock = tableMock({
			student_print_settings: {
				data: [{ student_id: STUDENT, text_size: 'large', easy_reading: true }],
				error: null
			}
		});
		expect(await loadPrintSettings(mock.client, STUDENT)).toEqual({
			textSize: 'large',
			easyReading: true
		});
	});

	it('sans réglage ou lecture en échec : taille normale, lecture facilitée éteinte', async () => {
		const empty = tableMock({ student_print_settings: { data: [], error: null } });
		expect(await loadPrintSettings(empty.client, STUDENT)).toEqual(DEFAULT_PRINT_SETTINGS);

		const broken = tableMock({
			student_print_settings: { data: null, error: { message: 'panne' } }
		});
		expect(await loadPrintSettings(broken.client, STUDENT)).toEqual(DEFAULT_PRINT_SETTINGS);
	});

	it('une valeur autre que vrai en base : éteinte', async () => {
		const { client } = tableMock({
			student_print_settings: {
				data: [{ student_id: STUDENT, text_size: 'normal', easy_reading: 'oui' }],
				error: null
			}
		});
		expect((await loadPrintSettings(client, STUDENT)).easyReading).toBe(false);
	});

	it('plusieurs élèves : chacun garde le sien', async () => {
		const { client } = tableMock({
			student_print_settings: {
				data: [
					{ student_id: STUDENT, text_size: 'normal', easy_reading: true },
					{ student_id: OTHER, text_size: 'x_large', easy_reading: false }
				],
				error: null
			}
		});
		const settings = await loadPrintSettingsMany(client, [STUDENT, OTHER]);
		expect(settings.get(STUDENT)).toEqual({ textSize: 'normal', easyReading: true });
		expect(settings.get(OTHER)).toEqual({ textSize: 'x_large', easyReading: false });
	});
});

describe('savePrintSettings', () => {
	it('lecture facilitée seule : la taille n’est pas réécrite', async () => {
		const mock = tableMock({
			student_print_settings: { data: [{ student_id: STUDENT }], error: null }
		});
		expect(await savePrintSettings(mock.client, STUDENT, { easyReading: true })).toBe(true);
		expect(mock.writes[0]).toMatchObject({
			kind: 'upsert',
			values: { student_id: STUDENT, easy_reading: true }
		});
		expect(mock.writes[0].values).not.toHaveProperty('text_size');
	});

	it('zéro ligne (refus silencieux de la RLS) : faux', async () => {
		const { client } = tableMock({ student_print_settings: { data: [], error: null } });
		expect(await savePrintSettings(client, STUDENT, { easyReading: true })).toBe(false);
	});
});
