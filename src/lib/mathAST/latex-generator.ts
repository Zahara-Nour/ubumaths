/**
 * LaTeX Generator for MathAST
 *
 * Converts MathAST nodes to AMS-LaTeX output with auto-sizing delimiters.
 * Trusts the AST structure for precedence - no smart parentheses insertion.
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
	MathSymbol,
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

export interface LatexGeneratorOptions {
	readonly renderMetadata?: boolean; // default: false
}

// =============================================================================
// Symbol Mappings
// =============================================================================

const SYMBOL_MAP: Record<MathSymbol, string> = {
	infinity: '\\infty',
	emptyset: '\\emptyset',
	partial: '\\partial',
	nabla: '\\nabla',
	forall: '\\forall',
	exists: '\\exists',
	nexists: '\\nexists',
	in: '\\in',
	notin: '\\notin',
	subset: '\\subset',
	supset: '\\supset',
	subseteq: '\\subseteq',
	supseteq: '\\supseteq',
	union: '\\cup',
	intersection: '\\cap',
	setminus: '\\setminus',
	therefore: '\\therefore',
	because: '\\because',
	qed: '\\blacksquare',
	aleph: '\\aleph',
	beth: '\\beth',
	ell: '\\ell',
	wp: '\\wp',
	Re: '\\Re',
	Im: '\\Im',
	hbar: '\\hbar',
	degree: '^\\circ',
	prime: "'",
	dprime: "''",
	approx: '\\approx',
	simeq: '\\simeq',
	cong: '\\cong',
	propto: '\\propto',
	perp: '\\perp',
	parallel: '\\parallel',
	angle: '\\angle',
	measuredangle: '\\measuredangle',
	triangle: '\\triangle',
	square: '\\square',
	diamond: '\\diamond',
	star: '\\star',
	circ: '\\circ',
	bullet: '\\bullet',
	cdot: '\\cdot',
	times: '\\times',
	div: '\\div',
	pm: '\\pm',
	mp: '\\mp',
	ast: '\\ast',
	oplus: '\\oplus',
	ominus: '\\ominus',
	otimes: '\\otimes',
	odot: '\\odot'
};

const RELATION_MAP: Record<RelationType, string> = {
	'=': '=',
	'<': '<',
	'>': '>',
	'<=': '\\leqslant',
	'>=': '\\geqslant',
	'!=': '\\neq',
	'≡': '\\equiv',
	'≢': '\\not\\equiv',
	'≈': '\\approx',
	'≃': '\\simeq',
	'∼': '\\sim',
	'≺': '\\prec',
	'≻': '\\succ',
	'⊂': '\\subset',
	'⊃': '\\supset',
	'⊆': '\\subseteq',
	'⊇': '\\supseteq',
	'∈': '\\in',
	'∉': '\\notin',
	'⟹': '\\Rightarrow',
	'⟺': '\\Leftrightarrow',
	'⟸': '\\Leftarrow'
};

// Uppercase Greek letters that are just roman letters in LaTeX
// NOTE: We only support lowercase Greek letters (pi, alpha, beta, gamma, theta)
// This set is kept for potential future expansion but is currently empty
const GREEK_ROMAN_UPPERCASE = new Set<GreekLetter>([]);

const GREEK_ROMAN_MAP: Record<string, string> = {
	// Empty - we only support lowercase Greek letters
};

// Known functions that should use \name syntax
const KNOWN_FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'cot',
	'sec',
	'csc',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'ln',
	'log',
	'exp',
	'lim',
	'min',
	'max',
	'sup',
	'inf',
	'det',
	'dim',
	'ker',
	'deg',
	'gcd',
	'lcm',
	'arg',
	'mod'
]);

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
// Generator Class
// =============================================================================

export class LatexGenerator {
	private readonly options: Required<LatexGeneratorOptions>;
	private spans: ColoredSpan[] = [];

	constructor(options?: LatexGeneratorOptions) {
		this.options = {
			renderMetadata: options?.renderMetadata ?? false
		};
	}

	generate(node: MathNode): string {
		if (!this.options.renderMetadata) {
			// Mode simple (existing behavior): generate without coalescence
			return this.generateNode(node);
		}
		// Mode coalescence: use spans and merge adjacent colors
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
	 * Coalesces adjacent spans with the same color and style, then renders to LaTeX.
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

		// Render to LaTeX
		return coalesced
			.map((s) => {
				let result = s.text;

				// Apply style first (innermost)
				if (s.style === 'bold') {
					result = `\\mathbf{${result}}`;
				} else if (s.style === 'italic') {
					result = `\\mathit{${result}}`;
				}

				// Apply color (outermost)
				if (s.color) {
					result = `\\textcolor{${s.color}}{${result}}`;
				}

				return result;
			})
			.join('');
	}

	/**
	 * Traverses the AST and emits colored spans for each component.
	 * Uses extended metadata (operatorMetadata, delimiterMetadata, etc.)
	 * to color individual parts of the expression.
	 */
	private visitWithSpans(node: MathNode): void {
		switch (node.type) {
			case 'number':
				this.emit(node.value, node.metadata);
				break;

			case 'variable':
				if (node.name.length === 1) {
					this.emit(node.name, node.metadata);
				} else {
					this.emit(`\\mathit{${node.name}}`, node.metadata);
				}
				break;

			case 'greek':
				if (GREEK_ROMAN_UPPERCASE.has(node.letter)) {
					this.emit(GREEK_ROMAN_MAP[node.letter], node.metadata);
				} else {
					this.emit(`\\${node.letter}`, node.metadata);
				}
				break;

			case 'symbol':
				this.emit(SYMBOL_MAP[node.symbol], node.metadata);
				break;

			case 'addition':
				this.visitWithSpans(node.left);
				this.emit(' + ', node.operatorMetadata ?? node.metadata);
				this.visitWithSpans(node.right);
				break;

			case 'subtraction':
				this.visitWithSpans(node.left);
				this.emit(' - ', node.operatorMetadata ?? node.metadata);
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
				this.visitWithSpans(node.base);
				this.emit('_', node.metadata);
				this.emit('{', node.metadata);
				this.visitWithSpans(node.subscript);
				this.emit('}', node.metadata);
				break;

			case 'superscript':
				this.visitWithSpans(node.base);
				this.emit('^', node.metadata);
				this.emit('{', node.metadata);
				this.visitWithSpans(node.superscript);
				this.emit('}', node.metadata);
				break;

			case 'relation':
				this.visitRelationSpans(node);
				break;

			case 'unit':
				this.visitUnitSpans(node);
				break;

			case 'hole':
				this.emit(`\\placeholder[${node.index}]{}`, node.metadata);
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

			default: {
				const exhaustive: never = node;
				throw new Error(`Unknown node type: ${(exhaustive as MathNode).type}`);
			}
		}
	}

	/**
	 * Emits the multiplication operator span based on display style.
	 */
	private visitMultiplicationOperatorSpan(node: MultiplicationNode): void {
		const opMeta = node.operatorMetadata ?? node.metadata;
		switch (node.displayStyle) {
			case 'implicit':
				this.emit(' ', opMeta);
				break;
			case 'dot':
				this.emit(' \\cdot ', opMeta);
				break;
			case 'cross':
				this.emit(' \\times ', opMeta);
				break;
			case 'star':
				this.emit(' * ', opMeta);
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
			case 'fraction':
				this.emit('\\dfrac{', opMeta);
				this.visitWithSpans(node.numerator);
				this.emit('}{', opMeta);
				this.visitWithSpans(node.denominator);
				this.emit('}', opMeta);
				break;
			case 'inline':
				this.visitWithSpans(node.numerator);
				this.emit(' / ', opMeta);
				this.visitWithSpans(node.denominator);
				break;
			case 'ratio':
				this.visitWithSpans(node.numerator);
				this.emit(' : ', opMeta);
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
				this.emit('\\left( ', leftMeta);
				this.visitWithSpans(node.content);
				this.emit(' \\right)', rightMeta);
				break;
			default: {
				const exhaustive: never = node.delimiters;
				throw new Error(`Unknown delimiter type: ${exhaustive}`);
			}
		}
	}

	/**
	 * Emits spans for a function node.
	 * Special cases:
	 * - abs(x) is rendered as |x| using \left| \right|
	 * - sqrt(x) is rendered as \sqrt{x} (not sqrt\left( x \right))
	 * - cbrt(x) is rendered as \sqrt[3]{x}
	 * - root(x, n) is rendered as \sqrt[n]{x}
	 * Handles derivativeOrder (f', f'', f^{(n)}) and isInverse (f^{-1})
	 */
	private visitFunctionSpans(node: FunctionNode): void {
		// Special case: abs function renders as |x|
		if (node.name === 'abs' && node.args.length === 1 && !node.power && !node.base) {
			const leftMeta = getLeftDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;
			const rightMeta = getRightDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;
			this.emit('\\left| ', leftMeta);
			this.visitWithSpans(node.args[0]);
			this.emit(' \\right|', rightMeta);
			return;
		}

		// Special case: sqrt, cbrt, root functions use \sqrt{} syntax instead of function call syntax.
		// This is necessary for LaTeX round-trip compatibility:
		// - LaTeX parser expects \sqrt{x} or \sqrt[n]{x}
		// - Without this, we would generate "sqrt\left( x \right)" which fails to parse back
		// - sqrt uses: \sqrt{radicand}
		// - sqrt with base (nth root) uses: \sqrt[index]{radicand}
		// - cbrt (cube root) uses: \sqrt[3]{radicand}
		// - root(radicand, index) uses: \sqrt[index]{radicand}
		if (node.name === 'sqrt' && node.args.length === 1 && !node.power) {
			if (node.base) {
				// Nth root: \sqrt[n]{x} - the index is stored in node.base
				this.emit('\\sqrt[', node.nameMetadata ?? node.metadata);
				this.visitWithSpans(node.base);
				this.emit(']{', node.metadata);
				this.visitWithSpans(node.args[0]);
				this.emit('}', node.metadata);
			} else {
				// Square root: \sqrt{x}
				this.emit('\\sqrt{', node.nameMetadata ?? node.metadata);
				this.visitWithSpans(node.args[0]);
				this.emit('}', node.metadata);
			}
			return;
		}

		if (node.name === 'cbrt' && node.args.length === 1 && !node.power && !node.base) {
			// Cube root: \sqrt[3]{x}
			this.emit('\\sqrt[3]{', node.nameMetadata ?? node.metadata);
			this.visitWithSpans(node.args[0]);
			this.emit('}', node.metadata);
			return;
		}

		if (node.name === 'root' && node.args.length === 2 && !node.power && !node.base) {
			// General nth root: root(radicand, index) → \sqrt[index]{radicand}
			this.emit('\\sqrt[', node.nameMetadata ?? node.metadata);
			this.visitWithSpans(node.args[1]); // index is second argument
			this.emit(']{', node.metadata);
			this.visitWithSpans(node.args[0]); // radicand is first argument
			this.emit('}', node.metadata);
			return;
		}

		const isKnown = KNOWN_FUNCTIONS.has(node.name);
		const funcName = isKnown ? `\\${node.name}` : node.name;

		// Emit function name
		this.emit(funcName, node.nameMetadata ?? node.metadata);

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
			this.emit('^{', node.metadata);
			this.visitWithSpans(node.power);
			this.emit('}', node.metadata);
		}

		// Emit base subscript if present (e.g., log_2)
		if (node.base) {
			this.emit('_{', node.metadata);
			this.visitWithSpans(node.base);
			this.emit('}', node.metadata);
		}

		// Emit parentheses and arguments
		// Skip parentheses for functions with no arguments (generic functions like f', f^{-1})
		if (node.args.length === 0) {
			return;
		}

		const leftMeta = getLeftDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;
		const rightMeta = getRightDelimiterMetadata(node) ?? node.delimiterMetadata ?? node.metadata;

		this.emit('\\left( ', leftMeta);
		for (let i = 0; i < node.args.length; i++) {
			if (i > 0) {
				this.emit(', ', node.metadata);
			}
			this.visitWithSpans(node.args[i]);
		}
		this.emit(' \\right)', rightMeta);
	}

	/**
	 * Emits spans for a relation node (including chained relations).
	 */
	private visitRelationSpans(node: RelationNode): void {
		// Flatten the chain (works for both binary and nested relations)
		const flat = flattenRelationChain(node);

		// Build spans: operand0 relation0 operand1 relation1 operand2 ...
		// We need to walk the original nested structure to get relationMetadata
		this.visitRelationChainSpans(node, flat.operands.length);
	}

	/**
	 * Helper to recursively emit relation chain spans while preserving metadata.
	 */
	private visitRelationChainSpans(node: RelationNode, totalOperands: number): void {
		// If left is a relation, recurse into it first (left-associative nesting)
		if (node.left.type === 'relation') {
			this.visitRelationChainSpans(node.left, totalOperands - 1);
		} else {
			// Base case: emit the leftmost operand
			this.visitWithSpans(node.left);
		}

		// Emit the relation operator
		const relMeta = node.relationMetadata ?? node.metadata;
		this.emit(` ${RELATION_MAP[node.relation]} `, relMeta);

		// Emit the right operand
		this.visitWithSpans(node.right);
	}

	/**
	 * Emits spans for a unit node.
	 * When the UnitNode has metadata, it applies to the entire expression+unit.
	 * The unitMetadata can override just the unit part if specified.
	 */
	private visitUnitSpans(node: UnitNode): void {
		// Get the effective metadata for each part
		const nodeMeta = node.metadata;
		const unitMeta = node.unitMetadata ?? nodeMeta;

		// For the expression part, we need to visit it with the node's metadata
		// if the expression itself has no metadata
		this.visitWithSpansInherited(node.expression, nodeMeta);

		// Emit the tilde with the node's metadata (so it coalesces with the expression)
		this.emit('~', nodeMeta);

		// Emit the unit with unitMetadata (or fallback to node metadata)
		this.emit(`\\unit{${format(node.unit, 'original')}}`, unitMeta);
	}

	/**
	 * Emits spans for a composition node (f composed with g).
	 * Renders as: outer \circ inner
	 */
	private visitCompositionSpans(node: CompositionNode): void {
		const opMeta = node.operatorMetadata ?? node.metadata;
		this.visitWithSpans(node.outer);
		this.emit(' \\circ ', opMeta);
		this.visitWithSpans(node.inner);
	}

	/**
	 * Map MatrixType to LaTeX environment name.
	 * 'plain' maps to 'matrix', others map to themselves.
	 */
	private getLatexMatrixEnv(matrixType: string): string {
		return matrixType === 'plain' ? 'matrix' : matrixType;
	}

	/**
	 * Emits spans for a matrix node.
	 * Renders as \begin{matrixType}...\end{matrixType}
	 */
	private visitMatrixSpans(node: MatrixNode): void {
		const envName = this.getLatexMatrixEnv(node.matrixType);
		this.emit(`\\begin{${envName}}`, node.metadata);

		for (let i = 0; i < node.rows.length; i++) {
			const row = node.rows[i];
			for (let j = 0; j < row.length; j++) {
				this.visitWithSpans(row[j]);
				if (j < row.length - 1) {
					this.emit(' & ', node.metadata);
				}
			}
			if (i < node.rows.length - 1) {
				this.emit(' \\\\ ', node.metadata);
			}
		}

		this.emit(`\\end{${envName}}`, node.metadata);
	}

	/**
	 * Emits spans for a complex number node.
	 * Renders as: a + b\imaginaryI (with special cases for 0, 1, negative)
	 */
	private visitComplexSpans(node: ComplexNode): void {
		const isZero = (n: MathNode) => n.type === 'number' && n.value === '0';
		const isOne = (n: MathNode) => n.type === 'number' && n.value === '1';
		const isNegOne = (n: MathNode) => n.type === 'number' && n.value === '-1';
		const isNegative = (n: MathNode) =>
			n.type === 'number' && n.value.startsWith('-') && n.value !== '0';
		const absValue = (n: MathNode): MathNode => {
			if (n.type === 'number' && n.value.startsWith('-')) {
				return { ...n, value: n.value.slice(1) };
			}
			return n;
		};

		const realIsZero = isZero(node.real);
		const imagIsZero = isZero(node.imaginary);
		const imagIsOne = isOne(node.imaginary);
		const imagIsNegOne = isNegOne(node.imaginary);
		const imagIsNegative = isNegative(node.imaginary);

		if (realIsZero && imagIsZero) {
			// 0 + 0i = 0
			this.emit('0', node.metadata);
		} else if (realIsZero && imagIsOne) {
			// 0 + 1i = i
			this.emit('\\imaginaryI', node.metadata);
		} else if (realIsZero && imagIsNegOne) {
			// 0 + (-1)i = -i
			this.emit('-\\imaginaryI', node.metadata);
		} else if (realIsZero) {
			// 0 + bi = bi (handles negative: 0 + (-4)i = -4i)
			this.visitWithSpans(node.imaginary);
			this.emit('\\imaginaryI', node.metadata);
		} else if (imagIsZero) {
			// a + 0i = a
			this.visitWithSpans(node.real);
		} else if (imagIsOne) {
			// a + 1i = a + i
			this.visitWithSpans(node.real);
			this.emit(' + ', node.metadata);
			this.emit('\\imaginaryI', node.metadata);
		} else if (imagIsNegOne) {
			// a + (-1)i = a - i
			this.visitWithSpans(node.real);
			this.emit(' - ', node.metadata);
			this.emit('\\imaginaryI', node.metadata);
		} else if (imagIsNegative) {
			// a + (-b)i = a - bi
			this.visitWithSpans(node.real);
			this.emit(' - ', node.metadata);
			this.visitWithSpans(absValue(node.imaginary));
			this.emit('\\imaginaryI', node.metadata);
		} else {
			// a + bi
			this.visitWithSpans(node.real);
			this.emit(' + ', node.metadata);
			this.visitWithSpans(node.imaginary);
			this.emit('\\imaginaryI', node.metadata);
		}
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
				if (node.name.length === 1) {
					this.emit(node.name, effectiveMeta);
				} else {
					this.emit(`\\mathit{${node.name}}`, effectiveMeta);
				}
				break;
			case 'greek':
				if (GREEK_ROMAN_UPPERCASE.has(node.letter)) {
					this.emit(GREEK_ROMAN_MAP[node.letter], effectiveMeta);
				} else {
					this.emit(`\\${node.letter}`, effectiveMeta);
				}
				break;
			case 'symbol':
				this.emit(SYMBOL_MAP[node.symbol], effectiveMeta);
				break;
			case 'hole':
				this.emit(`\\placeholder[${node.index}]{}`, effectiveMeta);
				break;
			default:
				// For complex nodes, use normal visitWithSpans
				// (they will handle their own metadata)
				this.visitWithSpans(node);
		}
	}

	// =========================================================================
	// Simple Mode: String-based Rendering (existing behavior)
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

	private generateVariable(node: VariableNode): string {
		// Single character: render as-is
		if (node.name.length === 1) {
			return node.name;
		}
		// Multi-character: use \mathit{}
		return `\\mathit{${node.name}}`;
	}

	private generateGreek(node: GreekLetterNode): string {
		// Check if this is an uppercase letter that's just a roman letter
		if (GREEK_ROMAN_UPPERCASE.has(node.letter)) {
			return GREEK_ROMAN_MAP[node.letter];
		}
		// Otherwise use \letter syntax
		return `\\${node.letter}`;
	}

	private generateSymbol(node: SymbolNode): string {
		return SYMBOL_MAP[node.symbol];
	}

	private generateAddition(node: AdditionNode): string {
		const left = this.generateNode(node.left);
		const right = this.generateNode(node.right);
		return `${left} + ${right}`;
	}

	private generateSubtraction(node: SubtractionNode): string {
		const left = this.generateNode(node.left);
		const right = this.generateNode(node.right);
		return `${left} - ${right}`;
	}

	private generateMultiplication(node: MultiplicationNode): string {
		const left = this.generateNode(node.left);
		const right = this.generateNode(node.right);

		switch (node.displayStyle) {
			case 'implicit':
				return `${left} ${right}`;
			case 'dot':
				return `${left} \\cdot ${right}`;
			case 'cross':
				return `${left} \\times ${right}`;
			case 'star':
				return `${left} * ${right}`;
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
			case 'fraction':
				return `\\dfrac{${num}}{${denom}}`;
			case 'inline':
				return `${num} / ${denom}`;
			case 'ratio':
				return `${num} : ${denom}`;
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
	 * Generates LaTeX for a function node.
	 * Special cases:
	 * - abs(x) is rendered as |x| using \left| \right|
	 * - sqrt(x) is rendered as \sqrt{x} (not sqrt\left( x \right))
	 * - cbrt(x) is rendered as \sqrt[3]{x}
	 * - root(x, n) is rendered as \sqrt[n]{x}
	 * Handles derivativeOrder (f', f'', f^{(n)}) and isInverse (f^{-1})
	 */
	private generateFunction(node: FunctionNode): string {
		// Special case: abs function renders as |x|
		if (node.name === 'abs' && node.args.length === 1 && !node.power && !node.base) {
			const content = this.generateNode(node.args[0]);
			return `\\left| ${content} \\right|`;
		}

		// Special case: sqrt, cbrt, root functions use \sqrt{} syntax instead of function call syntax.
		// This is necessary for LaTeX round-trip compatibility:
		// - LaTeX parser expects \sqrt{x} or \sqrt[n]{x}
		// - Without this, we would generate "sqrt\left( x \right)" which fails to parse back
		// - sqrt uses: \sqrt{radicand}
		// - sqrt with base (nth root) uses: \sqrt[index]{radicand}
		// - cbrt (cube root) uses: \sqrt[3]{radicand}
		// - root(radicand, index) uses: \sqrt[index]{radicand}
		if (node.name === 'sqrt' && node.args.length === 1 && !node.power) {
			const radicand = this.generateNode(node.args[0]);
			if (node.base) {
				// Nth root: \sqrt[n]{x} - the index is stored in node.base
				const index = this.generateNode(node.base);
				return `\\sqrt[${index}]{${radicand}}`;
			} else {
				// Square root: \sqrt{x}
				return `\\sqrt{${radicand}}`;
			}
		}

		if (node.name === 'cbrt' && node.args.length === 1 && !node.power && !node.base) {
			// Cube root: \sqrt[3]{x}
			const radicand = this.generateNode(node.args[0]);
			return `\\sqrt[3]{${radicand}}`;
		}

		if (node.name === 'root' && node.args.length === 2 && !node.power && !node.base) {
			// General nth root: root(radicand, index) → \sqrt[index]{radicand}
			const radicand = this.generateNode(node.args[0]);
			const index = this.generateNode(node.args[1]);
			return `\\sqrt[${index}]{${radicand}}`;
		}

		const isKnown = KNOWN_FUNCTIONS.has(node.name);
		const funcName = isKnown ? `\\${node.name}` : node.name;

		// Build derivative notation (takes priority over power)
		// f' -> f', f'' -> f'', f''' -> f''', f^(4) -> f^{(4)}
		let nameWithDerivative = funcName;
		if (node.derivativeOrder !== undefined && node.derivativeOrder > 0) {
			if (node.derivativeOrder <= 3) {
				// Use prime notation: f', f'', f'''
				nameWithDerivative = `${funcName}${"'".repeat(node.derivativeOrder)}`;
			} else {
				// Use parenthetical notation: f^{(n)}
				nameWithDerivative = `${funcName}^{(${node.derivativeOrder})}`;
			}
		}

		// Build inverse notation (f^{-1}) - only if no derivative
		let nameWithInverse = nameWithDerivative;
		if (node.isInverse && !node.derivativeOrder) {
			nameWithInverse = `${funcName}^{-1}`;
		}

		// Build the function name with optional power (only if no derivative and no inverse)
		let nameWithPower = nameWithInverse;
		if (node.power && !node.derivativeOrder && !node.isInverse) {
			const powerStr = this.generateNode(node.power);
			const wrappedPower = this.needsBraces(powerStr) ? `{${powerStr}}` : powerStr;
			nameWithPower = `${nameWithInverse}^${wrappedPower}`;
		}

		// Build the base subscript if present
		let nameWithBase = nameWithPower;
		if (node.base) {
			const baseStr = this.generateNode(node.base);
			const wrappedBase = this.needsBraces(baseStr) ? `{${baseStr}}` : baseStr;
			nameWithBase = `${nameWithPower}_${wrappedBase}`;
		}

		// Skip parentheses for functions with no arguments (generic functions like f', f^{-1})
		if (node.args.length === 0) {
			return nameWithBase;
		}

		// Generate arguments
		const args = node.args.map((arg) => this.generateNode(arg)).join(', ');

		return `${nameWithBase}\\left( ${args} \\right)`;
	}

	private generateDelimiter(node: DelimiterNode): string {
		const content = this.generateNode(node.content);

		switch (node.delimiters) {
			case 'parentheses':
				return `\\left( ${content} \\right)`;
			default: {
				const exhaustive: never = node.delimiters;
				throw new Error(`Unknown delimiter type: ${exhaustive}`);
			}
		}
	}

	private generateSubscript(node: SubscriptNode): string {
		const base = this.generateNode(node.base);
		const subscript = this.generateNode(node.subscript);
		const wrappedSubscript = this.needsBraces(subscript) ? `{${subscript}}` : subscript;
		return `${base}_${wrappedSubscript}`;
	}

	private generateSuperscript(node: SuperscriptNode): string {
		const base = this.generateNode(node.base);
		const superscript = this.generateNode(node.superscript);
		const wrappedSuperscript = this.needsBraces(superscript) ? `{${superscript}}` : superscript;
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
				parts.push(` ${RELATION_MAP[flat.relations[i]]} `);
			}
		}
		return parts.join('');
	}

	private generateUnit(node: UnitNode): string {
		const expr = this.generateNode(node.expression);
		const unitStr = format(node.unit, 'original');
		return `${expr}~\\unit{${unitStr}}`;
	}

	/**
	 * Generates a hole/placeholder as \placeholder[N]{}
	 */
	private generateHole(node: HoleNode): string {
		return `\\placeholder[${node.index}]{}`;
	}

	/**
	 * Generates LaTeX for a composition node (f composed with g).
	 * Renders as: outer \circ inner
	 */
	private generateComposition(node: CompositionNode): string {
		const outer = this.generateNode(node.outer);
		const inner = this.generateNode(node.inner);
		return `${outer} \\circ ${inner}`;
	}

	/**
	 * Generates LaTeX for a matrix node.
	 * Renders as \begin{matrixType}...\end{matrixType}
	 */
	private generateMatrix(node: MatrixNode): string {
		const envName = this.getLatexMatrixEnv(node.matrixType);
		const rows = node.rows.map((row) => row.map((elem) => this.generateNode(elem)).join(' & '));
		return `\\begin{${envName}}${rows.join(' \\\\ ')}\\end{${envName}}`;
	}

	/**
	 * Generates LaTeX for a complex number node.
	 * Renders as: a + b\imaginaryI (with special cases for 0, 1)
	 */
	private generateComplex(node: ComplexNode): string {
		const isZero = (n: MathNode) => n.type === 'number' && n.value === '0';
		const isOne = (n: MathNode) => n.type === 'number' && n.value === '1';
		const isNegOne = (n: MathNode) => n.type === 'number' && n.value === '-1';
		const isNegative = (n: MathNode) =>
			n.type === 'number' && n.value.startsWith('-') && n.value !== '0';
		const absValue = (n: MathNode): string => {
			if (n.type === 'number' && n.value.startsWith('-')) {
				return n.value.slice(1);
			}
			return this.generateNode(n);
		};

		const realIsZero = isZero(node.real);
		const imagIsZero = isZero(node.imaginary);
		const imagIsOne = isOne(node.imaginary);
		const imagIsNegOne = isNegOne(node.imaginary);
		const imagIsNegative = isNegative(node.imaginary);

		if (realIsZero && imagIsZero) {
			// 0 + 0i = 0
			return '0';
		} else if (realIsZero && imagIsOne) {
			// 0 + 1i = i
			return '\\imaginaryI';
		} else if (realIsZero && imagIsNegOne) {
			// 0 + (-1)i = -i
			return '-\\imaginaryI';
		} else if (realIsZero) {
			// 0 + bi = bi (handles negative: 0 + (-4)i = -4i)
			return `${this.generateNode(node.imaginary)}\\imaginaryI`;
		} else if (imagIsZero) {
			// a + 0i = a
			return this.generateNode(node.real);
		} else if (imagIsOne) {
			// a + 1i = a + i
			return `${this.generateNode(node.real)} + \\imaginaryI`;
		} else if (imagIsNegOne) {
			// a + (-1)i = a - i
			return `${this.generateNode(node.real)} - \\imaginaryI`;
		} else if (imagIsNegative) {
			// a + (-b)i = a - bi
			return `${this.generateNode(node.real)} - ${absValue(node.imaginary)}\\imaginaryI`;
		} else {
			// a + bi
			return `${this.generateNode(node.real)} + ${this.generateNode(node.imaginary)}\\imaginaryI`;
		}
	}

	private wrapWithMetadata(content: string, node: MathNode): string {
		if (!this.options.renderMetadata || !node.metadata) {
			return content;
		}

		let result = content;

		// Apply style
		if (node.metadata.style === 'bold') {
			result = `\\mathbf{${result}}`;
		} else if (node.metadata.style === 'italic') {
			result = `\\mathit{${result}}`;
		}

		// Apply color
		if (node.metadata.color) {
			result = `\\textcolor{${node.metadata.color}}{${result}}`;
		}

		// Note: annotation is ignored in LaTeX output

		return result;
	}

	/**
	 * Determines if a string needs braces when used in subscript/superscript
	 * Braces are needed if the string is more than one character (excluding LaTeX commands)
	 */
	private needsBraces(str: string): boolean {
		// If it's a single character (not a backslash), no braces needed
		if (str.length === 1 && str !== '\\') {
			return false;
		}

		// If it's a LaTeX command followed by nothing, no braces needed
		// e.g., "\alpha", "\infty"
		if (str.startsWith('\\')) {
			const commandMatch = str.match(/^\\[a-zA-Z]+$/);
			if (commandMatch) {
				return false;
			}
		}

		// Otherwise, braces are needed
		return true;
	}
}

// =============================================================================
// Convenience Function
// =============================================================================

export function toLatex(node: MathNode, options?: LatexGeneratorOptions): string {
	return new LatexGenerator(options).generate(node);
}
