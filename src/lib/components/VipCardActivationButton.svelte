<!--
	VIP Card Activation Button Component
	=====================================
	Button for students to request activation of VIP cards with actions.

	States:
	- Activatable: Shows "Activer" button (card has action, not used, no pending request)
	- Pending: Shows "En attente..." (activation requested, waiting for teacher)
	- Hidden: Card already used or no action

	Props:
	- instanceId: UUID of the VIP card instance
	- studentId: UUID of the student
	- card: VipCard definition (must have action)
	- vipCardInstance: Instance data (usedAt, activationRequestedAt, etc.)
-->

<script lang="ts">
	import type { VipCard, VipCardInstance, StudentVipCards } from '$lib/types/vip-card';
	import { getActionDescription } from '$lib/utils/vip-cards';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, Sparkles } from 'lucide-svelte';
	import { vipCardTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { syncVipCards } from '$lib/utils/cache-sync';

	interface Props {
		instanceId: string;
		studentId: string;
		card: VipCard;
		vipCardInstance: VipCardInstance;
		onActivationRequested?: () => void;
	}

	let { instanceId, studentId, card, vipCardInstance, onActivationRequested }: Props = $props();

	// State
	let isRequesting = $state(false);

	// Computed states
	const isPending = $derived(!!vipCardInstance.activationRequestedAt);
	const isUsed = $derived(!!vipCardInstance.usedAt);
	const canActivate = $derived(!isUsed && !isPending && !!card.action);
	const actionDescription = $derived(
		card.action ? getActionDescription(card.action, $vipCardTemplates) : ''
	);

	/**
	 * Request activation from teacher
	 *
	 * PATTERN: Optimistic update BEFORE API call
	 * 1. Update cache immediately (activationRequestedAt = now)
	 * 2. Make API call
	 * 3. Success: Cache already correct ✅
	 * 4. Error: Rollback cache update ❌
	 */
	async function requestActivation() {
		if (!canActivate || isRequesting) return;

		isRequesting = true;

		// Get current VIP cards from cache
		const currentRewards = studentCache.getRewardsSync();
		if (!currentRewards) {
			toaster.error('Impossible de charger les cartes VIP');
			isRequesting = false;
			return;
		}

		const currentVipCards = { ...currentRewards.vip_cards };
		const now = new Date().toISOString();

		// 1. OPTIMISTIC UPDATE (instant UI feedback)
		const optimisticCards: StudentVipCards = {
			...currentVipCards,
			[instanceId]: {
				...currentVipCards[instanceId],
				activationRequestedAt: now
			}
		};

		syncVipCards({ type: 'student' }, optimisticCards);

		try {
			// 2. API CALL
			const response = await fetch('/api/vip-cards/request-activation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Erreur lors de la demande');
			}

			// 3. SUCCESS: Cache already has correct data ✅
			toaster.success("Demande d'activation envoyée !");

			// Update parent component (optional callback)
			onActivationRequested?.();
		} catch (error) {
			// 4. ERROR: Rollback optimistic update ❌
			const rollbackCards: StudentVipCards = {
				...currentVipCards,
				[instanceId]: {
					...currentVipCards[instanceId]
					// Remove activationRequestedAt by not including it
				}
			};

			syncVipCards({ type: 'student' }, rollbackCards);

			console.error('[VipCardActivationButton] Error:', error);
			toaster.error(
				error instanceof Error ? error.message : "Erreur lors de la demande d'activation"
			);
		} finally {
			isRequesting = false;
		}
	}
</script>

{#if canActivate}
	<div class="mt-2 flex flex-col gap-1">
		<p class="text-center text-xs text-muted-foreground">{actionDescription}</p>
		<Button
			onclick={requestActivation}
			disabled={isRequesting}
			size="sm"
			class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
		>
			{#if isRequesting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Envoi...
			{:else}
				<Sparkles class="mr-2 h-4 w-4" />
				Activer
			{/if}
		</Button>
	</div>
{:else if isPending}
	<div class="mt-2">
		<Button disabled size="sm" variant="secondary" class="w-full">
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			En attente...
		</Button>
		<p class="mt-1 text-center text-xs text-muted-foreground">Un enseignant doit approuver</p>
	</div>
{/if}
