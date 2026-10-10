/**
 * Une couleur NOMMÉE dans le DSL garde son nom jusqu'au rendu.
 *
 * Avant : `couleur=rouge` devenait `#dc2626` dès l'interprétation, et la figure
 * ne pouvait plus suivre le thème. Le nom canonique est conservé ; l'écran le
 * traduit en variable du thème, les exports en sa variante claire.
 * Spécification : docs/archive/wip/palette-figures-progress.md (1, 2, 3, 5).
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../..';
import { resolvePrintStyle, resolveStyle } from '../../rendering/svg-primitives';
import { exportToTypst } from '../../rendering/export-typst';
import { exportToSVG } from '../../rendering/export-svg';
import type { Viewport } from '../../viewport/types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

function pointA(script: string) {
	const { figure } = runDsl(script);
	const A = figure.getAllElements().find((e) => e.label === 'A');
	if (!A) throw new Error('point A absent');
	return { figure, A };
}

describe('couleurs nommées du DSL', () => {
	it('conserve le nom canonique', () => {
		const { figure, A } = pointA('A = point(0, 0, couleur="rouge")');
		expect(resolveStyle(A, figure.defaults).color).toBe('rouge');
	});

	it('ramène un synonyme anglais au nom français', () => {
		const { figure, A } = pointA('A = point(0, 0, couleur="red")');
		expect(resolveStyle(A, figure.defaults).color).toBe('rouge');
	});

	it('reconnaît les noms qui manquaient à l’ancienne table (marron, rose, blanc)', () => {
		const { figure, A } = pointA('A = point(0, 0, couleur="marron")');
		expect(resolveStyle(A, figure.defaults).color).toBe('marron');
	});

	it('laisse un code hexadécimal tel quel', () => {
		const { figure, A } = pointA('A = point(0, 0, couleur="#1e40af")');
		expect(resolveStyle(A, figure.defaults).color).toBe('#1e40af');
	});

	it('conserve aussi le nom d’un remplissage', () => {
		const { figure } = runDsl(
			'A = point(0, 0)\nB = point(4, 0)\nC = point(0, 3)\nT = polygone(A, B, C, remplissage="vert")'
		);
		const T = figure.getAllElements().find((e) => e.label === 'T');
		expect(T && resolveStyle(T, figure.defaults).fillColor).toBe('vert');
	});
});

describe('resolvePrintStyle', () => {
	it('imprime un nom dans sa variante claire', () => {
		const { figure, A } = pointA('A = point(0, 0, couleur="rouge")');
		expect(resolvePrintStyle(A, figure.defaults).color).toBe('#dc2626');
	});

	it('imprime un code hexadécimal tel quel', () => {
		const { figure, A } = pointA('A = point(0, 0, couleur="#1e40af")');
		expect(resolvePrintStyle(A, figure.defaults).color).toBe('#1e40af');
	});
});

describe('exports', () => {
	it('Typst imprime la couleur nommée, pas du noir', () => {
		const { figure } = runDsl('A = point(0, 0, couleur="rouge")');
		expect(exportToTypst(figure, viewport)).toContain('#dc2626');
	});

	it('SVG imprime la couleur nommée', () => {
		const { figure } = runDsl('A = point(0, 0, couleur="marron")');
		expect(exportToSVG(figure, viewport)).toContain('#863805');
	});
});
