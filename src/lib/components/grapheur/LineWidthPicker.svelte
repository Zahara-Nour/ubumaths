<!--
LineWidthPicker Component

A popup selector for choosing line width (thickness) for function curves.
Displays a visual preview of each width option.

@component
@example
```svelte
<LineWidthPicker value={2} onchange={(width) => updateWidth(width)} />
```
-->

<script lang="ts">
	import { LINE_WIDTHS } from '$lib/grapheur/types';
	import * as Popover from '$lib/components/ui/popover';

	let { value, onchange }: { value: number; onchange: (width: number) => void } = $props();

	let open = $state(false);

	function selectWidth(width: number) {
		onchange(width);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<button
			type="button"
			class="width-trigger"
			title="Épaisseur: {value}px"
			aria-label="Changer l'épaisseur du trait"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" class="width-icon">
				<line
					x1="2"
					y1="10"
					x2="18"
					y2="10"
					stroke="currentColor"
					stroke-width={value}
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		<div class="width-picker" role="radiogroup" aria-label="Épaisseur du trait">
			{#each LINE_WIDTHS as width (width)}
				<button
					type="button"
					class="width-option"
					class:selected={value === width}
					onclick={() => selectWidth(width)}
					aria-checked={value === width}
					aria-label="Épaisseur {width}px"
					role="radio"
					title="{width}px"
				>
					<svg width="40" height="24" viewBox="0 0 40 24" class="width-preview">
						<line
							x1="4"
							y1="12"
							x2="36"
							y2="12"
							stroke="currentColor"
							stroke-width={width}
							stroke-linecap="round"
						/>
					</svg>
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	.width-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 2px solid hsl(var(--border));
		background: hsl(var(--background));
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.15s;
	}

	.width-trigger:hover {
		transform: scale(1.05);
		border-color: hsl(var(--foreground));
	}

	.width-trigger:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	.width-icon {
		color: hsl(var(--foreground));
	}

	.width-picker {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.width-option {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px 8px;
		border-radius: 4px;
		border: 2px solid transparent;
		background: hsl(var(--background));
		cursor: pointer;
		transition:
			background-color 0.1s,
			border-color 0.1s;
	}

	.width-option:hover {
		background: hsl(var(--muted));
	}

	.width-option.selected {
		border-color: hsl(var(--foreground));
		background: hsl(var(--muted));
	}

	.width-option:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	.width-preview {
		color: hsl(var(--foreground));
	}
</style>
