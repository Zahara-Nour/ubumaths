<script lang="ts">
	/**
	 * LockedPythonEditor — CodeMirror editor for "fill in the blanks"
	 * Python exercises.
	 *
	 * Reads a `template` containing `{{id | "default"}}` markers, renders
	 * the code with markers replaced by their defaults, marks the
	 * non-editable parts read-only, and only accepts changes inside the
	 * editable regions. Single-line markers only (newlines are rejected
	 * by the transaction filter).
	 *
	 * The `value` binding always reflects the **reconstructed code**:
	 * `reconstructCode(template, currentValuesOfZones)`. The parent
	 * component sends this string to the Pyodide worker for validation,
	 * exactly like the regular `PythonEditor`.
	 *
	 * Surface kept intentionally small for V1: no autocompletion (the
	 * editable regions are typically short fragments), no error/debug
	 * gutter (the rendered code is what the student runs, error lines
	 * map back to the student's edits which the result panel surfaces
	 * separately).
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';
	import { renderDefaults, reconstructCode, type ParseError } from '$lib/utils/locked-zones';
	import { toaster } from '$lib/stores/toaster.svelte';

	let {
		template,
		value = $bindable(''),
		onExecute = () => {},
		fontSize = 14
	}: {
		template: string;
		value?: string;
		onExecute?: () => void;
		fontSize?: number;
	} = $props();

	let editorContainer: HTMLDivElement | null = null;
	let editor = $state.raw<EditorView | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let parseErrors = $state<ParseError[]>([]);

	async function initEditor(): Promise<void> {
		if (!browser || !editorContainer) return;

		try {
			isLoading = true;
			loadError = null;

			const render = renderDefaults(template);
			if (render.errors.length > 0) {
				parseErrors = render.errors;
				isLoading = false;
				return;
			}

			const initialZones = render.zones;

			// The reconstructed value the parent component should see while
			// the student types. Emit the initial state synchronously so the
			// "Run / Vérifier" buttons are usable before the first keystroke.
			const initialValues: Record<string, string> = {};
			for (const z of initialZones) {
				initialValues[z.id] = z.defaultValue;
			}
			value = reconstructCode(template, initialValues);

			// Lazy-load CodeMirror modules.
			const [
				{ EditorView, keymap, lineNumbers, Decoration },
				{ EditorState, StateField },
				{ python },
				{ defaultHighlightStyle, syntaxHighlighting, bracketMatching },
				{ history, defaultKeymap, historyKeymap }
			] = await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/lang-python'),
				import('@codemirror/language'),
				import('@codemirror/commands')
			]);

			// The component may have been destroyed while we were awaiting
			// the lazy-load. Bail out cleanly without producing a misleading
			// "Échec du chargement" error.
			if (!editorContainer) return;

			// Zone shape stored in the state field — positions get remapped
			// through every transaction so they track the student's edits.
			type LiveZone = { id: string; renderedStart: number; renderedEnd: number };

			const zonesField = StateField.define<LiveZone[]>({
				create() {
					return initialZones.map((z) => ({
						id: z.id,
						renderedStart: z.renderedStart,
						renderedEnd: z.renderedEnd
					}));
				},
				update(zones, tr) {
					if (!tr.docChanged) return zones;
					return zones.map((z) => ({
						id: z.id,
						// `assoc = -1` keeps start to the LEFT of inserts that land
						// exactly on the boundary, so the insert lands inside the
						// zone. `assoc = +1` lets end extend rightward.
						renderedStart: tr.changes.mapPos(z.renderedStart, -1),
						renderedEnd: tr.changes.mapPos(z.renderedEnd, 1)
					}));
				}
			});

			const zoneMark = Decoration.mark({ class: 'cm-lockedZone' });
			const zonesDecorations = EditorView.decorations.compute([zonesField], (state) => {
				const zones = state.field(zonesField);
				// Collapsed zones (empty after the student deleted everything)
				// must not produce zero-length decorations: `Decoration.mark`
				// requires `from < to`. Decorations also need to be sorted by
				// position — zones are inserted in document order but a future
				// edit could in principle invert two adjacent zones, so we
				// sort defensively.
				return Decoration.set(
					zones
						.filter((z) => z.renderedStart < z.renderedEnd)
						.sort((a, b) => a.renderedStart - b.renderedStart)
						.map((z) => zoneMark.range(z.renderedStart, z.renderedEnd))
				);
			});

			// Transaction filter: a change is allowed iff:
			//   1. its [fromA, toA] range sits strictly inside some zone, AND
			//   2. its `inserted` text contains no newline (single-line constraint).
			// Otherwise the whole transaction is dropped. Selection-only
			// transactions (no docChange) are always allowed so the student
			// can move the caret anywhere.
			//
			// Undo / redo bypass the filter: blocking them silently strips
			// history entries that touch the locked regions (e.g. after a
			// rejected paste that left scrub state behind), which is more
			// confusing than letting the student rewind to a known state.
			// The template is preserved server-side anyway.
			const lockedFilter = EditorState.transactionFilter.of((tr) => {
				if (!tr.docChanged) return tr;
				if (tr.isUserEvent('undo') || tr.isUserEvent('redo')) return tr;

				const zones = tr.startState.field(zonesField);
				let allowed = true;
				let rejectionReason: 'newline' | 'out-of-zone' | null = null;
				tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
					const insertedText = inserted.toString();
					if (insertedText.includes('\n')) {
						allowed = false;
						rejectionReason ??= 'newline';
						return;
					}
					const inZone = zones.some((z) => fromA >= z.renderedStart && toA <= z.renderedEnd);
					if (!inZone) {
						allowed = false;
						rejectionReason ??= 'out-of-zone';
					}
				});
				if (!allowed) {
					// Surface a one-shot toast so the student understands why
					// a paste / keypress silently did nothing. Without this,
					// the editor appears broken (especially mid-paste).
					if (rejectionReason === 'newline') {
						toaster.warning('Les zones modifiables tiennent sur une seule ligne.');
					} else {
						toaster.warning('Seules les zones surlignées peuvent être modifiées.');
					}
					return [];
				}
				return tr;
			});

			// Emit the reconstructed code on every doc change.
			const updater = EditorView.updateListener.of((update) => {
				if (!update.docChanged) return;
				const state = update.state;
				const zones = state.field(zonesField);
				const values: Record<string, string> = {};
				for (const z of zones) {
					values[z.id] = state.doc.sliceString(z.renderedStart, z.renderedEnd);
				}
				value = reconstructCode(template, values);
			});

			const extensions: Extension[] = [
				lineNumbers(),
				history(),
				bracketMatching(),
				python(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				zonesField,
				zonesDecorations,
				lockedFilter,
				updater,
				keymap.of([
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
				EditorView.theme({
					'&': { height: '100%' },
					'.cm-scroller': {
						overflow: 'auto',
						fontFamily:
							'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
					},
					'.cm-content': { padding: '16px 0' },
					'.cm-gutters': { backgroundColor: 'transparent', borderRight: 'none' }
				})
			];

			editor = new EditorView({
				state: EditorState.create({ doc: render.rendered, extensions }),
				parent: editorContainer
			});

			isLoading = false;
		} catch (error) {
			console.error('[LockedPythonEditor] Init failed:', error);
			loadError = error instanceof Error ? error.message : "Échec du chargement de l'éditeur";
			isLoading = false;
		}
	}

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
				<span class="text-sm text-muted-foreground">Chargement de l'éditeur…</span>
			</div>
		</div>
	{:else if loadError}
		<div class="p-4 text-sm text-destructive">{loadError}</div>
	{:else if parseErrors.length > 0}
		<div
			role="alert"
			class="m-4 rounded-md border border-red-500 bg-red-50 p-3 text-sm dark:bg-red-950/40"
		>
			<div class="mb-2 font-medium text-red-900 dark:text-red-100">
				Cet exercice est mal configuré
			</div>
			<ul class="list-disc pl-5 text-red-800 dark:text-red-200">
				{#each parseErrors as err (err.index)}
					<li>{err.message}</li>
				{/each}
			</ul>
			<p class="mt-2 text-xs text-red-700 dark:text-red-300">Signale-le à ton enseignant·e.</p>
		</div>
	{/if}
</div>

<style>
	:global(.cm-editor) {
		height: 100%;
		font-size: var(--editor-font-size, 14px) !important;
	}

	:global(.cm-editor.cm-focused) {
		outline: none;
	}

	/* Editable zones — coloured background + dashed outline so the student
	   can spot them at a glance. The contrast is intentionally subtle to
	   stay readable across the syntax-highlighting themes. */
	:global(.cm-lockedZone) {
		background-color: rgba(59, 130, 246, 0.12);
		outline: 1px dashed rgba(59, 130, 246, 0.55);
		border-radius: 2px;
		padding: 0 1px;
	}

	:global(.dark .cm-lockedZone) {
		background-color: rgba(96, 165, 250, 0.18);
		outline-color: rgba(96, 165, 250, 0.65);
	}
</style>
