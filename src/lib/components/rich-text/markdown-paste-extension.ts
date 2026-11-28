/**
 * Markdown Paste Extension for TipTap
 * ====================================
 *
 * A TipTap extension that intercepts paste events and converts
 * Markdown content to rich text format before inserting.
 *
 * Features:
 * - Detects Markdown patterns in pasted plain text
 * - Converts Markdown to TipTap JSON using markdownToTipTap()
 * - Preserves native HTML paste behavior (from rich text copies) : un HTML
 *   riche joint au texte part au collage natif (isTrivialHtmlWrapper)
 * - Supports all Chiphre Markdown features (math, templates, etc.)
 *
 * @module rich-text/markdown-paste-extension
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { containsMarkdownSyntax } from './markdown-detection';
import { markdownToTipTap } from './markdown-import';

/**
 * Le HTML collé est-il une simple enveloppe, sans mise en forme à garder ?
 *
 * Beaucoup d'applications (éditeurs de code, navigateurs) joignent au texte
 * copié un HTML qui ne fait qu'envelopper le texte : `<pre>`, `<div>` coloré
 * d'un éditeur de code, `<meta charset>`. Ce HTML-là n'apporte rien ; le texte
 * brut, lu comme du markdown, donne un meilleur résultat.
 *
 * Est « riche » (donc PAS une enveloppe) un HTML qui porte une mise en forme
 * que l'éditeur sait garder : gras, italique, souligné, listes, titres, liens,
 * tableaux, images… en balise, ou en style pour le gras et l'italique (Google
 * Docs). Les couleurs, polices et classes seules ne comptent pas : ce sont
 * celles d'un éditeur de code, ou d'un paragraphe Word sans mise en forme.
 *
 * Exemples d'enveloppes : `<pre>texte</pre>`, `<div style="color:#d4d4d4">- a</div>`.
 * Exemples de HTML riche : `<p><strong>gras</strong></p>`, `<ul><li>a</li></ul>`.
 */
export function isTrivialHtmlWrapper(html: string): boolean {
	const trimmed = html.trim();
	if (!trimmed) return true;

	// Éditeur de code (police à chasse fixe) : ses gras et italiques sont ceux de
	// la coloration syntaxique (commentaires, mots-clés), pas une mise en forme.
	if (
		/font-family\s*:[^;"']*(monospace|menlo|consolas|monaco|courier|fira code|jetbrains)/i.test(
			trimmed
		)
	) {
		return true;
	}

	const richFormattingPatterns = [
		// Mise en forme en ligne
		/<(strong|b|em|i|u|s|strike|del|mark|sub|sup)\b/i,
		// Liens (`<a` suivi d'un attribut)
		/<a\s/i,
		// Blocs mis en forme
		/<(h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|td|th)\b/i,
		// Médias
		/<(img|video|audio|iframe|figure|figcaption)\b/i,
		// Gras, italique ou souligné donnés par un style
		/font-weight\s*:\s*(bold|[6-9]00)/i,
		/font-style\s*:\s*italic/i,
		/text-decoration[a-z-]*\s*:\s*[^;"']*underline/i
	];

	return !richFormattingPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Le collage doit-il passer par le markdown (V118) ?
 *
 * Oui seulement si le texte brut contient du markdown ET que le HTML joint,
 * s'il y en a un, n'est qu'une enveloppe. Un HTML riche (liste en gras copiée
 * de Word, d'une page web) part au collage natif, qui garde sa mise en forme.
 */
export function shouldConvertMarkdownPaste(plainText: string, html: string): boolean {
	if (!plainText || plainText.trim().length === 0) return false;
	if (!containsMarkdownSyntax(plainText)) return false;
	return isTrivialHtmlWrapper(html);
}

/**
 * Normalize Markdown indentation by removing common leading whitespace
 * from all lines. This handles cases where text is copied with extra
 * indentation that would break Markdown parsing.
 *
 * Example:
 *   "  # Title\n  - Item 1\n  - Item 2"
 * becomes:
 *   "# Title\n- Item 1\n- Item 2"
 */
export function normalizeMarkdownIndentation(text: string): string {
	const lines = text.split('\n');

	// Find the minimum indentation (ignoring empty lines)
	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim().length === 0) continue; // Skip empty lines
		const match = line.match(/^(\s*)/);
		if (match) {
			minIndent = Math.min(minIndent, match[1].length);
		}
	}

	// If no indentation found or it's 0, return as-is
	if (minIndent === Infinity || minIndent === 0) {
		return text;
	}

	// Remove the common indentation from all lines
	return lines.map((line) => line.slice(minIndent)).join('\n');
}

/**
 * Plugin key for the markdown paste handler
 */
const markdownPastePluginKey = new PluginKey('markdownPaste');

/**
 * Configuration options for the MarkdownPaste extension
 */
export interface MarkdownPasteOptions {
	/**
	 * Whether the extension is enabled
	 * @default true
	 */
	enabled: boolean;
}

/**
 * MarkdownPaste Extension
 *
 * Intercepts paste events and converts Markdown content to rich text.
 * Uses TipTap's insertContent API for reliable JSON-to-node conversion.
 *
 * @example
 * ```typescript
 * import { MarkdownPaste } from './markdown-paste-extension';
 *
 * const editor = new Editor({
 *   extensions: [
 *     // ... other extensions
 *     MarkdownPaste.configure({ enabled: true }),
 *   ],
 * });
 * ```
 */
export const MarkdownPaste = Extension.create<MarkdownPasteOptions>({
	name: 'markdownPaste',

	addOptions() {
		return {
			enabled: true
		};
	},

	addProseMirrorPlugins() {
		const { enabled } = this.options;
		// Store reference to TipTap editor for insertContent
		const editor = this.editor;

		if (!enabled) {
			return [];
		}

		return [
			new Plugin({
				key: markdownPastePluginKey,

				props: {
					handlePaste: (_view, event) => {
						// Only process paste events with clipboard data
						const clipboardData = event.clipboardData;
						if (!clipboardData) {
							return false;
						}

						// Get plain text content
						const plainText = clipboardData.getData('text/plain');
						const html = clipboardData.getData('text/html');

						// HTML riche ou texte sans markdown : collage natif
						if (!shouldConvertMarkdownPaste(plainText, html)) {
							return false;
						}

						// Normalize Markdown: remove common leading whitespace from all lines
						// This handles cases where text is copied with extra indentation
						// while preserving relative indentation for nested lists
						const normalizedText = normalizeMarkdownIndentation(plainText);

						// Convert Markdown to TipTap JSON
						const json = markdownToTipTap(normalizedText);

						// Only process if we got valid content
						if (!json.content || json.content.length === 0) {
							return false;
						}

						// Prevent default paste behavior
						event.preventDefault();

						// Use TipTap's insertContent which handles JSON conversion properly
						// This ensures all node types (lists, math, templates) are created correctly
						editor.commands.insertContent(json.content);

						return true;
					}
				}
			})
		];
	}
});

export default MarkdownPaste;
