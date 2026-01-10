/**
 * Custom Syntax Generator for MathAST
 *
 * Converts MathAST nodes to custom syntax (ASCII Math-style) output.
 * Mirrors the LaTeX generator architecture with dual-mode rendering:
 * - Simple mode: Direct string generation (no metadata)
 * - Coalescence mode: Span-based rendering with color/style metadata
 *
 * Key differences from LaTeX:
 * - Functions have NO backslash: sin(x) not \sin(x)
 * - Fractions use /: a/b not \frac{a}{b}
 * - Inline division uses :/: a:/b
 * - Ratio uses :: a:b
 * - Colors use @: @red{x} or @#FF0000{x}
 * - Units use brackets: 5[m/s]
 * - Absolute value uses |: |x| (rendered from abs function)
 * - Only 5 Greek letters supported: \pi, \alpha, \beta, \gamma, \theta
 * - Only \infty for infinity symbol
 *
 * @module mathAST/custom-generator
 */

import type {
	MathNode,
	NumberNode,
	VariableNode,
	GreekLetterNode,
	SymbolNode,
	HoleNode,
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
	MatrixNode,
	ComplexNode,
	InfinityNode,
	LimitNode,
	RelationType,
	GreekLetter,
	NodeMetadata
} from './types';
import { flattenRelationChain } from './flatten';
import { format } from './units/formatter';

// =============================================================================
// Types
// =============================================================================

/**
 * A styled span for coalescence-based rendering.
 * Adjacent spans with the same color are merged before final output.
 * Style (bold/italic) is applied per-span independently.
 */
type ColoredSpan = {
	text: string;
	color?: string;
	style?: 'normal' | 'bold' | 'italic';
};

// =============================================================================
// Options
// =============================================================================

export interface CustomGeneratorOptions {
	readonly renderMetadata?: boolean; // default: false
}

// =============================================================================
// Symbol Mappings
// =============================================================================

/**
 * Supported Greek letters in custom syntax.
 * Only these 5 are supported by the custom parser.
 */
export const SUPPORTED_GREEK: ReadonlySet<GreekLetter> = new Set<GreekLetter>([
	'pi',
	'alpha',
	'beta',
	'gamma',
	'theta'
]);

/**
 * Supported symbols in custom syntax.
 * Currently only infinity is supported.
 */
export const SUPPORTED_SYMBOLS: ReadonlySet<string> = new Set(['infinity']);

/**
 * Map custom syntax relation types to output strings.
 */
const RELATION_MAP: Record<RelationType, string> = {
	'=': '=',
	'<': '<',
	'>': '>',
	'<=': '<=',
	'>=': '>=',
	'!=': '!=',
	'≡': '=', // Fallback: custom syntax doesn't have equiv
	'≢': '!=', // Fallback
	'≈': '=', // Fallback
	'≃': '=', // Fallback
	'∼': '=', // Fallback
	'≺': '<', // Fallback
	'≻': '>', // Fallback
	'⊂': '<', // Fallback
	'⊃': '>', // Fallback
	'⊆': '<=', // Fallback
	'⊇': '>=', // Fallback
	'∈': '=', // Fallback
	'∉': '!=', // Fallback
	'⟹': '=>',
	'⟺': '<=>',
	'⟸': '=>' // Fallback: reverse as forward
};

// =============================================================================
// Delimiter Metadata Helpers
// =============================================================================

/**
 * Gets the metadata for the left delimiter of a DelimiterNode or FunctionNode.
 * Falls back to delimiterMetadata if leftDelimiterMetadata is not present.
 */
function getLeftDelimiterMetadata(node: DelimiterNode | FunctionNode): NodeMetadata | undefined {
	return node.leftDelimiterMetadata ?? node.delimiterMetadata;
}

/**
 * Gets the metadata for the right delimiter of a DelimiterNode or FunctionNode.
 * Falls back to delimiterMetadata if rightDelimiterMetadata is not present.
 */
function getRightDelimiterMetadata(node: DelimiterNode | FunctionNode): NodeMetadata | undefined {
	return node.rightDelimiterMetadata ?? node.delimiterMetadata;
}

// =============================================================================
// Helper Functions for Round-Trip Safety
// =============================================================================

