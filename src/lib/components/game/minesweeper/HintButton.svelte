<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';

	// Props
	let {
		hintsUsed = 0,
		disabled = false,
		isLoading = false,
		onUseHint
	}: {
		hintsUsed?: number;
		disabled?: boolean;
		isLoading?: boolean;
		onUseHint: () => void;
	} = $props();

	// Derived state
	const isMaxedOut = $derived(hintsUsed >= 3);

	// Color coding for hints counter
	const hintsColor = $derived.by(() => {
		if (hintsUsed === 0) return 'text-green-600 dark:text-green-400';
		if (hintsUsed < 3) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	});

	// Button disabled state
	const isButtonDisabled = $derived(disabled || isMaxedOut || isLoading);

	// Tooltip content
	const tooltipContent = $derived.by(() => {
		if (isMaxedOut) {
			return "Maximum d'indices atteint (3/3)";
		}
		if (disabled) {
			return 'Terminez la partie actuelle pour utiliser un indice';
		}
		return 'Révèle une cellule sûre au hasard. Coûte 10 gidouilles et applique une pénalité de 30% sur la récompense finale.';
	});
</script>

<div class="flex flex-col gap-2">
	<!-- Hint button with tooltip -->
	<Tooltip.Root>
		<Tooltip.Trigger asChild let:builder>
			<Button
				builders={[builder]}
				onclick={onUseHint}
				disabled={isButtonDisabled}
				variant="secondary"
				size="sm"
				class="w-full"
				aria-label="Utiliser un indice"
			>
				{#if isLoading}
					<svg
						class="mr-2 h-4 w-4 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				{:else}
					<span class="mr-2" aria-hidden="true">💡</span>
				{/if}
				Indice (10 gidouilles)
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p class="max-w-xs text-sm">{tooltipContent}</p>
		</Tooltip.Content>
	</Tooltip.Root>

	<!-- Hints counter -->
	<div class="flex items-center justify-between text-sm" role="status" aria-live="polite">
		<span class="text-muted-foreground">Indices utilisés:</span>
		<span class={cn('font-bold', hintsColor)}>
			{hintsUsed}/3
		</span>
	</div>

	<!-- Warning notice (only show if no hints used yet) -->
	{#if hintsUsed === 0}
		<div class="rounded-md bg-yellow-50 p-2 dark:bg-yellow-900/10">
			<p class="text-xs text-yellow-600 dark:text-yellow-400">
				<span class="mr-1" aria-hidden="true">⚠️</span>
				Pénalité de 30% sur la récompense finale
			</p>
		</div>
	{/if}
</div>
