<script lang="ts">
	/**
	 * MarkdownCodeEditor - CodeMirror 6 editor for raw markdown
	 *
	 * Features:
	 * - Markdown syntax highlighting
	 * - Line numbers
	 * - Bracket matching
	 * - Line wrapping
	 * - Dark theme (oneDark)
	 * - Lazy loading of CodeMirror
	 *
	 * Based on JsonEditor.svelte pattern
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';

	interface Props {
		value?: string;
		disabled?: boolean;
		fontSize?: number;
		placeholder?: string;
	}

	let {
		value = $bindable(''),
		disabled = false,
		fontSize = 14,
		placeholder = ''
	}: Props = $props();

	let editorContainer: HTMLDivElement | null = $state(null);
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	/**
	 * Update value from editor
	 */
	function updateValue(newValue: string): void {
		if (value !== newValue) {
			value = newValue;
		}
	}

	/**
	 * Initialize CodeMirror with lazy loading
	 */
	async function initEditor(): Promise<void> {
		if (!browser || !editorContainer) return;

		try {
			isLoading = true;
			loadError = null;

			// Lazy load all CodeMirror modules
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
				{ markdown },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput },
				{ closeBrackets, closeBracketsKeymap },
				{ history, defaultKeymap, historyKeymap },
				{ oneDark }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/lang-markdown'),
				import('@codemirror/language'),
				import('@codemirror/autocomplete'),
				import('@codemirror/commands'),
				import('@codemirror/theme-one-dark')
			]);

			// Build extensions
			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				bracketMatching(),
				closeBrackets(),
				indentOnInput(),
				markdown(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

				// Line wrapping for markdown
				EditorView.lineWrapping,

				// Placeholder
				...(placeholder ? [placeholderExt(placeholder)] : []),

				// Key bindings
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),

				// Update listener
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						updateValue(newValue);
					}
				}),

				// Accessibility
				EditorView.contentAttributes.of({
					'aria-label': 'Editeur Markdown'
				}),

				// Editable state
				EditorState.readOnly.of(disabled),

				// Theme - oneDark
				oneDark,

				// Layout theme
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

			// Create editor
			editor = new EditorView({
				state: EditorState.create({
					doc: value,
					extensions
				}),
				parent: editorContainer
			});

			isLoading = false;
		} catch (error) {
			console.error('[MarkdownCodeEditor] Failed to load CodeMirror:', error);
			loadError = error instanceof Error ? error.message : "Echec du chargement de l'editeur";
			isLoading = false;
		}
	}

	// Update editor content when value changes externally
	$effect(() => {
		if (editor && value !== editor.state.doc.toString()) {
			editor.dispatch({
				changes: {
					from: 0,
					to: editor.state.doc.length,
					insert: value
				}
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
	class="markdown-code-editor flex h-full w-full flex-col"
	style="--editor-font-size: {fontSize}px"
>
	<div class="relative flex-1 overflow-hidden" bind:this={editorContainer}>
		{#if isLoading}
			<div class="flex h-full items-center justify-center bg-muted">
				<div class="flex flex-col items-center gap-2">
					<div
						class="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<span class="text-sm text-muted-foreground">Chargement...</span>
				</div>
			</div>
		{:else if loadError}
			<!-- Fallback textarea if CodeMirror fails to load -->
			<textarea
				class="h-full w-full resize-none bg-zinc-900 p-4 font-mono text-sm text-zinc-300 focus:outline-none"
				bind:value
				{placeholder}
				spellcheck="false"
				autocomplete="off"
				aria-label="Editeur Markdown (mode degrade)"
				{disabled}
			></textarea>
		{/if}
	</div>
</div>

<style>
	/* CodeMirror container styling */
	:global(.markdown-code-editor .cm-editor) {
		height: 100%;
		font-size: var(--editor-font-size, 14px) !important;
	}

	:global(.markdown-code-editor .cm-editor.cm-focused) {
		outline: none;
	}

	/* Gutter padding */
	:global(.markdown-code-editor .cm-editor .cm-gutterElement) {
		padding-left: 8px;
		padding-right: 8px;
	}

	/* Active line highlighting */
	:global(.markdown-code-editor .cm-activeLine) {
		background-color: rgba(59, 130, 246, 0.05) !important;
	}

	:global(.dark .markdown-code-editor .cm-activeLine) {
		background-color: rgba(59, 130, 246, 0.1) !important;
	}
</style>
