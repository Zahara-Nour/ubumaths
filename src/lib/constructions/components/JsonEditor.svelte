<script lang="ts">
	/**
	 * JsonEditor - CodeMirror 6 editor for construction script JSON
	 *
	 * Features:
	 * - JSON syntax highlighting
	 * - Validation against constructionScriptSchema
	 * - Error line highlighting with red background and gutter marker
	 * - Lazy loading of CodeMirror
	 * - Debounced validation
	 * - Line numbers and bracket matching
	 * - Theme switching (light/dark)
	 *
	 * Adapted from PythonEditor.svelte
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';
	import { constructionScriptSchema } from '$lib/constructions/schemas';

	// Props
	let {
		value = $bindable(''),
		disabled = false,
		fontSize = 14,
		height = '400px',
		onValidate = (_isValid: boolean, _errors: string[]) => {}
	}: {
		value?: string;
		disabled?: boolean;
		fontSize?: number;
		height?: string;
		onValidate?: (isValid: boolean, errors: string[]) => void;
	} = $props();

	// State - use $state.raw for external objects to avoid proxying
	let editorContainer: HTMLDivElement | null = null;
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Validation state
	let validationErrors = $state<string[]>([]);
	let errorLine = $state<number | null>(null);
	let validationTimeoutId = $state<number | null>(null);

	// Error line effect type - stored after CodeMirror is loaded
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let errorLineEffectType: { of: (value: number | null) => any } | null = null;

	/**
	 * Validate JSON and construction script schema
	 * Updates error state and calls onValidate callback
	 */
	function validateJson(jsonString: string): void {
		try {
			// First parse JSON
			const parsed = JSON.parse(jsonString);

			// Then validate against schema
			const validation = constructionScriptSchema.safeParse(parsed);

			if (validation.success) {
				validationErrors = [];
				errorLine = null;
				onValidate(true, []);
			} else {
				// Extract error messages from Zod issues
				const errors = validation.error.issues.map((issue) => {
					const path = issue.path.join('.');
					return path ? `${path}: ${issue.message}` : issue.message;
				});

				validationErrors = errors;

				// Try to extract line number from first error path
				// Note: Zod doesn't provide line numbers, so we'll clear error line
				// for schema errors. Only JSON parse errors have line numbers.
				errorLine = null;
				onValidate(false, errors);
			}
		} catch (error) {
			// JSON parse error
			if (error instanceof SyntaxError) {
				// Try to extract line number from error message
				// Chrome: "Unexpected token } in JSON at position 123"
				// Firefox: "JSON.parse: unexpected character at line 5 column 2"
				const lineMatch = error.message.match(/line (\d+)/i);
				if (lineMatch) {
					errorLine = parseInt(lineMatch[1], 10);
				} else {
					errorLine = null;
				}

				validationErrors = [`JSON Parse Error: ${error.message}`];
				onValidate(false, validationErrors);
			} else {
				validationErrors = ['Validation error occurred'];
				errorLine = null;
				onValidate(false, validationErrors);
			}
		}
	}

	/**
	 * Debounced validation - called when editor content changes
	 */
	function scheduleValidation(content: string): void {
		// Clear existing timeout
		if (validationTimeoutId !== null) {
			clearTimeout(validationTimeoutId);
		}

		// Schedule new validation
		validationTimeoutId = setTimeout(() => {
			validateJson(content);
			validationTimeoutId = null;
		}, 300) as unknown as number;
	}

	/**
	 * Update error line highlighting in CodeMirror
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
				{ json },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput },
				{ closeBrackets, closeBracketsKeymap },
				{ history, defaultKeymap, historyKeymap },
				{ oneDark }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/lang-json'),
				import('@codemirror/language'),
				import('@codemirror/autocomplete'),
				import('@codemirror/commands'),
				import('@codemirror/theme-one-dark')
			]);

			// Create error line highlighting system
			const effectType = StateEffect.define<number | null>();

			// Error line decoration (red background)
			const errorLineMark = Decoration.line({ class: 'cm-errorLine' });

			// Error gutter marker (red dot)
			class ErrorMarker extends GutterMarker {
				toDOM() {
					const marker = document.createElement('span');
					marker.className = 'cm-error-marker';
					marker.textContent = '●';
					return marker;
				}
			}
			const errorMarker = new ErrorMarker();

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

			// Build extensions
			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				bracketMatching(),
				closeBrackets(),
				indentOnInput(),
				json(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

				// Error line highlighting
				errorLineFieldDef,
				errorGutter,

				// Key bindings
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),

				// Update listener - trigger validation on changes
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						updateValue(newValue);
						scheduleValidation(newValue);
					}
				}),

				// Accessibility
				EditorView.contentAttributes.of({
					'aria-label': 'Editeur JSON pour scripts de construction'
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

			// Store effect type for later use
			errorLineEffectType = effectType;

			isLoading = false;

			// Trigger initial validation
			scheduleValidation(value);
		} catch (error) {
			console.error('[JsonEditor] Failed to load CodeMirror:', error);
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

	// React to errorLine changes - sync to CodeMirror
	$effect(() => {
		const line = errorLine;
		if (editor && errorLineEffectType) {
			updateErrorHighlight(line);
		}
	});

	onMount(() => {
		initEditor();
	});

	onDestroy(() => {
		// Clean up timeout
		if (validationTimeoutId !== null) {
			clearTimeout(validationTimeoutId);
		}

		// Destroy editor
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});
</script>

<div class="flex h-full w-full flex-col" style="--editor-font-size: {fontSize}px; height: {height}">
	<!-- Editor Container -->
	<div class="relative flex-1 overflow-hidden" bind:this={editorContainer}>
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
					class="h-full w-full resize-none rounded border border-border bg-background p-4 font-mono text-sm text-foreground focus:outline-none"
					bind:value
					placeholder={'{\n  "version": 1,\n  "canvas": { "width": 800, "height": 600 },\n  "steps": []\n}'}
					spellcheck="false"
					autocomplete="off"
					aria-label="Editeur JSON (mode degrade)"
					{disabled}
				></textarea>
			</div>
		{/if}
	</div>

	<!-- Validation Errors Display -->
	{#if validationErrors.length > 0}
		<div class="border-t border-border bg-destructive/10 p-3">
			<div class="flex items-start gap-2">
				<span class="text-destructive">⚠</span>
				<div class="flex-1 space-y-1">
					<p class="text-sm font-medium text-destructive">Erreurs de validation :</p>
					<ul class="list-inside list-disc space-y-0.5 text-xs text-destructive/90">
						{#each validationErrors as error, i (i)}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}
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

	:global(.cm-error-marker) {
		color: #ef4444;
		font-size: 12px;
		line-height: 1;
	}
</style>
