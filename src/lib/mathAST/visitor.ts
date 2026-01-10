/**
 * MathAST Visitor Pattern Implementation
 *
 * Provides a flexible visitor pattern for traversing and transforming MathAST nodes.
 * Supports both read-only traversal (visitAST) and transformation (transformAST).
 *
 * Key features:
 * - Pre-order (enter) and post-order (leave) traversal
 * - Type-specific visitor callbacks (enterNumber, leaveNumber, etc.)
 * - Context information (parent, path, depth)
 * - Skip children support
 * - Immutable transformations
 */

import type {
	MathNode,
	NumberNode,
	VariableNode,
	GreekLetterNode,
	SymbolNode,
	HoleNode,
	MathConstantNode,
	AdditionNode,
	SubtractionNode,
	MultiplicationNode,
	DivisionNode,
	OppositeNode,
	PositiveNode,
	FunctionNode,
	DelimiterNode,
	SubscriptNode,
	SuperscriptNode,
	RelationNode,
	UnitNode,
	CompositionNode,
	ComplexNode,
	InfinityNode,
	LimitNode
} from './types';

import {
	add,
	complex,
	compose,
	delimiter,
	divide,
	func,
	infinity,
	limit,
	matrix,
	multiply,
	opposite,
	positive,
	relation,
	subscript,
	subtract,
	superscript,
	withUnit
} from './factory';

// =============================================================================
// Visitor Context
// =============================================================================

/**
 * Context information provided to visitor callbacks during traversal.
 */
export interface VisitorContext {
	/** The parent node of the current node (undefined for root) */
	readonly parent?: MathNode;
	/** The path from root to current node (e.g., ['left', 'inner', 'right']) */
	readonly path: readonly (string | number)[];
	/** The depth of the current node (root = 0) */
	readonly depth: number;
}

// =============================================================================
// Visitor Result Types
// =============================================================================

/**
 * Return type for enter callbacks in read-only visitor.
 * - void/undefined: continue traversal normally
 * - 'skip': skip children but still call leave callbacks
 */
export type EnterResult = void | undefined | 'skip';

/**
 * Return type for enter callbacks in transform visitor.
 * - MathNode: replace current node and continue traversal on replacement
 * - { node: MathNode; skip: true }: replace node and skip children
 * - void/undefined: keep current node and continue normally
 * - 'skip': keep current node but skip children
 */
export type TransformEnterResult = MathNode | { node: MathNode; skip: true } | void | 'skip';

/**
 * Return type for leave callbacks in transform visitor.
 * - MathNode: replace current node
 * - void/undefined: keep current node unchanged
 */
export type TransformLeaveResult = MathNode | void | undefined;

// =============================================================================
// ASTVisitor Interface (Read-only)
// =============================================================================

/**
 * Visitor interface for read-only AST traversal.
 * All callbacks are optional - only implement the ones you need.
 */
export interface ASTVisitor {
	// Generic callbacks (called for all node types)
	enterNode?(node: MathNode, context: VisitorContext): EnterResult;
	leaveNode?(node: MathNode, context: VisitorContext): void;

	// Literal node callbacks
	enterNumber?(node: NumberNode, context: VisitorContext): EnterResult;
	leaveNumber?(node: NumberNode, context: VisitorContext): void;
	enterVariable?(node: VariableNode, context: VisitorContext): EnterResult;
	leaveVariable?(node: VariableNode, context: VisitorContext): void;
	enterGreek?(node: GreekLetterNode, context: VisitorContext): EnterResult;
	leaveGreek?(node: GreekLetterNode, context: VisitorContext): void;
	enterSymbol?(node: SymbolNode, context: VisitorContext): EnterResult;
	leaveSymbol?(node: SymbolNode, context: VisitorContext): void;
	enterHole?(node: HoleNode, context: VisitorContext): EnterResult;
	leaveHole?(node: HoleNode, context: VisitorContext): void;
	enterConstant?(node: MathConstantNode, context: VisitorContext): EnterResult;
	leaveConstant?(node: MathConstantNode, context: VisitorContext): void;

