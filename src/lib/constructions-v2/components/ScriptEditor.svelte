<script lang="ts">
	/**
	 * ScriptEditor — CodeMirror 6 editor for geometry DSL with live preview.
	 *
	 * Features:
	 * - DSL syntax highlighting (keywords, directives, comments, strings, numbers)
	 * - Live validation via parseDsl() with error line highlighting
	 * - Split panel: editor left, ConstructionPlayer right (seeked to end)
	 * - Lazy CodeMirror loading with textarea fallback
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { parseDsl } from '$lib/geometry-core/dsl';
	import type { DslRuntimeErrorDetails } from '$lib/geometry-core/dsl/errors';
	import ConstructionPlayer from './ConstructionPlayer.svelte';
	import InlineFormatted from './InlineFormatted.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';

	interface Props {
		value?: string;
		onSave?: (script: string) => void;
		width?: number;
		height?: number;
		class?: string;
		/** Allow point drag on the preview canvas. Auto-suspended during playback. */
		interactive?: boolean;
	}

	let {
		value = $bindable(''),
		onSave,
		width = 500,
		height = 400,
		class: className = '',
		interactive = false
	}: Props = $props();

	interface RuntimeErrorInfo {
		message: string;
		line: number | null;
		stepIndex: number | null;
		details: DslRuntimeErrorDetails | null;
	}

	let editorContainer = $state<HTMLDivElement | null>(null);
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Validation
	let validationErrors = $state<string[]>([]);
	let parseErrorLines = $state<number[]>([]);
	let runtimeError = $state<RuntimeErrorInfo | null>(null);
	let validationTimeoutId: number | null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let errorLineEffectType: { of: (value: number[]) => any } | null = null;

	function refreshErrorHighlight(): void {
		const lines = [...parseErrorLines];
		const rtLine = runtimeError?.line ?? null;
		if (rtLine !== null && !lines.includes(rtLine)) {
			lines.push(rtLine);
		}
		updateErrorHighlight(lines);
	}

	function validateScript(script: string): void {
		try {
			parseDsl(script);
			validationErrors = [];
			parseErrorLines = [];
		} catch (e) {
			if (e instanceof Error) {
				const lineMatch = e.message.match(/Ligne (\d+)/i);
				const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
				validationErrors = [e.message];
				parseErrorLines = line ? [line] : [];
			}
		}
		refreshErrorHighlight();
	}

	function handleRuntimeError(err: RuntimeErrorInfo | null): void {
		runtimeError = err;
		refreshErrorHighlight();
	}

	function getSourceLine(lineNumber: number | null): string | null {
		if (lineNumber === null || lineNumber < 1) return null;
		const lines = value.split('\n');
		return lines[lineNumber - 1] ?? null;
	}

	function scheduleValidation(content: string): void {
		if (validationTimeoutId !== null) clearTimeout(validationTimeoutId);
		validationTimeoutId = setTimeout(() => {
			validateScript(content);
			validationTimeoutId = null;
		}, 300) as unknown as number;
	}

	function updateErrorHighlight(lines: number[]): void {
		if (!editor || !errorLineEffectType) return;
		editor.dispatch({ effects: [errorLineEffectType.of(lines)] });
	}

	function updateValue(newValue: string): void {
		if (value !== newValue) {
			value = newValue;
		}
	}

	// DSL keywords for syntax highlighting
	const GEOMETRY_KEYWORDS = new Set([
		'point',
		'milieu',
		'segment',
		'droite',
		'demidroite',
		'cercle',
		'symetrie',
		'rotation',
		'translation',
		'homothetie',
		'intersection',
		'angle',
		'angle_polaire',
		'marque_segment',
		'mesure',
		'style'
	]);
	const CONTROL_KEYWORDS = new Set([
		'macro',
		'retourne',
		'pour',
		'dans',
		'si',
		'sinon',
		'vrai',
		'faux',
		'non',
		'et',
		'ou'
	]);
	const MATH_FUNCTIONS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan']);

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
					Decoration,
					gutter,
					GutterMarker
				},
				{ EditorState, StateEffect, StateField, RangeSet },
				{ StreamLanguage },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput },
				{ closeBrackets, closeBracketsKeymap },
				{ history, defaultKeymap, historyKeymap },
				{ oneDark }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/language'),
				import('@codemirror/language'),
				import('@codemirror/autocomplete'),
				import('@codemirror/commands'),
				import('@codemirror/theme-one-dark')
			]);

			// DSL syntax highlighting via StreamLanguage
			const dslLanguage = StreamLanguage.define({
				token(stream) {
					// Comments
					if (stream.match('#')) {
						stream.skipToEnd();
						return 'comment';
					}
					// Directives
					if (stream.match(/@[a-zA-Z_]\w*/)) {
						return 'keyword';
					}
					// Strings
					if (stream.match(/"[^"]*"/)) {
						return 'string';
					}
					// Numbers
					if (stream.match(/\d+(\.\d+)?/)) {
						return 'number';
					}
					// Identifiers and keywords
					if (stream.match(/[a-zA-Z_]\w*/)) {
						const word = stream.current();
						if (CONTROL_KEYWORDS.has(word)) return 'keyword';
						if (GEOMETRY_KEYWORDS.has(word)) return 'typeName';
						if (MATH_FUNCTIONS.has(word)) return 'function(definition)';
						return 'variableName';
					}
					// Operators
					if (stream.match(/[+\-*/%^=!<>]+/)) {
						return 'operator';
					}
					// Punctuation
					if (stream.match(/[()[\]:,.]/)) {
						return 'punctuation';
					}
					// Skip unknown
					stream.next();
					return null;
				}
			});

			// Error highlighting (same pattern as JsonEditor)
			const effectType = StateEffect.define<number[]>();
			const errorLineMark = Decoration.line({ class: 'cm-errorLine' });

			// eslint-disable-next-line svelte/no-unused-svelte-ignore
			// svelte-ignore perf_avoid_nested_class
			class ErrorMarker extends GutterMarker {
				toDOM() {
					const marker = document.createElement('span');
					marker.className = 'cm-error-marker';
					marker.textContent = '\u25CF';
					return marker;
				}
			}
			const errorMarker = new ErrorMarker();

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
					if (tr.docChanged && value.lines.length > 0) {
						return { lines: value.lines, decorations: value.decorations.map(tr.changes) };
					}
					return value;
				},
				provide: (field) => EditorView.decorations.from(field, (value) => value.decorations)
			});

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

			const extensions: Extension[] = [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				bracketMatching(),
				closeBrackets(),
				indentOnInput(),
				dslLanguage,
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				errorLineFieldDef,
				errorGutter,
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						updateValue(newValue);
						scheduleValidation(newValue);
					}
				}),
				EditorView.contentAttributes.of({
					'aria-label': 'Editeur de script DSL geometrique'
				}),
				oneDark,
				EditorView.theme({
					'&': { height: '100%', fontSize: '13px' },
					'.cm-scroller': {
						overflow: 'auto',
						fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
					},
					'.cm-content': { padding: '12px 0' },
					'.cm-gutters': { backgroundColor: 'transparent', borderRight: 'none' },
					'.cm-activeLineGutter': { backgroundColor: 'transparent' }
				})
			];

			editor = new EditorView({
				state: EditorState.create({ doc: value, extensions }),
				parent: editorContainer
			});

			errorLineEffectType = effectType;
			isLoading = false;
			scheduleValidation(value);
		} catch (err) {
			console.error('[ScriptEditor] Failed to load CodeMirror:', err);
			loadError = err instanceof Error ? err.message : "Echec du chargement de l'editeur";
			isLoading = false;
		}
	}

	// Sync external value changes to editor
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
		if (validationTimeoutId !== null) clearTimeout(validationTimeoutId);
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});
</script>

