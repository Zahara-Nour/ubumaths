<script lang="ts">
	/**
	 * PythonEditor - CodeMirror 6 editor for Python code
	 *
	 * Features:
	 * - Python syntax highlighting
	 * - Intelligent Python autocompletion via Pyodide
	 * - Line numbers
	 * - Theme switching (light/dark)
	 * - Keyboard shortcuts
	 * - Error line highlighting with red background and gutter marker
	 * - Lazy loading of CodeMirror
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';
	import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import type { CompletionItem } from '$lib/types/python-worker';

	// Error line highlighting module references (set during lazy load)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let errorLineEffectType: { of: (value: number | null) => any } | null = null;

	// Props
	let {
		value = $bindable(''),
		errorLine = null as number | null,
		disabled = false,
		onExecute = () => {},
		onSave = () => {}
	}: {
		value?: string;
		errorLine?: number | null;
		disabled?: boolean;
		onExecute?: () => void;
		onSave?: () => void;
	} = $props();

	/**
	 * Map Python completion types to CodeMirror completion types
	 */
	function mapCompletionType(
		pythonType: CompletionItem['type']
	): 'function' | 'variable' | 'class' | 'keyword' | 'property' | 'namespace' {
		switch (pythonType) {
			case 'function':
				return 'function';
			case 'variable':
				return 'variable';
			case 'class':
				return 'class';
			case 'keyword':
				return 'keyword';
			case 'module':
				return 'namespace';
			case 'property':
				return 'property';
			default:
				return 'variable';
		}
	}

	/**
	 * Python completion source for CodeMirror
	 * Fetches completions from Pyodide via the store
	 */
	async function pythonCompletions(context: CompletionContext): Promise<CompletionResult | null> {
		const { pos, state } = context;
		const code = state.doc.toString();

		// Find the word/identifier being typed before cursor
		const word = context.matchBefore(/[\w.]+/);
		if (!word || word.from === word.to) return null;

		// Don't trigger in comments or strings (basic check)
		const lineStart = state.doc.lineAt(pos).from;
		const lineText = state.doc.sliceString(lineStart, pos);
		if (lineText.includes('#')) {
			// Check if cursor is after the comment marker
			const commentIndex = lineText.indexOf('#');
			if (pos - lineStart > commentIndex) return null;
		}

		try {
			const completions = await pythonStore.requestCompletion(code, pos);

			if (completions.length === 0) return null;

			// Map to CodeMirror Completion format
			const options: Completion[] = completions.map((c) => ({
				label: c.label,
				type: mapCompletionType(c.type)
			}));

			return {
				from: word.from,
				options,
				validFor: /^[\w.]*$/
			};
		} catch (error) {
			console.warn('[PythonEditor] Completion error:', error);
			return null;
		}
	}

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
				{
					EditorView,
					keymap,
					lineNumbers,
					highlightActiveLineGutter,
					highlightActiveLine,
					Decoration,
					gutter,
					GutterMarker
				},
				{ EditorState, StateEffect, StateField, RangeSet },
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

			// Create error line highlighting system
			const effectType = StateEffect.define<number | null>();
			errorLineEffectType = effectType;

			// Error line decoration (red background)
			const errorLineMark = Decoration.line({ class: 'cm-errorLine' });

			// Error gutter marker (red dot)
			class ErrorGutterMarker extends GutterMarker {
				toDOM() {
					const marker = document.createElement('div');
					marker.className = 'cm-errorGutterMarker';
					marker.textContent = '●';
					return marker;
				}
			}
			const errorMarker = new ErrorGutterMarker();

			// State field to track error line and compute decorations
			const errorLineFieldDef = StateField.define<{
				line: number | null;
				decorations: typeof RangeSet.prototype;
			}>({
				create() {
					return { line: null, decorations: Decoration.none };
				},
				update(value, tr) {
					for (const effect of tr.effects) {
						if (effect.is(effectType)) {
							const newLine = effect.value;
							if (newLine === null || newLine < 1) {
								return { line: null, decorations: Decoration.none };
							}
							// Create decoration for the error line
							const doc = tr.state.doc;
							if (newLine <= doc.lines) {
								const lineInfo = doc.line(newLine);
								return {
									line: newLine,
									decorations: Decoration.set([errorLineMark.range(lineInfo.from)])
								};
							}
							return { line: null, decorations: Decoration.none };
						}
					}
					// Handle document changes - remap decorations
					if (tr.docChanged && value.line !== null) {
						return { line: value.line, decorations: value.decorations.map(tr.changes) };
					}
					return value;
				},
				provide: (field) => EditorView.decorations.from(field, (value) => value.decorations)
			});

			// Error gutter extension
			const errorGutter = gutter({
				class: 'cm-errorGutter',
				markers: (view) => {
					const state = view.state.field(errorLineFieldDef);
					if (state.line === null || state.line < 1) {
						return RangeSet.empty;
					}
					const doc = view.state.doc;
					if (state.line <= doc.lines) {
						const lineInfo = doc.line(state.line);
						return RangeSet.of([errorMarker.range(lineInfo.from)]);
					}
					return RangeSet.empty;
				}
			});

			isDark = checkDarkMode();

			// Build extensions
			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				bracketMatching(),
				closeBrackets(),
				autocompletion({
					override: [pythonCompletions],
					activateOnTyping: true,
					maxRenderedOptions: 30
				}),
				indentOnInput(),
				python(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

				// Error line highlighting
				errorLineFieldDef,
				errorGutter,

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
					},
					{
						key: 'Ctrl-s',
						mac: 'Cmd-s',
						preventDefault: true,
						run: () => {
							onSave();
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

	// Highlight error line with red decoration
	$effect(() => {
		if (!editor || !errorLineEffectType) return;

		// Always dispatch the effect to update error line state (including clearing it)
		const effects = [errorLineEffectType.of(errorLine)];

		if (errorLine !== null && errorLine > 0 && errorLine <= editor.state.doc.lines) {
			// Scroll to error line
			const lineInfo = editor.state.doc.line(errorLine);
			editor.dispatch({
				effects,
				selection: { anchor: lineInfo.from },
				scrollIntoView: true
			});
		} else {
			// Clear error highlighting
			editor.dispatch({ effects });
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

	/* Active line highlighting */
	:global(.cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.05) !important;
	}

	:global(.dark .cm-activeLine) {
		background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.1) !important;
	}

	/* Error line highlighting - red background */
	:global(.cm-errorLine) {
		background-color: rgba(239, 68, 68, 0.15) !important;
	}

	:global(.dark .cm-errorLine) {
		background-color: rgba(239, 68, 68, 0.25) !important;
	}

	/* Error gutter marker - red dot */
	:global(.cm-errorGutter) {
		width: 16px;
	}

	:global(.cm-errorGutterMarker) {
		color: #ef4444;
		font-size: 12px;
		line-height: 1;
	}
</style>
