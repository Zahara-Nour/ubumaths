/**
 * Réglage « Lecture facilitée » (chantier `lecture-facilitee`, phase 0 validée le 2026-11-19).
 *
 * Allumé : la classe `lecture-facilitee` est posée sur <html> (le CSS passe le contenu en
 * Luciole) et les formules passent au jeu Luciole Math (D1). Éteint par défaut, gardé
 * dans le navigateur sous `easyReading`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/env', () => ({ browser: true, building: false, dev: true }));

const switchMathFonts = vi.fn(async () => {});
vi.mock('#lib/utils/mathlive-fonts.ts', () => ({ switchMathFonts }));

const { createEasyReadingStore, EASY_READING_CLASS } = await import('../easyReading.svelte.ts');

describe('easyReading', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove(EASY_READING_CLASS);
		switchMathFonts.mockClear();
	});

	it('est éteint par défaut, sans classe ni changement de police des maths', () => {
		const store = createEasyReadingStore();
		expect(store.enabled).toBe(false);
		expect(document.documentElement.classList.contains(EASY_READING_CLASS)).toBe(false);
		expect(switchMathFonts).not.toHaveBeenCalled();
	});

	it('allumé : classe posée, maths en Luciole Math, choix gardé', () => {
		const store = createEasyReadingStore();
		store.toggle();
		expect(store.enabled).toBe(true);
		expect(document.documentElement.classList.contains(EASY_READING_CLASS)).toBe(true);
		expect(switchMathFonts).toHaveBeenLastCalledWith('luciole');
		expect(localStorage.getItem('easyReading')).toBe('true');
	});

	it('éteint de nouveau : classe retirée, maths en KaTeX', () => {
		const store = createEasyReadingStore();
		store.toggle();
		store.toggle();
		expect(store.enabled).toBe(false);
		expect(document.documentElement.classList.contains(EASY_READING_CLASS)).toBe(false);
		expect(switchMathFonts).toHaveBeenLastCalledWith('katex');
		expect(localStorage.getItem('easyReading')).toBe('false');
	});

	it('relit le choix gardé au démarrage', () => {
		localStorage.setItem('easyReading', 'true');
		const store = createEasyReadingStore();
		expect(store.enabled).toBe(true);
		expect(document.documentElement.classList.contains(EASY_READING_CLASS)).toBe(true);
		expect(switchMathFonts).toHaveBeenLastCalledWith('luciole');
	});

	it('une valeur gardée inconnue vaut « éteint »', () => {
		localStorage.setItem('easyReading', 'peut-être');
		const store = createEasyReadingStore();
		expect(store.enabled).toBe(false);
	});

	it('jeu de polices des maths attendu, pour qui rend la main au réglage', () => {
		const store = createEasyReadingStore();
		expect(store.mathFontSet).toBe('katex');
		store.toggle();
		expect(store.mathFontSet).toBe('luciole');
	});
});
