<!--
	RestrictUserDialog Component
	============================

	Dialog to restrict a user (mute, timeout, or ban) at conversation or global scope.

	Props:
		- open: Dialog open state (bindable)
		- userId: ID of user to restrict
		- userName: Display name of user
		- conversationId: ID of conversation (null for global only)
		- onSuccess: Callback after successful restriction

	Features:
		- Dialog with form
		- Radio group for restriction type (mute | timeout | ban)
		- Scope toggle (conversation vs global)
		- Datetime picker for expiration (if timeout)
		- Textarea for reason (5-500 chars)
		- Form validation
		- Loading state
		- Toast notifications
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Ban, Clock, AlertTriangle, Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Component Props
	interface Props {
		open?: boolean;
		userId: string;
		userName: string;
		conversationId?: string | null;
		onSuccess?: () => void;
	}

	let {
		open = $bindable(false),
		userId,
		userName,
		conversationId = null,
		onSuccess = () => {}
	}: Props = $props();

	// State
	let restrictionType = $state<'mute' | 'timeout' | 'ban'>('mute');
	let isGlobal = $state(false);
	let expiresAt = $state('');
	let reason = $state('');
	let isSubmitting = $state(false);

	/**
	 * Character count
	 */
	const characterCount = $derived(reason.length);

	/**
	 * Check if form is valid
	 */
	const isValid = $derived(() => {
		// Reason must be 5-500 chars
		if (reason.trim().length < 5 || reason.length > 500) {
			return false;
		}

		// If timeout, expiration date is required
		if (restrictionType === 'timeout' && !expiresAt) {
			return false;
		}

		return true;
	});

	/**
	 * Restriction type descriptions
	 */
	const restrictionDescriptions = {
		mute: "L'utilisateur ne peut plus envoyer de messages",
		timeout: "L'utilisateur est bloqué temporairement",
		ban: "L'utilisateur est banni définitivement"
	};

	/**
	 * Submit form
	 */
	async function submitRestriction(): Promise<void> {
		if (!isValid()) return;

		isSubmitting = true;

		try {
			// Determine scope
			const scopeType = isGlobal || !conversationId ? 'global' : 'conversation';
			const scopeId = scopeType === 'conversation' ? conversationId : null;

			// Convert expiresAt to ISO string if provided
			let expiresAtISO: string | null = null;
			if (restrictionType === 'timeout' && expiresAt) {
				expiresAtISO = new Date(expiresAt).toISOString();
			}

			const response = await fetch('/api/moderation/restrict-user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					scopeType,
					scopeId,
					restrictionType,
					reason: reason.trim(),
					expiresAt: expiresAtISO
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || 'Failed to restrict user');
			}

			toaster.success('Restriction appliquée avec succès');
			closeDialog();
			onSuccess();
		} catch (error) {
			console.error('Failed to restrict user:', error);
			toaster.error('Erreur lors de la restriction');
		} finally {
			isSubmitting = false;
		}
	}

	/**
	 * Close dialog and reset form
	 */
	function closeDialog(): void {
		open = false;
		restrictionType = 'mute';
		isGlobal = false;
		expiresAt = '';
		reason = '';
	}

	/**
	 * Get minimum datetime for datetime-local input (now)
	 */
	function getMinDatetime(): string {
		const now = new Date();
		// Format as YYYY-MM-DDTHH:mm (required for datetime-local)
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Restreindre {userName}</Dialog.Title>
			<Dialog.Description>
				Choisissez le type de restriction et fournissez une raison.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Restriction Type -->
			<div class="space-y-2">
				<Label>Type de restriction</Label>
				<RadioGroup.Root bind:value={restrictionType} class="space-y-2">
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="mute" id="mute" />
						<Label for="mute" class="flex cursor-pointer items-center gap-2 font-normal">
							<AlertTriangle class="h-4 w-4 text-yellow-600" />
							<div>
								<div class="font-medium">Muet</div>
								<div class="text-sm text-muted-foreground">
									{restrictionDescriptions.mute}
								</div>
							</div>
						</Label>
					</div>

					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="timeout" id="timeout" />
						<Label for="timeout" class="flex cursor-pointer items-center gap-2 font-normal">
							<Clock class="h-4 w-4 text-blue-600" />
							<div>
								<div class="font-medium">Temporaire</div>
								<div class="text-sm text-muted-foreground">
									{restrictionDescriptions.timeout}
								</div>
							</div>
						</Label>
					</div>

					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="ban" id="ban" />
						<Label for="ban" class="flex cursor-pointer items-center gap-2 font-normal">
							<Ban class="h-4 w-4 text-red-600" />
							<div>
								<div class="font-medium">Ban</div>
								<div class="text-sm text-muted-foreground">
									{restrictionDescriptions.ban}
								</div>
							</div>
						</Label>
					</div>
				</RadioGroup.Root>
			</div>

			<!-- Scope Toggle (only if conversationId provided) -->
			{#if conversationId}
				<div class="space-y-2">
					<MyCheckbox
						bind:checked={isGlobal}
						label="Toutes les conversations"
						disabled={isSubmitting}
					/>
					<p class="text-sm text-muted-foreground">
						{#if isGlobal}
							La restriction s'appliquera à toutes les conversations
						{:else}
							La restriction s'appliquera uniquement à cette conversation
						{/if}
					</p>
				</div>
			{/if}

			<!-- Expiration Date (only for timeout) -->
			{#if restrictionType === 'timeout'}
				<div class="space-y-2">
					<Label for="expires-at">Expiration</Label>
					<input
						id="expires-at"
						type="datetime-local"
						bind:value={expiresAt}
						min={getMinDatetime()}
						disabled={isSubmitting}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
			{/if}

			<!-- Reason -->
			<div class="space-y-2">
				<Label for="reason">Raison</Label>
				<Textarea
					id="reason"
					bind:value={reason}
					placeholder="Expliquez pourquoi vous restreignez cet utilisateur..."
					rows={4}
					disabled={isSubmitting}
					class="resize-none"
				/>
				<p class="text-sm text-muted-foreground">
					{characterCount} / 500 caractères
					{#if characterCount < 5}
						<span class="text-destructive">(minimum 5 caractères)</span>
					{/if}
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeDialog} disabled={isSubmitting}>Annuler</Button>
			<Button onclick={submitRestriction} disabled={!isValid() || isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Restreindre
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
