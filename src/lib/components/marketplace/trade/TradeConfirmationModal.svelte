<!--
	TradeConfirmationModal Component
	================================
	Modal for final trade confirmation after both parties validate.

	Features:
	- Summary of both offers
	- 5-minute countdown timer
	- Confirmation status for each party
	- Confirm and Refuse buttons

	Props:
	- myOffer: { cards: VipCardInstance[], gidouilles: number }
	- partnerOffer: { cards: VipCardInstance[], gidouilles: number }
	- partnerName: string
	- deadline: Date | null
	- myConfirmation: boolean
	- partnerConfirmation: boolean
	- onConfirm: () => void
	- onRefuse: () => void
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import VipCard from '$lib/components/VipCard.svelte';
	import {
		vipCardTemplates,
		getTemplateById,
		templateToVipCard
	} from '$lib/stores/vipCardTemplates.svelte';
	import { Check, X, Clock, ArrowRightLeft, Coins } from 'lucide-svelte';
	import type { VipCardInstance } from '$lib/types/vip-card';

	// Extended type for cards with instanceId
	type TradeCard = VipCardInstance & { instanceId: string };

	interface Props {
		myOffer: { cards: TradeCard[]; gidouilles: number };
		partnerOffer: { cards: TradeCard[]; gidouilles: number };
		partnerName: string;
		deadline: Date | null;
		myConfirmation: boolean;
		partnerConfirmation: boolean;
		onConfirm: () => void;
		onRefuse: () => void;
	}

	let {
		myOffer,
		partnerOffer,
		partnerName,
		deadline,
		myConfirmation,
		partnerConfirmation,
		onConfirm,
		onRefuse
	}: Props = $props();

	// Countdown state
	let remainingSeconds = $state(300); // 5 minutes default
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Format remaining time
	let formattedTime = $derived.by(() => {
		const minutes = Math.floor(remainingSeconds / 60);
		const seconds = remainingSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Timer is critical (< 60 seconds)
	let isCritical = $derived(remainingSeconds < 60);

	// Update countdown
	onMount(() => {
		if (deadline) {
			updateRemainingTime();
			timerInterval = setInterval(updateRemainingTime, 1000);
		}

		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	});

	/**
	 * Update remaining time from deadline
	 */
	function updateRemainingTime(): void {
		if (!deadline) return;

		const now = new Date();
		const diff = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
		remainingSeconds = diff;

		// Auto-close on timeout (handled by parent store)
		if (diff <= 0 && timerInterval) {
			clearInterval(timerInterval);
		}
	}

	/**
	 * Get VipCard object from template
	 */
	function getCardData(cardId: string) {
		const template = getTemplateById(cardId, $vipCardTemplates);
		return template ? templateToVipCard(template) : null;
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
	<!-- Modal Content -->
	<div
		class="w-full max-w-2xl rounded-lg border bg-background shadow-lg"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirmation-title"
	>
		<!-- Header -->
		<div class="border-b p-4">
			<h2 id="confirmation-title" class="flex items-center gap-2 text-xl font-bold">
				<ArrowRightLeft class="h-6 w-6 text-primary" />
				Confirmation de l'echange
			</h2>
			<p class="text-sm text-muted-foreground">Verifiez les details et confirmez l'echange</p>
		</div>

		<!-- Timer -->
		<div
			class="flex items-center justify-center gap-2 border-b p-3 {isCritical
				? 'bg-destructive/10 text-destructive'
				: 'bg-muted'}"
		>
			<Clock class="h-5 w-5" />
			<span class="font-mono text-lg font-bold">{formattedTime}</span>
			<span class="text-sm">restant</span>
		</div>

		<!-- Content -->
		<div class="max-h-[60vh] overflow-auto p-4">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- My Offer -->
				<div class="rounded-lg border bg-card p-3">
					<h3 class="mb-3 font-semibold">Vous donnez</h3>

					<!-- Cards -->
					{#if myOffer.cards.length > 0}
						<div class="mb-3 grid grid-cols-3 gap-2">
							{#each myOffer.cards as card (card.instanceId)}
								{@const cardData = getCardData(card.cardId)}
								{#if cardData}
									<VipCard card={cardData} size="sm" clickable={false} />
								{/if}
							{/each}
						</div>
					{:else}
						<p class="mb-3 text-sm text-muted-foreground">Aucune carte</p>
					{/if}

					<!-- Gidouilles -->
					{#if myOffer.gidouilles > 0}
						<div class="flex items-center gap-2 rounded bg-muted p-2">
							<Coins class="h-4 w-4 text-amber-500" />
							<span class="font-medium">{myOffer.gidouilles} gidouilles</span>
						</div>
					{/if}
				</div>

				<!-- Partner Offer -->
				<div class="rounded-lg border bg-card p-3">
					<h3 class="mb-3 font-semibold">Vous recevez de {partnerName}</h3>

					<!-- Cards -->
					{#if partnerOffer.cards.length > 0}
						<div class="mb-3 grid grid-cols-3 gap-2">
							{#each partnerOffer.cards as card (card.instanceId)}
								{@const cardData = getCardData(card.cardId)}
								{#if cardData}
									<VipCard card={cardData} size="sm" clickable={false} />
								{/if}
							{/each}
						</div>
					{:else}
						<p class="mb-3 text-sm text-muted-foreground">Aucune carte</p>
					{/if}

					<!-- Gidouilles -->
					{#if partnerOffer.gidouilles > 0}
						<div class="flex items-center gap-2 rounded bg-muted p-2">
							<Coins class="h-4 w-4 text-amber-500" />
							<span class="font-medium">{partnerOffer.gidouilles} gidouilles</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Confirmation Status -->
			<div class="mt-6 rounded-lg bg-muted p-4">
				<h3 class="mb-3 font-semibold">Statut des confirmations</h3>
				<div class="grid gap-3 md:grid-cols-2">
					<!-- My status -->
					<div class="flex items-center gap-3">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full {myConfirmation
								? 'bg-green-500 text-white'
								: 'bg-muted-foreground/20'}"
						>
							{#if myConfirmation}
								<Check class="h-5 w-5" />
							{:else}
								<span class="text-sm">?</span>
							{/if}
						</div>
						<span class={myConfirmation ? 'font-medium text-green-600' : 'text-muted-foreground'}>
							Vous {myConfirmation ? 'avez confirme' : "n'avez pas confirme"}
						</span>
					</div>

					<!-- Partner status -->
					<div class="flex items-center gap-3">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full {partnerConfirmation
								? 'bg-green-500 text-white'
								: 'bg-muted-foreground/20'}"
						>
							{#if partnerConfirmation}
								<Check class="h-5 w-5" />
							{:else}
								<span class="text-sm">?</span>
							{/if}
						</div>
						<span
							class={partnerConfirmation ? 'font-medium text-green-600' : 'text-muted-foreground'}
						>
							{partnerName}
							{partnerConfirmation ? 'a confirme' : "n'a pas confirme"}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex justify-end gap-3 border-t p-4">
			<Button variant="destructive" onclick={onRefuse}>
				<X class="mr-2 h-4 w-4" />
				Refuser
			</Button>
			<Button onclick={onConfirm} disabled={myConfirmation}>
				<Check class="mr-2 h-4 w-4" />
				{myConfirmation ? 'En attente...' : 'Confirmer'}
			</Button>
		</div>
	</div>
</div>
