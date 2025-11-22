<!--
	ImageCaptionInput Component
	===========================

	Text input for image captions with character count and preview.

	Features:
	- Text input for caption
	- Character count indicator
	- Preview of how caption will appear
	- Optional max length enforcement

	@see src/lib/exercises/types.ts - ImageNode
-->
<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';

	// Props
	interface Props {
		value?: string;
		maxLength?: number;
		placeholder?: string;
		onValueChange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		maxLength = 200,
		placeholder = 'Ex: Figure 1 - Schema du theoreme de Pythagore',
		onValueChange
	}: Props = $props();

	// Derived
	const characterCount = $derived(value.length);
	const isNearLimit = $derived(maxLength > 0 && characterCount > maxLength * 0.8);
	const isOverLimit = $derived(maxLength > 0 && characterCount > maxLength);

	/**
	 * Handle input change
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		let newValue = target.value;

		// Enforce max length if set
		if (maxLength > 0 && newValue.length > maxLength) {
			newValue = newValue.slice(0, maxLength);
			target.value = newValue;
		}

		value = newValue;
		onValueChange?.(newValue);
	}

	/**
	 * Clear caption
	 */
	function clearCaption() {
		value = '';
		onValueChange?.('');
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<Label for="image-caption" class="text-sm font-medium">Legende (optionnelle)</Label>
		{#if maxLength > 0}
			<span
				id="caption-counter"
				class="text-xs {isOverLimit
					? 'text-destructive'
					: isNearLimit
						? 'text-warning'
						: 'text-muted-foreground'}"
				role="status"
				aria-live="polite"
				aria-atomic="true"
			>
				{characterCount}/{maxLength}
			</span>
		{/if}
	</div>

	<div class="relative">
		<Input
			id="image-caption"
			type="text"
			{value}
			{placeholder}
			oninput={handleInput}
			maxlength={maxLength > 0 ? maxLength : undefined}
			class={isOverLimit ? 'border-destructive' : ''}
			aria-describedby="caption-hint {maxLength > 0 ? 'caption-counter' : ''}"
			aria-invalid={isOverLimit}
		/>
		{#if value.length > 0}
			<button
				type="button"
				class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
				onclick={clearCaption}
				aria-label="Effacer la legende"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		{/if}
	</div>

	<p id="caption-hint" class="text-xs text-muted-foreground">
		La legende apparaitra sous l'image dans tous les formats d'export. {#if isOverLimit}
			<span class="mt-1 block text-destructive" role="alert"
				>Avertissement: le nombre de caracteres a depasse la limite.</span
			>
		{/if}
	</p>

	<!-- Caption preview -->
	{#if value.length > 0}
		<div
			class="mt-2 rounded-md border border-border bg-muted/20 p-3"
			role="region"
			aria-label="Apercu de la legende"
		>
			<p class="mb-1 text-xs font-medium text-muted-foreground" id="preview-label">Apercu :</p>
			<div class="flex flex-col items-center gap-2">
				<div class="h-8 w-16 rounded bg-muted" aria-hidden="true"></div>
				<p
					class="text-center text-sm text-muted-foreground italic"
					aria-describedby="preview-label"
				>
					{value}
				</p>
			</div>
		</div>
	{/if}
</div>
