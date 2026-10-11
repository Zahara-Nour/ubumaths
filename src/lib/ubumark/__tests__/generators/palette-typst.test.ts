/**
 * Le PDF de ```courbe et ```stat-chart imprime la variante claire de la palette
 * commune des figures : la même valeur qu'à l'écran en mode clair.
 * Spécification : docs/archive/wip/palette-figures-progress.md (5, 7).
 */
import { describe, it, expect } from 'vitest';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { NAMED_COLOR_PRINT } from '$lib/theme/named-colors';

describe('palette commune au PDF', () => {
	it('courbe : chaque couleur nommée imprime sa variante claire', () => {
		for (const color of ['bleu', 'rouge', 'vert', 'orange', 'violet', 'gris'] as const) {
			const typst = generateCourbeTypst(
				parseCourbeContent(`x: -2 ; 2\ny: -2 ; 2\nf(x) = x   ${color}`)
			);
			expect(typst, color).toContain(NAMED_COLOR_PRINT[color]);
		}
	});

	it('stat-chart : les secteurs impriment bleu, orange, vert de la palette', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('circulaire', 'titre: Transport\nBus = 14\nVélo = 6\nÀ pied = 10')
		);
		for (const color of ['bleu', 'orange', 'vert'] as const) {
			expect(typst, color).toContain(NAMED_COLOR_PRINT[color]);
		}
	});
});
