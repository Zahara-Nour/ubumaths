<!--
LineStylePicker Component

A popup selector for choosing line style (solid, dashed, dotted, etc.)
for function curves. Displays a visual preview of each style option.

@component
@example
```svelte
<LineStylePicker value="solid" onchange={(style) => updateStyle(style)} />
```
-->

<script lang="ts">
	import { LINE_STYLES, LINE_STYLE_DASHARRAY, type LineStyle } from '$lib/grapheur/types';
	import * as Popover from '$lib/components/ui/popover';

	let { value, onchange }: { value: LineStyle; onchange: (style: LineStyle) => void } = $props();

	let open = $state(false);

	/** Labels for each line style */
	const STYLE_LABELS: Record<LineStyle, string> = {
		solid: 'Continu',
		dashed: 'Tirets',
		dotted: 'Pointillé',
		dashdot: 'Tiret-point'
	};

	function selectStyle(style: LineStyle) {
		onchange(style);
		open = false;
	}

	/** Get the dasharray for display (convert 'none' to empty for SVG) */
	function getDasharray(style: LineStyle): string | undefined {
		const value = LINE_STYLE_DASHARRAY[style];
		return value === 'none' ? undefined : value;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<button
			type="button"
			class="style-trigger"
			title="Style: {STYLE_LABELS[value]}"
			aria-label="Changer le style du trait"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" class="style-icon">
				<line
					x1="2"
					y1="10"
					x2="18"
					y2="10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray={getDasharray(value)}
				/>
			</svg>
		</button>
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		<div class="style-picker" role="radiogroup" aria-label="Style du trait">
			{#each LINE_STYLES as style (style)}
				<button
					type="button"
					class="style-option"
					class:selected={value === style}
					onclick={() => selectStyle(style)}
					aria-checked={value === style}
					aria-label="Style {STYLE_LABELS[style]}"
					role="radio"
					title={STYLE_LABELS[style]}
				>
					<svg width="60" height="24" viewBox="0 0 60 24" class="style-preview">
						<line
							x1="4"
							y1="12"
							x2="56"
							y2="12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-dasharray={getDasharray(style)}
						/>
					</svg>
					<span class="style-label">{STYLE_LABELS[style]}</span>
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	.style-trigger {
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

	.style-trigger:hover {
		transform: scale(1.05);
		border-color: hsl(var(--foreground));
	}

	.style-trigger:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	.style-icon {
		color: hsl(var(--foreground));
	}

	.style-picker {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.style-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 4px;
		border: 2px solid transparent;
		background: hsl(var(--background));
		cursor: pointer;
		transition:
			background-color 0.1s,
			border-color 0.1s;
	}

	.style-option:hover {
		background: hsl(var(--muted));
	}

	.style-option.selected {
		border-color: hsl(var(--foreground));
		background: hsl(var(--muted));
	}

	.style-option:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	.style-preview {
		color: hsl(var(--foreground));
		flex-shrink: 0;
	}

	.style-label {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		white-space: nowrap;
	}
</style>
