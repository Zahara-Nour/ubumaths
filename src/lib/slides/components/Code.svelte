<script lang="ts">
	/**
	 * Code - Syntax highlighted code block for slides
	 *
	 * Features:
	 * - Syntax highlighting via highlight.js
	 * - Optional line numbers
	 * - Line highlighting (data-line-numbers="1,4-6")
	 * - Animated line reveals (fragments)
	 * - Dark theme optimized for presentations
	 *
	 * Usage:
	 * <Code language="typescript" lineNumbers>
	 *   const x = 1;
	 * </Code>
	 *
	 * With line highlighting:
	 * <Code language="js" lineNumbers highlightLines="2,4-6">
	 *   line 1
	 *   line 2 (highlighted)
	 *   line 3
	 *   lines 4-6 (highlighted)
	 * </Code>
	 *
	 * With animated steps (like reveal.js):
	 * <Code language="js" lineNumbers animateLines="|1-2|3|4-5">
	 *   // First: show all
	 *   // Then: highlight 1-2
	 *   // Then: highlight 3
	 *   // Then: highlight 4-5
	 * </Code>
	 */

	import { onMount, getContext } from 'svelte';
	import { browser } from '$app/environment';
	import { DECK_CONTEXT_KEY } from '../core/context.js';
	import type { DeckStore } from '../stores/deckStore.svelte.js';

	interface Props {
		/** Programming language for syntax highlighting */
		language?: string;
		/** Show line numbers */
		lineNumbers?: boolean;
		/** Lines to highlight (e.g., "1,4-6,10") */
		highlightLines?: string;
		/** Animated line steps separated by | (e.g., "|1-2|3-4|5") */
		animateLines?: string;
		/** Starting line number (default: 1) */
		startLine?: number;
		/** Additional CSS classes */
		class?: string;
		/** Code content */
		children: import('svelte').Snippet;
	}

	let {
		language,
		lineNumbers = false,
		highlightLines,
		animateLines,
		startLine = 1,
		class: className,
		children
	}: Props = $props();

	// Get deck context for fragment coordination
	const deckContext = getContext<{ getStore: () => DeckStore } | undefined>(DECK_CONTEXT_KEY);
	const deckStore = deckContext?.getStore();

	let codeElement: HTMLElement | undefined = $state();
	let rawCode = $state('');
	let highlightedCode = $state('');
	let lines = $derived(rawCode.split('\n'));
	let isLoaded = $state(false);

	// Parse highlight steps from animateLines
	const highlightSteps = $derived.by(() => {
		if (!animateLines) return [];
		return animateLines.split('|').filter((s) => s.length > 0);
	});

	// Current step based on fragment index (for animated reveals)
	const currentStep = $derived.by(() => {
		if (!animateLines || !deckStore) return -1;
		// Fragment index corresponds to step index
		return deckStore.f;
	});

	// Current lines to highlight
	const activeHighlightLines = $derived.by(() => {
		if (animateLines && currentStep >= 0 && currentStep < highlightSteps.length) {
			return highlightSteps[currentStep];
		}
		return highlightLines ?? '';
	});

	// Parse line ranges (e.g., "1,4-6,10" -> Set of line numbers)
	function parseLineNumbers(spec: string): Set<number> {
		const result = new Set<number>();
		if (!spec) return result;

		const parts = spec.split(',');
		for (const part of parts) {
			const trimmed = part.trim();
			if (trimmed.includes('-')) {
				const [start, end] = trimmed.split('-').map(Number);
				for (let i = start; i <= end; i++) {
					result.add(i);
				}
			} else {
				result.add(Number(trimmed));
			}
		}
		return result;
	}

	// Check if a line should be highlighted
	function isLineHighlighted(lineNum: number): boolean {
		const highlighted = parseLineNumbers(activeHighlightLines);
		return highlighted.has(lineNum);
	}

	// Check if we have active highlighting (dims non-highlighted lines)
	const hasActiveHighlight = $derived(activeHighlightLines.length > 0);

	async function highlightCode(): Promise<void> {
		if (!browser || !rawCode) return;

		try {
			const hljs = (await import('highlight.js')).default;

			if (language && hljs.getLanguage(language)) {
				highlightedCode = hljs.highlight(rawCode, { language }).value;
			} else {
				highlightedCode = hljs.highlightAuto(rawCode).value;
			}
			isLoaded = true;
		} catch (error) {
			console.error('[Code] Highlight error:', error);
			// Fallback to plain text
			highlightedCode = rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			isLoaded = true;
		}
	}

	// Extract raw code from the snippet
	function extractCode(element: HTMLElement): string {
		// Get text content, preserving whitespace
		const text = element.textContent ?? '';
		// Trim leading/trailing newlines but preserve internal whitespace
		return text.replace(/^\n+|\n+$/g, '');
	}

	onMount(() => {
		if (codeElement) {
			rawCode = extractCode(codeElement);
			highlightCode();
		}
	});
