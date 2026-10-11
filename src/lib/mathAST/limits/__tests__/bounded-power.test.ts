/**
 * `\sin^2 x` : la puissance est portée par le nœud fonction (`power`).
 * Ses bornes sont celles de (sin x)², soit [0, 1].
 */

import { describe, it, expect } from 'vitest';
import { structuralBounds } from '../bounded';
import { parseLatex } from '../../parser';

describe('structuralBounds : puissance sur le nœud fonction', () => {
	it.each([
		['\\sin^2 x', { min: 0, max: 1 }],
		['\\cos^3 x', { min: -1, max: 1 }],
		['(\\sin x)^2', { min: 0, max: 1 }]
	] as const)('%s → %o', (input, expected) => {
		expect(structuralBounds(parseLatex(input), 'x')).toEqual(expected);
	});

	it('\\sin^{-1} x (réciproque) → non bornée par la structure', () => {
		expect(structuralBounds(parseLatex('\\sin^{-1} x'), 'x')).toBeNull();
	});
});