<div class="script-editor {className}">
	<!-- Toolbar -->
	{#if onSave}
		<div class="mb-2 flex items-center gap-2">
			<div class="flex-1"></div>
			<Button
				variant="outline"
				size="sm"
				onclick={() => onSave?.(value)}
				disabled={validationErrors.length > 0}
			>
				Enregistrer
			</Button>
		</div>
	{/if}

	<!-- Split: Editor (left) + Preview/Player (right) -->
	<div class="flex gap-4">
		<!-- Editor panel (always visible) -->
		<div class="flex min-w-0 flex-1 flex-col">
			<div
				class="relative overflow-hidden rounded-md border border-border"
				style="height: {height}px"
				bind:this={editorContainer}
			>
				{#if isLoading}
					<div class="flex h-full items-center justify-center">
						<div class="flex flex-col items-center gap-2">
							<div
								class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
							></div>
							<span class="text-sm text-muted-foreground">Chargement...</span>
						</div>
					</div>
				{:else if loadError}
					<textarea
						class="h-full w-full resize-none rounded bg-background p-4 font-mono text-sm text-foreground focus:outline-none"
						bind:value
						spellcheck="false"
						autocomplete="off"
						aria-label="Editeur DSL (mode degrade)"
					></textarea>
				{/if}
			</div>

			{#if validationErrors.length > 0}
				<div class="mt-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
					<p class="text-xs font-medium text-destructive">Erreur de syntaxe</p>
					{#each validationErrors as err, i (i)}
						<pre class="mt-1 font-mono text-xs whitespace-pre-wrap text-foreground">{err}</pre>
					{/each}
				</div>
			{:else if runtimeError}
				{@const srcLine = getSourceLine(runtimeError.line)}
				{@const details = runtimeError.details}
				<div class="mt-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
					<!-- Header: title + step badge -->
					<div class="flex items-baseline justify-between gap-2">
						<p class="text-sm font-medium text-destructive">Erreur d'exécution</p>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							{#if runtimeError.line !== null}
								<span>ligne {runtimeError.line}</span>
							{/if}
							{#if runtimeError.stepIndex !== null}
								<span>·</span>
								<span>étape {runtimeError.stepIndex + 1}</span>
							{/if}
						</div>
					</div>

					<!-- Source line excerpt -->
					{#if srcLine !== null}
						<div
							class="mt-2 overflow-x-auto rounded border border-border/60 bg-background p-2 font-mono text-xs text-foreground"
						>
							<span class="text-muted-foreground select-none">{runtimeError.line} │ </span>{srcLine}
						</div>
					{/if}

					<!-- Structured message: summary + hint + accepted forms -->
					{#if details}
						<p class="mt-3 text-sm text-foreground">
							<InlineFormatted text={details.summary} />
						</p>
						{#if details.hint}
							<p class="mt-2 text-xs text-muted-foreground">
								<InlineFormatted text={details.hint} />
							</p>
						{/if}
						{#if details.forms && details.forms.length > 0}
							<div class="mt-3">
								<p class="text-xs font-medium text-muted-foreground">Formes acceptées</p>
								<ul class="mt-1 space-y-1">
									{#each details.forms as form, i (i)}
										<li class="flex items-start gap-2 text-xs">
											<code
												class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-foreground"
												>{form.syntax}</code
											>
											<span class="text-muted-foreground">
												<InlineFormatted text={form.description} />
											</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					{:else}
						<!-- Fallback: legacy flat-string error -->
						<pre
							class="mt-2 font-mono text-xs whitespace-pre-wrap text-foreground">{runtimeError.message}</pre>
					{/if}

					<p class="mt-3 text-[11px] text-muted-foreground italic">
						Les instructions précédentes ont été exécutées ; les suivantes sont ignorées.
					</p>
				</div>
			{:else if value.trim().length > 0}
				<p class="mt-1 text-xs text-green-600">Script valide</p>
			{/if}
		</div>

		<!-- Right panel: ConstructionPlayer (seeked to end for instant preview) -->
		<div class="flex-shrink-0">
			<ConstructionPlayer
				script={value}
				{width}
				{height}
				showGrid={true}
				showControls={true}
				seekToEnd={true}
				{interactive}
				onRuntimeError={handleRuntimeError}
			/>
		</div>
	</div>
</div>

<style>
	:global(.cm-errorLine) {
		background-color: rgba(239, 68, 68, 0.15) !important;
	}
	:global(.dark .cm-errorLine) {
		background-color: rgba(239, 68, 68, 0.25) !important;
	}
	:global(.cm-errorGutter) {
		width: 16px;
	}
	:global(.cm-error-marker) {
		color: #ef4444;
		font-size: 12px;
		line-height: 1;
	}
</style>
