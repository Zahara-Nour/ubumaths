/**
 * MathAST Type Guards and Predicates
 *
 * Individual type guards for each node type and utility predicates
 * for common node properties and patterns.
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
	MatrixNode,
	CompositionNode,
	ComplexNode,
	InfinityNode,
	LimitNode,
	LiteralNode,
	BinaryOperationNode,
	UnaryOperationNode,
	StructuralNode
} from './types';
import { flattenRelationChain } from './flatten';

// =============================================================================
// Category Type Guards
// =============================================================================

/**
 * Type guard to check if a node is a literal node
 */
export function isLiteralNode(node: MathNode): node is LiteralNode {
	return (
		node.type === 'number' ||
		node.type === 'variable' ||
		node.type === 'greek' ||
		node.type === 'symbol' ||
		node.type === 'hole' ||
		node.type === 'constant'
	);
}

/**
 * Type guard to check if a node is a binary operation node
 */
export function isBinaryOperationNode(node: MathNode): node is BinaryOperationNode {
	return (
		node.type === 'addition' ||
		node.type === 'subtraction' ||
		node.type === 'multiplication' ||
		node.type === 'division'
	);
}

/**
 * Type guard to check if a node is a unary operation node
 */
export function isUnaryOperationNode(node: MathNode): node is UnaryOperationNode {
	return node.type === 'opposite' || node.type === 'positive';
}

/**
 * Type guard to check if a node is a structural node
 */
export function isStructuralNode(node: MathNode): node is StructuralNode {
	return node.type === 'delimiter' || node.type === 'subscript' || node.type === 'superscript';
}

// =============================================================================
// Individual Type Guards
// =============================================================================

/**
 * Type guard for NumberNode
 */
export function isNumber(node: MathNode): node is NumberNode {
	return node.type === 'number';
}

/**
 * Type guard for VariableNode
 */
export function isVariable(node: MathNode): node is VariableNode {
	return node.type === 'variable';
}

/**
 * Type guard for GreekLetterNode
 */
export function isGreek(node: MathNode): node is GreekLetterNode {
	return node.type === 'greek';
}

/**
 * Type guard for SymbolNode
 */
export function isSymbol(node: MathNode): node is SymbolNode {
	return node.type === 'symbol';
}

/**
 * Type guard for HoleNode
 */
export function isHole(node: MathNode): node is HoleNode {
	return node.type === 'hole';
}

/**
 * Type guard for MathConstantNode
 */
export function isMathConstant(node: MathNode): node is MathConstantNode {
	return node.type === 'constant';
}

/**
 * Type guard for Euler's constant (e ≈ 2.71828...)
 */
export function isEulerConstant(node: MathNode): node is MathConstantNode {
	return isMathConstant(node) && node.constant === 'euler';
}

/**
 * Type guard for π constant (≈ 3.14159...)
 */
export function isPiConstant(node: MathNode): node is MathConstantNode {
	return isMathConstant(node) && node.constant === 'pi';
}

/**
 * Type guard for AdditionNode
 */
export function isAddition(node: MathNode): node is AdditionNode {
	return node.type === 'addition';
}

/**
 * Type guard for SubtractionNode
 */
export function isSubtraction(node: MathNode): node is SubtractionNode {
	return node.type === 'subtraction';
}

/**
 * Type guard for MultiplicationNode
 */
export function isMultiplication(node: MathNode): node is MultiplicationNode {
	return node.type === 'multiplication';
}

/**
 * Type guard for DivisionNode
 */
export function isDivision(node: MathNode): node is DivisionNode {
	return node.type === 'division';
}

/**
 * Type guard for OppositeNode
 */
export function isOpposite(node: MathNode): node is OppositeNode {
	return node.type === 'opposite';
}

/**
 * Type guard for PositiveNode
 */
export function isPositive(node: MathNode): node is PositiveNode {
	return node.type === 'positive';
}

/**
 * Type guard for FunctionNode
 */
export function isFunction(node: MathNode): node is FunctionNode {
	return node.type === 'function';
}

/**
 * Type guard for FunctionNode with derivativeOrder set
 * Returns true for f'(x), f''(x), etc.
 */
export function isDerivativeFunction(node: MathNode): node is FunctionNode {
	return node.type === 'function' && node.derivativeOrder !== undefined && node.derivativeOrder > 0;
}

