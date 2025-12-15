/**
 * Base Typst Generator
 * ====================
 *
 * Abstract base class for Typst document generators.
 * Provides common functionality for page setup, text escaping,
 * date formatting, and exercise numbering.
 *
 * @module typst/generators/base-generator
 *
 * @example Creating a custom generator
 * ```typescript
 * class MyGenerator extends BaseTypstGenerator<MyInput> {
 *   generate(input: MyInput): GenerateResult {
 *     const setup = this.generateSetup();
 *     const content = this.generateContent(input);
 *     return {
 *       typstContent: setup + content,
 *       metadata: { generator: 'my-generator', generatedAt: new Date() }
 *     };
 *   }
 * }
 * ```
 */

import type { GeneratorConfig, GeneratorContext, GenerateResult } from '../types';
import { DEFAULT_GENERATOR_CONFIG } from '../types';
import { escapeTypst } from '$lib/custom-markdown/generators';
import { formatNumber, formatDateFR } from '../utils';

/**
 * Abstract base class for Typst document generators
 *
 * @template TInput - Type of input data for generation
 */
export abstract class BaseTypstGenerator<TInput> {
	/** Generator configuration (page layout, margins, etc.) */
	protected config: GeneratorConfig;

	/** Generation context (mode, locale, student info, etc.) */
	protected context: GeneratorContext;

	/**
	 * Create a new generator instance
	 *
	 * @param config - Partial generator configuration (merged with defaults)
	 * @param context - Partial generator context (merged with defaults)
	 */
	constructor(config?: Partial<GeneratorConfig>, context?: Partial<GeneratorContext>) {
		this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
		this.context = {
			mode: context?.mode || 'worksheet',
			locale: context?.locale || 'fr',
			...context
		};
	}

	/**
	 * Generate Typst document from input
	 * Must be implemented by subclasses
	 *
	 * @param input - Input data for document generation
	 * @returns Generation result with Typst content and metadata
	 */
	abstract generate(input: TInput): GenerateResult;

	/**
	 * Generate page setup with configuration
	 *
	 * Creates Typst page configuration including:
	 * - Paper size (A4, Letter)
	 * - Page margins
	 * - Base font size
	 * - Language settings
	 * - Paragraph justification
	 *
	 * @returns Typst page setup string
	 */
	protected generateSetup(): string {
		const { pageLayout, fontSize, margins } = this.config;

		return `#set page(
  paper: "${pageLayout.toLowerCase()}",
  margin: (top: ${margins.top}mm, bottom: ${margins.bottom}mm, left: ${margins.left}mm, right: ${margins.right}mm),
)

#set text(font: "New Computer Modern", size: ${fontSize}pt, lang: "fr", region: "FR")
#set par(justify: true, leading: 0.65em)
#set heading(numbering: none)
`;
	}

	/**
	 * Escape text for Typst
	 *
	 * Escapes special Typst characters to prevent markup interpretation:
	 * # $ @ * _ ` [ ] < > \
	 *
	 * @param text - Text to escape
	 * @returns Escaped text safe for Typst content
	 */
	protected escape(text: string): string {
		return escapeTypst(text);
	}

	/**
	 * Format date according to locale
	 *
	 * @param date - Date to format (defaults to current date)
	 * @returns Formatted date string in French locale
	 */
	protected formatDate(date?: Date): string {
		return formatDateFR(date || new Date());
	}

	/**
	 * Format exercise number according to configured style
	 *
	 * @param num - Exercise number (1-based)
	 * @returns Formatted number string (numeric, alphabetic, or roman)
	 */
	protected formatExerciseNumber(num: number): string {
		return formatNumber(num, this.config.numberingStyle || 'numeric');
	}
}
