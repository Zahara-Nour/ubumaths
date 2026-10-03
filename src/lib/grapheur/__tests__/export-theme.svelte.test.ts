/**
 * L'export d'un graphique est toujours en clair, avec des couleurs réelles.
 *
 * Un fichier SVG exporté ne connaît ni app.css ni ses variables : une `var()`
 * laissée dedans se peint en noir chez celui qui l'ouvre. Décision 1b de David :
 * l'export est clair même si l'élève est en mode sombre.
 * Spécification : docs/wip/grapheur-couleurs-theme-progress.md (6).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { prepareSvgForExport } from '../export';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Un graphique minimal : une ligne de grille et une courbe de la palette */
function graph(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('width', '200');
	svg.setAttribute('height', '100');

	const grid = document.createElementNS(SVG_NS, 'line');
	grid.setAttribute('class', 'grid-line-minor');
	grid.style.stroke = 'var(--color-graph-grid-minor)';

	const curve = document.createElementNS(SVG_NS, 'path');
	curve.setAttribute('class', 'function-curve');
	curve.setAttribute('d', 'M0 0L200 100');
	curve.setAttribute('fill', 'none');
	curve.style.stroke = 'var(--color-curve-1)';

	svg.append(grid, curve);
	document.body.append(svg);
	return svg;
}

/** Relit le SVG exporté comme un document autonome, hors de la page */
function parse(svgString: string): Document {
	return new DOMParser().parseFromString(svgString, 'image/svg+xml');
}

describe('export du grapheur', () => {
	afterEach(() => {
		document.documentElement.style.colorScheme = '';
		document.body.innerHTML = '';
	});

	it('ne laisse aucune variable CSS dans le fichier', () => {
		const out = prepareSvgForExport(graph(), 200, 100);

		expect(out).not.toContain('var(');
	});

	it('exporte les couleurs du mode clair, même quand l’élève est en sombre', () => {
		document.documentElement.style.colorScheme = 'dark';

		const doc = parse(prepareSvgForExport(graph(), 200, 100));
		const curve = doc.querySelector('.function-curve');
		const grid = doc.querySelector('.grid-line-minor');

		expect(curve?.getAttribute('style')).toContain('stroke: rgb(1, 124, 183)'); // #017cb7
		expect(grid?.getAttribute('style')).toContain('stroke: rgb(229, 229, 229)'); // #e5e5e5
	});

	it('pose un fond blanc, le fond clair du grapheur', () => {
		document.documentElement.style.colorScheme = 'dark';

		const doc = parse(prepareSvgForExport(graph(), 200, 100));
		const background = doc.querySelector('svg > rect');

		expect(background?.getAttribute('fill')).toBe('rgb(255, 255, 255)');
	});

	it('laisse le graphique affiché intact', () => {
		const svg = graph();
		prepareSvgForExport(svg, 200, 100);

		expect(svg.querySelector('path')?.style.stroke).toBe('var(--color-curve-1)');
		expect(svg.querySelector('rect')).toBeNull();
	});
});
