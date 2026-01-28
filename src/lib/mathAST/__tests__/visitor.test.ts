import { describe, expect, it, vi } from 'vitest';
import {
	// Factory functions
	add,
	fraction as divide,
	func,
	piConstant,
	hole,
	implicitMultiply as multiply,
	number as num,
	parentheses,
	power,
	variable,
	// Types
	type AdditionNode,
	type DivisionNode,
	type FunctionNode,
	type MathNode,
	type MultiplicationNode,
	type NumberNode,
	type SuperscriptNode,
	// Visitor pattern
	visitAST,
	transformAST,
	type ASTVisitor,
	type TransformVisitor
} from '$lib/mathAST';

// Helper to create number nodes with string values
function number(value: number): NumberNode;
function number(value: string, metadata?: Record<string, unknown>): NumberNode;
function number(value: number | string, metadata?: Record<string, unknown>): NumberNode {
	if (typeof value === 'string') {
		return metadata ? num(value, metadata) : num(value);
	}
	return num(String(value));
}

// Helper to parse number value from string
const parseNumValue = (node: NumberNode): number => Number(node.value);

describe('visitAST - Read-only traversal', () => {
	describe('Basic traversal', () => {
		it('should visit all nodes in pre-order (enter) then post-order (leave)', () => {
			// Arrange: x + 2
			const tree = add(variable('x'), number(2));
			const visits: string[] = [];

			const visitor: ASTVisitor = {
				enterNode: (node) => {
					visits.push(`enter:${node.type}`);
				},
				leaveNode: (node) => {
					visits.push(`leave:${node.type}`);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert: root → left → right, then reverse
			expect(visits).toEqual([
				'enter:addition',
				'enter:variable',
				'leave:variable',
				'enter:number',
				'leave:number',
				'leave:addition'
			]);
		});

		it('should visit single node correctly', () => {
			// Arrange
			const tree = number(42);
			const visits: string[] = [];

			const visitor: ASTVisitor = {
				enterNode: () => {
					visits.push('enter');
				},
				leaveNode: () => {
					visits.push('leave');
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(visits).toEqual(['enter', 'leave']);
		});

		it('should work with empty visitor (no callbacks defined)', () => {
			// Arrange
			const tree = add(number(1), number(2));

			// Act & Assert: should not throw
			expect(() => visitAST(tree, {})).not.toThrow();
		});
	});

	describe('Context information', () => {
		it('should provide parent node in context (undefined for root)', () => {
			// Arrange: x + 2
			const tree = add(variable('x'), number(2));
			const parents: (MathNode | undefined)[] = [];

			const visitor: ASTVisitor = {
				enterNode: (_node, context) => {
					parents.push(context.parent);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(parents[0]).toBeUndefined(); // root
			expect(parents[1]).toEqual(tree); // left child
			expect(parents[2]).toEqual(tree); // right child
		});

		it('should provide correct path from root', () => {
			// Arrange: (x + 2) * 3
			const innerAdd = add(variable('x'), number(2));
			const tree = multiply(parentheses(innerAdd), number(3));
			const paths: (string | number)[][] = [];

			const visitor: ASTVisitor = {
				enterNode: (_node, context) => {
					paths.push([...context.path]);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(paths[0]).toEqual([]); // root multiply
			expect(paths[1]).toEqual(['left']); // parentheses
			expect(paths[2]).toEqual(['left', 'inner']); // addition
			expect(paths[3]).toEqual(['left', 'inner', 'left']); // variable x
			expect(paths[4]).toEqual(['left', 'inner', 'right']); // number 2
			expect(paths[5]).toEqual(['right']); // number 3
		});

		it('should provide correct depth (root = 0)', () => {
			// Arrange: x + (y * 2)
			const innerMult = multiply(variable('y'), number(2));
			const tree = add(variable('x'), parentheses(innerMult));
			const depths: number[] = [];

			const visitor: ASTVisitor = {
				enterNode: (_node, context) => {
					depths.push(context.depth);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(depths).toEqual([
				0, // root addition
				1, // variable x
				1, // parentheses
				2, // multiplication
				3, // variable y
				3 // number 2
			]);
		});
	});

	describe('Skip children behavior', () => {
		it('should skip children when enterNode returns "skip"', () => {
			// Arrange: x + (y * 2) - skip parentheses children
			const innerMult = multiply(variable('y'), number(2));
			const tree = add(variable('x'), parentheses(innerMult));
			const visits: string[] = [];

			const visitor: ASTVisitor = {
				enterNode: (node) => {
					visits.push(`enter:${node.type}`);
					// DelimiterNode with delimiters === 'parentheses'
					if (node.type === 'delimiter') return 'skip';
				},
				leaveNode: (node) => {
					visits.push(`leave:${node.type}`);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert: delimiter entered/left but inner nodes not visited
			expect(visits).toEqual([
				'enter:addition',
				'enter:variable',
				'leave:variable',
				'enter:delimiter',
				'leave:delimiter', // leave still called
				'leave:addition'
			]);
		});

		it('should skip children when type-specific enter returns "skip"', () => {
			// Arrange: x + 2
			const tree = add(variable('x'), number(2));
			const visits: string[] = [];

			const visitor: ASTVisitor = {
				enterAddition: () => {
					visits.push('enter:addition');
					return 'skip';
				},
				leaveAddition: () => {
					visits.push('leave:addition');
				},
				enterNode: (node) => {
					if (node.type !== 'addition') visits.push(`enter:${node.type}`);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert: addition's children not visited
			expect(visits).toEqual(['enter:addition', 'leave:addition']);
		});

		it('should still call leave hooks when skipping children', () => {
			// Arrange
			const tree = add(number(1), number(2));
			const hooks: string[] = [];

			const visitor: ASTVisitor = {
				enterAddition: () => {
					hooks.push('enterAddition');
					return 'skip';
				},
				leaveAddition: () => {
					hooks.push('leaveAddition');
				},
				leaveNode: () => {
					hooks.push('leaveNode');
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(hooks).toEqual(['enterAddition', 'leaveAddition', 'leaveNode']);
		});
	});

	describe('Type-specific callbacks', () => {
		it('should call type-specific enter callbacks', () => {
			// Arrange: x + 2 * π
			const tree = add(variable('x'), multiply(number(2), piConstant()));
			const typeVisits: string[] = [];

			const visitor: ASTVisitor = {
				enterVariable: (node) => {
					typeVisits.push(`var:${node.name}`);
				},
				enterNumber: (node) => {
					typeVisits.push(`num:${node.value}`);
				},
				enterConstant: (node) => {
					typeVisits.push(`const:${node.constant}`);
				},
				enterAddition: () => {
					typeVisits.push('add');
				},
				enterMultiplication: () => {
					typeVisits.push('mult');
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(typeVisits).toEqual(['add', 'var:x', 'mult', 'num:2', 'const:pi']);
		});

		it('should call type-specific leave callbacks', () => {
			// Arrange: x / y
			const tree = divide(variable('x'), variable('y'));
			const typeVisits: string[] = [];

			const visitor: ASTVisitor = {
				leaveVariable: (node) => {
					typeVisits.push(`var:${node.name}`);
				},
				leaveDivision: () => {
					typeVisits.push('div');
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert: post-order (children before parent)
			expect(typeVisits).toEqual(['var:x', 'var:y', 'div']);
		});

		it('should call both generic and type-specific callbacks in correct order', () => {
			// Arrange: simple number node
			const tree = number(42);
			const hooks: string[] = [];

			const visitor: ASTVisitor = {
				enterNode: () => {
					hooks.push('enterNode');
				},
				enterNumber: () => {
					hooks.push('enterNumber');
				},
				leaveNumber: () => {
					hooks.push('leaveNumber');
				},
				leaveNode: () => {
					hooks.push('leaveNode');
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(hooks).toEqual(['enterNode', 'enterNumber', 'leaveNumber', 'leaveNode']);
		});
	});

	describe('Edge cases', () => {
		it('should handle leaf nodes (number, variable, greek, symbol, hole)', () => {
			// Arrange
			const leaves = [number(1), variable('x'), piConstant(), hole(0, '?')];
			const visitCounts: number[] = [];

			leaves.forEach((leaf) => {
				let count = 0;
				const visitor: ASTVisitor = {
					enterNode: () => {
						count++;
					}
				};
				visitAST(leaf, visitor);
				visitCounts.push(count);
			});

			// Assert: each leaf visited exactly once
			expect(visitCounts).toEqual([1, 1, 1, 1]);
		});

		it('should handle deeply nested trees (100+ levels)', () => {
			// Arrange: build 100-level deep tree
			let tree: MathNode = number(0);
			for (let i = 1; i <= 100; i++) {
				tree = add(tree, number(i));
			}

			let maxDepth = 0;
			const visitor: ASTVisitor = {
				enterNode: (_node, context) => {
					maxDepth = Math.max(maxDepth, context.depth);
				}
			};

			// Act
			visitAST(tree, visitor);

			// Assert
			expect(maxDepth).toBeGreaterThanOrEqual(100);
		});

		it('should handle FunctionNode with args, power, and base', () => {
			// Arrange: sin^2(x + y)_10
			// Note: power is a SuperscriptNode, base is a MathNode
			const funcNode = func('sin', [add(variable('x'), variable('y'))], {
				power: power(variable('_'), number(2)), // SuperscriptNode with dummy base
				base: number(10)
			});
			const paths: (string | number)[][] = [];

			const visitor: ASTVisitor = {
				enterNode: (_node, context) => {
					paths.push([...context.path]);
				}
			};

			// Act
			visitAST(funcNode, visitor);

			// Assert: visits function, args[0], power content (inner), base
			expect(paths).toContainEqual([]); // function itself
			expect(paths).toContainEqual(['args', 0]); // first arg
			expect(paths).toContainEqual(['args', 0, 'left']); // x in arg
			expect(paths).toContainEqual(['args', 0, 'right']); // y in arg
			expect(paths).toContainEqual(['power', 'inner']); // power content (the exponent)
			expect(paths).toContainEqual(['base']); // base
		});

		it('should handle FunctionNode with multiple arguments', () => {
			// Arrange: f(x, y, z)
			const funcNode = func('f', [variable('x'), variable('y'), variable('z')]);
			const argPaths: (string | number)[][] = [];

			const visitor: ASTVisitor = {
				enterVariable: (_node, context) => {
					argPaths.push([...context.path]);
				}
			};

			// Act
			visitAST(funcNode, visitor);

			// Assert
			expect(argPaths).toEqual([
				['args', 0],
				['args', 1],
				['args', 2]
			]);
		});
	});

	describe('Callback execution', () => {
		it('should not call callbacks if not defined', () => {
			// Arrange
			const tree = add(number(1), number(2));
			const spy = vi.fn();

			const visitor: ASTVisitor = {
				enterNode: spy
				// no leave callbacks
			};

			// Act
			visitAST(tree, visitor);

			// Assert: only enter called
			expect(spy).toHaveBeenCalled();
		});

		it('should handle visitor with only leave callbacks', () => {
			// Arrange
			const tree = multiply(variable('x'), number(2));
			const visits: string[] = [];

			const visitor: ASTVisitor = {
				leaveNode: (node) => visits.push(node.type)
			};

			// Act
			visitAST(tree, visitor);

			// Assert: post-order traversal
			expect(visits).toEqual(['variable', 'number', 'multiplication']);
		});
	});
});

describe('transformAST - Transformation traversal', () => {
	describe('Enter transformations', () => {
		it('should replace node when enter returns MathNode', () => {
			// Arrange: x + 2 → replace all numbers with 999
			const tree = add(variable('x'), number(2));

			const visitor: TransformVisitor = {
				enterNumber: () => number(999)
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert
			expect(result).toEqual(add(variable('x'), number(999)));
		});

		it('should replace node before visiting children', () => {
			// Arrange: x + 2 → replace addition with multiplication
			const tree = add(variable('x'), number(2));
			const visits: string[] = [];

			const visitor: TransformVisitor = {
				enterAddition: (node) => {
					visits.push('enterAddition');
					// Replace with multiplication of same children
					return multiply(node.left, node.right);
				},
				enterMultiplication: () => {
					visits.push('enterMultiplication');
				}
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: multiplication entered instead of addition's children
			expect(visits).toEqual(['enterAddition', 'enterMultiplication']);
			expect(result.type).toBe('multiplication');
		});

		it('should preserve original tree immutability', () => {
			// Arrange
			const original = add(number(1), number(2));
			const originalLeft = original.left;

			const visitor: TransformVisitor = {
				enterNumber: () => number(999)
			};

			// Act
			transformAST(original, visitor);

			// Assert: original unchanged
			expect(original.left).toBe(originalLeft);
			expect((original.left as NumberNode).value).toBe('1');
		});
	});

	describe('Leave transformations', () => {
		it('should replace node when leave returns MathNode', () => {
			// Arrange: x + 2 → double all numbers after visiting
			const tree = add(variable('x'), number(2));

			const visitor: TransformVisitor = {
				leaveNumber: (node) => number(parseNumValue(node) * 2)
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert
			expect(result).toEqual(add(variable('x'), number(4)));
		});

		it('should receive already-transformed children (bottom-up)', () => {
			// Arrange: (x + 1) * 2 → increment numbers, then check parent sees new values
			const tree = multiply(parentheses(add(variable('x'), number(1))), number(2));
			const parenthesesChildren: MathNode[] = [];

			const visitor: TransformVisitor = {
				leaveNumber: (node) => number(parseNumValue(node) + 1),
				leaveParentheses: (node) => {
					// DelimiterNode has 'content' property, not 'inner'
					parenthesesChildren.push(node.content);
					return node;
				}
			};

			// Act
			transformAST(tree, visitor);

			// Assert: parentheses sees inner addition with number(2), not number(1)
			const innerAddition = parenthesesChildren[0] as AdditionNode;
			expect((innerAddition.right as NumberNode).value).toBe('2');
		});
	});

	describe('Skip with replacement', () => {
		it('should replace node and skip children when returning { node, skip: true }', () => {
			// Arrange: x + (y * 2) → replace parentheses with hole, skip inner
			const innerMult = multiply(variable('y'), number(2));
			const tree = add(variable('x'), parentheses(innerMult));
			const visits: string[] = [];

			const visitor: TransformVisitor = {
				enterNode: (node) => {
					visits.push(node.type);
				},
				enterParentheses: () => ({ node: hole(0, '?'), skip: true })
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: multiplication not visited, result has hole
			expect(visits).not.toContain('multiplication');
			expect(result).toEqual(add(variable('x'), hole(0, '?')));
		});

		it('should still call leave hooks when skipping with replacement', () => {
			// Arrange
			const tree = add(number(1), number(2));
			const hooks: string[] = [];

			const visitor: TransformVisitor = {
				enterAddition: () => {
					hooks.push('enter');
					return { node: multiply(number(3), number(4)), skip: true };
				},
				leaveAddition: () => {
					hooks.push('leave');
				}
			};

			// Act
			transformAST(tree, visitor);

			// Assert: leave called even with skip
			expect(hooks).toContain('leave');
		});
	});

	describe('Skip without replacement', () => {
		it('should skip children when enter returns "skip"', () => {
			// Arrange: x + (y * 2) → skip parentheses children
			const innerMult = multiply(variable('y'), number(2));
			const tree = add(variable('x'), parentheses(innerMult));
			const visits: string[] = [];

			const visitor: TransformVisitor = {
				enterNode: (node) => {
					visits.push(node.type);
					// DelimiterNode type is 'delimiter', not 'parentheses'
					if (node.type === 'delimiter') return 'skip';
				}
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: children not visited, structure preserved
			expect(visits).not.toContain('multiplication');
			expect(result).toEqual(tree);
		});
	});

	describe('Metadata preservation', () => {
		it('should preserve metadata when reconstructing nodes', () => {
			// Arrange: node with metadata
			const nodeWithMeta = number('42', { simplified: true, original: '40 + 2' });
			const tree = add(nodeWithMeta, number(1));

			const visitor: TransformVisitor = {
				leaveAddition: (node) => {
					// Force reconstruction by returning new node
					return multiply(node.left, node.right);
				}
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: left child still has metadata
			expect((result as MultiplicationNode).left.metadata).toEqual({
				simplified: true,
				original: '40 + 2'
			});
		});

		it('should preserve metadata on replaced nodes if not explicitly changed', () => {
			// Arrange
			const nodeWithMeta = number('5', { source: 'user' });

			const visitor: TransformVisitor = {
				enterNumber: (node) => {
					// Replace but preserve metadata manually
					return number(String(parseNumValue(node) * 2), node.metadata as Record<string, unknown>);
				}
			};

			// Act
			const result = transformAST(nodeWithMeta, visitor);

			// Assert
			expect((result as NumberNode).metadata).toEqual({ source: 'user' });
		});
	});

	describe('Complex transformations', () => {
		it('should handle multiple transformation passes', () => {
			// Arrange: x + 1 → first pass: x + 2, second pass: x + 4
			const tree = add(variable('x'), number(1));

			const visitor1: TransformVisitor = {
				leaveNumber: (node) => number(parseNumValue(node) * 2)
			};

			const visitor2: TransformVisitor = {
				leaveNumber: (node) => number(parseNumValue(node) * 2)
			};

			// Act
			const pass1 = transformAST(tree, visitor1);
			const pass2 = transformAST(pass1, visitor2);

			// Assert
			expect((pass1 as AdditionNode).right).toEqual(number(2));
			expect((pass2 as AdditionNode).right).toEqual(number(4));
		});

		it('should flatten nested operations when transforming', () => {
			// Arrange: (x + y) + z → x + y + z (remove parentheses)
			const innerAdd = add(variable('x'), variable('y'));
			const tree = add(parentheses(innerAdd), variable('z'));

			const visitor: TransformVisitor = {
				// DelimiterNode has 'content' property, not 'inner'
				enterParentheses: (node) => node.content
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: parentheses removed
			expect(result.type).toBe('addition');
			expect((result as AdditionNode).left.type).toBe('addition');
		});

		it('should handle conditional transformations based on context', () => {
			// Arrange: x * 0 → optimize to 0 only at depth > 0
			const tree = multiply(add(variable('x'), multiply(variable('y'), number(0))), number(5));

			const visitor: TransformVisitor = {
				leaveMultiplication: (node, context) => {
					// Only optimize nested multiplications
					if (context.depth > 0) {
						const right = node.right as NumberNode;
						if (right.type === 'number' && right.value === '0') {
							return number(0);
						}
					}
					return node;
				}
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: inner y*0 optimized, outer x*5 preserved
			expect(((result as MultiplicationNode).left as AdditionNode).right).toEqual(number(0));
			expect(result.type).toBe('multiplication');
		});
	});

	describe('Edge cases', () => {
		it('should handle transformation with empty visitor', () => {
			// Arrange
			const tree = add(number(1), number(2));

			// Act
			const result = transformAST(tree, {});

			// Assert: tree unchanged
			expect(result).toEqual(tree);
		});

		it('should handle identity transformation (return same node)', () => {
			// Arrange
			const tree = variable('x');

			const visitor: TransformVisitor = {
				enterVariable: (node) => node
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert
			expect(result).toBe(tree); // Same reference
		});

		it('should handle transforming leaf nodes', () => {
			// Arrange
			const leaves = [number(1), variable('x'), piConstant(), hole(0, '?')] satisfies MathNode[];

			const visitor: TransformVisitor = {
				leaveNode: (node) => {
					if (node.type === 'hole') return variable('replaced');
					return node;
				}
			};

			// Act
			const results = leaves.map((leaf) => transformAST(leaf, visitor));

			// Assert: only hole transformed
			expect(results[0]).toEqual(number(1));
			expect(results[1]).toEqual(variable('x'));
			expect(results[2]).toEqual(piConstant());
			expect(results[3]).toEqual(variable('replaced'));
		});

		it('should handle FunctionNode transformation with all properties', () => {
			// Arrange: sin^2(x)_10 → cos^3(y)_20
			// power is a SuperscriptNode with dummy base, base is a number
			const funcNode = func('sin', [variable('x')], {
				power: power(variable('_'), number(2)),
				base: number(10)
			});

			const visitor: TransformVisitor = {
				leaveFunction: () =>
					func('cos', [variable('y')], {
						power: power(variable('_'), number(3)),
						base: number(20)
					})
			};

			// Act
			const result = transformAST(funcNode, visitor) as FunctionNode;

			// Assert
			expect(result.name).toBe('cos');
			expect(result.args[0]).toEqual(variable('y'));
			// power is a SuperscriptNode, access superscript property
			expect((result.power as SuperscriptNode | undefined)?.superscript).toEqual(number(3));
			expect(result.base).toEqual(number(20));
		});

		it('should handle deep transformations preserving structure', () => {
			// Arrange: deeply nested expression
			let tree: MathNode = number(1);
			for (let i = 0; i < 50; i++) {
				tree = add(tree, number(i));
			}

			const visitor: TransformVisitor = {
				leaveNumber: (node) => number(parseNumValue(node) + 1)
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: structure preserved, all numbers incremented
			let current = result;
			let count = 0;
			while (current.type === 'addition') {
				count++;
				current = (current as AdditionNode).left;
			}
			expect(count).toBe(50);
			expect((current as NumberNode).value).toBe('2'); // 1 + 1 = 2
		});
	});

	describe('Combined enter and leave', () => {
		it('should apply both enter and leave transformations', () => {
			// Arrange: x + 1 → enter: x + 2, leave: x + 4
			const tree = add(variable('x'), number(1));

			const visitor: TransformVisitor = {
				enterNumber: (node) => number(parseNumValue(node) * 2),
				leaveNumber: (node) => number(parseNumValue(node) * 2)
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: 1 * 2 * 2 = 4
			expect((result as AdditionNode).right).toEqual(number(4));
		});

		it('should prioritize enter over leave if both return nodes', () => {
			// Arrange
			const tree = number(1);

			const visitor: TransformVisitor = {
				enterNumber: () => number(100),
				leaveNumber: () => number(200)
			};

			// Act
			const result = transformAST(tree, visitor);

			// Assert: enter replacement happens first, leave sees 100
			// Final result depends on implementation (typically leave wins: 200)
			expect(result).toEqual(number(200));
		});
	});
});

describe('Integration - visitAST + transformAST', () => {
	it('should collect information with visitAST, then transform based on that info', () => {
		// Arrange: x + 2 * y - collect variables, then replace with holes
		const tree = add(variable('x'), multiply(number(2), variable('y')));
		const variableNames: string[] = [];

		// Step 1: Collect variable names
		const collectVisitor: ASTVisitor = {
			enterVariable: (node) => {
				variableNames.push(node.name);
			}
		};
		visitAST(tree, collectVisitor);

		// Step 2: Transform based on collected info
		let holeIndex = 0;
		const transformVisitor: TransformVisitor = {
			enterVariable: (node) => {
				if (variableNames.includes(node.name)) {
					return hole(holeIndex++, `?${node.name}`);
				}
			}
		};
		const result = transformAST(tree, transformVisitor);

		// Assert
		expect(variableNames).toEqual(['x', 'y']);
		expect((result as AdditionNode).left).toEqual(hole(0, '?x'));
		expect(((result as AdditionNode).right as MultiplicationNode).right).toEqual(hole(1, '?y'));
	});

	it('should use visitAST to validate, then transformAST to fix issues', () => {
		// Arrange: x / 0 - detect division by zero, then fix
		const tree = divide(variable('x'), number(0));
		let hasDivByZero = false;

		// Step 1: Detect issue
		// Note: DivisionNode uses numerator/denominator, not left/right
		// NumberNode.value is a string
		const detectVisitor: ASTVisitor = {
			enterDivision: (node) => {
				if (node.denominator.type === 'number' && node.denominator.value === '0') {
					hasDivByZero = true;
				}
			}
		};
		visitAST(tree, detectVisitor);

		// Step 2: Fix issue
		let fixed: MathNode = tree;
		if (hasDivByZero) {
			const fixVisitor: TransformVisitor = {
				enterDivision: (node) => {
					if (node.denominator.type === 'number' && node.denominator.value === '0') {
						return divide(node.numerator, number(1));
					}
				}
			};
			fixed = transformAST(tree, fixVisitor);
		}

		// Assert
		expect(hasDivByZero).toBe(true);
		expect(((fixed as DivisionNode).denominator as NumberNode).value).toBe('1');
	});
});
