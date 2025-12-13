/**
 * MathAST Transformation Helpers
 *
 * Utilities for transforming, traversing, and manipulating MathAST nodes.
 * All functions are immutable - they return new nodes rather than modifying inputs.
 */

import type { MathNode, NodeMetadata } from './types';

import {
	add,
	compose,
	delimiter,
	divide,
	func,
	greek,
	hole,
	multiply,
	number,
	opposite,
	positive,
	relation,
	subscript,
	subtract,
	superscript,
	symbol,
	variable,
	withUnit
} from './factory';

// =============================================================================
// Metadata Helpers
// =============================================================================

/**
 * Returns a new node with merged metadata
 * @param node - Node to add metadata to
 * @param metadata - Metadata to merge (overwrites existing fields)
 * @returns New node with merged metadata
 */
export function withMetadata<T extends MathNode>(node: T, metadata: Partial<NodeMetadata>): T {
	const existingMetadata = node.metadata || {};
	const mergedMetadata = { ...existingMetadata, ...metadata };

	return {
		...node,
		metadata: mergedMetadata
	} as T;
}

/**
 * Adds or merges operator metadata to a node that supports it.
 * Returns the original node unchanged if it doesn't support operator metadata.
 */
export function withOperatorMetadata<T extends MathNode>(
	node: T,
	operatorMetadata: Partial<NodeMetadata>
): T {
	if (!('operatorMetadata' in node)) return node;
	const nodeWithOp = node as T & { operatorMetadata?: NodeMetadata };
	const existing = nodeWithOp.operatorMetadata || {};
	return {
		...node,
		operatorMetadata: { ...existing, ...operatorMetadata }
	} as T;
}

/**
 * Adds or merges delimiter metadata to a node that supports it.
 * @param side - 'left', 'right', or 'both' (default: 'both')
 */
export function withDelimiterMetadata<T extends MathNode>(
	node: T,
	delimiterMetadata: Partial<NodeMetadata>,
	side: 'left' | 'right' | 'both' = 'both'
): T {
	if (!('delimiterMetadata' in node)) return node;

	type DelimiterNode = T & {
		delimiterMetadata?: NodeMetadata;
		leftDelimiterMetadata?: NodeMetadata;
		rightDelimiterMetadata?: NodeMetadata;
	};
	const nodeWithDelim = node as DelimiterNode;
	const updates: Record<string, NodeMetadata> = {};

	if (side === 'left' || side === 'both') {
		const existing = nodeWithDelim.leftDelimiterMetadata ?? nodeWithDelim.delimiterMetadata ?? {};
		updates.leftDelimiterMetadata = { ...existing, ...delimiterMetadata };
	}

	if (side === 'right' || side === 'both') {
		const existing = nodeWithDelim.rightDelimiterMetadata ?? nodeWithDelim.delimiterMetadata ?? {};
		updates.rightDelimiterMetadata = { ...existing, ...delimiterMetadata };
	}

	return { ...node, ...updates } as T;
}

/**
 * Adds or merges relation metadata to a RelationNode.
 */
export function withRelationMetadata<T extends MathNode>(
	node: T,
	relationMetadata: Partial<NodeMetadata>
): T {
	if (!('relationMetadata' in node)) return node;
	const nodeWithRel = node as T & { relationMetadata?: NodeMetadata };
	const existing = nodeWithRel.relationMetadata || {};
	return {
		...node,
		relationMetadata: { ...existing, ...relationMetadata }
	} as T;
}

/**
 * Adds or merges name metadata to a FunctionNode.
 */
export function withNameMetadata<T extends MathNode>(
	node: T,
	nameMetadata: Partial<NodeMetadata>
): T {
	if (!('nameMetadata' in node)) return node;
	const nodeWithName = node as T & { nameMetadata?: NodeMetadata };
	const existing = nodeWithName.nameMetadata || {};
	return {
		...node,
		nameMetadata: { ...existing, ...nameMetadata }
	} as T;
}

/**
 * Adds or merges unit metadata to a UnitNode.
 */
