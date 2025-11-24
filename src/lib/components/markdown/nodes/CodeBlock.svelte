<!--
	CodeBlock Component
	===================

	Renders a fenced code block with:
	- Preserved formatting and whitespace
	- Optional language tag display
	- Muted background styling
	- XSS protection via HTML escaping

	@see types.ts CodeBlockNode for the AST node type
-->
<script lang="ts">
	import { escapeHtml } from '../utils';

	interface Props {
		code: string;
		language?: string;
		class?: string;
	}

	let { code, language = undefined, class: className = '' }: Props = $props();

	// Escaped code for safe rendering
	let escapedCode = $derived(escapeHtml(code));
</script>

<div class="my-4 {className}">
	{#if language}
		<div
			class="rounded-t-md border border-b-0 border-border bg-muted/80 px-4 py-1 text-xs text-muted-foreground"
		>
			{language}
		</div>
		<pre class="overflow-x-auto rounded-b-md border border-border bg-muted p-4"><code
				class="font-mono text-sm text-foreground">{@html escapedCode}</code
			></pre>
	{:else}
		<pre class="overflow-x-auto rounded-md border border-border bg-muted p-4"><code
				class="font-mono text-sm text-foreground">{@html escapedCode}</code
			></pre>
	{/if}
</div>

<style>
	pre {
		white-space: pre;
		word-wrap: normal;
	}

	code {
		white-space: pre;
	}
</style>
