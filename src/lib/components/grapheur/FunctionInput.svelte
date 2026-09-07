<!--
FunctionInput Component

A single function input row that displays a MathLive editor with color picker,
visibility toggle, and delete button.

Features:
- MathLive integration for LaTeX input
- Debounced updates to store (300ms)
- Color picker with function palette
- Visibility toggle with Eye/EyeOff icons
- Delete button with trash icon
- Parse error display
- Accessible controls with ARIA labels

@component
@example
```svelte
<FunctionInput {func} />
```
-->

<script lang="ts">
	import type { ExplicitFunction, LineStyle } from '$lib/grapheur/types';
	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import LineWidthPicker from './LineWidthPicker.svelte';
	import LineStylePicker from './LineStylePicker.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Slider } from '$lib/components/ui/slider';
	import { fromSliderIndex, SLIDER_STEPS, toSliderIndex } from '$lib/grapheur/slider';
	import { Input } from '$lib/components/ui/input';
	import { arcLengthBetween, curvatureAt, integralUnder, tangentAt } from '$lib/grapheur/analysis';
	import { Eye, EyeOff, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let { func }: { func: ExplicitFunction } = $props();

	// Local state for latex input (bound to MathField)
	// svelte-ignore state_referenced_locally
	let latex = $state(func.latex);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
	// svelte-ignore state_referenced_locally
	let previousFuncLatex = func.latex;

	// Watch for latex changes and debounce update to store
	$effect(() => {
		// Check if func.latex changed externally (from localStorage or other source)
		if (func.latex !== previousFuncLatex) {
			latex = func.latex;
			previousFuncLatex = func.latex;
			return;
		}

		// Only update store if local latex changed and differs from store
		if (latex !== func.latex) {
			const currentLatex = latex;

			// Clear previous timeout
			if (debounceTimeout) clearTimeout(debounceTimeout);

			// Schedule update to store
			debounceTimeout = setTimeout(() => {
				grapheurStore.updateFunction(func.id, { latex: currentLatex });
				previousFuncLatex = currentLatex;
			}, 300);
		}
	});

	// Cleanup timeout on component destroy
	$effect(() => {
		return () => {
			if (debounceTimeout) clearTimeout(debounceTimeout);
		};
	});

	/**
	 * Handle color changes
	 */
	function handleColorChange(color: string) {
		grapheurStore.updateFunction(func.id, { color });
	}

	/**
	 * Handle line width changes
	 */
	function handleWidthChange(lineWidth: number) {
		grapheurStore.updateFunction(func.id, { lineWidth });
	}

	/**
	 * Handle line style changes
	 */
	function handleStyleChange(lineStyle: LineStyle) {
		grapheurStore.updateFunction(func.id, { lineStyle });
	}

	/**
	 * Toggle visibility
	 */
	/**
	 * The tangent starts at the middle of the visible window rather than at 0,
	 * which may well be off screen.
	 */
	function handleTangentChange(checked: boolean | 'indeterminate') {
		const { xMin, xMax } = grapheurStore.viewport;
		grapheurStore.updateFunction(func.id, {
			tangentAt: checked === true ? Math.round(((xMin + xMax) / 2) * 100) / 100 : null
		});
	}

	/** Bornes par défaut : la moitié centrale de la fenêtre visible. */
	function handleIntegralChange(checked: boolean | 'indeterminate') {
		const { xMin, xMax } = grapheurStore.viewport;
		const quarter = (xMax - xMin) / 4;
		const round = (n: number) => Math.round(n * 100) / 100;

		grapheurStore.updateFunction(func.id, {
			integral: checked === true ? { from: round(xMin + quarter), to: round(xMax - quarter) } : null
		});
	}

	function handleBoundInput(edge: 'from' | 'to') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const parsed = Number.parseFloat(event.currentTarget.value);
			if (!Number.isFinite(parsed) || !func.integral) return;

			grapheurStore.updateFunction(func.id, { integral: { ...func.integral, [edge]: parsed } });
		};
	}

	/** Valeur de l'intégrale, recalculée quand une borne ou un paramètre bouge. */
	const area = $derived(
		func.integral
			? integralUnder(func, func.integral.from, func.integral.to, grapheurStore.parameterBindings)
			: undefined
	);

	function handleOsculatingChange(checked: boolean | 'indeterminate') {
		grapheurStore.updateFunction(func.id, { showOsculating: checked === true });
	}

	function handleArcLengthChange(checked: boolean | 'indeterminate') {
		grapheurStore.updateFunction(func.id, { showArcLength: checked === true });
	}

	/** Courbure au point de tangence, affichée à côté de la pente. */
	const curvature = $derived(
		func.tangentAt === null || !func.showOsculating
			? undefined
			: curvatureAt(func, func.tangentAt, grapheurStore.parameterBindings)
	);

	/** Longueur de la courbe sur les bornes de l'aire. */
	const length = $derived(
		func.integral && func.showArcLength
			? arcLengthBetween(
					func,
					func.integral.from,
					func.integral.to,
					grapheurStore.parameterBindings
				)
			: undefined
	);

	function handleTangentSlide(index: number) {
		const { xMin, xMax } = grapheurStore.viewport;
		grapheurStore.updateFunction(func.id, { tangentAt: fromSliderIndex(index, xMin, xMax) });
	}

	/** Slope shown next to the slider — the point of the whole thing. */
	const tangent = $derived(
		func.tangentAt === null
			? undefined
			: tangentAt(func, func.tangentAt, grapheurStore.parameterBindings)
	);

	/** Four significant digits: enough to read a slope, short enough to fit. */
	function formatSlope(n: number): string {
		if (!Number.isFinite(n)) return '—';
		return Number.parseFloat(n.toPrecision(4)).toString();
	}

	function handleDerivativeChange(checked: boolean | 'indeterminate') {
		grapheurStore.updateFunction(func.id, { showDerivative: checked === true });
	}

	function toggleVisibility() {
		grapheurStore.updateFunction(func.id, { visible: !func.visible });
	}

	/**
	 * Delete this function
	 */
	function deleteFunction() {
		grapheurStore.removeFunction(func.id);
	}