/**
 * Determines if an exponent node needs braces for round-trip safety.
 *
 * Rules:
 * - Single digit: NO braces (x^2)
 * - Single letter: NO braces (x^n)
 * - Greek letter (supported): NO braces (x^\pi)
 * - Multi-digit number: NO braces (x^12)
 * - Negative exponent: NEEDS braces (x^{-2})
 * - Multi-letter expression: NEEDS braces (x^{ab}, x^{n+1})
 * - Any complex expression: NEEDS braces
 */
function needsBracesForPower(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
			// Numbers don't need braces (x^2, x^12)
			return false;

		case 'variable':
			// Single letter: OK, multi-letter: needs braces
			return node.name.length > 1;

		case 'greek':
			// Supported Greek letters don't need braces
			return !SUPPORTED_GREEK.has(node.letter);

		case 'symbol':
			// Only \infty is supported
			return node.symbol !== 'infinity';

		case 'hole':
			// Holes are atoms, don't need braces
			return false;

		case 'opposite':
		case 'positive':
			// Unary signs always need braces: x^{-2}, x^{+2}
			return true;

		default:
			// All complex expressions need braces
			return true;
	}
}

/**
 * Determines if a subscript node needs braces for round-trip safety.
 *
 * Rules:
 * - Single digit: NO braces (x_1)
 * - Single letter: NO braces (x_n)
 * - Multi-digit number: NO braces (x_12)
 * - Multi-letter: NEEDS braces (x_{ab})
 * - Complex expression: NEEDS braces
 */
function needsBracesForSubscript(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
			// Numbers don't need braces
			return false;

		case 'variable':
			// Single letter: OK, multi-letter: needs braces
			return node.name.length > 1;

		case 'greek':
			// Greek letters need braces in subscript
			return true;

		case 'symbol':
			// Symbols need braces in subscript
			return true;

		case 'hole':
			// Holes are atoms, don't need braces
			return false;

		default:
			// All complex expressions need braces
			return true;
	}
}

/**
 * Determines if a node should be wrapped with braces when used as
 * a fraction numerator or denominator.
 *
 * In custom syntax, `/` is tightly binding at the atom level.
 * Atoms that parse as a single unit don't need wrapping:
 * - Numbers, variables, Greek letters, symbols
 * - Functions (with parens)
 * - Delimiters (parentheses create grouping)
 * - Absolute value (|x|)
 *
 * Complex expressions need `{}` wrapping:
 * - Addition, subtraction
 * - Multiplication (explicit or implicit)
 * - Division (nested fractions)
 * - Unary minus/plus
 * - Subscripts, superscripts
 */
function shouldWrapForFraction(node: MathNode): boolean {
	switch (node.type) {
		// Atoms: don't need wrapping
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'infinity':
			return false;

		// Functions: have their own parentheses
		case 'function':
			return false;

		// Delimiters: parentheses provide grouping
		case 'delimiter':
			return false;

		// Complex expressions: need wrapping
		case 'addition':
		case 'subtraction':
		case 'multiplication':
		case 'division':
		case 'opposite':
		case 'positive':
		case 'subscript':
		case 'superscript':
		case 'relation':
		case 'unit':
		case 'composition':
		case 'matrix':
		case 'complex':
		case 'limit':
			return true;

		default: {
			const exhaustive: never = node;
			throw new Error(`Unknown node type: ${(exhaustive as MathNode).type}`);
		}
	}
}

// =============================================================================
// Generator Class
// =============================================================================

export class CustomGenerator {
	private readonly options: Required<CustomGeneratorOptions>;
	private spans: ColoredSpan[] = [];

	constructor(options?: CustomGeneratorOptions) {
		this.options = {
			renderMetadata: options?.renderMetadata ?? false
		};
	}

	generate(node: MathNode): string {
		if (!this.options.renderMetadata) {
			// Simple mode: generate without coalescence
			return this.generateNode(node);
		}
		// Coalescence mode: use spans and merge adjacent colors
		this.spans = [];
		this.visitWithSpans(node);
		return this.coalesceAndRender();
	}

	// =========================================================================
	// Coalescence Mode: Span-based Rendering
	// =========================================================================

	/**
	 * Emits a span with optional color and style metadata.
	 */
	private emit(text: string, metadata?: NodeMetadata): void {
		this.spans.push({ text, color: metadata?.color, style: metadata?.style });
	}

