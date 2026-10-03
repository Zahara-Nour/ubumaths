/**
 * Les 12 couleurs que les auteurs nomment dans une figure, une courbe ou un graphique.
 *
 * Spécification : docs/wip/palette-figures-progress.md (1, 2, 4, 5, 6).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	CHROMATIC_NAMED_COLORS,
	NAMED_COLORS,
	NAMED_COLOR_PRINT,
	colorForPrint,
	colorForScreen,
	resolveNamedColor
} from '../named-colors';

// =============================================================================
// Outils
// =============================================================================

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');

/** Lit `--<nom>: light-dark(#clair, #sombre)` dans app.css */
function readLightDark(name: string): { light: string; dark: string } {
	const match = css.match(
		new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`)
	);
	if (!match) throw new Error(`--${name} absent de app.css ou hors de la forme light-dark(#…, #…)`);
	return { light: match[1].toLowerCase(), dark: match[2].toLowerCase() };
}

// =============================================================================
// Noms et synonymes
// =============================================================================

describe('resolveNamedColor', () => {
	it('reconnaît les 12 noms français', () => {
		for (const name of NAMED_COLORS) expect(resolveNamedColor(name)).toBe(name);
	});

	it('accepte les anciennes formes anglaises comme synonymes', () => {
		expect(resolveNamedColor('red')).toBe('rouge');
		expect(resolveNamedColor('blue')).toBe('bleu');
		expect(resolveNamedColor('green')).toBe('vert');
		expect(resolveNamedColor('purple')).toBe('violet');
		expect(resolveNamedColor('yellow')).toBe('jaune');
		expect(resolveNamedColor('brown')).toBe('marron');
		expect(resolveNamedColor('pink')).toBe('rose');
		expect(resolveNamedColor('gray')).toBe('gris');
		expect(resolveNamedColor('grey')).toBe('gris');
		expect(resolveNamedColor('black')).toBe('noir');
		expect(resolveNamedColor('white')).toBe('blanc');
	});

	it('ignore la casse et les espaces autour', () => {
		expect(resolveNamedColor('  Rouge ')).toBe('rouge');
		expect(resolveNamedColor('RED')).toBe('rouge');
	});

	it('ne reconnaît ni un nom inconnu ni un code hexadécimal', () => {
		expect(resolveNamedColor('magenta')).toBeNull();
		expect(resolveNamedColor('#dc2626')).toBeNull();
	});
});

// =============================================================================
// Écran et impression
// =============================================================================

describe('colorForScreen', () => {
	it('traduit un nom en variable du thème', () => {
		expect(colorForScreen('rouge')).toBe('var(--color-fig-rouge)');
		expect(colorForScreen('red')).toBe('var(--color-fig-rouge)');
	});

	it('fait suivre au noir le texte de la page, et au blanc son fond', () => {
		expect(colorForScreen('noir')).toBe('var(--color-foreground)');
		expect(colorForScreen('blanc')).toBe('var(--color-background)');
	});

	it('laisse un code hexadécimal tel quel (décision D2a)', () => {
		expect(colorForScreen('#1e40af')).toBe('#1e40af');
	});

	it('refuse tout le reste, qui injecterait du CSS', () => {
		expect(colorForScreen('red;mask-image:url(x)')).toBeNull();
		expect(colorForScreen('var(--x)')).toBeNull();
	});
});

describe('colorForPrint', () => {
	it('donne la variante claire d’un nom', () => {
		expect(colorForPrint('rouge')).toBe('#dc2626');
		expect(colorForPrint('blue')).toBe('#2563eb');
	});

	it('imprime le noir en noir et le blanc en blanc (papier)', () => {
		expect(colorForPrint('noir')).toBe('#000000');
		expect(colorForPrint('blanc')).toBe('#ffffff');
	});

	it('laisse un code hexadécimal tel quel', () => {
		expect(colorForPrint('#1e40af')).toBe('#1e40af');
	});

	it('refuse tout le reste, qui ferait échouer le PDF', () => {
		expect(colorForPrint('magenta')).toBeNull();
	});
});

// =============================================================================
// app.css : une seule source de vérité
// =============================================================================

describe('palette dans app.css', () => {
	const page = readLightDark('color-background');
	const card = readLightDark('color-card');

	for (const name of CHROMATIC_NAMED_COLORS) {
		it(`--color-fig-${name} : le PDF imprime exactement la variante claire de l’écran`, () => {
			expect(readLightDark(`color-fig-${name}`).light).toBe(NAMED_COLOR_PRINT[name]);
		});

		it(`--color-fig-${name} atteint 4,5:1 sur la page et sur une carte, dans les deux modes`, () => {
			const { light, dark } = readLightDark(`color-fig-${name}`);
			expect(
				Math.min(contrast(light, page.light), contrast(light, card.light))
			).toBeGreaterThanOrEqual(4.5);
			expect(Math.min(contrast(dark, page.dark), contrast(dark, card.dark))).toBeGreaterThanOrEqual(
				4.5
			);
		});
	}
});