	// Binary operation callbacks
	enterAddition?(node: AdditionNode, context: VisitorContext): EnterResult;
	leaveAddition?(node: AdditionNode, context: VisitorContext): void;
	enterSubtraction?(node: SubtractionNode, context: VisitorContext): EnterResult;
	leaveSubtraction?(node: SubtractionNode, context: VisitorContext): void;
	enterMultiplication?(node: MultiplicationNode, context: VisitorContext): EnterResult;
	leaveMultiplication?(node: MultiplicationNode, context: VisitorContext): void;
	enterDivision?(node: DivisionNode, context: VisitorContext): EnterResult;
	leaveDivision?(node: DivisionNode, context: VisitorContext): void;

	// Unary operation callbacks
	enterOpposite?(node: OppositeNode, context: VisitorContext): EnterResult;
	leaveOpposite?(node: OppositeNode, context: VisitorContext): void;
	enterPositive?(node: PositiveNode, context: VisitorContext): EnterResult;
	leavePositive?(node: PositiveNode, context: VisitorContext): void;

	// Function callback
	enterFunction?(node: FunctionNode, context: VisitorContext): EnterResult;
	leaveFunction?(node: FunctionNode, context: VisitorContext): void;

	// Structural node callbacks
	enterDelimiter?(node: DelimiterNode, context: VisitorContext): EnterResult;
	leaveDelimiter?(node: DelimiterNode, context: VisitorContext): void;
	enterParentheses?(node: DelimiterNode, context: VisitorContext): EnterResult;
	leaveParentheses?(node: DelimiterNode, context: VisitorContext): void;
	enterSubscript?(node: SubscriptNode, context: VisitorContext): EnterResult;
	leaveSubscript?(node: SubscriptNode, context: VisitorContext): void;
	enterSuperscript?(node: SuperscriptNode, context: VisitorContext): EnterResult;
	leaveSuperscript?(node: SuperscriptNode, context: VisitorContext): void;

	// Relation callback
	enterRelation?(node: RelationNode, context: VisitorContext): EnterResult;
	leaveRelation?(node: RelationNode, context: VisitorContext): void;

	// Unit callback
	enterUnit?(node: UnitNode, context: VisitorContext): EnterResult;
	leaveUnit?(node: UnitNode, context: VisitorContext): void;

	// Composition callback
	enterComposition?(node: CompositionNode, context: VisitorContext): EnterResult;
	leaveComposition?(node: CompositionNode, context: VisitorContext): void;

	// Complex callback
	enterComplex?(node: ComplexNode, context: VisitorContext): EnterResult;
	leaveComplex?(node: ComplexNode, context: VisitorContext): void;

	// Infinity callback
	enterInfinity?(node: InfinityNode, context: VisitorContext): EnterResult;
	leaveInfinity?(node: InfinityNode, context: VisitorContext): void;

	// Limit callback
	enterLimit?(node: LimitNode, context: VisitorContext): EnterResult;
	leaveLimit?(node: LimitNode, context: VisitorContext): void;
}

// =============================================================================
// TransformVisitor Interface
// =============================================================================

/**
 * Visitor interface for AST transformation.
 * All callbacks are optional - only implement the ones you need.
 * Enter callbacks can return a replacement node, leave callbacks can also replace.
 */
export interface TransformVisitor {
	// Generic callbacks (called for all node types)
	enterNode?(node: MathNode, context: VisitorContext): TransformEnterResult;
	leaveNode?(node: MathNode, context: VisitorContext): TransformLeaveResult;

	// Literal node callbacks
	enterNumber?(node: NumberNode, context: VisitorContext): TransformEnterResult;
	leaveNumber?(node: NumberNode, context: VisitorContext): TransformLeaveResult;
	enterVariable?(node: VariableNode, context: VisitorContext): TransformEnterResult;
	leaveVariable?(node: VariableNode, context: VisitorContext): TransformLeaveResult;
	enterGreek?(node: GreekLetterNode, context: VisitorContext): TransformEnterResult;
	leaveGreek?(node: GreekLetterNode, context: VisitorContext): TransformLeaveResult;
	enterSymbol?(node: SymbolNode, context: VisitorContext): TransformEnterResult;
	leaveSymbol?(node: SymbolNode, context: VisitorContext): TransformLeaveResult;
	enterHole?(node: HoleNode, context: VisitorContext): TransformEnterResult;
	leaveHole?(node: HoleNode, context: VisitorContext): TransformLeaveResult;
	enterConstant?(node: MathConstantNode, context: VisitorContext): TransformEnterResult;
	leaveConstant?(node: MathConstantNode, context: VisitorContext): TransformLeaveResult;

