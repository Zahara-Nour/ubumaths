/**
 * Repli du Corrigé : la compilation avec Shantell Sans et Chiphre Math échoue →
 * le MÊME corrigé, recompilé dans la police standard. Jamais de PDF vide, et
 * l'erreur Typst reste lisible (console + message rendu à l'appelant). Même
 * repli pour la lecture facilitée (Luciole, Luciole Math).
 */
import { describe, it, expect, vi } from 'vitest';
import { compileWithFontFallback, fontSetOf, type FontSet } from '../correction-fonts-compiler';
import { CORRECTION_FONT_RULES, hasCorrectionFonts } from '../../correction-fonts';
import { hasEasyReading, withEasyReading } from '../../easy-reading';

const PLAIN = '#set text(font: "New Computer Modern")\nCORRIGE';
const WITH_FONTS = `#set text(font: "New Computer Modern")\n${CORRECTION_FONT_RULES}\nCORRIGE`;

describe('compileWithFontFallback', () => {
	it('nominal : compile avec les polices, sans repli', async () => {
		const compile = vi.fn(async (typst: string, fonts: FontSet) => `${fonts}:${typst}`);
		const result = await compileWithFontFallback(WITH_FONTS, compile);
		expect(compile).toHaveBeenCalledTimes(1);
		expect(compile).toHaveBeenCalledWith(WITH_FONTS, 'correction');
		expect(result.fallbackError).toBeNull();
		expect(result.data).toBe(`correction:${WITH_FONTS}`);
	});

	it('sans règles de police (Fiche, Réponses) : compilateur partagé, sans repli', async () => {
		const compile = vi.fn(async (_typst: string, fonts: FontSet) => fonts);
		const result = await compileWithFontFallback(PLAIN, compile);
		expect(compile).toHaveBeenCalledWith(PLAIN, 'standard');
		expect(result.data).toBe('standard');
	});

	it('erreur avec les polices : recompile sans elles, et rend le message Typst', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const compile = vi.fn(async (typst: string, fonts: FontSet) => {
			if (fonts !== 'standard') throw new Error('font "Chiphre Math" not found');
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

	it('lecture facilitée : compilateur de Luciole, sans repli', async () => {
		const typst = withEasyReading(PLAIN);
		const compile = vi.fn(async (_typst: string, fonts: FontSet) => fonts);
		const result = await compileWithFontFallback(typst, compile);
		expect(compile).toHaveBeenCalledWith(typst, 'easy-reading');
		expect(result.fallbackError).toBeNull();
	});

	it('lecture facilitée en échec : recompile dans la police standard, sans Luciole', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const compile = vi.fn(async (typst: string, fonts: FontSet) => {
			if (fonts === 'easy-reading') throw new Error('unknown font family: luciole math');
			return { typst, fonts };
		});
		const result = await compileWithFontFallback(withEasyReading(PLAIN), compile);
		expect(result.data.fonts).toBe('standard');
		expect(hasEasyReading(result.data.typst)).toBe(false);
		expect(result.data.typst).toBe(PLAIN);
		expect(result.fallbackError).toContain('luciole math');
		consoleError.mockRestore();
	});
});

describe('fontSetOf', () => {
	it('police standard, Corrigé, lecture facilitée', () => {
		expect(fontSetOf(PLAIN)).toBe('standard');
		expect(fontSetOf(WITH_FONTS)).toBe('correction');
		expect(fontSetOf(withEasyReading(PLAIN))).toBe('easy-reading');
	});
});
