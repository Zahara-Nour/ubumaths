/**
 * Markdown Rendering System - Type Definitions
 * =============================================
 *
 * Types for the unified markdown rendering system used by both
 * Questions and Exercises. This module provides:
 * - Re-exports of AST types from exercises/types
 * - Display mode configuration
 * - Renderer component props
 * - Blank/fill-in handling
 * - Variable syntax highlighting
 *
 * @module components/markdown/types
 */

// ============================================================================
// RE-EXPORTS FROM EXERCISES TYPES
// ============================================================================

// AST Node Types
export type {
	BaseNode,
	TextNode,
	MathInlineNode,
	MathBlockNode,
	ParagraphNode,
	HeadingNode,
	ListItemNode,
	ListNode,
	TableCellNode,
	TableNode,
	ImageNode,
	HorizontalRuleNode,
	BlockquoteNode,
	CodeBlockNode,
	LineBreakNode,
	InlineNode,
	BlockNode,
	ASTNode,
	DocumentNode
} from '$lib/exercises/types';

// Image Types
export type { ImageSizeClass, ImageAlignment, ImageSizeMapping } from '$lib/exercises/types';
export { DEFAULT_IMAGE_SIZE_MAPPINGS } from '$lib/exercises/types';

// Parser and Render Options
export type { ParseOptions, RenderOptions } from '$lib/exercises/types';

// Utility Types
export type { ParseResult, MathPlaceholder } from '$lib/exercises/types';

// ============================================================================
// DISPLAY MODE TYPES
// ============================================================================

/**
 * Mode d'affichage du markdown
 *
 * Controls how markdown content is displayed:
 * - `rendered`: Shows fully rendered output (math, formatting, etc.)
 * - `raw`: Shows raw source with syntax highlighting
 * - `both`: Shows raw source and rendered output side by side
 *
 * @example Using in component
 * ```svelte
 * <MarkdownRenderer content={markdown} mode="rendered" />
 * ```
 */
export type MarkdownDisplayMode = 'rendered' | 'raw' | 'both';

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Props communes pour tous les composants de rendu de noeuds AST
 *
 * Generic interface for node renderer components. Each node type
 * will have a corresponding renderer component that accepts this interface.
 *
 * @typeParam T - The specific AST node type being rendered
 *
 * @example TextNode renderer
 * ```svelte
 * <script lang="ts">
 *   import type { NodeRendererProps, TextNode } from './types';
 *
 *   let { node, class: className }: NodeRendererProps<TextNode> = $props();
 * </script>
 *
 * <span class={className}>{node.content}</span>
 * ```
 */
export interface NodeRendererProps<T> {
	/** The AST node to render */
	node: T;
	/** Optional CSS class(es) to apply to the rendered element */
	class?: string;
}

/**
 * Options pour le MarkdownRenderer principal
 *
 * Configuration options for the main MarkdownRenderer component.
 * Controls parsing, rendering behavior, and event callbacks.
 *
 * @example Basic usage
 * ```svelte
 * <MarkdownRenderer
 *   content={markdown}
 *   options={{ mode: 'rendered' }}
 * />
 * ```
 *
 * @example With blank handling
 * ```svelte
 * <MarkdownRenderer
 *   content="Le resultat est {{blank:0}}"
 *   options={{
 *     mode: 'rendered',
 *     onBlankFound: (index, element) => {
 *       // Mount input component at element position
 *     }
 *   }}
 * />
 * ```
 */
export interface MarkdownRendererOptions {
	/**
	 * Mode d'affichage
	 * @default 'rendered'
	 */
	mode?: MarkdownDisplayMode;

	/**
	 * Options de parsing (passees au parser)
	 * Controls how markdown is parsed into AST
	 */
	parseOptions?: import('$lib/exercises/types').ParseOptions;

	/**
	 * Options de rendu
	 * Controls how AST is rendered to HTML
	 */
	renderOptions?: import('$lib/exercises/types').RenderOptions;

	/**
	 * Callback quand un {{blank:N}} est trouve
	 *
	 * Called during rendering when a blank placeholder is encountered.
	 * Use this to mount input components or track blank positions.
	 *
	 * @param index - The blank index (N in {{blank:N}})
	 * @param element - The DOM element where the blank should be rendered
	 */
	onBlankFound?: (index: number, element: HTMLElement) => void;

	/**
	 * Callback quand une variable non resolue {{var}} est trouvee
	 *
	 * Called when a variable reference is found that wasn't resolved
	 * during parameterization. Useful for debugging and error reporting.
	 *
	 * @param name - The variable name that wasn't resolved
	 */
	onUnresolvedVariable?: (name: string) => void;
}

// ============================================================================
// BLANK INPUT TYPES
// ============================================================================

