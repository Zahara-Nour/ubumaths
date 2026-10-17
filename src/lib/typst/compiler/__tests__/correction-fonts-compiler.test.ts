/**
 * Repli du Corrigé : la compilation avec Shantell Sans et Chiphre Math échoue →
 * le MÊME corrigé, recompilé dans la police standard. Jamais de PDF vide, et
 * l'erreur Typst reste lisible (console + message rendu à l'appelant).
 */
import { describe, it, expect, vi } from 'vitest';
import { compileWithFontFallback } from '../correction-fonts-compiler';
import { CORRECTION_FONT_RULES, hasCorrectionFonts } from '../../correction-fonts';

const PLAIN = '#set text(font: "New Computer Modern")\nCORRIGE';
const WITH_FONTS = `#set text(font: "New Computer Modern")\n${CORRECTION_FONT_RULES}\nCORRIGE`;

describe('compileWithFontFallback', () => {
	it('nominal : compile avec les polices, sans repli', async () => {
		const compile = vi.fn(async (typst: string, withFonts: boolean) => `${withFonts}:${typst}`);
		const result = await compileWithFontFallback(WITH_FONTS, compile);
		expect(compile).toHaveBeenCalledTimes(1);
		expect(compile).toHaveBeenCalledWith(WITH_FONTS, true);
		expect(result.fallbackError).toBeNull();
		expect(result.data).toBe(`true:${WITH_FONTS}`);
	});

	it('sans règles de police (Fiche, Réponses) : compilateur partagé, sans repli', async () => {
		const compile = vi.fn(async (_typst: string, withFonts: boolean) => withFonts);
		const result = await compileWithFontFallback(PLAIN, compile);
		expect(compile).toHaveBeenCalledWith(PLAIN, false);
		expect(result.data).toBe(false);
	});

	it('erreur avec les polices : recompile sans elles, et rend le message Typst', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const compile = vi.fn(async (typst: string, withFonts: boolean) => {
			if (withFonts) throw new Error('font "Chiphre Math" not found');
			return typst;
		});
		const result = await compileWithFontFallback(WITH_FONTS, compile);
		expect(compile).toHaveBeenCalledTimes(2);
		expect(hasCorrectionFonts(result.data)).toBe(false);
		expect(result.data).toContain('CORRIGE');
		expect(result.typst).toBe(result.data);
		expect(result.fallbackError).toContain('Chiphre Math');
		expect(consoleError).toHaveBeenCalled();
		expect(String(consoleError.mock.calls[0])).toContain('Chiphre Math');
		consoleError.mockRestore();
	});

	it('erreur aussi sans les polices : l’erreur remonte (pas de PDF vide)', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const compile = vi.fn(async () => {
			throw new Error('syntaxe');
		});
		await expect(compileWithFontFallback(WITH_FONTS, compile)).rejects.toThrow('syntaxe');
		vi.restoreAllMocks();
	});
});