/**
 * Type guard for FunctionNode with isInverse set to true
 * Returns true for f^{-1}(x), sin^{-1}(x), etc.
 */
export function isInverseFunction(node: MathNode): node is FunctionNode {
	return node.type === 'function' && node.isInverse === true;
}

/**
 * Checks if a node has a derivativeOrder property set
 * Works on any MathNode, returns true only for FunctionNodes with derivativeOrder
 */
export function hasDerivativeOrder(node: MathNode): boolean {
	return node.type === 'function' && node.derivativeOrder !== undefined;
}

/**
 * Type guard for DelimiterNode
 */
export function isDelimiter(node: MathNode): node is DelimiterNode {
	return node.type === 'delimiter';
}

/**
 * Type guard for SubscriptNode
 */
export function isSubscript(node: MathNode): node is SubscriptNode {
	return node.type === 'subscript';
}

/**
 * Type guard for SuperscriptNode
 */
export function isSuperscript(node: MathNode): node is SuperscriptNode {
	return node.type === 'superscript';
}

/**
 * Type guard for RelationNode
 */
export function isRelation(node: MathNode): node is RelationNode {
	return node.type === 'relation';
}

/**
 * Type guard for UnitNode
 */
export function isUnit(node: MathNode): node is UnitNode {
	return node.type === 'unit';
}

/**
 * Type guard for CompositionNode
 */
export function isComposition(node: MathNode): node is CompositionNode {
	return node.type === 'composition';
}

/**
 * Type guard for MatrixNode
 */
export function isMatrix(node: MathNode): node is MatrixNode {
	return node.type === 'matrix';
}

/**
 * Type guard for ComplexNode
 */
export function isComplex(node: MathNode): node is ComplexNode {
	return node.type === 'complex';
}

/**
 * Type guard for InfinityNode
 */
export function isInfinity(node: MathNode): node is InfinityNode {
	return node.type === 'infinity';
}

/**
 * Type guard for LimitNode
 */
export function isLimit(node: MathNode): node is LimitNode {
	return node.type === 'limit';
}

/**
 * Returns true if node is positive infinity (+∞)
 */
export function isPositiveInfinity(node: MathNode): node is InfinityNode {
	return isInfinity(node) && node.sign === 'positive';
}

/**
 * Returns true if node is negative infinity (-∞)
 */
export function isNegativeInfinity(node: MathNode): node is InfinityNode {
	return isInfinity(node) && node.sign === 'negative';
}

/**
 * Returns true if the limit is a two-sided limit (direction='both')
 */
export function isTwoSidedLimit(node: MathNode): node is LimitNode {
	return isLimit(node) && node.direction === 'both';
}

/**
 * Returns true if the limit is a right limit (direction='right')
 */
export function isRightLimit(node: MathNode): node is LimitNode {
	return isLimit(node) && node.direction === 'right';
}

/**
 * Returns true if the limit is a left limit (direction='left')
 */
export function isLeftLimit(node: MathNode): node is LimitNode {
	return isLimit(node) && node.direction === 'left';
}

/**
 * Returns true if the limit approaches infinity (positive or negative)
 */
export function isLimitAtInfinity(node: MathNode): node is LimitNode {
	return isLimit(node) && isInfinity(node.approach);
}

// =============================================================================
// Matrix Predicates
// =============================================================================

/**
 * Returns true if node is a row vector (1xN matrix)
 */
export function isRowVector(node: MathNode): node is MatrixNode {
	if (!isMatrix(node)) return false;
	return node.rows.length === 1;
}

/**
 * Returns true if node is a column vector (Nx1 matrix)
 */
export function isColumnVector(node: MathNode): node is MatrixNode {
	if (!isMatrix(node)) return false;
	return node.rows.length > 0 && node.rows[0].length === 1;
}

/**
 * Returns true if node is a square matrix (NxN)
 */
export function isSquareMatrix(node: MathNode): node is MatrixNode {
	if (!isMatrix(node)) return false;
	return node.rows.length > 0 && node.rows.length === node.rows[0].length;
}

// =============================================================================
// Utility Predicates
// =============================================================================

/**
 * Returns true if node has child nodes
 */
