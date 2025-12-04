/**
 * Unit tests for CompositionNode (function composition)
 *
 * Tests:
 * - compose() factory function
 * - isComposition() guard
 * - LaTeX and custom syntax generation
 * - Transform functions (getChildren, mapNode, cloneNode, etc.)
 * - Pretty printing
 */

import { describe, it, expect } from 'vitest';

// Factory
import { compose, variable, func, number, add } from '../factory';

// Guards
import { isComposition, hasChildren } from '../guards';

// Transforms
import { getChildren, mapNode, cloneNode, countNodes, getDepth } from '../transforms';

// Generators
import { toLatex, LatexGenerator } from '../latex-generator';
import { toCustom } from '../custom-generator';

// Pretty print
import { prettyPrint } from '../pretty-print';

describe('CompositionNode', () => {
	// =============================================================================
	// Factory Tests
	// =============================================================================

	describe('compose() factory', () => {
		it('creates a basic composition node f composed with g', () => {
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g);

			expect(node.type).toBe('composition');
			expect(node.outer).toBe(f);
			expect(node.inner).toBe(g);
		});

		it('creates composition with function nodes', () => {
			const sin = func('sin', []);
			const cos = func('cos', []);
			const node = compose(sin, cos);

			expect(node.type).toBe('composition');
			expect(node.outer.type).toBe('function');
			expect(node.inner.type).toBe('function');
		});

		it('accepts metadata option', () => {
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g, { metadata: { color: 'red' } });

			expect(node.metadata).toEqual({ color: 'red' });
		});

		it('accepts operatorMetadata option', () => {
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g, { operatorMetadata: { color: 'blue' } });

			expect(node.operatorMetadata).toEqual({ color: 'blue' });
		});

		it('accepts NodeMetadata directly (backwards compatibility)', () => {
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g, { color: 'green' });

			expect(node.metadata).toEqual({ color: 'green' });
		});

		it('creates nested compositions (f composed with g) composed with h', () => {
			const f = variable('f');
			const g = variable('g');
			const h = variable('h');
			const fg = compose(f, g);
			const fgh = compose(fg, h);

			expect(fgh.type).toBe('composition');
			expect(fgh.outer.type).toBe('composition');
			expect(fgh.inner.type).toBe('variable');
		});
	});

	// =============================================================================
	// Guard Tests
	// =============================================================================

	describe('isComposition() guard', () => {
		it('returns true for composition node', () => {
			const node = compose(variable('f'), variable('g'));
			expect(isComposition(node)).toBe(true);
		});

		it('returns false for non-composition nodes', () => {
			expect(isComposition(variable('x'))).toBe(false);
			expect(isComposition(number('42'))).toBe(false);
			expect(isComposition(func('sin', [variable('x')]))).toBe(false);
			expect(isComposition(add(number('1'), number('2')))).toBe(false);
		});
	});

	describe('hasChildren() with composition', () => {
		it('returns true for composition node', () => {
			const node = compose(variable('f'), variable('g'));
			expect(hasChildren(node)).toBe(true);
		});
	});

	// =============================================================================
	// Transform Tests
	// =============================================================================

	describe('getChildren()', () => {
		it('returns [outer, inner] for composition', () => {
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g);

			const children = getChildren(node);
			expect(children).toHaveLength(2);
			expect(children[0]).toBe(f);
			expect(children[1]).toBe(g);
		});
	});

	describe('mapNode()', () => {
		it('transforms outer and inner of composition', () => {
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g);

			const result = mapNode(node, (n) => {
				if (n.type === 'variable') {
					return variable(n.name.toUpperCase());
				}
				return n;
			});

			expect(result.type).toBe('composition');
			if (result.type === 'composition') {
				expect(result.outer.type).toBe('variable');
				expect(result.inner.type).toBe('variable');
				if (result.outer.type === 'variable') {
					expect(result.outer.name).toBe('F');
				}
				if (result.inner.type === 'variable') {
					expect(result.inner.name).toBe('G');
				}
			}
		});

		it('preserves metadata when mapping', () => {
			const node = compose(variable('f'), variable('g'), {
				metadata: { color: 'red' },
				operatorMetadata: { color: 'blue' }
			});

			const result = mapNode(node, (n) => n);

			expect(result.type).toBe('composition');
			if (result.type === 'composition') {
				expect(result.metadata).toEqual({ color: 'red' });
				expect(result.operatorMetadata).toEqual({ color: 'blue' });
			}
		});
	});

	describe('cloneNode()', () => {
		it('deep clones composition node', () => {
			const node = compose(variable('f'), variable('g'), {
				metadata: { color: 'red' }
			});

			const clone = cloneNode(node);

			expect(clone).not.toBe(node);
			expect(clone.type).toBe('composition');
			if (clone.type === 'composition') {
				expect(clone.outer).not.toBe(node.outer);
				expect(clone.inner).not.toBe(node.inner);
				expect(clone.metadata).toEqual({ color: 'red' });
			}
		});
	});

	describe('countNodes()', () => {
		it('counts composition and its children', () => {
			const node = compose(variable('f'), variable('g'));
			// composition + f + g = 3 nodes
			expect(countNodes(node)).toBe(3);
		});

		it('counts nested compositions correctly', () => {
			const fg = compose(variable('f'), variable('g'));
			const fgh = compose(fg, variable('h'));
			// outer composition + inner composition + f + g + h = 5 nodes
			expect(countNodes(fgh)).toBe(5);
		});
	});

	describe('getDepth()', () => {
		it('returns correct depth for simple composition', () => {
			const node = compose(variable('f'), variable('g'));
			expect(getDepth(node)).toBe(2); // composition -> children
		});

		it('returns correct depth for nested composition', () => {
			const fg = compose(variable('f'), variable('g'));
			const fgh = compose(fg, variable('h'));
			expect(getDepth(fgh)).toBe(3); // outer composition -> inner composition -> children
		});
	});

	// =============================================================================
	// LaTeX Generator Tests
	// =============================================================================

	describe('LaTeX generation', () => {
		it('generates correct LaTeX for simple composition', () => {
			const node = compose(variable('f'), variable('g'));
			const generator = new LatexGenerator();
			const latex = generator.generate(node);

			expect(latex).toBe('f \\circ g');
		});

		it('generates correct LaTeX for function composition with variables', () => {
			// Use variables f and g since functions with no args have delimiters
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g);
			const latex = toLatex(node);

			expect(latex).toBe('f \\circ g');
		});

		it('generates correct LaTeX for nested composition', () => {
			const f = variable('f');
			const g = variable('g');
			const h = variable('h');
			const fg = compose(f, g);
			const fgh = compose(fg, h);
			const generator = new LatexGenerator();
			const latex = generator.generate(fgh);

			expect(latex).toBe('f \\circ g \\circ h');
		});

		it('handles operatorMetadata in render', () => {
			const node = compose(variable('f'), variable('g'), {
				operatorMetadata: { color: 'red' }
			});
			const generator = new LatexGenerator({ renderMetadata: true });
			const result = generator.generate(node);

			// When renderMetadata is true, colored elements get wrapped
			// The \circ operator should be colored red
			expect(result).toContain('\\circ');
			// operatorMetadata applies color to the operator
			expect(result).toContain('\\textcolor{red}');
		});
	});

	// =============================================================================
	// Custom Syntax Generator Tests
	// =============================================================================

	describe('Custom syntax generation', () => {
		it('generates correct custom syntax for simple composition', () => {
			const node = compose(variable('f'), variable('g'));
			const custom = toCustom(node);

			expect(custom).toBe('f@g');
		});

		it('generates correct custom syntax for nested composition', () => {
			const f = variable('f');
			const g = variable('g');
			const h = variable('h');
			const fg = compose(f, g);
			const fgh = compose(fg, h);
			const custom = toCustom(fgh);

			expect(custom).toBe('f@g@h');
		});

		it('handles composition with variables as functions', () => {
			// Use variables since func('sin', []) would include delimiters
			const f = variable('f');
			const g = variable('g');
			const node = compose(f, g);
			const custom = toCustom(node);

			expect(custom).toBe('f@g');
		});
	});

	// =============================================================================
	// Pretty Print Tests
	// =============================================================================

	describe('prettyPrint()', () => {
		it('prints composition node correctly', () => {
			const node = compose(variable('f'), variable('g'));
			const output = prettyPrint(node, { colors: false });

			expect(output).toContain('Composition');
			expect(output).toContain('outer');
			expect(output).toContain('inner');
			expect(output).toContain('Variable: f');
			expect(output).toContain('Variable: g');
		});

		it('shows operatorMetadata in output', () => {
			const node = compose(variable('f'), variable('g'), {
				operatorMetadata: { color: 'red' }
			});
			const output = prettyPrint(node, { colors: false });

			expect(output).toContain('Composition');
			expect(output).toContain('op:[red]');
		});
	});
});
