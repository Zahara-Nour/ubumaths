<script lang="ts">
	/**
	 * TypedConfirmDialog — reusable destructive-action gate.
	 *
	 * Wraps a destructive operation behind a typed confirmation: the admin must
	 * retype an exact token (e.g. the school name) before the submit button
	 * enables. The server MUST re-enforce this (the dialog is only the friendly
	 * front door) via `assertTypedConfirmation`.
	 *
	 * Two mutually-exclusive modes:
	 * - **Form-action mode** (`action` prop): posts `confirm` (the typed value)
	 *   plus any extra fields from the `hiddenFields` snippet (e.g. the row id)
	 *   to a SvelteKit form action via `use:enhance`.
	 * - **Callback mode** (`onConfirm` prop): calls `onConfirm()` instead of
	 *   submitting a form. The consumer is responsible for the fetch (and for
	 *   sending the `confirm` token in the request body). On resolve → close +
	 *   reset + success toast; on throw → keep open + error toast.
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
		/**
		 * SvelteKit form action, e.g. '?/delete'. Mutually exclusive with
		 * `onConfirm` — provide exactly one.
		 */
		action?: string;
		/**
		 * Callback-mode handler: invoked when the admin confirms. The consumer
		 * owns the request (and must include the `confirm` token in its body).
		 * Mutually exclusive with `action` — provide exactly one. On resolve the
		 * dialog closes + resets + shows the success toast; on throw it stays
		 * open + shows the error toast.
		 */
		onConfirm?: () => Promise<void> | void;
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
		onConfirm,
		title,
		description,
		confirmLabel = 'Supprimer définitivement',
		successMessage = 'Suppression effectuée',
		trigger,
		hiddenFields
	}: Props = $props();

	// Callback mode is selected when `onConfirm` is provided and no `action`.
	const callbackMode = $derived(onConfirm !== undefined && action === undefined);

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

	// Callback-mode submit: run the consumer's handler, then mirror the
	// form-action mode's outcomes (close + reset + success toast on resolve,
	// keep open + error toast on throw).
	async function handleCallbackConfirm() {
		if (!onConfirm || !matches || submitting) return;
		submitting = true;
		try {
			await onConfirm();
			open = false;
			typed = '';
			toaster.success(successMessage);
		} catch (err) {
			// Keep the dialog open so the admin can read the error and retry.
			const message = err instanceof Error ? err.message : 'La suppression a échoué';
			toaster.error(message);
		} finally {
			submitting = false;
		}
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

		{#if callbackMode}
			<div>
				<div class="space-y-2 py-4">
					<label for="typed-confirm" class="block text-sm font-medium text-foreground">
						Tapez <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">{expected}</code> pour
						confirmer
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
					<Button
						type="button"
						variant="destructive"
						onclick={handleCallbackConfirm}
						disabled={!matches || submitting}
					>
						{confirmLabel}
					</Button>
				</Dialog.Footer>
			</div>
		{:else}
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
							// Accept either fail() convention: { message } or { error }.
							const failMessage =
								typeof result.data?.message === 'string'
									? result.data.message
									: typeof result.data?.error === 'string'
										? result.data.error
										: 'La suppression a échoué';
							toaster.error(failMessage);
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
						Tapez <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">{expected}</code> pour
						confirmer
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
		{/if}
	</Dialog.Content>
</Dialog.Root>
