/**
 * Arbre pondéré dans le PDF (2026-09-25)
 *
 * Constats en préparant les fiches de probabilités (compilateur de prod) :
 * - une probabilité décimale `0.3` s'affichait `0″,″3` : la virgule préparée par
 *   l'arbre (`0","3`) repassait par le convertisseur, qui changeait les guillemets
 *   en primes doubles ;
 * - une issue en bout de branche (`P(A∩B)=0,24`), centrée sur son point, débordait
 *   à gauche sur l'étiquette de l'évènement.
 */
import { describe, it, expect } from 'vitest';
import { parseProbabilityTree } from '../../parser/probability-tree-parser';
import { generateProbabilityTreeTypst } from '../probability-tree-typst';

function typst(block: string): string {
	const lines = ['```probtree', ...block.trim().split('\n'), '```'];
	const { node } = parseProbabilityTree(lines, 0, lines.length - 1);
	if (!node) throw new Error('arbre non analysé');
	return generateProbabilityTreeTypst(node);
}

const ARBRE = `root: Ω
outcomes: true

$A$:0.3
  $B$:0.8, $P(A\\cap B)=0.24$
  $\\overline{B}$:0.2
$\\overline{A}$:0.7
  $B$:0.5
  $\\overline{B}$:0.5`;

describe('arbre pondéré — PDF', () => {
	it('probabilités décimales avec une vraie virgule, sans prime', () => {
		const code = typst(ARBRE);
		expect(code).toContain('0","3');
		expect(code).toContain('0","24');
		expect(code).not.toContain('prime');
	});

	it('issue ancrée à gauche (ne déborde pas sur l’étiquette)', () => {
		const code = typst(ARBRE);
		const issue = code.split('\n').find((l) => l.includes('sect'));
		expect(issue).toContain('anchor: "west"');
	});
});
