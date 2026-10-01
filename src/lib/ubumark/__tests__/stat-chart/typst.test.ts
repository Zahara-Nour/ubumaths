/**
 * Blocs ```barres et ```circulaire → Typst (cetz 0.3.0).
 *
 * Même scène que l'écran : chaque primitive est précédée d'un commentaire
 * (`// barre`, `// secteur`) qui permet de les compter. La compilation réelle
 * (typst.ts 0.6.1-rc5) se vérifie à part, sur une fiche complète.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { buildStatChartScene, type PieScene } from '../../utils/stat-chart-scene';
import type { StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

function typstOf(kind: StatChartKind, source: string, language?: string) {
	return generateStatChartTypst(parseStatChartContent(kind, source), { language });
}

const count = (text: string, marker: string) => text.split(marker).length - 1;

// =============================================================================
// Tests
// =============================================================================

describe('Typst des diagrammes statistiques', () => {
	it('barres : une barre dessinée par catégorie, comme à l’écran', () => {
		const typst = typstOf('barres', 'A = 3\nB = 0\nC = 5');

		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(count(typst, '// barre')).toBe(3);
	});

	it('circulaire : un secteur par catégorie non nulle, une légende par catégorie', () => {
		const source = 'A = 0\nB = 2\nC = 2';
		const typst = typstOf('circulaire', source);
		const node = parseStatChartContent('circulaire', source);
		const scene = buildStatChartScene(node.spec!) as PieScene;

		expect(count(typst, '// secteur')).toBe(scene.sectors.length);
		expect(count(typst, '// légende')).toBe(3);
		expect(count(typst, '// repère')).toBe(scene.sectors.length);
	});

	it('noms hostiles : écrits comme chaînes Typst échappées, jamais comme du balisage', () => {
		const typst = typstOf('barres', 'titre: Note #1 $x$\nMot #1 *a* $x$ "b" \\c = 4');

		expect(typst).toContain('#"Mot #1 *a* $x$ \\"b\\" \\\\c"');
		expect(typst).toContain('#"Note #1 $x$"');
	});

	it('graduations selon la langue du document', () => {
		expect(typstOf('barres', 'A = 1 %\nB = 2 %')).toMatch(/\[\d+,\d+\]/);
		expect(typstOf('barres', 'A = 1 %\nB = 2 %', 'en')).toMatch(/\[\d+\.\d+\]/);
	});

	it('bloc en erreur : cadre neutre, sans cetz', () => {
		const typst = typstOf('barres', 'A = -1');

		expect(typst).toContain('Figure indisponible');
		expect(typst).not.toContain('cetz');
	});
});