	/**
	 * Coalesces adjacent spans with the same color and style, then renders to custom syntax.
	 */
	private coalesceAndRender(): string {
		// Merge adjacent spans with the same color AND style
		const coalesced = this.spans.reduce((acc, span) => {
			const last = acc[acc.length - 1];
			if (last && last.color === span.color && last.style === span.style) {
				last.text += span.text;
			} else {
				acc.push({ ...span });
			}
			return acc;
		}, [] as ColoredSpan[]);

		// Render to custom syntax
		return coalesced
			.map((s) => {
				let result = s.text;

				// Apply color (style is not supported in custom syntax text output)
				// Custom syntax uses @color{...} format
				if (s.color) {
					result = `@${s.color}{${result}}`;
				}

				return result;
			})
			.join('');
	}

	/**
	 * Traverses the AST and emits colored spans for each component.
	 */
	private visitWithSpans(node: MathNode): void {
		switch (node.type) {
			case 'number':
				this.emit(node.value, node.metadata);
				break;

			case 'variable':
				this.emit(node.name, node.metadata);
				break;

			case 'greek':
				this.emitGreekSpan(node);
				break;

			case 'symbol':
				this.emitSymbolSpan(node);
				break;

			case 'addition':
				this.visitWithSpans(node.left);
				this.emit('+', node.operatorMetadata ?? node.metadata);
				this.visitWithSpans(node.right);
				break;

			case 'subtraction':
				this.visitWithSpans(node.left);
				this.emit('-', node.operatorMetadata ?? node.metadata);
				this.visitWithSpans(node.right);
				break;

			case 'multiplication':
				this.visitWithSpans(node.left);
				this.visitMultiplicationOperatorSpan(node);
				this.visitWithSpans(node.right);
				break;

			case 'division':
				this.visitDivisionSpans(node);
				break;

			case 'opposite':
				this.emit('-', node.operatorMetadata ?? node.metadata);
				this.visitWithSpans(node.operand);
				break;

			case 'positive':
				this.emit('+', node.operatorMetadata ?? node.metadata);
				this.visitWithSpans(node.operand);
				break;

			case 'function':
				this.visitFunctionSpans(node);
				break;

			case 'delimiter':
				this.visitDelimiterSpans(node);
				break;

			case 'subscript':
				this.visitSubscriptSpans(node);
				break;

			case 'superscript':
				this.visitSuperscriptSpans(node);
				break;

			case 'relation':
				this.visitRelationSpans(node);
				break;

			case 'unit':
				this.visitUnitSpans(node);
				break;

			case 'hole':
				this.emit('?', node.metadata);
				break;

			case 'composition':
				this.visitCompositionSpans(node);
				break;

			case 'matrix':
				this.visitMatrixSpans(node);
				break;

			case 'complex':
				this.visitComplexSpans(node);
				break;

			case 'infinity':
				this.visitInfinitySpans(node);
				break;

			case 'limit':
				this.visitLimitSpans(node);
				break;

			default: {
				const exhaustive: never = node;
				throw new Error(`Unknown node type: ${(exhaustive as MathNode).type}`);
			}
		}
	}

	/**
	 * Emits an infinity span.
	 */
	private visitInfinitySpans(node: InfinityNode): void {
		const sign = node.sign === 'positive' ? '+' : '-';
		this.emit(`${sign}∞`, node.metadata);
	}

	/**
	 * Emits a limit span.
	 */
	private visitLimitSpans(node: LimitNode): void {
		this.emit('lim', node.metadata);
		this.emit('[', undefined);
		this.emit(node.variable, undefined);
		this.emit('→', undefined);
		this.visitWithSpans(node.approach);
		if (node.direction === 'right') {
			this.emit('⁺', undefined);
		} else if (node.direction === 'left') {
			this.emit('⁻', undefined);
		}
		this.emit(']', undefined);
		this.emit(' ', undefined);
		this.visitWithSpans(node.expression);
	}

	/**
	 * Emits a complex number span.
	 */
	private visitComplexSpans(node: ComplexNode): void {
		// Complex numbers are rendered as real + imaginary*i
		this.visitWithSpans(node.real);
		this.emit(' + ', undefined);
		this.visitWithSpans(node.imaginary);
		this.emit('i', undefined);
	}

	/**
	 * Emits a Greek letter span.
	 */
	private emitGreekSpan(node: GreekLetterNode): void {
		if (!SUPPORTED_GREEK.has(node.letter)) {
			throw new Error(
				`Unsupported Greek letter for custom syntax: ${node.letter}. ` +
					`Only pi, alpha, beta, gamma, theta are supported.`
			);
		}
		this.emit(`\\${node.letter}`, node.metadata);
	}