</script>

<!-- Hidden element to capture snippet content -->
<div bind:this={codeElement} style="display: none;">
	{@render children()}
</div>

<div class="code-block {className ?? ''}">
	<pre class="code-pre" class:line-numbers={lineNumbers}><code
			class="hljs {language ? `language-${language}` : ''}"
			>{#if isLoaded}{#each lines as _, i (i)}{@const lineNum =
						i + startLine}{@const isHighlighted = isLineHighlighted(lineNum)}<span
						class="code-line"
						class:highlighted={isHighlighted}
						class:dimmed={hasActiveHighlight && !isHighlighted}
						>{#if lineNumbers}<span class="line-number">{lineNum}</span>{/if}<span
							class="line-content">{@html highlightedCode.split('\n')[i] ?? ''}</span
						></span
					>{#if i < lines.length - 1}{/if}{/each}{:else}<span class="loading">Loading...</span
				>{/if}</code
		></pre>
</div>

{#if animateLines}
	<!-- Create fragment placeholders for animation steps -->
	{#each highlightSteps as step, i (i)}
		<span class="fragment" data-fragment-index={i} data-step={step} style="display: none;"></span>
	{/each}
{/if}

<style>
	.code-block {
		width: 100%;
		max-width: 100%;
		margin: 1rem 0;
		border-radius: 0.5rem;
		overflow: hidden;
		background: #282c34;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.code-pre {
		margin: 0;
		padding: 1rem;
		overflow-x: auto;
		font-size: 0.9em;
		line-height: 1.5;
		tab-size: 4;
	}

	.code-pre.line-numbers {
		padding-left: 0;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono',
			monospace;
		display: block;
	}

	.code-line {
		display: block;
		padding: 0 1rem;
		transition:
			opacity 0.3s ease,
			background-color 0.3s ease;
	}

	.line-numbers .code-line {
		padding-left: 0;
	}

	.code-line.highlighted {
		background: rgba(255, 255, 255, 0.1);
	}

	.code-line.dimmed {
		opacity: 0.4;
	}

	.line-number {
		display: inline-block;
		width: 3rem;
		padding-right: 1rem;
		text-align: right;
		color: #636d83;
		user-select: none;
		border-right: 1px solid #3e4451;
		margin-right: 1rem;
	}

	.line-content {
		white-space: pre;
	}

	.loading {
		color: #636d83;
		font-style: italic;
	}

	/* Highlight.js One Dark theme tokens */
	:global(.code-block .hljs-comment),
	:global(.code-block .hljs-quote) {
		color: #5c6370;
		font-style: italic;
	}

	:global(.code-block .hljs-doctag),
	:global(.code-block .hljs-keyword),
	:global(.code-block .hljs-formula) {
		color: #c678dd;
	}

	:global(.code-block .hljs-section),
	:global(.code-block .hljs-name),
	:global(.code-block .hljs-selector-tag),
	:global(.code-block .hljs-deletion),
	:global(.code-block .hljs-subst) {
		color: #e06c75;
	}

	:global(.code-block .hljs-literal) {
		color: #56b6c2;
	}

	:global(.code-block .hljs-string),
	:global(.code-block .hljs-regexp),
	:global(.code-block .hljs-addition),
	:global(.code-block .hljs-attribute),
	:global(.code-block .hljs-meta .hljs-string) {
		color: #98c379;
	}

	:global(.code-block .hljs-attr),
	:global(.code-block .hljs-variable),
	:global(.code-block .hljs-template-variable),
	:global(.code-block .hljs-type),
	:global(.code-block .hljs-selector-class),
	:global(.code-block .hljs-selector-attr),
	:global(.code-block .hljs-selector-pseudo),
	:global(.code-block .hljs-number) {
		color: #d19a66;
	}

	:global(.code-block .hljs-symbol),
	:global(.code-block .hljs-bullet),
	:global(.code-block .hljs-link),
	:global(.code-block .hljs-meta),
	:global(.code-block .hljs-selector-id),
	:global(.code-block .hljs-title) {
		color: #61aeee;
	}

	:global(.code-block .hljs-built_in),
	:global(.code-block .hljs-title.class_),
	:global(.code-block .hljs-class .hljs-title) {
		color: #e6c07b;
	}

	:global(.code-block .hljs-emphasis) {
		font-style: italic;
	}

	:global(.code-block .hljs-strong) {
		font-weight: bold;
	}

	:global(.code-block .hljs-link) {
		text-decoration: underline;
	}
</style>
