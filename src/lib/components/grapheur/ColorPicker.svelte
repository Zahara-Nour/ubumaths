<!--
ColorPicker Component

A color selector popup for function curves that displays the
function color palette when clicking on the current color swatch.

Features:
- Popover UI showing current color as trigger
- Displays all FUNCTION_COLORS as visual swatches
- Keyboard navigation support
- ARIA roles for screen readers
- Visual feedback for selected color
- Dark mode compatible
- Auto-closes on selection

@component
@example
```svelte
<ColorPicker value={func.color} onchange={(color) => updateColor(color)} />
```
-->

<script lang="ts">
	import { FUNCTION_COLORS } from '$lib/grapheur/colors';
	import * as Popover from '$lib/components/ui/popover';

	let { value, onchange }: { value: string; onchange: (color: string) => void } = $props();

	let open = $state(false);

	function selectColor(color: string) {
		onchange(color);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<button
			type="button"
			class="color-trigger"
			style:background-color={value}
			title="Changer la couleur"
			aria-label="Changer la couleur de la courbe"
		>
			<span class="sr-only">Couleur actuelle: {value}</span>
		</button>
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		<div class="color-picker" role="radiogroup" aria-label="Couleur de la courbe">
			{#each FUNCTION_COLORS as color (color)}
				<button
					type="button"
					class="color-swatch"
					class:selected={value === color}
					style:background-color={color}
					onclick={() => selectColor(color)}
					aria-checked={value === color}
					aria-label="Sélectionner la couleur {color}"
					role="radio"
					title="Couleur {color}"
				></button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	.color-trigger {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 2px solid hsl(var(--border));
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.15s;
	}

	.color-trigger:hover {
		transform: scale(1.05);
		border-color: hsl(var(--foreground));
	}

	.color-trigger:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	.color-picker {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}

	.color-swatch {
		width: 28px;
		height: 28px;
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

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
