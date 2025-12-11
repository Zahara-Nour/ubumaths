<script lang="ts">
	/**
	 * LaTeXEditor - CodeMirror 6 editor for LaTeX code
	 *
	 * Features:
	 * - Line numbers
	 * - Dark/light theme support
	 * - Lazy loading of CodeMirror
	 * - Bracket matching
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';

	// Props
	let {
		value = $bindable(''),
		disabled = false,
		fontSize = 14,
		height = '400px',
		placeholder = ''
	}: {
		value?: string;
		disabled?: boolean;
		fontSize?: number;
		height?: string;
		placeholder?: string;
	} = $props();

	// State
	let editorContainer: HTMLDivElement | null = null;
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Update value from editor
	function updateValue(newValue: string): void {
		if (value !== newValue) {
			value = newValue;
		}
	}

	// Initialize CodeMirror with lazy loading
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
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching },
				{ history, defaultKeymap, historyKeymap },
				{ oneDark }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/language'),
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
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

				// Key bindings
				keymap.of([...defaultKeymap, ...historyKeymap]),

				// Placeholder
				...(placeholder ? [placeholderExt(placeholder)] : []),

				// Update listener
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						updateValue(newValue);
					}
				}),

				// Accessibility
				EditorView.contentAttributes.of({
					'aria-label': 'Editeur LaTeX'
				}),

				// Editable state
				EditorState.readOnly.of(disabled),

				// Base theme - oneDark
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
			console.error('[LaTeXEditor] Failed to load CodeMirror:', error);
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
	class="flex w-full flex-col rounded-lg border border-border"
	style="--editor-font-size: {fontSize}px; height: {height}"
>
	<div class="relative flex-1 overflow-hidden" bind:this={editorContainer}>
		{#if isLoading}
			<div class="flex h-full items-center justify-center bg-muted">
				<div class="flex flex-col items-center gap-2">
					<div
						class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<span class="text-sm text-muted-foreground">Chargement de l'editeur...</span>
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
					autocorrect="off"
					autocapitalize="off"
					aria-label="Editeur LaTeX (mode degrade)"
					{disabled}
				></textarea>
			</div>
		{/if}
	</div>
</div>

<style>
	/* CodeMirror container styling */
	:global(.cm-editor) {
		height: 100%;
		font-size: var(--editor-font-size, 14px) !important;
	}

	:global(.cm-editor.cm-focused) {
		outline: none;
	}

	/* Gutter padding */
	:global(.cm-editor .cm-gutterElement) {
		padding-left: 8px;
		padding-right: 8px;
	}

	/* Active line highlighting */
	:global(.cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.05) !important;
	}

	:global(.dark .cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.1) !important;
	}
</style>
