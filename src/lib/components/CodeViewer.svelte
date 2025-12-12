<script lang="ts">
	/**
	 * CodeViewer - Read-only CodeMirror 6 viewer
	 *
	 * Features:
	 * - Line numbers
	 * - Dark theme (oneDark)
	 * - Lazy loading of CodeMirror
	 * - Read-only mode
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';

	interface Props {
		value?: string;
		fontSize?: number;
		height?: string;
		label?: string;
	}

	let { value = '', fontSize = 13, height = '400px', label = 'Code' }: Props = $props();

	let editorContainer: HTMLDivElement | null = $state(null);
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	async function initEditor(): Promise<void> {
		if (!browser || !editorContainer) return;

		try {
			isLoading = true;
			loadError = null;

			const [
				{ EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine },
				{ EditorState },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching },
				{ oneDark }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/language'),
				import('@codemirror/theme-one-dark')
			]);

			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				bracketMatching(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

				// Read-only
				EditorState.readOnly.of(true),
				EditorView.editable.of(false),

				// Accessibility
				EditorView.contentAttributes.of({
					'aria-label': label,
					'aria-readonly': 'true'
				}),

				// Theme
				oneDark,

				// Layout
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
						padding: '12px 0',
						cursor: 'text'
					},
					'.cm-gutters': {
						backgroundColor: 'transparent',
						borderRight: 'none'
					},
					'.cm-activeLineGutter': {
						backgroundColor: 'transparent'
					},
					'.cm-cursor': {
						display: 'none'
					}
				})
			];

			editor = new EditorView({
				state: EditorState.create({
					doc: value,
					extensions
				}),
				parent: editorContainer
			});

			isLoading = false;
		} catch (error) {
			console.error('[CodeViewer] Failed to load CodeMirror:', error);
			loadError = error instanceof Error ? error.message : "Echec du chargement de l'editeur";
			isLoading = false;
		}
	}

	// Update content when value changes
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
	class="flex w-full flex-col overflow-hidden rounded-lg border border-border"
	style="--editor-font-size: {fontSize}px; height: {height}"
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
			<div class="h-full overflow-auto bg-zinc-900 p-4">
				<pre class="font-mono text-sm break-words whitespace-pre-wrap text-zinc-300">{value}</pre>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.cm-editor) {
		height: 100%;
		font-size: var(--editor-font-size, 13px) !important;
	}

	:global(.cm-editor.cm-focused) {
		outline: none;
	}

	:global(.cm-editor .cm-gutterElement) {
		padding-left: 8px;
		padding-right: 8px;
	}
</style>