export function hasChildren(node: MathNode): boolean {
	if (isAddition(node) || isSubtraction(node) || isMultiplication(node)) {
		return true;
	}
	if (isDivision(node)) {
		return true;
	}
	if (isOpposite(node) || isPositive(node)) {
		return true;
	}
	if (isFunction(node)) {
		return true;
	}
	if (isDelimiter(node)) {
		return true;
	}
	if (isSubscript(node) || isSuperscript(node)) {
		return true;
	}
	if (isRelation(node)) {
		return true;
	}
	if (isUnit(node)) {
		return true;
	}
	if (isComposition(node)) {
		return true;
	}
	if (isMatrix(node)) {
		return true;
	}
	if (isComplex(node)) {
		return true;
	}
	if (isLimit(node)) {
		return true; // Has expression and approach as children
	}
	// InfinityNode has no children (leaf node)
	return false;
}

/**
 * Returns true if node has no children (literals)
 */
export function isLeaf(node: MathNode): boolean {
	return !hasChildren(node);
}

/**
 * Returns true if node has metadata defined
 */
export function hasMetadata(node: MathNode): boolean {
	return node.metadata !== undefined;
}

// =============================================================================
// Specific Predicates
// =============================================================================

/**
 * Returns true if division with displayStyle 'fraction'
 */
export function isFraction(node: MathNode): node is DivisionNode {
	return isDivision(node) && node.displayStyle === 'fraction';
}

/**
 * Returns true if multiplication with displayStyle 'implicit'
 */
export function isImplicitMultiplication(node: MathNode): node is MultiplicationNode {
	return isMultiplication(node) && node.displayStyle === 'implicit';
}

/**
 * Returns true for <, >, <=, >= relations
 */
export function isComparison(node: MathNode): node is RelationNode {
	return isRelation(node) && ['<', '>', '<=', '>='].includes(node.relation);
}

/**
 * Returns true for = relation
 */
export function isEquality(node: MathNode): node is RelationNode {
	return isRelation(node) && node.relation === '=';
}

/**
 * Returns true for != relation
 */
export function isInequality(node: MathNode): node is RelationNode {
	return isRelation(node) && node.relation === '!=';
}

// =============================================================================
// Relation Chain Predicates
// =============================================================================

/**
 * Returns true if the node is a relation chain (nested relations).
 * A chain has a RelationNode as its left child.
 *
 * Note: A simple binary relation (a = b) returns false.
 * A chain (a = b = c) returns true.
 */
export function isRelationChain(node: MathNode): node is RelationNode {
	return isRelation(node) && isRelation(node.left);
}

/**
 * Returns true if the node is a comparison chain (all relations are <, >, <=, or >=).
 * Can be homogeneous (a < b < c) or mixed (a <= b < c).
 */
export function isComparisonChain(node: MathNode): node is RelationNode {
	if (!isRelation(node)) return false;

	const flat = flattenRelationChain(node);
	if (flat.relations.length < 1) return false;

	const comparisonOps = ['<', '>', '<=', '>='];
	return flat.relations.every((r) => comparisonOps.includes(r));
}

/**
 * Returns true if the node is an equality chain (all relations are =).
 * Example: a = b = c = d
 */
export function isEqualityChain(node: MathNode): node is RelationNode {
	if (!isRelation(node)) return false;

	const flat = flattenRelationChain(node);
	if (flat.relations.length < 1) return false;

	return flat.relations.every((r) => r === '=');
}

/**
 * Returns true if the node is an implication chain (all relations are ⟹).
 * Example: P ⟹ Q ⟹ R
 */
export function isImplicationChain(node: MathNode): node is RelationNode {
	if (!isRelation(node)) return false;

	const flat = flattenRelationChain(node);
	if (flat.relations.length < 1) return false;

	return flat.relations.every((r) => r === '⟹');
}

/**
 * Returns true if the node is an equivalence chain (all relations are ⟺).
 * Example: P ⟺ Q ⟺ R
 */
export function isEquivalenceChain(node: MathNode): node is RelationNode {
	if (!isRelation(node)) return false;

	const flat = flattenRelationChain(node);
	if (flat.relations.length < 1) return false;

	return flat.relations.every((r) => r === '⟺');
}

