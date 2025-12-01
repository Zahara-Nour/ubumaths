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
	MathSymbol,
	RelationType,
	GreekLetter
} from './types';
import { flattenRelationChain } from './flatten';
import { format } from './units/formatter';

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
	'<=': '\\leq',
	'>=': '\\geq',
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
	'⟹': '\\implies',
	'⟺': '\\iff',
	'⟸': '\\impliedby'
};

// Uppercase Greek letters that are just roman letters in LaTeX
const GREEK_ROMAN_UPPERCASE = new Set<GreekLetter>([
	'Alpha',
	'Beta',
	'Epsilon',
	'Zeta',
	'Eta',
	'Iota',
	'Kappa',
	'Mu',
	'Nu',
	'Omicron',
	'Rho',
	'Tau',
	'Chi'
]);

const GREEK_ROMAN_MAP: Record<string, string> = {
	Alpha: 'A',
	Beta: 'B',
	Epsilon: 'E',
	Zeta: 'Z',
	Eta: 'H',
	Iota: 'I',
	Kappa: 'K',
	Mu: 'M',
	Nu: 'N',
	Omicron: 'O',
	Rho: 'P',
	Tau: 'T',
	Chi: 'X'
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
// Generator Class
// =============================================================================

export class LatexGenerator {
	private readonly options: Required<LatexGeneratorOptions>;

	constructor(options?: LatexGeneratorOptions) {
		this.options = {
			renderMetadata: options?.renderMetadata ?? false
		};
	}

	generate(node: MathNode): string {
		return this.generateNode(node);
	}

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
				return `\\frac{${num}}{${denom}}`;
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

	private generateFunction(node: FunctionNode): string {
		const isKnown = KNOWN_FUNCTIONS.has(node.name);
		const funcName = isKnown ? `\\${node.name}` : node.name;

		// Build the function name with optional power
		let nameWithPower = funcName;
		if (node.power) {
			const powerStr = this.generateNode(node.power);
			const wrappedPower = this.needsBraces(powerStr) ? `{${powerStr}}` : powerStr;
			nameWithPower = `${funcName}^${wrappedPower}`;
		}

		// Build the base subscript if present
		let nameWithBase = nameWithPower;
		if (node.base) {
			const baseStr = this.generateNode(node.base);
			const wrappedBase = this.needsBraces(baseStr) ? `{${baseStr}}` : baseStr;
			nameWithBase = `${nameWithPower}_${wrappedBase}`;
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
			case 'brackets':
				return `\\left[ ${content} \\right]`;
			case 'braces':
				return `\\left\\{ ${content} \\right\\}`;
			case 'invisible':
				return content;
			case 'absolute':
				return `\\left| ${content} \\right|`;
			case 'floor':
				return `\\left\\lfloor ${content} \\right\\rfloor`;
			case 'ceiling':
				return `\\left\\lceil ${content} \\right\\rceil`;
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
