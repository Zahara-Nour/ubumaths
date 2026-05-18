/**
 * Export tests for GeoOsculatingCircle (2026-05-18).
 *
 * Before this fix, the `osculatingCircle` element type was in the GeoElement
 * union but absent from all three export pipelines (SVG / TikZ / Typst).
 * Resulting bug: a figure containing a `cercle_osculateur` would have it
 * rendered in the interactive canvas (GeometryCanvas.svelte) but silently
 * omitted from any exported file.
 *
 * These tests verify the fix: each exporter now emits the appropriate
 * primitive (SVG <circle>, TikZ \draw circle, Typst circle()).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../dsl/parser';
import { interpret } from '../../dsl/interpreter';
import { exportToSVG } from '../export-svg';
import { exportToTikZ } from '../export-tikz';
import { exportToTypst } from '../export-typst';
import type { Viewport } from '../../viewport/types';

const viewport: Viewport = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const TWO_PI = 2 * Math.PI;

function runScript(script: string) {
	return interpret(parse(script));
}

describe('GeoOsculatingCircle — SVG export', () => {
	it('emits a <circle> for the osculating circle of a unit circle at t=0', () => {
		// Unit circle is its own osculating circle: centre (0,0), radius 1.
		const { figure } = runScript(
			[
				`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
				'oc = cercle_osculateur(c, 0)'
			].join('\n')
		);

		const svg = exportToSVG(figure, viewport, { width: 600, height: 600 });

		// The export should contain a <circle> element matching the osculating
		// circle. Centre maps to SVG origin = (300, 300) for a 600×600 canvas
		// over [-3,3]×[-3,3]; radius 1 math = 100 SVG px.
		const circleMatches = svg.match(/<circle [^/]*\/>/g) ?? [];
		expect(circleMatches.length).toBeGreaterThanOrEqual(1);
		// The osculating circle (centre 0,0 r=1) should be among them.
		const hasOsc = circleMatches.some(
			(c) => /cx="300"/.test(c) && /cy="300"/.test(c) && /r="100"/.test(c)
		);
		expect(hasOsc).toBe(true);
	});

	it('emits nothing for an osculating circle at a cusp (kappa = 0 or gamma_prime = 0)', () => {
		// A straight line y = x parametrised as (t, t) has zero curvature
		// everywhere → osculating circle radius is infinite → silently omitted.
		const { figure } = runScript(
			['c = courbe("x = t", "y = t", t_min=-3, t_max=3)', 'oc = cercle_osculateur(c, 0)'].join('\n')
		);

		const svg = exportToSVG(figure, viewport, { width: 600, height: 600 });
		// No <circle> element should be produced (the curve itself renders as a
		// path, the osculating circle has no defined radius).
		const circleCount = (svg.match(/<circle /g) ?? []).length;
		expect(circleCount).toBe(0);
	});
});

describe('GeoOsculatingCircle — TikZ export', () => {
	it('emits \\draw ... circle (r) for the osculating circle of a parabola at t=0', () => {
		// Parabola γ(t) = (t, t²) at t=0: κ = 2, so radius = 0.5. Centre at (0, 0.5).
		const { figure } = runScript(
			['c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)', 'oc = cercle_osculateur(c, 0)'].join(
				'\n'
			)
		);

		const tikz = exportToTikZ(figure);

		// Look for a draw circle with centre (0, 0.5) and radius 0.5 (3 decimals).
		expect(tikz).toContain('(0, 0.5) circle (0.5)');
	});

	it('emits nothing for an osculating circle when radius is undefined', () => {
		const { figure } = runScript(
			['c = courbe("x = t", "y = t", t_min=-3, t_max=3)', 'oc = cercle_osculateur(c, 0)'].join('\n')
		);

		const tikz = exportToTikZ(figure);
		// No circle command should appear — only the parametric curve path.
		expect(tikz).not.toMatch(/circle/);
	});
});

describe('GeoOsculatingCircle — Typst export', () => {
	it('emits circle(..., radius: r, ...) for an osculating circle', () => {
		const { figure } = runScript(
			['c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)', 'oc = cercle_osculateur(c, 0)'].join(
				'\n'
			)
		);

		const typst = exportToTypst(figure);

		// Centre (0, 0.5), radius 0.5. Typst format: circle((cx, cy), radius: r, ...).
		expect(typst).toContain('circle((0, 0.5), radius: 0.5');
	});

	it('emits nothing for a degenerate osculating circle', () => {
		const { figure } = runScript(
			['c = courbe("x = t", "y = t", t_min=-3, t_max=3)', 'oc = cercle_osculateur(c, 0)'].join('\n')
		);

		const typst = exportToTypst(figure);
		expect(typst).not.toMatch(/circle\(/);
	});
});
