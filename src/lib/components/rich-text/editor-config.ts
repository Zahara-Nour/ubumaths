/**
 * TipTap Editor Configuration Factory
 * =====================================
 *
 * Provides shared extension instances for TipTap editors.
 * CRITICAL: Extensions with ProseMirror plugins must be instantiated ONCE
 * at module level to avoid "duplicate keyed plugin" errors when multiple
 * editors exist on the same page.
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 */

import type { Extensions, EditorOptions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table, TableRow } from '@tiptap/extension-table';
import { CustomTableHeader, CustomTableCell } from '$lib/extensions/table-extension';
import { CustomImage } from '$lib/extensions/image-extension';
import { CustomLink } from '$lib/extensions/link-extension';
import { Video } from '$lib/extensions/video-extension';
import { MathInline, MathBlock } from '$lib/extensions/math-extension';
import {
	TemplateVariable,
	TemplateRandom,
	TemplateEval
} from '$lib/extensions/template-extensions';
import { BlankField } from '$lib/extensions/blank-extension';
import { Hashtag } from '$lib/extensions/hashtag-extension';
import { Mention } from '$lib/extensions/mention-extension';
import { MarkdownPaste } from './markdown-paste-extension';

// Note: Underline is included in StarterKit v3
// Link is disabled in StarterKit and replaced with CustomLink to preserve title attribute

/**
 * Module-level extension instances (singleton pattern)
 * ====================================================
 *
 * These are created ONCE and shared across all editor instances.
 * This prevents "duplicate keyed plugin" errors from extensions
 * that create ProseMirror plugins with PluginKeys (like Link).
 *
 * Each extension with a PluginKey MUST be instantiated only once
 * per page, otherwise ProseMirror throws:
 * "RangeError: Adding different instances of a keyed plugin"
 */

// Cache for extension instances by heading level config
const extensionsCache = new Map<string, Extensions>();

/**
 * Create a cache key from options
 * Updated cache key to invalidate old editor instances after markdown paste extension fixed
 */
function getCacheKey(headingLevels: number): string {
	return `h${headingLevels}-v19`; // v19: Added ImageNodeView for interactive editing
}

/**
 * Create TipTap editor extensions array (internal, uncached)
 */
function createExtensionsInternal(headingLevels: number): Extensions {
	// Build heading levels array [1, 2, 3, ...] up to headingLevels
	const levels = Array.from({ length: headingLevels }, (_, i) => i + 1) as (
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
	)[];

	return [
		// Core editing features (StarterKit v3 includes Link and Underline)
		StarterKit.configure({
			heading: {
				levels
			},
			// Disable StarterKit's Link - we use CustomLink to preserve title attribute
			link: false
			// Underline uses default configuration
		}),

		// Custom Link extension that preserves title attribute for roundtrip
		CustomLink.configure({
			openOnClick: false,
			HTMLAttributes: {
				class: 'text-primary underline cursor-pointer'
			}
		}),

		// Text formatting (NOT in StarterKit)
		TextStyle.configure({}),
		Color.configure({}),
		Highlight.configure({
			multicolor: true
		}),

		// Paragraph features
		TextAlign.configure({
			types: ['heading', 'paragraph']
		}),

		// Subscript and superscript
		Subscript.configure({}),
		Superscript.configure({}),

		// Task lists
		TaskList.configure({
			HTMLAttributes: {
				class: 'task-list'
			}
		}),
		TaskItem.configure({
			nested: true
		}),

		// Math formulas
		MathInline.configure({}),
		MathBlock.configure({}),

		// Template syntax
		TemplateVariable.configure({}),
		TemplateRandom.configure({}),
		TemplateEval.configure({}),
		BlankField.configure({}),

		// Social features
		Hashtag.configure({}),
		Mention.configure({}),

		// Markdown paste support - converts pasted Markdown to rich text
		MarkdownPaste.configure({ enabled: true }),

		// Images with extended attributes (sizeClass, widthPercent, alignment, caption)
		CustomImage.configure({
			inline: false,
			allowBase64: true
		}),

		// Videos with extended attributes (HTML5 and YouTube support)
		Video.configure({}),

		// Tables
		Table.configure({
			resizable: false,
			HTMLAttributes: {
				class: 'border-collapse border border-border my-4'
			}
		}),
		TableRow.configure({
			HTMLAttributes: {
				class: 'border-b border-border'
			}
		}),
		CustomTableHeader.configure({
			HTMLAttributes: {
				class: 'border border-border bg-muted px-3 py-2 text-left font-semibold'
			}
		}),
		CustomTableCell.configure({
			HTMLAttributes: {
				class: 'border border-border px-3 py-2'
			}
		})
	];
}

/**
 * Options for editor extensions configuration
 */
export interface EditorExtensionsOptions {
	/** Heading levels to enable (1-6). Default: 6 (all levels) */
	headingLevels?: number;
}

/**
 * Get TipTap editor extensions array (cached singleton)
 *
 * IMPORTANT: Returns the SAME extension instances for the same options.
 * This is required to avoid "duplicate keyed plugin" errors when
 * multiple editors exist on the same page.
 *
 * @param options - Configuration options
 * @returns Array of TipTap extensions (cached)
 */
export function createEditorExtensions(options: EditorExtensionsOptions = {}): Extensions {
	const { headingLevels = 6 } = options;
	const cacheKey = getCacheKey(headingLevels);

	// Return cached instance if it exists
	let extensions = extensionsCache.get(cacheKey);
	if (!extensions) {
		// Create new instance and cache it
		extensions = createExtensionsInternal(headingLevels);
		extensionsCache.set(cacheKey, extensions);
	}

	return extensions;
}

/**
 * Options for editor props configuration
 */
export interface EditorPropsOptions {
	/** Minimum height CSS value. Default: '100px' */
	minHeight?: string;
}

/**
 * Get editor props object for TipTap editor
 *
 * @param options - Configuration options
 * @returns Editor props object
 */
export function getEditorProps(options: EditorPropsOptions = {}): EditorOptions['editorProps'] {
	const { minHeight = '100px' } = options;

	return {
		attributes: {
			class: 'prose prose-sm max-w-none focus:outline-none p-3',
			style: `min-height: ${minHeight}`
		}
	};
}
