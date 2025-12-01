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
		node.type === 'symbol'
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