export function withUnitMetadata<T extends MathNode>(
	node: T,
	unitMetadata: Partial<NodeMetadata>
): T {
	if (!('unitMetadata' in node)) return node;
	const nodeWithUnit = node as T & { unitMetadata?: NodeMetadata };
	const existing = nodeWithUnit.unitMetadata || {};
	return {
		...node,
		unitMetadata: { ...existing, ...unitMetadata }
	} as T;
}

// =============================================================================
// Node Traversal Helpers
// =============================================================================

/**
 * Get immediate children of a node
 * @param node - Node to get children from
 * @returns Array of direct child nodes
 */
export function getChildren(node: MathNode): MathNode[] {
	switch (node.type) {
		// Literals have no children
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
			return [];

		// Binary operations
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return [node.left, node.right];

		case 'division':
			return [node.numerator, node.denominator];

		// Unary operations
		case 'opposite':
		case 'positive':
			return [node.operand];

		// Function
		case 'function': {
			const children = [...node.args];
			if (node.power) children.push(node.power);
			if (node.base) children.push(node.base);
			return children;
		}

		// Structural
		case 'delimiter':
			return [node.content];

		case 'subscript':
			return [node.base, node.subscript];

		case 'superscript':
			return [node.base, node.superscript];

		// Relation
		case 'relation':
			return [node.left, node.right];

		// Unit
		case 'unit':
			return [node.expression];

		// Composition
		case 'composition':
			return [node.outer, node.inner];
	}
}

// =============================================================================
// Tree Traversal and Transformation
// =============================================================================

/**
 * Transform nodes recursively (bottom-up: children first, then parent)
 * @param node - Root node to transform
 * @param fn - Transformation function applied to each node
 * @returns New transformed tree
 */
export function mapNode(node: MathNode, fn: (node: MathNode) => MathNode): MathNode {
	// First, recursively transform children
	let transformedNode: MathNode;

	switch (node.type) {
		// Literals - no children, just return as-is
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
			transformedNode = node;
			break;

		// Binary operations
		case 'addition':
			transformedNode = add(mapNode(node.left, fn), mapNode(node.right, fn), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			});
			break;

		case 'subtraction':
			transformedNode = subtract(mapNode(node.left, fn), mapNode(node.right, fn), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			});
			break;

		case 'multiplication':
			transformedNode = multiply(
				mapNode(node.left, fn),
				mapNode(node.right, fn),
				node.displayStyle,
				{
					operatorMetadata: node.operatorMetadata,
					metadata: node.metadata
				}
			);
			break;

		case 'division':
			transformedNode = divide(
				mapNode(node.numerator, fn),
				mapNode(node.denominator, fn),
				node.displayStyle,
				{
					operatorMetadata: node.operatorMetadata,
					metadata: node.metadata
				}
			);
			break;

		// Unary operations
		case 'opposite':
			transformedNode = opposite(mapNode(node.operand, fn), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			});
			break;

		case 'positive':
			transformedNode = positive(mapNode(node.operand, fn), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			});
			break;

		// Function
		case 'function':
			transformedNode = func(
				node.name,
				node.args.map((arg) => mapNode(arg, fn)),
				{
					...(node.power && { power: mapNode(node.power, fn) }),
					...(node.base && { base: mapNode(node.base, fn) }),
					...(node.derivativeOrder !== undefined && { derivativeOrder: node.derivativeOrder }),
					...(node.isInverse && { isInverse: node.isInverse }),
					...(node.nameMetadata && { nameMetadata: node.nameMetadata }),
					...(node.delimiterMetadata && { delimiterMetadata: node.delimiterMetadata }),
					...(node.leftDelimiterMetadata && { leftDelimiterMetadata: node.leftDelimiterMetadata }),
					...(node.rightDelimiterMetadata && {
						rightDelimiterMetadata: node.rightDelimiterMetadata
					}),
					...(node.metadata && { metadata: node.metadata })
				}
			);
			break;

		// Structural
		case 'delimiter':
			transformedNode = delimiter(node.delimiters, mapNode(node.content, fn), node.semantic, {
				delimiterMetadata: node.delimiterMetadata,
				leftDelimiterMetadata: node.leftDelimiterMetadata,
				rightDelimiterMetadata: node.rightDelimiterMetadata,
				metadata: node.metadata
			});
			break;

		case 'subscript':
			transformedNode = subscript(
				mapNode(node.base, fn),
				mapNode(node.subscript, fn),
				node.metadata
			);
			break;

		case 'superscript':
			transformedNode = superscript(
				mapNode(node.base, fn),
				mapNode(node.superscript, fn),
				node.metadata
			);
			break;

		// Relation
		case 'relation':
			transformedNode = relation(node.relation, mapNode(node.left, fn), mapNode(node.right, fn), {
				relationMetadata: node.relationMetadata,
				metadata: node.metadata
			});
			break;

		// Unit
		case 'unit':
			transformedNode = withUnit(mapNode(node.expression, fn), node.unit, {
				unitMetadata: node.unitMetadata,
				metadata: node.metadata
			});
			break;

		// Composition
		case 'composition':
			transformedNode = compose(mapNode(node.outer, fn), mapNode(node.inner, fn), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			});
			break;
	}

	// Then apply transformation to the parent
	return fn(transformedNode);
}

