<script lang="ts">
	/**
	 * SequenceInput Component
	 *
	 * A single sequence row in the panel: definition mode, expression, first
	 * index and first term, plus the staircase and table toggles.
	 *
	 * @component
	 */

	import type {
		LineStyle,
		SequenceMode,
		SequencePlottable,
		SequenceRepresentation
	} from '$lib/grapheur/types';
	import { supportsCobweb } from '$lib/grapheur/types';
	import { MAX_SEQUENCE_TERMS, sequenceValidationError } from '$lib/grapheur/sequence';
	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import type { MathfieldElement } from 'mathlive';
	import MySelect from '$lib/components/MySelect.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import LineWidthPicker from './LineWidthPicker.svelte';
	import LineStylePicker from './LineStylePicker.svelte';
	import SequenceTable from './SequenceTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import { Eye, EyeOff, Table2, Trash2 } from '@lucide/svelte';

	let { sequence }: { sequence: SequencePlottable } = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	const MODE_ITEMS: { value: SequenceMode; label: string }[] = [
		{ value: 'explicit', label: 'Explicite' },
		{ value: 'recurrence', label: 'Récurrence' }
	];

	/** The two representations are exclusive — see SequenceRepresentation. */
	const REPRESENTATION_ITEMS: { value: SequenceRepresentation; label: string }[] = [
		{ value: 'ranks', label: 'Rangs (n, uₙ)' },
		{ value: 'cobweb', label: 'Escalier' }
	];

	/** Highest first index offered, kept in step with the Zod schema. */
	const MAX_FIRST_INDEX = 1000;

	const DEBOUNCE_MS = 300;

	// ==========================================================================
	// State
	// ==========================================================================

	// Local mirror of the expression, bound to MathField and pushed to the
	// store on a debounce — same pattern as FunctionInput.
	// svelte-ignore state_referenced_locally
	let latex = $state(sequence.latex);
	// svelte-ignore state_referenced_locally
	let previousStoreLatex = sequence.latex;
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

	let showTable = $state(false);

	/** The MathLive element, needed to insert u_n at the caret. */
	let field = $state<MathfieldElement | undefined>();

	// ==========================================================================
	// Derived State
	// ==========================================================================

	const validationError = $derived(
		sequenceValidationError(sequence.mode, sequence.parseError ?? null, sequence.firstTerm)
	);

	const canShowCobweb = $derived(supportsCobweb(sequence));

	const showsCobweb = $derived(canShowCobweb && sequence.representation === 'cobweb');

	/** Left-hand side of the definition, e.g. `u` and `n+1`. */
	const definitionIndex = $derived(sequence.mode === 'recurrence' ? 'n+1' : 'n');

	/** Number of steps available for the staircase. */
	const maxCobwebSteps = $derived(Math.min(MAX_SEQUENCE_TERMS, 100));

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		// The store changed under us (reload, mode switch) — adopt its value.
		if (sequence.latex !== previousStoreLatex) {
			latex = sequence.latex;
			previousStoreLatex = sequence.latex;
			return;
		}

		if (latex === sequence.latex) return;

		const pendingLatex = latex;
		if (debounceTimeout) clearTimeout(debounceTimeout);

		debounceTimeout = setTimeout(() => {
			grapheurStore.updateSequence(sequence.id, { latex: pendingLatex });
			previousStoreLatex = pendingLatex;
		}, DEBOUNCE_MS);
	});

	$effect(() => {
		return () => {
			if (debounceTimeout) clearTimeout(debounceTimeout);
		};
	});

	// ==========================================================================
	// Functions
	// ==========================================================================

	function handleModeChange(value: string) {
		const item = MODE_ITEMS.find((candidate) => candidate.value === value);
		if (!item) return;

		const mode = item.value;

		grapheurStore.updateSequence(sequence.id, {
			mode,
			// A recurrence needs a starting value; going back to explicit drops it.
			firstTerm: mode === 'recurrence' ? (sequence.firstTerm ?? 0) : null,
			// The staircase only means something for a recurrence.
			representation: mode === 'recurrence' ? sequence.representation : 'ranks'
		});
	}

	/**
	 * Insert the previous term at the caret.
	 *
	 * Typing it by hand means `u`, `_`, `n`, then the right arrow to escape the
	 * subscript — a step students forget, which silently produces `u_{n+3}`.
	 * `selectionMode: 'after'` leaves the caret past the subscript instead.
	 */
	function insertPreviousTerm() {
		if (!field) return;

		field.insert(`${sequence.name}_n`, { selectionMode: 'after', format: 'latex' });

		// insert() does not necessarily emit an input event: push the value
		// ourselves so the debounced sync to the store still fires.
		latex = field.value;
		field.focus();
	}

	function handleFirstIndexInput(event: Event & { currentTarget: HTMLInputElement }) {
		const parsed = Number.parseInt(event.currentTarget.value, 10);
		if (!Number.isFinite(parsed)) return;

		const firstIndex = Math.min(Math.max(parsed, 0), MAX_FIRST_INDEX);
		grapheurStore.updateSequence(sequence.id, { firstIndex });
	}

	function handleFirstTermInput(event: Event & { currentTarget: HTMLInputElement }) {
		const raw = event.currentTarget.value.trim();
		if (raw === '') {
			grapheurStore.updateSequence(sequence.id, { firstTerm: null });
			return;
		}

		const parsed = Number.parseFloat(raw);
		grapheurStore.updateSequence(sequence.id, {
			firstTerm: Number.isFinite(parsed) ? parsed : null
		});
	}

	function handleRepresentationChange(value: string) {
		const item = REPRESENTATION_ITEMS.find((candidate) => candidate.value === value);
		if (!item) return;

		grapheurStore.updateSequence(sequence.id, { representation: item.value });
	}

	function handleCobwebStepsChange(value: number) {
		grapheurStore.updateSequence(sequence.id, { cobwebSteps: value });
	}

	function handleColorChange(color: string) {
		grapheurStore.updateSequence(sequence.id, { color });
	}

	function handleWidthChange(lineWidth: number) {
		grapheurStore.updateSequence(sequence.id, { lineWidth });
	}

	function handleStyleChange(lineStyle: LineStyle) {
		grapheurStore.updateSequence(sequence.id, { lineStyle });
	}

	function toggleVisibility() {
		grapheurStore.updateSequence(sequence.id, { visible: !sequence.visible });
	}

	function toggleTable() {
		showTable = !showTable;
	}

	function deleteSequence() {
		grapheurStore.removeFunction(sequence.id);
	}