/**
 * Etat d'un blank dans un exercice fill_in_blanks
 *
 * Represents the current state of a blank input field,
 * including its value, validation status, and focus state.
 *
 * @example Empty state
 * ```typescript
 * const blank: BlankState = {
 *   index: 0,
 *   value: '',
 *   isValid: null, // Not yet validated
 *   isFocused: false
 * };
 * ```
 *
 * @example Validated state
 * ```typescript
 * const blank: BlankState = {
 *   index: 1,
 *   value: '42',
 *   isValid: true, // Correct answer
 *   isFocused: false
 * };
 * ```
 */
export interface BlankState {
	/** Index du blank (0-based, corresponds to {{blank:N}}) */
	index: number;

	/** Valeur actuelle saisie par l'utilisateur */
	value: string;

	/**
	 * Etat de validation
	 * - `true`: Answer is correct
	 * - `false`: Answer is incorrect
	 * - `null`: Not yet validated
	 */
	isValid?: boolean | null;

	/** Whether this blank currently has focus */
	isFocused?: boolean;
}

/**
 * Props pour le composant BlankInput
 *
 * Configuration for individual blank input fields within
 * fill-in-the-blank exercises.
 *
 * @example Basic usage
 * ```svelte
 * <BlankInput
 *   index={0}
 *   value={blanks[0].value}
 *   onValueChange={(v) => blanks[0].value = v}
 * />
 * ```
 *
 * @example With validation
 * ```svelte
 * <BlankInput
 *   index={1}
 *   value={answer}
 *   validationState={isCorrect}
 *   disabled={isSubmitted}
 *   onSubmit={handleCheck}
 * />
 * ```
 */
export interface BlankInputProps {
	/** Index du blank (0-based) */
	index: number;

	/**
	 * Valeur actuelle
	 * @default ''
	 */
	value?: string;

	/**
	 * Whether input is disabled (e.g., after submission)
	 * @default false
	 */
	disabled?: boolean;

	/**
	 * Etat de validation visuel
	 * - `true`: Show as correct (green)
	 * - `false`: Show as incorrect (red)
	 * - `null`: Neutral state (no validation styling)
	 */
	validationState?: boolean | null;

	/**
	 * Callback when value changes
	 * @param value - The new input value
	 */
	onValueChange?: (value: string) => void;

	/**
	 * Callback when Enter is pressed (submission)
	 */
	onSubmit?: () => void;
}

// ============================================================================
// RAW MODE SYNTAX HIGHLIGHTING
// ============================================================================

/**
 * Configuration pour le syntax highlighting des variables dans raw mode
 *
 * Defines colors for different syntax elements when displaying
 * raw markdown source with variable syntax highlighting.
 *
 * @example Default configuration
 * ```typescript
 * const config: VariableHighlightConfig = {
 *   variableColor: '#3b82f6', // Blue for {{varName}}
 *   randomColor: '#8b5cf6',   // Purple for {{1-10}}
 *   evalColor: '#10b981',     // Green for {{eval:...}}
 *   blankColor: '#f59e0b'     // Orange for {{blank:N}}
 * };
 * ```
 *
 * @example Custom theme
 * ```svelte
 * <RawMarkdownViewer
 *   content={source}
 *   highlightConfig={{
 *     variableColor: 'var(--color-primary)',
 *     randomColor: 'var(--color-secondary)',
 *     evalColor: 'var(--color-success)',
 *     blankColor: 'var(--color-warning)'
 *   }}
 * />
 * ```
 */
export interface VariableHighlightConfig {
	/**
	 * Couleur pour les references de variables {{varName}}
	 * @default '#3b82f6' (blue-500)
	 */
	variableColor?: string;

	/**
	 * Couleur pour les expressions random {{1-10}}, {{2.3}}
	 * @default '#8b5cf6' (violet-500)
	 */
	randomColor?: string;

	/**
	 * Couleur pour les expressions eval {{eval:a+b}}
	 * @default '#10b981' (emerald-500)
	 */
	evalColor?: string;

	/**
	 * Couleur pour les blanks {{blank:N}}
	 * @default '#f59e0b' (amber-500)
	 */
	blankColor?: string;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default variable highlight configuration
 *
 * Uses Tailwind CSS color palette for consistent styling.
 * These colors are chosen for good contrast and accessibility.
 */
export const DEFAULT_HIGHLIGHT_CONFIG: Required<VariableHighlightConfig> = {
	variableColor: '#3b82f6', // blue-500
	randomColor: '#8b5cf6', // violet-500
	evalColor: '#10b981', // emerald-500
	blankColor: '#f59e0b' // amber-500
};

/**
 * Default renderer options
 *
 * Sensible defaults for most use cases.
 */
export const DEFAULT_RENDERER_OPTIONS: Required<
	Pick<MarkdownRendererOptions, 'mode' | 'parseOptions' | 'renderOptions'>
> = {
	mode: 'rendered',
	parseOptions: {
		parseMath: true,
		parseImages: true,
		parseTables: true,
		preserveWhitespace: false,
		baseImageUrl: ''
	},
	renderOptions: {
		showImages: true,
		baseImageUrl: '',
		className: '',
		useMathLive: true
	}
};