	/**
	 * Emits a symbol span.
	 */
	private emitSymbolSpan(node: SymbolNode): void {
		if (node.symbol === 'infinity') {
			this.emit('\\infty', node.metadata);
		} else {
			throw new Error(
				`Unsupported symbol for custom syntax: ${node.symbol}. ` + `Only infinity is supported.`
			);
		}
	}

	/**
	 * Emits the multiplication operator span based on display style.
	 */
	private visitMultiplicationOperatorSpan(node: MultiplicationNode): void {
		const opMeta = node.operatorMetadata ?? node.metadata;
		switch (node.displayStyle) {
			case 'implicit':
				// No operator emitted for implicit multiplication (juxtaposition)
				break;
			case 'dot':
			case 'cross':
			case 'star':
				// All explicit multiplications use * in custom syntax
				this.emit('*', opMeta);
				break;
			default: {
				const exhaustive: never = node.displayStyle;
				throw new Error(`Unknown multiplication style: ${exhaustive}`);
			}
		}
	}

	/**
	 * Emits spans for a division node.
	 */
	private visitDivisionSpans(node: DivisionNode): void {
		const opMeta = node.operatorMetadata ?? node.metadata;
		switch (node.displayStyle) {
			case 'fraction': {
				// Use / with wrapping if needed
				const needsLeftWrap = shouldWrapForFraction(node.numerator);
				const needsRightWrap = shouldWrapForFraction(node.denominator);

				if (needsLeftWrap) this.emit('{', opMeta);
				this.visitWithSpans(node.numerator);
				if (needsLeftWrap) this.emit('}', opMeta);

				this.emit('/', opMeta);

				if (needsRightWrap) this.emit('{', opMeta);
				this.visitWithSpans(node.denominator);
				if (needsRightWrap) this.emit('}', opMeta);
				break;
			}
			case 'inline':
				this.visitWithSpans(node.numerator);
				this.emit(':/', opMeta);
				this.visitWithSpans(node.denominator);
				break;
			case 'ratio':
				this.visitWithSpans(node.numerator);
				this.emit(':', opMeta);
				this.visitWithSpans(node.denominator);
				break;
			default: {
				const exhaustive: never = node.displayStyle;
				throw new Error(`Unknown division style: ${exhaustive}`);
			}
		}
	}

	/**
	 * Emits spans for a delimiter node.
	 */
	private visitDelimiterSpans(node: DelimiterNode): void {
		const leftMeta = getLeftDelimiterMetadata(node) ?? node.metadata;
		const rightMeta = getRightDelimiterMetadata(node) ?? node.metadata;

		switch (node.delimiters) {
			case 'parentheses':
				this.emit('(', leftMeta);
				this.visitWithSpans(node.content);
				this.emit(')', rightMeta);
				break;
			default: {
				const exhaustive: never = node.delimiters;
				throw new Error(`Unknown delimiter type: ${exhaustive}`);
			}
		}
	}

	/**
	 * Emits spans for a function node.
	 * Special case: abs(x) is rendered as |x|
	 * Handles derivativeOrder (f', f'', f^{(n)}) and isInverse (f^{-1})
	 */
	private visitFunctionSpans(node: FunctionNode): void {
		// Special case: abs function renders as |x|
		if (node.name === 'abs' && node.args.length === 1 && !node.power && !node.base) {
			const leftMeta = getLeftDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;
			const rightMeta = getRightDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;
			this.emit('|', leftMeta);
			this.visitWithSpans(node.args[0]);
			this.emit('|', rightMeta);
			return;
		}

		// Regular function: NO backslash in custom syntax
		this.emit(node.name, node.nameMetadata ?? node.metadata);

		// Emit derivative notation (takes priority over power)
		if (node.derivativeOrder !== undefined && node.derivativeOrder > 0) {
			if (node.derivativeOrder <= 3) {
				// Use prime notation: f', f'', f'''
				this.emit("'".repeat(node.derivativeOrder), node.metadata);
			} else {
				// Use parenthetical notation: f^{(n)}
				this.emit(`^{(${node.derivativeOrder})}`, node.metadata);
			}
		}

		// Emit inverse notation (f^{-1}) - only if no derivative
		if (node.isInverse && !node.derivativeOrder) {
			this.emit('^{-1}', node.metadata);
		}

		// Emit power if present (only if no derivative and no inverse)
		if (node.power && !node.derivativeOrder && !node.isInverse) {
			this.emit('^', node.metadata);
			const needsBraces = needsBracesForPower(node.power);
			if (needsBraces) this.emit('{', node.metadata);
			this.visitWithSpans(node.power);
			if (needsBraces) this.emit('}', node.metadata);
		}

		// Emit base subscript if present (e.g., log_2)
		if (node.base) {
			// For sqrt, base is the nth root index: sqrt[n](x)
			if (node.name === 'sqrt') {
				this.emit('[', node.metadata);
				this.visitWithSpans(node.base);
				this.emit(']', node.metadata);
			} else {
				this.emit('_', node.metadata);
				const needsBraces = needsBracesForSubscript(node.base);
				if (needsBraces) this.emit('{', node.metadata);
				this.visitWithSpans(node.base);
				if (needsBraces) this.emit('}', node.metadata);
			}
		}

		// Emit parentheses and arguments
		// Skip parentheses for functions with no arguments (generic functions like f', f^{-1})
		if (node.args.length === 0) {
			return;
		}

		const leftMeta = getLeftDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;
		const rightMeta = getRightDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;

		this.emit('(', leftMeta);
		for (let i = 0; i < node.args.length; i++) {
			if (i > 0) {
				this.emit(',', node.metadata);
			}
			this.visitWithSpans(node.args[i]);
		}
		this.emit(')', rightMeta);
	}