	// Binary operation callbacks
	enterAddition?(node: AdditionNode, context: VisitorContext): TransformEnterResult;
	leaveAddition?(node: AdditionNode, context: VisitorContext): TransformLeaveResult;
	enterSubtraction?(node: SubtractionNode, context: VisitorContext): TransformEnterResult;
	leaveSubtraction?(node: SubtractionNode, context: VisitorContext): TransformLeaveResult;
	enterMultiplication?(node: MultiplicationNode, context: VisitorContext): TransformEnterResult;
	leaveMultiplication?(node: MultiplicationNode, context: VisitorContext): TransformLeaveResult;
	enterDivision?(node: DivisionNode, context: VisitorContext): TransformEnterResult;
	leaveDivision?(node: DivisionNode, context: VisitorContext): TransformLeaveResult;

	// Unary operation callbacks
	enterOpposite?(node: OppositeNode, context: VisitorContext): TransformEnterResult;
	leaveOpposite?(node: OppositeNode, context: VisitorContext): TransformLeaveResult;
	enterPositive?(node: PositiveNode, context: VisitorContext): TransformEnterResult;
	leavePositive?(node: PositiveNode, context: VisitorContext): TransformLeaveResult;

	// Function callback
	enterFunction?(node: FunctionNode, context: VisitorContext): TransformEnterResult;
	leaveFunction?(node: FunctionNode, context: VisitorContext): TransformLeaveResult;

	// Structural node callbacks
	enterDelimiter?(node: DelimiterNode, context: VisitorContext): TransformEnterResult;
	leaveDelimiter?(node: DelimiterNode, context: VisitorContext): TransformLeaveResult;
	enterParentheses?(node: DelimiterNode, context: VisitorContext): TransformEnterResult;
	leaveParentheses?(node: DelimiterNode, context: VisitorContext): TransformLeaveResult;
	enterSubscript?(node: SubscriptNode, context: VisitorContext): TransformEnterResult;
	leaveSubscript?(node: SubscriptNode, context: VisitorContext): TransformLeaveResult;
	enterSuperscript?(node: SuperscriptNode, context: VisitorContext): TransformEnterResult;
	leaveSuperscript?(node: SuperscriptNode, context: VisitorContext): TransformLeaveResult;

	// Relation callback
	enterRelation?(node: RelationNode, context: VisitorContext): TransformEnterResult;
	leaveRelation?(node: RelationNode, context: VisitorContext): TransformLeaveResult;

	// Unit callback
	enterUnit?(node: UnitNode, context: VisitorContext): TransformEnterResult;
	leaveUnit?(node: UnitNode, context: VisitorContext): TransformLeaveResult;

	// Composition callback
	enterComposition?(node: CompositionNode, context: VisitorContext): TransformEnterResult;
	leaveComposition?(node: CompositionNode, context: VisitorContext): TransformLeaveResult;

	// Complex callback
	enterComplex?(node: ComplexNode, context: VisitorContext): TransformEnterResult;
	leaveComplex?(node: ComplexNode, context: VisitorContext): TransformLeaveResult;

	// Infinity callback
	enterInfinity?(node: InfinityNode, context: VisitorContext): TransformEnterResult;
	leaveInfinity?(node: InfinityNode, context: VisitorContext): TransformLeaveResult;

	// Limit callback
	enterLimit?(node: LimitNode, context: VisitorContext): TransformEnterResult;
	leaveLimit?(node: LimitNode, context: VisitorContext): TransformLeaveResult;
}

// =============================================================================
// Internal Helper Types
// =============================================================================

const TYPE_TO_METHOD_NAME: Record<MathNode['type'], string> = {
	number: 'Number',
	variable: 'Variable',
	greek: 'Greek',
	symbol: 'Symbol',
	hole: 'Hole',
	constant: 'Constant',
	addition: 'Addition',
	subtraction: 'Subtraction',
	multiplication: 'Multiplication',
	division: 'Division',
	opposite: 'Opposite',
	positive: 'Positive',
	function: 'Function',
	delimiter: 'Delimiter',
	subscript: 'Subscript',
	superscript: 'Superscript',
	relation: 'Relation',
	unit: 'Unit',
	composition: 'Composition',
	matrix: 'Matrix',
	complex: 'Complex',
	infinity: 'Infinity',
	limit: 'Limit'
};

