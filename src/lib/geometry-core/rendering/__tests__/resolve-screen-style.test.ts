/**
 * Couleurs des figures interactives (lot 2, docs/wip/figures-interactives-theme-progress.md).
 *
 * `resolveScreenStyle` : ce que GeometryCanvas peint en `style:` (doit suivre
 * le thème, ne jamais laisser passer une chaîne d'auteur non validée).
 * Exports Typst / SVG / TikZ : toujours la variante CLAIRE (spécification 6).
 */

import { describe, it, expect } from 'vitest';
import { resolveScreenStyle, resolvePrintStyle } from '../svg-primitives';
import { exportToSVG } from '../export-svg';
import { exportToTypst } from '../export-typst';
import { exportToTikZ } from '../export-tikz';
import { runDsl } from '../../dsl';
import type { GeoElementBase } from '../../types/elements';

function el(color: string | undefined, fillColor?: string): GeoElementBase {
	return {
		id: 'x',
		visible: true,
		color,
		style: fillColor === undefined ? undefined : { fillColor }
	} as unknown as GeoElementBase;
}

const VIEWPORT = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

describe('resolveScreenStyle', () => {
	it('un nom de la palette devient une variable du thème', () => {
		expect(resolveScreenStyle(el('rouge')).color).toBe('var(--color-fig-rouge)');
		expect(resolveScreenStyle(el('red')).color).toBe('var(--color-fig-rouge)');
	});

	it('noir et blanc suivent la page', () => {
		expect(resolveScreenStyle(el('noir')).color).toBe('var(--color-foreground)');
		expect(resolveScreenStyle(el('blanc')).color).toBe('var(--color-background)');
	});

	it('un hexadécimal d’auteur reste tel quel', () => {
		expect(resolveScreenStyle(el('#1e40af')).color).toBe('#1e40af');
	});

	it('un nom CSS hors palette validé passe (comportement antérieur)', () => {
		expect(resolveScreenStyle(el('teal')).color).toBe('teal');
	});

	it('une chaîne hostile ne passe jamais : couleur par défaut', () => {
		const hostile = 'red; background: url(https://x)';
		expect(resolveScreenStyle(el(hostile)).color).toBe('var(--color-fig-bleu)');
		expect(resolveScreenStyle(el('#1e40af', hostile)).fillColor).toBeUndefined();
	});

	it('remplissage nommé → variable du thème', () => {
		expect(resolveScreenStyle(el('rouge', 'vert')).fillColor).toBe('var(--color-fig-vert)');
	});

	it('objet sans couleur (DSL) = bleu de la palette (L2-a)', () => {
		const { figure } = runDsl('A = point(1, 1)');
		const point = figure.getAllElements().find((e) => e.label === 'A')!;
		expect(resolveScreenStyle(point, figure.defaults).color).toBe('var(--color-fig-bleu)');
		expect(resolvePrintStyle(point, figure.defaults).color).toBe('#2563eb');
	});
});

describe('exports : toujours clairs', () => {
	const SCRIPT = `A = point(0, 0)
B = point(3, 0)
C = point(0, 3)
s = segment(A, B, couleur="rouge")
t = segment(A, C)`;

	it.each([
		['SVG', (f: ReturnType<typeof runDsl>['figure']) => exportToSVG(f, VIEWPORT)],
		['Typst', (f: ReturnType<typeof runDsl>['figure']) => exportToTypst(f, VIEWPORT)],
		['TikZ', (f: ReturnType<typeof runDsl>['figure']) => exportToTikZ(f, VIEWPORT)]
	])('%s : rouge et défaut en hex clair, aucune variable CSS', (_name, exporter) => {
		const { figure } = runDsl(SCRIPT);
		const out = exporter(figure).toLowerCase();
		expect(out).not.toContain('var(');
		expect(out).not.toContain('1e40af');
		// TikZ définit ses couleurs en RGB décimal : on accepte les deux écritures
		const hasRed = out.includes('dc2626') || out.includes('220,38,38');
		const hasBlue = out.includes('2563eb') || out.includes('37,99,235');
		expect(hasRed).toBe(true);
		expect(hasBlue).toBe(true);
	});
});