	/**
	 * Emits spans for a subscript node with proper bracing.
	 */
	private visitSubscriptSpans(node: SubscriptNode): void {
		this.visitWithSpans(node.base);
		this.emit('_', node.metadata);

		const needsBraces = needsBracesForSubscript(node.subscript);
		if (needsBraces) this.emit('{', node.metadata);
		this.visitWithSpans(node.subscript);
		if (needsBraces) this.emit('}', node.metadata);
	}

	/**
	 * Emits spans for a superscript node with proper bracing.
	 */
	private visitSuperscriptSpans(node: SuperscriptNode): void {
		this.visitWithSpans(node.base);
		this.emit('^', node.metadata);

		const needsBraces = needsBracesForPower(node.superscript);
		if (needsBraces) this.emit('{', node.metadata);
		this.visitWithSpans(node.superscript);
		if (needsBraces) this.emit('}', node.metadata);
	}

	/**
	 * Emits spans for a relation node (including chained relations).
	 */
	private visitRelationSpans(node: RelationNode): void {
		// Flatten the chain (works for both binary and nested relations)
		const flat = flattenRelationChain(node);

		// Build spans by walking the nested structure to preserve metadata
		this.visitRelationChainSpans(node, flat.operands.length);
	}

	/**
	 * Helper to recursively emit relation chain spans while preserving metadata.
	 */
	private visitRelationChainSpans(node: RelationNode, _totalOperands: number): void {
		// If left is a relation, recurse into it first (left-associative nesting)
		if (node.left.type === 'relation') {
			this.visitRelationChainSpans(node.left, _totalOperands - 1);
		} else {
			// Base case: emit the leftmost operand
			this.visitWithSpans(node.left);
		}

		// Emit the relation operator
		const relMeta = node.relationMetadata ?? node.metadata;
		this.emit(RELATION_MAP[node.relation], relMeta);

		// Emit the right operand
		this.visitWithSpans(node.right);
	}

	/**
	 * Emits spans for a unit node.
	 */
	private visitUnitSpans(node: UnitNode): void {
		// Get the effective metadata for each part
		const nodeMeta = node.metadata;
		const unitMeta = node.unitMetadata ?? nodeMeta;

		// Visit the expression with the node's metadata
		this.visitWithSpansInherited(node.expression, nodeMeta);

		// Emit the unit in bracket notation
		this.emit('[', unitMeta);
		this.emit(format(node.unit, 'original'), unitMeta);
		this.emit(']', unitMeta);
	}

	/**
	 * Emits spans for a composition node (f composed with g).
	 * Renders as: outer@inner (@ is the composition operator in custom syntax)
	 */
	private visitCompositionSpans(node: CompositionNode): void {
		const opMeta = node.operatorMetadata ?? node.metadata;
		this.visitWithSpans(node.outer);
		this.emit('@', opMeta);
		this.visitWithSpans(node.inner);
	}

