<!--
	CodeBlock Component
	===================

	Renders a fenced code block with:
	- Preserved formatting and whitespace
	- Optional language tag display
	- Muted background styling
	- XSS protection via HTML escaping
	- Coloration syntaxique des langages connus (`utils/code-highlight.ts`), une
	  fois dans le navigateur : le rendu serveur et le premier affichage restent
	  en texte brut (un `{@html}` n'est pas corrigé à l'hydratation)

	@see types.ts CodeBlockNode for the AST node type
-->
<script lang="ts">
	import { escapeHtml } from '../utils';
	import { highlightCode } from '../utils/code-highlight';

	interface Props {
		code: string;
		language?: string;
		class?: string;
	}

	let { code, language = undefined, class: className = '' }: Props = $props();

	// Escaped code for safe rendering
	let escapedCode = $derived(escapeHtml(code));

	// HTML coloré, null tant qu'il n'est pas prêt ou quand le langage n'est pas coloré
	let highlighted = $state<string | null>(null);

	let displayedCode = $derived(highlighted ?? escapedCode);

	$effect(() => {
		const source = code;
		const sourceLanguage = language;
		let cancelled = false;
		// L'ancienne coloration reste affichée jusqu'à la nouvelle : pas de
		// clignotement en texte brut pendant une édition en direct
		highlightCode(source, sourceLanguage)
			.then((html) => {
				if (!cancelled) highlighted = html;
			})
			.catch(() => {
				// Morceau de highlight.js introuvable (réseau) : texte brut, jamais l'ancien code
				if (!cancelled) highlighted = null;
			});
		return () => {
			cancelled = true;
		};
	});
</script>

<div class="my-4 {className}">
	{#if language}
		<div
			class="rounded-t-md border border-b-0 border-border bg-muted/80 px-4 py-1 text-xs text-muted-foreground"
		>
			{language}
		</div>
		<pre class="overflow-x-auto rounded-b-md border border-border bg-muted p-4"><code
				class="font-mono text-sm text-foreground">{@html displayedCode}</code
			></pre>
	{:else}
		<pre class="overflow-x-auto rounded-md border border-border bg-muted p-4"><code
				class="font-mono text-sm text-foreground">{@html displayedCode}</code
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

	/* Couleurs de la coloration, dans les deux thèmes (light-dark suit color-scheme) */
	code :global(.hljs-keyword),
	code :global(.hljs-meta),
	code :global(.hljs-selector-tag) {
		color: light-dark(#cf222e, #ff7b72);
	}

	code :global(.hljs-built_in),
	code :global(.hljs-title),
	code :global(.hljs-section) {
		color: light-dark(#8250df, #d2a8ff);
	}

	code :global(.hljs-string),
	code :global(.hljs-regexp) {
		color: light-dark(#0a3069, #a5d6ff);
	}

	code :global(.hljs-number),
	code :global(.hljs-literal),
	code :global(.hljs-symbol) {
		color: light-dark(#0550ae, #79c0ff);
	}

	code :global(.hljs-params),
	code :global(.hljs-variable),
	code :global(.hljs-attr),
	code :global(.hljs-attribute),
	code :global(.hljs-name) {
		color: light-dark(#953800, #ffa657);
	}

	code :global(.hljs-comment),
	code :global(.hljs-quote) {
		color: light-dark(#59636e, #8b949e);
		font-style: italic;
	}
</style>