// =============================================================================
// Child Access Helpers
// =============================================================================

/** Information about a child node including its path segment */
interface ChildInfo {
	child: MathNode;
	pathSegments: (string | number)[];
}

/**
 * Gets the children of a node along with their path segments.
 * This is the canonical definition of children for the visitor pattern.
 */
function getChildrenWithPaths(node: MathNode): ChildInfo[] {
	switch (node.type) {
		// Literals have no children
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'constant':
			return [];

		// Complex has real and imaginary children
		case 'complex':
			return [
				{ child: node.real, pathSegments: ['real'] },
				{ child: node.imaginary, pathSegments: ['imaginary'] }
			];

		// Binary operations with left/right
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return [
				{ child: node.left, pathSegments: ['left'] },
				{ child: node.right, pathSegments: ['right'] }
			];

		// Division has numerator/denominator
		case 'division':
			return [
				{ child: node.numerator, pathSegments: ['numerator'] },
				{ child: node.denominator, pathSegments: ['denominator'] }
			];

		// Unary operations
		case 'opposite':
		case 'positive':
			return [{ child: node.operand, pathSegments: ['operand'] }];

		// Function: args array, optional power (SuperscriptNode) and base
		case 'function': {
			const children: ChildInfo[] = [];
			// Add args with array indices
			node.args.forEach((arg, index) => {
				children.push({ child: arg, pathSegments: ['args', index] });
			});
			// For power, we need to expose the inner content of the SuperscriptNode
			// The path should be ['power', 'inner'] to reach the exponent value
			if (node.power && node.power.type === 'superscript') {
				children.push({ child: node.power.superscript, pathSegments: ['power', 'inner'] });
			} else if (node.power) {
				children.push({ child: node.power, pathSegments: ['power'] });
			}
			// Add optional base
			if (node.base) {
				children.push({ child: node.base, pathSegments: ['base'] });
			}
			return children;
		}

		// Delimiter - content is accessed via 'inner' path key
		case 'delimiter':
			return [{ child: node.content, pathSegments: ['inner'] }];

		// Subscript
		case 'subscript':
			return [
				{ child: node.base, pathSegments: ['base'] },
				{ child: node.subscript, pathSegments: ['subscript'] }
			];

		// Superscript
		case 'superscript':
			return [
				{ child: node.base, pathSegments: ['base'] },
				{ child: node.superscript, pathSegments: ['inner'] }
			];

		// Relation
		case 'relation':
			return [
				{ child: node.left, pathSegments: ['left'] },
				{ child: node.right, pathSegments: ['right'] }
			];

		// Unit
		case 'unit':
			return [{ child: node.expression, pathSegments: ['expression'] }];

		// Composition
		case 'composition':
			return [
				{ child: node.outer, pathSegments: ['outer'] },
				{ child: node.inner, pathSegments: ['inner'] }
			];

		// Matrix - return all elements in row-major order
		case 'matrix': {
			const children: ChildInfo[] = [];
			node.rows.forEach((row, rowIndex) => {
				row.forEach((element, colIndex) => {
					children.push({ child: element, pathSegments: ['rows', rowIndex, colIndex] });
				});
			});
			return children;
		}

		// Infinity is a leaf node (no children)
		case 'infinity':
			return [];

		// Limit has expression and approach as children
		case 'limit':
			return [
				{ child: node.expression, pathSegments: ['expression'] },
				{ child: node.approach, pathSegments: ['approach'] }
			];
	}
}

// =============================================================================
// Node Reconstruction Helper
// =============================================================================

/**
 * Reconstructs a node with potentially transformed children.
 * Preserves all metadata from the original node.
 */