/**
 * Transform nodes recursively (top-down: parent first, then children)
 * @param node - Root node to transform
 * @param fn - Transformation function applied to each node
 * @returns New transformed tree
 */
export function mapNodeTopDown(node: MathNode, fn: (node: MathNode) => MathNode): MathNode {
	// First apply transformation to parent
	const transformedParent = fn(node);

	// Then recursively transform children
	switch (transformedParent.type) {
		// Literals - no children
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
			return transformedParent;

		// Binary operations
		case 'addition':
			return add(
				mapNodeTopDown(transformedParent.left, fn),
				mapNodeTopDown(transformedParent.right, fn),
				{
					operatorMetadata: transformedParent.operatorMetadata,
					metadata: transformedParent.metadata
				}
			);

		case 'subtraction':
			return subtract(
				mapNodeTopDown(transformedParent.left, fn),
				mapNodeTopDown(transformedParent.right, fn),
				{
					operatorMetadata: transformedParent.operatorMetadata,
					metadata: transformedParent.metadata
				}
			);

		case 'multiplication':
			return multiply(
				mapNodeTopDown(transformedParent.left, fn),
				mapNodeTopDown(transformedParent.right, fn),
				transformedParent.displayStyle,
				{
					operatorMetadata: transformedParent.operatorMetadata,
					metadata: transformedParent.metadata
				}
			);

		case 'division':
			return divide(
				mapNodeTopDown(transformedParent.numerator, fn),
				mapNodeTopDown(transformedParent.denominator, fn),
				transformedParent.displayStyle,
				{
					operatorMetadata: transformedParent.operatorMetadata,
					metadata: transformedParent.metadata
				}
			);

		// Unary operations
		case 'opposite':
			return opposite(mapNodeTopDown(transformedParent.operand, fn), {
				operatorMetadata: transformedParent.operatorMetadata,
				metadata: transformedParent.metadata
			});

		case 'positive':
			return positive(mapNodeTopDown(transformedParent.operand, fn), {
				operatorMetadata: transformedParent.operatorMetadata,
				metadata: transformedParent.metadata
			});

		// Function
		case 'function':
			return func(
				transformedParent.name,
				transformedParent.args.map((arg) => mapNodeTopDown(arg, fn)),
				{
					...(transformedParent.power && { power: mapNodeTopDown(transformedParent.power, fn) }),
					...(transformedParent.base && { base: mapNodeTopDown(transformedParent.base, fn) }),
					...(transformedParent.derivativeOrder !== undefined && {
						derivativeOrder: transformedParent.derivativeOrder
					}),
					...(transformedParent.isInverse && { isInverse: transformedParent.isInverse }),
					...(transformedParent.nameMetadata && { nameMetadata: transformedParent.nameMetadata }),
					...(transformedParent.delimiterMetadata && {
						delimiterMetadata: transformedParent.delimiterMetadata
					}),
					...(transformedParent.leftDelimiterMetadata && {
						leftDelimiterMetadata: transformedParent.leftDelimiterMetadata
					}),
					...(transformedParent.rightDelimiterMetadata && {
						rightDelimiterMetadata: transformedParent.rightDelimiterMetadata
					}),
					...(transformedParent.metadata && { metadata: transformedParent.metadata })
				}
			);

		// Structural
		case 'delimiter':
			return delimiter(
				transformedParent.delimiters,
				mapNodeTopDown(transformedParent.content, fn),
				transformedParent.semantic,
				{
					delimiterMetadata: transformedParent.delimiterMetadata,
					leftDelimiterMetadata: transformedParent.leftDelimiterMetadata,
					rightDelimiterMetadata: transformedParent.rightDelimiterMetadata,
					metadata: transformedParent.metadata
				}
			);

		case 'subscript':
			return subscript(
				mapNodeTopDown(transformedParent.base, fn),
				mapNodeTopDown(transformedParent.subscript, fn),
				transformedParent.metadata
			);

		case 'superscript':
			return superscript(
				mapNodeTopDown(transformedParent.base, fn),
				mapNodeTopDown(transformedParent.superscript, fn),
				transformedParent.metadata
			);

		// Relation
		case 'relation':
			return relation(
				transformedParent.relation,
				mapNodeTopDown(transformedParent.left, fn),
				mapNodeTopDown(transformedParent.right, fn),
				{
					relationMetadata: transformedParent.relationMetadata,
					metadata: transformedParent.metadata
				}
			);

		// Unit
		case 'unit':
			return withUnit(mapNodeTopDown(transformedParent.expression, fn), transformedParent.unit, {
				unitMetadata: transformedParent.unitMetadata,
				metadata: transformedParent.metadata
			});

		// Composition
		case 'composition':
			return compose(
				mapNodeTopDown(transformedParent.outer, fn),
				mapNodeTopDown(transformedParent.inner, fn),
				{
					operatorMetadata: transformedParent.operatorMetadata,
					metadata: transformedParent.metadata
				}
			);
	}
}

