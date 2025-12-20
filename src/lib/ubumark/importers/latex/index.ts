/**
 * LaTeX to Markdown transpiler
 * Converts LaTeX documents to Ubumark format
 */

// Export all types
export * from './types';

// Main transpiler function
export {
	transpileLatexToMarkdown,
	createConversionContext,
	processTokens,
	convertSingleToken,
	cleanupMarkdown,
	DEFAULT_OPTIONS
} from './transpiler';

// Tokenizer exports
export { tokenize } from './tokenizer';

// Converter exports
export {
	// Math converters
	convertMathInline,
	convertMathDisplay,
	// Heading converters
	convertHeading,
	isHeadingCommand,
	// Text formatting converters
	convertTextFormatting,
	isFormattingCommand,
	// Horizontal rule converters
	convertHorizontalRule,
	isHorizontalRuleCommand,
	// Special character converters
	convertSpecialCharacter,
	convertLineBreak,
	isEscapeCommand,
	// Dash conversion
	convertDashes,
	// Registry
	simpleCommandConverters,
	getSimpleCommandConverter,
	hasSimpleConverter
} from './converters/simple';

// List converters
export {
	// List environment converters
	convertItemize,
	convertEnumerate,
	convertDescription,
	// Utility functions
	parseListItems,
	getIndent,
	isListEnvironment,
	// Registry
	listEnvironmentConverters,
	getListConverter
} from './converters/lists';

// Splitter exports
export {
	// Main functions
	splitStatementAndSolution,
	detectSplitMethod,
	// Types
	type SplitMethod,
	type SplitResult,
	type SplitOptions
} from './splitter';

// Math to custom syntax converter
export {
	convertMathToCustomSyntax,
	detectUnsupportedFeatures,
	toCustomSafe,
	SUPPORTED_GREEK,
	SUPPORTED_SYMBOLS,
	type MathConversionResult,
	type UnsupportedFeature
} from './converters/math-to-custom';

// Parser exports (to be implemented)
// export { parseLatexTokens } from './parser';

// Utilities (to be implemented)
// export * from './utils';