function reconstructNode(original: MathNode, transformedChildren: Map<string, MathNode>): MathNode {
	// Helper to get transformed child by path key
	const getChild = (pathKey: string, originalChild: MathNode): MathNode => {
		return transformedChildren.get(pathKey) ?? originalChild;
	};

	switch (original.type) {
		// Literals - no children, return as-is
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'constant':
			return original;

		// Complex number
		case 'complex':
			return complex(
				getChild('real', original.real),
				getChild('imaginary', original.imaginary),
				original.metadata
			);

		// Binary operations
		case 'addition':
			return add(getChild('left', original.left), getChild('right', original.right), {
				operatorMetadata: original.operatorMetadata,
				metadata: original.metadata
			});

		case 'subtraction':
			return subtract(getChild('left', original.left), getChild('right', original.right), {
				operatorMetadata: original.operatorMetadata,
				metadata: original.metadata
			});

		case 'multiplication':
			return multiply(
				getChild('left', original.left),
				getChild('right', original.right),
				original.displayStyle,
				{
					operatorMetadata: original.operatorMetadata,
					metadata: original.metadata
				}
			);

		case 'division':
			return divide(
				getChild('numerator', original.numerator),
				getChild('denominator', original.denominator),
				original.displayStyle,
				{
					operatorMetadata: original.operatorMetadata,
					metadata: original.metadata
				}
			);

		// Unary operations
		case 'opposite':
			return opposite(getChild('operand', original.operand), {
				operatorMetadata: original.operatorMetadata,
				metadata: original.metadata
			});

		case 'positive':
			return positive(getChild('operand', original.operand), {
				operatorMetadata: original.operatorMetadata,
				metadata: original.metadata
			});

		// Function - need to handle args array and power specially
		case 'function': {
			const transformedArgs = original.args.map((arg, index) => {
				const key = `args,${index}`;
				return transformedChildren.get(key) ?? arg;
			});

			// Get transformed power content if it exists
			let transformedPower = original.power;
			if (original.power && original.power.type === 'superscript') {
				const powerInnerKey = 'power,inner';
				const transformedPowerInner = transformedChildren.get(powerInnerKey);
				if (transformedPowerInner) {
					// Reconstruct the superscript with the transformed inner content
					transformedPower = superscript(
						original.power.base,
						transformedPowerInner,
						original.power.metadata
					);
				}
			}

			// Get transformed base if it exists
			const transformedBase = original.base ? getChild('base', original.base) : undefined;

			return func(original.name, transformedArgs, {
				...(transformedPower && { power: transformedPower }),
				...(transformedBase && { base: transformedBase }),
				...(original.derivativeOrder !== undefined && {
					derivativeOrder: original.derivativeOrder
				}),
				...(original.isInverse && { isInverse: original.isInverse }),
				...(original.nameMetadata && { nameMetadata: original.nameMetadata }),
				...(original.delimiterMetadata && { delimiterMetadata: original.delimiterMetadata }),
				...(original.leftDelimiterMetadata && {
					leftDelimiterMetadata: original.leftDelimiterMetadata
				}),
				...(original.rightDelimiterMetadata && {
					rightDelimiterMetadata: original.rightDelimiterMetadata
				}),
				...(original.metadata && { metadata: original.metadata })
			});
		}

		// Delimiter
		case 'delimiter':
			return delimiter(
				original.delimiters,
				getChild('inner', original.content),
				original.semantic,
				{
					delimiterMetadata: original.delimiterMetadata,
					leftDelimiterMetadata: original.leftDelimiterMetadata,
					rightDelimiterMetadata: original.rightDelimiterMetadata,
					metadata: original.metadata
				}
			);

		// Subscript
		case 'subscript':
			return subscript(
				getChild('base', original.base),
				getChild('subscript', original.subscript),
				original.metadata
			);

		// Superscript
		case 'superscript':
			return superscript(
				getChild('base', original.base),
				getChild('inner', original.superscript),
				original.metadata
			);

		// Relation
		case 'relation':
			return relation(
				original.relation,
				getChild('left', original.left),
				getChild('right', original.right),
				{
					relationMetadata: original.relationMetadata,
					metadata: original.metadata
				}
			);

		// Unit
		case 'unit':
			return withUnit(getChild('expression', original.expression), original.unit, {
				unitMetadata: original.unitMetadata,
				metadata: original.metadata
			});

		// Composition
		case 'composition':
			return compose(getChild('outer', original.outer), getChild('inner', original.inner), {
				operatorMetadata: original.operatorMetadata,
				metadata: original.metadata
			});

		// Matrix - reconstruct with transformed elements
		case 'matrix': {
			const transformedRows = original.rows.map((row, rowIndex) =>
				row.map((element, colIndex) => {
					const key = `rows,${rowIndex},${colIndex}`;
					return transformedChildren.get(key) ?? element;
				})
			);
			return matrix(transformedRows, {
				matrixType: original.matrixType,
				metadata: original.metadata
			});
		}

		// Infinity - no children, return as-is
		case 'infinity':
			return infinity(original.sign, original.metadata);

		// Limit - reconstruct with transformed expression and approach
		case 'limit':
			return limit(
				getChild('expression', original.expression),
				original.variable,
				getChild('approach', original.approach),
				original.direction,
				original.metadata
			);
	}
}

