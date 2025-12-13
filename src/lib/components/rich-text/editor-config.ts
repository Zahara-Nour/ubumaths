/**
 * TipTap Editor Configuration Factory
 * =====================================
 *
 * Factory functions for creating TipTap editor extensions and props.
 * Ensures consistent editor behavior across components.
 */

import type { Extensions, EditorOptions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { MathInline, MathBlock } from '$lib/extensions/math-extension';

/**
 * Options for editor extensions configuration
 */
export interface EditorExtensionsOptions {
	/** Heading levels to enable (1-6). Default: 6 (all levels) */
	headingLevels?: number;
}

/**
 * Create TipTap editor extensions array
 *
 * @param options - Configuration options
 * @returns Array of TipTap extensions
 */
export function createEditorExtensions(options: EditorExtensionsOptions = {}): Extensions {
	const { headingLevels = 6 } = options;

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
		// Core editing features
		// Disable built-in link (if any) since we configure it separately
		StarterKit.configure({
			heading: {
				levels
			}
		}),

		// Text formatting (NOT in StarterKit)
		Underline,
		TextStyle,
		Color,
		Highlight.configure({
			multicolor: true
		}),

		// Paragraph features
		TextAlign.configure({
			types: ['heading', 'paragraph']
		}),

		// Links
		Link.configure({
			openOnClick: false,
			HTMLAttributes: {
				class: 'text-primary underline cursor-pointer'
			}
		}),

		// Subscript and superscript
		Subscript,
		Superscript,

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
		MathInline,
		MathBlock
	];
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
