<script lang="ts">
	import { Figure } from '$lib/geometry-core/graph/figure';
	import type { GeoElement } from '$lib/geometry-core/types/elements';
	import { isPointElement, isLineLike, isCircle } from '$lib/geometry-core/types/elements';

	const COLOR_PALETTE = [
		'#1e40af',
		'#dc2626',
		'#16a34a',
		'#9333ea',
		'#ea580c',
		'#0891b2',
		'#4b5563',
		'#000000'
	];

	interface Props {
		element: GeoElement;
		figure: Figure;
		x: number;
		y: number;
		onclose: () => void;
		onchange: () => void;
	}

	let { element, figure, x, y, onclose, onchange }: Props = $props();

	// Snapshot for $state inits below.
	// svelte-ignore state_referenced_locally
	const initialElement = element;

	let label = $state(initialElement.label ?? '');
	let selectedColor = $state(initialElement.style?.color ?? initialElement.color);

	function updateColor(color: string) {
		selectedColor = color;
		figure.updateStyle(element.id, { color });
		onchange();
	}

	function updateLabel() {
		figure.updateLabel(element.id, label);
		onchange();
	}

	function updateDash(dash: 'solid' | 'dashed' | 'dotted') {
		figure.updateStyle(element.id, { dash });
		onchange();
	}

	function updateStrokeWidth(width: number) {
		figure.updateStyle(element.id, { strokeWidth: width });
		onchange();
	}

	function updatePointShape(shape: 'dot' | 'circle' | 'cross' | 'square') {
		figure.updateStyle(element.id, { pointShape: shape });
		onchange();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	let isPoint = $derived(isPointElement(element));
	let isLine = $derived(isLineLike(element));
	let isCircleEl = $derived(isCircle(element));
	let isAngle = $derived(element.type === 'angle');
	let isSegMark = $derived(element.type === 'segmentMark');
	let showDash = $derived(isLine || isCircleEl);
	let showStrokeWidth = $derived(isLine || isCircleEl || isAngle || isSegMark);
	let currentDash = $derived(element.style?.dash ?? 'solid');
	let currentStrokeWidth = $derived(element.style?.strokeWidth ?? 2);
	let currentPointShape = $derived(element.style?.pointShape ?? 'dot');
</script>

<svelte:window onkeydown={onKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popover-backdrop" onclick={onclose}></div>

<div
	class="element-popover"
	style="left: {x}px; top: {y}px;"
	role="dialog"
	aria-label="Element properties"
>
	<!-- Label -->
	<div class="popover-row">
		<span class="popover-label">Nom</span>
		<input
			type="text"
			class="popover-input"
			bind:value={label}
			oninput={updateLabel}
			placeholder="..."
		/>
	</div>

	<!-- Color palette -->
	<div class="popover-row">
		<span class="popover-label">Couleur</span>
		<div class="color-palette">
			{#each COLOR_PALETTE as color (color)}
				<button
					class="color-swatch"
					class:selected={selectedColor === color}
					style="background-color: {color};"
					onclick={() => updateColor(color)}
					aria-label="Couleur {color}"
				></button>
			{/each}
		</div>
	</div>

	<!-- Point shape (points only) -->
	{#if isPoint}
		<div class="popover-row">
			<span class="popover-label">Forme</span>
			<div class="shape-buttons">
				{#each ['dot', 'circle', 'cross', 'square'] as shape (shape)}
					<button
						class="shape-btn"
						class:selected={currentPointShape === shape}
						onclick={() => updatePointShape(shape as 'dot' | 'circle' | 'cross' | 'square')}
					>
						{shape === 'dot' ? '●' : shape === 'circle' ? '○' : shape === 'cross' ? '✕' : '■'}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Dash style (lines, circles) -->
	{#if showDash}
		<div class="popover-row">
			<span class="popover-label">Trait</span>
			<div class="shape-buttons">
				<button
					class="shape-btn"
					class:selected={currentDash === 'solid'}
					onclick={() => updateDash('solid')}>—</button
				>
				<button
					class="shape-btn"
					class:selected={currentDash === 'dashed'}
					onclick={() => updateDash('dashed')}>- -</button
				>
				<button
					class="shape-btn"
					class:selected={currentDash === 'dotted'}
					onclick={() => updateDash('dotted')}>···</button
				>
			</div>
		</div>
	{/if}

	<!-- Stroke width (lines, circles, marks) -->
	{#if showStrokeWidth}
		<div class="popover-row">
			<span class="popover-label">Epaisseur</span>
			<input
				type="range"
				min="1"
				max="5"
				step="0.5"
				value={currentStrokeWidth}
				oninput={(e) => updateStrokeWidth(Number(e.currentTarget.value))}
				class="popover-range"
			/>
		</div>
	{/if}
</div>

<style>
	.popover-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.element-popover {
		position: absolute;
		z-index: 100;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 200px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.popover-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.popover-label {
		font-size: 12px;
		color: #6b7280;
		min-width: 55px;
	}

	.popover-input {
		flex: 1;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 2px 6px;
		font-size: 13px;
		outline: none;
	}

	.popover-input:focus {
		border-color: #3b82f6;
	}

	.color-palette {
		display: flex;
		gap: 4px;
	}

	.color-swatch {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
	}

	.color-swatch.selected {
		border-color: #000;
		box-shadow: 0 0 0 1px white inset;
	}

	.shape-buttons {
		display: flex;
		gap: 4px;
	}

	.shape-btn {
		padding: 2px 8px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 13px;
	}

	.shape-btn.selected {
		background: #eff6ff;
		border-color: #3b82f6;
		color: #1e40af;
	}

	.popover-range {
		flex: 1;
	}
</style>
