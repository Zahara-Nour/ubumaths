/**
 * Rich Text Editor Types
 * ======================
 *
 * TypeScript type definitions for the rich text editor components.
 */

/**
 * Editor mode - determines UI/UX behavior
 */
export type RichTextMode = 'chat' | 'form';

/**
 * Math template level - controls which templates are available
 */
export type MathTemplateLevel = 'full' | 'basic' | 'none';

/**
 * Editor preset - predefined configurations for common use cases
 */
export type EditorPreset = 'minimal' | 'standard' | 'full';

/**
 * Preset configuration structure
 */
export interface PresetConfig {
	toolbar: ToolbarConfig;
	mathTemplates: MathTemplateLevel;
}

/**
 * Toolbar section configuration
 * Controls which sections are visible in the toolbar
 */
export interface ToolbarConfig {
	/** Text formatting: Bold, Italic, Underline, Strike, Code, Subscript, Superscript */
	text?: boolean;
	/** Paragraph formatting: Headings H1-H6, Text alignment */
	paragraph?: boolean;
	/** Insertion tools: Lists, Colors, Highlight, Links, Emojis */
	insertion?: boolean;
	/** Formula tools: Math templates, empty formula, block formula */
	formula?: boolean;
	/** Template tools: Variable, Random, Eval, BlankField */
	templates?: boolean;
	/** Advanced tools: Blockquote, Code block, Horizontal rule */
	more?: boolean;
	/** Preview toggle: Show/hide markdown preview panel */
	preview?: boolean;
	/** Fullscreen toggle: Enter/exit fullscreen mode */
	fullscreen?: boolean;
}

/**
 * Props for unified rich text editor component
 */
export interface RichTextEditorProps {
	/** Editor mode (chat or form) */
	mode?: RichTextMode;
	/** HTML content value */
	htmlValue?: string;
	/** JSON content value (TipTap format) */
	jsonValue?: unknown;
	/** Markdown content value (bindable, reactive) */
	markdownValue?: string;
	/** Send callback (chat mode only) */
	onSend?: (content: unknown) => void;
	/** Math template level */
	mathTemplates?: MathTemplateLevel;
	/** Toolbar sections visibility configuration */
	toolbar?: ToolbarConfig;
	/** Show send button (chat mode) */
	showSendButton?: boolean;
	/** Show clear button */
	showClearButton?: boolean;
	/** Minimum height of editor */
	minHeight?: string;
	/** Disable editor */
	disabled?: boolean;
}

/**
 * Text color definition
 */
export interface TextColor {
	name: string;
	value: string;
}

/**
 * Highlight color definition
 */
export interface HighlightColor {
	name: string;
	value: string | null;
}

/**
 * Math template definition
 */
export interface MathTemplate {
	label: string;
	latex: string;
	icon: string;
	title: string;
}

/**
 * Emoji category definition
 */
export interface EmojiCategory {
	name: string;
	emojis: string[];
}

/**
 * Image upload configuration for RichTextEditor
 * Enables image upload functionality when provided
 */
export interface ImageUploadConfig {
	/** Upload function - receives file, returns URL or error */
	uploadFn: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
}