	/**
	 * Emits spans for a matrix node.
	 * Renders as [[row1],[row2],...]
	 */
	private visitMatrixSpans(node: MatrixNode): void {
		this.emit('[[', node.metadata);
		for (let i = 0; i < node.rows.length; i++) {
			if (i > 0) {
				this.emit('],[', node.metadata);
			}
			const row = node.rows[i];
			for (let j = 0; j < row.length; j++) {
				if (j > 0) {
					this.emit(',', node.metadata);
				}
				this.visitWithSpans(row[j]);
			}
		}
		this.emit(']]', node.metadata);
	}

	/**
	 * Visits a node with inherited metadata.
	 * If the node has its own metadata, uses that; otherwise uses the inherited metadata.
	 */
	private visitWithSpansInherited(node: MathNode, inheritedMeta?: NodeMetadata): void {
		// Use the node's own metadata if present, otherwise inherit
		const effectiveMeta = node.metadata ?? inheritedMeta;

		// For leaf nodes, emit directly with effective metadata
		switch (node.type) {
			case 'number':
				this.emit(node.value, effectiveMeta);
				break;
			case 'variable':
				this.emit(node.name, effectiveMeta);
				break;
			case 'greek':
				if (!SUPPORTED_GREEK.has(node.letter)) {
					throw new Error(`Unsupported Greek letter for custom syntax: ${node.letter}`);
				}
				this.emit(`\\${node.letter}`, effectiveMeta);
				break;
			case 'symbol':
				if (node.symbol === 'infinity') {
					this.emit('\\infty', effectiveMeta);
				} else {
					throw new Error(`Unsupported symbol for custom syntax: ${node.symbol}`);
				}
				break;
			case 'hole':
				this.emit('?', effectiveMeta);
				break;
			default:
				// For complex nodes, use normal visitWithSpans
				this.visitWithSpans(node);
		}
	}

	// =========================================================================
	// Simple Mode: String-based Rendering
	// =========================================================================

	private generateNode(node: MathNode): string {
		let content: string;

		switch (node.type) {
			case 'number':
				content = this.generateNumber(node);
				break;
			case 'variable':
				content = this.generateVariable(node);
				break;
			case 'greek':
				content = this.generateGreek(node);
				break;
			case 'symbol':
				content = this.generateSymbol(node);
				break;
			case 'addition':
				content = this.generateAddition(node);
				break;
			case 'subtraction':
				content = this.generateSubtraction(node);
				break;
			case 'multiplication':
				content = this.generateMultiplication(node);
				break;
			case 'division':
				content = this.generateDivision(node);
				break;
			case 'opposite':
				content = this.generateOpposite(node);
				break;
			case 'positive':
				content = this.generatePositive(node);
				break;
			case 'function':
				content = this.generateFunction(node);
				break;
			case 'delimiter':
				content = this.generateDelimiter(node);
				break;
			case 'subscript':
				content = this.generateSubscript(node);
				break;
			case 'superscript':
				content = this.generateSuperscript(node);
				break;
			case 'relation':
				content = this.generateRelation(node);
				break;
			case 'unit':
				content = this.generateUnit(node);
				break;
			case 'hole':
				content = this.generateHole(node);
				break;
			case 'composition':
				content = this.generateComposition(node);
				break;
			case 'matrix':
				content = this.generateMatrix(node);
				break;
			case 'complex':
				content = this.generateComplex(node);
				break;
			case 'infinity':
				content = this.generateInfinity(node);
				break;
			case 'limit':
				content = this.generateLimit(node);
				break;
			default: {
				const exhaustive: never = node;
				throw new Error(`Unknown node type: ${(exhaustive as MathNode).type}`);
			}
		}

		return this.wrapWithMetadata(content, node);
	}

	private generateNumber(node: NumberNode): string {
		return node.value;
	}

	private generateInfinity(node: InfinityNode): string {
		const sign = node.sign === 'positive' ? '+' : '-';
		return `${sign}∞`;
	}

	private generateLimit(node: LimitNode): string {
		const approach = this.generateNode(node.approach);
		let direction = '';
		if (node.direction === 'right') {
			direction = '⁺';
		} else if (node.direction === 'left') {
			direction = '⁻';
		}
		const expression = this.generateNode(node.expression);
		return `lim[${node.variable}→${approach}${direction}] ${expression}`;
	}

	private generateComplex(node: ComplexNode): string {
		const real = this.generateNode(node.real);
		const imag = this.generateNode(node.imaginary);
		return `${real} + ${imag}i`;
	}

