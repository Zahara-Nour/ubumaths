<script lang="ts">
	/**
	 * GuessPrompt - Modal for making a guess at opponent's secret number
	 *
	 * Shows remaining (non-eliminated) numbers for selection,
	 * with confirmation and warning about losing on wrong guess.
	 */

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';
	import { Loader2, AlertTriangle, X } from 'lucide-svelte';

	interface Props {
		gridNumbers: number[];
		eliminatedNumbers: Set<number>;
		onGuess: (number: number) => void;
		onCancel: () => void;
		isSubmitting?: boolean;
		class?: string;
	}

	let {
		gridNumbers,
		eliminatedNumbers,
		onGuess,
		onCancel,
		isSubmitting = false,
		class: className = ''
	}: Props = $props();

	let selectedNumber = $state<number | null>(null);
	let showConfirmation = $state(false);

	// Get non-eliminated numbers
	const remainingNumbers = $derived(
		gridNumbers.filter((n) => !eliminatedNumbers.has(n)).sort((a, b) => a - b)
	);

	const remainingCount = $derived(remainingNumbers.length);

	function selectNumber(num: number) {
		selectedNumber = num;
		showConfirmation = true;
	}

	function confirmGuess() {
		if (selectedNumber !== null && !isSubmitting) {
			onGuess(selectedNumber);
		}
	}

	function cancelSelection() {
		showConfirmation = false;
		selectedNumber = null;
	}
</script>

<div class={cn('guess-prompt', className)}>
	<Card class="p-6">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-xl font-bold text-foreground">Deviner le nombre secret</h2>
				<p class="text-sm text-muted-foreground">
					{remainingCount} nombre{remainingCount > 1 ? 's' : ''} restant{remainingCount > 1
						? 's'
						: ''}
				</p>
			</div>
			<Button variant="ghost" size="icon" onclick={onCancel} aria-label="Annuler">
				<X class="h-5 w-5" />
			</Button>
		</div>

		<!-- Warning -->
		<div class="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
			<AlertTriangle class="h-5 w-5 shrink-0 text-destructive" />
			<p class="text-destructive">Attention : si vous vous trompez, vous perdez la partie !</p>
		</div>

		<Separator class="my-4" />

		<!-- Number grid -->
		<div class="number-selection-grid mb-4">
			{#each remainingNumbers as num (num)}
				<button
					type="button"
					onclick={() => selectNumber(num)}
					disabled={isSubmitting}
					class={cn(
						'number-button flex h-14 w-full items-center justify-center rounded-lg border-2 text-lg font-bold transition-all',
						'hover:border-primary hover:bg-primary/10',
						'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none',
						selectedNumber === num && 'border-primary bg-primary/20',
						isSubmitting && 'cursor-not-allowed opacity-50'
					)}
				>
					{num}
				</button>
			{/each}
		</div>

		<!-- Cancel button -->
		<Button variant="outline" onclick={onCancel} disabled={isSubmitting} class="w-full">
			Annuler
		</Button>
	</Card>
</div>

<!-- Confirmation dialog -->
<Dialog.Root bind:open={showConfirmation}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Confirmer votre choix</Dialog.Title>
			<Dialog.Description>
				Vous etes sur le point de deviner que le nombre secret de votre adversaire est :
			</Dialog.Description>
		</Dialog.Header>

		<div class="my-6 text-center">
			<Badge variant="secondary" class="px-8 py-4 text-4xl font-bold">
				{selectedNumber}
			</Badge>
		</div>

		<div class="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
			<AlertTriangle class="h-5 w-5 shrink-0 text-destructive" />
			<p class="text-destructive">
				Cette action est irreversible. Si vous vous trompez, vous perdez !
			</p>
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button
				variant="outline"
				onclick={cancelSelection}
				disabled={isSubmitting}
				class="w-full sm:w-auto"
			>
				Annuler
			</Button>
			<Button onclick={confirmGuess} disabled={isSubmitting} class="w-full bg-primary sm:w-auto">
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Verification...
				{:else}
					Confirmer : {selectedNumber}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.guess-prompt {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	.number-selection-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	@media (max-width: 400px) {
		.number-selection-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.number-button:active:not(:disabled) {
		transform: scale(0.95);
	}
</style>
