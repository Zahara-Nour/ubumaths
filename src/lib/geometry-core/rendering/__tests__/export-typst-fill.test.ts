/**
 * Export Typst générique (constructions, hors bloc ```figure) : un remplissage
 * sans opacité explicite reste plein ; `opacite_fond` est appliquée ; un
 * cercle rempli est rempli.
 */
import { describe, it, expect } from 'vitest';
import { runDsl } from '../..';
import { exportToTypst } from '../export-typst';
import type { Viewport } from '../../viewport/types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };
const TRIANGLE = 'A = point(0, 0)\nB = point(4, 0)\nC = point(0, 3)\n';
const filled = (script: string) =>
	exportToTypst(runDsl(script).figure, viewport)
		.split('\n')
		.filter((l) => /fill: rgb/.test(l));

describe('exportToTypst — remplissages', () => {
	it('sans opacite_fond, un polygone reste plein', () => {
		const [line] = filled(`${TRIANGLE}p = polygone(A, B, C, remplissage="#16a34a")`);
		expect(line).toContain('fill: rgb("#16a34a")');
		expect(line).not.toContain('transparentize');
	});

	it('opacite_fond est appliquée à un polygone', () => {
		const [line] = filled(
			`${TRIANGLE}p = polygone(A, B, C, remplissage="#16a34a", opacite_fond=0.5)`
		);
		expect(line).toContain('transparentize(50%)');
	});

	it('un cercle rempli est rempli', () => {
		const lines = filled('A = point(0, 0)\nc = cercle(A, rayon=2, remplissage="#2563eb")');
		expect(lines.some((l) => l.includes('circle('))).toBe(true);
	});
});