// =============================================================================
// Callback Helpers
// =============================================================================

/**
 * Determines the method name suffix for a node.
 * Handles special case for delimiter nodes that are parentheses.
 */
function getMethodNameForNode(node: MathNode): string {
	// Special case: delimiter with delimiters === 'parentheses'
	if (node.type === 'delimiter' && node.delimiters === 'parentheses') {
		return 'Parentheses';
	}
	return TYPE_TO_METHOD_NAME[node.type];
}

// =============================================================================
// visitAST Implementation
// =============================================================================

/**
 * Performs a read-only traversal of a MathAST tree.
 *
 * Traversal order:
 * 1. enterNode (generic)
 * 2. enterX (type-specific)
 * 3. Visit children (unless skipped)
 * 4. leaveX (type-specific)
 * 5. leaveNode (generic)
 *
 * @param node - The root node to traverse
 * @param visitor - The visitor with callbacks
 */
export function visitAST(node: MathNode, visitor: ASTVisitor): void {
	visitNodeInternal(node, visitor, {
		parent: undefined,
		path: [],
		depth: 0
	});
}

/**
 * Internal recursive visit implementation.
 */
function visitNodeInternal(node: MathNode, visitor: ASTVisitor, context: VisitorContext): void {
	// Call generic enter
	const genericResult = visitor.enterNode?.(node, context);

	// Call type-specific enter
	const methodName = getMethodNameForNode(node);
	const enterMethod = `enter${methodName}` as keyof ASTVisitor;
	const typeSpecificEnter = visitor[enterMethod] as
		| ((node: MathNode, context: VisitorContext) => EnterResult)
		| undefined;
	const typeResult = typeSpecificEnter?.(node, context);

	// Determine if we should skip children
	const shouldSkip = genericResult === 'skip' || typeResult === 'skip';

	// Visit children unless skipped
	if (!shouldSkip) {
		const children = getChildrenWithPaths(node);
		for (const { child, pathSegments } of children) {
			const childPath = [...context.path, ...pathSegments];

			visitNodeInternal(child, visitor, {
				parent: node,
				path: childPath,
				depth: context.depth + 1
			});
		}
	}

	// Call type-specific leave
	const leaveMethod = `leave${methodName}` as keyof ASTVisitor;
	const typeSpecificLeave = visitor[leaveMethod] as
		| ((node: MathNode, context: VisitorContext) => void)
		| undefined;
	typeSpecificLeave?.(node, context);

	// Call generic leave
	visitor.leaveNode?.(node, context);
}

// =============================================================================
// transformAST Implementation
// =============================================================================

/**
 * Transforms a MathAST tree using a visitor pattern.
 *
 * Traversal order:
 * 1. enterNode (generic) - can replace node
 * 2. enterX (type-specific) - can replace node
 * 3. Transform children (unless skipped)
 * 4. leaveX (type-specific) - can replace node
 * 5. leaveNode (generic) - can replace node
 *
 * When enter returns a replacement node, traversal continues on that replacement.
 *
 * Transformations are immutable - the original tree is never modified.
 *
 * @param node - The root node to transform
 * @param visitor - The visitor with transformation callbacks
 * @returns The transformed tree (may be the same reference if no changes)
 */
export function transformAST(node: MathNode, visitor: TransformVisitor): MathNode {
	return transformNodeInternal(node, visitor, {
		parent: undefined,
		path: [],
		depth: 0
	});
}

/**
 * Parse the result of an enter callback.
 * Returns the node to continue with and whether to skip children.
 */
