<!--
	ImageAlignmentSelector Component
	=================================

	Selector for image alignment with icon-based buttons.

	Features:
	- Three alignment options: left, center, right
	- Icon-based toggle buttons
	- Visual indicator of current selection
	- Accessible keyboard navigation

	@see src/lib/exercises/types.ts - ImageAlignment
-->
<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { AlignLeft, AlignCenter, AlignRight } from 'lucide-svelte';
	import type { ImageAlignment } from '$lib/ubumark';

	// Types
	interface AlignmentOption {
		value: ImageAlignment;
		label: string;
		icon: typeof AlignLeft;
	}

	// Props
	interface Props {
		value?: ImageAlignment;
		onValueChange?: (value: ImageAlignment) => void;
	}

	let { value = $bindable<ImageAlignment>('center'), onValueChange }: Props = $props();

	// Alignment options
	const alignmentOptions: AlignmentOption[] = [
		{
			value: 'left',
			label: 'Gauche',
			icon: AlignLeft
		},
		{
			value: 'center',
			label: 'Centre',
			icon: AlignCenter
		},
		{
			value: 'right',
			label: 'Droite',
			icon: AlignRight
		}
	];

	/**
	 * Handle alignment selection
	 */
	function handleSelect(newValue: ImageAlignment) {
		value = newValue;
		onValueChange?.(newValue);
	}

	/**
	 * Handle keyboard navigation
	 */
	function handleKeyDown(event: KeyboardEvent, index: number) {
		const options = alignmentOptions;
		let newIndex = index;

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				newIndex = index > 0 ? index - 1 : options.length - 1;
				break;
			case 'ArrowRight':
				event.preventDefault();
				newIndex = index < options.length - 1 ? index + 1 : 0;
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				handleSelect(options[index].value);
				return;
			default:
				return;
		}

		// Focus the new button and select it
		const buttons = document.querySelectorAll('[data-alignment-option]');
		const button = buttons[newIndex] as HTMLButtonElement;
		button?.focus();
		handleSelect(options[newIndex].value);
	}
</script>

<div class="flex flex-col gap-2">
	<Label class="text-sm font-medium" id="alignment-selector-label">Alignement</Label>

	<div
		class="flex gap-1 rounded-md border border-border bg-muted/30 p-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
		role="group"
		aria-labelledby="alignment-selector-label"
	>
		{#each alignmentOptions as option, index (option.value)}
			{@const Icon = option.icon}
			{@const isSelected = value === option.value}
			<button
				type="button"
				data-alignment-option
				class="flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary {isSelected
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => handleSelect(option.value)}
				onkeydown={(e) => handleKeyDown(e, index)}
				aria-pressed={isSelected}
				aria-label="{option.label} - {isSelected ? 'selectionne' : 'non selectionne'}"
			>
				<Icon class="h-4 w-4" aria-hidden="true" />
				<span class="hidden sm:inline">{option.label}</span>
			</button>
		{/each}
	</div>

	<!-- Visual preview -->
	<div
		class="mt-2 flex h-12 items-center rounded-md border border-dashed border-border bg-muted/20 px-3"
		role="region"
		aria-label="Apercu de l'alignement: {value === 'left'
			? 'gauche'
			: value === 'center'
				? 'centre'
				: 'droite'}"
	>
		<div
			class="h-6 w-12 rounded bg-primary/40"
			style="margin-left: {value === 'left'
				? '0'
				: value === 'center'
					? 'auto'
					: 'auto'}; margin-right: {value === 'right'
				? '0'
				: value === 'center'
					? 'auto'
					: 'auto'};"
			aria-hidden="true"
		></div>
	</div>
</div>
