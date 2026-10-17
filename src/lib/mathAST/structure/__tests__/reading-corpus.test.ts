/**
 * Lecture en français sur le corpus de saisies
 * ============================================
 *
 * Garde-fou, pas spécification : sur ~200 saisies réalistes
 * (`fixtures/corpus-saisies.txt`), la lecture de CHAQUE sous-expression ne
 * lève pas et n'est jamais vide. Le contenu des lectures est spécifié dans
 * `reading.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLatexSafe } from '../../parser';
import { buildStructure, readingOf, readingPlainText } from '..';

// Constantes
const CORPUS = readFileSync(new URL('./fixtures/corpus-saisies.txt', import.meta.url), 'utf8')
	.split('\n')
	.filter((line) => line.trim() !== '');

describe('corpus de saisies : lecture de chaque sous-expression', () => {
	it.each(CORPUS)('%s', (latex) => {
		const ast = parseLatexSafe(latex).ast;
		if (!ast) throw new Error(`${latex} : pas d'AST`);
		const structure = buildStructure(ast);
		for (const node of structure.nodes) {
			const reading = readingOf(structure, node.id);
			expect(reading.segments.length).toBeGreaterThan(0);
			expect(readingPlainText(reading).trim()).not.toBe('');
		}
	});
});
