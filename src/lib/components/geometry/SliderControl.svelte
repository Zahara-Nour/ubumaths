<script lang="ts">
	let {
		label,
		value = $bindable(),
		min,
		max,
		step,
		onchange
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		onchange: (value: number) => void;
	} = $props();

	function handleInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		value = +target.value;
		onchange(value);
	}

	const displayValue = $derived(
		step && step >= 1
			? String(Math.round(value))
			: step
				? value.toFixed(Math.max(0, -Math.floor(Math.log10(step))))
				: Number.isInteger(value)
					? String(value)
					: value.toFixed(2)
	);
</script>

<div class="slider-row">
	<span class="slider-label">{label}</span>
	<input type="range" {min} {max} step={step ?? 'any'} {value} oninput={handleInput} />
	<span class="slider-value">{displayValue}</span>
</div>

<style>
	/* Panneau des curseurs : tokens du thème (lot 2, figures interactives) */
	.slider-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		font-family: system-ui, sans-serif;
	}

	.slider-label {
		min-width: 2rem;
		font-weight: 500;
		color: var(--color-foreground);
	}

	input[type='range'] {
		flex: 1;
		height: 4px;
		appearance: none;
		background: var(--color-border);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-fig-bleu);
		cursor: grab;
	}

	input[type='range']::-webkit-slider-thumb:active {
		cursor: grabbing;
		background: var(--color-fig-bleu);
	}

	input[type='range']::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-fig-bleu);
		border: none;
		cursor: grab;
	}

	.slider-value {
		min-width: 2.5rem;
		text-align: right;
		color: var(--color-muted-foreground);
		font-variant-numeric: tabular-nums;
	}
</style>
