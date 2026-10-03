/**
 * Palette des courbes : 4 couleurs × 2 styles de trait, couleurs thémables.
 *
 * Spécification : docs/wip/grapheur-couleurs-theme-progress.md (points 1-3, 8, 9, 11).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { CURVE_COLORS, CURVE_SLOTS, curveColorValue, getNextSlot, isCurveColor } from '../colors';
import type { LineStyle } from '$lib/geometry-core/viewport/types';

// =============================================================================
// Outils
// =============================================================================

/** Courbes déjà posées, réduites à ce qui décide de la place suivante */
function used(...slots: Array<[string, LineStyle]>) {
	return slots.map(([color, lineStyle]) => ({ color, lineStyle }));
}

/** Luminance relative WCAG d'une couleur `#rrggbb` */
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

/** Lit `--<nom>: light-dark(#clair, #sombre)` dans app.css */
function readLightDark(css: string, name: string): { light: string; dark: string } {
	const match = css.match(
		new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`)
	);
	if (!match) throw new Error(`--${name} absent de app.css ou hors de la forme light-dark(#…, #…)`);
	return { light: match[1], dark: match[2] };
}

// =============================================================================
// Les places
// =============================================================================

describe('CURVE_SLOTS', () => {
	it('range 8 places : les 4 couleurs en trait plein, puis les mêmes en pointillés', () => {
		expect(CURVE_SLOTS).toEqual([
			{ color: 'curve-1', lineStyle: 'solid' },
			{ color: 'curve-2', lineStyle: 'solid' },
			{ color: 'curve-3', lineStyle: 'solid' },
			{ color: 'curve-4', lineStyle: 'solid' },
			{ color: 'curve-1', lineStyle: 'dashed' },
			{ color: 'curve-2', lineStyle: 'dashed' },
			{ color: 'curve-3', lineStyle: 'dashed' },
			{ color: 'curve-4', lineStyle: 'dashed' }
		]);
	});
});

describe('getNextSlot', () => {
	it('donne le bleu plein à la première courbe', () => {
		expect(getNextSlot([])).toEqual({ color: 'curve-1', lineStyle: 'solid' });
	});

	it('enchaîne framboise, ocre, violet en trait plein', () => {
		expect(getNextSlot(used(['curve-1', 'solid']))).toEqual({
			color: 'curve-2',
			lineStyle: 'solid'
		});
		expect(
			getNextSlot(used(['curve-1', 'solid'], ['curve-2', 'solid'], ['curve-3', 'solid']))
		).toEqual({ color: 'curve-4', lineStyle: 'solid' });
	});

	it('passe au bleu en pointillés pour la 5ᵉ courbe', () => {
		const four = used(
			['curve-1', 'solid'],
			['curve-2', 'solid'],
			['curve-3', 'solid'],
			['curve-4', 'solid']
		);
		expect(getNextSlot(four)).toEqual({ color: 'curve-1', lineStyle: 'dashed' });
	});

	it('reprend une place libérée', () => {
		const withGap = used(['curve-1', 'solid'], ['curve-3', 'solid'], ['curve-4', 'solid']);
		expect(getNextSlot(withGap)).toEqual({ color: 'curve-2', lineStyle: 'solid' });
	});

	it('recommence au bleu plein quand les 8 places sont prises', () => {
		const all = CURVE_SLOTS.map((s) => ({ color: s.color, lineStyle: s.lineStyle }));
		expect(getNextSlot(all)).toEqual({ color: 'curve-1', lineStyle: 'solid' });
	});

	it('respecte un style choisi par l’élève : une courbe bleue passée en pointillés libère le bleu plein', () => {
		expect(getNextSlot(used(['curve-1', 'dotted']))).toEqual({
			color: 'curve-1',
			lineStyle: 'solid'
		});
	});

	it('ignore une couleur hors palette (ancienne sauvegarde non reconnue)', () => {
		expect(getNextSlot(used(['#123456', 'solid']))).toEqual({
			color: 'curve-1',
			lineStyle: 'solid'
		});
	});
});

// =============================================================================
// Identité → valeur CSS
// =============================================================================

describe('curveColorValue', () => {
	it('traduit une identité de la palette en variable du thème', () => {
		expect(curveColorValue('curve-2')).toBe('var(--color-curve-2)');
	});

	it('laisse passer une couleur hors palette telle quelle', () => {
		expect(curveColorValue('#123456')).toBe('#123456');
	});
});

describe('isCurveColor', () => {
	it('reconnaît les 4 identités et elles seules', () => {
		expect(CURVE_COLORS.every(isCurveColor)).toBe(true);
		expect(isCurveColor('curve-5')).toBe(false);
		expect(isCurveColor('#017cb7')).toBe(false);
	});
});

// =============================================================================
// Contraste, lu dans app.css (la source de vérité)
// =============================================================================

describe('contraste des couleurs de courbe (app.css)', () => {
	const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
	const bg = readLightDark(css, 'color-graph-bg');

	for (const color of CURVE_COLORS) {
		it(`--color-${color} atteint 4,5:1 sur le fond du grapheur, dans les deux modes`, () => {
			const { light, dark } = readLightDark(css, `color-${color}`);
			expect(contrast(light, bg.light)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(dark, bg.dark)).toBeGreaterThanOrEqual(4.5);
		});
	}
});
