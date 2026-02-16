<script lang="ts">
	/**
	 * JsonEditor - CodeMirror 6 editor for JSON with optional schema validation
	 *
	 * Features:
	 * - JSON syntax highlighting
	 * - Optional Zod schema validation (JSON.parse-only if no schema)
	 * - Error line highlighting with red background and gutter marker
	 * - Lazy loading of CodeMirror
	 * - Debounced validation
	 * - Line numbers and bracket matching
	 * - Theme switching (light/dark)
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
		schema,
		onValidate = (_isValid: boolean, _errors: string[]) => {}
	}: {
		value?: string;
		disabled?: boolean;
		fontSize?: number;
		height?: string;
		schema?: {
			safeParse: (data: unknown) => {
				success: boolean;
				error?: { issues: { path: (string | number)[]; message: string }[] };
			};
		};
		onValidate?: (isValid: boolean, errors: string[]) => void;
	} = $props();

	// State - use $state.raw for external objects to avoid proxying
	let editorContainer: HTMLDivElement | null = null;
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Validation state
	let validationErrors = $state<string[]>([]);
	let errorLines = $state<number[]>([]);
	let validationTimeoutId = $state<number | null>(null);

	// Error line effect type - stored after CodeMirror is loaded
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let errorLineEffectType: { of: (value: number[]) => any } | null = null;

	/**
	 * Find the line number in a JSON string for a given Zod error path.
	 * Walks the path segments sequentially, returning the deepest match found.
	 */
	function findLineForPath(jsonStr: string, path: (string | number)[]): number | null {
		if (path.length === 0) return null;
		const lines = jsonStr.split('\n');
		let searchFrom = 0;
		let lastFoundLine = -1;

		for (const segment of path) {
			if (typeof segment === 'string') {
				const pattern = new RegExp(`"${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`);
				let found = false;
				for (let i = searchFrom; i < lines.length; i++) {
					if (pattern.test(lines[i])) {
						searchFrom = i + 1;
						lastFoundLine = i;
						found = true;
						break;
					}
				}
				if (!found) break;
			} else {
				// Numeric index: skip forward past opening brackets/values
				searchFrom = Math.min(searchFrom + (segment as number), lines.length - 1);
			}
		}
		return lastFoundLine >= 0 ? lastFoundLine + 1 : null; // 1-indexed
	}

	/**
	 * Validate JSON and construction script schema
	 * Updates error state and calls onValidate callback
	 */
	function validateJson(jsonString: string): void {
		try {
			// First parse JSON
			const parsed = JSON.parse(jsonString);

			// If a schema is provided, validate against it
			if (schema) {
				const validation = schema.safeParse(parsed);

				if (validation.success) {
					validationErrors = [];
					errorLines = [];
					updateErrorHighlight([]);
					onValidate(true, []);
				} else {
					const issues = validation.error?.issues ?? [];
					// Extract error messages from Zod issues
					const errors = issues.map((issue) => {
						const path = issue.path.join('.');
						return path ? `${path}: ${issue.message}` : issue.message;
					});

					// Find line numbers for each error path
					const lines: number[] = [];
					for (const issue of issues) {
						if (issue.path.length > 0) {
							const line = findLineForPath(jsonString, issue.path);
							if (line !== null && !lines.includes(line)) {
								lines.push(line);
							}
						}
					}

					validationErrors = errors;
					errorLines = lines;
					updateErrorHighlight(lines);
					onValidate(false, errors);
				}
			} else {
				// No schema: JSON parse succeeded, that's enough
				validationErrors = [];
				errorLines = [];
				updateErrorHighlight([]);
				onValidate(true, []);
			}
		} catch (error) {
			// JSON parse error
			if (error instanceof SyntaxError) {
				const lineMatch = error.message.match(/line (\d+)/i);
				const line = lineMatch ? parseInt(lineMatch[1], 10) : null;

				validationErrors = [`JSON Parse Error: ${error.message}`];
				errorLines = line ? [line] : [];
				updateErrorHighlight(errorLines);
				onValidate(false, validationErrors);
			} else {
				validationErrors = ['Validation error occurred'];
				errorLines = [];
				updateErrorHighlight([]);
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
	 * Update error line highlighting in CodeMirror (without moving cursor)
	 */
	function updateErrorHighlight(lines: number[]): void {
		if (!editor || !errorLineEffectType) return;
		editor.dispatch({ effects: [errorLineEffectType.of(lines)] });
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

			// Create error line highlighting system (supports multiple lines)
			const effectType = StateEffect.define<number[]>();

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

			// State field to track error lines and compute decorations
			const errorLineFieldDef = StateField.define<{
				lines: number[];
				decorations: typeof RangeSet.prototype;
			}>({
				create() {
					return { lines: [], decorations: Decoration.none };
				},
				update(value, tr) {
					for (const effect of tr.effects) {
						if (effect.is(effectType)) {
							const newLines = effect.value;
							if (newLines.length === 0) {
								return { lines: [], decorations: Decoration.none };
							}
							const doc = tr.state.doc;
							const ranges = newLines
								.filter((l) => l > 0 && l <= doc.lines)
								.map((l) => errorLineMark.range(doc.line(l).from));
							return {
								lines: newLines,
								decorations: ranges.length > 0 ? Decoration.set(ranges) : Decoration.none
							};
						}
					}
					// Handle document changes - remap decorations
					if (tr.docChanged && value.lines.length > 0) {
						return { lines: value.lines, decorations: value.decorations.map(tr.changes) };
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
					if (state.lines.length === 0) return RangeSet.empty;
					const doc = view.state.doc;
					const markers = state.lines
						.filter((l) => l > 0 && l <= doc.lines)
						.map((l) => errorMarker.range(doc.line(l).from));
					return markers.length > 0 ? RangeSet.of(markers) : RangeSet.empty;
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

<div class="flex w-full flex-col" style="--editor-font-size: {fontSize}px">
	<!-- Editor Container -->
	<div class="relative overflow-hidden" style="height: {height}" bind:this={editorContainer}>
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
