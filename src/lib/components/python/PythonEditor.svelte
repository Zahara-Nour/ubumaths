<script lang="ts">
	/**
	 * PythonEditor - CodeMirror 6 editor for Python code
	 *
	 * Features:
	 * - Python syntax highlighting
	 * - Autocompletion
	 * - Line numbers
	 * - Theme switching (light/dark)
	 * - Keyboard shortcuts
	 * - Error line highlighting
	 * - Lazy loading of CodeMirror
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';

	// Props
	let {
		value = $bindable(''),
		errorLine = null as number | null,
		disabled = false,
		onExecute = () => {}
	}: {
		value?: string;
		errorLine?: number | null;
		disabled?: boolean;
		onExecute?: () => void;
	} = $props();

	// State
	let editorContainer: HTMLDivElement | null = null;
	let editor: EditorView | null = null;
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Track theme preference
	let isDark = $state(false);

	// Prevent race conditions during theme switch
	let isReinitializing = $state(false);

	// Check for dark mode preference
	function checkDarkMode(): boolean {
		if (!browser) return false;
		return (
			document.documentElement.classList.contains('dark') ||
			window.matchMedia('(prefers-color-scheme: dark)').matches
		);
	}

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
				{ EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine },
				{ EditorState },
				{ python },
				{ oneDark },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput },
				{ autocompletion, closeBrackets, closeBracketsKeymap },
				{ history, defaultKeymap, historyKeymap }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/lang-python'),
				import('@codemirror/theme-one-dark'),
				import('@codemirror/language'),
				import('@codemirror/autocomplete'),
				import('@codemirror/commands')
			]);

			isDark = checkDarkMode();

			// Build extensions
			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				bracketMatching(),
				closeBrackets(),
				autocompletion(),
				indentOnInput(),
				python(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

				// Key bindings
				keymap.of([
					...closeBracketsKeymap,
					...defaultKeymap,
					...historyKeymap,
					{
						key: 'Ctrl-Enter',
						mac: 'Cmd-Enter',
						run: () => {
							onExecute();
							return true;
						}
					}
				]),

				// Update listener
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						updateValue(update.state.doc.toString());
					}
				}),

				// Placeholder
				EditorView.contentAttributes.of({
					'aria-label': 'Éditeur de code Python'
				}),

				// Editable state
				EditorState.readOnly.of(disabled),

				// Theme
				EditorView.theme({
					'&': {
						height: '100%',
						fontSize: '14px'
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

			// Add dark theme if needed
			if (isDark) {
				extensions.push(oneDark);
			}

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
			console.error('[PythonEditor] Failed to load CodeMirror:', error);
			loadError = error instanceof Error ? error.message : "Échec du chargement de l'éditeur";
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

	// Highlight error line
	$effect(() => {
		if (editor && errorLine !== null && errorLine > 0) {
			const lineInfo = editor.state.doc.line(Math.min(errorLine, editor.state.doc.lines));
			editor.dispatch({
				selection: { anchor: lineInfo.from },
				scrollIntoView: true
			});
		}
	});

	// Theme change observer
	$effect(() => {
		if (!browser) return;

		const observer = new MutationObserver(async () => {
			const newIsDark = checkDarkMode();
			if (newIsDark !== isDark && !isReinitializing) {
				isDark = newIsDark;
				// Reinitialize editor with new theme
				if (editor) {
					isReinitializing = true;
					const currentValue = editor.state.doc.toString();
					editor.destroy();
					editor = null;

					try {
						await initEditor();
						// Restore value after reinitialization if needed
						if (editor && currentValue !== value) {
							value = currentValue;
						}
					} catch (error) {
						console.error('[PythonEditor] Failed to reinitialize after theme change:', error);
					} finally {
						isReinitializing = false;
					}
				}
			}
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
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

<div class="relative h-full w-full" bind:this={editorContainer}>
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="flex flex-col items-center gap-2">
				<div
					class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></div>
				<span class="text-sm text-muted-foreground">Chargement de l'éditeur...</span>
			</div>
		</div>
	{:else if loadError}
		<div class="flex h-full flex-col items-center justify-center gap-2 p-4">
			<p class="text-sm text-destructive">{loadError}</p>
			<textarea
				class="h-full w-full resize-none bg-background p-4 font-mono text-sm text-foreground focus:outline-none"
				bind:value
				placeholder="# Écrivez votre code Python ici..."
				spellcheck="false"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				aria-label="Éditeur de code Python (mode dégradé)"
				{disabled}
			></textarea>
		</div>
	{/if}
</div>

<style>
	/* CodeMirror container styling */
	:global(.cm-editor) {
		height: 100%;
		background: transparent;
	}

	:global(.cm-editor.cm-focused) {
		outline: none;
	}

	/* Light theme adjustments */
	:global(.cm-editor .cm-gutterElement) {
		padding-left: 8px;
		padding-right: 8px;
	}

	/* Dark theme adjustments */
	:global(.dark .cm-editor) {
		background: transparent;
	}

	/* Error line highlighting */
	:global(.cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.05) !important;
	}

	:global(.dark .cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.1) !important;
	}
</style>
