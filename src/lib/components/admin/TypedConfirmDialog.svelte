<script lang="ts">
	/**
	 * TypedConfirmDialog — reusable destructive-action gate.
	 *
	 * Wraps a destructive SvelteKit form action behind a typed confirmation:
	 * the admin must retype an exact token (e.g. the school name) before the
	 * submit button enables. The server MUST re-enforce this (the dialog is
	 * only the friendly front door) via `assertTypedConfirmation`.
	 *
	 * The form posts `confirm` (the typed value) plus any extra fields passed
	 * through the `hiddenFields` snippet (e.g. the row id).
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Snippet } from 'svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Exact text the user must type to enable the destructive action. */
		expected: string;
		/** SvelteKit form action, e.g. '?/delete'. */
		action: string;
		/** Dialog title. */
		title: string;
		/** Optional explanatory text shown above the confirmation field. */
		description?: string;
		/** Label of the destructive submit button. */
		confirmLabel?: string;
		/** Success toast message (defaults to a generic deletion message). */
		successMessage?: string;
		/**
		 * The destructive button that opens the dialog. Receives the trigger
		 * `props` (click + ARIA wiring) to spread onto the button element.
		 */
		trigger: Snippet<[Record<string, unknown>]>;
		/** Extra hidden inputs to submit with the form (e.g. the id). */
		hiddenFields?: Snippet;
	}

	let {
		expected,
		action,
		title,
		description,
		confirmLabel = 'Supprimer définitivement',
		successMessage = 'Suppression effectuée',
		trigger,
		hiddenFields
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let open = $state(false);
	let typed = $state('');
	let submitting = $state(false);

	// ==========================================================================
	// Derived
	// ==========================================================================

	// Enable the destructive action only on an exact (trimmed) match.
	const matches = $derived(typed.trim() === expected.trim());

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function onOpenChange(next: boolean) {
		open = next;
		// Always reset the typed token when the dialog closes.
		if (!next) typed = '';
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			{@render trigger(props)}
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>

		<form
			method="POST"
			{action}
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') {
						open = false;
						typed = '';
						toaster.success(successMessage);
						await update();
					} else if (result.type === 'failure') {
						// Keep the dialog open so the admin can read the error and retry.
						const message =
							typeof result.data?.message === 'string'
								? result.data.message
								: 'La suppression a échoué';
						toaster.error(message);
					} else {
						// redirect / error result types: let SvelteKit handle it.
						await update();
					}
					await invalidateAll();
				};
			}}
		>
			{@render hiddenFields?.()}
			<input type="hidden" name="confirm" value={typed} />

			<div class="space-y-2 py-4">
				<label for="typed-confirm" class="block text-sm font-medium text-foreground">
					Tapez <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">{expected}</code> pour confirmer
				</label>
				<Input
					id="typed-confirm"
					autocomplete="off"
					bind:value={typed}
					placeholder={expected}
					disabled={submitting}
				/>
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => onOpenChange(false)}
					disabled={submitting}
				>
					Annuler
				</Button>
				<Button type="submit" variant="destructive" disabled={!matches || submitting}>
					{confirmLabel}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
