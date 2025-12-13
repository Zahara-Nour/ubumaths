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
 * Props for unified rich text editor component
 */
export interface RichTextEditorProps {
	/** Editor mode (chat or form) */
	mode?: RichTextMode;
	/** HTML content value */
	value?: string;
	/** JSON content value (TipTap format) */
	jsonValue?: unknown;
	/** Send callback (chat mode only) */
	onSend?: (content: unknown) => void;
	/** Math template level */
	mathTemplates?: MathTemplateLevel;
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
