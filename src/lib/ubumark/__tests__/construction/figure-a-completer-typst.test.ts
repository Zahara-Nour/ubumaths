/**
 * Bloc ```figure-a-completer au PDF : la figure de départ seule (décision de
 * David du 2026-10-25, `docs/wip/geometrie-validation-progress.md` § 4) — le
 * même dessin que le bloc ```figure sans les lignes `outils:` / `verifier:`.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown, resolvedMarkdown } from '$lib/ubumark';
import { generateFigureTypst } from '$lib/ubumark/generators/figure-typst';
import type { FigureNode } from '$lib/ubumark/types/figure';

const SCRIPT = ['---', 'A = point(1, 2)', 'B = point(7, 2)', 'C = point(4, 5)', '```'];

function figureNode(lines: string[]): FigureNode {
	const doc = parseMarkdown(resolvedMarkdown(lines.join('\n')));
	return doc.children[0] as FigureNode;
}

describe('figure à compléter → Typst', () => {
	it('la figure de départ, comme le bloc ```figure équivalent', () => {
		const completer = figureNode([
			'```figure-a-completer',
			'fenetre: 0 ; 10 ; 0 ; 6',
			'outils: droite',
			'verifier: droite_par A ; B',
			'case: 0',
			...SCRIPT
		]);
		const plain = figureNode(['```figure', 'fenetre: 0 ; 10 ; 0 ; 6', ...SCRIPT]);
		expect(completer.construction).toBeDefined();
		expect(completer.errors).toEqual([]);
		const typst = generateFigureTypst(completer);
		expect(typst).toBe(generateFigureTypst(plain));
		expect(typst).not.toContain('indisponible');
	});

	it('figure de travail : la figure de départ aussi (lot 2 de figure-et-choix)', () => {
		const work = figureNode([
			'```figure-de-travail',
			'fenetre: 0 ; 10 ; 0 ; 6',
			'outils: droite',
			'case: 0',
			...SCRIPT
		]);
		const plain = figureNode(['```figure', 'fenetre: 0 ; 10 ; 0 ; 6', ...SCRIPT]);
		expect(work.construction?.work).toBe(true);
		expect(work.errors).toEqual([]);
		expect(generateFigureTypst(work)).toBe(generateFigureTypst(plain));
	});
});