// =============================================================================
// Node Search and Query
// =============================================================================

/**
 * Find all nodes matching a predicate
 * @param node - Root node to search from
 * @param predicate - Function that returns true for matching nodes
 * @returns Array of all matching nodes
 */
export function findNodes<T extends MathNode>(
	node: MathNode,
	predicate: (node: MathNode) => node is T
): T[];
export function findNodes(node: MathNode, predicate: (node: MathNode) => boolean): MathNode[];
export function findNodes(node: MathNode, predicate: (node: MathNode) => boolean): MathNode[] {
	const results: MathNode[] = [];

	// Check if current node matches
	if (predicate(node)) {
		results.push(node);
	}

	// Recursively search children
	const children = getChildren(node);
	for (const child of children) {
		results.push(...findNodes(child, predicate));
	}

	return results;
}

/**
 * Find the first node matching a predicate
 * @param node - Root node to search from
 * @param predicate - Function that returns true for matching nodes
 * @returns First matching node, or undefined if not found
 */
export function findFirst(
	node: MathNode,
	predicate: (node: MathNode) => boolean
): MathNode | undefined {
	// Check if current node matches
	if (predicate(node)) {
		return node;
	}

	// Recursively search children
	const children = getChildren(node);
	for (const child of children) {
		const found = findFirst(child, predicate);
		if (found) return found;
	}

	return undefined;
}

/**
 * Replace all nodes matching a predicate
 * @param root - Root node to search from
 * @param predicate - Function that returns true for nodes to replace
 * @param replacement - Replacement node or function that takes the matched node and returns replacement
 * @returns New tree with matching nodes replaced
 */
export function replaceNode(
	root: MathNode,
	predicate: (node: MathNode) => boolean,
	replacement: MathNode | ((node: MathNode) => MathNode)
): MathNode {
	return mapNode(root, (node) => {
		if (predicate(node)) {
			return typeof replacement === 'function' ? replacement(node) : replacement;
		}
		return node;
	});
}

// =============================================================================
// Node Cloning
// =============================================================================

/**
 * Deep clone a node
 * @param node - Node to clone
 * @returns Deep copy of the node
 */
