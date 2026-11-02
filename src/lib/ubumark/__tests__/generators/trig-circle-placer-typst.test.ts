/**
 * Bloc ```trig à points à placer dans le PDF (chantier `docs/wip/cercle-trotteuse-progress.md`
 * § 4, point 7) : le cercle sans les points, avec ses 24 graduations sans
 * étiquette ; l'élève fait sa croix. Le nom et l'angle attendus ne sont jamais écrits.
 */
import { describe, it, expect } from 'vitest';
import { generateTrigCircleTypst } from '../../generators/trig-circle-typst';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';

function typstOf(source: string): string {
	const { node } = parseTrigCircleContent(source);
	return generateTrigCircleTypst(node!);
}

/** Lignes de la section des graduations du cercle */
function tickLines(typst: string): string[] {
	const start = typst.indexOf('// Graduations du cercle');
	if (start === -1) return [];
	return typst
		.slice(start)
		.split('\n\n')[0]
		.split('\n')
		.filter((l) => l.trim().startsWith('line('));
}

describe('trig → Typst : points à placer', () => {
	it('24 graduations, les repères étiquetés, aucun point nommé', () => {
		const typst = typstOf('placer: M = 2*pi/3 ; N = -pi/4');
		expect(tickLines(typst)).toHaveLength(24);
		expect(typst).not.toContain('text(style: "italic")');
		expect(typst).not.toMatch(/2 pi|frac\(2/);
	});

	it('sans placer: : pas de graduations', () => {
		expect(tickLines(typstOf('preset: quarters'))).toHaveLength(0);
	});
});
