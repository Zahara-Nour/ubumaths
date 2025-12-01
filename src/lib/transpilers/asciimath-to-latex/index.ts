/**
 * Custom ASCIIMath to LaTeX Transpiler
 *
 * Converts ASCIIMath expressions to LaTeX with custom rules:
 * - `*` → `\times`
 * - `:` → `\div`
 * - `/` → `\frac{}{}`
 * - `()` → `\left(\right)`
 * - `[]` → `\left[\right]`
 * - `{}` → groupement invisible
 * - `||` → `\left|\right|`
 */

// Re-export components
export { Tokenizer } from './tokenizer.js';
export { Parser, ParseError } from './parser.js';
export { LatexGenerator } from './generator.js';
export type { GenerateResult } from './generator.js';

// Internal imports for transpile function
import { Tokenizer } from './tokenizer.js';
import { Parser, ParseError } from './parser.js';
import { LatexGenerator } from './generator.js';
import type { TranspileResult } from './types.js';

// Re-export types
export type {
	Token,
	TokenType,
	ASTNode,
	TranspileResult,
	TranspileOptions,
	// Node types
	NumberNode,
	IdentifierNode,
	GreekNode,
	SymbolNode,
	TemplateNode,
	AbsNode,
	GroupNode,
	ParenNode,
	BinaryOpNode,
	UnaryOpNode,
	FractionNode,
	SuperscriptNode,
	SubscriptNode,
	SubSupNode,
	FunctionNode,
	RootNode,
	ImplicitMulNode
} from './types.js';

// Re-export symbol utilities
export {
	GREEK_LETTERS,
	SYMBOLS,
	FUNCTIONS,
	isGreekLetter,
	isFunction,
	isSymbol,
	getGreekLatex,
	getSymbolLatex,
	getSymbolKeys
} from './symbols.js';

/**
 * Main transpilation function
 * Converts ASCIIMath string to LaTeX
 */
export function transpile(input: string): TranspileResult {
	try {
		// Step 1: Tokenize
		const tokenizer = new Tokenizer(input);
		const tokens = tokenizer.tokenize();

		// Step 2: Parse
		const parser = new Parser(tokens);
		const ast = parser.parse();

		// Step 3: Generate
		const generator = new LatexGenerator();
		const result = generator.generate(ast);

		return {
			success: true,
			latex: result.latex,
			templatesPreserved: result.templatesPreserved
		};
	} catch (e) {
		if (e instanceof ParseError) {
			return {
				success: false,
				latex: '',
				error: e.message,
				templatesPreserved: 0
			};
		}
		// Re-throw unexpected errors
		throw e;
	}
}