export function cloneNode<T extends MathNode>(node: T): T {
	switch (node.type) {
		// Literals - can be returned as-is (immutable)
		case 'number':
			return number(node.value, node.metadata) as T;

		case 'variable':
			return variable(node.name, node.metadata) as T;

		case 'greek':
			return greek(node.letter, node.metadata) as T;

		case 'symbol':
			return symbol(node.symbol, node.metadata) as T;

		case 'hole':
			return hole(node.index, node.placeholder, node.metadata) as T;

		// Binary operations
		case 'addition':
			return add(cloneNode(node.left), cloneNode(node.right), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;

		case 'subtraction':
			return subtract(cloneNode(node.left), cloneNode(node.right), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;

		case 'multiplication':
			return multiply(cloneNode(node.left), cloneNode(node.right), node.displayStyle, {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;

		case 'division':
			return divide(cloneNode(node.numerator), cloneNode(node.denominator), node.displayStyle, {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;

		// Unary operations
		case 'opposite':
			return opposite(cloneNode(node.operand), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;

		case 'positive':
			return positive(cloneNode(node.operand), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;

		// Function
		case 'function':
			return func(
				node.name,
				node.args.map((arg) => cloneNode(arg)),
				{
					...(node.power && { power: cloneNode(node.power) }),
					...(node.base && { base: cloneNode(node.base) }),
					...(node.derivativeOrder !== undefined && { derivativeOrder: node.derivativeOrder }),
					...(node.isInverse && { isInverse: node.isInverse }),
					...(node.nameMetadata && { nameMetadata: node.nameMetadata }),
					...(node.delimiterMetadata && { delimiterMetadata: node.delimiterMetadata }),
					...(node.leftDelimiterMetadata && { leftDelimiterMetadata: node.leftDelimiterMetadata }),
					...(node.rightDelimiterMetadata && {
						rightDelimiterMetadata: node.rightDelimiterMetadata
					}),
					...(node.metadata && { metadata: node.metadata })
				}
			) as T;

		// Structural
		case 'delimiter':
			return delimiter(node.delimiters, cloneNode(node.content), node.semantic, {
				delimiterMetadata: node.delimiterMetadata,
				leftDelimiterMetadata: node.leftDelimiterMetadata,
				rightDelimiterMetadata: node.rightDelimiterMetadata,
				metadata: node.metadata
			}) as T;

		case 'subscript':
			return subscript(cloneNode(node.base), cloneNode(node.subscript), node.metadata) as T;

		case 'superscript':
			return superscript(cloneNode(node.base), cloneNode(node.superscript), node.metadata) as T;

		// Relation
		case 'relation':
			return relation(node.relation, cloneNode(node.left), cloneNode(node.right), {
				relationMetadata: node.relationMetadata,
				metadata: node.metadata
			}) as T;

		// Unit
		case 'unit':
			return withUnit(cloneNode(node.expression), node.unit, {
				unitMetadata: node.unitMetadata,
				metadata: node.metadata
			}) as T;

		// Composition
		case 'composition':
			return compose(cloneNode(node.outer), cloneNode(node.inner), {
				operatorMetadata: node.operatorMetadata,
				metadata: node.metadata
			}) as T;
	}
}

// =============================================================================
// Tree Statistics
// =============================================================================

/**
 * Count total number of nodes in a tree
 * @param node - Root node
 * @returns Total number of nodes (including root)
 */
export function countNodes(node: MathNode): number {
	let count = 1; // Count this node

	// Add counts from all children
	const children = getChildren(node);
	for (const child of children) {
		count += countNodes(child);
	}

	return count;
}

/**
 * Get maximum depth of a tree
 * @param node - Root node
 * @returns Depth of the tree (leaf nodes have depth 1)
 */
export function getDepth(node: MathNode): number {
	const children = getChildren(node);

	// Leaf node
	if (children.length === 0) {
		return 1;
	}

	// Return 1 + maximum depth of children
	let maxChildDepth = 0;
	for (const child of children) {
		maxChildDepth = Math.max(maxChildDepth, getDepth(child));
	}

	return 1 + maxChildDepth;
}