	private generateVariable(node: VariableNode): string {
		return node.name;
	}

	private generateGreek(node: GreekLetterNode): string {
		if (!SUPPORTED_GREEK.has(node.letter)) {
			throw new Error(
				`Unsupported Greek letter for custom syntax: ${node.letter}. ` +
					`Only pi, alpha, beta, gamma, theta are supported.`
			);
		}
		return `\\${node.letter}`;
	}

	private generateSymbol(node: SymbolNode): string {
		if (node.symbol === 'infinity') {
			return '\\infty';
		}
		throw new Error(
			`Unsupported symbol for custom syntax: ${node.symbol}. ` + `Only infinity is supported.`
		);
	}

	private generateAddition(node: AdditionNode): string {
		const left = this.generateNode(node.left);
		const right = this.generateNode(node.right);
		return `${left}+${right}`;
	}

	private generateSubtraction(node: SubtractionNode): string {
		const left = this.generateNode(node.left);
		const right = this.generateNode(node.right);
		return `${left}-${right}`;
	}

	private generateMultiplication(node: MultiplicationNode): string {
		const left = this.generateNode(node.left);
		const right = this.generateNode(node.right);

		switch (node.displayStyle) {
			case 'implicit':
				// Juxtaposition: no operator
				return `${left}${right}`;
			case 'dot':
			case 'cross':
			case 'star':
				// All explicit multiplications use * in custom syntax
				return `${left}*${right}`;
			default: {
				const exhaustive: never = node.displayStyle;
				throw new Error(`Unknown multiplication style: ${exhaustive}`);
			}
		}
	}

	private generateDivision(node: DivisionNode): string {
		const num = this.generateNode(node.numerator);
		const denom = this.generateNode(node.denominator);

		switch (node.displayStyle) {
			case 'fraction': {
				// Use / with {} wrapping for complex expressions
				const needsLeftWrap = shouldWrapForFraction(node.numerator);
				const needsRightWrap = shouldWrapForFraction(node.denominator);

				const leftStr = needsLeftWrap ? `{${num}}` : num;
				const rightStr = needsRightWrap ? `{${denom}}` : denom;

				return `${leftStr}/${rightStr}`;
			}
			case 'inline':
				return `${num}:/${denom}`;
			case 'ratio':
				return `${num}:${denom}`;
			default: {
				const exhaustive: never = node.displayStyle;
				throw new Error(`Unknown division style: ${exhaustive}`);
			}
		}
	}

	private generateOpposite(node: OppositeNode): string {
		const operand = this.generateNode(node.operand);
		return `-${operand}`;
	}

	private generatePositive(node: PositiveNode): string {
		const operand = this.generateNode(node.operand);
		return `+${operand}`;
	}

	/**
	 * Generates custom syntax for a function node.
	 * Special case: abs(x) is rendered as |x|
	 * Handles derivativeOrder (f', f'', f^{(n)}) and isInverse (f^{-1})
	 */
	private generateFunction(node: FunctionNode): string {
		// Special case: abs function renders as |x|
		if (node.name === 'abs' && node.args.length === 1 && !node.power && !node.base) {
			const content = this.generateNode(node.args[0]);
			return `|${content}|`;
		}

		// Regular function: NO backslash in custom syntax
		let result = node.name;

		// Add derivative notation (takes priority over power)
		// f' -> f', f'' -> f'', f''' -> f''', f^{(n)} -> f^{(n)}
		if (node.derivativeOrder !== undefined && node.derivativeOrder > 0) {
			if (node.derivativeOrder <= 3) {
				// Use prime notation: f', f'', f'''
				result += "'".repeat(node.derivativeOrder);
			} else {
				// Use parenthetical notation: f^{(n)}
				result += `^{(${node.derivativeOrder})}`;
			}
		}

		// Add inverse notation (f^{-1}) - only if no derivative
		if (node.isInverse && !node.derivativeOrder) {
			result += '^{-1}';
		}

		// Add power if present (only if no derivative and no inverse)
		if (node.power && !node.derivativeOrder && !node.isInverse) {
			const powerStr = this.generateNode(node.power);
			const needsBraces = needsBracesForPower(node.power);
			result += needsBraces ? `^{${powerStr}}` : `^${powerStr}`;
		}

		// Add base if present
		if (node.base) {
			// For sqrt, base is the nth root index: sqrt[n](x)
			if (node.name === 'sqrt') {
				const baseStr = this.generateNode(node.base);
				result += `[${baseStr}]`;
			} else {
				// Regular base subscript: log_2
				const baseStr = this.generateNode(node.base);
				const needsBraces = needsBracesForSubscript(node.base);
				result += needsBraces ? `_{${baseStr}}` : `_${baseStr}`;
			}
		}

		// Generate arguments
		// Parentheses are mandatory for standard functions (sin, cos, etc.)
		// But for generic functions (f, g, h) without arguments, omit parentheses
		if (node.args.length === 0) {
			return result;
		}
		const args = node.args.map((arg) => this.generateNode(arg)).join(',');
		return `${result}(${args})`;
	}

