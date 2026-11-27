<script lang="ts">
	/**
	 * CodeEditor — éditeur CodeMirror 6 modifiable, chargé à la demande.
	 *
	 * Un seul exemplaire pour le texte brut (LaTeX de `/dev/latex-vers-ubumark`) et le
	 * markdown (mode markdown brut de `RichTextEditor`) : avant, deux copies presque
	 * identiques (`LaTeXEditor`, `MarkdownCodeEditor`).
	 *
	 * - `language="markdown"` : coloration markdown, fermeture des crochets,
	 *   indentation automatique.
	 * - `height` donné : boîte bordée de cette hauteur ; sinon l'éditeur remplit son parent.
	 * - Thème sombre (oneDark), numéros de ligne, crochets appariés.
	 * - Si CodeMirror ne se charge pas : simple zone de texte.
	 *
	 * Lecture seule : `CodeViewer.svelte`.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/env';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';

	interface Props {
		value?: string;
		disabled?: boolean;
		fontSize?: number;
		height?: string;
		placeholder?: string;
		lineWrapping?: boolean;
		language?: 'plain' | 'markdown';
		ariaLabel?: string;
	}

	let {
		value = $bindable(''),
		disabled = false,
		fontSize = 14,
		height,
		placeholder = '',
		lineWrapping = false,
		language = 'plain',
		ariaLabel = 'Éditeur de code'
	}: Props = $props();

	let editorContainer: HTMLDivElement | null = $state(null);
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	function updateValue(newValue: string): void {
		if (value !== newValue) {
			value = newValue;
		}
	}

	/** Extensions propres au markdown, chargées seulement pour lui */
	async function loadMarkdownExtensions(): Promise<Extension[]> {
		const [{ markdown }, { indentOnInput }, { closeBrackets, closeBracketsKeymap }, { keymap }] =
			await Promise.all([
				import('@codemirror/lang-markdown'),
				import('@codemirror/language'),
				import('@codemirror/autocomplete'),
				import('@codemirror/view')
			]);
		return [closeBrackets(), indentOnInput(), markdown(), keymap.of(closeBracketsKeymap)];
	}

	async function initEditor(): Promise<void> {
		if (!browser || !editorContainer) return;

		try {
			isLoading = true;
			loadError = null;

			const [
				{
					EditorView,
					keymap,
					lineNumbers,
					highlightActiveLineGutter,
					highlightActiveLine,
					placeholder: placeholderExt
				},
				{ EditorState },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching },
				{ history, defaultKeymap, historyKeymap },
				{ oneDark },
				languageExtensions
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/language'),
				import('@codemirror/commands'),
				import('@codemirror/theme-one-dark'),
				language === 'markdown' ? loadMarkdownExtensions() : Promise.resolve([])
			]);

			const wrap = lineWrapping || language === 'markdown';

			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				bracketMatching(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				...languageExtensions,
				keymap.of([...defaultKeymap, ...historyKeymap]),
				...(placeholder ? [placeholderExt(placeholder)] : []),
				...(wrap ? [EditorView.lineWrapping] : []),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						updateValue(update.state.doc.toString());
					}
				}),
				EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
				EditorState.readOnly.of(disabled),
				oneDark,
				EditorView.theme({
					'&': {
						height: '100%',
						fontSize: `${fontSize}px`
					},
					'.cm-scroller': {
						overflow: 'auto',
						fontFamily:
							'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
					},
					'.cm-content': {
						padding: '16px 0'
					},
					'.cm-gutters': {
						backgroundColor: 'transparent',
						borderRight: 'none'
					},
					'.cm-activeLineGutter': {
						backgroundColor: 'transparent'
					}
				})
			];

			editor = new EditorView({
				state: EditorState.create({ doc: value, extensions }),
				parent: editorContainer
			});

			isLoading = false;
		} catch (error) {
			console.error('[CodeEditor] Failed to load CodeMirror:', error);
			loadError = error instanceof Error ? error.message : "Échec du chargement de l'éditeur";
			isLoading = false;
		}
	}

	// Contenu changé de l'extérieur → recopié dans l'éditeur
	$effect(() => {
		if (editor && value !== editor.state.doc.toString()) {
			editor.dispatch({
				changes: { from: 0, to: editor.state.doc.length, insert: value }
			});
		}
	});

	onMount(() => {
		initEditor();
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});
</script>

<div
	class={[
		'code-editor flex w-full flex-col',
		height ? 'rounded-lg border border-border' : 'h-full'
	]}
	style:--editor-font-size="{fontSize}px"
	style:height
>
	<div class="relative flex-1 overflow-hidden" bind:this={editorContainer}>
		{#if isLoading}
			<div class="flex h-full items-center justify-center bg-muted">
				<div class="flex flex-col items-center gap-2">
					<div
						class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<span class="text-sm text-muted-foreground">Chargement de l'éditeur…</span>
				</div>
			</div>
		{:else if loadError}
			<div class="flex h-full flex-col items-center justify-center gap-2 p-4">
				<p class="text-sm text-destructive">{loadError}</p>
				<textarea
					class="h-full w-full resize-none rounded border border-border bg-background p-4 font-mono text-sm text-foreground focus:outline-none"
					bind:value
					{placeholder}
					spellcheck="false"
					autocomplete="off"
					aria-label="{ariaLabel} (mode dégradé)"
					{disabled}></textarea>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.code-editor .cm-editor) {
		height: 100%;
		font-size: var(--editor-font-size, 14px) !important;
	}

	:global(.code-editor .cm-editor.cm-focused) {
		outline: none;
	}

	:global(.code-editor .cm-editor .cm-gutterElement) {
		padding-left: 8px;
		padding-right: 8px;
	}

	:global(.code-editor .cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.05) !important;
	}

	:global(.dark .code-editor .cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.1) !important;
	}
</style>
