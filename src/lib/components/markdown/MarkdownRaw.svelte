<script lang="ts">
	/**
	 * MarkdownRaw Component
	 * =====================
	 *
	 * Displays raw markdown source with syntax highlighting for special elements:
	 * - Variables: {{varName}}
	 * - Random: {{1..10}}, {{random:1..10}}
	 * - Eval: {{eval:a+b}}
	 * - Blanks: {{blank:N}}
	 * - LaTeX: $...$ and $$...$$
	 *
	 * @example Basic usage
	 * ```svelte
	 * <MarkdownRaw content="Calculate $x^2$ where x = {{a}}" />
	 * ```
	 *
	 * @example With click handler
	 * ```svelte
	 * <MarkdownRaw
	 *   content="{{blank:0}} + {{blank:1}} = {{eval:a+b}}"
	 *   onVariableClick={(name) => console.log('Clicked:', name)}
	 * />
	 * ```
	 */

	import type { VariableHighlightConfig } from './types';
	import { DEFAULT_HIGHLIGHT_CONFIG } from './types';
	import { escapeHtml } from './utils';

	// Types
	interface Props {
		/** Contenu markdown brut */
		content: string;

		/** Configuration des couleurs de highlighting */
		highlightConfig?: VariableHighlightConfig;

		/** Classes CSS additionnelles */
		class?: string;

		/** Callback quand on clique sur une variable */
		onVariableClick?: (name: string) => void;
	}

	// Props
	let { content, highlightConfig = {}, class: className = '', onVariableClick }: Props = $props();

	// Merge with default config
	let config = $derived({ ...DEFAULT_HIGHLIGHT_CONFIG, ...highlightConfig });

	// Highlighted content (HTML string)
	let highlightedContent = $derived(highlightContent(content, config));

	/**
	 * Apply syntax highlighting to markdown content
	 *
	 * Order of operations is important:
	 * 1. Escape HTML first (XSS protection)
	 * 2. Highlight blanks (most specific)
	 * 3. Highlight eval expressions
	 * 4. Highlight random expressions
	 * 5. Highlight remaining variables (least specific)
	 * 6. Highlight LaTeX (separate from {{}} syntax)
	 */
	function highlightContent(text: string, cfg: Required<VariableHighlightConfig>): string {
		let result = text;

		// Step 1: Escape HTML first (XSS protection)
		result = escapeHtml(result);

		// Step 2: Highlight blanks: {{blank:N}}
		result = result.replace(
			/\{\{blank:(\d+)\}\}/g,
			`<span class="variable-highlight blank" style="color: ${cfg.blankColor}" data-type="blank" data-value="$1">{{blank:$1}}</span>`
		);

		// Step 3: Highlight eval: {{eval:...}}
		result = result.replace(
			/\{\{eval:([^}]+)\}\}/g,
			`<span class="variable-highlight eval" style="color: ${cfg.evalColor}" data-type="eval" data-value="$1">{{eval:$1}}</span>`
		);

		// Step 4: Highlight random expressions
		// Matches: {{random:N-M}}, {{random:N-M:step}}, {{N-M}}, {{N-M:step}}, {{N-M!exclude}}
		// Pattern breakdown:
		// - (random:)? - optional "random:" prefix
		// - (\d+(?:\.\d+)?) - start number (integer or decimal)
		// - - - literal dash
		// - (\d+(?:\.\d+)?) - end number
		// - (?::(\d+(?:\.\d+)?))? - optional step
		// - (?:!([^}]*))? - optional exclusion list
		result = result.replace(
			/\{\{(random:)?(\d+(?:\.\d+)?-\d+(?:\.\d+)?(?::\d+(?:\.\d+)?)?(?:![^}]*)?)\}\}/g,
			`<span class="variable-highlight random" style="color: ${cfg.randomColor}" data-type="random" data-value="$1$2">{{$1$2}}</span>`
		);

		// Step 5: Highlight remaining variables: {{varName}}
		// Must come after other patterns to avoid matching already highlighted content
		result = result.replace(
			/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,
			`<span class="variable-highlight var" style="color: ${cfg.variableColor}" data-type="variable" data-value="$1">{{$1}}</span>`
		);

		// Step 6: Highlight LaTeX block math: $$...$$
		// Must come before inline math to avoid conflicts
		result = result.replace(
			/\$\$([^$]+)\$\$/g,
			'<span class="latex-highlight block">$$$1$$</span>'
		);

		// Step 7: Highlight LaTeX inline math: $...$
		// Avoid matching empty $$ or already processed $$...$$
		result = result.replace(/\$([^$]+)\$/g, '<span class="latex-highlight inline">$$$1$</span>');

		return result;
	}

	/**
	 * Handle click events on highlighted elements
	 * Extracts the variable name/value from data attributes
	 */
	function handleClick(event: MouseEvent) {
		if (!onVariableClick) return;

		const target = event.target as HTMLElement;
		if (target.classList.contains('variable-highlight')) {
			const value = target.dataset.value;
			if (value) {
				onVariableClick(value);
			}
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<pre class="markdown-raw {className}" onclick={handleClick}>
  <code>{@html highlightedContent}</code>
</pre>

<style>
	.markdown-raw {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0;
	}

	.markdown-raw code {
		white-space: pre-wrap;
		word-break: break-word;
	}

	:global(.variable-highlight) {
		font-weight: 600;
		border-radius: 0.25rem;
		padding: 0 0.25rem;
		background: hsl(var(--muted) / 0.5);
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			transform 0.1s ease;
	}

	:global(.variable-highlight:hover) {
		background: hsl(var(--accent));
		transform: scale(1.02);
	}

	:global(.latex-highlight) {
		color: hsl(var(--primary));
		font-style: italic;
	}

	:global(.latex-highlight.block) {
		display: block;
		text-align: center;
		margin: 0.5rem 0;
		padding: 0.25rem 0;
	}

	:global(.latex-highlight.inline) {
		padding: 0 0.125rem;
	}
</style>