	private generateDelimiter(node: DelimiterNode): string {
		const content = this.generateNode(node.content);

		switch (node.delimiters) {
			case 'parentheses':
				return `(${content})`;
			default: {
				const exhaustive: never = node.delimiters;
				throw new Error(`Unknown delimiter type: ${exhaustive}`);
			}
		}
	}

	private generateSubscript(node: SubscriptNode): string {
		const base = this.generateNode(node.base);
		const subscript = this.generateNode(node.subscript);
		const needsBraces = needsBracesForSubscript(node.subscript);
		const wrappedSubscript = needsBraces ? `{${subscript}}` : subscript;
		return `${base}_${wrappedSubscript}`;
	}

	private generateSuperscript(node: SuperscriptNode): string {
		const base = this.generateNode(node.base);
		const superscript = this.generateNode(node.superscript);
		const needsBraces = needsBracesForPower(node.superscript);
		const wrappedSuperscript = needsBraces ? `{${superscript}}` : superscript;
		return `${base}^${wrappedSuperscript}`;
	}

	private generateRelation(node: RelationNode): string {
		// Flatten the chain (works for both binary and nested relations)
		const flat = flattenRelationChain(node);

		// Build the output: operand0 relation0 operand1 relation1 operand2 ...
		const parts: string[] = [];
		for (let i = 0; i < flat.operands.length; i++) {
			parts.push(this.generateNode(flat.operands[i]));
			if (i < flat.relations.length) {
				parts.push(RELATION_MAP[flat.relations[i]]);
			}
		}
		return parts.join('');
	}

	private generateUnit(node: UnitNode): string {
		const expr = this.generateNode(node.expression);
		const unitStr = format(node.unit, 'original');
		return `${expr}[${unitStr}]`;
	}

	/**
	 * Generates a hole/placeholder.
	 * In custom syntax, holes are always output as `?` (index is not included).
	 */
	private generateHole(_node: HoleNode): string {
		return '?';
	}

	/**
	 * Generates custom syntax for a composition node (f composed with g).
	 * Renders as: outer@inner (@ is the composition operator in custom syntax)
	 */
	private generateComposition(node: CompositionNode): string {
		const outer = this.generateNode(node.outer);
		const inner = this.generateNode(node.inner);
		return `${outer}@${inner}`;
	}

	/**
	 * Generates custom syntax for a matrix node.
	 * Renders as [[row1],[row2],...] (Python-like syntax)
	 */
	private generateMatrix(node: MatrixNode): string {
		const rows = node.rows.map((row) => row.map((elem) => this.generateNode(elem)).join(','));
		return `[[${rows.join('],[')}]]`;
	}

	private wrapWithMetadata(content: string, node: MathNode): string {
		if (!this.options.renderMetadata || !node.metadata) {
			return content;
		}

		let result = content;

		// Apply color using @color{...} syntax
		if (node.metadata.color) {
			result = `@${node.metadata.color}{${result}}`;
		}

		// Note: style (bold/italic) and annotation are not supported in custom syntax output

		return result;
	}
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Converts a MathAST node to custom syntax string.
 *
 * @param node - The MathAST node to convert
 * @param options - Optional generator options
 * @returns The custom syntax string representation
 *
 * @example
 * ```typescript
 * import { toCustom } from '$lib/mathAST/custom-generator';
 * import { parseCustom } from '$lib/mathAST/parser/custom';
 *
 * const ast = parseCustom('2x^2+3x+1');
 * const output = toCustom(ast);
 * // output: '2x^2+3x+1'
 *
 * // Round-trip safety: parseCustom(toCustom(ast)) produces equivalent AST
 * ```
 */
export function toCustom(node: MathNode, options?: CustomGeneratorOptions): string {
	return new CustomGenerator(options).generate(node);
}
