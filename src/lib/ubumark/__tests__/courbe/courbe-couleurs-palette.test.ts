/**
 * ```courbe et ```stat-chart acceptent les 12 noms de la palette commune des
 * figures, et leurs synonymes anglais (décision D1, 2026-10-03).
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { NAMED_COLOR_PRINT } from '$lib/theme/named-colors';

const WINDOW = 'x: -2 ; 2\ny: -2 ; 2';

function curveColor(option: string) {
	const node = parseCourbeContent(`${WINDOW}\nf(x) = x   ${option}`);
	expect(node.errors).toEqual([]);
	return node.spec!.functions[0];
}

function barColor(value: string) {
	const node = parseStatChartContent('barres', `couleur: ${value}\nA = 1`);
	return node.spec?.color ?? null;
}

describe('courbe — couleurs de la palette', () => {
	it.each(['jaune', 'cyan', 'marron', 'rose'])('accepte « %s »', (name) => {
		expect(curveColor(name).color).toBe(name);
	});

	it('ramène un synonyme anglais au nom français', () => {
		expect(curveColor('red').color).toBe('rouge');
		expect(curveColor('Grey').color).toBe('gris');
	});

	it('combine une nouvelle couleur avec les pointillés', () => {
		const f = curveColor('cyan pointillé');
		expect(f.color).toBe('cyan');
		expect(f.dashed).toBe(true);
	});

	it('imprime la nouvelle couleur dans sa variante claire', () => {
		expect(generateCourbeTypst(parseCourbeContent(`${WINDOW}\nf(x) = x   marron`))).toContain(
			NAMED_COLOR_PRINT.marron
		);
	});

	it('ne prend pas pour une couleur un mot inconnu en fin de formule', () => {
		const node = parseCourbeContent(`${WINDOW}\nf(x) = x   magenta`);
		expect(node.spec?.functions[0]?.color).not.toBe('magenta');
	});
});

describe('stat-chart — couleurs de la palette', () => {
	it.each(['jaune', 'cyan', 'marron', 'rose'])('accepte « couleur: %s »', (name) => {
		expect(barColor(name)).toBe(name);
	});

	it('ramène un synonyme anglais au nom français', () => {
		expect(barColor('pink')).toBe('rose');
	});

	it('refuse toujours un nom inconnu', () => {
		const node = parseStatChartContent('barres', 'couleur: fuchsia\nA = 1');
		expect(node.spec).toBeNull();
		expect(node.errors[0].message).toMatch(/fuchsia/);
	});
});
