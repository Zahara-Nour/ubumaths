<!--
	ImageSizeSelector Component
	===========================

	Selector for image size classes with visual previews.

	Features:
	- Radio buttons for size classes: inline, small, medium, large, full
	- Visual preview of each size class
	- Optional custom width percentage input (0-100%)
	- Shows calculated dimensions for each format

	@see src/lib/exercises/types.ts - ImageSizeClass
	@see src/lib/exercises/services/image-dimensions.ts
-->
<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import type { ImageSizeClass } from '$lib/custom-markdown';
	import { DEFAULT_IMAGE_SIZE_MAPPINGS } from '$lib/custom-markdown';

	// Types
	interface SizeOption {
		value: ImageSizeClass;
		label: string;
		description: string;
		preview: string; // CSS width for visual preview
	}

	// Props
	interface Props {
		value?: ImageSizeClass;
		customWidth?: number | undefined;
		onValueChange?: (value: ImageSizeClass) => void;
		onCustomWidthChange?: (width: number | undefined) => void;
	}

	let {
		value = $bindable<ImageSizeClass>('medium'),
		customWidth = $bindable<number | undefined>(undefined),
		onValueChange,
		onCustomWidthChange
	}: Props = $props();

	// Size options with descriptions
	const sizeOptions: SizeOption[] = [
		{
			value: 'inline',
			label: 'Inline',
			description: 'Dans le texte (1.5em)',
			preview: '1.5em'
		},
		{
			value: 'small',
			label: 'Petit',
			description: '25% de la largeur',
			preview: '25%'
		},
		{
			value: 'medium',
			label: 'Moyen',
			description: '50% de la largeur',
			preview: '50%'
		},
		{
			value: 'large',
			label: 'Grand',
			description: '75% de la largeur',
			preview: '75%'
		},
		{
			value: 'full',
			label: 'Pleine largeur',
			description: '100% de la largeur',
			preview: '100%'
		}
	];

	// Derived: whether using custom width mode
	let useCustomWidth = $derived(customWidth !== undefined);

	// State for input value (allows intermediate invalid states during typing)
	let customWidthInput = $state(customWidth?.toString() ?? '');

	// Sync input when customWidth prop changes externally
	let lastCustomWidth = $state<number | undefined>(customWidth);
	$effect(() => {
		if (customWidth !== lastCustomWidth) {
			lastCustomWidth = customWidth;
			if (customWidth !== undefined) {
				customWidthInput = customWidth.toString();
			}
		}
	});

	// Derived: format-specific dimensions for selected size
	const formatDimensions = $derived.by(() => {
		if (useCustomWidth && customWidth !== undefined) {
			const percent = Math.max(0, Math.min(100, customWidth));
			const ratio = Math.round((percent / 100) * 100) / 100;
			return {
				html: `${percent}%`,
				latex: `${ratio}\\textwidth`,
				typst: `${percent}%`
			};
		}

		const mapping = DEFAULT_IMAGE_SIZE_MAPPINGS[value];
		return {
			html: typeof mapping.html.width === 'string' ? mapping.html.width : 'auto',
			latex: mapping.latex,
			typst: mapping.typst
		};
	});

	/**
	 * Handle size class selection
	 */
	function handleSizeChange(newValue: string) {
		if (newValue === 'custom') {
			// Set customWidth to enable custom mode (useCustomWidth is derived from this)
			if (customWidth === undefined) {
				customWidth = 50;
				customWidthInput = '50';
				lastCustomWidth = 50;
				onCustomWidthChange?.(50);
			}
		} else {
			// Clear customWidth to disable custom mode
			customWidth = undefined;
			customWidthInput = '';
			lastCustomWidth = undefined;
			value = newValue as ImageSizeClass;
			onValueChange?.(value);
			onCustomWidthChange?.(undefined);
		}
	}

	/**
	 * Handle custom width input change
	 */
	function handleCustomWidthInput(event: Event) {
		const target = event.target as HTMLInputElement;
		customWidthInput = target.value;

		const parsed = parseFloat(target.value);
		if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
			customWidth = parsed;
			lastCustomWidth = parsed;
			onCustomWidthChange?.(customWidth);
		}
	}
</script>

<div class="flex flex-col gap-4">
	<Label class="text-sm font-medium" id="size-selector-label">Taille de l'image</Label>

	<!-- Size radio buttons -->
	<RadioGroup.Root
		value={useCustomWidth ? 'custom' : value}
		onValueChange={handleSizeChange}
		class="flex flex-col gap-2"
		aria-labelledby="size-selector-label"
	>
		{#each sizeOptions as option (option.value)}
			<div class="flex items-center gap-3">
				<RadioGroup.Item value={option.value} id={`size-${option.value}`} />
				<Label for={`size-${option.value}`} class="flex flex-1 cursor-pointer items-center gap-3">
					<!-- Visual preview bar -->
					<div
						class="h-3 rounded-sm bg-primary/60"
						style="width: {option.preview}; min-width: 12px;"
					></div>
					<div class="flex flex-col">
						<span class="text-sm font-medium">{option.label}</span>
						<span class="text-xs text-muted-foreground">{option.description}</span>
					</div>
				</Label>
			</div>
		{/each}

		<!-- Custom width option -->
		<div class="flex items-center gap-3">
			<RadioGroup.Item value="custom" id="size-custom" />
			<Label for="size-custom" class="flex cursor-pointer items-center gap-3">
				<span class="text-sm font-medium">Personnalise</span>
			</Label>
		</div>
	</RadioGroup.Root>

	<!-- Custom width input (visible when custom is selected) -->
	{#if useCustomWidth}
		<div class="ml-6 flex items-center gap-2">
			<label for="custom-width-input" class="sr-only">Largeur personnalisee en pourcentage</label>
			<Input
				id="custom-width-input"
				type="number"
				min="0"
				max="100"
				step="5"
				value={customWidthInput}
				oninput={handleCustomWidthInput}
				class="w-24"
				aria-describedby="custom-width-hint"
			/>
			<span class="text-sm text-muted-foreground" aria-hidden="true">%</span>
			<span id="custom-width-hint" class="sr-only">Entrez un pourcentage entre 0 et 100</span>
		</div>
	{/if}

	<!-- Format-specific dimensions preview -->
	<div
		class="rounded-md border border-border bg-muted/30 p-3"
		role="region"
		aria-label="Apercu des dimensions par format"
	>
		<p class="mb-2 text-xs font-medium text-muted-foreground" id="dimensions-heading">
			Dimensions par format :
		</p>
		<div class="grid grid-cols-3 gap-2 text-xs">
			<div>
				<span class="font-medium">HTML</span>
				<p
					class="font-mono text-muted-foreground"
					aria-label="Dimension HTML: {formatDimensions.html}"
				>
					{formatDimensions.html}
				</p>
			</div>
			<div>
				<span class="font-medium">LaTeX</span>
				<p
					class="font-mono text-muted-foreground"
					aria-label="Dimension LaTeX: {formatDimensions.latex}"
				>
					{formatDimensions.latex}
				</p>
			</div>
			<div>
				<span class="font-medium">Typst</span>
				<p
					class="font-mono text-muted-foreground"
					aria-label="Dimension Typst: {formatDimensions.typst}"
				>
					{formatDimensions.typst}
				</p>
			</div>
		</div>
	</div>
</div>