</script>

<div class="function-input flex flex-col gap-2 rounded-md border border-border bg-card p-3">
	<!-- Top row: Style Pickers + Action Buttons -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-1">
			<ColorPicker value={func.color} onchange={handleColorChange} />
			<LineWidthPicker value={func.lineWidth} onchange={handleWidthChange} />
			<LineStylePicker value={func.lineStyle} onchange={handleStyleChange} />
		</div>

		<div class="flex gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={toggleVisibility}
				title={func.visible ? 'Masquer' : 'Afficher'}
				aria-label={func.visible ? 'Masquer la fonction' : 'Afficher la fonction'}
			>
				{#if func.visible}
					<Eye class="h-4 w-4" />
				{:else}
					<EyeOff class="h-4 w-4 text-muted-foreground" />
				{/if}
			</Button>

			<Button
				variant="ghost"
				size="icon-sm"
				onclick={deleteFunction}
				title="Supprimer"
				aria-label="Supprimer la fonction"
			>
				<Trash2 class="h-4 w-4 text-destructive" />
			</Button>
		</div>
	</div>

	<!-- Math Field below -->
	<div>
		<MathField
			bind:value={latex}
			placeholder="f(x) = ..."
			virtual-keyboard-mode="manual"
			class="w-full"
		/>
		{#if func.parseError}
			<p class="mt-1 text-xs text-destructive" role="alert">
				{func.parseError}
			</p>
		{/if}
	</div>

	<!--
		Chaque option porte ses propres réglages : « cercle » relève de la
		tangente, « longueur » de l'intervalle. Les laisser au bout d'une ligne
		voisine les rendait orphelins.
	-->
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<MyCheckbox
			checked={func.showDerivative}
			onCheckedChange={handleDerivativeChange}
			label="f′"
			aria-label="Afficher la courbe dérivée"
		/>
		<MyCheckbox
			checked={func.tangentAt !== null}
			onCheckedChange={handleTangentChange}
			label="tangente"
			aria-label="Afficher la tangente"
		/>
		<MyCheckbox
			checked={func.integral !== null}
			onCheckedChange={handleIntegralChange}
			label="aire"
			aria-label="Afficher l'aire sous la courbe"
		/>
	</div>

	{#if func.tangentAt !== null}
		<div class="flex flex-col gap-2 rounded border border-border/60 bg-muted/30 p-2">
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<span class="shrink-0 font-serif">x₀</span>
				<!--
					Curseur piloté en entiers : bits-ui compare la valeur à une liste
					de valeurs permises avec `===`, et un pas flottant tiré de la
					fenêtre n'en produit aucune qui corresponde — il réécrit alors la
					valeur, et le pouce repart en arrière.
				-->
				<Slider
					type="single"
					bind:value={
						() =>
							toSliderIndex(
								func.tangentAt ?? grapheurStore.viewport.xMin,
								grapheurStore.viewport.xMin,
								grapheurStore.viewport.xMax
							),
						handleTangentSlide
					}
					min={0}
					max={SLIDER_STEPS}
					step={1}
					aria-label="Abscisse du point de tangence"
				/>
				<span class="shrink-0 font-serif tabular-nums">
					{formatSlope(func.tangentAt)}
				</span>
			</div>

			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
				<span class="font-serif tabular-nums">
					{#if tangent}
						f′(x₀) = {formatSlope(tangent.slope)}
					{:else}
						pente non définie
					{/if}
				</span>
				<MyCheckbox
					checked={func.showOsculating}
					onCheckedChange={handleOsculatingChange}
					label="cercle osculateur"
					aria-label="Afficher le cercle osculateur"
				/>
				{#if func.showOsculating}
					<span class="font-serif tabular-nums">
						κ = {curvature === undefined ? '—' : formatSlope(curvature)}
					</span>
				{/if}
			</div>
		</div>
	{/if}

	<!--
		L'aire est signée : sous l'axe elle compte négativement, ce qu'un
		remplissage seul ne dirait pas.
	-->
	{#if func.integral}
		<div class="flex flex-col gap-2 rounded border border-border/60 bg-muted/30 p-2">
			<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
				<span class="shrink-0 font-serif">de</span>
				<Input
					type="number"
					step="any"
					value={func.integral.from}
					oninput={handleBoundInput('from')}
					class="h-7 w-20 text-xs"
					aria-label="Borne inférieure de l'aire"
				/>
				<span class="shrink-0 font-serif">à</span>
				<Input
					type="number"
					step="any"
					value={func.integral.to}
					oninput={handleBoundInput('to')}
					class="h-7 w-20 text-xs"
					aria-label="Borne supérieure de l'aire"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
				<span class="font-serif tabular-nums">
					aire = {area ? formatSlope(area.value) : '—'}
				</span>
				<MyCheckbox
					checked={func.showArcLength}
					onCheckedChange={handleArcLengthChange}
					label="longueur"
					aria-label="Afficher la longueur de la courbe"
				/>
				{#if func.showArcLength}
					<span class="font-serif tabular-nums">
						{length === undefined ? '—' : formatSlope(length)}
					</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Ensure MathField takes full width */
	:global(.function-input math-field) {
		width: 100%;
		min-height: 40px;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 0.5rem;
		background: var(--color-background);
		font-size: 1rem;
	}

	:global(.function-input math-field:focus-within) {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}
</style>
