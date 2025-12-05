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
	import { pythonStore, type EditorTheme } from '$lib/stores/pythonPlayground.svelte';
	import type { CompletionItem } from '$lib/types/python-worker';

	// Props
	let {
		value = $bindable(''),
		errorLine = null as number | null,
		disabled = false,
		fontSize = 14,
		theme = 'default' as EditorTheme,
		onExecute = () => {},
		onSave = () => {}
	}: {
		value?: string;
		errorLine?: number | null;
		disabled?: boolean;
		fontSize?: number;
		theme?: EditorTheme;
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

	// State - use $state.raw for external objects to avoid proxying
	let editorContainer: HTMLDivElement | null = null;
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Error line effect type - stored after CodeMirror is loaded
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let errorLineEffectType: { of: (value: number | null) => any } | null = null;

	// Track current theme for change detection
	let currentTheme = $state<EditorTheme>(theme);

	// Prevent race conditions during theme switch
	let isReinitializing = $state(false);

	/**
	 * Load theme extension based on theme name
	 * Returns the theme extension or null for default theme
	 */
	async function loadThemeExtension(themeName: EditorTheme): Promise<Extension | null> {
		switch (themeName) {
			case 'default':
				return null;
			case 'oneDark': {
				const { oneDark } = await import('@codemirror/theme-one-dark');
				return oneDark;
			}
			case 'dracula': {
				const { dracula } = await import('@uiw/codemirror-theme-dracula');
				return dracula;
			}
			case 'github': {
				const { githubLight } = await import('@uiw/codemirror-theme-github');
				return githubLight;
			}
			case 'githubDark': {
				const { githubDark } = await import('@uiw/codemirror-theme-github');
				return githubDark;
			}
			case 'nord': {
				const { nord } = await import('@uiw/codemirror-theme-nord');
				return nord;
			}
			case 'solarizedLight': {
				const { solarizedLight } = await import('@uiw/codemirror-theme-solarized');
				return solarizedLight;
			}
			case 'solarizedDark': {
				const { solarizedDark } = await import('@uiw/codemirror-theme-solarized');
				return solarizedDark;
			}
			case 'material': {
				const { materialLight } = await import('@uiw/codemirror-theme-material');
				return materialLight;
			}
			case 'materialDark': {
				const { materialDark } = await import('@uiw/codemirror-theme-material');
				return materialDark;
			}
			case 'vscode': {
				const { vscodeLightInit } = await import('@uiw/codemirror-theme-vscode');
				return vscodeLightInit();
			}
			case 'vscodeDark': {
				const { vscodeDark } = await import('@uiw/codemirror-theme-vscode');
				return vscodeDark;
			}
			default:
				return null;
		}
	}

	// Update value from editor
	function updateValue(newValue: string): void {
		if (value !== newValue) {
			value = newValue;
		}
	}

	/**
	 * Update error line highlighting in CodeMirror
	 * This is called whenever errorLine changes
	 */
	function updateErrorHighlight(line: number | null): void {
		if (!editor || !errorLineEffectType) return;

		const effects = [errorLineEffectType.of(line)];

		if (line !== null && line > 0 && line <= editor.state.doc.lines) {
			// Scroll to error line and highlight it
			const lineInfo = editor.state.doc.line(line);
			editor.dispatch({
				effects,
				selection: { anchor: lineInfo.from },
				scrollIntoView: true
			});
		} else {
			// Clear error highlighting
			editor.dispatch({ effects });
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
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput },
				{ autocompletion, closeBrackets, closeBracketsKeymap },
				{ history, defaultKeymap, historyKeymap }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/lang-python'),
				import('@codemirror/language'),
				import('@codemirror/autocomplete'),
				import('@codemirror/commands')
			]);

			// Load the selected theme extension
			const themeExtension = await loadThemeExtension(theme);

			// Create error line highlighting system
			const effectType = StateEffect.define<number | null>();

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

			// Track the current theme
			currentTheme = theme;

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

			// Add theme extension if not default
			if (themeExtension) {
				extensions.push(themeExtension);
			}

			// Create editor
			editor = new EditorView({
				state: EditorState.create({
					doc: value,
					extensions
				}),
				parent: editorContainer
			});

			// Store effect type for later use
			errorLineEffectType = effectType;

			isLoading = false;

			// Apply initial error highlight if errorLine is already set
			if (errorLine !== null) {
				updateErrorHighlight(errorLine);
			}
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

	// React to errorLine prop changes - this is the appropriate use of $effect
	// for syncing external state (prop) to an imperative library (CodeMirror)
	$effect(() => {
		// Read errorLine to track it
		const line = errorLine;
		// Only update if editor is ready
		if (editor && errorLineEffectType) {
			updateErrorHighlight(line);
		}
	});

	// Theme change observer - reinitialize editor when theme prop changes
	$effect(() => {
		// Read theme prop to track it
		const newTheme = theme;

		// Only reinitialize if theme actually changed and editor exists
		if (newTheme !== currentTheme && editor && !isReinitializing) {
			isReinitializing = true;
			const currentValue = editor.state.doc.toString();
			editor.destroy();
			editor = null;

			initEditor()
				.then(() => {
					// Restore value after reinitialization if needed
					if (editor && currentValue !== value) {
						value = currentValue;
					}
				})
				.catch((error) => {
					console.error('[PythonEditor] Failed to reinitialize after theme change:', error);
				})
				.finally(() => {
					isReinitializing = false;
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
	class="relative h-full w-full"
	style="--editor-font-size: {fontSize}px"
	bind:this={editorContainer}
>
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
		font-size: var(--editor-font-size, 14px) !important;
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