function parseEnterResult(
	result: TransformEnterResult,
	currentNode: MathNode
): { node: MathNode; skip: boolean } {
	if (result === undefined || result === null) {
		return { node: currentNode, skip: false };
	}
	if (result === 'skip') {
		return { node: currentNode, skip: true };
	}
	if (typeof result === 'object' && 'skip' in result && result.skip === true) {
		return { node: result.node, skip: true };
	}
	// It's a MathNode replacement
	return { node: result as MathNode, skip: false };
}

/**
 * Internal recursive transform implementation.
 *
 * When enter returns a replacement node:
 * - If the replacement has a DIFFERENT type, enter is called on that type (re-dispatch)
 * - If the replacement has the SAME type, enter is NOT called again (prevent infinite loops)
 * - Children of the replacement ARE traversed (unless skip is set)
 * - Leave IS called based on the original node's type (for type safety)
 */
function transformNodeInternal(
	node: MathNode,
	visitor: TransformVisitor,
	context: VisitorContext
): MathNode {
	let currentNode = node;
	let shouldSkip = false;
	// Track the original method name for leave callbacks (maintains type safety)
	const originalMethodName = getMethodNameForNode(node);

	// Call generic enter
	const genericResult = visitor.enterNode?.(currentNode, context);
	const genericParsed = parseEnterResult(genericResult, currentNode);
	currentNode = genericParsed.node;
	shouldSkip = genericParsed.skip;

	// Call type-specific enter
	const methodName = getMethodNameForNode(currentNode);
	const enterMethod = `enter${methodName}` as keyof TransformVisitor;
	const typeSpecificEnter = visitor[enterMethod] as
		| ((node: MathNode, context: VisitorContext) => TransformEnterResult)
		| undefined;

	const typeResult = typeSpecificEnter?.(currentNode, context);
	const typeParsed = parseEnterResult(typeResult, currentNode);
	const previousNode = currentNode;
	currentNode = typeParsed.node;
	shouldSkip = shouldSkip || typeParsed.skip;

	// If the type changed, call enter on the new type (re-dispatch)
	// But don't recurse indefinitely - only one level of re-dispatch
	if (currentNode !== previousNode && currentNode.type !== previousNode.type) {
		const newMethodName = getMethodNameForNode(currentNode);
		const newEnterMethod = `enter${newMethodName}` as keyof TransformVisitor;
		const newTypeEnter = visitor[newEnterMethod] as
			| ((node: MathNode, context: VisitorContext) => TransformEnterResult)
			| undefined;

		const newResult = newTypeEnter?.(currentNode, context);
		const newParsed = parseEnterResult(newResult, currentNode);
		currentNode = newParsed.node;
		shouldSkip = shouldSkip || newParsed.skip;
	}

	// Transform children unless skipped
	let transformedNode = currentNode;
	if (!shouldSkip) {
		const children = getChildrenWithPaths(currentNode);
		const transformedChildren = new Map<string, MathNode>();
		let anyChildChanged = false;

		for (const { child, pathSegments } of children) {
			const childPath = [...context.path, ...pathSegments];

			const transformedChild = transformNodeInternal(child, visitor, {
				parent: currentNode,
				path: childPath,
				depth: context.depth + 1
			});

			if (transformedChild !== child) {
				anyChildChanged = true;
			}
			// Use comma-joined path as key for lookup
			const key = pathSegments.join(',');
			transformedChildren.set(key, transformedChild);
		}

		// Reconstruct node if any children changed
		if (anyChildChanged) {
			transformedNode = reconstructNode(currentNode, transformedChildren);
		}
	}

	// Call type-specific leave based on the ORIGINAL node's type
	// This ensures type safety - leaveAddition always receives what was originally an addition
	const leaveMethod = `leave${originalMethodName}` as keyof TransformVisitor;
	const typeSpecificLeave = visitor[leaveMethod] as
		| ((node: MathNode, context: VisitorContext) => TransformLeaveResult)
		| undefined;

	const leaveTypeResult = typeSpecificLeave?.(transformedNode, context);
	if (leaveTypeResult !== undefined) {
		transformedNode = leaveTypeResult;
	}

	// Call generic leave
	const leaveGenericResult = visitor.leaveNode?.(transformedNode, context);
	if (leaveGenericResult !== undefined) {
		transformedNode = leaveGenericResult;
	}

	return transformedNode;
}
