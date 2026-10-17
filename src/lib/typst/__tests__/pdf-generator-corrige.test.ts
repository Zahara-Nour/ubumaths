/**
 * PDF de l'élève : un document qui porte les polices du Corrigé passe par le
 * compilateur du Corrigé (avec repli) ; les autres restent sur le service partagé.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { CORRECTION_FONT_RULES } from '../correction-fonts';

const calls = vi.hoisted(() => ({ service: [] as string[], fonts: [] as string[] }));

vi.mock('$lib/typst/service', () => ({
	PRIORITY: { URGENT: 0 },
	getTypstService: () => ({
		initialize: async () => true,
		mapShadow: () => {},
		resetShadow: () => {},
		compileWithPriority: async (content: string) => {
			calls.service.push(content);
			return { success: true, data: new Uint8Array([1]) };
		}
	})
}));
vi.mock('$lib/typst/compiler/correction-fonts-compiler', () => ({
	compileTypstDocument: async (typst: string) => {
		calls.fonts.push(typst);
		return {
			data: { pdf: new Uint8Array([2]), svg: null },
			typst,
			fallbackError: 'font missing'
		};
	}
}));

describe('generatePdfFromTypst : choix du compilateur', () => {
	let generatePdfFromTypst: typeof import('../pdf-generator').generatePdfFromTypst;

	// Premier import lourd (générateur ubumark) : hors du délai d'un test
	beforeAll(async () => {
		({ generatePdfFromTypst } = await import('../pdf-generator'));
	}, 60000);

	beforeEach(() => {
		calls.service = [];
		calls.fonts = [];
	});

	it('sans polices du Corrigé : service partagé, pas d’avertissement', async () => {
		const result = await generatePdfFromTypst(() => 'FICHE');
		expect(result.success && result.fallbackError).toBeNull();
		expect(calls.service).toEqual(['FICHE']);
		expect(calls.fonts).toEqual([]);
	});

	it('avec polices du Corrigé : compilateur du Corrigé, repli signalé', async () => {
		const typst = `${CORRECTION_FONT_RULES}\nCORRIGE`;
		const result = await generatePdfFromTypst(() => typst);
		expect(calls.fonts).toEqual([typst]);
		expect(calls.service).toEqual([]);
		expect(result.success && result.fallbackError).toBe('font missing');
		expect(result.success && Array.from(result.data)).toEqual([2]);
	});
});