</script>

<div class="sequence-input flex flex-col gap-2 rounded-md border border-border bg-card p-3">
	<!-- Top row: style pickers + actions -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-1">
			<ColorPicker value={sequence.color} onchange={handleColorChange} />
			<LineWidthPicker value={sequence.lineWidth} onchange={handleWidthChange} />
			<LineStylePicker value={sequence.lineStyle} onchange={handleStyleChange} />
		</div>

		<div class="flex gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={toggleTable}
				title={showTable ? 'Masquer le tableau' : 'Afficher le tableau de valeurs'}
				aria-label={showTable ? 'Masquer le tableau' : 'Afficher le tableau de valeurs'}
				aria-pressed={showTable}
			>
				<Table2 class="h-4 w-4 {showTable ? '' : 'text-muted-foreground'}" />
			</Button>

			<Button
				variant="ghost"
				size="icon-sm"
				onclick={toggleVisibility}
				title={sequence.visible ? 'Masquer' : 'Afficher'}
				aria-label={sequence.visible ? 'Masquer la suite' : 'Afficher la suite'}
			>
				{#if sequence.visible}
					<Eye class="h-4 w-4" />
				{:else}
					<EyeOff class="h-4 w-4 text-muted-foreground" />
				{/if}
			</Button>

			<Button
				variant="ghost"
				size="icon-sm"
				onclick={deleteSequence}
				title="Supprimer"
				aria-label="Supprimer la suite"
			>
				<Trash2 class="h-4 w-4 text-destructive" />
			</Button>
		</div>
	</div>

	<!-- Definition mode -->
	<MySelect
		type="single"
		value={sequence.mode}
		items={MODE_ITEMS}
		onValueChange={handleModeChange}
		triggerClass="h-8 text-xs"
	/>

	<!-- Expression -->
	<div class="flex items-center gap-2">
		<span class="shrink-0 font-serif text-sm text-foreground">
			{sequence.name}<sub>{definitionIndex}</sub> =
		</span>
		<MathField
			bind:value={latex}
			bind:element={field}
			placeholder="…"
			virtual-keyboard-mode="manual"
			class="w-full"
		/>

		{#if sequence.mode === 'recurrence'}
			<Button
				variant="outline"
				size="sm"
				onclick={insertPreviousTerm}
				title="Insérer le terme précédent"
				aria-label="Insérer le terme précédent"
				class="h-8 shrink-0 font-serif"
			>
				{sequence.name}<sub>n</sub>
			</Button>
		{/if}
	</div>

	<!-- First index and, for a recurrence, first term -->
	<div class="flex flex-wrap items-center gap-3">
		<label class="flex items-center gap-1 text-xs text-muted-foreground">
			<span class="font-serif">n<sub>0</sub> =</span>
			<Input
				type="number"
				min="0"
				max={MAX_FIRST_INDEX}
				step="1"
				value={sequence.firstIndex}
				oninput={handleFirstIndexInput}
				class="h-8 w-20"
				aria-label="Premier rang"
			/>
		</label>

		{#if sequence.mode === 'recurrence'}
			<label class="flex items-center gap-1 text-xs text-muted-foreground">
				<span class="font-serif">
					{sequence.name}<sub>{sequence.firstIndex}</sub> =
				</span>
				<Input
					type="number"
					step="any"
					value={sequence.firstTerm ?? ''}
					oninput={handleFirstTermInput}
					class="h-8 w-24"
					aria-label="Premier terme"
				/>
			</label>
		{/if}
	</div>

	<!-- Representation: the staircase replaces the cloud of ranks -->
	{#if canShowCobweb}
		<div class="flex flex-col gap-2 rounded border border-border/60 bg-muted/30 p-2">
			<span class="text-xs text-muted-foreground">Représentation</span>
			<MySelect
				type="single"
				value={sequence.representation}
				items={REPRESENTATION_ITEMS}
				onValueChange={handleRepresentationChange}
				triggerClass="h-8 text-xs"
			/>

			{#if showsCobweb}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<span class="shrink-0">Termes : {sequence.cobwebSteps}</span>
					<Slider
						type="single"
						value={sequence.cobwebSteps}
						min={0}
						max={maxCobwebSteps}
						step={1}
						onValueChange={handleCobwebStepsChange}
						aria-label="Nombre de termes de l'escalier"
					/>
				</div>
			{/if}
		</div>
	{:else if sequence.mode === 'recurrence' && sequence.usesIndex}
		<p class="text-xs text-muted-foreground">
			L'escalier n'est pas disponible : l'expression dépend du rang <span class="font-serif">n</span
			>.
		</p>
	{/if}

	<!-- Validation -->
	{#if validationError}
		<p class="text-xs text-destructive" role="alert">{validationError}</p>
	{/if}

	<!-- Table of values -->
	{#if showTable}
		<SequenceTable {sequence} />
	{/if}
</div>

<style>
	/* Ensure MathField takes full width */
	:global(.sequence-input math-field) {
		width: 100%;
		min-height: 40px;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 0.5rem;
		background: var(--color-background);
		font-size: 1rem;
	}

	:global(.sequence-input math-field:focus-within) {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}
</style>
