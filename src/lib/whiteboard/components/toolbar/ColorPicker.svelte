<script lang="ts">
	/**
	 * ColorPicker - Compact color selector with presets and custom picker
	 *
	 * Used in StylePanel and popovers for color selection.
	 */

	/** Color preset definition */
	export interface ColorPreset {
		name: string;
		value: string;
	}

	/** Default color presets */
	export const COLOR_PRESETS: ColorPreset[] = [
		{ name: 'Noir', value: '#000000' },
		{ name: 'Bleu', value: '#2563eb' },
		{ name: 'Rouge', value: '#dc2626' },
		{ name: 'Vert', value: '#16a34a' },
		{ name: 'Orange', value: '#ea580c' },
		{ name: 'Violet', value: '#9333ea' }
	];

	interface Props {
		/** Current selected color */
		value: string;
		/** Color change handler */
		onchange: (color: string) => void;
		/** Color presets to display */
		presets?: ColorPreset[];
		/** Whether to show custom color picker */
		showCustom?: boolean;
		/** Size variant */
		size?: 'sm' | 'md';
		/** Optional class for styling */
		class?: string;
	}

	let {
		value,
		onchange,
		presets = COLOR_PRESETS,
		showCustom = true,
		size = 'md',
		class: className = ''
	}: Props = $props();

	let swatchSize = $derived(size === 'sm' ? 'h-5 w-5' : 'h-6 w-6');
	let customSize = $derived(size === 'sm' ? 'h-5 w-5' : 'h-6 w-6');
</script>

<div class="flex items-center gap-0.5 {className}">
	{#each presets as color (color.value)}
		<button
			type="button"
			onclick={() => onchange(color.value)}
			class="{swatchSize} rounded-sm border transition-transform hover:scale-110 {value ===
			color.value
				? 'border-primary ring-1 ring-primary'
				: 'border-border'}"
			style="background-color: {color.value}"
			title={color.name}
			aria-label="{color.name}{value === color.value ? ' (actif)' : ''}"
		></button>
	{/each}

	{#if showCustom}
		<input
			type="color"
			{value}
			oninput={(e) => onchange(e.currentTarget.value)}
			class="{customSize} ml-0.5 cursor-pointer rounded-sm border-0 p-0"
			title="Couleur personnalisee"
			aria-label="Couleur personnalisee"
		/>
	{/if}
</div>