/**
 * Returns the length of a relation chain (number of operands).
 * For a simple binary relation (a = b), returns 2.
 * For a chain (a < b < c), returns 3.
 * For non-relation nodes, returns 0.
 */
export function getRelationChainLength(node: MathNode): number {
	if (!isRelation(node)) return 0;

	const flat = flattenRelationChain(node);
	return flat.operands.length;
}

// =============================================================================
// Unit Predicates
// =============================================================================

/**
 * Returns true if the node or any of its descendants is a UnitNode.
 * Useful for detecting expressions that contain physical units.
 */
export function hasUnitDescendant(node: MathNode): boolean {
	// Recursively check based on node type
	switch (node.type) {
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'constant':
			return false;

		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return hasUnitDescendant(node.left) || hasUnitDescendant(node.right);

		case 'division':
			return hasUnitDescendant(node.numerator) || hasUnitDescendant(node.denominator);

		case 'opposite':
		case 'positive':
			return hasUnitDescendant(node.operand);

		case 'function':
			return node.args.some(hasUnitDescendant);

		case 'delimiter':
			return hasUnitDescendant(node.content);

		case 'subscript':
			return hasUnitDescendant(node.base) || hasUnitDescendant(node.subscript);

		case 'superscript':
			return hasUnitDescendant(node.base) || hasUnitDescendant(node.superscript);

		case 'relation':
			return hasUnitDescendant(node.left) || hasUnitDescendant(node.right);

		case 'unit':
			// A UnitNode itself is a unit, and check its expression for nested units
			return true;

		case 'composition':
			return hasUnitDescendant(node.outer) || hasUnitDescendant(node.inner);

		case 'matrix':
			return node.rows.some((row) => row.some(hasUnitDescendant));

		case 'complex':
			return hasUnitDescendant(node.real) || hasUnitDescendant(node.imaginary);

		case 'infinity':
			// Infinity is a leaf node, no children to check
			return false;

		case 'limit':
			// Check expression and approach for unit descendants
			return hasUnitDescendant(node.expression) || hasUnitDescendant(node.approach);

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

/**
 * Returns true if the node is a UnitNode with a dimensionless unit.
 * A dimensionless unit has all zero exponents (e.g., radians, pure numbers).
 */
export function isDimensionlessUnit(node: MathNode): boolean {
	if (!isUnit(node)) return false;

	// A unit is dimensionless if all its component exponents are 0
	for (const exponent of node.unit.components.values()) {
		if (exponent !== 0) return false;
	}
	return true;
}

// =============================================================================
// Extended Metadata Predicates
// =============================================================================

/**
 * Checks if a node has operator metadata.
 */
export function hasOperatorMetadata(node: MathNode): boolean {
	return 'operatorMetadata' in node && node.operatorMetadata !== undefined;
}

/**
 * Checks if a node has any delimiter metadata (default, left, or right).
 */
export function hasDelimiterMetadata(node: MathNode): boolean {
	return (
		('delimiterMetadata' in node && node.delimiterMetadata !== undefined) ||
		('leftDelimiterMetadata' in node && node.leftDelimiterMetadata !== undefined) ||
		('rightDelimiterMetadata' in node && node.rightDelimiterMetadata !== undefined)
	);
}

/**
 * Checks if a node has function name metadata.
 */
export function hasNameMetadata(node: MathNode): boolean {
	return 'nameMetadata' in node && (node as FunctionNode).nameMetadata !== undefined;
}

/**
 * Checks if a node has relation metadata.
 */
export function hasRelationMetadata(node: MathNode): boolean {
	return 'relationMetadata' in node && (node as RelationNode).relationMetadata !== undefined;
}

/**
 * Checks if a node has unit metadata.
 */
export function hasUnitMetadata(node: MathNode): boolean {
	return 'unitMetadata' in node && (node as UnitNode).unitMetadata !== undefined;
}

/**
 * Checks if a node has any kind of metadata (standard or extended).
 */
export function hasAnyMetadata(node: MathNode): boolean {
	return (
		hasMetadata(node) ||
		hasOperatorMetadata(node) ||
		hasDelimiterMetadata(node) ||
		hasNameMetadata(node) ||
		hasRelationMetadata(node) ||
		hasUnitMetadata(node)
	);
}
