<!--
ColorPicker Component

A simple, accessible color selector for function curves that displays the
function color palette as clickable swatches.

Features:
- Displays all FUNCTION_COLORS as visual swatches
- Keyboard navigation support
- ARIA roles for screen readers
- Visual feedback for selected color
- Dark mode compatible

@component
@example
```svelte
<ColorPicker value={func.color} onchange={(color) => updateColor(color)} />
```
-->

<script lang="ts">
	import { FUNCTION_COLORS } from '$lib/grapheur/colors';

	let { value, onchange }: { value: string; onchange: (color: string) => void } = $props();
</script>

<div class="color-picker" role="radiogroup" aria-label="Couleur de la courbe">
	{#each FUNCTION_COLORS as color (color)}
		<button
			type="button"
			class="color-swatch"
			class:selected={value === color}
			style:background-color={color}
			onclick={() => onchange(color)}
			aria-checked={value === color}
			role="radio"
			title="Couleur {color}"
		/>
	{/each}
</div>

<style>
	.color-picker {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 2px solid transparent;
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.1s;
	}

	.color-swatch:hover {
		transform: scale(1.1);
	}

	.color-swatch.selected {
		border-color: hsl(var(--foreground));
		box-shadow: 0 0 0 2px hsl(var(--background));
	}

	.color-swatch:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}
</style>
